/**
 * HistoricalDataService.js
 * Servicio para manejar datos históricos combinando datos de la base de datos con datos actuales
 */

import { DatabaseService } from "./DatabaseService.js";

export class HistoricalDataService {
  constructor() {
    this.databaseService = new DatabaseService();
    this.historicalData = {
      errorTracking: [],
      dpmoMetrics: [],
    };
    this.isInitialized = false;

    console.log("📚 HistoricalDataService inicializado");
  }

  /**
   * Inicializa el servicio
   */
  async init() {
    try {
      console.log("🔧 Inicializando HistoricalDataService...");

      // Inicializar el servicio de base de datos
      const dbInitialized = await this.databaseService.init();

      if (dbInitialized) {
        console.log("✅ Servicio de base de datos inicializado");
        this.isInitialized = true;
        
        // Inspeccionar esquemas de las tablas
        await this.inspectDatabaseSchema();
      } else {
        console.warn("⚠️ No se pudo inicializar el servicio de base de datos");
        this.isInitialized = false;
      }

      return this.isInitialized;
    } catch (error) {
      console.error("❌ Error inicializando HistoricalDataService:", error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Inspecciona el esquema de la base de datos
   */
  async inspectDatabaseSchema() {
    try {
      console.log("🔍 Inspeccionando esquema de la base de datos...");

      // Inspeccionar esquema de error_tracking
      const errorTrackingSchema = await this.databaseService.inspectTableSchema('error_tracking');
      console.log("📋 Esquema de error_tracking:", errorTrackingSchema);

      // Inspeccionar esquema de dpmo_metrics
      const dpmoMetricsSchema = await this.databaseService.inspectTableSchema('dpmo_metrics');
      console.log("📋 Esquema de dpmo_metrics:", dpmoMetricsSchema);

      // Obtener muestras de datos
      const errorTrackingSample = await this.databaseService.getSampleData('error_tracking', 3);
      const dpmoMetricsSample = await this.databaseService.getSampleData('dpmo_metrics', 3);

      console.log("📊 Muestra de error_tracking:", errorTrackingSample);
      console.log("📊 Muestra de dpmo_metrics:", dpmoMetricsSample);

    } catch (error) {
      console.error("❌ Error inspeccionando esquema de la base de datos:", error);
      // No lanzar error, solo loggear
    }
  }

  /**
   * Obtiene datos históricos para un rango de fechas específico
   */
  async getHistoricalData(dateRange) {
    try {
      console.log("🔧 VERSIÓN ACTUALIZADA - HistoricalDataService con esquemas corregidos");
      console.log(
        `📊 Obteniendo datos históricos para rango: ${dateRange} días`
      );

      if (!this.isInitialized) {
        throw new Error("El servicio no está inicializado");
      }

      // Si es rango 0 (hoy), no necesitamos datos históricos
      if (dateRange === 0) {
        console.log("📅 Rango 0: No se necesitan datos históricos");
        return {
          errorTracking: [],
          dpmoMetrics: [],
          totalRecords: 0,
        };
      }

      // Calcular fechas de inicio y fin
      const { startDate, endDate } = this.calculateDateRange(dateRange);

      console.log(`📅 Rango de fechas históricas: ${startDate} a ${endDate}`);

      // Obtener datos históricos de la base de datos
      const historicalData = await this.databaseService.getHistoricalData(
        startDate,
        endDate
      );

      // Procesar y normalizar los datos
      const processedData = this.processHistoricalData(historicalData);

      console.log(
        `✅ Datos históricos obtenidos: ${processedData.errorTracking.length} errores, ${processedData.dpmoMetrics.length} métricas DPMO`
      );

      // Log de los primeros 5 registros para verificación
      if (processedData.errorTracking.length > 0) {
        console.log("📋 Primeros 5 registros históricos de error_tracking:");
        console.table(processedData.errorTracking.slice(0, 5));
      }

      return processedData;
    } catch (error) {
      console.error("❌ Error obteniendo datos históricos:", error);
      throw error;
    }
  }

  /**
   * Calcula el rango de fechas basado en el número de días
   */
  calculateDateRange(days) {
    const today = new Date();
    const startDate = new Date();
    const endDate = new Date();

    if (days === 0) {
      // Solo hoy - no necesitamos datos históricos
      return { startDate: null, endDate: null };
    } else {
      // Últimos N días (excluyendo hoy)
      startDate.setDate(today.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(today.getDate() - 1); // Excluir hoy
      endDate.setHours(23, 59, 59, 999);
    }

    // Formatear fechas para la base de datos (formato YYYYMMDD)
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}${month}${day}`;
    };

    return {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    };
  }

  /**
   * Procesa y normaliza los datos históricos para que sean compatibles con el sistema actual
   */
  processHistoricalData(historicalData) {
    console.log("🔧 Procesando datos históricos...");

    try {
      // Validar que historicalData tenga la estructura esperada
      if (!historicalData) {
        console.warn("⚠️ historicalData es nulo o indefinido");
        return {
          errorTracking: [],
          dpmoMetrics: [],
        };
      }

      // Procesar datos de error_tracking
      const processedErrorTracking = (historicalData.errorTracking || [])
        .map((record) => {
          try {
            // Convertir fecha de error_tracking (error_date en formato YYYY-MM-DD)
            const formattedDate = this.formatDateFromDatabase(record.error_date);

            return {
              id: record.error_id, // Usar error_id en lugar de id
              date: formattedDate,
              time: this.extractTimeFromCreatedAt(record.created_at),
              user_id: record.user_id,
              asin: record.asin,
              violation: record.violation,
              feedback_comment: record.feedback_comment || "",
              feedback_status: record.feedback_status || "pending",
              quantity: record.quantity || 1,
              times_notified: record.times_notified || 0,
              feedback_user: "", // No disponible en datos históricos
              occurrences: [
                {
                  date: formattedDate,
                  time: this.extractTimeFromCreatedAt(record.created_at),
                },
              ],
              created_at: record.created_at,
              updated_at: record.updated_at,
              isHistorical: true, // Marcar como dato histórico
            };
          } catch (error) {
            console.error("❌ Error procesando registro de error_tracking:", error, record);
            return null;
          }
        })
        .filter((record) => record !== null); // Eliminar registros que fallaron

      // Procesar datos de dpmo_metrics
      const processedDpmoMetrics = (historicalData.dpmoMetrics || [])
        .map((record) => {
          try {
            const formattedDate = this.formatDateFromDatabase(record.fecha);

            return {
              id: record.id,
              fecha: formattedDate,
              dpmo: record.dpmo,
              total_movimientos: record.total_movimientos,
              total_errores: record.total_errores,
              sigma: record.sigma,
              calidad: record.calidad,
              ultima_actualizacion: record.ultima_actualizacion,
              created_at: record.created_at,
              isHistorical: true, // Marcar como dato histórico
            };
          } catch (error) {
            console.error("❌ Error procesando registro de dpmo_metrics:", error, record);
            return null;
          }
        })
        .filter((record) => record !== null); // Eliminar registros que fallaron

      console.log("✅ Datos históricos procesados");
      console.log(`📊 Error tracking: ${processedErrorTracking.length} registros`);
      console.log(`📊 DPMO metrics: ${processedDpmoMetrics.length} registros`);

      return {
        errorTracking: processedErrorTracking,
        dpmoMetrics: processedDpmoMetrics,
        totalRecords: processedErrorTracking.length + processedDpmoMetrics.length,
      };
    } catch (error) {
      console.error("❌ Error general procesando datos históricos:", error);
      return {
        errorTracking: [],
        dpmoMetrics: [],
        totalRecords: 0,
      };
    }
  }

  /**
   * Convierte fecha de formato de base de datos a formato del sistema (YYYY/MM/DD)
   */
  formatDateFromDatabase(dbDate) {
    try {
      // Validar entrada
      if (!dbDate) {
        console.warn("⚠️ Fecha vacía recibida, usando fecha actual");
        return new Date().toISOString().split("T")[0].replace(/-/g, "/");
      }

      // Convertir a string si viene como número o Date
      let dateStr = String(dbDate);

      // Si es un objeto Date
      if (dbDate instanceof Date) {
        return dbDate.toISOString().split("T")[0].replace(/-/g, "/");
      }

      // Si es formato YYYY-MM-DD (error_tracking)
      if (dateStr.includes('-') && dateStr.length === 10) {
        return dateStr.replace(/-/g, "/");
      }

      // Si es formato DDMMYYYY (dpmo_metrics)
      if (dateStr.length === 8 && !dateStr.includes('-')) {
        // Detectar si es DDMMYYYY o YYYYMMDD
        const firstTwo = parseInt(dateStr.substring(0, 2));
        
        // Si los primeros dos dígitos son > 31, probablemente es YYYYMMDD
        if (firstTwo > 31) {
          // Formato YYYYMMDD
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          return `${year}/${month}/${day}`;
        } else {
          // Formato DDMMYYYY
          const day = dateStr.substring(0, 2);
          const month = dateStr.substring(2, 4);
          const year = dateStr.substring(4, 8);
          return `${year}/${month}/${day}`;
        }
      }

      // Si es formato YYYY-MM-DD HH:MM:SS (con hora)
      if (dateStr.includes('-') && dateStr.includes(' ')) {
        return dateStr.split(' ')[0].replace(/-/g, "/");
      }

      // Si es formato ISO completo
      if (dateStr.includes('T')) {
        return dateStr.split('T')[0].replace(/-/g, "/");
      }

      console.warn(`⚠️ Formato de fecha no reconocido: ${dateStr}`);
      return new Date().toISOString().split("T")[0].replace(/-/g, "/");
    } catch (error) {
      console.error("❌ Error formateando fecha:", error, "Valor:", dbDate);
      return new Date().toISOString().split("T")[0].replace(/-/g, "/");
    }
  }

  /**
   * Extrae la hora de un timestamp de created_at
   */
  extractTimeFromCreatedAt(createdAt) {
    if (!createdAt) {
      return "00:00:00";
    }

    try {
      const date = new Date(createdAt);
      return date.toTimeString().split(" ")[0];
    } catch (error) {
      console.warn("⚠️ Error extrayendo hora de created_at:", error);
      return "00:00:00";
    }
  }

  /**
   * Combina datos históricos con datos actuales
   */
  combineWithCurrentData(historicalData, currentData) {
    console.log("🔄 Combinando datos históricos con datos actuales...");

    const combinedErrorTracking = [
      ...historicalData.errorTracking,
      ...currentData,
    ];

    // Ordenar por fecha y hora
    combinedErrorTracking.sort((a, b) => {
      const dateA = new Date(a.date.replace(/\//g, "-") + " " + a.time);
      const dateB = new Date(b.date.replace(/\//g, "-") + " " + b.time);
      return dateB - dateA; // Más reciente primero
    });

    console.log(
      `✅ Datos combinados: ${combinedErrorTracking.length} registros totales`
    );

    return combinedErrorTracking;
  }

  /**
   * Obtiene estadísticas de la base de datos
   */
  async getDatabaseStats() {
    if (!this.isInitialized) {
      throw new Error("El servicio no está inicializado");
    }

    return await this.databaseService.getDatabaseStats();
  }

  /**
   * Obtiene las fechas disponibles en la base de datos
   */
  async getAvailableDates() {
    if (!this.isInitialized) {
      throw new Error("El servicio no está inicializado");
    }

    return await this.databaseService.getAvailableDates();
  }

  /**
   * Verifica si la base de datos está disponible
   */
  async isDatabaseAvailable() {
    if (!this.isInitialized) {
      return false;
    }

    return await this.databaseService.isDatabaseAvailable();
  }

  /**
   * Obtiene opciones de rango de fechas disponibles
   */
  getAvailableDateRanges() {
    return [
      { value: 0, label: "Hoy", description: "Solo datos de hoy" },
      { value: 1, label: "Ayer", description: "Solo datos de ayer" },
      {
        value: 3,
        label: "Últimos 3 días",
        description: "Datos de los últimos 3 días",
      },
      {
        value: 7,
        label: "Última semana",
        description: "Datos de la última semana",
      },
      { value: 30, label: "Último mes", description: "Datos del último mes" },
      {
        value: 90,
        label: "Últimos 3 meses",
        description: "Datos de los últimos 3 meses",
      },
    ];
  }

  /**
   * Cierra el servicio
   */
  async close() {
    console.log("🔌 Cerrando HistoricalDataService...");

    if (this.databaseService) {
      await this.databaseService.disconnect();
    }

    this.isInitialized = false;
    console.log("✅ HistoricalDataService cerrado");
  }
}
