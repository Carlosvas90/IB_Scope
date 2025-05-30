const fs = require("fs");
const path = require("path");
const { app, shell } = require("electron");
const { spawn, exec } = require("child_process");
const crypto = require("crypto");

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
    this.updateInProgressFile = path.join(
      this.tempDir,
      "update-in-progress.lock"
    );
  }

  loadConfig() {
    try {
      console.log("[UpdateService] Cargando config desde:", this.configPath);
      console.log("[UpdateService] App empaquetada:", app.isPackaged);

      let config = {};
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, "utf-8");
        config = JSON.parse(data);
      } else {
        console.warn(
          "[UpdateService] Archivo de configuración no encontrado, usando valores por defecto"
        );
      }

      // Obtener versión actual desde package.json
      const packageJsonPath = app.isPackaged
        ? path.join(process.resourcesPath, "app", "package.json")
        : path.join(process.cwd(), "package.json");

      try {
        const packageInfo = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf-8")
        );
        config.currentVersion = packageInfo.version;
        console.log(
          "[UpdateService] Versión actual desde package.json:",
          config.currentVersion
        );
      } catch (error) {
        console.error("[UpdateService] Error leyendo package.json:", error);
        // Usar versión del config como fallback
        config.currentVersion = config.currentVersion || "1.0.0";
      }

      // Configuración por defecto para otros valores
      return {
        updatePaths: config.updatePaths || ["\\\\servidor-empresa\\updates\\"],
        currentVersion: config.currentVersion,
        autoCheck: config.autoCheck !== undefined ? config.autoCheck : true,
        updateTimeout: config.updateTimeout || 10000,
      };
    } catch (error) {
      console.error("[UpdateService] Error cargando configuración:", error);

      // Configuración por defecto
      return {
        updatePaths: ["\\\\servidor-empresa\\updates\\"],
        currentVersion: "1.0.0",
        autoCheck: true,
        updateTimeout: 10000,
      };
    }
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

  // Verificar si hay una actualización en progreso
  isUpdateInProgress() {
    try {
      return fs.existsSync(this.updateInProgressFile);
    } catch (error) {
      return false;
    }
  }

  // Limpiar archivos de actualización anteriores
  cleanupUpdateFiles() {
    try {
      if (fs.existsSync(this.updateInProgressFile)) {
        fs.unlinkSync(this.updateInProgressFile);
      }
      // Limpiar archivos temporales antiguos
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        files.forEach((file) => {
          if (
            file.endsWith(".exe") ||
            file.endsWith(".bat") ||
            file.endsWith(".vbs")
          ) {
            const filePath = path.join(this.tempDir, file);
            try {
              fs.unlinkSync(filePath);
            } catch (error) {
              console.log(
                `[UpdateService] No se pudo eliminar ${file}:`,
                error.message
              );
            }
          }
        });
      }
    } catch (error) {
      console.error("[UpdateService] Error limpiando archivos:", error);
    }
  }

  // Calcular hash SHA256 de un archivo
  async calculateFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);

      stream.on("error", reject);
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", () => resolve(hash.digest("hex")));
    });
  }

  // Copiar archivo con progreso y verificación
  async copyFileWithProgress(source, destination, progressCallback = null) {
    return new Promise((resolve, reject) => {
      try {
        const stats = fs.statSync(source);
        const totalSize = stats.size;
        let copiedSize = 0;

        const readStream = fs.createReadStream(source);
        const writeStream = fs.createWriteStream(destination);

        readStream.on("error", reject);
        writeStream.on("error", reject);

        readStream.on("data", (chunk) => {
          copiedSize += chunk.length;
          if (progressCallback) {
            const progress = Math.round((copiedSize / totalSize) * 100);
            progressCallback(progress);
          }
        });

        writeStream.on("finish", async () => {
          // Verificar que el archivo se copió correctamente
          try {
            const destStats = fs.statSync(destination);
            if (destStats.size !== totalSize) {
              reject(
                new Error(
                  "El archivo copiado tiene un tamaño diferente al original"
                )
              );
            } else {
              resolve();
            }
          } catch (error) {
            reject(error);
          }
        });

        readStream.pipe(writeStream);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Copiar update desde red a temporal local
  async downloadUpdate(updateInfo, progressCallback = null) {
    try {
      console.log(
        "[UpdateService] Copiando update desde:",
        updateInfo.downloadPath
      );

      // Crear directorio temporal si no existe
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }

      // Limpiar archivos antiguos primero
      this.cleanupUpdateFiles();

      const localPath = path.join(this.tempDir, updateInfo.filename);

      // Copiar archivo de red a local con progreso
      await this.copyFileWithProgress(
        updateInfo.downloadPath,
        localPath,
        progressCallback
      );

      // Verificar que el archivo se descargó correctamente
      if (!fs.existsSync(localPath)) {
        throw new Error("El archivo no se descargó correctamente");
      }

      console.log("[UpdateService] Update copiado exitosamente a:", localPath);
      return localPath;
    } catch (error) {
      console.error("[UpdateService] Error copiando update:", error);
      throw error;
    }
  }

  // Instalar update y reiniciar app
  async installUpdate(localUpdatePath) {
    try {
      console.log("[UpdateService] Instalando update:", localUpdatePath);

      // Verificar que el archivo existe
      if (!fs.existsSync(localUpdatePath)) {
        throw new Error("Archivo de update no encontrado");
      }

      // Detectar si estamos ejecutando desde una carpeta temporal
      const currentExePath = app.getPath("exe");
      const currentDir = path.dirname(currentExePath);

      // Verificar si estamos en una carpeta temporal
      const isTempFolder =
        currentDir.toLowerCase().includes("\\temp\\") ||
        currentDir.toLowerCase().includes("\\tmp\\");

      let realExePath = currentExePath;
      let realDir = currentDir;

      if (isTempFolder) {
        console.log(
          "[UpdateService] Detectado: Ejecutando desde carpeta temporal"
        );
        console.log(
          "[UpdateService] Buscando ubicación real del ejecutable..."
        );

        // Intentar encontrar la ubicación real
        // Opción 1: Buscar en el escritorio
        const desktopPath = path.join(
          require("os").homedir(),
          "Desktop",
          "Inbound Scope.exe"
        );
        // Opción 2: Buscar en Descargas
        const downloadsPath = path.join(
          require("os").homedir(),
          "Downloads",
          "Inbound Scope.exe"
        );
        // Opción 3: Buscar en Program Files
        const programFilesPath = path.join(
          "C:\\Program Files",
          "Inbound Scope",
          "Inbound Scope.exe"
        );
        // Opción 4: Buscar en la carpeta del proyecto
        const projectPath = path.join(
          require("os").homedir(),
          "Downloads",
          "Inbound-Scope",
          "Inbound Scope.exe"
        );

        if (fs.existsSync(desktopPath)) {
          realExePath = desktopPath;
          realDir = path.dirname(desktopPath);
          console.log(
            "[UpdateService] Ejecutable encontrado en escritorio:",
            desktopPath
          );
        } else if (fs.existsSync(downloadsPath)) {
          realExePath = downloadsPath;
          realDir = path.dirname(downloadsPath);
          console.log(
            "[UpdateService] Ejecutable encontrado en descargas:",
            downloadsPath
          );
        } else if (fs.existsSync(programFilesPath)) {
          realExePath = programFilesPath;
          realDir = path.dirname(programFilesPath);
          console.log(
            "[UpdateService] Ejecutable encontrado en Program Files:",
            programFilesPath
          );
        } else if (fs.existsSync(projectPath)) {
          realExePath = projectPath;
          realDir = path.dirname(projectPath);
          console.log(
            "[UpdateService] Ejecutable encontrado en carpeta del proyecto:",
            projectPath
          );
        } else {
          // Si no encontramos la ubicación real, preguntar al usuario
          throw new Error(
            "No se pudo detectar la ubicación real del ejecutable. Por favor, ejecute la aplicación desde su ubicación de instalación, no desde una carpeta temporal."
          );
        }
      }

      const currentExeName = path.basename(realExePath);

      // Crear nombres únicos para los archivos temporales
      const timestamp = Date.now();
      const logPath = path.join(this.tempDir, `update_${timestamp}.log`);
      const updaterPath = path.join(
        this.tempDir,
        `InboundScope-Updater_${timestamp}.exe`
      );

      console.log("[UpdateService] Ejecutable real:", realExePath);
      console.log("[UpdateService] Ejecutable temporal:", currentExePath);
      console.log("[UpdateService] Nuevo ejecutable:", localUpdatePath);
      console.log("[UpdateService] Updater path:", updaterPath);

      // Crear el directorio de logs si no existe
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }

      // Copiar el updater incluido en la aplicación
      const bundledUpdaterPath = app.isPackaged
        ? path.join(process.resourcesPath, "updater", "updater.exe")
        : path.join(__dirname, "../../updater/updater.exe");

      // Si no existe el updater compilado, crear uno simple con Node.js embebido
      if (!fs.existsSync(bundledUpdaterPath)) {
        console.log(
          "[UpdateService] Updater precompilado no encontrado, creando versión de emergencia..."
        );

        // Crear un script batch que actúe como updater
        const emergencyUpdaterContent = `@echo off
chcp 65001 > nul
title Actualizador de Inbound Scope

echo =======================================
echo   ACTUALIZADOR DE INBOUND SCOPE
echo =======================================
echo.

set "TARGET_EXE=${realExePath}"
set "NEW_EXE=${localUpdatePath}"
set "LOG_FILE=${logPath}"

echo Cerrando Inbound Scope...
taskkill /F /IM "${currentExeName}" > nul 2>&1
timeout /t 3 /nobreak > nul

echo Creando backup...
copy /Y "%TARGET_EXE%" "%TARGET_EXE%.backup" > nul

echo Instalando nueva versión...
copy /Y "%NEW_EXE%" "%TARGET_EXE%" > nul

if exist "%TARGET_EXE%" (
    echo.
    echo ¡Actualización completada!
    timeout /t 2 /nobreak > nul
    
    :: Crear archivo de éxito
    echo success > "${path.join(this.tempDir, "update-success.flag")}"
    
    :: Reiniciar aplicación
    start "" "%TARGET_EXE%"
    
    :: Limpiar
    del /F /Q "%NEW_EXE%" > nul 2>&1
    del /F /Q "%TARGET_EXE%.backup" > nul 2>&1
) else (
    echo.
    echo ERROR: No se pudo actualizar
    echo Restaurando versión anterior...
    copy /Y "%TARGET_EXE%.backup" "%TARGET_EXE%" > nul
    pause
)

exit
`;

        const emergencyUpdaterPath = updaterPath.replace(".exe", ".bat");
        fs.writeFileSync(emergencyUpdaterPath, emergencyUpdaterContent);

        // Ejecutar el batch updater
        const { spawn } = require("child_process");
        const updaterProcess = spawn("cmd.exe", ["/c", emergencyUpdaterPath], {
          detached: true,
          stdio: "ignore",
          windowsHide: false, // Mostrar ventana para que el usuario vea el progreso
        });

        updaterProcess.unref();
      } else {
        // Copiar el updater precompilado
        console.log("[UpdateService] Copiando updater precompilado...");
        fs.copyFileSync(bundledUpdaterPath, updaterPath);

        // Ejecutar el updater con los parámetros necesarios
        const { spawn } = require("child_process");
        const updaterProcess = spawn(
          updaterPath,
          [
            realExePath, // Ejecutable a actualizar
            localUpdatePath, // Nueva versión
            updaterPath, // Ruta del updater (para auto-eliminarse)
          ],
          {
            detached: true,
            stdio: "ignore",
          }
        );

        updaterProcess.unref();
        console.log(
          "[UpdateService] Updater ejecutado con PID:",
          updaterProcess.pid
        );
      }

      // Crear un log inicial
      const initLog = `
==========================================
ACTUALIZACION INICIADA
Fecha: ${new Date().toISOString()}
==========================================
Ejecutable real: ${realExePath}
Nuevo ejecutable: ${localUpdatePath}
Updater: ${updaterPath}
==========================================
`;
      fs.writeFileSync(logPath, initLog);

      console.log("[UpdateService] Proceso de actualización iniciado");
      console.log("[UpdateService] Cerrando aplicación en 2 segundos...");

      // Cerrar la app después de un momento
      setTimeout(() => {
        console.log(
          "[UpdateService] Cerrando aplicación para actualización..."
        );
        app.quit();
      }, 2000);

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
    // Primero verificar si acabamos de actualizar
    this.checkForUpdateCompletion();

    if (!this.config.autoCheck) {
      return null;
    }

    console.log("[UpdateService] Verificando updates al iniciar...");
    return await this.checkForUpdates();
  }

  // Verificar si se completó una actualización y limpiar
  checkForUpdateCompletion() {
    try {
      // Buscar archivos de estado de actualización
      const successFlag = path.join(this.tempDir, "update-success.flag");
      const errorFlag = path.join(this.tempDir, "update-error.flag");

      if (fs.existsSync(successFlag)) {
        console.log("[UpdateService] Actualización completada exitosamente");
        fs.unlinkSync(successFlag);

        // Buscar y cerrar cualquier updater que siga ejecutándose
        this.cleanupUpdaterProcesses();

        // Limpiar archivos temporales
        this.cleanupUpdateFiles();

        // Mostrar notificación de éxito
        const { Notification } = require("electron");
        if (Notification.isSupported()) {
          const notification = new Notification({
            title: "Actualización completada",
            body: `Inbound Scope se ha actualizado correctamente a la versión ${this.config.currentVersion}`,
            icon: app.isPackaged
              ? undefined
              : path.join(__dirname, "../../../assets/icon.png"),
          });
          notification.show();
        }

        return true;
      } else if (fs.existsSync(errorFlag)) {
        const errorMessage = fs.readFileSync(errorFlag, "utf8");
        console.error(
          "[UpdateService] Error en la actualización:",
          errorMessage
        );
        fs.unlinkSync(errorFlag);

        // Limpiar archivos temporales
        this.cleanupUpdateFiles();

        return false;
      }
    } catch (error) {
      console.error(
        "[UpdateService] Error verificando estado de actualización:",
        error
      );
    }

    return null;
  }

  // Cerrar procesos de updater que puedan estar ejecutándose
  cleanupUpdaterProcesses() {
    try {
      const { execSync } = require("child_process");

      // Buscar procesos de updater
      const updaterNames = ["InboundScope-Updater", "updater.exe"];

      updaterNames.forEach((name) => {
        try {
          // Intentar cerrar cualquier updater
          execSync(`taskkill /F /IM "${name}*.exe" 2>NUL`, { stdio: "pipe" });
          console.log(`[UpdateService] Proceso ${name} cerrado`);
        } catch (error) {
          // Ignorar si no existe el proceso
        }
      });
    } catch (error) {
      console.error(
        "[UpdateService] Error limpiando procesos de updater:",
        error
      );
    }
  }
}

module.exports = new UpdateService();
