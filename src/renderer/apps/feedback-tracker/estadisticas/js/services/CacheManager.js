/**
 * CacheManager.js
 * Gestor de caché para datos históricos usando IndexedDB
 * Fase 1: Infraestructura base con CRUD y logging
 */

export class CacheManager {
  constructor() {
    this.db = null;
    this.dbName = "inbound_scope_cache";
    this.dbVersion = 1;
    this.maxSizeBytes = 80 * 1024 * 1024; // 80MB
    this.retentionMonths = 12;
    this.isInitialized = false;

    // Sistema de logging
    this.logPrefix = "🗄️ [CacheManager]";
    this.enableDebugLogs = true;
  }

  /**
   * Inicializa el CacheManager
   * @returns {Promise<boolean>} true si se inicializó correctamente
   */
  async init() {
    try {
      this.log("Inicializando CacheManager...");

      // Verificar soporte de IndexedDB
      if (!this.checkIndexedDBSupport()) {
        this.error("IndexedDB no está soportado en este navegador");
        return false;
      }

      // Abrir/crear base de datos
      this.db = await this.openDatabase();

      // Verificar estado del caché
      await this.checkCacheHealth();

      // Cargar configuración
      await this.loadConfig();

      this.isInitialized = true;
      this.success("CacheManager inicializado correctamente");
      return true;
    } catch (error) {
      this.error("Error inicializando CacheManager:", error);
      return false;
    }
  }

  /**
   * Verifica si IndexedDB está soportado
   * @returns {boolean}
   */
  checkIndexedDBSupport() {
    if (!window.indexedDB) {
      this.error("IndexedDB no está disponible");
      return false;
    }
    this.log("✅ IndexedDB soportado");
    return true;
  }

  /**
   * Abre o crea la base de datos IndexedDB
   * @returns {Promise<IDBDatabase>}
   */
  async openDatabase() {
    return new Promise((resolve, reject) => {
      this.log(`Abriendo base de datos: ${this.dbName} v${this.dbVersion}`);

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        this.error("Error abriendo base de datos:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.success("Base de datos abierta correctamente");
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        this.log("🔧 Actualizando estructura de base de datos...");
        const db = event.target.result;

        // Store 1: Datos históricos
        if (!db.objectStoreNames.contains("historical_data")) {
          const historicalStore = db.createObjectStore("historical_data", {
            keyPath: "key",
          });
          this.log("   ✅ Store 'historical_data' creado");
        }

        // Store 2: Queries precalculadas
        if (!db.objectStoreNames.contains("aggregated_queries")) {
          const queriesStore = db.createObjectStore("aggregated_queries", {
            keyPath: "key",
          });
          this.log("   ✅ Store 'aggregated_queries' creado");
        }

        // Store 3: Metadata de sincronización
        if (!db.objectStoreNames.contains("sync_metadata")) {
          const metadataStore = db.createObjectStore("sync_metadata", {
            keyPath: "key",
          });
          this.log("   ✅ Store 'sync_metadata' creado");
        }

        // Store 4: Configuración
        if (!db.objectStoreNames.contains("app_config")) {
          const configStore = db.createObjectStore("app_config", {
            keyPath: "key",
          });
          this.log("   ✅ Store 'app_config' creado");
        }

        this.success("Estructura de base de datos actualizada");
      };
    });
  }

  /**
   * Obtiene datos de un mes específico del caché
   * @param {string} app - Nombre de la aplicación (ej: 'feedback')
   * @param {string} month - Mes en formato YYYYMM (ej: '202510')
   * @returns {Promise<Object|null>} Datos del mes o null si no existe
   */
  async getMonthData(app, month) {
    const key = `${app}_${month}`;
    const result = await this.getFromStore("historical_data", key);
    return result;
  }

  /**
   * Guarda datos de un mes en el caché
   * @param {string} app - Nombre de la aplicación (ej: 'feedback')
   * @param {string} month - Mes en formato YYYYMM (ej: '202510')
   * @param {Array} data - Array de registros del mes
   * @param {string} hash - Hash SHA-256 de los datos para detección de cambios
   * @returns {Promise<void>}
   */
  async saveMonthData(app, month, data, hash) {
    const key = `${app}_${month}`;
    const cacheData = {
      key,
      app,
      month,
      data,
      hash,
      recordCount: data.length,
      timestamp: Date.now(),
    };

    await this.saveToStore("historical_data", cacheData);

    // También guardar metadata
    await this.saveToStore("sync_metadata", {
      key,
      app,
      month,
      hash,
      recordCount: data.length,
      lastSync: Date.now(),
    });

    const dataSize = this.formatBytes(JSON.stringify(data).length);
    this.log(`Guardado mes ${month}: ${data.length} registros (${dataSize})`);
  }

