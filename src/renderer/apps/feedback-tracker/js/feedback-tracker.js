/**
 * feedback-tracker.js
 * Script principal para la aplicación de Feedback Tracker
 */

// Importar controladores
import { ErrorsTableController } from "./controllers/ErrorsTableController.js";
import { FeedbackModalController } from "./controllers/FeedbackModalController.js";

// Variable para almacenar referencia al router
let appRouter = null;

// Controladores globales
let dataService = null;
let errorsTableController = null;
let feedbackModalController = null; // Controlador para el modal de feedback
let currentView = "errors";

// Función global de inicialización que será llamada por el app-loader
window.initFeedbackTracker = function (view) {
  console.log("Inicializando Feedback Tracker", view);

  // Intentar obtener router del window global
  if (window.router) {
    appRouter = window.router;
    console.log("Router para Feedback Tracker encontrado globalmente");
  } else {
    console.warn("Router no disponible globalmente en Feedback Tracker");
  }

  // Obtener servicios compartidos del objeto global
  if (window.inboundScope && window.inboundScope.dataService) {
    dataService = window.inboundScope.dataService;
    console.log("DataService obtenido desde inboundScope");
  } else {
    // Si no está disponible, crear una instancia temporal
    console.warn(
      "DataService no encontrado en inboundScope, usando simulación"
    );
    dataService = {
      errors: [],
      refreshData: async () => {
        return false;
      },
      getStatistics: () => {
        return { total: 0, pending: 0, done: 0 };
      },
      getLastUpdateFormatted: () => {
        return "No disponible";
      },
    };
  }

  // Inicializar controladores
  initControllers();

  // Configurar eventos
  setupEvents();

  // Cargar datos iniciales
  loadData();

  // Cambiar a la vista solicitada
  if (view) {
    changeView(view);
  }

  return true;
};

/**
 * Inicializa los controladores
 */
function initControllers() {
  // Inicializar controlador de tabla de errores
  errorsTableController = new ErrorsTableController(dataService);
  errorsTableController.init();

  // Inicializar controlador del modal de feedback
  feedbackModalController = new FeedbackModalController(dataService);
  feedbackModalController.init();

  // Hacer accesible el controlador de modal globalmente para uso desde otros componentes
  window.feedbackModalController = feedbackModalController;
}

/**
 * Configura los eventos de la interfaz
 */
function setupEvents() {
  // Botón de actualizar
  const refreshBtn = document.getElementById("refresh-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.disabled = true;

      try {
        // Actualizar datos
        await dataService.refreshData();

        // Actualizar tabla
        errorsTableController.updateTable();

        // Actualizar estadísticas
        updateStats();

        window.showToast("Datos actualizados correctamente", "success");
      } catch (error) {
        console.error("Error al actualizar datos:", error);
        window.showToast("Error al actualizar datos", "error");
      } finally {
        refreshBtn.disabled = false;
      }
    });
  }

  // Filtros
  const statusFilters = document.querySelectorAll(
    'input[name="status-filter"]'
  );
  statusFilters.forEach((filter) => {
    filter.addEventListener("change", () => {
      if (filter.checked) {
        errorsTableController.setStatusFilter(filter.value);
        errorsTableController.updateTable();
      }
    });
  });

  // Botón de exportar a CSV
  const exportBtn = document.getElementById("export-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", async () => {
      try {
        const result = await dataService.exportToCsv(
          errorsTableController.statusFilter
        );

        if (result.success) {
          window.showToast(`Datos exportados a: ${result.filePath}`, "success");
        } else {
          window.showToast(`Error al exportar datos: ${result.error}`, "error");
        }
      } catch (error) {
        console.error("Error al exportar datos:", error);
        window.showToast("Error al exportar datos", "error");
      }
    });
  }
}

/**
 * Carga los datos iniciales
 */
async function loadData() {
  try {
    // Verificar si ya hay datos cargados
    if (dataService.errors && dataService.errors.length > 0) {
      console.log(
        "Usando datos ya cargados -",
        dataService.errors.length,
        "errores"
      );
    } else {
      console.log("Intentando cargar datos desde el archivo...");
      await dataService.refreshData();
    }

    // Actualizar tabla
    errorsTableController.updateTable();

    // Actualizar estadísticas
    updateStats();
  } catch (error) {
    console.error("Error al cargar datos:", error);
    window.showToast("Error al cargar datos iniciales", "error");
  }
}

/**
 * Actualiza las estadísticas mostradas
 */
function updateStats() {
  try {
    // Obtener estadísticas
    const stats = dataService.getStatistics();

    // Actualizar contadores
    const totalElement = document.getElementById("total-errors");
    const pendingElement = document.getElementById("pending-errors");
    const doneElement = document.getElementById("done-errors");
    const lastUpdateElement = document.getElementById("last-update");

    if (totalElement) totalElement.textContent = stats.total;
    if (pendingElement) pendingElement.textContent = stats.pending;
    if (doneElement) doneElement.textContent = stats.done;
    if (lastUpdateElement)
      lastUpdateElement.textContent = dataService.getLastUpdateFormatted();
  } catch (error) {
    console.error("Error al actualizar estadísticas:", error);
  }
}

/**
 * Cambia a una vista específica
 */
function changeView(viewName) {
  // Verificar vista solicitada
  if (!["errors", "stats", "settings"].includes(viewName)) {
    console.error("Vista no válida:", viewName);
    return false;
  }

  // Ocultar todas las vistas
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.remove("active");
  });

  // Mostrar vista solicitada
  const view = document.getElementById(`${viewName}-view`);
  if (view) {
    view.classList.add("active");
    currentView = viewName;

    return true;
  }

  return false;
}

// Exportar funciones públicas para uso externo
export { loadData, updateStats, changeView };
