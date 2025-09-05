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
  dataService.onRefresh((data) => {
    console.log("onRefresh callback ejecutado con status:", data.status);
    // Verificar si hay un estado especial
    if (data.status === "no_errors_found") {
      console.log(
        "Mostrando mensaje de No hay errores debido a status:",
        data.status
      );
      // Mostrar mensaje de "No hay errores"
      showNoErrorsMessage();
    } else {
      // Comportamiento normal: ocultar pantalla de carga cuando los datos estén listos
      hideLoadingScreen();
    }
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
 * Muestra un mensaje de que no hay errores disponibles hoy y un botón para reintentar
 */
function showNoErrorsMessage() {
  // Buscar si ya existe el overlay
  let loadingOverlay = document.getElementById("data-loading-overlay");

  // Si no existe, crear uno nuevo
  if (!loadingOverlay) {
    showLoadingScreen();
    loadingOverlay = document.getElementById("data-loading-overlay");
  }

  if (!loadingOverlay) return; // No se pudo crear/encontrar

  // Reemplazar el contenido del overlay
  const loadingContainer = loadingOverlay.querySelector(".loading-container");
  if (loadingContainer) {
    loadingContainer.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0078d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
      </svg>
      <p class="loading-text">No se encontraron errores para hoy</p>
      <p class="loading-subtext">No hay registro de errores para el día actual</p>
      <button id="retry-load-btn" class="btn btn-primary" style="margin-top: 16px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 4v6h-6"></path>
          <path d="M1 20v-6h6"></path>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
        Buscar errores nuevamente
      </button>
      <p class="loading-subtext" style="margin-top: 10px;">Se reintentará automáticamente en <span id="retry-countdown">300</span> segundos</p>
    `;

    // Configurar el evento del botón de reintentar
    const retryBtn = loadingContainer.querySelector("#retry-load-btn");
    if (retryBtn) {
      retryBtn.addEventListener("click", handleRetryClick);
    }

    // Iniciar el contador de tiempo para auto-reintentar
    startRetryCountdown();
  }
}

/**
 * Maneja el clic en el botón de reintentar
 */
function handleRetryClick() {
  // Detener cualquier contador existente
  stopRetryCountdown();

  // Mostrar la pantalla de carga normal
  const loadingOverlay = document.getElementById("data-loading-overlay");
  if (loadingOverlay) {
    const loadingContainer = loadingOverlay.querySelector(".loading-container");
    if (loadingContainer) {
      loadingContainer.innerHTML = `
        <div class="loading-spinner"></div>
        <p class="loading-text">Cargando datos...</p>
        <p class="loading-subtext">Buscando archivo de errores...</p>
      `;
    }
  }

  // Reintento explícito de carga de datos
  loadData(true);
}

// Variable para el intervalo del contador
let retryCountdownInterval = null;

/**
 * Inicia el contador para reintentar automáticamente
 */
function startRetryCountdown() {
  // Detener cualquier contador previo
  stopRetryCountdown();

  let seconds = 300; // 5 minutos
  const countdownElement = document.getElementById("retry-countdown");

  if (countdownElement) {
    countdownElement.textContent = seconds;

    retryCountdownInterval = setInterval(() => {
      seconds--;
      if (countdownElement) {
        countdownElement.textContent = seconds;
      }

      if (seconds <= 0) {
        stopRetryCountdown();
        handleRetryClick(); // Reintentar automáticamente al llegar a cero
      }
    }, 1000);
  }
}

/**
 * Detiene el contador de reintento
 */
function stopRetryCountdown() {
  if (retryCountdownInterval) {
    clearInterval(retryCountdownInterval);
    retryCountdownInterval = null;
  }
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
        // Actualizar datos (indicando que debe mostrar mensaje si no encuentra errores)
        const result = await dataService.refreshData(true);

        // Evaluar el resultado
        if (result.status === "no_errors_found") {
          // Ya se mostrará el mensaje mediante el callback onRefresh
          window.showToast("No se encontraron errores para hoy", "info");
        } else if (result.success) {
          // Actualizar tabla
          errorsTableController.updateTable();

          // Actualizar estadísticas
          updateStats();

          // Actualizar dropdowns
          updateLoginDropdown();
          updateErrorDropdown();

          window.showToast("Datos actualizados correctamente", "success");
        } else {
          window.showToast(
            `No se pudieron cargar los datos: ${result.status}`,
            "warning"
          );
        }
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

  // Filtros de botones (reemplazar los radio buttons)
  const filterButtons = document.querySelectorAll(".filter-btn");
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filterType = button.getAttribute("data-filter");
      const filterValue = button.getAttribute("data-value");

      // Remover clase active de otros botones del mismo grupo
      const siblingButtons =
        button.parentElement.querySelectorAll(".filter-btn");
      siblingButtons.forEach((btn) => btn.classList.remove("active"));

      // Agregar clase active al botón clickeado
      button.classList.add("active");

      // Aplicar filtro según el tipo
      if (filterType === "status") {
        errorsTableController.setStatusFilter(filterValue);
      } else if (filterType === "shift") {
        errorsTableController.setShiftFilter(filterValue);
        // Actualizar dropdowns cuando cambia el turno
        updateLoginDropdown();
        updateErrorDropdown();
      }

      errorsTableController.updateTable();
    });
  });

  // Filtro por login (dropdown)
  const loginFilter = document.getElementById("login-filter");
  if (loginFilter) {
    loginFilter.addEventListener("change", () => {
      errorsTableController.setLoginFilter(loginFilter.value);
      // Actualizar dropdown de errores cuando cambia el login
      updateErrorDropdown();
      errorsTableController.updateTable();
    });
  }

  // Filtro por tipo de error (dropdown)
  const errorFilter = document.getElementById("error-filter");
  if (errorFilter) {
    errorFilter.addEventListener("change", () => {
      errorsTableController.setErrorFilter(errorFilter.value);
      errorsTableController.updateTable();
    });
  }

  // Inicializar dropdowns
  updateLoginDropdown();
  updateErrorDropdown();

  // Botón de exportar a CSV
  const exportBtn = document.getElementById("export-btn");
  if (exportBtn) {
    // Limpiar event listeners anteriores para evitar duplicación
    const newExportBtn = exportBtn.cloneNode(true);
    exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);

    let isExporting = false; // Flag para prevenir múltiples ejecuciones

    newExportBtn.addEventListener("click", async () => {
      if (isExporting) {
        console.log("🚫 Exportación ya en progreso, ignorando clic adicional");
        return;
      }

      isExporting = true;
      newExportBtn.disabled = true;
      newExportBtn.textContent = "Exportando...";

      try {
        console.log("📤 Iniciando exportación a CSV...");
        const result = await dataService.exportToCsv(
          errorsTableController.statusFilter
        );

        if (result.success) {
          window.showToast(`Datos exportados a: ${result.filePath}`, "success");
          console.log("✅ Exportación exitosa:", result.filePath);
        } else {
          window.showToast(`Error al exportar datos: ${result.error}`, "error");
          console.error("❌ Error en exportación:", result.error);
        }
      } catch (error) {
        console.error("💥 Error al exportar datos:", error);
        window.showToast("Error inesperado al exportar datos", "error");
      } finally {
        isExporting = false;
        newExportBtn.disabled = false;
        newExportBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Exportar a CSV
        `;
      }
    });
  }
}

