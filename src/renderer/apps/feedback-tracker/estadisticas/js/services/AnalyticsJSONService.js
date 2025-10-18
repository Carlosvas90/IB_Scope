/**
 * AnalyticsJSONService.js
 * Servicio para leer JSONs pre-procesados de analytics y combinarlos con el día actual
 *
 * Reemplaza las consultas lentas a la base de datos por lectura de JSONs optimizados
 */

export class AnalyticsJSONService {
  constructor() {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutos de caché

    console.log("📊 AnalyticsJSONService inicializado");
  }

  /**
   * Obtiene la configuración de rutas desde el sistema
   */
  async getConfig() {
    try {
      // Usar el API de Electron para obtener la configuración
      if (window.api && window.api.getConfig) {
        const config = await window.api.getConfig();
        return config;
      }

      // Fallback: leer desde archivo si no hay API
      console.warn("⚠️ No se encontró window.api, intentando lectura directa");
      const response = await fetch("../../../../../config/config.json");
      return await response.json();
    } catch (error) {
      console.error("❌ Error obteniendo configuración:", error);
      throw new Error("No se pudo obtener la configuración de rutas");
    }
  }

  /**
   * Obtiene las rutas de analytics desde la configuración
   */
  async getAnalyticsPaths() {
    const config = await this.getConfig();
    return config.analytics_paths || [];
  }

  /**
   * Obtiene las rutas de datos (para archivo del día actual)
   */
  async getDataPaths() {
    const config = await this.getConfig();
    return config.data_paths || [];
  }

  /**
   * Mapea el número de días al nombre del archivo JSON
   */
  getPeriodFileName(days) {
    const periodMap = {
      0: null, // Hoy - solo usa archivo actual
      1: null, // Ayer - no implementado aún
      3: "summary_last_3_days.json",
      7: "summary_last_week.json",
      30: "summary_last_month.json",
      90: "summary_last_3_months.json",
      180: "summary_last_6_months.json",
    };

    return periodMap[days] || null;
  }

  /**
   * Lee un archivo JSON desde las rutas configuradas
   * Intenta cada ruta hasta encontrar el archivo
   */
  async readJSONFile(paths, filename) {
    for (const basePath of paths) {
      try {
        // Construir ruta completa
        const fullPath = `${basePath}\\${filename}`.replace(/\\/g, "\\");

        // Usar API de Electron (preferido)
        if (window.api && window.api.readJson) {
          const result = await window.api.readJson(fullPath);
          if (result && result.success) {
            console.log(`✅ JSON leído desde: ${fullPath}`);
            return result.data;
          }
        }

        // Fallback: fetch (solo funciona para rutas relativas en desarrollo)
        const response = await fetch(`${basePath}/${filename}`);
        if (response.ok) {
          console.log(`✅ JSON leído desde: ${basePath}/${filename}`);
          return await response.json();
        }
      } catch (error) {
        console.warn(`⚠️ No se pudo leer desde ${basePath}: ${error.message}`);
        continue;
      }
    }

    throw new Error(
      `No se pudo leer el archivo ${filename} desde ninguna ruta configurada`
    );
  }

  /**
   * Lee el archivo de analytics histórico (sin el día actual)
   */
  async readHistoricalJSON(days) {
    const filename = this.getPeriodFileName(days);

    if (!filename) {
      // Si es "Hoy" (0 días), no hay histórico
      return null;
    }

    // Verificar caché
    const cacheKey = `historical_${days}`;
    if (this.isCacheValid(cacheKey)) {
      console.log(`📦 Usando caché para: ${filename}`);
      return this.cache.get(cacheKey);
    }

    // Leer archivo
    const paths = await this.getAnalyticsPaths();
    const data = await this.readJSONFile(paths, filename);

    // Guardar en caché
    this.cache.set(cacheKey, data);
    this.cacheTimestamps.set(cacheKey, Date.now());

    return data;
  }

