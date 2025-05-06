// src/preload/preload.js

const { contextBridge, ipcRenderer } = require("electron");

console.log("Cargando script de preload...");

// Exponer APIs protegidas a través del puente de contexto
contextBridge.exposeInMainWorld("api", {
  // Sistema
  getUsername: () => ipcRenderer.invoke("get-username"),

  // Archivos
  readJson: (filePath) => ipcRenderer.invoke("read-json", filePath),
  saveJson: (filePath, data) => ipcRenderer.invoke("save-json", filePath, data),
  exportToCsv: (data) => ipcRenderer.invoke("export-to-csv", data),

  // Diálogos
  showOpenDialog: (options) => ipcRenderer.invoke("show-open-dialog", options),
  showSaveDialog: (options) => ipcRenderer.invoke("show-save-dialog", options),
  showMessageBox: (options) => ipcRenderer.invoke("show-message-box", options),

  // Configuración
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (config) => ipcRenderer.invoke("save-config", config),

  // Utilidades
  getAppPath: () => ipcRenderer.invoke("get-app-path"),
});

// Exponer objeto para comunicación directa entre aplicaciones
contextBridge.exposeInMainWorld("ipcRenderer", {
  // Solo implementaciones seguras
  send: (channel, ...args) => {
    const validChannels = ["app:initialized", "app:error", "config:changed"];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
  on: (channel, callback) => {
    const validChannels = ["app:ready", "data:updated", "theme:changed"];
    if (validChannels.includes(channel)) {
      // Envolver para evitar prototipo expuesto
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  once: (channel, callback) => {
    const validChannels = ["app:ready", "data:updated", "theme:changed"];
    if (validChannels.includes(channel)) {
      // Envolver para evitar prototipo expuesto
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

// Exponer el router como un objeto global para que las aplicaciones puedan utilizarlo
contextBridge.exposeInMainWorld("router", {
  navigateTo: (app, view) => {
    // Enviar un mensaje al frontend para que maneje la navegación
    window.dispatchEvent(
      new CustomEvent("navigate", {
        detail: { app, view },
      })
    );
  },
});

// Informar que el preload ha sido cargado
console.log("Preload cargado correctamente");

// Enviar evento de preload cargado al proceso principal
ipcRenderer.send("preload:loaded");