  /**
   * Obtiene un registro de un store por su key
   * @param {string} storeName - Nombre del store
   * @param {string} key - Key del registro
   * @returns {Promise<any>} El registro o null si no existe
   */
  async getFromStore(storeName, key) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onerror = () => {
          this.error(`Error obteniendo ${key} de ${storeName}:`, request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          if (request.result) {
            this.debug(`✅ Obtenido: ${key} de ${storeName}`);
          } else {
            this.debug(`⚠️ No encontrado: ${key} en ${storeName}`);
          }
          resolve(request.result || null);
        };
      } catch (error) {
        this.error(`Error en getFromStore(${storeName}, ${key}):`, error);
        reject(error);
      }
    });
  }

  /**
   * Guarda un registro en un store
   * @param {string} storeName - Nombre del store
   * @param {Object} data - Datos a guardar (debe incluir 'key')
   * @returns {Promise<void>}
   */
  async saveToStore(storeName, data) {
    return new Promise((resolve, reject) => {
      try {
        if (!data.key) {
          throw new Error("Los datos deben incluir una propiedad 'key'");
        }

        const transaction = this.db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onerror = () => {
          this.error(
            `Error guardando ${data.key} en ${storeName}:`,
            request.error
          );
          reject(request.error);
        };

        request.onsuccess = () => {
          this.debug(`✅ Guardado: ${data.key} en ${storeName}`);
          resolve();
        };
      } catch (error) {
        this.error(`Error en saveToStore(${storeName}):`, error);
        reject(error);
      }
    });
  }

  /**
   * Elimina un registro de un store
   * @param {string} storeName - Nombre del store
   * @param {string} key - Key del registro a eliminar
   * @returns {Promise<void>}
   */
  async deleteFromStore(storeName, key) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onerror = () => {
          this.error(`Error eliminando ${key} de ${storeName}:`, request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          this.debug(`✅ Eliminado: ${key} de ${storeName}`);
          resolve();
        };
      } catch (error) {
        this.error(`Error en deleteFromStore(${storeName}, ${key}):`, error);
        reject(error);
      }
    });
  }

  /**
   * Obtiene todos los registros de un store
   * @param {string} storeName - Nombre del store
   * @returns {Promise<Array>} Array de registros
   */
  async getAllFromStore(storeName) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onerror = () => {
          this.error(`Error obteniendo todos de ${storeName}:`, request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          this.debug(
            `✅ Obtenidos ${request.result.length} registros de ${storeName}`
          );
          resolve(request.result);
        };
      } catch (error) {
        this.error(`Error en getAllFromStore(${storeName}):`, error);
        reject(error);
      }
    });
  }

  /**
   * Cuenta los registros en un store
   * @param {string} storeName - Nombre del store
   * @returns {Promise<number>} Número de registros
   */
  async countInStore(storeName) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onerror = () => {
          this.error(`Error contando en ${storeName}:`, request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          this.debug(`📊 ${storeName}: ${request.result} registros`);
          resolve(request.result);
        };
      } catch (error) {
        this.error(`Error en countInStore(${storeName}):`, error);
        reject(error);
      }
    });
  }

  /**
   * Limpia todos los registros de un store
   * @param {string} storeName - Nombre del store
   * @returns {Promise<void>}
   */
  async clearStore(storeName) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onerror = () => {
          this.error(`Error limpiando ${storeName}:`, request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          this.log(`🧹 Store '${storeName}' limpiado`);
          resolve();
        };
      } catch (error) {
        this.error(`Error en clearStore(${storeName}):`, error);
        reject(error);
      }
    });
  }

  /**
   * Obtiene el tamaño total del caché en bytes
   * @returns {Promise<number>} Tamaño en bytes
   */
  async getTotalCacheSize() {
    try {
      const allData = await this.getAllFromStore("historical_data");
      const totalSize = allData.reduce((total, item) => {
        return total + (item.size || 0);
      }, 0);

      this.debug(`📦 Tamaño total del caché: ${this.formatBytes(totalSize)}`);
      return totalSize;
    } catch (error) {
      this.error("Error calculando tamaño del caché:", error);
      return 0;
    }
  }

  /**
   * Verifica el estado de salud del caché
   * @returns {Promise<Object>} Objeto con estadísticas del caché
   */
  async checkCacheHealth() {
    try {
      this.log("🔍 Verificando estado del caché...");

      const stats = {
        totalSize: await this.getTotalCacheSize(),
        maxSize: this.maxSizeBytes,
        usage: 0,
        historicalRecords: await this.countInStore("historical_data"),
        queries: await this.countInStore("aggregated_queries"),
        metadata: await this.countInStore("sync_metadata"),
      };

      stats.usage = (stats.totalSize / stats.maxSize) * 100;

      // Mostrar reporte
      console.log(`
═══════════════════════════════════════
📊 CACHE HEALTH REPORT
═══════════════════════════════════════
💾 Uso de caché: ${stats.usage.toFixed(1)}% (${this.formatBytes(
        stats.totalSize
      )} / ${this.formatBytes(stats.maxSize)})
📦 Registros históricos: ${stats.historicalRecords}
📈 Queries en caché: ${stats.queries}
🔧 Registros de metadata: ${stats.metadata}
═══════════════════════════════════════
      `);

      // Advertir si está cerca del límite
      if (stats.usage > 90) {
        this.warn(
          `⚠️ Caché al ${stats.usage.toFixed(
            1
          )}% de capacidad. Considerar limpieza.`
        );
      }

      return stats;
    } catch (error) {
      this.error("Error verificando salud del caché:", error);
      return null;
    }
  }

  /**
   * Carga la configuración del caché
   * @returns {Promise<Object>} Configuración cargada
   */
  async loadConfig() {
    try {
      const config = await this.getFromStore("app_config", "cache_config");

      if (config) {
        this.log("✅ Configuración cargada desde caché");
        this.maxSizeBytes = config.value.maxSizeBytes || this.maxSizeBytes;
        this.retentionMonths =
          config.value.retentionMonths || this.retentionMonths;
        return config.value;
      }

      // Si no existe, crear configuración por defecto
      const defaultConfig = {
        key: "cache_config",
        value: {
          maxSizeBytes: this.maxSizeBytes,
          currentSizeBytes: 0,
          autoSyncInterval: 300000, // 5 minutos
          compressionEnabled: false, // Por ahora desactivado
          retentionMonths: this.retentionMonths,
          mostUsedRanges: ["today", "week", "3months"],
          lastCleanup: new Date().toISOString(),
        },
      };

      await this.saveToStore("app_config", defaultConfig);
      this.log("✅ Configuración por defecto creada");
      return defaultConfig.value;
    } catch (error) {
      this.error("Error cargando configuración:", error);
      return null;
    }
  }

  /**
   * Guarda la configuración del caché
   * @param {Object} config - Configuración a guardar
   * @returns {Promise<void>}
   */
  async saveConfig(config) {
    try {
      const configData = {
        key: "cache_config",
        value: config,
      };

      await this.saveToStore("app_config", configData);
      this.log("✅ Configuración guardada");
    } catch (error) {
      this.error("Error guardando configuración:", error);
    }
  }

  /**
   * Obtiene estadísticas de metadata de todas las apps
   * @returns {Promise<Array>} Array de metadata
   */
  async getAllMetadata() {
    try {
      return await this.getAllFromStore("sync_metadata");
    } catch (error) {
      this.error("Error obteniendo metadata:", error);
      return [];
    }
  }

  /**
   * Cierra la conexión a la base de datos
   */
  close() {
    if (this.db) {
      this.db.close();
      this.log("🔒 Conexión a base de datos cerrada");
      this.db = null;
      this.isInitialized = false;
    }
  }

  /**
   * Elimina completamente la base de datos (para testing/debug)
   * @returns {Promise<void>}
   */
  async deleteDatabase() {
    return new Promise((resolve, reject) => {
      this.warn("🗑️ ELIMINANDO BASE DE DATOS COMPLETA...");

      // Cerrar conexión si está abierta
      if (this.db) {
        this.db.close();
        this.db = null;
      }

      const request = indexedDB.deleteDatabase(this.dbName);

      request.onerror = () => {
        this.error("Error eliminando base de datos:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.success("✅ Base de datos eliminada completamente");
        this.isInitialized = false;
        resolve();
      };

      request.onblocked = () => {
        this.warn(
          "⚠️ Eliminación bloqueada. Cierra todas las conexiones a la DB."
        );
      };
    });
  }

  // ==================== UTILIDADES ====================

  /**
   * Formatea bytes a formato legible
   * @param {number} bytes - Cantidad de bytes
   * @returns {string} Formato legible (KB, MB, GB)
   */
  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // ==================== SISTEMA DE LOGGING ====================

  /**
   * Log informativo
   */
  log(...args) {
    if (this.enableDebugLogs) {
      console.log(this.logPrefix, ...args);
    }
  }

  /**
   * Log de debug (solo si está habilitado)
   */
  debug(...args) {
    if (this.enableDebugLogs) {
      console.debug(this.logPrefix, "🔍", ...args);
    }
  }

  /**
   * Log de éxito
   */
  success(...args) {
    console.log(this.logPrefix, "✅", ...args);
  }

  /**
   * Log de advertencia
   */
  warn(...args) {
    console.warn(this.logPrefix, "⚠️", ...args);
  }

  /**
   * Log de error
   */
  error(...args) {
    console.error(this.logPrefix, "❌", ...args);
  }

  /**
   * Habilita/deshabilita logs de debug
   * @param {boolean} enabled
   */
  setDebugLogging(enabled) {
    this.enableDebugLogs = enabled;
    this.log(`Debug logging ${enabled ? "habilitado" : "deshabilitado"}`);
  }
}

// Exportar instancia singleton (opcional)
export const cacheManager = new CacheManager();
