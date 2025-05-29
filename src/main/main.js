// src/main/main.js

const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const configService = require("./services/config");
const configHandler = require("./handlers/config");
const filesHandler = require("./handlers/files");
const updateHandler = require("./handlers/update");
const updateService = require("./services/updateService");

// Variables para mantener referencia global a las ventanas
let mainWindow;
let splashWindow;

// Función para crear la ventana de splashscreen
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/preload.js"),
    },
    show: false,
  });

  // Cargar el archivo HTML del splashscreen
  splashWindow.loadFile(path.join(__dirname, "../renderer/views/splash.html"));

  // Mostrar la ventana cuando esté lista
  splashWindow.once("ready-to-show", () => {
    splashWindow.show();
  });
}

// Variables para control de tiempo de splashscreen
let appReady = false;
let splashReady = false;
let minTimeElapsed = false;
const MIN_SPLASH_DURATION = 2500; // 2.5 segundos mínimo para el splashscreen

// Función para cerrar el splashscreen si se cumplen todas las condiciones
function checkAndCloseSplash() {
  console.log(
    `Estado de cierre: appReady=${appReady}, splashReady=${splashReady}, minTimeElapsed=${minTimeElapsed}`
  );

  if (appReady && splashReady && minTimeElapsed && splashWindow) {
    console.log("Cerrando splashscreen y mostrando ventana principal");
    splashWindow.destroy();
    splashWindow = null;
    mainWindow.show();
  }

  // Agregar un mecanismo de seguridad para forzar cierre después de 5 segundos
  // incluso si no se cumplen todas las condiciones
  if (splashWindow && !mainWindow.isVisible()) {
    setTimeout(() => {
      console.log("Forzando cierre del splashscreen por timeout de seguridad");
      if (splashWindow) {
        splashWindow.destroy();
        splashWindow = null;
        mainWindow.show();
      }
    }, 5000);
  }
}

// Evento cuando el splashscreen está listo
ipcMain.on("splash:ready", () => {
  console.log("Splashscreen listo - evento recibido");
  splashReady = true;

  // Iniciar temporizador para tiempo mínimo
  setTimeout(() => {
    console.log("Tiempo mínimo de splash completado");
    minTimeElapsed = true;
    checkAndCloseSplash();
  }, MIN_SPLASH_DURATION);
});

// Crear ventana cuando la app está lista
app.whenReady().then(async () => {
  // Cargar configuración antes de iniciar
  await configService.load();
  configService.getConfig(); // Forzar log para depuración

  // Verificar updates al iniciar la app
  await checkForUpdatesOnStartup();

  // Crear primero el splashscreen
  createSplashWindow();

  // Luego crear la ventana principal (quedará oculta hasta que se cierre el splash)
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

// ==== MANEJADORES DE IPC RESTANTES ====

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

// Titlebar controls
ipcMain.handle("minimize-window", () => {
  mainWindow.minimize();
});

ipcMain.handle("maximize-window", () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle("close-window", () => {
  mainWindow.close();
});

// IPC para saber si la ventana está maximizada
ipcMain.handle("is-window-maximized", () => {
  return mainWindow.isMaximized();
});

// Leer archivos HTML para aplicaciones compiladas
ipcMain.handle("read-html-file", (event, filePath) => {
  try {
    console.log("[Main] Leyendo archivo HTML:", filePath);
    console.log("[Main] App empaquetada:", app.isPackaged);

    let fullPath;
    if (app.isPackaged) {
      // En aplicación compilada, convertir "../apps/..." a la ruta dentro del asar
      const relativePath = filePath.replace("../apps/", "apps/");
      fullPath = path.join(__dirname, "..", relativePath);
    } else {
      // En desarrollo, convertir "../apps/..." a "src/renderer/apps/..."
      const relativePath = filePath.replace("../apps/", "apps/");
      fullPath = path.join(process.cwd(), "src", "renderer", relativePath);
    }

    console.log("[Main] Ruta completa calculada:", fullPath);

    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      console.log("[Main] ✅ Archivo leído exitosamente");
      return { success: true, content };
    } else {
      console.error("[Main] ❌ Archivo no encontrado:", fullPath);
      // Listar contenido del directorio padre para debugging
      const parentDir = path.dirname(fullPath);
      if (fs.existsSync(parentDir)) {
        const files = fs.readdirSync(parentDir);
        console.log("[Main] Archivos en directorio padre:", files);
      }
      return { success: false, error: `Archivo no encontrado: ${fullPath}` };
    }
  } catch (error) {
    console.error("[Main] Error leyendo archivo HTML:", error);
    return { success: false, error: error.message };
  }
});

// Eventos generales
ipcMain.on("preload:loaded", () => {
  console.log("Preload cargado correctamente");
});

// ==== FIN MANEJADORES IPC ====

// Función para crear la ventana principal
function createWindow() {
  // Crear la ventana del navegador
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    frame: false, // Ocultar el frame nativo
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, "../preload/preload.js"),
    },
    show: false, // No mostrar hasta que esté lista para evitar parpadeos
  });

  // Cargar el archivo HTML principal
  mainWindow.loadFile(path.join(__dirname, "../renderer/views/Sidebar.html"));

  // Abrir DevTools solo en modo desarrollo
  if (process.argv.includes("--dev")) {
    mainWindow.webContents.openDevTools();
  }

  // Cuando la ventana principal esté lista, esperar un tiempo mínimo antes de cerrar el splash
  mainWindow.webContents.once("did-finish-load", () => {
    // Notificar que la aplicación principal está lista
    console.log("Ventana principal cargada completamente");
    appReady = true;
    checkAndCloseSplash();

    // Notificar sobre updates disponibles después de que la ventana esté lista
    setTimeout(() => {
      if (global.updateAvailable) {
        console.log("[Main] Notificando update disponible al renderer");
        mainWindow.webContents.send("update:available", global.updateAvailable);
      }
    }, 1000); // Esperar 1 segundo para que la UI esté completamente cargada
  });

  // Añadir un listener alternativo por si el anterior falla
  setTimeout(() => {
    if (!appReady) {
      console.log("Forzando appReady=true después de timeout");
      appReady = true;
      checkAndCloseSplash();
    }
  }, 3000);

  // Emitir eventos de maximizar/restaurar
  mainWindow.on("maximize", () => {
    mainWindow.webContents.send("window:maximized");
  });
  mainWindow.on("unmaximize", () => {
    mainWindow.webContents.send("window:restored");
  });

  // Cerrar referencia cuando la ventana se cierra
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Función para verificar updates al iniciar
async function checkForUpdatesOnStartup() {
  try {
    console.log("[Main] Verificando updates al iniciar...");
    const updateResult = await updateService.checkOnStartup();

    if (updateResult && updateResult.available) {
      console.log("[Main] Update disponible:", updateResult);
      // Marcar que hay un update disponible para notificar después
      global.updateAvailable = updateResult;
    } else {
      console.log("[Main] No hay updates disponibles");
    }
  } catch (error) {
    console.error("[Main] Error verificando updates:", error);
  }
}