/**
 * Carga los datos iniciales
 * @param {boolean} isRetry - Indica si es un intento de recarga
 */
async function loadData(isRetry = false) {
  try {
    console.log("loadData iniciado, isRetry:", isRetry);

    // Verificar si ya hay datos cargados
    if (!isRetry && dataService.errors && dataService.errors.length > 0) {
      console.log(
        "Usando datos ya cargados -",
        dataService.errors.length,
        "errores"
      );

      // Ocultar pantalla de carga si ya hay datos
      hideLoadingScreen();
    } else {
      console.log("Intentando cargar datos desde el archivo...");
      // Indicar que debe mostrar mensaje de "No hay errores" si corresponde
      const result = await dataService.refreshData(true);

      console.log("loadData: Resultado de refreshData:", result);

      // Si el resultado indica que no se encontraron errores, mostrar mensaje adecuado
      if (result.status === "no_errors_found") {
        console.log("loadData: Detectado status especial:", result.status);
        // La pantalla de carga se modificará para mostrar mensaje de "No hay errores"
        showNoErrorsMessage();
        return; // Salir temprano, no actualizar tabla ni stats
      }
      // En otros casos, la pantalla de carga se ocultará mediante el callback onRefresh
    }

    // Actualizar tabla solo si hay datos
    if (dataService.errors && dataService.errors.length > 0) {
      errorsTableController.updateTable();
      // Actualizar estadísticas
      updateStats();
      // Actualizar dropdowns
      updateLoginDropdown();
      updateErrorDropdown();
    }
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
 * Actualiza el dropdown de filtro por login basado en el turno seleccionado
 */
function updateLoginDropdown() {
  const loginFilter = document.getElementById("login-filter");
  if (!loginFilter || !dataService.errors) return;

  try {
    // Obtener el turno actualmente seleccionado
    const activeShiftButton = document.querySelector(
      '.filter-btn[data-filter="shift"].active'
    );
    const currentShift = activeShiftButton
      ? activeShiftButton.getAttribute("data-value")
      : "day";

    // Obtener usuarios con conteo de errores para el turno seleccionado
    const usersWithCount = dataService.getUsersWithErrorCount(currentShift);

    // Guardar el valor seleccionado actualmente
    const currentValue = loginFilter.value;

    // Limpiar opciones existentes
    loginFilter.innerHTML = '<option value="all">Todos los usuarios</option>';

    // Agregar opciones de usuarios ordenadas por cantidad de errores
    usersWithCount.forEach(({ userId, count }) => {
      const option = document.createElement("option");
      option.value = userId;
      option.textContent = `${userId} (${count})`;
      loginFilter.appendChild(option);
    });

    // Restaurar valor seleccionado si aún existe
    if (
      currentValue !== "all" &&
      usersWithCount.some((user) => user.userId === currentValue)
    ) {
      loginFilter.value = currentValue;
    } else {
      loginFilter.value = "all";
      // Si el valor no existe más, resetear el filtro del controlador
      if (errorsTableController) {
        errorsTableController.setLoginFilter("all");
      }
    }
  } catch (error) {
    console.error("Error al actualizar dropdown de login:", error);
  }
}

/**
 * Actualiza el dropdown de filtro por error basado en el turno y login seleccionados
 */
function updateErrorDropdown() {
  const errorFilter = document.getElementById("error-filter");
  if (!errorFilter || !dataService.errors) return;

  try {
    // Obtener el turno actualmente seleccionado
    const activeShiftButton = document.querySelector(
      '.filter-btn[data-filter="shift"].active'
    );
    const currentShift = activeShiftButton
      ? activeShiftButton.getAttribute("data-value")
      : "day";

    // Obtener el login actualmente seleccionado
    const loginFilter = document.getElementById("login-filter");
    const currentLogin = loginFilter ? loginFilter.value : "all";

    // Obtener tipos de errores con conteo para los filtros seleccionados
    const errorsWithCount = dataService.getErrorTypesWithCount(
      currentShift,
      currentLogin
    );

    // Guardar el valor seleccionado actualmente
    const currentValue = errorFilter.value;

    // Limpiar opciones existentes
    errorFilter.innerHTML = '<option value="all">Todos los errores</option>';

    // Agregar opciones de errores ordenadas por cantidad total
    errorsWithCount.forEach(({ errorType, count }) => {
      const option = document.createElement("option");
      option.value = errorType;
      option.textContent = `${errorType} (${count})`;
      errorFilter.appendChild(option);
    });

    // Restaurar valor seleccionado si aún existe
    if (
      currentValue !== "all" &&
      errorsWithCount.some((error) => error.errorType === currentValue)
    ) {
      errorFilter.value = currentValue;
    } else {
      errorFilter.value = "all";
      // Si el valor no existe más, resetear el filtro del controlador
      if (errorsTableController) {
        errorsTableController.setErrorFilter("all");
      }
    }
  } catch (error) {
    console.error("Error al actualizar dropdown de error:", error);
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
