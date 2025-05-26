/**
 * AnalyticsProcessor.js
 * Procesador de análisis que convierte datos de errores en información para gráficos
 */

export class AnalyticsProcessor {
  constructor() {
    console.log("📈 AnalyticsProcessor inicializado");
  }

  /**
   * Procesa datos para KPIs principales
   */
  processKPIs(errors, dateRange = 30) {
    const filteredErrors = this.filterByDateRange(errors, dateRange);

    const kpis = {
      totalErrors: 0,
      pendingErrors: 0,
      resolvedErrors: 0,
      resolutionRate: 0,
      avgResolutionTime: 0,
      dailyAverage: 0,
      totalLines: filteredErrors.length,
    };

    let resolutionTimes = [];
    const daysInRange = dateRange === 0 ? 1 : dateRange;

    filteredErrors.forEach((error) => {
      const quantity = error.quantity || 1;
      kpis.totalErrors += quantity;

      if (error.feedback_status === "done") {
        kpis.resolvedErrors += quantity;

        // Calcular tiempo de resolución si hay feedback_date
        if (error.feedback_date && error.date) {
          const errorDate = new Date(error.date.replace(/\//g, "-"));
          const resolvedDate = new Date(
            error.feedback_date.replace(/\//g, "-")
          );
          const diffDays = Math.ceil(
            (resolvedDate - errorDate) / (1000 * 60 * 60 * 24)
          );
          if (diffDays >= 0) {
            resolutionTimes.push(diffDays);
          }
        }
      } else {
        kpis.pendingErrors += quantity;
      }
    });

    // Calcular métricas derivadas
    kpis.resolutionRate =
      kpis.totalErrors > 0 ? (kpis.resolvedErrors / kpis.totalErrors) * 100 : 0;
    kpis.avgResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : 0;
    kpis.dailyAverage = kpis.totalErrors / daysInRange;

    return kpis;
  }

  /**
   * Procesa datos para gráfico de tendencias temporales
   */
  processTrendData(errors, dateRange = 30) {
    const filteredErrors = this.filterByDateRange(errors, dateRange);
    const dateGroups = {};

    // Agrupar por fecha
    filteredErrors.forEach((error) => {
      const date = error.date;
      if (!dateGroups[date]) {
        dateGroups[date] = { total: 0, pending: 0, resolved: 0 };
      }

      const quantity = error.quantity || 1;
      dateGroups[date].total += quantity;

      if (error.feedback_status === "done") {
        dateGroups[date].resolved += quantity;
      } else {
        dateGroups[date].pending += quantity;
      }
    });

    // Convertir a arrays para ECharts
    const dates = Object.keys(dateGroups).sort();
    const totalData = dates.map((date) => dateGroups[date].total);
    const pendingData = dates.map((date) => dateGroups[date].pending);
    const resolvedData = dates.map((date) => dateGroups[date].resolved);

    return {
      dates,
      series: [
        { name: "Total", data: totalData },
        { name: "Pendientes", data: pendingData },
        { name: "Resueltos", data: resolvedData },
      ],
    };
  }

  /**
   * Procesa datos para distribución por estado
   */
  processStatusDistribution(errors, dateRange = 30) {
    const filteredErrors = this.filterByDateRange(errors, dateRange);
    let pending = 0,
      resolved = 0;

    filteredErrors.forEach((error) => {
      const quantity = error.quantity || 1;
      if (error.feedback_status === "done") {
        resolved += quantity;
      } else {
        pending += quantity;
      }
    });

    return [
      { name: "Pendientes", value: pending },
      { name: "Resueltos", value: resolved },
    ];
  }

  /**
   * Procesa datos para errores por hora del día
   */
  processHourlyData(errors, dateRange = 30) {
    const filteredErrors = this.filterByDateRange(errors, dateRange);
    const hourlyData = new Array(24).fill(0);

    filteredErrors.forEach((error) => {
      if (error.time) {
        const hour = parseInt(error.time.split(":")[0]);
        if (hour >= 0 && hour <= 23) {
          hourlyData[hour] += error.quantity || 1;
        }
      }
    });

    return {
      hours: Array.from(
        { length: 24 },
        (_, i) => `${i.toString().padStart(2, "0")}:00`
      ),
      data: hourlyData,
    };
  }

  /**
   * Procesa top usuarios con más errores (actualizado para nueva estructura)
   */
  processTopUsers(errors, dateRange = 30, limit = 10) {
    const filteredErrors = this.filterByDateRange(errors, dateRange);
    const userStats = {};

    filteredErrors.forEach((error) => {
      const userId = error.user_id;
      if (!userStats[userId]) {
        userStats[userId] = {
          total: 0,
          violations: {},
          reasons: {},
        };
      }

      const quantity = error.quantity || 1;
      userStats[userId].total += quantity;

      // Contar violaciones (errores)
      const violation = error.violation || "Sin especificar";
      userStats[userId].violations[violation] =
        (userStats[userId].violations[violation] || 0) + quantity;

      // Contar motivos (de feedback_comment antes del ":")
      if (error.feedback_comment) {
        const reason = error.feedback_comment.split(":")[0].trim();
        if (reason) {
          userStats[userId].reasons[reason] =
            (userStats[userId].reasons[reason] || 0) + quantity;
        }
      }
    });

    // Convertir a array y calcular más comunes
    const usersArray = Object.entries(userStats).map(([userId, stats]) => {
      // Encontrar violación más común
      const mostCommonViolation = Object.entries(stats.violations).sort(
        (a, b) => b[1] - a[1]
      )[0];

      // Encontrar motivo más común
      const mostCommonReason = Object.entries(stats.reasons).sort(
        (a, b) => b[1] - a[1]
      )[0];

      return {
        userId,
        total: stats.total,
        mostCommonViolation: mostCommonViolation
          ? mostCommonViolation[0]
          : "N/A",
        mostCommonReason: mostCommonReason ? mostCommonReason[0] : "N/A",
      };
    });

    return usersArray.sort((a, b) => b.total - a.total).slice(0, limit);
  }

  /**
   * Procesa top ASINs con más errores (actualizado para nueva estructura)
   */
  processTopASINs(errors, dateRange = 30, limit = 10) {
    const filteredErrors = this.filterByDateRange(errors, dateRange);
    const asinStats = {};

    filteredErrors.forEach((error) => {
      const asin = error.asin;
      if (!asinStats[asin]) {
        asinStats[asin] = {
          total: 0,
          violations: {},
          reasons: {},
        };
      }

      const quantity = error.quantity || 1;
      asinStats[asin].total += quantity;

      // Contar violaciones (errores)
      const violation = error.violation || "Sin especificar";
      asinStats[asin].violations[violation] =
        (asinStats[asin].violations[violation] || 0) + quantity;

      // Contar motivos (de feedback_comment antes del ":")
      if (error.feedback_comment) {
        const reason = error.feedback_comment.split(":")[0].trim();
        if (reason) {
          asinStats[asin].reasons[reason] =
            (asinStats[asin].reasons[reason] || 0) + quantity;
        }
      }
    });

    // Convertir a array y calcular más comunes
    const asinsArray = Object.entries(asinStats).map(([asin, stats]) => {
      // Encontrar violación más común
      const mostCommonViolation = Object.entries(stats.violations).sort(
        (a, b) => b[1] - a[1]
      )[0];

      // Encontrar motivo más común
      const mostCommonReason = Object.entries(stats.reasons).sort(
        (a, b) => b[1] - a[1]
      )[0];

      // Calcular frecuencia
      const uniqueViolations = Object.keys(stats.violations).length;
      const frequency =
        uniqueViolations > 0 ? stats.total / uniqueViolations : 0;

      return {
        asin,
        total: stats.total,
        mostCommonViolation: mostCommonViolation
          ? mostCommonViolation[0]
          : "N/A",
        mostCommonReason: mostCommonReason ? mostCommonReason[0] : "N/A",
        frequency: frequency,
      };
    });

    return asinsArray.sort((a, b) => b.total - a.total).slice(0, limit);
  }

  /**
   * Procesa distribución de violaciones (errores)
   */
  processErrorDistribution(errors, dateRange = 30) {
    const filteredErrors = this.filterByDateRange(errors, dateRange);
    const violationStats = {};

    filteredErrors.forEach((error) => {
      const violation = error.violation || "Sin especificar";
      violationStats[violation] =
        (violationStats[violation] || 0) + (error.quantity || 1);
    });

    return Object.entries(violationStats)
      .map(([violation, count]) => ({ name: violation, value: count }))
      .sort((a, b) => b.value - a.value);
  }

  /**
   * Procesa distribución de motivos (de feedback_comment)
   */
  processReasonDistribution(errors, dateRange = 30) {
    const filteredErrors = this.filterByDateRange(errors, dateRange);
    const reasonStats = {};

    filteredErrors.forEach((error) => {
      if (error.feedback_comment) {
        // Extraer la parte antes de ":" que es el motivo
        const reason = error.feedback_comment.split(":")[0].trim();
        if (reason) {
          reasonStats[reason] =
            (reasonStats[reason] || 0) + (error.quantity || 1);
        }
      }
    });

    return Object.entries(reasonStats)
      .map(([reason, count]) => ({ name: reason, value: count }))
      .sort((a, b) => b.value - a.value);
  }

  /**
   * Procesa análisis de comentarios de feedback
   */
  processFeedbackAnalysis(errors, dateRange = 30) {
    const filteredErrors = this.filterByDateRange(errors, dateRange);
    const feedbackCategories = {};

    filteredErrors.forEach((error) => {
      if (error.feedback_comment && error.feedback_status === "done") {
        // Extraer la parte antes de ":" que es la categoría estándar
        const category = error.feedback_comment.split(":")[0].trim();
        if (category) {
          feedbackCategories[category] =
            (feedbackCategories[category] || 0) + (error.quantity || 1);
        }
      }
    });

    return Object.entries(feedbackCategories)
      .map(([category, count]) => ({ name: category, value: count }))
      .sort((a, b) => b.value - a.value);
  }

  /**
   * Procesa análisis de contenedores
   */
  processContainerAnalysis(errors, dateRange = 30) {
    const filteredErrors = this.filterByDateRange(errors, dateRange);
    const containerStats = {
      oldContainers: {},
      newContainers: {},
      transitions: {},
    };

    filteredErrors.forEach((error) => {
      const quantity = error.quantity || 1;

      // Estadísticas de contenedores antiguos
      if (error.old_container) {
        containerStats.oldContainers[error.old_container] =
          (containerStats.oldContainers[error.old_container] || 0) + quantity;
      }

      // Estadísticas de contenedores nuevos
      if (error.new_container) {
        containerStats.newContainers[error.new_container] =
          (containerStats.newContainers[error.new_container] || 0) + quantity;
      }

      // Transiciones más comunes
      if (error.old_container && error.new_container) {
        const transition = `${error.old_container} → ${error.new_container}`;
        containerStats.transitions[transition] =
          (containerStats.transitions[transition] || 0) + quantity;
      }
    });

    return containerStats;
  }

  /**
   * Filtra errores por rango de fechas
   */
  filterByDateRange(errors, days) {
    if (days === 0) {
      // Solo hoy
      const today = new Date().toISOString().split("T")[0].replace(/-/g, "/");
      return errors.filter((error) => error.date === today);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return errors.filter((error) => {
      const errorDate = new Date(error.date.replace(/\//g, "-"));
      return errorDate >= cutoffDate;
    });
  }

  /**
   * Genera insights automáticos basados en los datos
   */
  generateInsights(errors, dateRange = 30) {
    const filteredErrors = this.filterByDateRange(errors, dateRange);
    const kpis = this.processKPIs(errors, dateRange);
    const topUsers = this.processTopUsers(errors, dateRange, 3);
    const topASINs = this.processTopASINs(errors, dateRange, 3);
    const violations = this.processErrorDistribution(errors, dateRange);

    const insights = [];

    // Insight sobre tasa de resolución
    if (kpis.resolutionRate > 80) {
      insights.push(
        `✅ Excelente tasa de resolución del ${kpis.resolutionRate.toFixed(1)}%`
      );
    } else if (kpis.resolutionRate > 60) {
      insights.push(
        `⚠️ Tasa de resolución moderada del ${kpis.resolutionRate.toFixed(1)}%`
      );
    } else {
      insights.push(
        `🔴 Tasa de resolución baja del ${kpis.resolutionRate.toFixed(
          1
        )}% - Requiere atención`
      );
    }

    // Insight sobre usuario con más errores
    if (topUsers.length > 0) {
      insights.push(
        `👤 Usuario con más errores: ${topUsers[0].userId} (${topUsers[0].total} errores)`
      );
    }

    // Insight sobre ASIN problemático
    if (topASINs.length > 0) {
      insights.push(
        `📦 ASIN más problemático: ${topASINs[0].asin} (${topASINs[0].total} errores)`
      );
    }

    // Insight sobre violación más común
    if (violations.length > 0) {
      insights.push(
        `⚡ Error más común: ${violations[0].name} (${violations[0].value} casos)`
      );
    }

    // Insight sobre tiempo de resolución
    if (kpis.avgResolutionTime > 0) {
      if (kpis.avgResolutionTime <= 1) {
        insights.push(
          `🚀 Tiempo de resolución excelente: ${kpis.avgResolutionTime.toFixed(
            1
          )} días promedio`
        );
      } else if (kpis.avgResolutionTime <= 3) {
        insights.push(
          `⏱️ Tiempo de resolución bueno: ${kpis.avgResolutionTime.toFixed(
            1
          )} días promedio`
        );
      } else {
        insights.push(
          `⏰ Tiempo de resolución lento: ${kpis.avgResolutionTime.toFixed(
            1
          )} días promedio`
        );
      }
    }

    return insights;
  }
}
