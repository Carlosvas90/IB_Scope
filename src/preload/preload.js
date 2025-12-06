// src/preload/preload.js
// -------------------------------------------------------------
// Este script se ejecuta antes que cualquier otro en el renderer.
// Su función es exponer APIs seguras y controladas desde el main process
// al renderer, usando contextBridge y evitando exponer Node.js directamente.
// -------------------------------------------------------------

const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
console.log("Cargando script de preload...");

// -------------------------------------------------------------
// API para el splashscreen: window.splashAPI
// Se usa solo en la ventana de splashscreen
// -------------------------------------------------------------
contextBridge.exposeInMainWorld("splashAPI", {
  // Notificar que el splashscreen está listo
  splashReady: () => {
    console.log("Enviando evento splash:ready desde preload");
    ipcRenderer.send("splash:ready");
  },
});

// -------------------------------------------------------------
// API principal: window.api
// Expone métodos seguros para acceder a funcionalidades del main process
// -------------------------------------------------------------
contextBridge.exposeInMainWorld("api", {
  // --- Sistema ---
  /**
   * Obtiene el nombre de usuario del sistema operativo.
   * @returns {Promise<string>}
   */
  getUsername: () => ipcRenderer.invoke("get-username"),

  /**
   * Obtiene la ruta de userData de Electron (donde se guardan datos de la app).
   * @returns {Promise<string>}
   */
  getUserDataPath: () => ipcRenderer.invoke("get-user-data-path"),

  /**
   * Obtiene información sobre un archivo (existe, fecha modificación, tamaño).
   * @param {string} filePath
   * @returns {Promise<object>}
   */
  getFileInfo: (filePath) => ipcRenderer.invoke("get-file-info", filePath),

  // --- Archivos ---
  /**
   * Lee un archivo JSON desde el sistema de archivos.
   * @param {string} filePath
   * @returns {Promise<object>}
   */
  readJson: (filePath) => ipcRenderer.invoke("read-json", filePath),
  /**
   * Guarda un objeto como JSON en el sistema de archivos.
   * @param {string} filePath
   * @param {object} data
   * @returns {Promise<object>}
   */
  saveJson: (filePath, data) => ipcRenderer.invoke("save-json", filePath, data),
  /**
   * Alias de saveJson para compatibilidad.
   * @param {string} filePath
   * @param {object} data
   * @returns {Promise<object>}
   */
  writeJson: (filePath, data) =>
    ipcRenderer.invoke("save-json", filePath, data),
  /**
   * Exporta datos a un archivo CSV.
   * @param {string} data
   * @returns {Promise<object>}
   */
  exportToCsv: (data) => ipcRenderer.invoke("export-to-csv", data),

  // --- Diálogos del sistema ---
  showOpenDialog: (options) => ipcRenderer.invoke("show-open-dialog", options),
  showSaveDialog: (options) => ipcRenderer.invoke("show-save-dialog", options),
  showMessageBox: (options) => ipcRenderer.invoke("show-message-box", options),

  // --- Configuración ---
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (config) => ipcRenderer.invoke("save-config", config),

  // --- Base de datos SQLite ---
  /**
   * Verifica si un archivo existe en el sistema de archivos.
   * @param {string} filePath - Ruta del archivo a verificar
   * @returns {Promise<boolean>} - True si el archivo existe
   */
  fileExists: (filePath) => ipcRenderer.invoke("file-exists", filePath),

  /**
   * Ejecuta una consulta SQL en una base de datos SQLite.
   * @param {string} dbPath - Ruta de la base de datos SQLite
   * @param {string} sql - Consulta SQL a ejecutar
   * @param {Array} params - Parámetros para la consulta SQL
   * @returns {Promise<Array>} - Resultado de la consulta
   */
  queryDatabase: (dbPath, sql, params = []) =>
    ipcRenderer.invoke("query-database", dbPath, sql, params),

  /**
   * Obtiene el esquema de una tabla en una base de datos SQLite.
   * @param {string} dbPath - Ruta de la base de datos SQLite
   * @param {string} tableName - Nombre de la tabla
   * @returns {Promise<Array>} - Esquema de la tabla
   */
  getTableSchema: (dbPath, tableName) =>
    ipcRenderer.invoke("get-table-schema", dbPath, tableName),

  // --- Utilidades ---
  getAppPath: () => ipcRenderer.invoke("get-app-path"),

  // --- Sistema de archivos para aplicaciones compiladas ---
  /**
   * Lee un archivo HTML desde el sistema de archivos (para aplicaciones compiladas).
   * @param {string} filePath - Ruta relativa del archivo
   * @returns {Promise<object>} - Resultado con contenido del archivo HTML
   */
  readHtmlFile: (filePath) => ipcRenderer.invoke("read-html-file", filePath),

  /**
   * Lee un archivo genérico (SVG, CSS, etc.) desde el sistema de archivos.
   * @param {string} filePath - Ruta relativa del archivo desde la raíz del proyecto
   * @returns {Promise<object>} - Resultado con contenido del archivo
   */
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  /**
   * Lee un archivo desde una ruta absoluta (especialmente útil para userData).
   * @param {string} filePath - Ruta absoluta del archivo
   * @returns {Promise<object>} - { success: boolean, content?: string, error?: string }
   */
  readFileAbsolute: (filePath) => ipcRenderer.invoke("read-file-absolute", filePath),

  // --- Enlaces externos ---
  openExternalLink: (url) => ipcRenderer.invoke("open-external-link", url),

  // APIs del titlebar
  minimize: () => ipcRenderer.invoke("minimize-window"),
  maximize: () => ipcRenderer.invoke("maximize-window"),
  close: () => ipcRenderer.invoke("close-window"),

  // Saber si la ventana está maximizada
  isWindowMaximized: () => ipcRenderer.invoke("is-window-maximized"),

  // Escuchar eventos de maximizar/restaurar
  onWindowMaximized: (callback) => {
    ipcRenderer.on("window:maximized", callback);
  },
  onWindowRestored: (callback) => {
    ipcRenderer.on("window:restored", callback);
  },

  // --- Ejecución de Scripts de Python ---
  /**
   * Ejecuta un script de Python y devuelve el resultado.
   * @param {object} options - { scriptPath: string, args: Array }
   * @returns {Promise<object>}
   */
  executePythonScript: (options) =>
    ipcRenderer.invoke("execute-python-script", options),

  /**
   * Verifica si Python está disponible en el sistema.
   * @returns {Promise<object>} - { available: boolean, portable: boolean, version: string, error: string }
   */
  checkPython: () => ipcRenderer.invoke("check-python"),

  /**
   * Instala Python portable en la aplicación.
   * @returns {Promise<object>} - { success: boolean, message: string, error: string }
   */
  installPortablePython: () => ipcRenderer.invoke("install-portable-python"),

  /**
   * Escucha el progreso de instalación de Python portable.
   * @param {function} callback - Función a ejecutar con el progreso
   */
  onPythonInstallProgress: (callback) => {
    ipcRenderer.on("python-install-progress", (event, progress) =>
      callback(progress)
    );
  },

  /**
   * Verifica si las dependencias de Python están instaladas.
   * @returns {Promise<object>} - { installed: boolean, missing: Array }
   */
  checkPythonDependencies: () =>
    ipcRenderer.invoke("check-python-dependencies"),

  // --- Sistema de Updates ---
  /**
   * Verifica si hay actualizaciones disponibles.
   * @returns {Promise<object>}
   */
  checkForUpdates: () => ipcRenderer.invoke("update:check"),

  /**
   * Descarga una actualización.
   * @param {object} updateInfo - Información de la actualización
   * @returns {Promise<object>}
   */
  downloadUpdate: (updateInfo) =>
    ipcRenderer.invoke("update:download", updateInfo),

  /**
   * Instala una actualización descargada.
   * @param {string} localPath - Ruta local del archivo de actualización
   * @returns {Promise<object>}
   */
  installUpdate: (localPath) => ipcRenderer.invoke("update:install", localPath),

  /**
   * Obtiene la configuración del sistema de updates.
   * @returns {Promise<object>}
   */
  getUpdateConfig: () => ipcRenderer.invoke("update:get-config"),

  /**
   * Obtiene la versión actual de la aplicación.
   * @returns {Promise<object>}
   */
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  /**
   * Escucha notificaciones de actualizaciones disponibles.
   * @param {function} callback - Función a ejecutar cuando hay update disponible
   */
  onUpdateAvailable: (callback) => {
    ipcRenderer.on("update:available", (event, updateInfo) =>
      callback(updateInfo)
    );
  },

  /**
   * Escucha el progreso de descarga de actualizaciones.
   * @param {function} callback - Función a ejecutar con el progreso (0-100)
   */
  onUpdateDownloadProgress: (callback) => {
    ipcRenderer.on("update:download-progress", (event, progress) =>
      callback(progress)
    );
  },

  // APIs de tema
  onThemeChange: (callback) => {
    ipcRenderer.on("theme-changed", (_, theme) => callback(theme));
  },

  /**
   * Obtiene los permisos de apps desde la URL o desde el archivo local.
   * @returns {Promise<object>} El objeto de permisos
   */
  getPermisos: async () => {
    // Obtener la configuración desde el main
    const config = await ipcRenderer.invoke("get-config");
    const url = config.permisosUrl;
    const localPaths = config.permisosPath;

    // 1. Intentar leer desde la URL
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (e) {
      // Si falla, continúa al siguiente paso
    }

    // 2. Si falla, intentar leer desde archivos locales (main)
    const paths = Array.isArray(localPaths) ? localPaths : [localPaths];

    for (const localPath of paths) {
      try {
        console.log("[getPermisos] Intentando leer:", localPath);
        const result = await ipcRenderer.invoke("read-json", localPath);
        console.log("[getPermisos] Resultado de read-json:", result);
        if (result && result.success) {
          return result.data;
        }
      } catch (e) {
        console.log("[getPermisos] Error al leer", localPath, ":", e.message);
        // Continúa con la siguiente ruta
      }
    }

    console.log("[getPermisos] No se pudo leer ningún archivo de permisos");
    return null;
  },

  /**
   * Obtiene la ruta primaria donde se guardan/leen archivos de configuración
   * @returns {Promise<string>} La ruta del directorio de permisos
   */
  getPermisosDir: async () => {
    const config = await ipcRenderer.invoke("get-config");
    const localPaths = config.permisosPath;
    const paths = Array.isArray(localPaths) ? localPaths : [localPaths];

    // Devolver el directorio de la primera ruta válida
    for (const localPath of paths) {
      try {
        const result = await ipcRenderer.invoke("read-json", localPath);
        if (result && result.success) {
          // Extraer directorio eliminando el nombre del archivo
          return localPath.replace(/[^/\\]*\.json$/, "");
        }
      } catch (e) {
        // Continúa con la siguiente ruta
      }
    }

    // Si no encuentra ninguna válida, usar la primera como fallback
    return paths[0].replace(/[^/\\]*\.json$/, "");
  },

  /**
   * Guarda datos de permisos en todas las rutas configuradas
   * @param {object} data - Los datos de permisos a guardar
   * @returns {Promise<object>} Resultado de la operación
   */
  savePermisos: async (data) => {
    const config = await ipcRenderer.invoke("get-config");
    const localPaths = config.permisosPath;
    const paths = Array.isArray(localPaths) ? localPaths : [localPaths];

    const results = [];

    for (const localPath of paths) {
      try {
        const result = await ipcRenderer.invoke("save-json", localPath, data);
        results.push({ path: localPath, result });
      } catch (e) {
        results.push({
          path: localPath,
          result: { success: false, error: e.message },
        });
      }
    }

    // Devolver éxito si al menos una operación fue exitosa
    const successful = results.some((r) => r.result && r.result.success);
    return {
      success: successful,
      results: results,
      message: successful
        ? "Permisos guardados correctamente"
        : "Error al guardar permisos en todas las rutas",
    };
  },
});

