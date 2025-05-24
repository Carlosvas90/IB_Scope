/**
 * ChartManager.js
 * Componente para manejar todos los gráficos usando Apache ECharts
 * Responsable de crear, actualizar y configurar los gráficos del dashboard
 */

export class ChartManager {
  constructor() {
    this.charts = new Map();
    this.defaultOptions = this.getDefaultOptions();
    this.colorPalette = this.getColorPalette();
    console.log("📊 ChartManager (ECharts) inicializado");
  }

  /**
   * Obtiene las opciones por defecto para todos los gráficos
   */
  getDefaultOptions() {
    return {
      animation: true,
      animationDuration: 1000,
      animationEasing: "cubicInOut",
      textStyle: {
        fontFamily: "var(--stats-font-family)",
        fontSize: 12,
        color: "var(--stats-text-secondary)",
      },
      backgroundColor: "transparent",
      grid: {
        left: "10%",
        right: "10%",
        top: "15%",
        bottom: "15%",
        containLabel: true,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        textStyle: {
          color: "#ffffff",
          fontSize: 12,
        },
        padding: [10, 15],
        extraCssText:
          "border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);",
      },
      legend: {
        top: "5%",
        textStyle: {
          color: "var(--stats-text-secondary)",
          fontSize: 12,
        },
      },
    };
  }

  /**
   * Obtiene la paleta de colores
   */
  getColorPalette() {
    return [
      "#4381b3", // Palette-Blue-4
      "#4caf50", // Color-Green-3
      "#ff9800", // Color-Orange-3
      "#f44336", // Color-Red-3
      "#74d7fb", // Palette-Blue-3
      "#9c27b0", // Purple
      "#00bcd4", // Cyan
      "#795548", // Brown
      "#607d8b", // Blue Grey
      "#ffc107", // Amber
    ];
  }

  /**
   * Valida si ECharts está disponible y lo carga si es necesario
   */
  async validateECharts() {
    // Si ya está disponible, return true
    if (typeof echarts !== "undefined") {
      return true;
    }

    console.log("🔄 ECharts no disponible, intentando cargar...");

    // Intentar cargar ECharts dinámicamente
    try {
      await this.loadECharts();
      return typeof echarts !== "undefined";
    } catch (error) {
      console.error("❌ Error cargando ECharts:", error);
      return false;
    }
  }

