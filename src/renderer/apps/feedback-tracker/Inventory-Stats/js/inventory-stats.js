/**
 * inventory-stats.js
 * Punto de entrada principal para la aplicación Inventory Stats
 */

// Configuración inicial de Chart.js para que use los colores de nuestro tema
Chart.defaults.color = getComputedStyle(document.documentElement)
  .getPropertyValue("--stats-text-color")
  .trim();
Chart.defaults.borderColor = getComputedStyle(document.documentElement)
  .getPropertyValue("--border-color")
  .trim();

// Clase principal para la aplicación
class InventoryStats {
  constructor() {
    this.currentPeriod = "today";
    this.charts = [];
    this.isLoading = true;

    // Inicializar la aplicación
    this.init();
  }

  async init() {
    try {
      // Configurar listeners de eventos
      this.setupEventListeners();

      // Cargar datos iniciales (vista "hoy")
      await this.loadData();

      // Inicializar la UI
      this.initUI();

      console.log("✅ Inventory Stats inicializado correctamente");
    } catch (error) {
      console.error("❌ Error al inicializar Inventory Stats:", error);
    }
  }

  setupEventListeners() {
    // Configurar filtros de fecha
    const dateFilters = document.querySelectorAll(".date-filter button");
    dateFilters.forEach((button) => {
      button.addEventListener("click", () => {
        // Actualizar botones activos
        dateFilters.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        // Actualizar periodo y recargar datos
        this.currentPeriod = button.dataset.period;
        this.loadData();
      });
    });

    // Escuchar cambios de tema
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        this.updateChartsTheme();
      });
  }

  async loadData() {
    try {
      this.setLoading(true);

      // Aquí cargaríamos datos reales desde la API o servicio
      // Por ahora usamos datos de ejemplo
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simular carga

      const data = this.getMockData();

      // Actualizar gráficos con los nuevos datos
      this.updateCharts(data);

      this.setLoading(false);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      this.setLoading(false);
    }
  }

  initUI() {
    // Mostrar contenedor de gráficos
    document.querySelector(".loading-container").style.display = "none";
    document.querySelector(".charts-container").style.display = "grid";

    // En una implementación real, aquí crearíamos los gráficos iniciales
    this.createExampleChart();
  }

  setLoading(isLoading) {
    this.isLoading = isLoading;
    document.querySelector(".loading-container").style.display = isLoading
      ? "flex"
      : "none";
    document.querySelector(".charts-container").style.display = isLoading
      ? "none"
      : "grid";
  }

  updateCharts(data) {
    // Actualizar cada gráfico con nuevos datos
    // En una implementación completa, esto actualizaría todos los gráficos activos
  }

  updateChartsTheme() {
    // Actualizar colores de gráficos cuando cambie el tema
    Chart.defaults.color = getComputedStyle(document.documentElement)
      .getPropertyValue("--stats-text-color")
      .trim();
    Chart.defaults.borderColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--border-color")
      .trim();

    // Actualizar cada gráfico
    this.charts.forEach((chart) => {
      chart.update();
    });
  }

  createExampleChart() {
    // Eliminar placeholder
    const chartsContainer = document.querySelector(".charts-container");
    chartsContainer.innerHTML = "";

    // Crear bloque para el gráfico
    const chartBlock = document.createElement("div");
    chartBlock.className = "chart-block";
    chartBlock.innerHTML = `
      <div class="chart-header">
        <h3 class="chart-title">Gráfico de Ejemplo</h3>
        <div class="chart-controls">
          <button class="btn btn-icon" title="Configurar">⚙️</button>
          <button class="btn btn-icon" title="Expandir">🔍</button>
        </div>
      </div>
      <div class="chart-canvas-container">
        <canvas id="example-chart"></canvas>
      </div>
    `;

    chartsContainer.appendChild(chartBlock);

    // Crear gráfico de ejemplo
    const ctx = document.getElementById("example-chart").getContext("2d");
    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [
          "Categoría 1",
          "Categoría 2",
          "Categoría 3",
          "Categoría 4",
          "Categoría 5",
        ],
        datasets: [
          {
            label: "Errores por Categoría",
            data: [12, 19, 3, 5, 2],
            backgroundColor: [
              getComputedStyle(document.documentElement).getPropertyValue(
                "--chart-color-1"
              ),
              getComputedStyle(document.documentElement).getPropertyValue(
                "--chart-color-2"
              ),
              getComputedStyle(document.documentElement).getPropertyValue(
                "--chart-color-3"
              ),
              getComputedStyle(document.documentElement).getPropertyValue(
                "--chart-color-4"
              ),
              getComputedStyle(document.documentElement).getPropertyValue(
                "--chart-color-5"
              ),
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });

    // Guardar referencia al gráfico
    this.charts.push(chart);
  }

  getMockData() {
    // Datos de ejemplo según el periodo seleccionado
    switch (this.currentPeriod) {
      case "week":
        return {
          labels: [
            "Lunes",
            "Martes",
            "Miércoles",
            "Jueves",
            "Viernes",
            "Sábado",
            "Domingo",
          ],
          values: [10, 15, 8, 12, 20, 5, 3],
        };
      case "month":
        return {
          labels: ["Semana 1", "Semana 2", "Semana 3", "Semana 4"],
          values: [45, 52, 38, 41],
        };
      default: // today
        return {
          labels: ["Mañana", "Tarde", "Noche"],
          values: [8, 12, 5],
        };
    }
  }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  window.inventoryStats = new InventoryStats();
});
