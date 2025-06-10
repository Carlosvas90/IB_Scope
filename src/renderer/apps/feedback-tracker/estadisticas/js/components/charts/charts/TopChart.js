/**
 * TopChart.js
 * Gráfico especializado para mostrar rankings y elementos top
 * Principalmente usa gráficos de barras horizontales
 */

import { BaseChart } from "../BaseChart.js";

export class TopChart extends BaseChart {
  constructor(containerId, options = {}) {
    super(containerId, "top", {
      title: "Top Elementos",
      responsive: true,
      exportable: true,
      defaultChartType: "bar",
      supportedTypes: ["bar", "horizontalBar", "pie"],
      maxItems: 10,
      showValues: true,
      sortDescending: true,
      ...options,
    });

    this.currentChartType = options.chartType || "horizontalBar";
    console.log(`🏆 TopChart inicializado para container: ${containerId}`);
  }

  /**
   * Genera la configuración específica para gráficos top
   */
  generateChartOptions(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn("⚠️ Datos incompletos para TopChart:", data);
      return this.getEmptyChartOptions();
    }

    // Procesar y ordenar los datos
    const processedData = this.processTopData(data);

    return {
      title: {
        text: this.options.title || "Top Elementos",
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
          if (this.currentChartType === "pie") {
            return `${params.marker} ${params.name}<br/>Valor: ${
              params.value
            }<br/>Porcentaje: ${params.percent.toFixed(1)}%`;
          } else {
            return `${params.marker} ${params.name}<br/>Valor: ${params.value}`;
          }
        },
      },
      ...this.getTypeSpecificOptions(processedData),
      animation: true,
      animationDuration: 1000,
    };
  }

  /**
   * Procesa y ordena los datos según las opciones
   */
  processTopData(data) {
    // Normalizar formato de datos
    let normalizedData = data
      .map((item) => {
        if (typeof item === "object" && item.name && item.value !== undefined) {
          return { name: item.name, value: item.value };
        } else if (
          typeof item === "object" &&
          item.label &&
          item.count !== undefined
        ) {
          return { name: item.label, value: item.count };
        } else if (Array.isArray(item) && item.length >= 2) {
          return { name: item[0], value: item[1] };
        }
        return null;
      })
      .filter((item) => item !== null);

    // Ordenar según configuración
    if (this.options.sortDescending) {
      normalizedData.sort((a, b) => b.value - a.value);
    } else {
      normalizedData.sort((a, b) => a.value - b.value);
    }

    // Limitar número de elementos
    if (
      this.options.maxItems &&
      normalizedData.length > this.options.maxItems
    ) {
      normalizedData = normalizedData.slice(0, this.options.maxItems);
    }

    return normalizedData;
  }

  /**
   * Obtiene opciones específicas según el tipo de gráfico
   */
  getTypeSpecificOptions(data) {
    switch (this.currentChartType) {
      case "horizontalBar":
        return this.getHorizontalBarOptions(data);
      case "bar":
        return this.getVerticalBarOptions(data);
      case "pie":
        return this.getPieOptions(data);
      default:
        return this.getHorizontalBarOptions(data);
    }
  }

  /**
   * Configuración para barras horizontales
   */
  getHorizontalBarOptions(data) {
    return {
      grid: {
        left: "20%",
        right: "10%",
        bottom: "3%",
        top: "15%",
        containLabel: false,
      },
      xAxis: {
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
      yAxis: {
        type: "category",
        data: data.map((item) => item.name),
        inverse: true, // Mostrar el más alto arriba
        axisLabel: {
          color: this.getThemeColor("textColor"),
          overflow: "truncate",
          width: 120,
        },
        axisLine: {
          lineStyle: {
            color: this.getThemeColor("axisColor"),
          },
        },
      },
      series: [
        {
          name: "Cantidad",
          type: "bar",
          data: data.map((item, index) => ({
            value: item.value,
            itemStyle: {
              color: this.getRankingColor(index, data.length),
            },
          })),
          barMaxWidth: 30,
          label: this.options.showValues
            ? {
                show: true,
                position: "right",
                color: this.getThemeColor("textColor"),
                formatter: "{c}",
              }
            : undefined,
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
   * Configuración para barras verticales
   */
  getVerticalBarOptions(data) {
    return {
      grid: {
        left: "3%",
        right: "4%",
        bottom: "20%",
        top: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: data.map((item) => item.name),
        axisLabel: {
          rotate: 45,
          color: this.getThemeColor("textColor"),
          overflow: "truncate",
          width: 80,
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
            value: item.value,
            itemStyle: {
              color: this.getRankingColor(index, data.length),
            },
          })),
          barMaxWidth: 40,
          label: this.options.showValues
            ? {
                show: true,
                position: "top",
                color: this.getThemeColor("textColor"),
                formatter: "{c}",
              }
            : undefined,
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
   * Configuración para gráfico circular
   */
  getPieOptions(data) {
    return {
      legend: {
        show: true,
        orient: "vertical",
        left: "left",
        top: "middle",
        data: data.map((item) => item.name),
        textStyle: {
          color: this.getThemeColor("textColor"),
        },
      },
      series: [
        {
          name: "Top Elementos",
          type: "pie",
          radius: "70%",
          center: ["50%", "50%"],
          data: data.map((item, index) => ({
            name: item.name,
            value: item.value,
            itemStyle: {
              color: this.getRankingColor(index, data.length),
            },
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
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
   * Obtiene color según la posición en el ranking
   */
  getRankingColor(index, total) {
    // Colores especiales para los primeros lugares
    const rankingColors = [
      "#FFD700", // Oro - 1er lugar
      "#C0C0C0", // Plata - 2do lugar
      "#CD7F32", // Bronce - 3er lugar
    ];

    if (index < 3 && rankingColors[index]) {
      return rankingColors[index];
    }

    // Degradé de colores para el resto
    const intensity = 1 - (index / (total - 1)) * 0.6; // De 1 a 0.4
    return `rgba(74, 144, 226, ${intensity})`;
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
        text: this.options.title || "Top Elementos",
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
   * Configuración específica de eventos para TopChart
   */
  setupChartEvents() {
    super.setupChartEvents();

    if (this.chart) {
      // Evento específico para clics en elementos del ranking
      this.chart.on("click", (params) => {
        if (params.componentType === "series") {
          this.emit("rankingClick", {
            name: params.name,
            value: params.value,
            rank: params.dataIndex + 1,
            dataIndex: params.dataIndex,
          });
        }
      });

      // Evento para hover en elementos
      this.chart.on("mouseover", (params) => {
        if (params.componentType === "series") {
          this.emit("rankingHover", {
            name: params.name,
            value: params.value,
            rank: params.dataIndex + 1,
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
            bar: "Barras Verticales",
            line: "Barras Horizontales",
            pie: "Circular",
          },
          type: ["bar", "line", "pie"],
          option: {
            bar: { barMaxWidth: 40 },
            line: { barMaxWidth: 30 }, // Representa barras horizontales
            pie: { radius: "70%" },
          },
        },
      },
    };
  }

  /**
   * Obtiene estadísticas del ranking
   */
  getStatistics() {
    if (!this.lastData || !Array.isArray(this.lastData)) {
      return null;
    }

    const processedData = this.processTopData(this.lastData);
    const values = processedData.map((item) => item.value);
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    return {
      total,
      average: Math.round(average * 100) / 100,
      max,
      min,
      topElement: {
        name: processedData[0]?.name,
        value: processedData[0]?.value,
        percentage: ((processedData[0]?.value / total) * 100).toFixed(1),
      },
      itemCount: processedData.length,
      distribution: processedData.map((item, index) => ({
        rank: index + 1,
        name: item.name,
        value: item.value,
        percentage: ((item.value / total) * 100).toFixed(1),
      })),
    };
  }

  /**
   * Cambia el número máximo de elementos a mostrar
   */
  setMaxItems(maxItems) {
    this.options.maxItems = maxItems;
    if (this.lastData) {
      this.update(this.lastData);
    }
  }

  /**
   * Alterna el orden de clasificación
   */
  toggleSortOrder() {
    this.options.sortDescending = !this.options.sortDescending;
    if (this.lastData) {
      this.update(this.lastData);
    }
  }

  /**
   * Alterna mostrar/ocultar valores
   */
  toggleValues() {
    this.options.showValues = !this.options.showValues;
    if (this.lastData) {
      this.update(this.lastData);
    }
  }

  /**
   * Validación específica de datos para TopChart
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

      // Formato { name, value }
      if (typeof item === "object" && item !== null) {
        if (item.name === undefined && item.label === undefined) {
          return {
            valid: false,
            error: `Elemento ${i} debe tener propiedad 'name' o 'label'`,
          };
        }

        const value = item.value !== undefined ? item.value : item.count;
        if (value === undefined) {
          return {
            valid: false,
            error: `Elemento ${i} debe tener propiedad 'value' o 'count'`,
          };
        }

        if (typeof value !== "number" || value < 0) {
          return {
            valid: false,
            error: `Elemento ${i} tiene valor inválido: ${value}`,
          };
        }
      }
      // Formato [name, value]
      else if (Array.isArray(item)) {
        if (item.length < 2) {
          return {
            valid: false,
            error: `Elemento ${i} como array debe tener al menos 2 elementos [name, value]`,
          };
        }

        if (typeof item[1] !== "number" || item[1] < 0) {
          return {
            valid: false,
            error: `Elemento ${i} tiene valor inválido: ${item[1]}`,
          };
        }
      } else {
        return {
          valid: false,
          error: `Elemento ${i} tiene formato inválido`,
        };
      }
    }

    return { valid: true };
  }
}
