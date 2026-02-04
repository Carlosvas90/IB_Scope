const fs = require("fs");
const path = require("path");
const { app } = require("electron");

class ConfigService {
  constructor() {
    // Para aplicaciones empaquetadas, usar resources junto al ejecutable
    let basePath;
    if (app.isPackaged) {
      basePath = path.join(path.dirname(app.getPath("exe")), "resources");
    } else {
      basePath = process.cwd();
    }
    this.configPath = path.join(basePath, "config", "config.json");
    this.config = this.getDefaultConfig();
  }

  getDefaultConfig() {
    return {};
  }

  async load() {
    try {
      console.log(
        "[ConfigService] Intentando leer config en:",
        this.configPath
      );
      console.log("[ConfigService] App empaquetada:", app.isPackaged);
      console.log(
        "[ConfigService] Ruta base:",
        app.isPackaged ? path.dirname(app.getPath("exe")) : process.cwd()
      );

      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, "utf-8");
        this.config = JSON.parse(data);
        console.log("Configuración cargada:", this.config);
      } else {
        console.warn(
          "Archivo de configuración no encontrado, usando valores por defecto"
        );
        this.config = this.getDefaultConfig();
      }
      return this.config;
    } catch (error) {
      console.error("Error al cargar configuración:", error);
      console.warn("Usando configuración por defecto");
      this.config = this.getDefaultConfig();
      return this.config;
    }
  }

  getConfig() {
    console.log("[ConfigService] getConfig:", this.config);
    return this.config;
  }

  async save(newConfig) {
    try {
      if (!newConfig || typeof newConfig !== "object") {
        return { success: false, error: "Configuración inválida" };
      }
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(newConfig, null, 2), "utf-8");
      this.config = newConfig;
      return { success: true };
    } catch (error) {
      console.error("[ConfigService] Error al guardar:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ConfigService();
