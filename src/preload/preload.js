// src/preload/preload.js
// -------------------------------------------------------------
// Este script se ejecuta antes que cualquier otro en el renderer.
// Su función es exponer APIs seguras y controladas desde el main process
// al renderer, usando contextBridge y evitando exponer Node.js directamente.
// -------------------------------------------------------------

const { contextBridge, ipcRenderer } = require("electron");
console.log("Cargando script de preload...");

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

  // APIs de tema
  onThemeChange: (callback) => {
    ipcRenderer.on("theme-changed", (_, theme) => callback(theme));
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
