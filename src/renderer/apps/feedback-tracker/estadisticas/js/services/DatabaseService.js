/**
 * DatabaseService.js
 * Servicio para manejar la conexión y consultas a la base de datos SQLite Inventory_Health.db
 * Contiene las tablas error_tracking y dpmo_metrics para datos históricos
 */

export class DatabaseService {
  constructor() {
    this.dbPath = null;
    this.isConnected = false;
    this.dbPaths = [];
    this.currentDbPath = null;

    console.log("🗄️ DatabaseService inicializado");
  }

  /**
   * Inicializa el servicio obteniendo configuración
   */
  async init() {
    try {
      console.log("🔧 Inicializando DatabaseService...");

      // Obtener configuración
      await this.loadConfig();

      // Intentar conectar a la base de datos
      await this.connect();

      console.log("✅ DatabaseService inicializado correctamente");
      return true;
    } catch (error) {
      console.error("❌ Error inicializando DatabaseService:", error);
      return false;
    }
  }

  /**
   * Carga la configuración desde el archivo config.json
   */
  async loadConfig() {
    try {
      const config = await window.api.getConfig();
      if (config && config.db_paths) {
        this.dbPaths = config.db_paths;
        console.log("✅ Configuración de DB cargada:", this.dbPaths);
      } else {
        console.warn("⚠️ No se encontraron rutas de DB en la configuración");
        this.dbPaths = [];
      }
    } catch (error) {
      console.warn("⚠️ Error cargando configuración de DB:", error);
      this.dbPaths = [];
    }
  }

  /**
   * Conecta a la base de datos SQLite
   */
  async connect() {
    if (this.isConnected) {
      console.log("✅ Ya conectado a la base de datos");
      return true;
    }

    // Intentar conectar usando cada ruta configurada
    for (const dbPath of this.dbPaths) {
      try {
        console.log(`🔍 Intentando conectar a DB en: ${dbPath}`);

        // Verificar si el archivo de base de datos existe
        const dbFilePath = `${dbPath}Inventory_Health.db`;
        const exists = await window.api.fileExists(dbFilePath);

        if (exists) {
          console.log(`✅ Base de datos encontrada en: ${dbPath}`);
          this.dbPath = dbFilePath;
          this.currentDbPath = dbPath;
          this.isConnected = true;
          return true;
        } else {
          console.log(`⚠️ Base de datos no encontrada en: ${dbPath}`);
        }
      } catch (error) {
        console.warn(`⚠️ Error conectando a ${dbPath}:`, error.message);
        continue;
      }
    }

    console.error("❌ No se pudo conectar a ninguna base de datos");
    this.isConnected = false;
    return false;
  }

  /**
   * Ejecuta una consulta SQL en la base de datos
   */
  async query(sql, params = []) {
    if (!this.isConnected) {
      throw new Error("No hay conexión a la base de datos");
    }

    try {
      console.log("🔍 Ejecutando consulta SQL:", sql);
      console.log("📊 Parámetros:", params);

      const result = await window.api.queryDatabase(this.dbPath, sql, params);

      console.log(
        `✅ Consulta ejecutada exitosamente. Filas: ${result.length}`
      );
      return result;
    } catch (error) {
      console.error("❌ Error ejecutando consulta SQL:", error);
      throw error;
    }
  }

