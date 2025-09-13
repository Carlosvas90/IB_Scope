/**
 * StatusDistributionChart.js
 * Gráfico de distribución de estados de errores
 * Muestra la proporción de errores por estado (pendiente, resuelto, crítico, etc.)
 */

import { BaseChart } from "../BaseChart.js";

export class StatusDistributionChart extends BaseChart {
  constructor(container, options = {}) {
    super(container, "status-distribution-chart", options);
  }

  /**
   * Configuración específica del gráfico de distribución
   */
  getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      title: "Distribución por Estado",
      type: "doughnut", // pie, doughnut
      showPercentages: true,
      showValues: true,
      showLabels: true,
      innerRadius: "40%",
      outerRadius: "70%",
      labelPosition: "outside", // inside, outside
      colors: {
        pending: "#ff9800",
        resolved: "#4caf50",
        critical: "#f44336",
        in_progress: "#2196f3",
        cancelled: "#9e9e9e",
        reopened: "#ff5722",
      },
      statusLabels: {
        pending: "Pendientes",
        resolved: "Resueltos",
        critical: "Críticos",
        in_progress: "En Progreso",
        cancelled: "Cancelados",
        reopened: "Reabiertos",
      },
    };
  }

  /**
   * Obtiene los datos de distribución desde la API
   */
  async fetchData() {
    try {
      // NUEVO: Si hay datos reales disponibles, usarlos
      if (this.config.realData) {
        console.log("📊 Usando datos reales para StatusDistributionChart");
        return this.processRealData(this.config.realData);
      }

      // Fallback: Simular llamada a API
      const data = await this.simulateAPICall();
      return data;
    } catch (error) {
      console.error("Error obteniendo datos de distribución:", error);
      throw error;
    }
  }

  /**
   * NUEVO: Procesa datos reales del sistema de estadísticas
   */
  processRealData(realData) {
    console.log(
      "🔄 Procesando datos reales para StatusDistributionChart:",
      realData
    );

    // Los datos reales vienen del AnalyticsProcessor en formato:
    // [{ name: "Pendientes", value: 123 }, { name: "Resueltos", value: 456 }]
    if (
      Array.isArray(realData) &&
      realData.length > 0 &&
      realData[0].name &&
      realData[0].value !== undefined
    ) {
      console.log("✅ Datos en formato AnalyticsProcessor detectados");

      const labels = realData.map((item) => item.name);
      const values = realData.map((item) => item.value);
      const colors = labels.map((label) => this.getColorForStatus(label));

      return {
        labels: labels,
        datasets: [
          {
            label: "Distribución de Estados",
            data: values,
            backgroundColor: colors.map((color) => color + "CC"),
            borderColor: colors,
            borderWidth: 2,
          },
        ],
      };
    }

    // Si ya están en formato Chart.js
    if (realData.labels && realData.datasets) {
      console.log("✅ Datos en formato Chart.js detectados");
      return {
        labels: realData.labels,
        datasets: [
          {
            label: "Distribución de Estados",
            data: realData.datasets[0].data,
            backgroundColor: this.generateColorsForLabels(realData.labels),
            borderColor: this.generateColorsForLabels(realData.labels).map(
              (color) => color.replace("CC", "FF")
            ),
            borderWidth: 2,
          },
        ],
      };
    }

    // Si es un objeto con conteos directos
    if (typeof realData === "object" && !Array.isArray(realData)) {
      console.log("⚠️ Datos en formato objeto, convirtiendo...");
      return this.convertObjectToChartData(realData);
    }

    // Si no se pueden procesar, usar datos simulados
    console.warn("⚠️ No se pudieron procesar datos reales, usando simulados");
    console.log("🔍 Estructura de datos recibida:", realData);
    return this.simulateAPICall();
  }

  /**
   * NUEVO: Obtiene color para un estado específico
   */
  getColorForStatus(statusName) {
    const statusColors = {
      Pendientes: "#ffa726", // Ámbar en lugar de rojo
      Resueltos: "#51cf66", // Verde se mantiene igual
      "En Progreso": "#ffd43b",
      Críticos: "#ff8787",
      Cancelados: "#868e96",
      Reabiertos: "#ff922b",
    };

    // Buscar por coincidencia parcial (case insensitive)
    const normalizedStatus = statusName.toLowerCase();
    for (const [key, color] of Object.entries(statusColors)) {
      if (
        key.toLowerCase().includes(normalizedStatus) ||
        normalizedStatus.includes(key.toLowerCase())
      ) {
        return color;
      }
    }

    // Color por defecto
    return "#868e96";
  }

  /**
   * NUEVO: Convierte array de datos a formato de gráfico
   */
  convertArrayToChartData(dataArray) {
    // Contar estados
    const statusCounts = {};

    dataArray.forEach((item) => {
      let status = "pending"; // default

      // Determinar estado basado en los datos disponibles
      if (item.status) {
        status = item.status;
      } else if (item.resolved) {
        status = "resolved";
      } else if (item.critical) {
        status = "critical";
      } else if (item.in_progress) {
        status = "in_progress";
      }

      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Convertir a formato de gráfico
    const labels = Object.keys(statusCounts).map(
      (status) => this.config.statusLabels[status] || status
    );
    const values = Object.values(statusCounts);
    const colors = Object.keys(statusCounts).map(
      (status) => (this.config.colors[status] || "#999999") + "CC"
    );

    return {
      labels,
      datasets: [
        {
          label: "Distribución de Estados",
          data: values,
          backgroundColor: colors,
          borderColor: colors.map((color) => color.replace("CC", "FF")),
          borderWidth: 2,
        },
      ],
    };
  }

  /**
   * NUEVO: Convierte objeto con conteos a formato de gráfico
   */
  convertObjectToChartData(dataObject) {
    const labels = [];
    const values = [];
    const colors = [];

    Object.entries(dataObject).forEach(([key, value]) => {
      if (typeof value === "number" && value > 0) {
        labels.push(this.config.statusLabels[key] || key);
        values.push(value);
        colors.push((this.config.colors[key] || "#999999") + "CC");
      }
    });

    return {
      labels,
      datasets: [
        {
          label: "Distribución de Estados",
          data: values,
          backgroundColor: colors,
          borderColor: colors.map((color) => color.replace("CC", "FF")),
          borderWidth: 2,
        },
      ],
    };
  }

  /**
   * NUEVO: Genera colores para las etiquetas
   */
  generateColorsForLabels(labels) {
    return labels.map((label) => {
      // Mapear etiquetas a estados conocidos
      const statusKey = Object.keys(this.config.statusLabels).find(
        (key) => this.config.statusLabels[key] === label
      );

      if (statusKey && this.config.colors[statusKey]) {
        return this.config.colors[statusKey] + "CC";
      }

      // Color por defecto si no se encuentra
      return "#999999CC";
    });
  }

  /**
   * Simula datos de la API (reemplazar con llamada real)
   */
  async simulateAPICall() {
    // Simular delay de red
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Generar datos simulados realistas
    const statusData = this.generateStatusData();

    return {
      labels: statusData.labels,
      datasets: [
        {
          label: "Distribución de Estados",
          data: statusData.values,
          backgroundColor: statusData.colors,
          borderColor: statusData.colors.map((color) =>
            color.replace("0.8", "1")
          ),
          borderWidth: 2,
        },
      ],
    };
  }

  /**
   * Genera datos simulados de distribución de estados
   */
  generateStatusData() {
    const statuses = [
      "pending",
      "resolved",
      "critical",
      "in_progress",
      "cancelled",
      "reopened",
    ];
    const labels = [];
    const values = [];
    const colors = [];

    // Generar distribución realista
    const distributions = {
      pending: 35 + Math.random() * 20, // 35-55%
      resolved: 25 + Math.random() * 15, // 25-40%
      critical: 5 + Math.random() * 10, // 5-15%
      in_progress: 15 + Math.random() * 10, // 15-25%
      cancelled: 2 + Math.random() * 5, // 2-7%
      reopened: 3 + Math.random() * 5, // 3-8%
    };

    // Normalizar para que sume 100%
    const total = Object.values(distributions).reduce(
      (sum, val) => sum + val,
      0
    );

    statuses.forEach((status) => {
      const normalizedValue = Math.round((distributions[status] / total) * 100);
      if (normalizedValue > 0) {
        labels.push(this.config.statusLabels[status]);
        values.push(normalizedValue);
        colors.push(this.config.colors[status] + "CC"); // Agregar transparencia
      }
    });

    return { labels, values, colors };
  }

  /**
   * Procesa los datos antes de renderizar
   */
  processData(rawData) {
    // Filtrar valores cero si es necesario
    const filteredData = {
      labels: [],
      datasets: [
        {
          ...rawData.datasets[0],
          data: [],
          backgroundColor: [],
          borderColor: [],
        },
      ],
    };

    rawData.labels.forEach((label, index) => {
      const value = rawData.datasets[0].data[index];
      if (value > 0) {
        filteredData.labels.push(label);
        filteredData.datasets[0].data.push(value);
        filteredData.datasets[0].backgroundColor.push(
          rawData.datasets[0].backgroundColor[index]
        );
        filteredData.datasets[0].borderColor.push(
          rawData.datasets[0].borderColor[index]
        );
      }
    });

    return filteredData;
  }

  /**
   * Obtiene las opciones específicas de ECharts para el gráfico de distribución
   */
  getChartOptions() {
    const data = this.data;

    // Preparar datos para ECharts
    const seriesData = data.labels.map((label, index) => ({
      name: label,
      value: data.datasets[0].data[index],
      itemStyle: {
        color: data.datasets[0].backgroundColor[index],
        borderColor: data.datasets[0].borderColor[index],
        borderWidth: 2,
      },
    }));

    return {
      title: {
        text: this.config.title,
        left: "center",
        top: "5%",
        textStyle: {
          color: "var(--stats-text-primary)",
          fontSize: 16,
          fontWeight: "bold",
        },
      },
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const percentage = params.percent;
          const value = params.value;
          return `${params.marker} <strong>${params.name}</strong><br/>
                  Cantidad: ${value}<br/>
                  Porcentaje: ${percentage}%`;
        },
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        textStyle: {
          color: "#ffffff",
        },
      },
      legend: {
        show: this.config.showLegend,
        orient: "horizontal",
        bottom: "5%",
        textStyle: {
          color: "var(--stats-text-secondary)",
          fontSize: 12,
        },
        formatter: (name) => {
          if (this.config.showValues) {
            const index = data.labels.indexOf(name);
            const value = data.datasets[0].data[index];
            return `${name} (${value})`;
          }
          return name;
        },
      },
      series: [
        {
          name: "Distribución",
          type: "pie",
          radius:
            this.config.type === "doughnut"
              ? [this.config.innerRadius, this.config.outerRadius]
              : this.config.outerRadius,
          center: ["50%", "50%"],
          data: seriesData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
              borderWidth: 3,
            },
            scaleSize: 5,
          },
          label: {
            show: this.config.showLabels,
            position: this.config.labelPosition,
            formatter: (params) => {
              if (this.config.showPercentages && this.config.showValues) {
                return `${params.name}\n${params.value} (${params.percent}%)`;
              } else if (this.config.showPercentages) {
                return `${params.name}\n${params.percent}%`;
              } else if (this.config.showValues) {
                return `${params.name}\n${params.value}`;
              }
              return params.name;
            },
            color: "var(--stats-text-secondary)",
            fontSize: 11,
            fontWeight: "normal",
          },
          labelLine: {
            show: this.config.labelPosition === "outside",
            length: 15,
            length2: 10,
            lineStyle: {
              color: "var(--stats-border-color)",
            },
          },
          animationType: "scale",
          animationEasing: "elasticOut",
          animationDelay: (idx) => Math.random() * 200,
        },
      ],
    };
  }

  /**
   * Cambia el tipo de gráfico (pie/doughnut)
   */
  setChartType(type) {
    if (["pie", "doughnut"].includes(type)) {
      this.config.type = type;
      this.refresh();
    }
  }

  /**
   * Alterna mostrar/ocultar porcentajes
   */
  togglePercentages() {
    this.config.showPercentages = !this.config.showPercentages;
    this.refresh();
  }

  /**
   * Alterna mostrar/ocultar valores
   */
  toggleValues() {
    this.config.showValues = !this.config.showValues;
    this.refresh();
  }

  /**
   * Alterna mostrar/ocultar etiquetas
   */
  toggleLabels() {
    this.config.showLabels = !this.config.showLabels;
    this.refresh();
  }

  /**
   * Cambia la posición de las etiquetas
   */
  setLabelPosition(position) {
    if (["inside", "outside"].includes(position)) {
      this.config.labelPosition = position;
      this.refresh();
    }
  }

  /**
   * Actualiza los colores de los estados
   */
  updateColors(newColors) {
    this.config.colors = { ...this.config.colors, ...newColors };
    this.refresh();
  }

  /**
   * Obtiene estadísticas del gráfico
   */
  getStats() {
    if (!this.data) return null;

    const data = this.data.datasets[0].data;
    const labels = this.data.labels;
    const total = data.reduce((sum, val) => sum + val, 0);

    const stats = {
      total,
      categories: labels.length,
      distribution: {},
      largest: { name: "", value: 0, percentage: 0 },
      smallest: { name: "", value: Infinity, percentage: 100 },
    };

    // Calcular distribución y encontrar mayor/menor
    labels.forEach((label, index) => {
      const value = data[index];
      const percentage = Math.round((value / total) * 100 * 100) / 100;

      stats.distribution[label] = {
        value,
        percentage,
      };

      if (value > stats.largest.value) {
        stats.largest = { name: label, value, percentage };
      }

      if (value < stats.smallest.value) {
        stats.smallest = { name: label, value, percentage };
      }
    });

    return stats;
  }

  /**
   * Obtiene el estado dominante
   */
  getDominantStatus() {
    const stats = this.getStats();
    return stats ? stats.largest : null;
  }

  /**
   * Obtiene estados por debajo de un umbral
   */
  getStatusesBelowThreshold(threshold = 5) {
    const stats = this.getStats();
    if (!stats) return [];

    return Object.entries(stats.distribution)
      .filter(([_, data]) => data.percentage < threshold)
      .map(([name, data]) => ({ name, ...data }));
  }

  /**
   * Exporta los datos del gráfico
   */
  exportData(format = "json") {
    const stats = this.getStats();
    const exportData = {
      chartType: "StatusDistributionChart",
      config: this.config,
      data: this.data,
      stats: stats,
      dominantStatus: this.getDominantStatus(),
      lowPerformanceStatuses: this.getStatusesBelowThreshold(),
      exportedAt: new Date().toISOString(),
    };

    if (format === "json") {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `status-distribution-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }

    return exportData;
  }

  /**
   * Genera reporte de insights automáticos
   */
  generateInsights() {
    const stats = this.getStats();
    if (!stats) return [];

    const insights = [];
    const dominant = stats.largest;
    const minority = stats.smallest;

    // Insight sobre estado dominante
    if (dominant.percentage > 50) {
      insights.push({
        type: "warning",
        title: "Estado Dominante",
        message: `${dominant.name} representa el ${dominant.percentage}% del total. Considera revisar la distribución.`,
        priority: "high",
      });
    }

    // Insight sobre estados minoritarios
    const lowStatuses = this.getStatusesBelowThreshold(5);
    if (lowStatuses.length > 0) {
      insights.push({
        type: "info",
        title: "Estados Minoritarios",
        message: `${lowStatuses.length} estado(s) representan menos del 5% cada uno.`,
        priority: "low",
      });
    }

    // Insight sobre balance
    const pendingPercentage = stats.distribution["Pendientes"]?.percentage || 0;
    const resolvedPercentage = stats.distribution["Resueltos"]?.percentage || 0;

    if (pendingPercentage > resolvedPercentage * 2) {
      insights.push({
        type: "alert",
        title: "Acumulación de Pendientes",
        message: `Los errores pendientes (${pendingPercentage}%) superan significativamente a los resueltos (${resolvedPercentage}%).`,
        priority: "high",
      });
    }

    return insights;
  }
}
