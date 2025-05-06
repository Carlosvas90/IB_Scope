/**
 * UIController.js
 * Maneja la interacción del usuario con la interfaz y los eventos de la UI
 */

export class UIController {
  constructor(dataController, errorsTableController, themeController) {
    this.dataController = dataController;
    this.errorsTableController = errorsTableController;
    this.themeController = themeController;
    this.currentView = "errors-view";
  }

  /**
   * Inicializa el controlador de UI
   */
  async init() {
    try {
      // Inicializar dataController
      const dataInitialized = await this.dataController.init();
      if (!dataInitialized) {
        window.showToast("Error al inicializar los datos", "error");
        return false;
      }

      // Mostrar nombre de usuario
      this.updateUsername();

      // Inicializar tabla de errores
      this.errorsTableController.init();

      // Configurar eventos de navegación
      this.setupNavigation();

      // Configurar eventos de botones
      this.setupButtons();

      // Configurar eventos de filtros
      this.setupFilters();

      // Configurar actualización automática
      this.setupAutoRefresh();

      // Actualizar estadísticas iniciales
      this.updateStats();

      return true;
    } catch (error) {
      console.error("Error al inicializar el controlador de UI:", error);
      return false;
    }
  }

  /**
   * Actualiza el nombre de usuario en la UI
   */
  updateUsername() {
    const usernameElement = document.getElementById("username");
    if (usernameElement) {
      usernameElement.textContent = `Usuario: ${this.dataController.username}`;
    }
  }

  /**
   * Configura los eventos de navegación
   */
  setupNavigation() {
    const navLinks = document.querySelectorAll(".sidebar-nav a");

    navLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();

        // Remover clase active de todos los links
        navLinks.forEach((navLink) => navLink.classList.remove("active"));

        // Añadir clase active al link clickeado
        link.classList.add("active");

        // Obtener el ID de la vista
        const viewId = link.getAttribute("data-view");

        // Ocultar todas las vistas
        document.querySelectorAll(".view").forEach((view) => {
          view.classList.remove("active");
        });

        // Mostrar la vista seleccionada
        const selectedView = document.getElementById(viewId);
        if (selectedView) {
          selectedView.classList.add("active");
          this.currentView = viewId;

          // Si estamos en la vista de estadísticas, actualizar
          if (viewId === "stats-view") {
            this.loadStatsView();
          }
        }
      });
    });
  }

  /**
   * Configura los eventos de los botones
   */
  setupButtons() {
    // Botón de actualizar datos
    const refreshBtn = document.getElementById("refresh-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", async () => {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML =
          '<div class="loading-spinner"></div> Actualizando...';

        const success = await this.dataController.refreshData();

        refreshBtn.disabled = false;
        refreshBtn.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Actualizar';

        if (success) {
          window.showToast("Datos actualizados correctamente", "success");
          this.errorsTableController.updateTable();
          this.updateStats();
        } else {
          window.showToast("Error al actualizar los datos", "error");
        }
      });
    }

    // Botón de actualizar estadísticas
    const refreshStatsBtn = document.getElementById("refresh-stats-btn");
    if (refreshStatsBtn) {
      refreshStatsBtn.addEventListener("click", async () => {
        refreshStatsBtn.disabled = true;

        const success = await this.dataController.refreshData();

        refreshStatsBtn.disabled = false;

        if (success) {
          window.showToast("Datos actualizados correctamente", "success");
          this.loadStatsView();
        } else {
          window.showToast("Error al actualizar los datos", "error");
        }
      });
    }

    // Botón de exportar a CSV
    const exportBtn = document.getElementById("export-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        // Implementar exportación a CSV
        window.showToast("Exportación a CSV no implementada aún", "info");
      });
    }

    // Botón de guardar configuración
    const saveSettingsBtn = document.getElementById("save-settings-btn");
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener("click", () => {
        this.saveSettings();
      });
    }

    // Toggle de tema
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        this.themeController.toggleTheme();
      });
    }
  }

  /**
   * Configura los eventos de los filtros
   */
  setupFilters() {
    const statusFilters = document.querySelectorAll(
      'input[name="status-filter"]'
    );

    statusFilters.forEach((filter) => {
      filter.addEventListener("change", () => {
        if (filter.checked) {
          this.errorsTableController.setStatusFilter(filter.value);
          this.errorsTableController.updateTable();
        }
      });
    });
  }

  /**
   * Configura la actualización automática
   */
  setupAutoRefresh() {
    const autoRefreshSelect = document.getElementById("auto-refresh");

    if (autoRefreshSelect) {
      // Inicializar con el valor seleccionado
      const refreshTime = parseInt(autoRefreshSelect.value);
      this.dataController.setupAutoRefresh(refreshTime, () => {
        this.errorsTableController.updateTable();
        this.updateStats();
      });

      // Escuchar cambios
      autoRefreshSelect.addEventListener("change", () => {
        const refreshTime = parseInt(autoRefreshSelect.value);
        this.dataController.setupAutoRefresh(refreshTime, () => {
          this.errorsTableController.updateTable();
          this.updateStats();
        });

        window.showToast(
          `Actualización automática configurada cada ${refreshTime} segundos`,
          "info"
        );
      });
    }
  }

  /**
   * Actualiza las estadísticas en la vista de errores
   */
  updateStats() {
    const stats = this.dataController.getStatistics();

    // Actualizar estadísticas en la UI
    document.getElementById("total-errors").textContent = stats.total;
    document.getElementById("pending-errors").textContent = stats.pending;
    document.getElementById("done-errors").textContent = stats.done;
    document.getElementById("last-update").textContent =
      this.dataController.getLastUpdateFormatted();
  }

  /**
   * Carga la vista de estadísticas
   */
  loadStatsView() {
    const statsContent = document.getElementById("stats-content");

    if (statsContent) {
      // Por ahora solo mostramos un mensaje
      // Aquí se implementarán los gráficos con ECharts
      statsContent.innerHTML = "<p>Estadísticas en implementación...</p>";
    }
  }

  /**
   * Guarda la configuración
   */
  saveSettings() {
    const errorFilePath = document.getElementById("error-file-path").value;
    const themePreference = document.getElementById("theme-preference").value;

    // Guardar tema
    this.themeController.setTheme(themePreference);

    // Guardar ruta de archivo
    // Implementar guardado en configuración persistente

    window.showToast("Configuración guardada correctamente", "success");
  }
}