  /**
   * Obtiene datos históricos de error_tracking para un rango de fechas
   */
  async getHistoricalErrorTracking(startDate, endDate) {
    try {
      console.log("🔧 VERSIÓN ACTUALIZADA - Usando error_id y error_date");
      console.log(
        `📊 Obteniendo datos históricos de error_tracking desde ${startDate} hasta ${endDate}`
      );

      // Convertir fechas de DDMMYYYY a YYYY-MM-DD para error_tracking
      const formatDateForErrorTracking = (dateStr) => {
        if (dateStr.length === 8) {
          const day = dateStr.substring(0, 2);
          const month = dateStr.substring(2, 4);
          const year = dateStr.substring(4, 8);
          return `${year}-${month}-${day}`;
        }
        return dateStr;
      };

      const startDateFormatted = formatDateForErrorTracking(startDate);
      const endDateFormatted = formatDateForErrorTracking(endDate);

      console.log(
        `📅 Fechas formateadas: ${startDateFormatted} a ${endDateFormatted}`
      );

      const sql = `
        SELECT 
          error_id,
          error_date,
          user_id,
          asin,
          violation,
          feedback_status,
          quantity,
          created_at
        FROM error_tracking 
        WHERE error_date >= ? AND error_date <= ?
        ORDER BY error_date DESC, created_at DESC
      `;

      const params = [startDateFormatted, endDateFormatted];
      const result = await this.query(sql, params);

      console.log(
        `✅ Obtenidos ${result.length} registros históricos de error_tracking`
      );

      // Log de los primeros 5 registros para verificación
      if (result.length > 0) {
        console.log("📋 Primeros 5 registros de error_tracking del DB:");
        console.table(result.slice(0, 5));

        // Mostrar distribución por fecha
        const dateDistribution = {};
        result.forEach((record) => {
          dateDistribution[record.error_date] =
            (dateDistribution[record.error_date] || 0) + 1;
        });
        console.log("📅 Distribución por fecha en error_tracking:");
        console.table(dateDistribution);
      } else {
        console.log(
          "⚠️ No se encontraron registros de error_tracking en el rango especificado"
        );
      }

      return result;
    } catch (error) {
      console.error(
        "❌ Error obteniendo datos históricos de error_tracking:",
        error
      );
      throw error;
    }
  }

  /**
   * Obtiene datos históricos de dpmo_metrics para un rango de fechas
   */
  async getHistoricalDpmoMetrics(startDate, endDate) {
    try {
      console.log(
        "🔧 VERSIÓN ACTUALIZADA - Usando id y fecha para dpmo_metrics"
      );
      console.log(
        `📊 Obteniendo datos históricos de dpmo_metrics desde ${startDate} hasta ${endDate}`
      );

      // dpmo_metrics usa formato DDMMYYYY directamente
      const sql = `
        SELECT 
          id,
          fecha,
          dpmo,
          total_movimientos,
          total_errores,
          sigma,
          calidad,
          ultima_actualizacion,
          created_at
        FROM dpmo_metrics 
        WHERE fecha >= ? AND fecha <= ?
        ORDER BY fecha DESC, created_at DESC
      `;

      const params = [startDate, endDate];
      const result = await this.query(sql, params);

      console.log(
        `✅ Obtenidos ${result.length} registros históricos de dpmo_metrics`
      );

      // Log de los primeros 5 registros para verificación
      if (result.length > 0) {
        console.log("📋 Primeros 5 registros de dpmo_metrics del DB:");
        console.table(result.slice(0, 5));

        // Mostrar distribución por fecha
        const dateDistribution = {};
        result.forEach((record) => {
          dateDistribution[record.fecha] =
            (dateDistribution[record.fecha] || 0) + 1;
        });
        console.log("📅 Distribución por fecha en dpmo_metrics:");
        console.table(dateDistribution);
      } else {
        console.log(
          "⚠️ No se encontraron registros de dpmo_metrics en el rango especificado"
        );
      }

      return result;
    } catch (error) {
      console.error(
        "❌ Error obteniendo datos históricos de dpmo_metrics:",
        error
      );
      throw error;
    }
  }

