/**
 * TrendChart.js
 * Gráfico especializado para mostrar tendencias temporales de errores
 * Soporta líneas, áreas y barras
 */

import { BaseChart } from "../BaseChart.js";

export class TrendChart extends BaseChart {
  constructor(containerId, options = {}) {
    super(containerId, "trend", {
      title: "Tendencias de Errores",
      responsive: true,
      exportable: true,
      defaultChartType: "line",
      supportedTypes: ["line", "bar", "area"],
      ...options,
    });

    this.currentChartType = options.chartType || "line";
    console.log(`📈 TrendChart inicializado para container: ${containerId}`);
  }

  /**
   * Implementa el método abstracto fetchData
   * @param {Object} params - Parámetros para obtener datos
   * @returns {Promise<Object>} Datos procesados para el gráfico
   */
  async fetchData(params = {}) {
    try {
      // Obtener datos del controlador principal
      const controller = window.estadisticasController;
      if (!controller || !controller.dataService) {
        console.warn("⚠️ Controller no disponible para TrendChart");
        return { dates: [], series: [] };
      }

      // Procesar datos de tendencias
      const trendData = controller.processTrendData();
      return trendData;
    } catch (error) {
      console.error("❌ Error en TrendChart.fetchData:", error);
      return { dates: [], series: [] };
    }
  }

  /**
   * Implementa el método abstracto de BaseChart: opciones ECharts para render/update.
   */
  getChartOptions() {
    const data = this.data;
    if (!data || !data.dates || !data.series) {
      return this.getEmptyChartOptions();
    }
    return this.generateChartOptions(data);
  }

  /**
   * Genera la configuración específica para gráficos de tendencia
   */
  generateChartOptions(data) {
    if (!data || !data.dates || !data.series) {
      console.warn("⚠️ Datos incompletos para TrendChart:", data);
      return this.getEmptyChartOptions();
    }

    return {
      title: {
        text: this.options.title || "Tendencias de Errores",
        left: "center",
        textStyle: {
          fontSize: 16,
          fontWeight: "bold",
          color: this.getThemeColor("textColor"),
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
          let result = `<strong>${params[0].axisValue}</strong><br/>`;
          params.forEach((param) => {
            result += `${param.marker} ${param.seriesName}: ${param.value}<br/>`;
          });
          return result;
        },
      },
      legend: {
        data: data.series.map((s) => s.name),
        bottom: 10,
        textStyle: {
          color: this.getThemeColor("textColor"),
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "15%",
        top: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: data.dates,
        axisLabel: {
          rotate: 45,
          color: this.getThemeColor("textColor"),
          formatter: (value) => {
            try {
              const date = new Date(value.replace(/\//g, "-"));
              return date.toLocaleDateString("es-ES", {
                month: "short",
                day: "numeric",
              });
            } catch (error) {
              return value;
            }
          },
        },
        axisLine: {
          lineStyle: {
            color: this.getThemeColor("axisColor"),
          },
        },
      },
      yAxis: {
        type: "value",
        name: "Cantidad de Errores",
        nameTextStyle: {
          color: this.getThemeColor("textColor"),
        },
        axisLabel: {
          color: this.getThemeColor("textColor"),
        },
        axisLine: {
          lineStyle: {
            color: this.getThemeColor("axisColor"),
          },
        },
        splitLine: {
          lineStyle: {
            color: this.getThemeColor("gridColor"),
          },
        },
      },
      series: this.generateSeriesConfig(data.series),
      animation: true,
      animationDuration: 1000,
    };
  }

  /**
   * Genera la configuración de series según el tipo de gráfico
   */
  generateSeriesConfig(seriesData) {
    return seriesData.map((serie, index) => {
      const baseConfig = {
        name: serie.name,
        type: this.currentChartType === "area" ? "line" : this.currentChartType,
        data: serie.data,
        itemStyle: {
          color: this.getColorFromPalette(index),
        },
        emphasis: {
          focus: "series",
        },
      };

      // Configuraciones específicas por tipo
      switch (this.currentChartType) {
        case "line":
          return {
            ...baseConfig,
            smooth: true,
            symbol: "circle",
            symbolSize: 6,
            lineStyle: {
              width: 2,
            },
          };

        case "area":
          return {
            ...baseConfig,
            smooth: true,
            areaStyle: {
              opacity: 0.3,
            },
            symbol: "circle",
            symbolSize: 4,
          };

        case "bar":
          return {
            ...baseConfig,
            barMaxWidth: 40,
            label: {
              show: false,
              position: "top",
            },
          };

        default:
          return baseConfig;
      }
    });
  }

  /**
   * Cambia el tipo de gráfico dinámicamente
   */
  async changeChartType(newType) {
    if (!this.options.supportedTypes.includes(newType)) {
      console.warn(`⚠️ Tipo de gráfico no soportado: ${newType}`);
      return false;
    }

    console.log(`🔄 Cambiando tipo de gráfico a: ${newType}`);
    this.currentChartType = newType;

    if (this.lastData) {
      await this.update(this.lastData);
    }

    return true;
  }

  /**
   * Actualiza el gráfico con nuevos datos
   */
  async update(data) {
    this.lastData = data; // Guardar para cambios de tipo
    return super.update(data);
  }

  /**
   * Obtiene configuración para gráfico vacío
   */
  getEmptyChartOptions() {
    return {
      title: {
        text: this.options.title || "Tendencias de Errores",
        left: "center",
        textStyle: { fontSize: 16, fontWeight: "bold" },
      },
      graphic: {
        type: "text",
        left: "center",
        top: "middle",
        style: {
          text: "No hay datos disponibles",
          fontSize: 14,
          fill: "#999",
        },
      },
    };
  }

  /**
   * Configuración de herramientas específicas
   */
  getToolboxConfig() {
    return {
      ...super.getToolboxConfig(),
      feature: {
        ...super.getToolboxConfig().feature,
        dataZoom: {
          title: {
            zoom: "Zoom",
            back: "Restaurar Zoom",
          },
        },
        magicType: {
          title: {
            line: "Línea",
            bar: "Barras",
            area: "Área",
          },
          type: this.options.supportedTypes,
          option: {
            line: { smooth: true },
            bar: { barMaxWidth: 40 },
            area: { areaStyle: { opacity: 0.3 } },
          },
        },
      },
    };
  }

  /**
   * Validación específica de datos para TrendChart
   */
  validateData(data) {
    if (!data) {
      return { valid: false, error: "No se proporcionaron datos" };
    }

    if (!data.dates || !Array.isArray(data.dates)) {
      return { valid: false, error: "Falta array de fechas" };
    }

    if (!data.series || !Array.isArray(data.series)) {
      return { valid: false, error: "Falta array de series" };
    }

    if (data.series.length === 0) {
      return { valid: false, error: "No hay series de datos" };
    }

    // Validar cada serie
    for (let i = 0; i < data.series.length; i++) {
      const serie = data.series[i];
      if (!serie.name || !serie.data || !Array.isArray(serie.data)) {
        return {
          valid: false,
          error: `Serie ${i} inválida: falta nombre o datos`,
        };
      }

      if (serie.data.length !== data.dates.length) {
        console.warn(
          `⚠️ Serie ${serie.name} tiene diferente longitud que fechas`
        );
      }
    }

    return { valid: true };
  }
}
