const { ipcMain } = require("electron");
const configService = require("../services/config");

class ConfigHandler {
  constructor() {
    this.setupHandlers();
  }

  setupHandlers() {
    // Obtener configuración
    ipcMain.handle("get-config", async () => {
      const config = configService.getConfig();
      console.log("[IPC get-config] config:", config);
      return config;
    });

    // Guardar configuración
    ipcMain.handle("save-config", async (event, newConfig) => {
      return await configService.save(newConfig);
    });

    // Actualizar tiempo de autorefresh
    ipcMain.handle("update-auto-refresh", async (event, seconds) => {
      const config = configService.getConfig();
      config.auto_refresh = seconds;
      return await configService.save(config);
    });

    // Actualizar tema preferido
    ipcMain.handle("update-theme", async (event, theme) => {
      const config = configService.getConfig();
      config.preferred_theme = theme;
      return await configService.save(config);
    });
  }
}

module.exports = new ConfigHandler();