  /**
   * Lee el archivo del día actual (error_tracker_DDMMYYYY.json)
   */
  async readTodayJSON() {
    // Generar nombre del archivo del día actual
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    const filename = `error_tracker_${dd}${mm}${yyyy}.json`;

    // Verificar caché (TTL más corto para día actual)
    const cacheKey = "today";
    if (this.isCacheValid(cacheKey, 60000)) {
      // 1 minuto de caché para día actual
      console.log(`📦 Usando caché para archivo de hoy`);
      return this.cache.get(cacheKey);
    }

    // Leer archivo
    const paths = await this.getDataPaths();
    const data = await this.readJSONFile(paths, filename);

    // Guardar en caché
    this.cache.set(cacheKey, data);
    this.cacheTimestamps.set(cacheKey, Date.now());

    return data;
  }

  /**
   * Verifica si un elemento del caché es válido
   */
  isCacheValid(key, ttl = null) {
    if (!this.cache.has(key)) return false;

    const timestamp = this.cacheTimestamps.get(key);
    const age = Date.now() - timestamp;
    const maxAge = ttl || this.cacheTTL;

    return age < maxAge;
  }

  /**
   * Limpia el caché
   */
  clearCache() {
    this.cache.clear();
    this.cacheTimestamps.clear();
    console.log("🗑️ Caché limpiado");
  }

