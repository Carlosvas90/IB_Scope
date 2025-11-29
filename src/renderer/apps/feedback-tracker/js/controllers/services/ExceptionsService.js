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
    this.exceptionsPaths = null; // Inicializar para que esté disponible
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
      // Leer configuración para obtener exceptions_paths o data_paths
      console.log("🔧 ExceptionsService: Leyendo configuración...");
      const config = await window.api.getConfig();
      console.log("🔧 Config recibido (completo):", JSON.stringify(config, null, 2));
      
      // Intentar usar exceptions_paths primero, si no existe usar data_paths
      let pathsToUse = null;
      
      if (config && config.exceptions_paths && Array.isArray(config.exceptions_paths) && config.exceptions_paths.length > 0) {
        console.log("✅ exceptions_paths encontrado:", config.exceptions_paths);
        pathsToUse = config.exceptions_paths;
      } else if (config && config.data_paths && Array.isArray(config.data_paths) && config.data_paths.length > 0) {
        console.log("✅ exceptions_paths no encontrado, usando data_paths:", config.data_paths);
        // Usar data_paths directamente (sin crear subcarpeta exceptions)
        pathsToUse = config.data_paths;
        console.log("✅ Rutas de excepciones usando data_paths directamente:", pathsToUse);
      }

      if (pathsToUse && pathsToUse.length > 0) {
        this.exceptionsPaths = pathsToUse;
        
        // Usar la primera ruta (red) por defecto
        // Si falla al escribir, se intentará en las rutas alternativas en el método addException
        const firstPath = this.exceptionsPaths[0];
        const normalizedPath = firstPath.endsWith("\\") ? firstPath : firstPath + "\\";
        this.filePath = `${normalizedPath}exceptions.json`;
        this.isInitialized = true;
        console.log("✅ ExceptionsService inicializado con primera ruta (red):", this.filePath);
        return true;
      } else {
        console.warn("⚠️ Config no tiene exceptions_paths ni data_paths:", config);
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
      console.log(`📂 ExceptionsPaths disponibles:`, this.exceptionsPaths);

      // Leer archivo actual
      console.log("📖 Leyendo archivo actual...");
      const data = await this.readFile();
      console.log("📖 Datos leídos:", data);

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

      // Guardar archivo - intentar en todas las rutas disponibles si falla
      let result = await window.api.writeJson(this.filePath, data);

      if (result.success) {
        console.log("✅ Archivo exceptions.json actualizado correctamente");
        return true;
      } else {
        console.warn(
          "⚠️ Error al guardar en ruta principal, intentando rutas alternativas:",
          result.error
        );
        
        // Si falla, intentar en las otras rutas disponibles
        if (this.exceptionsPaths && this.exceptionsPaths.length > 1) {
          for (let i = 1; i < this.exceptionsPaths.length; i++) {
            const altPath = this.exceptionsPaths[i];
            const normalizedPath = altPath.endsWith("\\") ? altPath : altPath + "\\";
            const altFilePath = `${normalizedPath}exceptions.json`;
            
            console.log(`🔄 Intentando guardar en ruta alternativa ${i}:`, altFilePath);
            result = await window.api.writeJson(altFilePath, data);
            
            if (result.success) {
              // Actualizar filePath para futuras operaciones
              this.filePath = altFilePath;
              console.log(
                "✅ Archivo exceptions.json actualizado correctamente en ruta alternativa"
              );
              return true;
            } else {
              console.warn(`⚠️ Error en ruta alternativa ${i}:`, result.error);
            }
          }
        }
        
        console.error("❌ Error al guardar exceptions.json en todas las rutas:", result.error);
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
