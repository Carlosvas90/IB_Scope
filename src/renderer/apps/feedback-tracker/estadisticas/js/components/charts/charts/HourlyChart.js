/**
 * HourlyChart.js
 * Gráfico especializado para mostrar distribución de errores por hora del día
 * Principalmente usa gráficos de barras
 */

import { BaseChart } from "../BaseChart.js";

export class HourlyChart extends BaseChart {
  constructor(containerId, options = {}) {
    super(containerId, "hourly", {
      title: "Errores por Hora del Día",
      responsive: true,
      exportable: true,
      defaultChartType: "bar",
      supportedTypes: ["bar", "line", "area"],
      showAverage: true,
      highlight24h: true,
      ...options,
    });

    this.currentChartType = options.chartType || "bar";
    console.log(`⏰ HourlyChart inicializado para container: ${containerId}`);
  }

  /**
   * Implementa el método abstracto fetchData
   */
  async fetchData(params = {}) {
    try {
      const controller = window.estadisticasController;
      if (!controller || !controller.dataService) {
        console.warn("⚠️ Controller no disponible para HourlyChart");
        return { hours: [], data: [] };
      }

      const hourlyData = controller.processHourlyData();
      return hourlyData;
    } catch (error) {
      console.error("❌ Error en HourlyChart.fetchData:", error);
      return { hours: [], data: [] };
    }
  }

  /**
   * Genera la configuración específica para gráficos por hora
   */
  generateChartOptions(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn("⚠️ Datos incompletos para HourlyChart:", data);
      return this.getEmptyChartOptions();
    }

    // Asegurar que tenemos 24 horas de datos
    const hourlyData = this.normalizeHourlyData(data);
    const average = hourlyData.reduce((sum, val) => sum + val, 0) / 24;

