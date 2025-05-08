const fs = require("fs");
const path = require("path");
const { app } = require("electron");

class ConfigService {
  constructor() {
    this.configPath = path.join(app.getPath("userData"), "config.json");
    this.config = this.getDefaultConfig();
  }

  getDefaultConfig() {
    return {
      data_paths: [
        "\\\\ant\\dept-eu\\VLC1\\Public\\Apps_Tools\\chuecc\\IB_Scope\\Data\\",
        "C:\\Users\\carlo\\Downloads\\0-Proyecto_IB_Scope\\Analisis\\Data\\",
      ],
      preferred_theme: "light",
      auto_refresh: 60,
      app_name: "Inbound Scope",
      version: "1.0.0",
      default_app: "dashboard",
      apps: {
        dashboard: {
          name: "Inicio",
          icon: "home",
          default: true,
        },
        "feedback-tracker": {
          name: "Feedback Tracker",
          icon: "alert-triangle",
          files: {
            errors: "error_tracker.json",
          },
          views: ["errors", "stats", "settings"],
        },
      },
    };
  }

  async load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, "utf-8");
        const loadedConfig = JSON.parse(data);
        this.config = this.mergeConfigs(this.getDefaultConfig(), loadedConfig);
        console.log("Configuración cargada:", this.config);
      } else {
        await this.save(this.getDefaultConfig());
        console.log("Configuración por defecto creada");
      }

      await this.validateDataPaths();
      return this.config;
    } catch (error) {
      console.error("Error al cargar configuración:", error);
      return this.getDefaultConfig();
    }
  }

  async save(newConfig) {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(newConfig, null, 2));
      this.config = newConfig;
      return true;
    } catch (error) {
      console.error("Error al guardar configuración:", error);
      return false;
    }
  }

  mergeConfigs(defaultConfig, loadedConfig) {
    const result = JSON.parse(JSON.stringify(defaultConfig));

    Object.keys(loadedConfig).forEach((key) => {
      if (key === "apps" && result.apps && loadedConfig.apps) {
        Object.keys(loadedConfig.apps).forEach((appKey) => {
          if (result.apps[appKey]) {
            result.apps[appKey] = {
              ...result.apps[appKey],
              ...loadedConfig.apps[appKey],
            };
          } else {
            result.apps[appKey] = loadedConfig.apps[appKey];
          }
        });
      } else if (
        key === "data_paths" &&
        Array.isArray(loadedConfig.data_paths)
      ) {
        result.data_paths =
          loadedConfig.data_paths.length > 0
            ? loadedConfig.data_paths
            : result.data_paths;
      } else {
        result[key] = loadedConfig[key];
      }
    });

    return result;
  }

  async validateDataPaths() {
    if (!this.config.data_paths || !Array.isArray(this.config.data_paths)) {
      console.warn(
        "No hay rutas de datos configuradas, usando valores por defecto"
      );
      return;
    }

    const validPaths = [];

    for (const dataPath of this.config.data_paths) {
      try {
        if (fs.existsSync(dataPath)) {
          validPaths.push(dataPath);
          console.log(`Ruta de datos válida: ${dataPath}`);
        } else {
          console.warn(`Ruta de datos no encontrada: ${dataPath}`);
        }
      } catch (error) {
        console.warn(`Error al verificar ruta de datos: ${dataPath}`, error);
      }
    }

    if (validPaths.length === 0) {
      const localDataPath = path.join(
        app.getPath("documents"),
        "IB_Scope_Data"
      );

      try {
        if (!fs.existsSync(localDataPath)) {
          fs.mkdirSync(localDataPath, { recursive: true });
        }

        validPaths.push(localDataPath);
        console.log(`Creada ruta de datos local: ${localDataPath}`);
      } catch (error) {
        console.error("Error al crear directorio de datos local:", error);
      }
    }

    this.config.data_paths = validPaths;
    await this.save(this.config);
  }

  getConfig() {
    return this.config;
  }
}

module.exports = new ConfigService();
