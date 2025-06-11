/**
 * ChartThemeExample.js
 * Ejemplo de uso del sistema de temas para gráficos
 */

import { getChartThemeService } from "./ChartThemeService.js";
import {
  TrendChart,
  StatusChart,
  HourlyChart,
  TopChart,
} from "./charts/index.js";

/**
 * Ejemplo completo del sistema de temas
 */
export class ChartThemeExample {
  constructor() {
    this.themeService = getChartThemeService();
    this.charts = [];
    this.containers = [];
  }

  /**
   * Inicializa el ejemplo
   */
  async init() {
    console.log("🎨 Inicializando ejemplo de temas para gráficos...");

    // Crear contenedores de ejemplo
    this.createExampleContainers();

    // Crear gráficos de ejemplo
    await this.createExampleCharts();

    // Configurar controles de tema
    this.setupThemeControls();

    // Configurar listeners
    this.setupEventListeners();

    console.log("✅ Ejemplo de temas inicializado");
  }

  /**
   * Crea contenedores de ejemplo en el DOM
   */
  createExampleContainers() {
    const exampleContainer = document.createElement("div");
    exampleContainer.id = "chart-theme-example";
    exampleContainer.innerHTML = `
      <div class="theme-example-header">
        <h3>🎨 Ejemplo de Temas para Gráficos</h3>
        <div class="theme-controls">
          <button id="theme-light" class="theme-btn active">☀️ Claro</button>
          <button id="theme-dark" class="theme-btn">🌙 Oscuro</button>
          <button id="theme-toggle" class="theme-btn">🔄 Alternar</button>
          <button id="theme-auto" class="theme-btn">🤖 Auto</button>
        </div>
      </div>
      
      <div class="charts-grid">
        <div class="chart-container">
          <h4>Tendencias</h4>
          <div id="example-trend-chart" style="width: 100%; height: 300px;"></div>
        </div>
        
        <div class="chart-container">
          <h4>Estado</h4>
          <div id="example-status-chart" style="width: 100%; height: 300px;"></div>
        </div>
        
        <div class="chart-container">
          <h4>Por Hora</h4>
          <div id="example-hourly-chart" style="width: 100%; height: 300px;"></div>
        </div>
        
        <div class="chart-container">
          <h4>Top Elementos</h4>
          <div id="example-top-chart" style="width: 100%; height: 300px;"></div>
        </div>
      </div>
      
      <div class="theme-info">
        <h4>📊 Información del Tema</h4>
        <div id="theme-info-content">
          <p>Tema actual: <span id="current-theme">light</span></p>
          <p>Gráficos registrados: <span id="charts-count">0</span></p>
          <p>Auto-detección: <span id="auto-detection">Activa</span></p>
        </div>
      </div>
    `;

    // Agregar estilos
    const styles = document.createElement("style");
    styles.textContent = `
      #chart-theme-example {
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .theme-example-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 15px;
        background: var(--bg-secondary, #f8f9fa);
        border-radius: 8px;
      }
      
      .theme-controls {
        display: flex;
        gap: 10px;
      }
      
      .theme-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        background: var(--bg-primary, #ffffff);
        color: var(--text-primary, #333333);
        cursor: pointer;
        transition: all 0.2s ease;
        border: 2px solid transparent;
      }
      
      .theme-btn:hover {
        background: var(--bg-hover, #e9ecef);
      }
      
      .theme-btn.active {
        background: var(--accent-color, #007bff);
        color: white;
      }
      
      .charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
      }
      
      .chart-container {
        background: var(--bg-primary, #ffffff);
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .chart-container h4 {
        margin: 0 0 10px 0;
        color: var(--text-primary, #333333);
      }
      
      .theme-info {
        background: var(--bg-secondary, #f8f9fa);
        padding: 15px;
        border-radius: 8px;
      }
      
      .theme-info h4 {
        margin: 0 0 10px 0;
        color: var(--text-primary, #333333);
      }
      
      #theme-info-content p {
        margin: 5px 0;
        color: var(--text-secondary, #666666);
      }
      
      #theme-info-content span {
        font-weight: bold;
        color: var(--accent-color, #007bff);
      }
    `;

    document.head.appendChild(styles);
    document.body.appendChild(exampleContainer);
  }

