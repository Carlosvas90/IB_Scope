const { ipcMain, app } = require("electron");
const updateService = require("../services/updateService");

// Verificar updates disponibles
ipcMain.handle("update:check", async () => {
  try {
    console.log("[UpdateHandler] Verificando updates...");
    const result = await updateService.checkForUpdates();
    return { success: true, data: result };
  } catch (error) {
    console.error("[UpdateHandler] Error verificando updates:", error);
    return { success: false, error: error.message };
  }
});

// Descargar update
ipcMain.handle("update:download", async (event, updateInfo) => {
  try {
    console.log("[UpdateHandler] Descargando update...");

    // Callback para reportar progreso
    const progressCallback = (progress) => {
      // Enviar progreso al renderer
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send("update:download-progress", progress);
      }
    };

    const localPath = await updateService.downloadUpdate(
      updateInfo,
      progressCallback
    );
    return { success: true, localPath };
  } catch (error) {
    console.error("[UpdateHandler] Error descargando update:", error);
    return { success: false, error: error.message };
  }
});

// Instalar update
ipcMain.handle("update:install", async (event, localPath) => {
  try {
    console.log("[UpdateHandler] Instalando update...");
    await updateService.installUpdate(localPath);
    return { success: true };
  } catch (error) {
    console.error("[UpdateHandler] Error instalando update:", error);
    return { success: false, error: error.message };
  }
});

// Obtener configuración actual
ipcMain.handle("update:get-config", async () => {
  try {
    return { success: true, config: updateService.config };
  } catch (error) {
    console.error("[UpdateHandler] Error obteniendo config:", error);
    return { success: false, error: error.message };
  }
});

// Verificar updates al iniciar (llamado desde main.js)
ipcMain.handle("update:check-on-startup", async () => {
  try {
    console.log("[UpdateHandler] Verificando updates al iniciar...");
    const result = await updateService.checkOnStartup();
    return { success: true, data: result };
  } catch (error) {
    console.error("[UpdateHandler] Error en verificación de inicio:", error);
    return { success: false, error: error.message };
  }
});

// Handler para obtener la versión actual
ipcMain.handle("get-app-version", async () => {
  try {
    console.log("🔍 [UpdateHandler] get-app-version llamado");
    const version = app.getVersion();
    console.log("🔍 [UpdateHandler] Versión obtenida del app:", version);

    return {
      success: true,
      version: version,
    };
  } catch (error) {
    console.error("❌ [UpdateHandler] Error obteniendo versión:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

console.log("[UpdateHandler] Handlers de update registrados");