  /**
   * Carga ECharts dinámicamente
   */
  async loadECharts() {
    return new Promise((resolve, reject) => {
      // Verificar si ya se está cargando
      if (window.echartsLoading) {
        // Esperar a que termine de cargar
        const checkInterval = setInterval(() => {
          if (typeof echarts !== "undefined") {
            clearInterval(checkInterval);
            resolve();
          } else if (!window.echartsLoading) {
            clearInterval(checkInterval);
            reject(new Error("ECharts falló al cargar"));
          }
        }, 100);
        return;
      }

      // Verificar si el script ya existe
      const existingScript = document.querySelector('script[src*="echarts"]');
      if (existingScript) {
        console.log("🔍 Script de ECharts ya existe, esperando carga...");

        // Esperar a que el script existente termine de cargar
        const checkInterval = setInterval(() => {
          if (typeof echarts !== "undefined") {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);

        // Timeout después de 10 segundos
        setTimeout(() => {
          clearInterval(checkInterval);
          if (typeof echarts === "undefined") {
            reject(new Error("Timeout esperando ECharts"));
          }
        }, 10000);
        return;
      }

      // Marcar como cargando
      window.echartsLoading = true;

      // Crear y agregar script
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js";
      script.async = true;

      script.onload = () => {
        window.echartsLoading = false;
        console.log("✅ ECharts cargado dinámicamente");
        resolve();
      };

      script.onerror = () => {
        window.echartsLoading = false;
        reject(new Error("Error cargando ECharts desde CDN"));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Crea un gráfico de líneas
   * @param {HTMLElement} container - Elemento contenedor
   * @param {Object} data - Datos del gráfico
   * @param {Object} customOptions - Opciones personalizadas
   */
  async createLineChart(container, data, customOptions = {}) {
    const isEChartsAvailable = await this.validateECharts();
    if (!isEChartsAvailable) {
      console.error("❌ No se pudo cargar ECharts");
      return null;
    }

    const chart = echarts.init(container);

    const option = {
      ...this.defaultOptions,
      color: this.colorPalette,
      xAxis: {
        type: "category",
        data: data.labels,
        axisLine: { lineStyle: { color: "var(--stats-border-color)" } },
        axisLabel: { color: "var(--stats-text-secondary)" },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "var(--stats-border-color)" } },
        axisLabel: { color: "var(--stats-text-secondary)" },
        splitLine: {
          lineStyle: { color: "var(--stats-border-color)", opacity: 0.5 },
        },
      },
      series: data.datasets.map((dataset, index) => ({
        name: dataset.label,
        type: "line",
        data: dataset.data,
        smooth: true,
        lineStyle: {
          width: 3,
          color: dataset.borderColor || this.colorPalette[index],
        },
        itemStyle: {
          color: dataset.borderColor || this.colorPalette[index],
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
                    color:
                      dataset.backgroundColor ||
                      this.colorPalette[index] + "40",
                  },
                  {
                    offset: 1,
                    color:
                      dataset.backgroundColor ||
                      this.colorPalette[index] + "10",
                  },
                ],
              },
            }
          : null,
      })),
      ...customOptions,
    };

    chart.setOption(option);
    return chart;
  }

  /**
   * Crea un gráfico de barras
   * @param {HTMLElement} container - Elemento contenedor
   * @param {Object} data - Datos del gráfico
   * @param {Object} customOptions - Opciones personalizadas
   */
  async createBarChart(container, data, customOptions = {}) {
    const isEChartsAvailable = await this.validateECharts();
    if (!isEChartsAvailable) {
      console.error("❌ No se pudo cargar ECharts");
      return null;
    }

    const chart = echarts.init(container);

    const option = {
      ...this.defaultOptions,
      color: this.colorPalette,
      xAxis: {
        type: "category",
        data: data.labels,
        axisLine: { lineStyle: { color: "var(--stats-border-color)" } },
        axisLabel: { color: "var(--stats-text-secondary)" },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "var(--stats-border-color)" } },
        axisLabel: { color: "var(--stats-text-secondary)" },
        splitLine: {
          lineStyle: { color: "var(--stats-border-color)", opacity: 0.5 },
        },
      },
      series: data.datasets.map((dataset, index) => ({
        name: dataset.label,
        type: "bar",
        data: dataset.data,
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: dataset.backgroundColor || this.colorPalette[index],
              },
              {
                offset: 1,
                color:
                  (dataset.backgroundColor || this.colorPalette[index]) + "80",
              },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      })),
      ...customOptions,
    };

    chart.setOption(option);
    return chart;
  }

  /**
   * Crea un gráfico de barras horizontales
   * @param {HTMLElement} container - Elemento contenedor
   * @param {Object} data - Datos del gráfico
   * @param {Object} customOptions - Opciones personalizadas
   */
  async createHorizontalBarChart(container, data, customOptions = {}) {
    const isEChartsAvailable = await this.validateECharts();
    if (!isEChartsAvailable) {
      console.error("❌ No se pudo cargar ECharts");
      return null;
    }

    const chart = echarts.init(container);

    const option = {
      ...this.defaultOptions,
      color: this.colorPalette,
      grid: {
        left: "15%",
        right: "10%",
        top: "15%",
        bottom: "10%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "var(--stats-border-color)" } },
        axisLabel: { color: "var(--stats-text-secondary)" },
        splitLine: {
          lineStyle: { color: "var(--stats-border-color)", opacity: 0.5 },
        },
      },
      yAxis: {
        type: "category",
        data: data.labels,
        axisLine: { lineStyle: { color: "var(--stats-border-color)" } },
        axisLabel: { color: "var(--stats-text-secondary)" },
      },
      series: data.datasets.map((dataset, index) => ({
        name: dataset.label,
        type: "bar",
        data: dataset.data,
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              {
                offset: 0,
                color: dataset.backgroundColor || this.colorPalette[index],
              },
              {
                offset: 1,
                color:
                  (dataset.backgroundColor || this.colorPalette[index]) + "80",
              },
            ],
          },
          borderRadius: [0, 4, 4, 0],
        },
      })),
      ...customOptions,
    };

    chart.setOption(option);
    return chart;
  }

  /**
   * Crea un gráfico de pastel/dona
   * @param {HTMLElement} container - Elemento contenedor
   * @param {Object} data - Datos del gráfico
   * @param {Object} customOptions - Opciones personalizadas
   */
  async createPieChart(container, data, customOptions = {}) {
    const isEChartsAvailable = await this.validateECharts();
    if (!isEChartsAvailable) {
      console.error("❌ No se pudo cargar ECharts");
      return null;
    }

    const chart = echarts.init(container);

    const seriesData = data.labels.map((label, index) => ({
      name: label,
      value: data.datasets[0].data[index],
    }));

    const option = {
      ...this.defaultOptions,
      color: data.datasets[0].backgroundColor || this.colorPalette,
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        textStyle: { color: "#ffffff" },
        formatter: "{a} <br/>{b}: {c} ({d}%)",
      },
      legend: {
        orient: "horizontal",
        bottom: "5%",
        textStyle: {
          color: "var(--stats-text-secondary)",
          fontSize: 12,
        },
      },
      series: [
        {
          name: "Distribución",
          type: "pie",
          radius: customOptions.doughnut ? ["40%", "70%"] : "70%",
          center: ["50%", "45%"],
          data: seriesData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
          label: {
            show: true,
            formatter: "{b}: {d}%",
            color: "var(--stats-text-secondary)",
          },
          labelLine: {
            show: true,
            lineStyle: {
              color: "var(--stats-border-color)",
            },
          },
        },
      ],
      ...customOptions,
    };

    chart.setOption(option);
    return chart;
  }

  /**
   * Crea un gráfico de dona
   * @param {HTMLElement} container - Elemento contenedor
   * @param {Object} data - Datos del gráfico
   * @param {Object} customOptions - Opciones personalizadas
   */
  async createDoughnutChart(container, data, customOptions = {}) {
    const isEChartsAvailable = await this.validateECharts();
    if (!isEChartsAvailable) {
      console.error("❌ No se pudo cargar ECharts");
      return null;
    }

    return this.createPieChart(container, data, {
      ...customOptions,
      doughnut: true,
    });
  }

  /**
   * Crea un gráfico de área
   * @param {HTMLElement} container - Elemento contenedor
   * @param {Object} data - Datos del gráfico
   * @param {Object} customOptions - Opciones personalizadas
   */
  async createAreaChart(container, data, customOptions = {}) {
    const isEChartsAvailable = await this.validateECharts();
    if (!isEChartsAvailable) {
      console.error("❌ No se pudo cargar ECharts");
      return null;
    }

    const areaData = {
      ...data,
      datasets: data.datasets.map((dataset) => ({
        ...dataset,
        fill: true,
      })),
    };

    return this.createLineChart(container, areaData, customOptions);
  }

  /**
   * Actualiza los datos de un gráfico existente
   * @param {Object} chart - Instancia del gráfico ECharts
   * @param {Object} newData - Nuevos datos
   * @param {boolean} animate - Si debe animar la transición
   */
  updateChartData(chart, newData, animate = true) {
    if (!chart) {
      console.warn("❌ Intento de actualizar gráfico inexistente");
      return;
    }

    const currentOption = chart.getOption();

    // Actualizar datos según el tipo de gráfico
    if (currentOption.xAxis && currentOption.xAxis[0]) {
      // Gráfico con ejes X/Y
      if (newData.labels) {
        currentOption.xAxis[0].data = newData.labels;
      }

      if (newData.datasets) {
        currentOption.series = newData.datasets.map((dataset, index) => ({
          ...currentOption.series[index],
          data: dataset.data,
        }));
      }
    } else if (currentOption.series && currentOption.series[0].type === "pie") {
      // Gráfico de pastel/dona
      if (newData.labels && newData.datasets) {
        currentOption.series[0].data = newData.labels.map((label, index) => ({
          name: label,
          value: newData.datasets[0].data[index],
        }));
      }
    }

    chart.setOption(currentOption, {
      notMerge: false,
      lazyUpdate: false,
      silent: false,
    });
  }

  /**
   * Cambia el tipo de gráfico dinámicamente
   * @param {Object} chart - Instancia del gráfico
   * @param {string} newType - Nuevo tipo ('line', 'bar', 'pie', etc.)
   * @param {Object} data - Datos originales
   */
  changeChartType(chart, newType, data) {
    if (!chart) return;

    const container = chart.getDom();
    chart.dispose();

    let newChart;
    switch (newType) {
      case "line":
        newChart = this.createLineChart(container, data);
        break;
      case "bar":
        newChart = this.createBarChart(container, data);
        break;
      case "horizontal-bar":
        newChart = this.createHorizontalBarChart(container, data);
        break;
      case "pie":
        newChart = this.createPieChart(container, data);
        break;
      case "doughnut":
        newChart = this.createDoughnutChart(container, data);
        break;
      case "area":
        newChart = this.createAreaChart(container, data);
        break;
      default:
        console.warn(`Tipo de gráfico no soportado: ${newType}`);
        newChart = this.createLineChart(container, data);
    }

    return newChart;
  }

  /**
   * Aplica un tema a un gráfico
   * @param {Object} chart - Instancia del gráfico
   * @param {string} theme - Tema ('light' o 'dark')
   */
  applyTheme(chart, theme = "light") {
    if (!chart) return;

    const isDark = theme === "dark";
    const option = chart.getOption();

    // Actualizar colores según el tema
    const themeColors = {
      textColor: isDark ? "#f1f5f9" : "#1e293b",
      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
      backgroundColor: isDark
        ? "rgba(255, 255, 255, 0.9)"
        : "rgba(0, 0, 0, 0.8)",
    };

    // Actualizar estilos de texto
    if (option.textStyle) {
      option.textStyle.color = themeColors.textColor;
    }

    // Actualizar ejes
    if (option.xAxis) {
      option.xAxis.forEach((axis) => {
        if (axis.axisLine)
          axis.axisLine.lineStyle.color = themeColors.borderColor;
        if (axis.axisLabel) axis.axisLabel.color = themeColors.textColor;
      });
    }

    if (option.yAxis) {
      option.yAxis.forEach((axis) => {
        if (axis.axisLine)
          axis.axisLine.lineStyle.color = themeColors.borderColor;
        if (axis.axisLabel) axis.axisLabel.color = themeColors.textColor;
        if (axis.splitLine)
          axis.splitLine.lineStyle.color = themeColors.borderColor;
      });
    }

    // Actualizar leyenda
    if (option.legend) {
      option.legend.textStyle.color = themeColors.textColor;
    }

    // Actualizar tooltip
    if (option.tooltip) {
      option.tooltip.backgroundColor = themeColors.backgroundColor;
    }

    chart.setOption(option);
  }

  /**
   * Exporta un gráfico como imagen
   * @param {Object} chart - Instancia del gráfico
   * @param {string} filename - Nombre del archivo
   * @param {string} format - Formato ('png', 'jpeg')
   */
  exportChart(chart, filename = "chart", format = "png") {
    if (!chart) return;

    const url = chart.getDataURL({
      type: format,
      pixelRatio: 2,
      backgroundColor: "#fff",
    });

    const link = document.createElement("a");
    link.download = `${filename}.${format}`;
    link.href = url;
    link.click();
  }

  /**
   * Redimensiona un gráfico
   * @param {Object} chart - Instancia del gráfico
   */
  resizeChart(chart) {
    if (chart) {
      chart.resize();
    }
  }

  /**
   * Redimensiona todos los gráficos registrados
   */
  resizeAllCharts() {
    this.charts.forEach((chart) => {
      this.resizeChart(chart);
    });
  }

  /**
   * Destruye un gráfico y libera memoria
   * @param {Object} chart - Instancia del gráfico a destruir
   */
  destroyChart(chart) {
    if (chart) {
      chart.dispose();
    }
  }

  /**
   * Registra un gráfico para seguimiento
   * @param {string} id - ID del gráfico
   * @param {Object} chart - Instancia del gráfico
   */
  registerChart(id, chart) {
    this.charts.set(id, chart);
  }

  /**
   * Obtiene un gráfico registrado
   * @param {string} id - ID del gráfico
   */
  getChart(id) {
    return this.charts.get(id);
  }

  /**
   * Destruye todos los gráficos registrados
   */
  destroyAllCharts() {
    this.charts.forEach((chart, id) => {
      console.log(`🗑️ Destruyendo gráfico: ${id}`);
      this.destroyChart(chart);
    });
    this.charts.clear();
  }

  /**
   * Combina opciones de configuración
   * @param {...Object} options - Objetos de opciones a combinar
   */
  mergeOptions(...options) {
    return options.reduce((merged, option) => {
      return this.deepMerge(merged, option);
    }, {});
  }

  /**
   * Combina objetos de forma profunda
   * @param {Object} target - Objeto objetivo
   * @param {Object} source - Objeto fuente
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] !== null &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Genera colores con transparencia
   * @param {string} color - Color base
   * @param {number} alpha - Transparencia (0-1)
   */
  getColorWithAlpha(color, alpha = 0.2) {
    // Si el color ya tiene transparencia
    if (color.includes("rgba")) return color;

    // Convertir color hex a rgba
    if (color.startsWith("#")) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    return (
      color +
      Math.round(alpha * 255)
        .toString(16)
        .padStart(2, "0")
    );
  }

  /**
   * Configura responsividad automática
   */
  setupResponsiveCharts() {
    window.addEventListener("resize", () => {
      this.resizeAllCharts();
    });
  }
}
