/**
 * ChartService.js
 * Servicio para manejar todos los gráficos usando ECharts
 */

export class ChartService {
  constructor() {
    this.charts = {};
    this.theme = {
      colors: [
        "#5470c6",
        "#91cc75",
        "#fac858",
        "#ee6666",
        "#73c0de",
        "#3ba272",
        "#fc8452",
        "#9a60b4",
        "#ea7ccc",
      ],
      backgroundColor: "transparent",
    };
    console.log("📊 ChartService inicializado");

    // Verificar si ECharts está disponible
    this.checkEChartsAvailability();
  }

  /**
   * Verifica si ECharts está disponible
   */
  checkEChartsAvailability() {
    if (typeof echarts !== "undefined") {
      console.log("✅ ECharts está disponible:", echarts.version);
    } else {
      console.error("❌ ECharts no está disponible");
      // Intentar cargar ECharts dinámicamente
      this.loadECharts();
    }
  }

  /**
   * Carga ECharts dinámicamente si no está disponible
   */
  async loadECharts() {
    console.log("🔄 Intentando cargar ECharts dinámicamente...");

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js";
      script.onload = () => {
        console.log("✅ ECharts cargado dinámicamente");
        resolve();
      };
      script.onerror = () => {
        console.error("❌ Error cargando ECharts");
        reject(new Error("Error cargando ECharts"));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Inicializa un gráfico de tendencias temporales
   */
  initTrendChart(containerId, data, chartType = "line") {
    console.log(`📈 Inicializando gráfico de tendencias: ${containerId}`, data);

    // Verificar ECharts
    if (typeof echarts === "undefined") {
      console.error("❌ ECharts no está disponible para crear gráfico");
      return null;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ Container ${containerId} no encontrado`);
      return null;
    }

    console.log(`✅ Container encontrado: ${containerId}`, container);

    // Destruir gráfico existente si existe
    if (this.charts[containerId]) {
      console.log(`🗑️ Destruyendo gráfico existente: ${containerId}`);
      this.charts[containerId].dispose();
    }

    try {
      const chart = echarts.init(container);
      this.charts[containerId] = chart;

      console.log(`📊 Gráfico ECharts inicializado: ${containerId}`);

      const option = {
        title: {
          text: "Tendencias de Errores",
          left: "center",
          textStyle: { fontSize: 16, fontWeight: "bold" },
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "cross" },
        },
        legend: {
          data: data.series.map((s) => s.name),
          bottom: 10,
        },
        grid: {
          left: "3%",
          right: "4%",
          bottom: "15%",
          containLabel: true,
        },
        xAxis: {
          type: "category",
          data: data.dates,
          axisLabel: {
            rotate: 45,
            formatter: (value) => {
              const date = new Date(value.replace(/\//g, "-"));
              return date.toLocaleDateString("es-ES", {
                month: "short",
                day: "numeric",
              });
            },
          },
        },
        yAxis: {
          type: "value",
          name: "Cantidad de Errores",
        },
        series: data.series.map((serie, index) => ({
          name: serie.name,
          type: chartType,
          data: serie.data,
          smooth: chartType === "line",
          areaStyle: chartType === "area" ? {} : undefined,
          itemStyle: {
            color: this.theme.colors[index % this.theme.colors.length],
          },
        })),
      };

      chart.setOption(option);
      this.setupResponsive(chart);
      return chart;
    } catch (error) {
      console.error("❌ Error al inicializar gráfico de tendencias:", error);
      return null;
    }
  }

  /**
   * Inicializa un gráfico de distribución por estado (siempre dona)
   */
  initStatusChart(containerId, data) {
    console.log(`🥧 Inicializando gráfico de estado: ${containerId}`, data);

    // Verificar ECharts
    if (typeof echarts === "undefined") {
      console.error("❌ ECharts no está disponible para crear gráfico");
      return null;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ Container ${containerId} no encontrado`);
      return null;
    }

    console.log(`✅ Container encontrado: ${containerId}`, container);

    if (this.charts[containerId]) {
      console.log(`🗑️ Destruyendo gráfico existente: ${containerId}`);
      this.charts[containerId].dispose();
    }

    try {
      const chart = echarts.init(container);
      this.charts[containerId] = chart;

      console.log(`📊 Gráfico ECharts inicializado: ${containerId}`);

      const option = {
        title: {
          text: "Distribución por Estado",
          left: "center",
          textStyle: { fontSize: 16, fontWeight: "bold" },
        },
        tooltip: {
          trigger: "item",
          formatter: "{a} <br/>{b}: {c} ({d}%)",
        },
        legend: {
          orient: "vertical",
          left: "left",
          data: data.map((item) => item.name),
        },
        series: [
          {
            name: "Estado",
            type: "pie",
            radius: ["40%", "70%"], // Siempre dona
            center: ["50%", "50%"],
            data: data,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: "rgba(0, 0, 0, 0.5)",
              },
            },
            itemStyle: {
              color: (params) => {
                const colors = {
                  Pendientes: "#ee6666",
                  Resueltos: "#91cc75",
                };
                return (
                  colors[params.name] || this.theme.colors[params.dataIndex]
                );
              },
            },
          },
        ],
      };

      chart.setOption(option);
      this.setupResponsive(chart);
      console.log(`✅ Gráfico de estado configurado: ${containerId}`);
      return chart;
    } catch (error) {
      console.error("❌ Error al inicializar gráfico de estado:", error);
      return null;
    }
  }

  /**
   * Inicializa un gráfico de errores por hora
   */
  initHourlyChart(containerId, data, chartType = "bar") {
    console.log(`📊 Inicializando gráfico por hora: ${containerId}`, data);

    // Verificar ECharts
    if (typeof echarts === "undefined") {
      console.error("❌ ECharts no está disponible para crear gráfico");
      return null;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ Container ${containerId} no encontrado`);
      return null;
    }

    console.log(`✅ Container encontrado: ${containerId}`, container);

    if (this.charts[containerId]) {
      console.log(`🗑️ Destruyendo gráfico existente: ${containerId}`);
      this.charts[containerId].dispose();
    }

    try {
      const chart = echarts.init(container);
      this.charts[containerId] = chart;

      console.log(`📊 Gráfico ECharts inicializado: ${containerId}`);

      const option = {
        title: {
          text: "Errores por Hora del Día",
          left: "center",
          textStyle: { fontSize: 16, fontWeight: "bold" },
        },
        tooltip: {
          trigger: "axis",
          formatter: (params) => {
            const param = params[0];
            return `${param.name}<br/>Errores: ${param.value}`;
          },
        },
        grid: {
          left: "3%",
          right: "4%",
          bottom: "3%",
          containLabel: true,
        },
        xAxis: {
          type: "category",
          data: data.hours,
          axisLabel: {
            interval: 1,
            rotate: 45,
          },
        },
        yAxis: {
          type: "value",
          name: "Cantidad de Errores",
        },
        series: [
          {
            name: "Errores",
            type: chartType,
            data: data.data,
            smooth: chartType === "line",
            itemStyle: {
              color: (params) => {
                // Color más intenso para horas con más errores
                const maxValue = Math.max(...data.data);
                const intensity = params.value / maxValue;
                return `rgba(84, 112, 198, ${0.3 + intensity * 0.7})`;
              },
            },
          },
        ],
      };

      chart.setOption(option);
      this.setupResponsive(chart);
      console.log(`✅ Gráfico por hora configurado: ${containerId}`);
      return chart;
    } catch (error) {
      console.error("❌ Error al inicializar gráfico por hora:", error);
      return null;
    }
  }

  /**
   * Inicializa un gráfico de top productos/usuarios (siempre barras verticales)
   */
  initTopChart(containerId, data, title) {
    console.log(`📈 Inicializando gráfico top: ${containerId}`, data);

    // Verificar ECharts
    if (typeof echarts === "undefined") {
      console.error("❌ ECharts no está disponible para crear gráfico");
      return null;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ Container ${containerId} no encontrado`);
      return null;
    }

    console.log(`✅ Container encontrado: ${containerId}`, container);

    if (this.charts[containerId]) {
      console.log(`🗑️ Destruyendo gráfico existente: ${containerId}`);
      this.charts[containerId].dispose();
    }

    try {
      const chart = echarts.init(container);
      this.charts[containerId] = chart;

      console.log(`📊 Gráfico ECharts inicializado: ${containerId}`);

      const names = data.map((item) => item.name || item.userId || item.asin);
      const values = data.map((item) => item.value || item.total);

      const option = {
        title: {
          text: title,
          left: "center",
          textStyle: { fontSize: 16, fontWeight: "bold" },
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
        },
        grid: {
          left: "3%",
          right: "4%",
          bottom: "15%",
          containLabel: true,
        },
        xAxis: {
          type: "category",
          data: names,
          axisLabel: {
            rotate: 45,
            interval: 0,
          },
        },
        yAxis: {
          type: "value",
          name: "Cantidad de Errores",
        },
        series: [
          {
            name: "Errores",
            type: "bar",
            data: values,
            itemStyle: {
              color: (params) => {
                return this.theme.colors[
                  params.dataIndex % this.theme.colors.length
                ];
              },
            },
          },
        ],
      };

      chart.setOption(option);
      this.setupResponsive(chart);
      console.log(`✅ Gráfico top configurado: ${containerId}`);
      return chart;
    } catch (error) {
      console.error("❌ Error al inicializar gráfico top:", error);
      return null;
    }
  }

  /**
   * Inicializa un gráfico de violaciones
   */
  initViolationChart(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container ${containerId} no encontrado`);
      return null;
    }

    if (this.charts[containerId]) {
      this.charts[containerId].dispose();
    }

    const chart = echarts.init(container);
    this.charts[containerId] = chart;

    const option = {
      title: {
        text: "Distribución de Violaciones",
        left: "center",
        textStyle: { fontSize: 16, fontWeight: "bold" },
      },
      tooltip: {
        trigger: "item",
        formatter: "{a} <br/>{b}: {c} ({d}%)",
      },
      legend: {
        type: "scroll",
        orient: "vertical",
        right: 10,
        top: 20,
        bottom: 20,
        data: data.map((item) => item.name),
      },
      series: [
        {
          name: "Violaciones",
          type: "pie",
          radius: ["20%", "60%"],
          center: ["40%", "50%"],
          data: data,
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

    chart.setOption(option);
    this.setupResponsive(chart);
    return chart;
  }

  /**
   * Actualiza un gráfico existente con nuevos datos
   */
  updateChart(containerId, newData, chartType) {
    const chart = this.charts[containerId];
    if (!chart) {
      console.warn(`Gráfico ${containerId} no encontrado para actualizar`);
      return;
    }

    // Recrear el gráfico con los nuevos datos
    switch (containerId) {
      case "errors-trend-chart":
        this.initTrendChart(containerId, newData, chartType);
        break;
      case "status-distribution-chart":
        this.initStatusChart(containerId, newData);
        break;
      case "hourly-errors-chart":
        this.initHourlyChart(containerId, newData, chartType);
        break;
      case "top-products-chart":
        this.initTopChart(containerId, newData, "Top Productos con Errores");
        break;
      default:
        console.warn(`Tipo de gráfico no reconocido para ${containerId}`);
    }
  }

  /**
   * Configura responsividad para un gráfico
   */
  setupResponsive(chart) {
    const resizeHandler = () => {
      if (chart && !chart.isDisposed()) {
        chart.resize();
      }
    };

    window.addEventListener("resize", resizeHandler);

    // Limpiar listener cuando el gráfico se destruya
    const originalDispose = chart.dispose;
    chart.dispose = function () {
      window.removeEventListener("resize", resizeHandler);
      originalDispose.call(this);
    };
  }

  /**
   * Cambia el tipo de un gráfico específico
   */
  changeChartType(containerId, newType, data) {
    console.log(`🔄 Cambiando tipo de gráfico ${containerId} a ${newType}`);
    this.updateChart(containerId, data, newType);
  }

  /**
   * Destruye todos los gráficos
   */
  disposeAll() {
    Object.values(this.charts).forEach((chart) => {
      if (chart && !chart.isDisposed()) {
        chart.dispose();
      }
    });
    this.charts = {};
    console.log("🗑️ Todos los gráficos destruidos");
  }

  /**
   * Redimensiona todos los gráficos
   */
  resizeAll() {
    Object.values(this.charts).forEach((chart) => {
      if (chart && !chart.isDisposed()) {
        chart.resize();
      }
    });
  }

  /**
   * Obtiene un gráfico específico
   */
  getChart(containerId) {
    return this.charts[containerId];
  }

  /**
   * Verifica si un gráfico existe y está activo
   */
  hasChart(containerId) {
    const chart = this.charts[containerId];
    return chart && !chart.isDisposed();
  }

  /**
   * Inicializa un gráfico de distribución (errores o motivos)
   */
  initDistributionChart(containerId, data, title, chartType = "bar") {
    console.log(
      `📊 Inicializando gráfico de distribución: ${containerId}`,
      data
    );

    // Verificar ECharts
    if (typeof echarts === "undefined") {
      console.error("❌ ECharts no está disponible para crear gráfico");
      return null;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ Container ${containerId} no encontrado`);
      return null;
    }

    console.log(`✅ Container encontrado: ${containerId}`, container);

    if (this.charts[containerId]) {
      console.log(`🗑️ Destruyendo gráfico existente: ${containerId}`);
      this.charts[containerId].dispose();
    }

    try {
      const chart = echarts.init(container);
      this.charts[containerId] = chart;

      console.log(`📊 Gráfico ECharts inicializado: ${containerId}`);

      let option;

      if (chartType === "bar") {
        // Gráfico de barras
        const names = data.map((item) => item.name);
        const values = data.map((item) => item.value);

        option = {
          title: {
            text: title,
            left: "center",
            textStyle: { fontSize: 16, fontWeight: "bold" },
          },
          tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
          },
          grid: {
            left: "3%",
            right: "4%",
            bottom: "15%",
            containLabel: true,
          },
          xAxis: {
            type: "category",
            data: names,
            axisLabel: {
              rotate: 45,
              interval: 0,
            },
          },
          yAxis: {
            type: "value",
            name: "Cantidad",
          },
          series: [
            {
              name: "Cantidad",
              type: "bar",
              data: values,
              itemStyle: {
                color: (params) => {
                  return this.theme.colors[
                    params.dataIndex % this.theme.colors.length
                  ];
                },
              },
            },
          ],
        };
      } else if (chartType === "doughnut") {
        // Gráfico de dona
        option = {
          title: {
            text: title,
            left: "center",
            textStyle: { fontSize: 16, fontWeight: "bold" },
          },
          tooltip: {
            trigger: "item",
            formatter: "{a} <br/>{b}: {c} ({d}%)",
          },
          legend: {
            type: "scroll",
            orient: "vertical",
            right: 10,
            top: 20,
            bottom: 20,
            data: data.map((item) => item.name),
          },
          series: [
            {
              name: title,
              type: "pie",
              radius: ["40%", "70%"],
              center: ["40%", "50%"],
              data: data,
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
      } else if (chartType === "polar") {
        // Gráfico polar
        const names = data.map((item) => item.name);
        const values = data.map((item) => item.value);

        option = {
          title: {
            text: title,
            left: "center",
            textStyle: { fontSize: 16, fontWeight: "bold" },
          },
          tooltip: {
            trigger: "axis",
            axisPointer: { type: "cross" },
          },
          polar: {
            radius: [30, "80%"],
          },
          radiusAxis: {
            max: Math.max(...values) * 1.1,
          },
          angleAxis: {
            type: "category",
            data: names,
            startAngle: 90,
          },
          series: [
            {
              name: title,
              type: "bar",
              data: values,
              coordinateSystem: "polar",
              itemStyle: {
                color: (params) => {
                  return this.theme.colors[
                    params.dataIndex % this.theme.colors.length
                  ];
                },
              },
            },
          ],
        };
      }

      chart.setOption(option);
      this.setupResponsive(chart);
      console.log(`✅ Gráfico de distribución configurado: ${containerId}`);
      return chart;
    } catch (error) {
      console.error("❌ Error al inicializar gráfico de distribución:", error);
      return null;
    }
  }
}
