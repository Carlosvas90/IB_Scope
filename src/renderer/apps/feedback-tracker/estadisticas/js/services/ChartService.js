/**
 * ChartService.js
 * Servicio para manejar todos los gráficos usando ECharts
 */

export class ChartService {
  constructor() {
    this.charts = {};
    this.theme = {
      // Paleta de colores ordenada de más errores a menos errores
      colors: [
        "#020E28", // 1. Azul más oscuro (más errores)
        "#19345D", // 2. Azul muy oscuro
        "#2F5A91", // 3. Azul oscuro
        "#396EA2", // 4. Azul medio-oscuro
        "#4381B3", // 5. Azul medio
        "#74D7FB", // 6. Azul claro
        "#BAEBFD", // 7. Celeste claro
        "#DDF5FE", // 8. Celeste muy claro
        "#FFEBEC", // 9. Rosa claro
        "#FFC2C5", // 10. Rosa medio (menos errores)
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
        // Eliminado título duplicado que ya aparece en el HTML
        title: {
          show: false, // Ocultar título
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
          name: "Qty Errores",
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
        // Eliminado título duplicado que ya aparece en el HTML
        title: {
          show: false, // Ocultar título
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
                  Pendientes: "#ffa726", // Ámbar en lugar de rojo
                  Resueltos: "#91cc75", // Verde se mantiene igual
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
   * MODIFICADO: Ahora combina barras y líneas en un solo gráfico
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

      // Calcular promedio para la línea
      const average =
        data.data.reduce((sum, val) => sum + val, 0) / data.data.length;
      console.log(`📊 Promedio de errores por hora: ${average.toFixed(2)}`);

      const option = {
        // Eliminado título duplicado que ya aparece en el HTML
        title: {
          show: false, // Ocultar título
        },
        tooltip: {
          trigger: "axis",
          axisPointer: {
            type: "cross",
            label: {
              backgroundColor: "#6a7985",
            },
          },
          formatter: function (params) {
            let tooltip = `${params[0].name}<br/>`;
            params.forEach((param) => {
              tooltip += `${param.marker} ${param.seriesName}: ${param.value}<br/>`;
            });
            return tooltip;
          },
        },
        legend: {
          data: ["Errores", "Tendencia", "Promedio"],
          bottom: "0%",
        },
        grid: {
          left: "3%",
          right: "4%",
          bottom: "10%", // Aumentado para dar espacio a la leyenda
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
          name: "Qty Errores",
        },
        series: [
          {
            name: "Errores",
            type: "bar",
            data: data.data,
            itemStyle: {
              color: (params) => {
                // Color basado en la paleta de la app
                const maxValue = Math.max(...data.data);
                const intensity = params.value / maxValue;
                // Usar color 4381B3 (azul medio de la paleta) con opacidad variable
                return `rgba(67, 129, 179, ${0.4 + intensity * 0.6})`;
              },
            },
            barMaxWidth: 30,
            z: 10, // Para que las barras estén por encima de la línea
          },
          {
            name: "Tendencia",
            type: "line",
            smooth: true,
            data: data.data,
            symbolSize: 6,
            lineStyle: {
              width: 3,
              color: "#74D7FB", // Azul claro de la paleta (74D7FB)
            },
            itemStyle: {
              color: "#74D7FB", // Azul claro de la paleta (74D7FB)
            },
            z: 11, // Para que la línea esté por encima de las barras
          },
          {
            name: "Promedio",
            type: "line",
            data: new Array(24).fill(average),
            lineStyle: {
              color: "#2F5A91", // Azul oscuro de la paleta (2F5A91)
              type: "dashed",
              width: 2,
            },
            symbol: "none",
            tooltip: {
              formatter: `Promedio: ${average.toFixed(1)} errores/hora`,
            },
            // Asegurar que el color del indicador en la leyenda coincida con la línea
            itemStyle: {
              color: "#2F5A91", // Mismo color que la línea
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
        // Eliminado título duplicado que ya aparece en el HTML
        title: {
          show: false, // Ocultar título
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
          name: "Qty Errores",
        },
        series: [
          {
            name: "Errores",
            type: "bar",
            data: values,
            itemStyle: {
              color: (params) => {
                const totalItems = values.length;

                // Función para interpolar colores (generar colores intermedios)
                const interpolateColor = (color1, color2, factor) => {
                  // Convertir colores hex a RGB
                  const hex2rgb = (hex) => {
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return [r, g, b];
                  };

                  // Convertir RGB a hex
                  const rgb2hex = (r, g, b) => {
                    return (
                      "#" +
                      Math.round(r).toString(16).padStart(2, "0") +
                      Math.round(g).toString(16).padStart(2, "0") +
                      Math.round(b).toString(16).padStart(2, "0")
                    );
                  };

                  const c1 = hex2rgb(color1);
                  const c2 = hex2rgb(color2);

                  const r = c1[0] + factor * (c2[0] - c1[0]);
                  const g = c1[1] + factor * (c2[1] - c1[1]);
                  const b = c1[2] + factor * (c2[2] - c1[2]);

                  return rgb2hex(r, g, b);
                };

                // Los dos últimos elementos (menos errores) siempre son rosa
                if (params.dataIndex >= totalItems - 2) {
                  // Penúltimo: rosa claro
                  if (params.dataIndex === totalItems - 2) {
                    return "#FFEBEC";
                  }
                  // Último: rosa medio
                  else {
                    return "#FFC2C5";
                  }
                }
                // Para el resto, usar la escala de azules
                else {
                  // Si hay 10 o menos elementos, usar la paleta predefinida
                  if (totalItems <= 10) {
                    return this.theme.colors[params.dataIndex];
                  }
                  // Si hay más de 10, generar colores intermedios
                  else {
                    // Calculamos cuántos elementos azules tenemos (total - 2 rosas)
                    const blueElements = totalItems - 2;
                    // Tenemos 8 azules en la paleta original
                    const baseBlues = 8;

                    // Si es uno de los primeros 8, usar directamente de la paleta
                    if (params.dataIndex < baseBlues) {
                      return this.theme.colors[params.dataIndex];
                    }
                    // Para los azules adicionales, interpolar entre los existentes
                    else {
                      // Determinar entre qué colores interpolar
                      // Distribuir uniformemente los colores adicionales
                      const position =
                        (params.dataIndex - baseBlues) /
                        (blueElements - baseBlues);
                      // Encontrar los colores base entre los que interpolar
                      const segment = Math.floor(position * (baseBlues - 1));
                      const factor = position * (baseBlues - 1) - segment;

                      // Interpolar entre dos colores azules consecutivos
                      return interpolateColor(
                        this.theme.colors[segment],
                        this.theme.colors[segment + 1],
                        factor
                      );
                    }
                  }
                }
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
    // Ignorar el parámetro chartType, siempre usar "bar"
    chartType = "bar";
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
          // Eliminado título duplicado que ya aparece en el HTML
          title: {
            show: false, // Ocultar título
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
            name: "Qty",
          },
          series: [
            {
              name: "Qty",
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
          // Eliminado título duplicado que ya aparece en el HTML
          title: {
            show: false, // Ocultar título
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
          // Eliminado título duplicado que ya aparece en el HTML
          title: {
            show: false, // Ocultar título
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
