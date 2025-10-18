/**
 * ExceptionsService.js
 * Servicio para gestionar el archivo exceptions.json
 * Ruta: /src/renderer/apps/feedback-tracker/js/controllers/services/ExceptionsService.js
 */

export class ExceptionsService {
  constructor() {
    this.filePath = null;
    this.isInitialized = false;
    this.initPromise = null;
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
      console.log("🔧 ExceptionsService: Leyendo configuración...");
      const config = await window.api.getConfig();
      console.log("🔧 Config recibido:", config);

      // El config se devuelve directo, no tiene .success ni .data
      if (config && config.data_paths) {
        console.log("✅ data_paths encontrado:", config.data_paths);
        // Usar el primer data_path disponible
        const dataPaths = config.data_paths;
        let dataPath = null;

        // Intentar usar el segundo path (local)
        if (dataPaths.length > 1) {
          dataPath = dataPaths[1];
          console.log("📂 Usando path local (índice 1):", dataPath);
        } else if (dataPaths.length > 0) {
          dataPath = dataPaths[0];
          console.log("📂 Usando path (índice 0):", dataPath);
        }

        if (dataPath) {
          // Asegurar que la ruta termine con \\ (Windows)
          if (!dataPath.endsWith("\\")) {
            dataPath += "\\";
          }

          this.filePath = `${dataPath}exceptions.json`;
          this.isInitialized = true;
          console.log(
            "✅ ExceptionsService inicializado con path correcto:",
            this.filePath
          );
          return true;
        }
      } else {
        console.warn("⚠️ Config no tiene data_paths:", config);
      }

      // Fallback si no se puede leer config
      const appPath = await window.api.getAppPath();
      this.filePath = `${appPath}\\Ejemplos\\exceptions.json`;
      this.isInitialized = true;
      console.warn("⚠️ ExceptionsService usando ruta fallback:", this.filePath);
      return true;
    } catch (error) {
      console.error("❌ Error inicializando ExceptionsService:", error);
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
          exceptions: [],
          global_exceptions: {
            description: "Excepciones globales que aplican a todas las reglas",
            asins: [],
            user_ids: [],
            bins: [],
          },
          last_updated: new Date()
            .toISOString()
            .replace("T", " ")
            .substring(0, 19),
        };
      }
    } catch (error) {
      console.error("❌ Error leyendo exceptions.json:", error);
      return {
        exceptions: [],
        global_exceptions: {
          description: "Excepciones globales que aplican a todas las reglas",
          asins: [],
          user_ids: [],
          bins: [],
        },
        last_updated: new Date()
          .toISOString()
          .replace("T", " ")
          .substring(0, 19),
      };
    }
  }

  /**
   * Genera un rule_id único basado en la violación
   * @param {string} violation - La descripción de la violación
   * @returns {string} - Un ID único para la regla
   */
  generateRuleId(violation) {
    // Crear ID basado en la violación
    // Ej: "Peso < 5 ubicado en Shelf C o B" → "peso_5_shelf_c_b"
    return violation
      .toLowerCase()
      .replace(/[<>]/g, "") // Quitar símbolos
      .replace(/[^\w\s]/g, "") // Quitar caracteres especiales
      .trim()
      .replace(/\s+/g, "_") // Espacios a guiones bajos
      .substring(0, 50); // Limitar longitud
  }

  /**
   * Agrega una excepción para un ASIN específico
   * @param {string} asin - El ASIN a exceptuar
   * @param {string} violation - La violación/regla que se excepciona
   * @param {string} reason - Motivo de la excepción
   */
  async addException(asin, violation, reason) {
    try {
      // Esperar a que el servicio esté inicializado
      if (!this.isInitialized) {
        console.log("⏳ Esperando inicialización de ExceptionsService...");
        await this.init();
      }

      if (!this.filePath) {
        console.error("❌ ExceptionsService: filePath no está configurado");
        return false;
      }

      console.log(
        `📝 Agregando excepción para ASIN: ${asin}, Regla: ${violation}`
      );
      console.log(`📂 Ruta del archivo: ${this.filePath}`);

      // Leer archivo actual
      const data = await this.readFile();

      // Usar el texto EXACTO del error como rule_id (sin transformar)
      const ruleId = violation;

      // Buscar si ya existe una regla para esta violación EXACTA
      let rule = data.exceptions.find((r) => r.rule_id === ruleId);

      if (rule) {
        // La regla existe, agregar ASIN si no está
        if (!rule.asins.includes(asin)) {
          rule.asins.push(asin);
          console.log(
            `✅ ASIN ${asin} agregado a error existente: "${ruleId}"`
          );
        } else {
          console.log(`ℹ️ ASIN ${asin} ya existe para este error: "${ruleId}"`);
        }

        // Actualizar reason si se proporcionó
        if (reason) {
          rule.reason = reason;
        }
      } else {
        // La regla no existe, crearla con el texto exacto
        const newRule = {
          rule_id: violation, // Texto exacto del error
          type: "asin_list",
          asins: [asin],
          reason: reason || "No es considerado un error",
        };

        data.exceptions.push(newRule);
        console.log(
          `✅ Nueva excepción creada: "${violation}" con ASIN ${asin}`
        );
      }

      // Actualizar timestamp
      data.last_updated = new Date()
        .toISOString()
        .replace("T", " ")
        .substring(0, 19);

      // Guardar archivo
      const result = await window.api.writeJson(this.filePath, data);

      if (result.success) {
        console.log("✅ Archivo exceptions.json actualizado correctamente");
        return true;
      } else {
        console.error("❌ Error al guardar exceptions.json:", result.error);
        return false;
      }
    } catch (error) {
      console.error("❌ Error en addException:", error);
      return false;
    }
  }

  /**
   * Verifica si un ASIN tiene una excepción para una violación específica
   * @param {string} asin - El ASIN a verificar
   * @param {string} violation - La violación a verificar
   * @returns {boolean} - True si existe una excepción
   */
  async checkException(asin, violation) {
    const data = await this.readFile();
    const ruleId = this.generateRuleId(violation);

    const rule = data.exceptions.find((r) => r.rule_id === ruleId);

    if (rule && rule.asins.includes(asin)) {
      return true;
    }

    // También verificar excepciones globales
    if (data.global_exceptions.asins.includes(asin)) {
      return true;
    }

    return false;
  }
}
