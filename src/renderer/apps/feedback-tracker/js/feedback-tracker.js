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
let isLoading = true; // Controlar estado de carga

// Función global de inicialización que será llamada por el app-loader
window.initFeedbackTracker = function (view) {
  console.log("Inicializando Feedback Tracker", view);

  // Mostrar pantalla de carga inmediatamente
  showLoadingScreen();

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

  // Registrar callback para cuando terminen de cargar los datos
  dataService.onRefresh((errors) => {
    // Ocultar pantalla de carga cuando los datos estén listos
    hideLoadingScreen();
  });

  // Cargar datos iniciales
  loadData();

  // Cambiar a la vista solicitada
  if (view) {
    changeView(view);
  }

  return true;
};

/**
 * Muestra una pantalla de carga mientras se cargan los datos
 */
function showLoadingScreen() {
  // Evitar duplicados
  if (document.getElementById("data-loading-overlay")) return;

  // Buscar el contenedor de la aplicación Feedback Tracker
  // Primero intentar con errors-view (vista principal)
  let appContainer = document.getElementById("errors-view");

  // Si no existe, buscar cualquier vista activa
  if (!appContainer) {
    appContainer = document.querySelector(".view.active");
  }

  // Si sigue sin existir, buscar el contenedor main-content
  if (!appContainer) {
    appContainer = document.querySelector(".main-content");
  }

  if (!appContainer) return; // No se encontró ningún contenedor adecuado

  // Crear overlay de carga
  const loadingOverlay = document.createElement("div");
  loadingOverlay.className = "loading-overlay";
  loadingOverlay.id = "data-loading-overlay";
  loadingOverlay.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">Cargando datos...</p>
      <p class="loading-subtext">Este proceso puede tardar unos segundos en la primera carga</p>
    </div>
  `;

  // Posicionar correctamente el contenedor
  appContainer.style.position = "relative";

  // Añadir al contenedor de la aplicación
  appContainer.appendChild(loadingOverlay);

  // Añadir estilos si no existen
  if (!document.getElementById("loading-styles")) {
    const style = document.createElement("style");
    style.id = "loading-styles";
    style.textContent = `
      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: #FFFFFF; /* Color sólido (no transparente) */
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000; /* Mayor z-index para estar encima del contenido */
        animation: fadeIn 0.3s ease-in-out;
      }
      
      .loading-container {
        background-color: #F5F6F8; /* Color definido en vez de variable */
        border-radius: 8px;
        padding: 24px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        text-align: center;
        max-width: 80%;
      }
      
      .loading-spinner {
        border: 4px solid rgba(0, 120, 212, 0.2);
        border-radius: 50%;
        border-top: 4px solid #0078d4;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
        margin: 0 auto 16px auto;
      }
      
      .loading-text {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 8px;
        color: #333333; /* Color definido en vez de variable */
      }
      
      .loading-subtext {
        font-size: 14px;
        color: #666666; /* Color definido en vez de variable */
      }
      
      .fade-out {
        animation: fadeOut 0.3s ease-in-out forwards;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Marcar estado como cargando
  isLoading = true;
}

/**
 * Oculta la pantalla de carga
 */
function hideLoadingScreen() {
  const loadingOverlay = document.getElementById("data-loading-overlay");
  if (!loadingOverlay) return;

  // Añadir clase para animación de desvanecimiento
  loadingOverlay.classList.add("fade-out");

  // Eliminar después de la animación
  setTimeout(() => {
    if (loadingOverlay.parentNode) {
      loadingOverlay.parentNode.removeChild(loadingOverlay);
    }
  }, 300);

  // Marcar estado como no cargando
  isLoading = false;
}

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

      // Mostrar overlay de carga para actualizaciones manuales
      showLoadingScreen();

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

        // Ocultar pantalla de carga en caso de error
        hideLoadingScreen();
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

      // Ocultar pantalla de carga si ya hay datos
      hideLoadingScreen();
    } else {
      console.log("Intentando cargar datos desde el archivo...");
      await dataService.refreshData();
      // La pantalla de carga se ocultará mediante el callback onRefresh
    }

    // Actualizar tabla
    errorsTableController.updateTable();

    // Actualizar estadísticas
    updateStats();
  } catch (error) {
    console.error("Error al cargar datos:", error);
    window.showToast("Error al cargar datos iniciales", "error");

    // Ocultar pantalla de carga en caso de error
    hideLoadingScreen();
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
