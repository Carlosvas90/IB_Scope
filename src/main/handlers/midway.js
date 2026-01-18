// src/main/handlers/midway.js
// Handler IPC para gestión de cookies de Midway

const { ipcMain } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const fileSystemService = require("../services/fileSystem");
const configService = require("../services/config");

class MidwayHandler {
  constructor() {
    console.log("[MidwayHandler] Inicializando MidwayHandler...");
    this.setupHandlers();
    console.log("[MidwayHandler] MidwayHandler inicializado correctamente");
  }

  setupHandlers() {
    // Validar cookie de Midway en ruta remota
    ipcMain.handle("midway:validate-remote", async (event) => {
      const config = configService.getConfig();
      const cookiePath = config.midway_cookie_path;
      const minHours = config.midway_expiration_hours || 10;

      if (!cookiePath) {
        return { success: false, error: "midway_cookie_path no configurado" };
      }

      console.log("[MidwayHandler] Validando cookie remota en:", cookiePath);
      const result = fileSystemService.validateMidwayCookie(cookiePath, minHours);
      console.log("[MidwayHandler] Resultado validación:", result);
      
      return result;
    });

    // Validar cookie de Midway local
    ipcMain.handle("midway:validate-local", async (event) => {
      const localPath = fileSystemService.getLocalMidwayCookiePath();
      console.log("[MidwayHandler] Validando cookie local en:", localPath);
      
      const result = fileSystemService.validateMidwayCookie(localPath, 0);
      console.log("[MidwayHandler] Resultado validación local:", result);
      
      return result;
    });

    // Copiar cookie local a remoto
    ipcMain.handle("midway:copy-to-remote", async (event) => {
      const config = configService.getConfig();
      const destPath = config.midway_cookie_path;

      if (!destPath) {
        return { success: false, error: "midway_cookie_path no configurado" };
      }

      console.log("[MidwayHandler] Copiando cookie a:", destPath);
      const result = fileSystemService.copyMidwayCookieToRemote(destPath);
      console.log("[MidwayHandler] Resultado copia:", result);
      
      return result;
    });

    // Ejecutar mwinit para autenticación
    ipcMain.handle("midway:authenticate", async (event) => {
      return new Promise((resolve) => {
        console.log("[MidwayHandler] Ejecutando mwinit para autenticación...");
        
        const localCookiePath = fileSystemService.getLocalMidwayCookiePath();
        const fs = require("fs");
        
        // Obtener fecha de modificación ANTES de ejecutar mwinit
        let originalMtime = null;
        try {
          if (fs.existsSync(localCookiePath)) {
            const stats = fs.statSync(localCookiePath);
            originalMtime = stats.mtime.getTime();
            console.log("[MidwayHandler] Fecha original de cookie:", new Date(originalMtime).toISOString());
          } else {
            console.log("[MidwayHandler] No existe cookie previa, esperando nueva...");
          }
        } catch (err) {
          console.log("[MidwayHandler] Error leyendo cookie previa:", err.message);
        }
        
        // Comando mwinit con flags
        const mwinitCmd = "mwinit -o";
        
        if (process.platform === "win32") {
          // En Windows, abrir nueva ventana CMD para interacción
          const cmdScript = `${mwinitCmd} && echo. && echo [OK] Autenticacion completada. Puedes cerrar esta ventana. && pause`;
          
          console.log("[MidwayHandler] Abriendo ventana CMD para autenticación...");
          
          // Usar spawn con shell para abrir ventana visible
          const child = spawn("cmd.exe", ["/c", "start", "cmd", "/k", cmdScript], {
            shell: true,
            detached: true,
            stdio: "ignore"
          });
          
          child.unref();
          
          // Monitorear cambios en el archivo de cookie
          let checkCount = 0;
          const maxChecks = 300; // 5 minutos máximo (300 * 1000ms)
          
          const checkCookie = setInterval(() => {
            checkCount++;
            
            try {
              // Verificar si el archivo existe y ha sido modificado
              if (fs.existsSync(localCookiePath)) {
                const stats = fs.statSync(localCookiePath);
                const currentMtime = stats.mtime.getTime();
                
                // Solo considerar éxito si:
                // 1. No había archivo antes y ahora sí, O
                // 2. El archivo fue modificado después de iniciar mwinit
                const isNewOrModified = originalMtime === null || currentMtime > originalMtime;
                
                if (isNewOrModified) {
                  // Validar que la nueva cookie sea válida
                  const validation = fileSystemService.validateMidwayCookie(localCookiePath, 0);
                  
                  if (validation.hoursRemaining > 10) { // Nueva cookie debería tener ~20h
                    clearInterval(checkCookie);
                    console.log("[MidwayHandler] ✓ Nueva cookie detectada");
                    console.log("[MidwayHandler] Fecha nueva:", new Date(currentMtime).toISOString());
                    console.log("[MidwayHandler] Horas restantes:", validation.hoursRemaining.toFixed(2));
                    resolve({ 
                      success: true, 
                      message: "Autenticación completada",
                      hoursRemaining: validation.hoursRemaining
                    });
                    return;
                  }
                }
              }
            } catch (err) {
              // Ignorar errores de lectura, seguir intentando
            }
            
            if (checkCount >= maxChecks) {
              clearInterval(checkCookie);
              console.log("[MidwayHandler] ✗ Timeout esperando autenticación");
              resolve({ 
                success: false, 
                error: "Timeout esperando autenticación. ¿Cerraste la ventana sin completar?" 
              });
            }
          }, 1000);
          
        } else {
          // En Linux/Mac, ejecutar directamente
          const child = spawn("mwinit", ["-o"], {
            stdio: "inherit"
          });
          
          child.on("close", (code) => {
            if (code === 0) {
              const validation = fileSystemService.validateMidwayCookie(localCookiePath, 0);
              resolve({ 
                success: true, 
                message: "Autenticación completada",
                hoursRemaining: validation.hoursRemaining
              });
            } else {
              resolve({ success: false, error: `mwinit terminó con código ${code}` });
            }
          });
          
          child.on("error", (err) => {
            resolve({ success: false, error: err.message });
          });
        }
      });
    });

    // Flujo completo: validar remoto → comparar con local → autenticar si necesario → copiar
    ipcMain.handle("midway:ensure-valid", async (event) => {
      const config = configService.getConfig();
      const remotePath = config.midway_cookie_path;
      const minHours = config.midway_expiration_hours || 10;

      if (!remotePath) {
        return { success: false, error: "midway_cookie_path no configurado" };
      }

      console.log("[MidwayHandler] === Iniciando validación de Midway ===");
      console.log("[MidwayHandler] Ruta remota:", remotePath);
      console.log("[MidwayHandler] Mínimo horas requeridas:", minHours);
      
      // 1. Verificar cookie remota
      const remoteValidation = fileSystemService.validateMidwayCookie(remotePath, minHours);
      const remoteHours = remoteValidation.hoursRemaining || 0;
      console.log("[MidwayHandler] Cookie REMOTA:", remoteValidation.valid ? "✅ Válida" : "❌ Inválida");
      console.log("[MidwayHandler] Detalle remota:", remoteValidation.message);
      if (remoteHours > 0) {
        console.log("[MidwayHandler] Horas restantes remota:", remoteHours.toFixed(2));
      }

      // 2. SIEMPRE verificar cookie local para comparar
      const localPath = fileSystemService.getLocalMidwayCookiePath();
      const localValidation = fileSystemService.validateMidwayCookie(localPath, minHours);
      const localHours = localValidation.hoursRemaining || 0;
      console.log("[MidwayHandler] Cookie LOCAL:", localValidation.valid ? "✅ Válida" : "❌ Inválida");
      console.log("[MidwayHandler] Detalle local:", localValidation.message);
      if (localHours > 0) {
        console.log("[MidwayHandler] Horas restantes local:", localHours.toFixed(2));
      }

      // 3. Decidir acción basada en ambas cookies
      
      // Caso A: Cookie local es válida (>10h) y tiene MÁS tiempo que la remota
      if (localValidation.valid && localHours > remoteHours) {
        console.log("[MidwayHandler] Cookie local tiene más tiempo que remota, actualizando...");
        const copyResult = fileSystemService.copyMidwayCookieToRemote(remotePath);
        
        if (copyResult.success) {
          return {
            success: true,
            action: "updated",
            message: `Cookie remota actualizada (${localHours.toFixed(1)}h → servidor)`,
            hoursRemaining: localHours,
            source: "local_updated"
          };
        } else {
          // Si falla la copia pero la remota es válida, seguir adelante
          if (remoteValidation.valid) {
            console.log("[MidwayHandler] Copia falló pero remota es válida, continuando...");
            return { 
              success: true, 
              action: "none",
              message: `Cookie remota válida (${remoteHours.toFixed(1)}h restantes)`,
              hoursRemaining: remoteHours,
              source: "remote"
            };
          }
          return {
            success: false,
            action: "copy_failed",
            error: copyResult.error,
            needsAuth: false
          };
        }
      }
      
      // Caso B: Cookie remota es válida (>10h) y local no es mejor
      if (remoteValidation.valid) {
        return { 
          success: true, 
          action: "none",
          message: `Cookie remota válida (${remoteHours.toFixed(1)}h restantes)`,
          hoursRemaining: remoteHours,
          source: "remote"
        };
      }

      // Caso C: Remota inválida, pero local válida (>10h) - copiar al remoto
      if (localValidation.valid) {
        console.log("[MidwayHandler] Cookie local válida, copiando a remoto...");
        const copyResult = fileSystemService.copyMidwayCookieToRemote(remotePath);
        
        if (copyResult.success) {
          return {
            success: true,
            action: "copied",
            message: "Cookie local copiada al servidor",
            hoursRemaining: localHours,
            source: "local_copied"
          };
        } else {
          return {
            success: false,
            action: "copy_failed",
            error: copyResult.error,
            needsAuth: false
          };
        }
      }

      // Caso D: Ambas cookies inválidas (<10h o no existen) - necesita autenticación
      console.log("[MidwayHandler] ❌ Ambas cookies inválidas, se requiere autenticación");
      return {
        success: false,
        action: "needs_auth",
        needsAuth: true,
        message: "Se requiere autenticación con Midway",
        remoteStatus: remoteValidation.message,
        localStatus: localValidation.message,
        remoteHours: remoteHours,
        localHours: localHours
      };
    });

    console.log("[MidwayHandler] ✅ Handlers de Midway registrados");
  }
}

module.exports = new MidwayHandler();
