const fs = require("fs");
const path = require("path");
const { app } = require("electron");

class ConfigService {
  constructor() {
    this.configPath = path.join(process.cwd(), "config", "config.json");
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
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, "utf-8");
        this.config = JSON.parse(data);
        console.log("Configuración cargada:", this.config);
      } else {
        throw new Error(
          "No se encontró el archivo de configuración en la raíz del proyecto."
        );
      }
      return this.config;
    } catch (error) {
      console.error("Error al cargar configuración:", error);
      return {};
    }
  }

  getConfig() {
    console.log("[ConfigService] getConfig:", this.config);
    return this.config;
  }
}

module.exports = new ConfigService();