// -------------------------------------------------------------
// Comunicación directa entre renderer y main (solo canales seguros)
// window.ipcRenderer
// -------------------------------------------------------------
contextBridge.exposeInMainWorld("ipcRenderer", {
  // Solo permite enviar en canales validados
  send: (channel, ...args) => {
    const validChannels = ["app:initialized", "app:error", "config:changed"];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
  on: (channel, callback) => {
    const validChannels = ["app:ready", "data:updated", "theme:changed"];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  once: (channel, callback) => {
    const validChannels = ["app:ready", "data:updated", "theme:changed"];
    if (validChannels.includes(channel)) {
      ipcRenderer.once(channel, (event, ...args) => callback(...args));
    }
  },
  removeListener: (channel, callback) => {
    const validChannels = ["app:ready", "data:updated", "theme:changed"];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    }
  },
});

// -------------------------------------------------------------
// Exponer el router como un objeto global para navegación centralizada
// window.router.navigateTo(app, view)
// -------------------------------------------------------------
contextBridge.exposeInMainWorld("router", {
  /**
   * Navega a una app/vista usando el sistema de eventos global.
   * @param {string} app
   * @param {string} view
   */
  navigateTo: (app, view) => {
    window.dispatchEvent(
      new CustomEvent("navigate", {
        detail: { app, view },
      })
    );
  },
});

// -------------------------------------------------------------
// Informar que el preload ha sido cargado
// -------------------------------------------------------------
console.log("Preload cargado correctamente");
ipcRenderer.send("preload:loaded");
