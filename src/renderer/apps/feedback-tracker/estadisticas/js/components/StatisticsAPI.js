/**
 * StatisticsAPI.js
 * Componente para obtener y procesar datos estadísticos
 * Responsable de conectar con la API y generar datos simulados para desarrollo
 */

export class StatisticsAPI {
  constructor() {
    this.apiBaseUrl = "/api/statistics"; // URL base de la API
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos de cache
    this.config = null;
    this.dataPaths = [];
    console.log("🔌 StatisticsAPI inicializado");
  }

  /**
   * Carga la configuración desde config.json
   * @returns {Promise<Object>} - Configuración cargada
   */
  async loadConfig() {
    if (this.config) return this.config;

    try {
      // Intentar cargar config desde la ruta relativa
      const response = await fetch("../../../../config/config.json");
      if (!response.ok) {
        throw new Error(`Error cargando config: ${response.status}`);
      }

      this.config = await response.json();
      this.dataPaths = this.config.data_paths || [];
      console.log("📋 Configuración cargada:", this.dataPaths);
      return this.config;
    } catch (error) {
      console.error("❌ Error cargando configuración:", error);
      // Fallback a paths por defecto
      this.dataPaths = [
        "\\\\ant\\dept-eu\\VLC1\\Public\\Apps_Tools\\chuecc\\IB_Scope\\Data\\",
        "C:\\Users\\carlo\\Downloads\\0-Proyecto_IB_Scope\\Analisis\\Data\\",
      ];
      return null;
    }
  }

  /**
   * Intenta cargar un archivo desde los data paths configurados
   * @param {string} fileName - Nombre del archivo
   * @returns {Promise<Object>} - Datos del archivo
   */
  async loadFromDataPaths(fileName) {
    await this.loadConfig();

    // Si estamos en desarrollo, intentar cargar desde la raíz del proyecto
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      try {
        const response = await fetch(`/${fileName}`);
        if (response.ok) {
          console.log(`📁 Archivo ${fileName} cargado desde desarrollo`);
          return await response.json();
        }
      } catch (error) {
        console.log(`⚠️ No se pudo cargar ${fileName} desde desarrollo`);
      }
    }

    // Intentar cargar desde los data paths configurados
    for (const path of this.dataPaths) {
      try {
        const fullPath =
          path.endsWith("\\") || path.endsWith("/")
            ? `${path}${fileName}`
            : `${path}/${fileName}`;

        // En entorno web, esto necesitaría ser una API call
        // Por ahora, simular la carga desde filesystem
        console.log(`🔍 Intentando cargar desde: ${fullPath}`);

        // Aquí iría la lógica específica de Electron para leer archivos
        // Por ahora, lanzar error para que use datos simulados
        throw new Error(`Carga desde filesystem no implementada: ${fullPath}`);
      } catch (error) {
        console.log(`❌ Error cargando desde ${path}: ${error.message}`);
        continue;
      }
    }