  /**
   * Crea gráficos de ejemplo
   */
  async createExampleCharts() {
    try {
      // Datos de ejemplo
      const trendData = {
        dates: [
          "2024-01-01",
          "2024-01-02",
          "2024-01-03",
          "2024-01-04",
          "2024-01-05",
        ],
        series: [
          { name: "Total", data: [120, 132, 101, 134, 90] },
          { name: "Críticos", data: [20, 25, 18, 30, 15] },
        ],
      };

      const statusData = [
        { name: "Resueltos", value: 45 },
        { name: "Pendientes", value: 30 },
        { name: "En Progreso", value: 25 },
      ];

      const hourlyData = [
        5, 3, 2, 1, 0, 1, 8, 15, 22, 25, 18, 12, 16, 20, 14, 10, 8, 6, 4, 3, 2,
        1, 1, 2,
      ];

      const topData = [
        { name: "Usuario A", value: 45 },
        { name: "Usuario B", value: 32 },
        { name: "Usuario C", value: 28 },
        { name: "Usuario D", value: 20 },
        { name: "Usuario E", value: 15 },
      ];

      // Crear gráficos
      const trendChart = new TrendChart("example-trend-chart", {
        title: "Tendencias de Errores",
        chartType: "line",
      });

      const statusChart = new StatusChart("example-status-chart", {
        title: "Distribución por Estado",
        chartType: "doughnut",
      });

      const hourlyChart = new HourlyChart("example-hourly-chart", {
        title: "Errores por Hora",
        chartType: "bar",
      });

      const topChart = new TopChart("example-top-chart", {
        title: "Top Usuarios",
        chartType: "horizontalBar",
      });

      // Renderizar gráficos
      await trendChart.initialize();
      await statusChart.initialize();
      await hourlyChart.initialize();
      await topChart.initialize();

      // Simular datos (los gráficos normalmente obtendrían datos de fetchData)
      trendChart.data = trendData;
      statusChart.data = statusData;
      hourlyChart.data = hourlyData;
      topChart.data = topData;

      await trendChart.createChart();
      await statusChart.createChart();
      await hourlyChart.createChart();
      await topChart.createChart();

      this.charts = [trendChart, statusChart, hourlyChart, topChart];

      console.log("📊 Gráficos de ejemplo creados:", this.charts.length);
    } catch (error) {
      console.error("❌ Error creando gráficos de ejemplo:", error);
    }
  }

  /**
   * Configura los controles de tema
   */
  setupThemeControls() {
    const lightBtn = document.getElementById("theme-light");
    const darkBtn = document.getElementById("theme-dark");
    const toggleBtn = document.getElementById("theme-toggle");
    const autoBtn = document.getElementById("theme-auto");

    if (lightBtn) {
      lightBtn.addEventListener("click", () => {
        this.themeService.setTheme("light");
        this.updateActiveButton("light");
      });
    }

    if (darkBtn) {
      darkBtn.addEventListener("click", () => {
        this.themeService.setTheme("dark");
        this.updateActiveButton("dark");
      });
    }

    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const newTheme = this.themeService.toggleTheme();
        this.updateActiveButton(newTheme);
      });
    }

    if (autoBtn) {
      autoBtn.addEventListener("click", () => {
        // Configurar tema automático basado en el sistema
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light";
        this.themeService.setTheme(systemTheme);
        this.updateActiveButton("auto");
      });
    }
  }

  /**
   * Actualiza el botón activo
   */
  updateActiveButton(theme) {
    document.querySelectorAll(".theme-btn").forEach((btn) => {
      btn.classList.remove("active");
    });

    const activeBtn = document.getElementById(`theme-${theme}`);
    if (activeBtn) {
      activeBtn.classList.add("active");
    }
  }

  /**
   * Configura listeners para eventos
   */
  setupEventListeners() {
    // Listener para cambios de tema
    this.themeService.addListener(({ newTheme, oldTheme }) => {
      console.log(`🎨 Tema cambiado de ${oldTheme} a ${newTheme}`);
      this.updateThemeInfo();
    });

    // Actualizar información inicial
    this.updateThemeInfo();

    // Actualizar cada segundo
    setInterval(() => {
      this.updateThemeInfo();
    }, 1000);
  }

  /**
   * Actualiza la información del tema en la UI
   */
  updateThemeInfo() {
    const currentThemeEl = document.getElementById("current-theme");
    const chartsCountEl = document.getElementById("charts-count");
    const autoDetectionEl = document.getElementById("auto-detection");

    if (currentThemeEl) {
      currentThemeEl.textContent = this.themeService.getCurrentTheme();
    }

    if (chartsCountEl) {
      chartsCountEl.textContent = this.themeService.charts.size;
    }

    if (autoDetectionEl) {
      const hasObserver = this.themeService.domObserver !== null;
      autoDetectionEl.textContent = hasObserver ? "Activa" : "Inactiva";
    }
  }

  /**
   * Demuestra cambios de tema programáticos
   */
  async demonstrateThemes() {
    console.log("🎭 Demostrando cambios de tema...");

    const themes = ["light", "dark"];

    for (const theme of themes) {
      console.log(`Aplicando tema: ${theme}`);
      this.themeService.setTheme(theme);
      this.updateActiveButton(theme);

      // Esperar un momento para ver el cambio
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log("✅ Demostración de temas completada");
  }

  /**
   * Destruye el ejemplo y limpia recursos
   */
  destroy() {
    // Destruir gráficos
    this.charts.forEach((chart) => {
      chart.destroy();
    });

    // Limpiar DOM
    const exampleContainer = document.getElementById("chart-theme-example");
    if (exampleContainer) {
      exampleContainer.remove();
    }

    console.log("🗑️ Ejemplo de temas destruido");
  }
}

// Función para usar en la consola del navegador
window.ChartThemeExample = ChartThemeExample;

// Ejemplo de uso
export async function runChartThemeExample() {
  const example = new ChartThemeExample();
  await example.init();

  // Demostrar temas después de 3 segundos
  setTimeout(() => {
    example.demonstrateThemes();
  }, 3000);

  return example;
}

// Auto-ejecutar si está en modo desarrollo
if (
  typeof window !== "undefined" &&
  window.location.search.includes("theme-example")
) {
  runChartThemeExample();
}