    return {
      title: {
        text: this.options.title || "Errores por Hora del Día",
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
          const param = params[0];
          const hour = param.dataIndex;
          const timeRange = `${hour.toString().padStart(2, "0")}:00 - ${(
            hour + 1
          )
            .toString()
            .padStart(2, "0")}:00`;
          return `<strong>${timeRange}</strong><br/>${param.marker} Errores: ${param.value}`;
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "8%",
        top: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: Array.from(
          { length: 24 },
          (_, i) => `${i.toString().padStart(2, "0")}:00`
        ),
        axisLabel: {
          rotate: this.shouldRotateLabels() ? 45 : 0,
          color: this.getThemeColor("textColor"),
          interval: 1, // Mostrar todas las horas
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
      series: this.generateSeriesConfig(hourlyData, average),
      animation: true,
      animationDuration: 1000,
    };
  }

  /**
   * Normaliza los datos para asegurar 24 horas
   */
  normalizeHourlyData(data) {
    const normalized = new Array(24).fill(0);

    if (Array.isArray(data)) {
      // Si es un array simple de 24 elementos
      if (data.length === 24) {
        return data;
      }

      // Si es un array de objetos con hour y value
      data.forEach((item) => {
        if (item.hour !== undefined && item.value !== undefined) {
          const hour = parseInt(item.hour);
          if (hour >= 0 && hour < 24) {
            normalized[hour] = item.value;
          }
        }
      });
    } else if (typeof data === "object") {
      // Si es un objeto con claves de hora
      Object.keys(data).forEach((key) => {
        const hour = parseInt(key);
        if (hour >= 0 && hour < 24 && data[key] !== undefined) {
          normalized[hour] = data[key];
        }
      });
    }

    return normalized;
  }

  /**
   * Genera la configuración de series según el tipo de gráfico
   */
  generateSeriesConfig(hourlyData, average) {
    const series = [];

    // Serie principal
    const mainSeries = {
      name: "Errores por Hora",
      type: this.currentChartType === "area" ? "line" : this.currentChartType,
      data: hourlyData.map((value, hour) => ({
        value,
        itemStyle: {
          color: this.getColorForHour(hour, value, average),
        },
      })),
      emphasis: {
        focus: "series",
      },
    };

    // Configuraciones específicas por tipo
    switch (this.currentChartType) {
      case "line":
        mainSeries.smooth = true;
        mainSeries.symbol = "circle";
        mainSeries.symbolSize = 6;
        mainSeries.lineStyle = { width: 2 };
        break;

      case "area":
        mainSeries.smooth = true;
        mainSeries.areaStyle = { opacity: 0.3 };
        mainSeries.symbol = "circle";
        mainSeries.symbolSize = 4;
        break;

      case "bar":
        mainSeries.barMaxWidth = 30;
        break;
    }

    series.push(mainSeries);

    // Agregar línea de promedio si está habilitada
    if (this.options.showAverage) {
      series.push({
        name: "Promedio",
        type: "line",
        data: new Array(24).fill(average),
        lineStyle: {
          color: "#ff6b6b",
          type: "dashed",
          width: 2,
        },
        symbol: "none",
        tooltip: {
          formatter: `Promedio: ${average.toFixed(1)} errores/hora`,
        },
      });
    }

    return series;
  }

  /**
   * Obtiene color según la hora y valor
   */
  getColorForHour(hour, value, average) {
    // Colores más intensos para horas pico (horario laboral)
    const isPeakHour = hour >= 9 && hour <= 17;
    const isHighValue = value > average * 1.2;

    if (isHighValue) {
      return "#ff4757"; // Rojo para valores altos
    } else if (isPeakHour) {
      return "#3742fa"; // Azul para horas pico
    } else if (hour >= 22 || hour <= 6) {
      return "#2f3542"; // Gris oscuro para madrugada
    } else {
      return "#5352ed"; // Morado para horas normales
    }
  }

  /**
   * Determina si las etiquetas deben rotarse
   */
  shouldRotateLabels() {
    return false; // Las horas son cortas, no necesitan rotación
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
        text: this.options.title || "Errores por Hora del Día",
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
   * Configuración específica de eventos para HourlyChart
   */
  setupChartEvents() {
    super.setupChartEvents();

    if (this.chart) {
      // Evento específico para clics en horas
      this.chart.on("click", (params) => {
        if (
          params.componentType === "series" &&
          params.componentSubType !== "line"
        ) {
          const hour = params.dataIndex;
          const timeRange = `${hour.toString().padStart(2, "0")}:00 - ${(
            hour + 1
          )
            .toString()
            .padStart(2, "0")}:00`;

          this.emit("hourClick", {
            hour,
            timeRange,
            value: params.value,
            dataIndex: params.dataIndex,
          });
        }
      });

      // Evento para hover en horas
      this.chart.on("mouseover", (params) => {
        if (params.componentType === "series") {
          const hour = params.dataIndex;
          this.emit("hourHover", {
            hour,
            value: params.value,
          });
        }
      });
    }
  }

  /**
   * Configuración de herramientas específicas
   */
  getToolboxConfig() {
    return {
      ...super.getToolboxConfig(),
      feature: {
        ...super.getToolboxConfig().feature,
        magicType: {
          title: {
            bar: "Barras",
            line: "Línea",
            area: "Área",
          },
          type: this.options.supportedTypes,
          option: {
            line: { smooth: true },
            bar: { barMaxWidth: 30 },
            area: { areaStyle: { opacity: 0.3 } },
          },
        },
      },
    };
  }

  /**
   * Obtiene estadísticas del gráfico
   */
  getStatistics() {
    if (!this.lastData) {
      return null;
    }

    const hourlyData = this.normalizeHourlyData(this.lastData);
    const total = hourlyData.reduce((sum, val) => sum + val, 0);
    const average = total / 24;
    const max = Math.max(...hourlyData);
    const min = Math.min(...hourlyData);

    // Encontrar hora pico
    const peakHour = hourlyData.indexOf(max);
    const quietHour = hourlyData.indexOf(min);

    // Análisis por períodos
    const morning = hourlyData.slice(6, 12).reduce((sum, val) => sum + val, 0); // 6-12
    const afternoon = hourlyData
      .slice(12, 18)
      .reduce((sum, val) => sum + val, 0); // 12-18
    const evening = hourlyData.slice(18, 24).reduce((sum, val) => sum + val, 0); // 18-24
    const night = [...hourlyData.slice(0, 6), ...hourlyData.slice(0, 0)].reduce(
      (sum, val) => sum + val,
      0
    ); // 0-6

    return {
      total,
      average: Math.round(average * 100) / 100,
      max,
      min,
      peakHour: {
        hour: peakHour,
        timeRange: `${peakHour.toString().padStart(2, "0")}:00 - ${(
          peakHour + 1
        )
          .toString()
          .padStart(2, "0")}:00`,
        value: max,
      },
      quietHour: {
        hour: quietHour,
        timeRange: `${quietHour.toString().padStart(2, "0")}:00 - ${(
          quietHour + 1
        )
          .toString()
          .padStart(2, "0")}:00`,
        value: min,
      },
      periods: {
        morning: { total: morning, average: morning / 6 },
        afternoon: { total: afternoon, average: afternoon / 6 },
        evening: { total: evening, average: evening / 6 },
        night: { total: night, average: night / 6 },
      },
    };
  }

  /**
   * Alternar mostrar/ocultar línea de promedio
   */
  toggleAverage() {
    this.options.showAverage = !this.options.showAverage;
    if (this.lastData) {
      this.update(this.lastData);
    }
  }

  /**
   * Validación específica de datos para HourlyChart
   */
  validateData(data) {
    if (!data) {
      return { valid: false, error: "No se proporcionaron datos" };
    }

    // Validar array simple
    if (Array.isArray(data)) {
      if (data.length > 24) {
        return {
          valid: false,
          error: "Demasiados elementos (máximo 24 horas)",
        };
      }

      // Validar valores numéricos
      for (let i = 0; i < data.length; i++) {
        const value = data[i];
        if (typeof value === "object" && value !== null) {
          // Formato { hour: X, value: Y }
          if (!("hour" in value) || !("value" in value)) {
            return {
              valid: false,
              error: `Elemento ${i} debe tener propiedades 'hour' y 'value'`,
            };
          }
          if (typeof value.value !== "number" || value.value < 0) {
            return {
              valid: false,
              error: `Valor inválido en elemento ${i}: ${value.value}`,
            };
          }
        } else {
          // Formato simple numérico
          if (typeof value !== "number" || value < 0) {
            return {
              valid: false,
              error: `Valor inválido en posición ${i}: ${value}`,
            };
          }
        }
      }
    } else if (typeof data === "object") {
      // Validar objeto con claves de hora
      const keys = Object.keys(data);
      for (const key of keys) {
        const hour = parseInt(key);
        if (isNaN(hour) || hour < 0 || hour >= 24) {
          return { valid: false, error: `Clave de hora inválida: ${key}` };
        }
        if (typeof data[key] !== "number" || data[key] < 0) {
          return {
            valid: false,
            error: `Valor inválido para hora ${key}: ${data[key]}`,
          };
        }
      }
    } else {
      return { valid: false, error: "Formato de datos no reconocido" };
    }

    return { valid: true };
  }
}
