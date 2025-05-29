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

  // --- Utilidades ---
  getAppPath: () => ipcRenderer.invoke("get-app-path"),

  // --- Sistema de archivos para aplicaciones compiladas ---
  /**
   * Lee un archivo HTML desde el sistema de archivos (para aplicaciones compiladas).
   * @param {string} filePath - Ruta relativa del archivo
   * @returns {Promise<object>} - Resultado con contenido del archivo HTML
   */
  readHtmlFile: (filePath) => ipcRenderer.invoke("read-html-file", filePath),

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
    const localPath = config.permisosPath;

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

    // 2. Si falla, intentar leer desde el archivo local (main)
    try {
      console.log("[getPermisos] localPath:", localPath);
      const result = await ipcRenderer.invoke("read-json", localPath);
      console.log("[getPermisos] Resultado de read-json:", result);
      if (result && result.success) {
        return result.data;
      } else {
        return null;
      }
    } catch (e) {
      // Si falla, retorna null
      return null;
    }
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
