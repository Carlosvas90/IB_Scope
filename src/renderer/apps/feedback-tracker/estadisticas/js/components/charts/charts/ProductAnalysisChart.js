/**
 * ProductAnalysisChart.js
 * Gráfico especializado para análisis de productos
 * Muestra métricas y análisis específicos de productos
 */

import { BaseChart } from "../BaseChart.js";

export class ProductAnalysisChart extends BaseChart {
  constructor(containerId, options = {}) {
    super(containerId, "product-analysis", {
      title: "Análisis de Productos",
      responsive: true,
      exportable: true,
      defaultChartType: "bar",
      supportedTypes: ["bar", "line", "pie"],
      ...options,
    });

    this.currentChartType = options.chartType || "bar";
    console.log(
      `📦 ProductAnalysisChart inicializado para container: ${containerId}`
    );
  }

  /**
   * Implementa el método abstracto fetchData
   */
  async fetchData(params = {}) {
    try {
      const controller = window.estadisticasController;
      if (!controller || !controller.dataService) {
        console.warn("⚠️ Controller no disponible para ProductAnalysisChart");
        return [];
      }

      const productData = controller.processTopData();
      return productData;
    } catch (error) {
      console.error("❌ Error en ProductAnalysisChart.fetchData:", error);
      return [];
    }
  }

  /**
   * Genera la configuración específica para gráficos de análisis de productos
   */
  generateChartOptions(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn("⚠️ Datos incompletos para ProductAnalysisChart:", data);
      return this.getEmptyChartOptions();
    }

    const labels = data.map((item) => item.name || item.label || "Sin nombre");
    const values = data.map((item) => item.value || item.count || 0);

    return {
      title: {
        text: this.options.title,
        left: "center",
        textStyle: {
          fontSize: 16,
          fontWeight: "bold",
        },
      },
      tooltip: {
        trigger: "item",
        formatter: "{a} <br/>{b}: {c} ({d}%)",
      },
      legend: {
        orient: "vertical",
        left: "left",
        data: labels,
      },
      series: [
        {
          name: "Productos",
          type: "pie",
          radius: "50%",
          data: labels.map((label, index) => ({
            value: values[index],
            name: label,
          })),
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
}