    throw new Error(`No se pudo cargar ${fileName} desde ningún data path`);
  }

  /**
   * Obtiene datos estadísticos para un período específico
   * @param {number} period - Período en días
   * @returns {Promise<Object>} - Datos estadísticos
   */
  async getStatisticsData(period = 30) {
    console.log(`📊 Obteniendo datos estadísticos para ${period} días`);

    // Verificar cache primero
    const cacheKey = `stats_${period}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      console.log("📋 Usando datos del cache");
      return cachedData;
    }

    try {
      // Intentar obtener datos reales de los archivos JSON
      const realData = await this.fetchRealData(period);
      this.setCachedData(cacheKey, realData);
      return realData;
    } catch (error) {
      console.warn(
        "⚠️ Error obteniendo datos reales, usando datos simulados:",
        error.message
      );
      // Si falla la carga de archivos, usar datos simulados
      const simulatedData = this.generateSimulatedData(period);
      this.setCachedData(cacheKey, simulatedData);
      return simulatedData;
    }
  }

  /**
   * Obtiene datos reales de los archivos JSON
   * @param {number} period - Período en días
   * @returns {Promise<Object>} - Datos reales procesados
   */
  async fetchRealData(period) {
    console.log("📂 Cargando datos reales desde archivos JSON...");

    try {
      // Cargar ambos archivos JSON
      const [currentData, historicalData] = await Promise.all([
        this.loadFromDataPaths("error_tracker.json"),
        this.loadFromDataPaths("DB_Error_Tracker.json"),
      ]);

      console.log("✅ Archivos JSON cargados exitosamente");

      // Procesar los datos reales
      return this.processRealData(currentData, historicalData, period);
    } catch (error) {
      console.error("❌ Error cargando archivos JSON:", error.message);
      throw error;
    }
  }

  /**
   * Procesa los datos reales de los archivos JSON
   * @param {Object} currentData - Datos de error_tracker.json
   * @param {Object} historicalData - Datos de DB_Error_Tracker.json
   * @param {number} period - Período en días
   * @returns {Object} - Datos procesados para estadísticas
   */
  processRealData(currentData, historicalData, period) {
    console.log("⚙️ Procesando datos reales...");

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - period);

    // Combinar errores de ambas fuentes
    const allErrors = [
      ...(currentData.errors || []),
      ...(historicalData.errors || []),
    ];

    // Filtrar errores por período
    const errorsInPeriod = allErrors.filter((error) => {
      const errorDate = new Date(error.date.replace(/\//g, "-"));
      return errorDate >= startDate && errorDate <= endDate;
    });

    // Calcular estadísticas del período actual
    const currentStats = this.calculatePeriodStats(errorsInPeriod);

    // Calcular estadísticas del período anterior para comparación
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - period);

    const errorsInPreviousPeriod = allErrors.filter((error) => {
      const errorDate = new Date(error.date.replace(/\//g, "-"));
      return errorDate >= previousStartDate && errorDate < startDate;
    });

    const previousStats = this.calculatePeriodStats(errorsInPreviousPeriod);

    // Generar datos de tendencias
    const trendData = this.generateTrendDataFromReal(
      errorsInPeriod,
      period,
      endDate
    );

    // Generar datos por hora
    const hourlyData = this.generateHourlyDataFromReal(errorsInPeriod);

    // Generar top productos
    const topProducts = this.generateTopProductsFromReal(errorsInPeriod);

    // Generar ranking de usuarios
    const usersRanking = this.generateUsersRankingFromReal(errorsInPeriod);

    // Generar análisis de productos
    const productsAnalysis =
      this.generateProductsAnalysisFromReal(errorsInPeriod);

    return {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      current: currentStats,
      previous: previousStats,
      trendData,
      hourlyData,
      topProducts,
      usersRanking,
      productsAnalysis,
      generatedAt: new Date().toISOString(),
      dataSource: "real",
    };
  }

  /**
   * Calcula estadísticas para un conjunto de errores
   * @param {Array} errors - Array de errores
   * @returns {Object} - Estadísticas calculadas
   */
  calculatePeriodStats(errors) {
    const totalErrors = errors.length;
    const resolvedErrors = errors.filter((e) => e.status === "done").length;
    const pendingErrors = totalErrors - resolvedErrors;

    // Calcular tiempo promedio de resolución
    const resolvedWithTimes = errors.filter(
      (e) => e.status === "done" && e.feedback_date && e.date
    );

    let avgResolutionTime = 0;
    if (resolvedWithTimes.length > 0) {
      const totalResolutionTime = resolvedWithTimes.reduce((sum, error) => {
        const startDate = new Date(error.date.replace(/\//g, "-"));
        const endDate = new Date(error.feedback_date.replace(/\//g, "-"));
        const diffMinutes = (endDate - startDate) / (1000 * 60);
        return sum + Math.max(diffMinutes, 0);
      }, 0);

      avgResolutionTime = totalResolutionTime / resolvedWithTimes.length;
    }

    // Errores críticos (priority high o quantity > 10)
    const criticalErrors = errors.filter(
      (e) => e.priority === "high" || (e.quantity && e.quantity > 10)
    ).length;

    // Usuarios únicos
    const assignedUsers = new Set(errors.map((e) => e.user_id)).size;

    // Errores de hoy
    const today = new Date().toISOString().split("T")[0];
    const todayFormatted = today.replace(/-/g, "/");
    const newErrorsToday = errors.filter(
      (e) => e.date === todayFormatted
    ).length;

    return {
      totalErrors,
      resolvedErrors,
      pendingErrors,
      avgResolutionTime,
      newErrorsToday,
      criticalErrors,
      assignedUsers,
    };
  }

  /**
   * Genera datos de tendencias desde datos reales
   * @param {Array} errors - Errores del período
   * @param {number} period - Período en días
   * @param {Date} endDate - Fecha final
   * @returns {Array} - Datos de tendencias
   */
  generateTrendDataFromReal(errors, period, endDate) {
    const trendData = [];

    for (let i = period - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateString = date
        .toLocaleDateString("es-ES", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .replace(/\//g, "/");

      const dayErrors = errors.filter((e) => e.date === dateString);
      const total = dayErrors.length;
      const resolved = dayErrors.filter((e) => e.status === "done").length;
      const pending = total - resolved;

      trendData.push({
        date: date.toLocaleDateString("es-ES", {
          month: "short",
          day: "numeric",
        }),
        total,
        resolved,
        pending,
      });
    }

    return trendData;
  }

  /**
   * Genera datos por hora desde datos reales
   * @param {Array} errors - Errores del período
   * @returns {Array} - Datos por hora
   */
  generateHourlyDataFromReal(errors) {
    const hourlyCount = new Array(24).fill(0);

    errors.forEach((error) => {
      if (error.time) {
        const hour = parseInt(error.time.split(":")[0]);
        if (hour >= 0 && hour < 24) {
          hourlyCount[hour]++;
        }
      }
    });

    return hourlyCount.map((count, hour) => ({
      hour,
      count,
    }));
  }

  /**
   * Genera top productos desde datos reales
   * @param {Array} errors - Errores del período
   * @returns {Array} - Top productos
   */
  generateTopProductsFromReal(errors) {
    const productCount = {};

    errors.forEach((error) => {
      if (error.asin) {
        productCount[error.asin] =
          (productCount[error.asin] || 0) + (error.quantity || 1);
      }
    });

    return Object.entries(productCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([asin, count]) => ({ asin, count }));
  }

  /**
   * Genera ranking de usuarios desde datos reales
   * @param {Array} errors - Errores del período
   * @returns {Array} - Ranking de usuarios
   */
  generateUsersRankingFromReal(errors) {
    const userStats = {};

    errors.forEach((error) => {
      if (!userStats[error.user_id]) {
        userStats[error.user_id] = {
          username: error.user_id,
          totalErrors: 0,
          resolvedErrors: 0,
          resolutionTimes: [],
        };
      }

      const user = userStats[error.user_id];
      user.totalErrors++;

      if (error.status === "done") {
        user.resolvedErrors++;

        if (error.feedback_date && error.date) {
          const startDate = new Date(error.date.replace(/\//g, "-"));
          const endDate = new Date(error.feedback_date.replace(/\//g, "-"));
          const diffMinutes = (endDate - startDate) / (1000 * 60);
          if (diffMinutes > 0) {
            user.resolutionTimes.push(diffMinutes);
          }
        }
      }
    });

    return Object.values(userStats)
      .map((user) => ({
        ...user,
        resolutionRate:
          user.totalErrors > 0
            ? Math.round((user.resolvedErrors / user.totalErrors) * 100)
            : 0,
        avgResolutionTime:
          user.resolutionTimes.length > 0
            ? user.resolutionTimes.reduce((a, b) => a + b, 0) /
              user.resolutionTimes.length
            : 0,
      }))
      .sort((a, b) => b.totalErrors - a.totalErrors)
      .slice(0, 10);
  }

  /**
   * Genera análisis de productos desde datos reales
   * @param {Array} errors - Errores del período
   * @returns {Array} - Análisis de productos
   */
  generateProductsAnalysisFromReal(errors) {
    const productStats = {};

    errors.forEach((error) => {
      if (!productStats[error.asin]) {
        productStats[error.asin] = {
          asin: error.asin,
          totalErrors: 0,
          uniqueErrors: new Set(),
          frequency: 0,
        };
      }

      const product = productStats[error.asin];
      product.totalErrors++;
      product.frequency += error.quantity || 1;
      product.uniqueErrors.add(error.id);
    });

    return Object.values(productStats)
      .map((product) => ({
        ...product,
        uniqueErrors: product.uniqueErrors.size,
        status:
          product.frequency > 50
            ? "critical"
            : product.frequency > 20
            ? "warning"
            : "normal",
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  /**
   * Genera datos simulados para desarrollo y testing
   * @param {number} period - Período en días
   * @returns {Object} - Datos simulados
   */
  generateSimulatedData(period) {
    console.log(`🎭 Generando datos simulados para ${period} días`);

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - period);

    // Generar datos actuales
    const currentData = this.generateCurrentPeriodData(period);

    // Generar datos del período anterior para comparación
    const previousData = this.generatePreviousPeriodData(period);

    // Generar datos de tendencias
    const trendData = this.generateTrendData(period, endDate);

    // Generar datos por hora
    const hourlyData = this.generateHourlyData();

    // Generar top productos
    const topProducts = this.generateTopProductsData();

    // Generar ranking de usuarios
    const usersRanking = this.generateUsersRankingData();

    // Generar análisis de productos
    const productsAnalysis = this.generateProductsAnalysisData();

    return {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      current: currentData,
      previous: previousData,
      trendData,
      hourlyData,
      topProducts,
      usersRanking,
      productsAnalysis,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Genera datos del período actual
   * @param {number} period - Período en días
   * @returns {Object} - Datos del período actual
   */
  generateCurrentPeriodData(period) {
    // Simular variabilidad basada en el período
    const baseErrors = Math.floor(Math.random() * 200) + 50;
    const resolutionRate = 0.6 + Math.random() * 0.3; // 60-90%

    const totalErrors = baseErrors + Math.floor(Math.random() * period * 2);
    const resolvedErrors = Math.floor(totalErrors * resolutionRate);
    const pendingErrors = totalErrors - resolvedErrors;

    return {
      totalErrors,
      resolvedErrors,
      pendingErrors,
      avgResolutionTime: 120 + Math.random() * 600, // 2-12 horas en minutos
      newErrorsToday: Math.floor(Math.random() * 20) + 5,
      criticalErrors: Math.floor(totalErrors * 0.1),
      assignedUsers: Math.floor(Math.random() * 10) + 5,
    };
  }

  /**
   * Genera datos del período anterior
   * @param {number} period - Período en días
   * @returns {Object} - Datos del período anterior
   */
  generatePreviousPeriodData(period) {
    const baseErrors = Math.floor(Math.random() * 180) + 40;
    const resolutionRate = 0.55 + Math.random() * 0.35;

    const totalErrors = baseErrors + Math.floor(Math.random() * period * 1.8);
    const resolvedErrors = Math.floor(totalErrors * resolutionRate);
    const pendingErrors = totalErrors - resolvedErrors;

    return {
      totalErrors,
      resolvedErrors,
      pendingErrors,
      avgResolutionTime: 150 + Math.random() * 700,
      newErrorsToday: Math.floor(Math.random() * 18) + 3,
      criticalErrors: Math.floor(totalErrors * 0.12),
      assignedUsers: Math.floor(Math.random() * 8) + 4,
    };
  }

  /**
   * Genera datos de tendencias diarias
   * @param {number} period - Período en días
   * @param {Date} endDate - Fecha final
   * @returns {Array} - Array de datos diarios
   */
  generateTrendData(period, endDate) {
    const trendData = [];

    for (let i = period - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);

      // Simular patrones realistas
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const baseTotal = isWeekend
        ? 5 + Math.random() * 10
        : 15 + Math.random() * 25;
      const total = Math.floor(baseTotal);
      const resolved = Math.floor(total * (0.5 + Math.random() * 0.4));
      const pending = total - resolved;

      trendData.push({
        date: date.toLocaleDateString("es-ES", {
          month: "short",
          day: "numeric",
        }),
        fullDate: date.toISOString().split("T")[0],
        total,
        resolved,
        pending,
        dayOfWeek: dayOfWeek,
      });
    }

    return trendData;
  }

  /**
   * Genera datos de errores por hora del día
   * @returns {Array} - Array de datos por hora
   */
  generateHourlyData() {
    const hourlyData = [];

    for (let hour = 0; hour < 24; hour++) {
      // Simular patrones de actividad realistas
      let multiplier = 1;

      if (hour >= 6 && hour <= 8) multiplier = 1.5; // Mañana temprano
      else if (hour >= 9 && hour <= 17) multiplier = 2; // Horario laboral
      else if (hour >= 18 && hour <= 22) multiplier = 1.2; // Tarde
      else multiplier = 0.3; // Noche/madrugada

      const count = Math.floor((Math.random() * 10 + 2) * multiplier);

      hourlyData.push({
        hour,
        count,
        label: `${hour.toString().padStart(2, "0")}:00`,
      });
    }

    return hourlyData;
  }

  /**
   * Genera datos de top productos con errores
   * @returns {Array} - Array de productos
   */
  generateTopProductsData() {
    const products = [
      "B08N5WRWNW",
      "B07XJ8C8F5",
      "B09BNK6H1P",
      "B08ZK5M7Y3",
      "B07Y9Q3K2M",
      "B08CFRHX1D",
      "B09L4T6X8N",
      "B07S5GV2WK",
      "B08YN4G7LP",
      "B09D3M8R5Q",
      "B07K2H9F3V",
      "B08M4K9J2P",
    ];

    return products
      .sort(() => 0.5 - Math.random()) // Mezclar array
      .slice(0, 10) // Tomar 10
      .map((asin, index) => ({
        asin,
        count: Math.floor(Math.random() * 50) + 10 - index * 2, // Decreciente
        uniqueErrors: Math.floor(Math.random() * 15) + 3,
        lastOccurrence: this.getRandomRecentDate(),
      }))
      .sort((a, b) => b.count - a.count); // Ordenar por cantidad
  }

  /**
   * Genera datos de ranking de usuarios
   * @returns {Array} - Array de usuarios
   */
  generateUsersRankingData() {
    const usernames = [
      "carlos.martinez",
      "ana.lopez",
      "miguel.santos",
      "laura.garcia",
      "jose.rodriguez",
      "maria.fernandez",
      "david.jimenez",
      "sofia.morales",
      "pablo.torres",
      "carmen.ruiz",
      "lucas.mendez",
      "valeria.castro",
    ];

    return usernames
      .sort(() => 0.5 - Math.random())
      .slice(0, 8)
      .map((username, index) => {
        const totalErrors = Math.floor(Math.random() * 80) + 20 - index * 5;
        const resolutionRate = Math.floor((0.6 + Math.random() * 0.35) * 100);
        const resolvedErrors = Math.floor(totalErrors * (resolutionRate / 100));

        return {
          username,
          totalErrors,
          resolvedErrors,
          resolutionRate,
          avgResolutionTime: 90 + Math.random() * 400,
          lastActivity: this.getRandomRecentDate(),
        };
      })
      .sort((a, b) => b.resolutionRate - a.resolutionRate);
  }

  /**
   * Genera datos de análisis de productos
   * @returns {Array} - Array de análisis de productos
   */
  generateProductsAnalysisData() {
    const products = [
      "B08N5WRWNW",
      "B07XJ8C8F5",
      "B09BNK6H1P",
      "B08ZK5M7Y3",
      "B07Y9Q3K2M",
      "B08CFRHX1D",
      "B09L4T6X8N",
      "B07S5GV2WK",
      "B08YN4G7LP",
      "B09D3M8R5Q",
      "B07K2H9F3V",
      "B08M4K9J2P",
      "B09X7Y8Z1A",
      "B08P3Q4R5S",
      "B07T6U7V8W",
    ];

    return products
      .sort(() => 0.5 - Math.random())
      .slice(0, 12)
      .map((asin, index) => {
        const totalErrors = Math.floor(Math.random() * 60) + 15 - index;
        const uniqueErrors = Math.floor(
          totalErrors * (0.3 + Math.random() * 0.4)
        );
        const frequency = Math.floor(Math.random() * 15) + 1;

        let status;
        if (totalErrors > 40) status = "critical";
        else if (totalErrors > 25) status = "warning";
        else status = "normal";

        return {
          asin,
          totalErrors,
          uniqueErrors,
          frequency,
          status,
          averagePerDay: Math.round((totalErrors / 30) * 10) / 10,
          lastError: this.getRandomRecentDate(),
        };
      })
      .sort((a, b) => b.totalErrors - a.totalErrors);
  }

  /**
   * Obtiene una fecha aleatoria reciente
   * @returns {string} - Fecha en formato ISO
   */
  getRandomRecentDate() {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 7); // Hasta 7 días atrás
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  }

  /**
   * Obtiene datos del cache si están disponibles y no han expirado
   * @param {string} key - Clave del cache
   * @returns {Object|null} - Datos del cache o null
   */
  getCachedData(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const cached = this.cache.get(key);
    const now = Date.now();

    if (now - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Almacena datos en el cache
   * @param {string} key - Clave del cache
   * @param {Object} data - Datos a almacenar
   */
  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Limpia todo el cache
   */
  clearCache() {
    this.cache.clear();
    console.log("🗑️ Cache de estadísticas limpiado");
  }

  /**
   * Valida la estructura de los datos
   * @param {Object} data - Datos a validar
   * @returns {boolean} - True si los datos son válidos
   */
  validateData(data) {
    const requiredFields = [
      "current",
      "previous",
      "trendData",
      "hourlyData",
      "topProducts",
      "usersRanking",
      "productsAnalysis",
    ];

    return requiredFields.every((field) => {
      const isValid = data && typeof data === "object" && field in data;
      if (!isValid) {
        console.error(`❌ Campo requerido faltante: ${field}`);
      }
      return isValid;
    });
  }

  /**
   * Obtiene estadísticas en tiempo real (para uso futuro)
   * @returns {Promise<Object>} - Estadísticas en tiempo real
   */
  async getRealTimeStats() {
    // Implementación futura para datos en tiempo real
    console.log("📡 Obteniendo estadísticas en tiempo real...");
    return {
      liveErrors: Math.floor(Math.random() * 10),
      activeUsers: Math.floor(Math.random() * 15) + 5,
      systemStatus: "operational",
      lastUpdate: new Date().toISOString(),
    };
  }

  /**
   * Exporta datos para análisis externo
   * @param {Object} data - Datos a exportar
   * @param {string} format - Formato de exportación ('json', 'csv')
   * @returns {string} - Datos formateados
   */
  exportData(data, format = "json") {
    switch (format) {
      case "json":
        return JSON.stringify(data, null, 2);
      case "csv":
        return this.convertToCSV(data);
      default:
        throw new Error(`Formato de exportación no soportado: ${format}`);
    }
  }

  /**
   * Convierte datos a formato CSV
   * @param {Object} data - Datos a convertir
   * @returns {string} - Datos en formato CSV
   */
  convertToCSV(data) {
    // Implementación básica para CSV
    const csv = [];
    csv.push("Métrica,Valor");
    csv.push(`Total Errores,${data.current.totalErrors}`);
    csv.push(`Errores Resueltos,${data.current.resolvedErrors}`);
    csv.push(`Errores Pendientes,${data.current.pendingErrors}`);
    csv.push(`Tiempo Promedio Resolución,${data.current.avgResolutionTime}`);

    return csv.join("\n");
  }
}