  /**
   * Normaliza formato de fecha (convierte YYYY/MM/DD a YYYY-MM-DD)
   */
  normalizeDate(date) {
    if (typeof date === "string") {
      return date.replace(/\//g, "-");
    }
    return date;
  }

  /**
   * Calcula KPIs del día actual desde los errores
   */
  calculateTodayKPIs(todayData) {
    if (!todayData || !todayData.errors) {
      return {
        total_incidents: 0,
        pending: 0,
        resolved: 0,
        daily_average: 0,
      };
    }

    let total = 0;
    let pending = 0;
    let resolved = 0;

    todayData.errors.forEach((error) => {
      const quantity = error.quantity || 1;
      total += quantity;

      if (error.feedback_status === "pending") {
        pending += quantity;
      } else if (error.feedback_status === "done") {
        resolved += quantity;
      }
    });

    return {
      total_incidents: total,
      pending: pending,
      resolved: resolved,
      daily_average: total, // Para un solo día, el promedio es el total
    };
  }

  /**
   * Calcula tendencias del día actual agrupadas por fecha
   */
  calculateTodayTrend(todayData) {
    if (!todayData || !todayData.errors || todayData.errors.length === 0) {
      return null;
    }

    let total = 0;
    let pending = 0;
    let resolved = 0;

    todayData.errors.forEach((error) => {
      const quantity = error.quantity || 1;
      total += quantity;

      if (error.feedback_status === "pending") {
        pending += quantity;
      } else {
        resolved += quantity;
      }
    });

    // Obtener la fecha del primer error (normalizada)
    const date = this.normalizeDate(todayData.errors[0].date);

    return {
      date: date,
      total: total,
      pending: pending,
      resolved: resolved,
    };
  }

  /**
   * Calcula distribución por hora del día actual
   */
  calculateTodayHourly(todayData) {
    if (!todayData || !todayData.errors) {
      return new Array(24).fill(0);
    }

    const hourlyData = new Array(24).fill(0);

    todayData.errors.forEach((error) => {
      if (error.time) {
        const hour = parseInt(error.time.split(":")[0]);
        if (hour >= 0 && hour <= 23) {
          hourlyData[hour] += error.quantity || 1;
        }
      }
    });

    return hourlyData;
  }

  /**
   * Combina datos históricos con el día actual
   */
  async combineData(historicalData, todayData) {
    // Si no hay datos históricos (periodo "Hoy"), usar solo datos actuales
    if (!historicalData) {
      return this.convertTodayToSummary(todayData);
    }

    // Si no hay datos de hoy, retornar solo históricos
    if (!todayData) {
      return historicalData;
    }

    // Calcular datos de hoy
    const todayKPIs = this.calculateTodayKPIs(todayData);
    const todayTrend = this.calculateTodayTrend(todayData);
    const todayHourly = this.calculateTodayHourly(todayData);

    // Combinar metadata
    const combinedMetadata = {
      ...historicalData.metadata,
      includes_today: true,
      total_days: historicalData.metadata.total_days + 1,
      total_records:
        historicalData.metadata.total_records + todayData.errors.length,
    };

    // Combinar KPIs
    const combinedKPIs = {
      total_incidents:
        historicalData.kpis.total_incidents + todayKPIs.total_incidents,
      pending: historicalData.kpis.pending + todayKPIs.pending,
      resolved: historicalData.kpis.resolved + todayKPIs.resolved,
      daily_average:
        (historicalData.kpis.total_incidents + todayKPIs.total_incidents) /
        combinedMetadata.total_days,
      resolution_rate: 0, // Recalcular si es necesario
    };

    // Recalcular tasa de resolución
    if (combinedKPIs.total_incidents > 0) {
      combinedKPIs.resolution_rate =
        (combinedKPIs.resolved / combinedKPIs.total_incidents) * 100;
    }

    // Combinar tendencias por día
    const combinedByDay = [...historicalData.trends.by_day];
    if (todayTrend) {
      combinedByDay.push(todayTrend);
    }

    // Combinar tendencias por hora
    const combinedByHour = historicalData.trends.by_hour.map((h, index) => ({
      hour: h.hour,
      count: h.count + todayHourly[index],
    }));

    // Recalcular distribution combinando histórico + hoy
    const todayDistribution = this.calculateStatusDistribution(
      todayData.errors
    );
    const combinedDistribution = this.combineDistributions(
      historicalData.distribution.by_status,
      todayDistribution
    );

    // Construir objeto combinado
    const combined = {
      metadata: combinedMetadata,
      kpis: combinedKPIs,
      trends: {
        by_day: combinedByDay,
        by_hour: combinedByHour,
      },
      distribution: {
        by_status: combinedDistribution,
      },
      // Combinar top violations de histórico + hoy
      top_violations: this.combineTopViolations(
        historicalData.top_violations || [],
        this.calculateTopViolations(todayData.errors, 20)
      ),
      // Combinar top motives de histórico + hoy
      top_motives: this.combineTopMotives(
        historicalData.top_motives || [],
        this.calculateTopMotives(todayData.errors, 20)
      ),
      // NOTA: Para ASINs y usuarios, usar solo datos históricos
      // ya que recalcular con solo el día actual no es representativo del periodo completo
      top_asins: historicalData.top_asins || [],
      top_offenders: historicalData.top_offenders || [],
      asin_offenders: historicalData.asin_offenders || [],
      insights: historicalData.insights,
    };

    return combined;
  }

  /**
   * Combina dos distribuciones por estado
   */
  combineDistributions(historicalDist, todayDist) {
    const combined = {};

    // Agregar datos históricos
    historicalDist.forEach((item) => {
      const status = item.status || item.name || "unknown";
      combined[status] = item.count || item.value || 0;
    });

    // Agregar datos de hoy
    todayDist.forEach((item) => {
      const status = item.status || item.name || "unknown";
      combined[status] =
        (combined[status] || 0) + (item.count || item.value || 0);
    });

    // Convertir a array con formato correcto
    const total = Object.values(combined).reduce((sum, val) => sum + val, 0);

    return Object.entries(combined).map(([status, count]) => ({
      status: status,
      count: count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }

  /**
   * Combina top violations de histórico + hoy
   */
  combineTopViolations(historicalViolations, todayViolations) {
    const combined = {};

    // Agregar violaciones históricas
    historicalViolations.forEach((item) => {
      const violation = item.violation || item.name || "Sin violación";
      combined[violation] = item.count || 0;
    });

    // Agregar violaciones de hoy
    todayViolations.forEach((item) => {
      const violation = item.violation || item.name || "Sin violación";
      combined[violation] = (combined[violation] || 0) + (item.count || 0);
    });

    // Calcular total
    const total = Object.values(combined).reduce((sum, val) => sum + val, 0);

    // Convertir a array, calcular porcentajes y ordenar
    return Object.entries(combined)
      .map(([violation, count]) => ({
        violation: violation,
        count: count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Combina top motives de histórico + hoy
   */
  combineTopMotives(historicalMotives, todayMotives) {
    const combined = {};

    // Agregar motivos históricos
    historicalMotives.forEach((item) => {
      const motive = item.motive || item.name || "Sin motivo";
      combined[motive] = item.count || 0;
    });

    // Agregar motivos de hoy
    todayMotives.forEach((item) => {
      const motive = item.motive || item.name || "Sin motivo";
      combined[motive] = (combined[motive] || 0) + (item.count || 0);
    });

    // Calcular total
    const total = Object.values(combined).reduce((sum, val) => sum + val, 0);

    // Convertir a array, calcular porcentajes y ordenar
    return Object.entries(combined)
      .map(([motive, count]) => ({
        motive: motive,
        count: count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Convierte datos del día actual a formato summary (cuando no hay histórico)
   */
  convertTodayToSummary(todayData) {
    if (!todayData || !todayData.errors) {
      return this.getEmptySummary();
    }

    const kpis = this.calculateTodayKPIs(todayData);
    const trend = this.calculateTodayTrend(todayData);
    const hourlyData = this.calculateTodayHourly(todayData);

    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];

    return {
      metadata: {
        period: "today",
        start_date: dateStr,
        end_date: dateStr,
        generated_at: new Date().toISOString(),
        total_days: 1,
        total_records: todayData.errors.length,
        includes_today: true,
      },
      kpis: {
        ...kpis,
        resolution_rate:
          kpis.total_incidents > 0
            ? (kpis.resolved / kpis.total_incidents) * 100
            : 0,
      },
      trends: {
        by_day: trend ? [trend] : [],
        by_hour: Array.from({ length: 24 }, (_, i) => ({
          hour: `${i.toString().padStart(2, "0")}:00`,
          count: hourlyData[i],
        })),
      },
      distribution: {
        by_status: this.calculateStatusDistribution(todayData.errors),
      },
      top_asins: this.calculateTopASINs(todayData.errors),
      top_violations: this.calculateTopViolations(todayData.errors),
      top_motives: this.calculateTopMotives(todayData.errors),
      top_offenders: this.calculateTopOffenders(todayData.errors),
      asin_offenders: this.calculateTopASINs(todayData.errors), // Reutilizar mismo cálculo
      insights: null, // No hay insights para solo hoy
    };
  }

  /**
   * Calcula Top ASINs desde array de errores
   */
  calculateTopASINs(errors, limit = 10) {
    const asinCounts = {};

    errors.forEach((error) => {
      const asin = error.asin || "Sin ASIN";
      const quantity = error.quantity || 1;

      if (!asinCounts[asin]) {
        asinCounts[asin] = {
          asin: asin,
          count: 0,
          violations: {},
          motives: {},
        };
      }

      asinCounts[asin].count += quantity;

      // Contar violaciones
      const violation =
        error.violation || error.feedback_violation || "Sin violación";
      asinCounts[asin].violations[violation] =
        (asinCounts[asin].violations[violation] || 0) + 1;

      // Contar motivos
      const motive = error.feedback_motive || "Sin motivo";
      asinCounts[asin].motives[motive] =
        (asinCounts[asin].motives[motive] || 0) + 1;
    });

    // Convertir a array y ordenar
    return Object.values(asinCounts)
      .map((item) => {
        // Encontrar violación más común
        const mostCommonViolation = Object.entries(item.violations).sort(
          (a, b) => b[1] - a[1]
        )[0];

        // Encontrar motivo más común
        const mostCommonMotive = Object.entries(item.motives).sort(
          (a, b) => b[1] - a[1]
        )[0];

        return {
          asin: item.asin,
          count: item.count,
          most_common_violation: mostCommonViolation
            ? mostCommonViolation[0]
            : "N/A",
          most_common_motive: mostCommonMotive ? mostCommonMotive[0] : "N/A",
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Calcula Top Violations desde array de errores
   */
  calculateTopViolations(errors, limit = 10) {
    const violationCounts = {};

    errors.forEach((error) => {
      const violation =
        error.violation || error.feedback_violation || "Sin violación";
      const quantity = error.quantity || 1;
      violationCounts[violation] = (violationCounts[violation] || 0) + quantity;
    });

    const total = Object.values(violationCounts).reduce(
      (sum, val) => sum + val,
      0
    );

    return Object.entries(violationCounts)
      .map(([violation, count]) => ({
        violation: violation,
        count: count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Calcula Top Motives desde array de errores
   */
  calculateTopMotives(errors, limit = 10) {
    const motiveCounts = {};

    errors.forEach((error) => {
      const motive = error.feedback_motive || "Sin motivo";
      const quantity = error.quantity || 1;
      motiveCounts[motive] = (motiveCounts[motive] || 0) + quantity;
    });

    const total = Object.values(motiveCounts).reduce(
      (sum, val) => sum + val,
      0
    );

    return Object.entries(motiveCounts)
      .map(([motive, count]) => ({
        motive: motive,
        count: count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Calcula Top Offenders (usuarios) desde array de errores
   */
  calculateTopOffenders(errors, limit = 10) {
    const userCounts = {};

    errors.forEach((error) => {
      const user = error.user_id || error.user_login || "Sin usuario";
      const quantity = error.quantity || 1;

      if (!userCounts[user]) {
        userCounts[user] = {
          user_id: user,
          count: 0,
          violations: {},
          motives: {},
        };
      }

      userCounts[user].count += quantity;

      // Contar violaciones
      const violation =
        error.violation || error.feedback_violation || "Sin violación";
      userCounts[user].violations[violation] =
        (userCounts[user].violations[violation] || 0) + 1;

      // Contar motivos
      const motive = error.feedback_motive || "Sin motivo";
      userCounts[user].motives[motive] =
        (userCounts[user].motives[motive] || 0) + 1;
    });

    // Convertir a array y ordenar
    return Object.values(userCounts)
      .map((item) => {
        // Encontrar violación más común
        const mostCommonViolation = Object.entries(item.violations).sort(
          (a, b) => b[1] - a[1]
        )[0];

        // Encontrar motivo más común
        const mostCommonMotive = Object.entries(item.motives).sort(
          (a, b) => b[1] - a[1]
        )[0];

        return {
          user_id: item.user_id,
          count: item.count,
          most_common_violation: mostCommonViolation
            ? mostCommonViolation[0]
            : "N/A",
          most_common_motive: mostCommonMotive ? mostCommonMotive[0] : "N/A",
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Calcula distribución por estado desde array de errores
   */
  calculateStatusDistribution(errors) {
    const statusCounts = {};

    errors.forEach((error) => {
      const status = error.feedback_status || "pending";
      const quantity = error.quantity || 1;
      statusCounts[status] = (statusCounts[status] || 0) + quantity;
    });

    const total = Object.values(statusCounts).reduce(
      (sum, val) => sum + val,
      0
    );

    return Object.entries(statusCounts).map(([status, count]) => ({
      status: status,
      count: count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }

  /**
   * Retorna un summary vacío para casos sin datos
   */
  getEmptySummary() {
    return {
      metadata: {
        period: "empty",
        start_date: null,
        end_date: null,
        generated_at: new Date().toISOString(),
        total_days: 0,
        total_records: 0,
      },
      kpis: {
        total_incidents: 0,
        pending: 0,
        resolved: 0,
        resolution_rate: 0,
        daily_average: 0,
      },
      trends: {
        by_day: [],
        by_hour: Array.from({ length: 24 }, (_, i) => ({
          hour: `${i.toString().padStart(2, "0")}:00`,
          count: 0,
        })),
      },
      distribution: {
        by_status: [],
      },
      top_asins: [],
      top_violations: [],
      top_motives: [],
      top_offenders: [],
      asin_offenders: [],
      insights: null,
    };
  }

  /**
   * Método principal: Obtiene datos para un periodo específico
   * @param {number} days - Número de días del periodo (0=hoy, 7=semana, etc.)
   * @returns {Promise<Object>} Datos combinados del periodo
   */
  async getAnalyticsData(days) {
    try {
      console.log(`📊 Obteniendo datos de analytics para ${days} días`);

      // Leer datos históricos (si aplica)
      const historicalData = await this.readHistoricalJSON(days);

      // Leer datos del día actual
      let todayData = null;
      try {
        todayData = await this.readTodayJSON();
      } catch (error) {
        console.warn(
          "⚠️ No se pudo leer archivo del día actual:",
          error.message
        );
        // Continuar con solo datos históricos
      }

      // Combinar datos
      const combined = await this.combineData(historicalData, todayData);

      console.log("✅ Datos de analytics obtenidos correctamente");
      return combined;
    } catch (error) {
      console.error("❌ Error obteniendo datos de analytics:", error);
      throw error;
    }
  }

  /**
   * Verifica si el servicio está disponible (si puede leer los archivos)
   */
  async isAvailable() {
    try {
      const paths = await this.getAnalyticsPaths();
      return paths && paths.length > 0;
    } catch (error) {
      return false;
    }
  }
}
