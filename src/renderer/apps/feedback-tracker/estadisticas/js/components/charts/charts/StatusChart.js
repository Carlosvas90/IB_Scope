/**
 * StatusChart.js
 * Gráfico especializado para mostrar distribución por estado
 * Principalmente usa gráficos de dona/pie
 */

import { BaseChart } from "../BaseChart.js";

export class StatusChart extends BaseChart {
  constructor(containerId, options = {}) {
    super(containerId, "status", {
      title: "Distribución por Estado",
      responsive: true,
      exportable: true,
      defaultChartType: "doughnut",
      supportedTypes: ["doughnut", "pie", "bar"],
      showLegend: true,
      showCenter: true,
      centerText: "Total",
      ...options,
    });

    this.currentChartType = options.chartType || "doughnut";
    console.log(`🥧 StatusChart inicializado para container: ${containerId}`);
  }

  /**
   * Implementa el método abstracto fetchData
   */
  async fetchData(params = {}) {
    try {
      const controller = window.estadisticasController;
      if (!controller || !controller.dataService) {
        console.warn("⚠️ Controller no disponible para StatusChart");
        return [];
      }

      const statusData = controller.processStatusData();
      return statusData;
    } catch (error) {
      console.error("❌ Error en StatusChart.fetchData:", error);
      return [];
    }
  }

  /**
   * Genera la configuración específica para gráficos de estado
   */
  generateChartOptions(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn("⚠️ Datos incompletos para StatusChart:", data);
      return this.getEmptyChartOptions();
    }

    // Configuración base común
    const baseOptions = {
      title: {
        text: this.options.title || "Distribución por Estado",
        left: "center",
        textStyle: {
          fontSize: 16,
          fontWeight: "bold",
          color: this.getThemeColor("textColor"),
        },
      },
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const percent = params.percent || 0;
          return `${params.marker} ${params.name}<br/>Cantidad: ${
            params.value
          }<br/>Porcentaje: ${percent.toFixed(1)}%`;
        },
      },
      animation: true,
      animationDuration: 1000,
    };

    // Configuración específica según el tipo
    if (this.currentChartType === "bar") {
      return this.generateBarChartOptions(data, baseOptions);
    } else {
      return this.generatePieChartOptions(data, baseOptions);
    }
  }

  /**
   * Genera configuración para gráfico de dona/pie
   */
  generatePieChartOptions(data, baseOptions) {
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);

    return {
      ...baseOptions,
      legend: {
        show: this.options.showLegend,
        orient: "vertical",
        left: "left",
        top: "middle",
        data: data.map((item) => item.name),
        textStyle: {
          color: this.getThemeColor("textColor"),
        },
      },
      graphic:
        this.options.showCenter && this.currentChartType === "doughnut"
          ? {
              type: "text",
              left: "center",
              top: "middle",
              style: {
                text: `${this.options.centerText}\n${total}`,
                textAlign: "center",
                fill: this.getThemeColor("textColor"),
                fontSize: 14,
                fontWeight: "bold",
              },
            }
          : null,
      series: [
        {
          name: this.options.title || "Estado",
          type: "pie",
          radius: this.currentChartType === "doughnut" ? ["40%", "70%"] : "70%",
          center: ["50%", "50%"],
          data: data.map((item, index) => ({
            name: item.name,
            value: item.value || 0,
            itemStyle: {
              color: this.getColorFromPalette(index),
            },
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
          labelLine: {
            show: true,
          },
          label: {
            show: true,
            formatter: "{b}: {c}\n({d}%)",
            color: this.getThemeColor("textColor"),
          },
        },
      ],
    };
  }

  /**
   * Genera configuración para gráfico de barras
   */
  generateBarChartOptions(data, baseOptions) {
    return {
      ...baseOptions,
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: data.map((item) => item.name),
        axisLabel: {
          rotate: 45,
          color: this.getThemeColor("textColor"),
        },
        axisLine: {
          lineStyle: {
            color: this.getThemeColor("axisColor"),
          },
        },
      },
      yAxis: {
        type: "value",
        name: "Cantidad",
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
      series: [
        {
          name: "Cantidad",
          type: "bar",
          data: data.map((item, index) => ({
            value: item.value || 0,
            itemStyle: {
              color: this.getColorFromPalette(index),
            },
          })),
          barMaxWidth: 40,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
        },
      ],
    };
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
        text: this.options.title || "Distribución por Estado",
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
   * Configuración específica de eventos para StatusChart
   */
  setupChartEvents() {
    super.setupChartEvents();

    if (this.chart) {
      // Evento específico para clics en sectores
      this.chart.on("click", (params) => {
        if (params.componentType === "series") {
          this.emit("sectorClick", {
            name: params.name,
            value: params.value,
            percent: params.percent,
            dataIndex: params.dataIndex,
          });
        }
      });

      // Evento para hover en sectores
      this.chart.on("mouseover", (params) => {
        if (params.componentType === "series") {
          this.emit("sectorHover", {
            name: params.name,
            value: params.value,
            percent: params.percent,
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
            pie: "Circular",
            bar: "Barras",
          },
          type: ["pie", "bar"],
          option: {
            pie: {
              radius:
                this.currentChartType === "doughnut" ? ["40%", "70%"] : "70%",
            },
            bar: { barMaxWidth: 40 },
          },
        },
      },
    };
  }

  /**
   * Obtiene estadísticas del gráfico
   */
  getStatistics() {
    if (!this.lastData || !Array.isArray(this.lastData)) {
      return null;
    }

    const total = this.lastData.reduce(
      (sum, item) => sum + (item.value || 0),
      0
    );
    const max = Math.max(...this.lastData.map((item) => item.value || 0));
    const min = Math.min(...this.lastData.map((item) => item.value || 0));
    const average = total / this.lastData.length;

    // Encontrar el estado más común
    const mostCommon = this.lastData.reduce((prev, current) =>
      current.value > prev.value ? current : prev
    );

    return {
      total,
      average: Math.round(average * 100) / 100,
      max,
      min,
      mostCommon: {
        name: mostCommon.name,
        value: mostCommon.value,
        percentage: ((mostCommon.value / total) * 100).toFixed(1),
      },
      categories: this.lastData.length,
      distribution: this.lastData.map((item) => ({
        name: item.name,
        value: item.value,
        percentage: ((item.value / total) * 100).toFixed(1),
      })),
    };
  }

  /**
   * Configurar el texto central para gráficos de dona
   */
  setCenterText(text) {
    this.options.centerText = text;
    if (this.currentChartType === "doughnut" && this.lastData) {
      this.update(this.lastData);
    }
  }

  /**
   * Alternar mostrar/ocultar leyenda
   */
  toggleLegend() {
    this.options.showLegend = !this.options.showLegend;
    if (this.lastData) {
      this.update(this.lastData);
    }
  }

  /**
   * Validación específica de datos para StatusChart
   */
  validateData(data) {
    if (!data) {
      return { valid: false, error: "No se proporcionaron datos" };
    }

    if (!Array.isArray(data)) {
      return { valid: false, error: "Los datos deben ser un array" };
    }

    if (data.length === 0) {
      return { valid: false, error: "Array de datos vacío" };
    }

    // Validar cada elemento
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (!item.name || (item.value === undefined && item.value !== 0)) {
        return {
          valid: false,
          error: `Elemento ${i} inválido: falta nombre o valor`,
        };
      }

      if (typeof item.value !== "number" || item.value < 0) {
        return {
          valid: false,
          error: `Elemento ${i} tiene valor inválido: ${item.value}`,
        };
      }
    }

    return { valid: true };
  }
}
