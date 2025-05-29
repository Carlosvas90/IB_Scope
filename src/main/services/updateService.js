const fs = require("fs");
const path = require("path");
const { app, shell } = require("electron");
const { spawn } = require("child_process");

class UpdateService {
  constructor() {
    // Para aplicaciones empaquetadas, usar resources junto al ejecutable
    let basePath;
    if (app.isPackaged) {
      basePath = path.join(path.dirname(app.getPath("exe")), "resources");
    } else {
      basePath = process.cwd();
    }
    this.configPath = path.join(basePath, "config", "update-config.json");
    this.config = this.loadConfig();
    this.tempDir = path.join(app.getPath("temp"), "app-updates");
  }

  loadConfig() {
    try {
      console.log("[UpdateService] Cargando config desde:", this.configPath);
      console.log("[UpdateService] App empaquetada:", app.isPackaged);

      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, "utf-8");
        return JSON.parse(data);
      } else {
        console.warn(
          "[UpdateService] Archivo de configuración no encontrado, usando valores por defecto"
        );
      }
    } catch (error) {
      console.error("[UpdateService] Error cargando configuración:", error);
    }

    // Configuración por defecto
    return {
      updatePaths: ["\\\\servidor-empresa\\updates\\"],
      currentVersion: "1.0.0",
      autoCheck: true,
      updateTimeout: 10000,
    };
  }

  // Verificar si hay nueva versión disponible
  async checkForUpdates() {
    try {
      // Obtener las rutas (compatibilidad con updatePath único o updatePaths múltiples)
      const updatePaths = this.config.updatePaths || [this.config.updatePath];

      console.log("[UpdateService] Verificando updates en rutas:", updatePaths);

      // Probar cada ruta hasta encontrar una accesible
      for (const updatePath of updatePaths) {
        console.log("[UpdateService] Probando ruta:", updatePath);

        try {
          // Verificar si la carpeta existe
          if (!fs.existsSync(updatePath)) {
            console.log("[UpdateService] Ruta no accesible:", updatePath);
            continue;
          }

          const versionFilePath = path.join(updatePath, "version.json");

          // Leer version.json
          if (!fs.existsSync(versionFilePath)) {
            console.log(
              "[UpdateService] No se encontró version.json en:",
              updatePath
            );
            continue;
          }

          const versionData = JSON.parse(
            fs.readFileSync(versionFilePath, "utf-8")
          );
          console.log(
            "[UpdateService] Versión remota encontrada:",
            versionData.version
          );
          console.log(
            "[UpdateService] Versión actual:",
            this.config.currentVersion
          );

          // Comparar versiones
          if (
            this.isNewerVersion(versionData.version, this.config.currentVersion)
          ) {
            console.log(
              "[UpdateService] ¡Update disponible en:",
              updatePath,
              "!"
            );
            return {
              available: true,
              version: versionData.version,
              filename: versionData.filename,
              changelog: versionData.changelog || "Nueva versión disponible",
              downloadPath: path.join(updatePath, versionData.filename),
              sourcePath: updatePath, // Guardar qué ruta funcionó
            };
          } else {
            console.log("[UpdateService] Versión actual está actualizada");
            return { available: false };
          }
        } catch (error) {
          console.error(
            "[UpdateService] Error verificando en ruta",
            updatePath,
            ":",
            error
          );
          continue; // Probar siguiente ruta
        }
      }

      console.log("[UpdateService] No se encontraron updates en ninguna ruta");
      return { available: false };
    } catch (error) {
      console.error(
        "[UpdateService] Error general verificando updates:",
        error
      );
      return null;
    }
  }

  // Comparar versiones (simple)
  isNewerVersion(remoteVersion, currentVersion) {
    const remote = remoteVersion.split(".").map((n) => parseInt(n));
    const current = currentVersion.split(".").map((n) => parseInt(n));

    for (let i = 0; i < Math.max(remote.length, current.length); i++) {
      const r = remote[i] || 0;
      const c = current[i] || 0;
      if (r > c) return true;
      if (r < c) return false;
    }
    return false;
  }

  // Copiar update desde red a temporal local
  async downloadUpdate(updateInfo) {
    try {
      console.log(
        "[UpdateService] Copiando update desde:",
        updateInfo.downloadPath
      );

      // Crear directorio temporal si no existe
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }

      const localPath = path.join(this.tempDir, updateInfo.filename);

      // Copiar archivo de red a local
      await this.copyFileWithProgress(updateInfo.downloadPath, localPath);

      console.log("[UpdateService] Update copiado a:", localPath);
      return localPath;
    } catch (error) {
      console.error("[UpdateService] Error copiando update:", error);
      throw error;
    }
  }

  // Copiar archivo con progreso
  async copyFileWithProgress(source, destination) {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(source);
      const writeStream = fs.createWriteStream(destination);

      readStream.on("error", reject);
      writeStream.on("error", reject);
      writeStream.on("finish", resolve);

      readStream.pipe(writeStream);
    });
  }

  // Instalar update y reiniciar app
  async installUpdate(localUpdatePath) {
    try {
      console.log("[UpdateService] Instalando update:", localUpdatePath);

      // Verificar que el archivo existe
      if (!fs.existsSync(localUpdatePath)) {
        throw new Error("Archivo de update no encontrado");
      }

      // Para aplicaciones portables, necesitamos reemplazar el ejecutable actual
      const currentExePath = app.getPath("exe");
      const currentDir = path.dirname(currentExePath);
      const currentExeName = path.basename(currentExePath);

      console.log("[UpdateService] Ejecutable actual:", currentExePath);
      console.log("[UpdateService] Nuevo ejecutable:", localUpdatePath);

      // Crear script de actualización
      const updateScriptPath = path.join(this.tempDir, "update.bat");
      const updateScript = `
@echo off
echo Actualizando Inbound Scope...
echo Esperando a que se cierre la aplicacion...

:wait
tasklist /FI "IMAGENAME eq ${currentExeName}" 2>NUL | find /I /N "${currentExeName}">NUL
if "%ERRORLEVEL%"=="0" (
    timeout /t 1 >nul
    goto wait
)

echo Aplicacion cerrada. Instalando actualizacion...

:: Hacer backup del ejecutable actual
move "${currentExePath}" "${currentExePath}.old" 2>nul

:: Copiar nuevo ejecutable
copy "${localUpdatePath}" "${currentExePath}"

if exist "${currentExePath}" (
    echo Actualizacion instalada correctamente
    :: Eliminar backup
    del "${currentExePath}.old" 2>nul
    :: Relanzar aplicacion
    start "" "${currentExePath}"
) else (
    echo Error en la instalacion. Restaurando backup...
    move "${currentExePath}.old" "${currentExePath}" 2>nul
)

:: Limpiar archivos temporales
del "${localUpdatePath}" 2>nul
del "%~f0" 2>nul
`;

      // Escribir script
      fs.writeFileSync(updateScriptPath, updateScript);

      console.log(
        "[UpdateService] Script de actualización creado:",
        updateScriptPath
      );

      // Ejecutar script de actualización en background
      const updateProcess = spawn("cmd.exe", ["/c", updateScriptPath], {
        detached: true,
        stdio: "ignore",
        cwd: currentDir,
      });

      updateProcess.unref();

      console.log(
        "[UpdateService] Proceso de actualización iniciado. Cerrando aplicación..."
      );

      // Cerrar la app actual después de un momento
      setTimeout(() => {
        app.quit();
      }, 1500);

      return true;
    } catch (error) {
      console.error("[UpdateService] Error instalando update:", error);
      throw error;
    }
  }

  // Actualizar versión en config
  updateCurrentVersion(newVersion) {
    try {
      this.config.currentVersion = newVersion;
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      console.log("[UpdateService] Versión actualizada a:", newVersion);
    } catch (error) {
      console.error("[UpdateService] Error actualizando versión:", error);
    }
  }

  // Verificar updates al iniciar la app
  async checkOnStartup() {
    if (!this.config.autoCheck) {
      return null;
    }

    console.log("[UpdateService] Verificando updates al iniciar...");
    return await this.checkForUpdates();
  }
}

module.exports = new UpdateService();
