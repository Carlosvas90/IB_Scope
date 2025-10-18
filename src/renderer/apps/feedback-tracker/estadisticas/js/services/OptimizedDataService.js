/**
 * OptimizedDataService.js
 * Capa de optimización que envuelve EstadisticasDataService con CacheManager
 *
 * FUNCIONALIDADES:
 * - Carga inteligente desde IndexedDB primero
 * - Fallback a SQLite solo si es necesario
 * - Particionamiento por mes
 * - Detección de cambios con checksums
 * - Precarga de datos frecuentes
 */

import { EstadisticasDataService } from "./EstadisticasDataService.js";
import { CacheManager } from "./CacheManager.js";
import { TodaySyncService } from "./TodaySyncService.js";

export class OptimizedDataService {
  constructor() {
    this.estadisticasService = new EstadisticasDataService();
    this.cacheManager = new CacheManager();
    this.isInitialized = false;
    this.currentMonth = null;
    this.loadedMonths = new Set(); // Meses ya cargados en memoria

    // Caché en memoria para queries frecuentes
    this.inMemoryCache = {
      today: null,
      lastWeek: null,
      lastMonth: null,
      lastUpdated: null,
    };

    // Servicio de sincronización (se inicializa después)
    this.syncService = null;
    this.syncEnabled = false; // Se activa con enableSync()

    console.log("🚀 OptimizedDataService inicializado");
  }

