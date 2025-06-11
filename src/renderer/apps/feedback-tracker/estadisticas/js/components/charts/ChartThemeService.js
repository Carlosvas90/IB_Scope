/**
 * ChartThemeService.js
 * Servicio especializado para manejar temas en gráficos
 * Se integra con el ThemeService del sistema
 */

export class ChartThemeService {
  constructor() {
    this.charts = new Set(); // Conjunto de gráficos registrados
    this.currentTheme = "light";
    this.listeners = new Set();

    // Configuración de temas
    this.themes = {
      light: {
        name: "light",
        backgroundColor: "#ffffff",
        textColor: "#333333",
        primaryColor: "#5470c6",
        axisColor: "#cccccc",
        gridColor: "#f0f0f0",
        borderColor: "#e0e0e0",
        tooltipBg: "#ffffff",
        tooltipBorder: "#cccccc",
        shadowColor: "rgba(0, 0, 0, 0.1)",
        palette: [
          "#5470c6",
          "#91cc75",
          "#fac858",
          "#ee6666",
          "#73c0de",
          "#3ba272",
          "#fc8452",
          "#9a60b4",
          "#ea7ccc",
          "#2e7cf8",
          "#45b7d1",
          "#f39c12",
        ],
      },
      dark: {
        name: "dark",
        backgroundColor: "#1a1a1a",
        textColor: "#ffffff",
        primaryColor: "#4992ff",
        axisColor: "#404040",
        gridColor: "#2d2d2d",
        borderColor: "#404040",
        tooltipBg: "#2d2d2d",
        tooltipBorder: "#404040",
        shadowColor: "rgba(255, 255, 255, 0.1)",
        palette: [
          "#4992ff",
          "#7cfc00",
          "#ffcc02",
          "#ff6b6b",
          "#4ecdc4",
          "#45b7d1",
          "#f39c12",
          "#9b59b6",
          "#e91e63",
          "#00bcd4",
          "#26de81",
          "#fd79a8",
        ],
      },
    };

    this.init();
    console.log("🎨 ChartThemeService inicializado");
  }

  /**
   * Inicializa el servicio de temas
   */
  init() {
    // Detectar tema inicial
    this.currentTheme = this.detectCurrentTheme();

    // Configurar listeners del sistema
    this.setupSystemListeners();

    // Intentar conectar con el ThemeService del sistema
    this.connectToSystemThemeService();
  }

  /**
   * Detecta el tema actual del sistema
   */
  detectCurrentTheme() {
    // Verificar data-theme attribute
    const dataTheme = document.documentElement.getAttribute("data-theme");
    if (dataTheme && this.themes[dataTheme]) {
      return dataTheme;
    }

    // Verificar clase dark-theme
    if (document.documentElement.classList.contains("dark-theme")) {
      return "dark";
    }

    // Verificar CSS custom property
    const computedStyle = getComputedStyle(document.documentElement);
    const cssTheme = computedStyle.getPropertyValue("--current-theme")?.trim();
    if (cssTheme && this.themes[cssTheme]) {
      return cssTheme;
    }

    // Verificar preferencia del sistema
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }

