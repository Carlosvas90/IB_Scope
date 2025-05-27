/**
 * TrendChart.js
 * Gráfico de tendencias temporales para errores
 * Muestra la evolución de errores a lo largo del tiempo
 */

import { BaseChart } from "../BaseChart.js";

export class TrendChart extends BaseChart {
  constructor(container, options = {}) {
    super(container, "trend-chart", options);
  }

  /**
   * Configuración específica del gráfico de tendencias
   */
  getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      title: "Tendencias de Errores",
      type: "line",
      period: "30d", // 7d, 30d, 90d, 365d, custom
      granularity: "day", // hour, day, week, month
      showArea: true,
      showPoints: true,
      smoothCurve: true,
      multiSeries: true,
      showTrendLine: false,
      colors: {
        total: "#4381b3",
        pending: "#ff9800",
        resolved: "#4caf50",
        critical: "#f44336",
      },
    };
  }

  /**
   * Obtiene los datos de tendencias desde la API
   */
  async fetchData() {
    try {
      // NUEVO: Si hay datos reales disponibles, usarlos
      if (this.config.realData) {
        console.log("📊 Usando datos reales para TrendChart");
        return this.processRealData(this.config.realData);
      }

      // Fallback: Simular llamada a API
      const data = await this.simulateAPICall();
      return data;
    } catch (error) {
      console.error("Error obteniendo datos de tendencias:", error);
      throw error;
    }
  }

  /**
   * NUEVO: Procesa datos reales del sistema de estadísticas
   */
  processRealData(realData) {
    console.log("🔄 Procesando datos reales para TrendChart:", realData);

    // Los datos reales vienen del AnalyticsProcessor en formato:
    // { dates: [...], series: [{ name: "Total", data: [...] }, ...] }
    if (realData.dates && realData.series) {
      console.log("✅ Datos en formato AnalyticsProcessor detectados");

      return {
        labels: realData.dates,
        datasets: realData.series.map((serie, index) => ({
          label: serie.name,
          data: serie.data,
          borderColor: this.getColorForDataset(serie.name, index),
          backgroundColor: this.getColorForDataset(serie.name, index) + "20",
          fill: this.config.showArea,
          tension: this.config.smoothCurve ? 0.4 : 0,
        })),
      };
    }

    // Si ya están en formato Chart.js
    if (realData.labels && realData.datasets) {
      console.log("✅ Datos en formato Chart.js detectados");
      return {
        labels: realData.labels,
        datasets: realData.datasets.map((dataset, index) => ({
          label: dataset.label,
          data: dataset.data,
          borderColor: this.getColorForDataset(dataset.label, index),
          backgroundColor: this.getColorForDataset(dataset.label, index) + "20",
          fill: this.config.showArea,
          tension: this.config.smoothCurve ? 0.4 : 0,
        })),
      };
    }

    // Si los datos están en otro formato, convertirlos
    if (Array.isArray(realData)) {
      console.log("⚠️ Datos en formato array, convirtiendo...");
      return this.convertArrayToChartData(realData);
    }

    // Si no se pueden procesar, usar datos simulados
    console.warn("⚠️ No se pudieron procesar datos reales, usando simulados");
    console.log("🔍 Estructura de datos recibida:", Object.keys(realData));
    return this.simulateAPICall();
  }

  /**
   * NUEVO: Obtiene color para un dataset específico
   */
  getColorForDataset(datasetName, index) {
    const datasetColors = {
      Total: "#339af0",
      Pendientes: "#ff6b6b",
      Resueltos: "#51cf66",
      "En Progreso": "#ffd43b",
    };

    // Buscar por coincidencia parcial (case insensitive)
    const normalizedName = datasetName.toLowerCase();
    for (const [key, color] of Object.entries(datasetColors)) {
      if (
        key.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(key.toLowerCase())
      ) {
        return color;
      }
    }

    // Colores por defecto basados en índice
    const defaultColors = [
      "#339af0",
      "#ff6b6b",
      "#51cf66",
      "#ffd43b",
      "#ff922b",
      "#868e96",
    ];
    return defaultColors[index % defaultColors.length];
  }

  /**
   * NUEVO: Convierte array de datos a formato de gráfico
   */
  convertArrayToChartData(dataArray) {
    // Agrupar datos por fecha
    const groupedData = {};

    dataArray.forEach((item) => {
      const date = new Date(item.date || item.timestamp || Date.now());
      const dateKey = this.formatDateKey(date);

      if (!groupedData[dateKey]) {
        groupedData[dateKey] = {
          total: 0,
          pending: 0,
          resolved: 0,
        };
      }

      groupedData[dateKey].total++;

      // Determinar estado basado en los datos
      if (item.status === "resolved" || item.resolved) {
        groupedData[dateKey].resolved++;
      } else {
        groupedData[dateKey].pending++;
      }
    });

    // Convertir a arrays para el gráfico
    const sortedDates = Object.keys(groupedData).sort();
    const labels = sortedDates.map((date) => this.formatLabelFromKey(date));

    return {
      labels,
      datasets: [
        {
          label: "Total de Errores",
          data: sortedDates.map((date) => groupedData[date].total),
          borderColor: this.config.colors.total,
          backgroundColor: this.config.colors.total + "20",
          fill: this.config.showArea,
        },
        {
          label: "Errores Pendientes",
          data: sortedDates.map((date) => groupedData[date].pending),
          borderColor: this.config.colors.pending,
          backgroundColor: this.config.colors.pending + "20",
          fill: this.config.showArea,
        },
        {
          label: "Errores Resueltos",
          data: sortedDates.map((date) => groupedData[date].resolved),
          borderColor: this.config.colors.resolved,
          backgroundColor: this.config.colors.resolved + "20",
          fill: this.config.showArea,
        },
      ],
    };
  }

  /**
   * NUEVO: Obtiene color para un dataset específico
   */
  getColorForDataset(label, index) {
    const colorMap = {
      "Total de Errores": this.config.colors.total,
      "Errores Pendientes": this.config.colors.pending,
      "Errores Resueltos": this.config.colors.resolved,
      "Errores Críticos": this.config.colors.critical,
    };

    return colorMap[label] || this.config.colors.total;
  }

  /**
   * NUEVO: Formatea fecha como clave
   */
  formatDateKey(date) {
    if (this.config.granularity === "hour") {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")}-${String(
        date.getHours()
      ).padStart(2, "0")}`;
    } else {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")}`;
    }
  }

  /**
   * NUEVO: Formatea etiqueta desde clave
   */
  formatLabelFromKey(dateKey) {
    const parts = dateKey.split("-");
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    const hour = parts[3] ? parseInt(parts[3]) : 0;

    const date = new Date(year, month, day, hour);
    return this.formatLabel(date, this.config.granularity);
  }

  /**
   * Simula datos de la API (reemplazar con llamada real)
   */
  async simulateAPICall() {
    // Simular delay de red
    await new Promise((resolve) => setTimeout(resolve, 500));

    const period = this.config.period;
    const granularity = this.config.granularity;

    // Generar datos basados en el período y granularidad
    const dataPoints = this.generateDataPoints(period, granularity);

    return {
      labels: dataPoints.labels,
      datasets: [
        {
          label: "Total de Errores",
          data: dataPoints.total,
          borderColor: this.config.colors.total,
          backgroundColor: this.config.colors.total + "20",
          fill: this.config.showArea,
        },
        {
          label: "Errores Pendientes",
          data: dataPoints.pending,
          borderColor: this.config.colors.pending,
          backgroundColor: this.config.colors.pending + "20",
          fill: this.config.showArea,
        },
        {
          label: "Errores Resueltos",
          data: dataPoints.resolved,
          borderColor: this.config.colors.resolved,
          backgroundColor: this.config.colors.resolved + "20",
          fill: this.config.showArea,
        },
      ],
    };
  }

  /**
   * Genera puntos de datos basados en período y granularidad
   */
  generateDataPoints(period, granularity) {
    const now = new Date();
    const points = this.getPointsCount(period, granularity);
    const interval = this.getInterval(granularity);

    const labels = [];
    const total = [];
    const pending = [];
    const resolved = [];

    for (let i = points - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * interval);
      labels.push(this.formatLabel(date, granularity));

      // Generar datos simulados con tendencias realistas
      const baseTotal = 50 + Math.random() * 100;
      const variation = Math.sin(i * 0.1) * 20;
      const totalErrors = Math.max(0, Math.round(baseTotal + variation));

      const pendingErrors = Math.round(
        totalErrors * (0.3 + Math.random() * 0.4)
      );
      const resolvedErrors = totalErrors - pendingErrors;

      total.push(totalErrors);
      pending.push(pendingErrors);
      resolved.push(resolvedErrors);
    }

    return { labels, total, pending, resolved };
  }

  /**
   * Obtiene el número de puntos según el período
   */
  getPointsCount(period, granularity) {
    const periodMap = {
      "7d": { hour: 168, day: 7, week: 1 },
      "30d": { hour: 720, day: 30, week: 4 },
      "90d": { hour: 2160, day: 90, week: 13 },
      "365d": { hour: 8760, day: 365, week: 52, month: 12 },
    };

    return periodMap[period]?.[granularity] || 30;
  }

  /**
   * Obtiene el intervalo en milisegundos según la granularidad
   */
  getInterval(granularity) {
    const intervals = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };

    return intervals[granularity] || intervals.day;
  }

  /**
   * Formatea las etiquetas según la granularidad
   */
  formatLabel(date, granularity) {
    const options = {
      hour: { hour: "2-digit", minute: "2-digit" },
      day: { month: "short", day: "numeric" },
      week: { month: "short", day: "numeric" },
      month: { month: "short", year: "numeric" },
    };

    return date.toLocaleDateString("es-ES", options[granularity]);
  }

  /**
   * Procesa los datos antes de renderizar
   */
  processData(rawData) {
    // Filtrar series según configuración
    if (!this.config.multiSeries) {
      return {
        labels: rawData.labels,
        datasets: [rawData.datasets[0]], // Solo mostrar total
      };
    }

    return rawData;
  }

  /**
   * Obtiene las opciones específicas de ECharts para el gráfico de tendencias
   */
  getChartOptions() {
    const data = this.data;

    return {
      title: {
        text: this.config.title,
        left: "center",
        textStyle: {
          color: "var(--stats-text-primary)",
          fontSize: 16,
          fontWeight: "bold",
        },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          label: {
            backgroundColor: "#6a7985",
          },
        },
        formatter: (params) => {
          let tooltip = `<strong>${params[0].axisValue}</strong><br/>`;
          params.forEach((param) => {
            tooltip += `${param.marker} ${param.seriesName}: ${param.value}<br/>`;
          });
          return tooltip;
        },
      },
      legend: {
        show: this.config.showLegend && this.config.multiSeries,
        top: "10%",
        textStyle: {
          color: "var(--stats-text-secondary)",
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: this.config.multiSeries ? "20%" : "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: data.labels,
        axisLine: {
          lineStyle: {
            color: "var(--stats-border-color)",
          },
        },
        axisLabel: {
          color: "var(--stats-text-secondary)",
          rotate: this.shouldRotateLabels() ? 45 : 0,
        },
      },
      yAxis: {
        type: "value",
        axisLine: {
          lineStyle: {
            color: "var(--stats-border-color)",
          },
        },
        axisLabel: {
          color: "var(--stats-text-secondary)",
        },
        splitLine: {
          lineStyle: {
            color: "var(--stats-border-color)",
            opacity: 0.5,
          },
        },
      },
      series: data.datasets.map((dataset) => ({
        name: dataset.label,
        type: "line",
        data: dataset.data,
        smooth: this.config.smoothCurve,
        showSymbol: this.config.showPoints,
        symbolSize: this.config.showPoints ? 6 : 0,
        lineStyle: {
          width: 3,
          color: dataset.borderColor,
        },
        itemStyle: {
          color: dataset.borderColor,
        },
        areaStyle: dataset.fill
          ? {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  {
                    offset: 0,
                    color: dataset.backgroundColor,
                  },
                  {
                    offset: 1,
                    color: dataset.backgroundColor.replace("20", "05"),
                  },
                ],
              },
            }
          : null,
        emphasis: {
          focus: "series",
        },
      })),
    };
  }

  /**
   * Determina si las etiquetas deben rotarse
   */
  shouldRotateLabels() {
    return this.data.labels.length > 10;
  }

  /**
   * Actualiza el período del gráfico
   */
  setPeriod(period) {
    this.config.period = period;
    this.refresh();
  }

  /**
   * Actualiza la granularidad del gráfico
   */
  setGranularity(granularity) {
    this.config.granularity = granularity;
    this.refresh();
  }

  /**
   * Alterna entre mostrar/ocultar área
   */
  toggleArea() {
    this.config.showArea = !this.config.showArea;
    this.refresh();
  }

  /**
   * Alterna entre mostrar/ocultar puntos
   */
  togglePoints() {
    this.config.showPoints = !this.config.showPoints;
    this.refresh();
  }

  /**
   * Alterna entre mostrar/ocultar múltiples series
   */
  toggleMultiSeries() {
    this.config.multiSeries = !this.config.multiSeries;
    this.refresh();
  }

  /**
   * Obtiene estadísticas del gráfico
   */
  getStats() {
    if (!this.data) return null;

    const totalData = this.data.datasets[0].data;
    const total = totalData.reduce((sum, val) => sum + val, 0);
    const average = total / totalData.length;
    const max = Math.max(...totalData);
    const min = Math.min(...totalData);

    // Calcular tendencia (pendiente de la línea de regresión)
    const trend = this.calculateTrend(totalData);

    return {
      total,
      average: Math.round(average * 100) / 100,
      max,
      min,
      trend: {
        direction: trend > 0 ? "up" : trend < 0 ? "down" : "stable",
        value: Math.round(trend * 100) / 100,
      },
      period: this.config.period,
      granularity: this.config.granularity,
      dataPoints: totalData.length,
    };
  }

  /**
   * Calcula la tendencia usando regresión lineal simple
   */
  calculateTrend(data) {
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  /**
   * Exporta los datos del gráfico
   */
  exportData(format = "json") {
    const stats = this.getStats();
    const exportData = {
      chartType: "TrendChart",
      config: this.config,
      data: this.data,
      stats: stats,
      exportedAt: new Date().toISOString(),
    };

    if (format === "json") {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `trend-chart-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }

    return exportData;
  }
}
