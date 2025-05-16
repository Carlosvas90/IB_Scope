export class AutoRefreshService {
  constructor() {
    this.autoRefreshInterval = null;
    this.autoRefreshTime = 0; // en segundos, 0 o <=0 significa deshabilitado
    this.refreshCallback = null;
    this.configSaveCallback = null; // Para guardar la configuración global
    console.log("AutoRefreshService inicializado");
  }

  /**
   * Configura e inicia la actualización automática.
   * @param {number} seconds - Intervalo en segundos. Si es <= 0, se deshabilita.
   * @param {Function} refreshCallback - Función a llamar para refrescar los datos.
   * @param {Function} [configSaveFn] - Función opcional para guardar la configuración (ej: window.api.saveConfig).
   */
  configure(seconds, refreshCallback, configSaveFn) {
    this.stop(); // Detener cualquier intervalo existente

    this.autoRefreshTime = seconds;
    this.refreshCallback = refreshCallback;
    if (configSaveFn && typeof configSaveFn === "function") {
      this.configSaveCallback = configSaveFn;
    }

    if (
      this.autoRefreshTime <= 0 ||
      typeof this.refreshCallback !== "function"
    ) {
      console.log(
        "AutoRefreshService: Actualización automática deshabilitada o callback no válido."
      );
      return;
    }

    console.log(
      `AutoRefreshService: Configurando auto-refresh cada ${this.autoRefreshTime} segundos.`
    );
    this.autoRefreshInterval = setInterval(async () => {
      console.log("AutoRefreshService: Ejecutando refreshCallback...");
      try {
        const success = await this.refreshCallback();
        if (success) {
          console.log(
            "AutoRefreshService: refreshCallback ejecutado con éxito."
          );
        }
      } catch (error) {
        console.error(
          "AutoRefreshService: Error durante la ejecución del refreshCallback:",
          error
        );
      }
    }, this.autoRefreshTime * 1000);

    this.saveConfig(this.autoRefreshTime);
  }

  /**
   * Detiene la actualización automática.
   */
  stop() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
      console.log("AutoRefreshService: Actualización automática detenida.");
    }
  }

  /**
   * Guarda el tiempo de actualización automática en la configuración global.
   * Intenta usar configSaveCallback si está disponible.
   * @param {number} seconds - El tiempo de refresco en segundos.
   */
  async saveConfig(seconds) {
    if (this.configSaveCallback) {
      try {
        // Obtener configuración actual para no sobrescribir otras apps
        const currentGlobalConfig = await window.api.getConfig();
        const updatedConfig = { ...currentGlobalConfig, auto_refresh: seconds };
        await this.configSaveCallback(updatedConfig);
        console.log(
          `AutoRefreshService: Tiempo de auto-refresh (${seconds}s) guardado en config.`
        );
      } catch (error) {
        console.warn(
          "AutoRefreshService: Error al guardar tiempo de actualización en config global:",
          error
        );
      }
    } else if (
      window.api &&
      typeof window.api.saveConfig === "function" &&
      typeof window.api.getConfig === "function"
    ) {
      // Fallback a window.api.saveConfig y getConfig directamente si configSaveCallback no se pasó
      // pero DataService lo usaba antes, así mantenemos esa lógica como respaldo.
      console.warn(
        "AutoRefreshService: configSaveCallback no fue provisto, usando window.api.saveConfig directamente."
      );
      try {
        const currentGlobalConfig = await window.api.getConfig();
        const updatedConfig = { ...currentGlobalConfig, auto_refresh: seconds };
        await window.api.saveConfig(updatedConfig);
        console.log(
          `AutoRefreshService: Tiempo de auto-refresh (${seconds}s) guardado en config vía fallback.`
        );
      } catch (error) {
        console.warn(
          "AutoRefreshService: Error al guardar tiempo de actualización en config (fallback):",
          error
        );
      }
    } else {
      console.warn(
        "AutoRefreshService: No se proporcionó una función para guardar la configuración ni se encontró window.api.saveConfig."
      );
    }
  }

  /**
   * Limpia los recursos (detiene el intervalo).
   */
  dispose() {
    this.stop();
    console.log("AutoRefreshService: Disposed.");
  }
}
