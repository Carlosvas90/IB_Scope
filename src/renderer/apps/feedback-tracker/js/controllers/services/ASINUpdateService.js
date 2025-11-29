/**
 * ASINUpdateService.js
 * Servicio para gestionar el archivo asins_to_update.json
 * Ruta: /src/renderer/apps/feedback-tracker/js/controllers/services/ASINUpdateService.js
 */

export class ASINUpdateService {
  constructor() {
    this.filePath = null;
    this.isInitialized = false;
    this.initPromise = null;
    this.dataPaths = null; // Inicializar para que esté disponible
  }

  /**
   * Inicializa el servicio
   */
  async init() {
    // Si ya hay una inicialización en curso, esperar
    if (this.initPromise) {
      return this.initPromise;
    }

    // Crear promesa de inicialización
    this.initPromise = this._initialize();
    return this.initPromise;
  }

  async _initialize() {
    try {
      // Leer configuración para obtener data_paths
      console.log("🔧 ASINUpdateService: Leyendo configuración...");
      console.log("🔧 window.api existe:", !!window.api);
      console.log("🔧 window.api.getConfig existe:", !!window.api?.getConfig);

      const config = await window.api.getConfig();
      console.log(
        "🔧 Config recibido (completo):",
        JSON.stringify(config, null, 2)
      );

      // Usar data_paths del config (primero red, luego local)
      console.log("🔧 Config tiene data_paths?:", !!config?.data_paths);
      console.log("🔧 data_paths es array?:", Array.isArray(config?.data_paths));
      console.log("🔧 data_paths length:", config?.data_paths?.length);
      
      if (config && config.data_paths && Array.isArray(config.data_paths) && config.data_paths.length > 0) {
        console.log("✅ data_paths encontrado:", config.data_paths);
        this.dataPaths = config.data_paths;
        
        // Usar la primera ruta (red) por defecto
        // Si falla al escribir, se intentará en las rutas alternativas en el método addASIN
        const firstPath = this.dataPaths[0];
        const normalizedPath = firstPath.endsWith("\\") ? firstPath : firstPath + "\\";
        this.filePath = `${normalizedPath}asins_to_update.json`;
        this.isInitialized = true;
        console.log("✅ ASINUpdateService inicializado con primera ruta (red):", this.filePath);
        return true;
      } else {
        console.warn("⚠️ Config no tiene data_paths:", config);
      }

      // Fallback si no se puede leer config
      const appPath = await window.api.getAppPath();
      this.filePath = `${appPath}\\Ejemplos\\asins_to_update.json`;
      this.isInitialized = true;
      console.warn("⚠️ ASINUpdateService usando ruta fallback:", this.filePath);
      return true;
    } catch (error) {
      console.error("❌ Error inicializando ASINUpdateService:", error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Lee el archivo actual
   */
  async readFile() {
    try {
      const result = await window.api.readJson(this.filePath);

      if (result.success && result.data) {
        return result.data;
      } else {
        // Si no existe, retornar estructura vacía
        return {
          asins: [],
          last_updated: new Date()
            .toISOString()
            .replace("T", " ")
            .substring(0, 19),
        };
      }
    } catch (error) {
      console.error("❌ Error leyendo asins_to_update.json:", error);
      return {
        asins: [],
        last_updated: new Date()
          .toISOString()
          .replace("T", " ")
          .substring(0, 19),
      };
    }
  }

  /**
   * Agrega un ASIN para actualización
   * @param {string} asin - El ASIN a actualizar
   * @param {string} note - Nota opcional sobre la actualización
   */
  async addASIN(asin, note = null) {
    try {
      // Esperar a que el servicio esté inicializado
      if (!this.isInitialized) {
        console.log("⏳ Esperando inicialización de ASINUpdateService...");
        await this.init();
      }

      if (!this.filePath) {
        console.error("❌ ASINUpdateService: filePath no está configurado");
        return false;
      }

      console.log(`📝 Agregando ASIN para actualización: ${asin}`);
      console.log(`📂 Ruta del archivo: ${this.filePath}`);
      console.log(`📂 DataPaths disponibles:`, this.dataPaths);

      // Leer archivo actual
      console.log("📖 Leyendo archivo actual...");
      const data = await this.readFile();
      console.log("📖 Datos leídos:", data);

      // Verificar si el ASIN ya existe
      const existingIndex = data.asins.findIndex((item) => item.asin === asin);

      if (existingIndex >= 0) {
        // Ya existe, actualizar estado y nota
        data.asins[existingIndex].status = "Pending";
        if (note) {
          data.asins[existingIndex].note = note;
        }
        console.log(`♻️ ASIN ${asin} ya existía, actualizado a Pending`);
      } else {
        // No existe, agregar nuevo
        const newEntry = {
          asin: asin,
          status: "Pending",
        };

        if (note) {
          newEntry.note = note;
        }

        data.asins.push(newEntry);
        console.log(`✅ ASIN ${asin} agregado como Pending`);
      }

      // Actualizar timestamp
      data.last_updated = new Date()
        .toISOString()
        .replace("T", " ")
        .substring(0, 19);

      // Guardar archivo - intentar en todas las rutas disponibles si falla
      let result = await window.api.writeJson(this.filePath, data);

      if (result.success) {
        console.log(
          "✅ Archivo asins_to_update.json actualizado correctamente"
        );
        return true;
      } else {
        console.warn(
          "⚠️ Error al guardar en ruta principal, intentando rutas alternativas:",
          result.error
        );
        
        // Si falla, intentar en las otras rutas disponibles
        if (this.dataPaths && this.dataPaths.length > 1) {
          for (let i = 1; i < this.dataPaths.length; i++) {
            const altPath = this.dataPaths[i];
            const normalizedPath = altPath.endsWith("\\") ? altPath : altPath + "\\";
            const altFilePath = `${normalizedPath}asins_to_update.json`;
            
            console.log(`🔄 Intentando guardar en ruta alternativa ${i}:`, altFilePath);
            result = await window.api.writeJson(altFilePath, data);
            
            if (result.success) {
              // Actualizar filePath para futuras operaciones
              this.filePath = altFilePath;
              console.log(
                "✅ Archivo asins_to_update.json actualizado correctamente en ruta alternativa"
              );
              return true;
            } else {
              console.warn(`⚠️ Error en ruta alternativa ${i}:`, result.error);
            }
          }
        }
        
        console.error(
          "❌ Error al guardar asins_to_update.json en todas las rutas:",
          result.error
        );
        return false;
      }
    } catch (error) {
      console.error("❌ Error en addASIN:", error);
      return false;
    }
  }

  /**
   * Verifica si un ASIN ya está en la lista
   * @param {string} asin - El ASIN a verificar
   * @returns {Object|null} - El objeto del ASIN si existe, null si no
   */
  async checkASIN(asin) {
    const data = await this.readFile();
    return data.asins.find((item) => item.asin === asin) || null;
  }
}