  /**
   * Obtiene datos históricos combinados para un rango de fechas
   */
  async getHistoricalData(startDate, endDate) {
    try {
      console.log(
        `📊 Obteniendo datos históricos combinados desde ${startDate} hasta ${endDate}`
      );

      const [errorTracking, dpmoMetrics] = await Promise.all([
        this.getHistoricalErrorTracking(startDate, endDate),
        this.getHistoricalDpmoMetrics(startDate, endDate),
      ]);

      return {
        errorTracking,
        dpmoMetrics,
        totalRecords: errorTracking.length + dpmoMetrics.length,
      };
    } catch (error) {
      console.error("❌ Error obteniendo datos históricos combinados:", error);
      throw error;
    }
  }

  /**
   * Obtiene las fechas disponibles en la base de datos
   */
  async getAvailableDates() {
    try {
      console.log("📅 Obteniendo fechas disponibles en la base de datos...");

      const sql = `
        SELECT DISTINCT fecha 
        FROM (
          SELECT error_date as fecha FROM error_tracking
          UNION
          SELECT fecha FROM dpmo_metrics
        ) 
        ORDER BY fecha DESC
      `;

      const result = await this.query(sql);
      const dates = result.map((row) => row.fecha);

      console.log(`✅ Fechas disponibles: ${dates.length} fechas`);
      return dates;
    } catch (error) {
      console.error("❌ Error obteniendo fechas disponibles:", error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de la base de datos
   */
  async getDatabaseStats() {
    try {
      console.log("📊 Obteniendo estadísticas de la base de datos...");

      const [errorTrackingCount, dpmoMetricsCount, datesCount] =
        await Promise.all([
          this.query("SELECT COUNT(*) as count FROM error_tracking"),
          this.query("SELECT COUNT(*) as count FROM dpmo_metrics"),
          this.query(
            "SELECT COUNT(DISTINCT fecha) as count FROM (SELECT error_date as fecha FROM error_tracking UNION SELECT fecha FROM dpmo_metrics)"
          ),
        ]);

      const stats = {
        errorTrackingRecords: errorTrackingCount[0].count,
        dpmoMetricsRecords: dpmoMetricsCount[0].count,
        totalDates: datesCount[0].count,
        lastUpdate: new Date().toISOString(),
      };

      console.log("✅ Estadísticas de DB obtenidas:", stats);
      return stats;
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas de DB:", error);
      throw error;
    }
  }

  /**
   * Verifica si la base de datos está disponible
   */
  async isDatabaseAvailable() {
    try {
      await this.query("SELECT 1");
      return true;
    } catch (error) {
      console.warn("⚠️ Base de datos no disponible:", error.message);
      return false;
    }
  }

  /**
   * Cierra la conexión a la base de datos
   */
  async disconnect() {
    if (this.isConnected) {
      console.log("🔌 Desconectando de la base de datos...");
      this.isConnected = false;
      this.dbPath = null;
      this.currentDbPath = null;
      console.log("✅ Desconectado de la base de datos");
    }
  }

  /**
   * Reconecta a la base de datos
   */
  async reconnect() {
    console.log("🔄 Reconectando a la base de datos...");
    await this.disconnect();
    return await this.connect();
  }

  /**
   * Inspecciona el esquema de una tabla
   */
  async inspectTableSchema(tableName) {
    try {
      console.log(`🔍 Inspeccionando esquema de la tabla: ${tableName}`);

      const schema = await window.api.getTableSchema(this.dbPath, tableName);
      console.log(`📋 Esquema de ${tableName}:`, schema);

      return schema;
    } catch (error) {
      console.error(`❌ Error inspeccionando esquema de ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene una muestra de datos de una tabla
   */
  async getSampleData(tableName, limit = 5) {
    try {
      console.log(
        `📋 Obteniendo muestra de datos de ${tableName} (${limit} registros)`
      );

      const sampleData = await this.query(
        `SELECT * FROM ${tableName} LIMIT ${limit}`
      );
      console.log(`📋 Muestra de ${tableName}:`, sampleData);

      return sampleData;
    } catch (error) {
      console.error(`❌ Error obteniendo muestra de ${tableName}:`, error);
      throw error;
    }
  }
}