    return "light";
  }

  /**
   * Configura listeners para cambios de tema del sistema
   */
  setupSystemListeners() {
    // Listener para cambios en data-theme y clases
    if (typeof MutationObserver !== "undefined") {
      this.domObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            (mutation.attributeName === "data-theme" ||
              mutation.attributeName === "class")
          ) {
            const newTheme = this.detectCurrentTheme();
            if (newTheme !== this.currentTheme) {
              this.setTheme(newTheme);
            }
          }
        });
      });

      this.domObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme", "class"],
      });
    }

    // Listener para preferencias del sistema
    if (window.matchMedia) {
      this.systemMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      this.systemThemeHandler = (e) => {
        // Solo cambiar si no hay un tema explícito establecido
        if (
          !document.documentElement.getAttribute("data-theme") &&
          !document.documentElement.classList.contains("dark-theme")
        ) {
          const newTheme = e.matches ? "dark" : "light";
          if (newTheme !== this.currentTheme) {
            this.setTheme(newTheme);
          }
        }
      };

      this.systemMediaQuery.addListener(this.systemThemeHandler);
    }
  }

  /**
   * Intenta conectar con el ThemeService del sistema
   */
  connectToSystemThemeService() {
    // Buscar el ThemeService en el scope global
    if (window.inboundScope?.themeService) {
      const systemThemeService = window.inboundScope.themeService;
      console.log("🔗 Conectando con ThemeService del sistema");

      // Sincronizar tema inicial
      const systemTheme = systemThemeService.getCurrentTheme();
      if (systemTheme && systemTheme !== this.currentTheme) {
        this.setTheme(systemTheme);
      }

      // Escuchar cambios del sistema
      this.systemThemeServiceWatcher = () => {
        const newTheme = systemThemeService.getCurrentTheme();
        if (newTheme && newTheme !== this.currentTheme) {
          this.setTheme(newTheme);
        }
      };

      // Configurar polling para detectar cambios (fallback)
      this.systemThemePolling = setInterval(
        this.systemThemeServiceWatcher,
        1000
      );
    }
  }

  /**
   * Establece un tema
   */
  setTheme(themeName) {
    if (!this.themes[themeName]) {
      console.warn(`⚠️ Tema '${themeName}' no reconocido, usando 'light'`);
      themeName = "light";
    }

    const oldTheme = this.currentTheme;
    this.currentTheme = themeName;

    console.log(
      `🎨 Cambiando tema de gráficos de '${oldTheme}' a '${themeName}'`
    );

    // Notificar a todos los listeners
    this.notifyListeners(themeName, oldTheme);

    // Aplicar tema a todos los gráficos registrados
    this.applyThemeToCharts(themeName);
  }

  /**
   * Registra un gráfico para recibir actualizaciones de tema
   */
  registerChart(chart) {
    this.charts.add(chart);

    // Aplicar tema actual inmediatamente
    if (chart.applyTheme) {
      chart.applyTheme(this.currentTheme);
    }

    console.log(
      `📊 Gráfico registrado en ChartThemeService (${this.charts.size} total)`
    );
  }

  /**
   * Desregistra un gráfico
   */
  unregisterChart(chart) {
    this.charts.delete(chart);
    console.log(
      `📊 Gráfico desregistrado de ChartThemeService (${this.charts.size} restantes)`
    );
  }

  /**
   * Aplica tema a todos los gráficos registrados
   */
  applyThemeToCharts(themeName) {
    let successCount = 0;
    let errorCount = 0;

    this.charts.forEach((chart) => {
      try {
        if (chart.applyTheme && typeof chart.applyTheme === "function") {
          chart.applyTheme(themeName);
          successCount++;
        }
      } catch (error) {
        console.error("❌ Error aplicando tema a gráfico:", error);
        errorCount++;
      }
    });

    console.log(
      `✅ Tema aplicado: ${successCount} éxitos, ${errorCount} errores`
    );
  }

  /**
   * Añade un listener para cambios de tema
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remueve un listener
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notifica a todos los listeners sobre cambio de tema
   */
  notifyListeners(newTheme, oldTheme) {
    this.listeners.forEach((callback) => {
      try {
        callback({ newTheme, oldTheme, themes: this.themes });
      } catch (error) {
        console.error("❌ Error en listener de tema:", error);
      }
    });
  }

  /**
   * Obtiene el tema actual
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Obtiene la configuración del tema actual
   */
  getCurrentThemeConfig() {
    return this.themes[this.currentTheme];
  }

  /**
   * Obtiene la configuración de un tema específico
   */
  getThemeConfig(themeName) {
    return this.themes[themeName] || this.themes.light;
  }

  /**
   * Obtiene todos los temas disponibles
   */
  getAvailableThemes() {
    return Object.keys(this.themes);
  }

  /**
   * Alterna entre tema claro y oscuro
   */
  toggleTheme() {
    const newTheme = this.currentTheme === "light" ? "dark" : "light";
    this.setTheme(newTheme);
    return newTheme;
  }

  /**
   * Fuerza la actualización de todos los gráficos
   */
  refreshAllCharts() {
    console.log("🔄 Forzando actualización de tema en todos los gráficos...");
    this.applyThemeToCharts(this.currentTheme);
  }

  /**
   * Destruye el servicio y limpia recursos
   */
  destroy() {
    // Limpiar observers
    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
    }

    if (this.systemMediaQuery && this.systemThemeHandler) {
      this.systemMediaQuery.removeListener(this.systemThemeHandler);
      this.systemMediaQuery = null;
      this.systemThemeHandler = null;
    }

    if (this.systemThemePolling) {
      clearInterval(this.systemThemePolling);
      this.systemThemePolling = null;
    }

    // Limpiar colecciones
    this.charts.clear();
    this.listeners.clear();

    console.log("🗑️ ChartThemeService destruido");
  }
}

// Instancia singleton global
let chartThemeServiceInstance = null;

/**
 * Obtiene la instancia singleton del ChartThemeService
 */
export function getChartThemeService() {
  if (!chartThemeServiceInstance) {
    chartThemeServiceInstance = new ChartThemeService();
  }
  return chartThemeServiceInstance;
}

/**
 * Registra un gráfico para recibir actualizaciones de tema
 */
export function registerChartForTheme(chart) {
  const service = getChartThemeService();
  service.registerChart(chart);
}

/**
 * Desregistra un gráfico
 */
export function unregisterChartFromTheme(chart) {
  const service = getChartThemeService();
  service.unregisterChart(chart);
}
