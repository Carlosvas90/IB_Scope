// src/main/main.js

const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Variable para mantener referencia global a la ventana
let mainWindow;

// Configuración global
const configPath = path.join(app.getPath("userData"), "config.json");
let config = {
  error_tracker_path:
    "C:\\Users\\carlo\\Downloads\\0-Proyecto_IB_Scope\\Analisis\\error_tracker.json",
  preferred_theme: "light",
  auto_refresh: 60,
};

// Función para crear la ventana principal
function createWindow() {
  // Crear la ventana del navegador
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/preload.js"),
    },
    show: false, // No mostrar hasta que esté lista para evitar parpadeos
  });

  // Cargar el archivo HTML principal
  mainWindow.loadFile(path.join(__dirname, "../renderer/views/index.html"));

  // Abrir DevTools solo en modo desarrollo
  if (process.argv.includes("--dev")) {
    mainWindow.webContents.openDevTools();
  }

  // Mostrar la ventana cuando esté lista
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Cerrar referencia cuando la ventana se cierra
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Crear ventana cuando la app está lista
app.whenReady().then(() => {
  // Cargar configuración antes de iniciar
  loadConfig();

  // Crear la ventana
  createWindow();
});

// Salir cuando todas las ventanas estén cerradas, excepto en macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  // En macOS es común recrear una ventana cuando
  // se hace clic en el icono del dock y no hay otras ventanas abiertas
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Cargar configuración
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, "utf-8");
      const loadedConfig = JSON.parse(data);
      config = { ...config, ...loadedConfig };
    } else {
      // Si no existe, crear archivo con configuración por defecto
      saveConfig(config);
    }
  } catch (error) {
    console.error("Error al cargar configuración:", error);
  }
}

// Guardar configuración
function saveConfig(newConfig) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), "utf-8");
    config = newConfig;
    return true;
  } catch (error) {
    console.error("Error al guardar configuración:", error);
    return false;
  }
}

// ==== MANEJADORES DE IPC ====

// Sistema
ipcMain.handle("get-username", () => {
  return os.userInfo().username;
});

ipcMain.handle("get-app-path", () => {
  return app.getAppPath();
});

// Abrir enlaces externos
ipcMain.handle("open-external-link", async (event, url) => {
  try {
    if (url && typeof url === "string") {
      // Validar que la URL comienza con http:// o https://
      if (url.startsWith("http://") || url.startsWith("https://")) {
        await shell.openExternal(url);
        return { success: true };
      } else {
        return {
          success: false,
          error: "URL inválida: debe comenzar con http:// o https://",
        };
      }
    } else {
      return { success: false, error: "URL no válida" };
    }
  } catch (error) {
    console.error("Error al abrir enlace externo:", error);
    return { success: false, error: error.message };
  }
});

// Configuración
ipcMain.handle("get-config", () => {
  return config;
});

ipcMain.handle("save-config", (event, newConfig) => {
  const success = saveConfig(newConfig);
  return { success };
});

// Archivos
ipcMain.handle("read-json", async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return { success: true, data: JSON.parse(data) };
    } else {
      return { success: false, error: "Archivo no encontrado" };
    }
  } catch (error) {
    console.error("Error al leer el archivo:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("save-json", async (event, filePath, data) => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonString, "utf-8");
    return { success: true };
  } catch (error) {
    console.error("Error al guardar el archivo:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("export-to-csv", async (event, data) => {
  try {
    // Mostrar diálogo para guardar archivo
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Exportar a CSV",
      defaultPath: `errores_${new Date().toISOString().replace(/:/g, "-")}.csv`,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });

    if (canceled) {
      return { success: false, error: "Operación cancelada por el usuario" };
    }

    // Guardar archivo
    fs.writeFileSync(filePath, data, "utf-8");

    return { success: true, filePath };
  } catch (error) {
    console.error("Error al exportar a CSV:", error);
    return { success: false, error: error.message };
  }
});

// Diálogos
ipcMain.handle("show-open-dialog", async (event, options) => {
  try {
    return await dialog.showOpenDialog(options);
  } catch (error) {
    console.error("Error en diálogo de abrir:", error);
    return { canceled: true, error: error.message };
  }
});

ipcMain.handle("show-save-dialog", async (event, options) => {
  try {
    return await dialog.showSaveDialog(options);
  } catch (error) {
    console.error("Error en diálogo de guardar:", error);
    return { canceled: true, error: error.message };
  }
});

ipcMain.handle("show-message-box", async (event, options) => {
  try {
    return await dialog.showMessageBox(options);
  } catch (error) {
    console.error("Error en diálogo de mensaje:", error);
    return { response: 0, error: error.message };
  }
});

// Eventos generales
ipcMain.on("preload:loaded", () => {
  console.log("Preload cargado correctamente");
});

// ==== FIN MANEJADORES IPC ====