  /**
   * Inicializa ambos servicios
   */
  async init() {
    try {
      // Inicializar CacheManager
      await this.cacheManager.init();

      // Inicializar EstadisticasDataService
      await this.estadisticasService.init();

      // Calcular mes actual
      this.currentMonth = this.getCurrentMonthKey();

      this.isInitialized = true;
      console.log("✅ OptimizedDataService inicializado");

      return true;
    } catch (error) {
      console.error("❌ Error inicializando OptimizedDataService:", error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Obtiene la clave del mes actual (formato: YYYYMM)
   */
  getCurrentMonthKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}${month}`;
  }

  /**
   * Obtiene la clave del mes para una fecha específica
   */
  getMonthKeyFromDate(dateString) {
    // Formato esperado: YYYY/MM/DD o YYYYMMDD
    let cleanDate = dateString.replace(/\//g, "");
    return cleanDate.substring(0, 6); // YYYYMM
  }

  /**
   * Genera lista de meses necesarios para un rango de días
   */
  getMonthsForDateRange(days) {
    const months = new Set();
    const today = new Date();

    for (let i = 0; i <= days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      months.add(`${year}${month}`);
    }

    return Array.from(months).sort();
  }

  /**
   * Calcula hash MD5 simple de un array de datos
   */
  async calculateDataHash(data) {
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  }

  /**
   * MÉTODO PRINCIPAL: Carga datos con estrategia optimizada
   *
   * Estrategia:
   * 1. Datos de hoy → Siempre desde JSON (tiempo real)
   * 2. Datos históricos → IndexedDB primero, SQLite si no existe
   * 3. Combinar y retornar
   */
  async loadData() {
    try {
      if (!this.isInitialized) {
        console.warn("⚠️ Servicio no inicializado, inicializando ahora...");
        await this.init();
      }

      // PASO 1: Cargar datos de hoy desde JSON (siempre actualizado)
      const todayData = await this.loadTodayData();

      // Si no hay datos de hoy, cargar todos los datos
      if (!todayData || todayData.length === 0) {
        console.log("📅 No hay datos de hoy, cargando todos los datos...");
        await this.estadisticasService.loadData();
        this.estadisticasService.notifyListeners();
        return true;
      }

      // Por defecto, solo retornar datos de hoy
      this.estadisticasService.errors = todayData;
      this.estadisticasService.lastUpdateTime = new Date();
      this.estadisticasService.notifyListeners();

      // Actualizar caché en memoria
      this.inMemoryCache.today = todayData;
      this.inMemoryCache.lastUpdated = new Date();

      console.log(`✅ Datos cargados: ${todayData.length} registros`);
      return true;
    } catch (error) {
      console.error("❌ Error en carga optimizada:", error);

      // Fallback al servicio original
      console.log("🔄 Fallback al servicio original...");
      return await this.estadisticasService.loadData();
    }
  }

  /**
   * Carga datos del día actual desde JSON
   */
  async loadTodayData() {
    try {
      // Reutilizar lógica del servicio original
      await this.estadisticasService.loadData();

      // Si no hay datos, retornar array vacío
      if (
        !this.estadisticasService.errors ||
        this.estadisticasService.errors.length === 0
      ) {
        console.log("📅 No hay datos disponibles");
        return [];
      }

      // Filtrar solo datos de hoy
      const today = new Date().toISOString().split("T")[0].replace(/-/g, "/");
      const todayData = this.estadisticasService.errors.filter(
        (error) => error.date === today
      );

      console.log(`📅 Datos de hoy: ${todayData.length} registros`);
      return todayData;
    } catch (error) {
      console.error("❌ Error cargando datos de hoy:", error);
      return [];
    }
  }

  /**
   * Carga datos históricos con estrategia de caché
   *
   * @param {number} dateRange - Días hacia atrás (1, 3, 7, 30, 90, 180, 365)
   */
  async loadHistoricalData(dateRange) {
    try {
      console.log(`📚 [ODS] Cargando datos históricos: ${dateRange} días`);

      // IMPORTANTE: Usar EstadisticasDataService que lee de JSONs pre-procesados
      // NO usar IndexedDB ni SQLite para datos históricos
      console.log(
        `📊 [ODS] Delegando a EstadisticasDataService (JSONs pre-procesados)...`
      );

      // Usar changeDateRange del servicio interno que usa AnalyticsJSONService
      const success = await this.estadisticasService.changeDateRange(dateRange);

      if (success) {
        console.log(
          `✅ [ODS] Datos históricos cargados desde JSONs: ${
            this.estadisticasService.errors?.length || 0
          } registros`
        );
        return true;
      }

      console.warn("⚠️ No se pudieron cargar datos históricos desde JSONs");
      return false;
    } catch (error) {
      console.error("❌ Error cargando datos históricos:", error);
      return false;
    }
  }

  /**
   * Intenta cargar datos desde IndexedDB
   */
  async loadFromCache(months, dateRange) {
    try {
      console.log("🔍 [ODS] Buscando en caché IndexedDB...");

      const cachedRecords = [];

      for (const month of months) {
        // Obtener datos del mes desde caché
        const monthData = await this.cacheManager.getMonthData(
          "feedback",
          month
        );

        if (monthData && monthData.data) {
          console.log(
            `✅ [CACHE] Mes ${month}: ${monthData.data.length} registros`
          );
          cachedRecords.push(...monthData.data);
        } else {
          console.log(`⚠️ [CACHE] Mes ${month}: No encontrado`);
          // Si falta un mes, necesitamos cargarlo todo desde DB
          return [];
        }
      }

      // Filtrar por rango de fechas exacto
      const filteredRecords = this.filterByDateRange(cachedRecords, dateRange);

      console.log(`📊 [CACHE] Registros filtrados: ${filteredRecords.length}`);
      return filteredRecords;
    } catch (error) {
      console.error("❌ Error leyendo desde caché:", error);
      return [];
    }
  }

  /**
   * Carga desde SQLite y guarda en caché
   */
  async loadFromDatabaseAndCache(months, dateRange) {
    try {
      console.log("💾 [ODS] Cargando desde SQLite y cacheando...");

      // Usar el servicio original para cargar desde DB
      const success = await this.estadisticasService.loadHistoricalData(
        dateRange
      );

      if (!success || !this.estadisticasService.errors.length) {
        console.warn("⚠️ No se pudieron cargar datos desde DB");
        return [];
      }

      const dbRecords = this.estadisticasService.errors;
      console.log(`📂 [DB] Obtenidos ${dbRecords.length} registros`);

      // Particionar datos por mes y cachear
      await this.partitionAndCacheData(dbRecords);

      return dbRecords;
    } catch (error) {
      console.error("❌ Error cargando desde DB y cacheando:", error);
      return [];
    }
  }

  /**
   * Particiona datos por mes y los guarda en IndexedDB
   */
  async partitionAndCacheData(records) {
    try {
      console.log("📦 [ODS] Particionando datos por mes...");

      // Agrupar por mes
      const monthGroups = {};

      records.forEach((record) => {
        if (record.isHistorical && record.date) {
          const monthKey = this.getMonthKeyFromDate(record.date);

          if (!monthGroups[monthKey]) {
            monthGroups[monthKey] = [];
          }

          monthGroups[monthKey].push(record);
        }
      });

      // Guardar cada mes en caché
      for (const [month, data] of Object.entries(monthGroups)) {
        const hash = await this.calculateDataHash(data);

        await this.cacheManager.saveMonthData("feedback", month, data, hash);
        console.log(
          `💾 [CACHE] Mes ${month}: ${data.length} registros guardados`
        );

        // Marcar mes como cargado
        this.loadedMonths.add(month);
      }

      console.log("✅ [ODS] Particionamiento y caché completado");
    } catch (error) {
      console.error("❌ Error particionando y cacheando:", error);
    }
  }

  /**
   * Filtra registros por rango de días
   */
  filterByDateRange(records, days) {
    if (days === 0) {
      const today = new Date().toISOString().split("T")[0].replace(/-/g, "/");
      return records.filter((r) => r.date === today);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return records.filter((record) => {
      try {
        const recordDate = new Date(record.date.replace(/\//g, "-"));
        return recordDate >= cutoffDate;
      } catch {
        return false;
      }
    });
  }

  /**
   * Cambia el rango de fechas (proxy al servicio original)
   */
  async changeDateRange(newRange) {
    console.log(`📅 [ODS] Cambiando rango de fechas a: ${newRange}`);

    // IMPORTANTE: SIEMPRE delegar al servicio interno para que limpie y recargue correctamente
    // NO usar loadData() que reutiliza datos viejos
    const success = await this.estadisticasService.changeDateRange(newRange);

    if (success) {
      console.log(`✅ [ODS] Rango cambiado exitosamente a ${newRange} días`);
    }

    return success;
  }

  /**
   * Refresca datos (invalidar caché de hoy)
   */
  async refresh() {
    console.log("🔄 [ODS] Refrescando datos...");

    // Invalidar caché en memoria
    this.inMemoryCache.today = null;
    this.inMemoryCache.lastUpdated = null;

    // Recargar según rango actual
    const currentRange = this.estadisticasService.currentDateRange || 0;

    if (currentRange === 0) {
      return await this.loadData();
    } else {
      return await this.loadHistoricalData(currentRange);
    }
  }

  /**
   * Verifica salud del caché
   */
  async checkCacheHealth() {
    return await this.cacheManager.checkCacheHealth();
  }

  /**
   * Limpia caché antiguo
   */
  async cleanupCache() {
    return await this.cacheManager.cleanupCache();
  }

  /**
   * Obtiene estadísticas del caché
   */
  async getCacheStats() {
    const health = await this.cacheManager.checkCacheHealth();
    return {
      totalSize: health.totalSize,
      historicalRecords: health.historicalRecords,
      loadedMonths: Array.from(this.loadedMonths),
      inMemoryCacheStatus: {
        today: this.inMemoryCache.today ? this.inMemoryCache.today.length : 0,
        lastUpdated: this.inMemoryCache.lastUpdated,
      },
    };
  }

  /**
   * Exponer propiedades del servicio original para compatibilidad
   */
  get errors() {
    return this.estadisticasService.errors;
  }

  set errors(value) {
    this.estadisticasService.errors = value;
  }

  get lastUpdateTime() {
    return this.estadisticasService.lastUpdateTime;
  }

  get isLoading() {
    return this.estadisticasService.isLoading;
  }

  /**
   * Métodos proxy al servicio original
   */
  getBasicStats() {
    return this.estadisticasService.getBasicStats();
  }

  filterByDateRange(days) {
    return this.estadisticasService.filterByDateRange(days);
  }

  onDataUpdate(callback) {
    return this.estadisticasService.onDataUpdate(callback);
  }

  getLastUpdateFormatted() {
    return this.estadisticasService.getLastUpdateFormatted();
  }

  async getDatabaseStats() {
    return await this.estadisticasService.getDatabaseStats();
  }

  async getAvailableDates() {
    return await this.estadisticasService.getAvailableDates();
  }

  getAvailableDateRanges() {
    return this.estadisticasService.getAvailableDateRanges();
  }

  async isHistoricalDataAvailable() {
    return await this.estadisticasService.isHistoricalDataAvailable();
  }

  getCurrentDateRange() {
    return this.estadisticasService.getCurrentDateRange();
  }

  /**
   * Métodos getters para datos procesados (delegados al EstadisticasDataService)
   */
  getAllData() {
    return this.estadisticasService.getAllData();
  }

  getKPIs() {
    return this.estadisticasService.getKPIs();
  }

  getTrends() {
    return this.estadisticasService.getTrends();
  }

  getDistribution() {
    return this.estadisticasService.getDistribution();
  }

  getTopASINs() {
    return this.estadisticasService.getTopASINs();
  }

  getTopViolations() {
    return this.estadisticasService.getTopViolations();
  }

  getTopMotives() {
    return this.estadisticasService.getTopMotives();
  }

  getTopOffenders() {
    return this.estadisticasService.getTopOffenders();
  }

  getInsights() {
    return this.estadisticasService.getInsights();
  }

  getMetadata() {
    return this.estadisticasService.getMetadata();
  }

  /**
   * Habilita sincronización automática del día actual
   */
  enableSync(options = {}) {
    if (this.syncService) {
      console.warn("⚠️ Sincronización ya está habilitada");
      return;
    }

    const pollingInterval = options.pollingInterval || 30000; // 30 segundos por defecto

    console.log("🔄 [ODS] Habilitando sincronización automática...");
    this.syncService = new TodaySyncService(this, pollingInterval);

    // Configurar opciones
    if (options.hasOwnProperty("autoRefresh")) {
      this.syncService.autoRefresh = options.autoRefresh;
    }
    if (options.hasOwnProperty("notifyUsers")) {
      this.syncService.notifyUsers = options.notifyUsers;
    }

    // Iniciar polling
    this.syncService.start();
    this.syncEnabled = true;

    console.log("✅ [ODS] Sincronización automática habilitada");
    return this.syncService;
  }

  /**
   * Deshabilita sincronización automática
   */
  disableSync() {
    if (!this.syncService) {
      console.warn("⚠️ Sincronización no está habilitada");
      return;
    }

    console.log("🔄 [ODS] Deshabilitando sincronización...");
    this.syncService.destroy();
    this.syncService = null;
    this.syncEnabled = false;

    console.log("✅ [ODS] Sincronización deshabilitada");
  }

  /**
   * Obtiene estadísticas de sincronización
   */
  getSyncStats() {
    if (!this.syncService) {
      return null;
    }

    return this.syncService.getStats();
  }

  /**
   * Cierra todos los servicios
   */
  async close() {
    console.log("🔌 [ODS] Cerrando OptimizedDataService...");

    // Detener sincronización si está activa
    if (this.syncService) {
      this.disableSync();
    }

    if (this.estadisticasService) {
      await this.estadisticasService.close();
    }

    if (this.cacheManager) {
      this.cacheManager.close();
    }

    console.log("✅ [ODS] Cerrado correctamente");
  }
}
