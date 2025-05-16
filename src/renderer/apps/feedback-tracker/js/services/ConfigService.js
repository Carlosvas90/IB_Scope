export class ConfigService {
  constructor() {
    this.defaultFileNames = {
      errors: "error_tracker.json",
    };
    // this.defaultDataPaths = []; // Eliminado, ya no hay fallback codificado para dataPaths
    console.log("ConfigService: Instancia creada.");
  }

  async loadAppConfig() {
    console.log(
      "ConfigService.loadAppConfig: Iniciando carga de configuración."
    );
    let loadedConfig = {
      dataPaths: [], // Inicializar como array vacío. Solo se poblará si config.json lo define.
      fileNames: { ...this.defaultFileNames },
      autoRefreshSeconds: null, // null indica no configurado o inválido
    };

    try {
      const rawConfig = await window.api.getConfig();
      console.log(
        "ConfigService: Objeto config RECIBIDO de window.api.getConfig():",
        JSON.stringify(rawConfig, null, 2)
      );

      if (!rawConfig) {
        console.warn(
          "ConfigService: window.api.getConfig() devolvió null o undefined. No se cargarán data_paths."
        );
        // dataPaths permanece [], fileNames tiene defaults, autoRefreshSeconds es null.
        return loadedConfig;
      }

      // Establecer rutas de datos desde config. Si no, dataPaths permanece [].
      if (
        rawConfig.data_paths &&
        Array.isArray(rawConfig.data_paths) &&
        rawConfig.data_paths.length > 0
      ) {
        loadedConfig.dataPaths = rawConfig.data_paths;
        console.log(
          "ConfigService: Rutas de datos cargadas de config.json:",
          loadedConfig.dataPaths
        );
      } else {
        console.warn(
          "ConfigService: 'data_paths' no encontradas o vacías en config.json. dataPaths permanecerá vacío. Las operaciones de archivo podrían fallar."
        );
        // loadedConfig.dataPaths ya es []
      }

      // Cargar nombres de archivos si están configurados para feedback-tracker
      if (
        rawConfig.apps &&
        rawConfig.apps["feedback-tracker"] &&
        rawConfig.apps["feedback-tracker"].files
      ) {
        loadedConfig.fileNames = {
          ...loadedConfig.fileNames, // Mantiene los defaults si algunos no están en config
          ...rawConfig.apps["feedback-tracker"].files,
        };
        console.log(
          "ConfigService: Nombres de archivos para feedback-tracker cargados/actualizados:",
          loadedConfig.fileNames
        );
      } else {
        console.log(
          "ConfigService: No se encontraron nombres de archivo específicos para 'feedback-tracker' en config.json. Se usarán los predeterminados."
        );
      }

      // Configurar autorefresh si está configurado y es un número válido
      if (
        rawConfig &&
        typeof rawConfig.auto_refresh === "number" &&
        rawConfig.auto_refresh > 0
      ) {
        loadedConfig.autoRefreshSeconds = rawConfig.auto_refresh;
        console.log(
          "ConfigService: Auto-refresh configurado a (segundos):",
          loadedConfig.autoRefreshSeconds
        );
      } else {
        console.log(
          "ConfigService: Auto-refresh no configurado, valor no numérico, o no positivo en config.json. Auto-refresh estará deshabilitado."
        );
        // loadedConfig.autoRefreshSeconds ya es null
      }
    } catch (configError) {
      console.error(
        "ConfigService: Error crítico al cargar configuración desde window.api.getConfig(). dataPaths estará vacío y auto-refresh deshabilitado.",
        configError
      );
      loadedConfig.dataPaths = []; // Asegurar que dataPaths esté vacío en caso de error total
      // fileNames ya tiene los defaultFileNames
      loadedConfig.autoRefreshSeconds = null; // Asegurar que esté deshabilitado
    }

    console.log(
      "ConfigService.loadAppConfig: Configuración final procesada:",
      loadedConfig
    );
    return loadedConfig;
  }
}
