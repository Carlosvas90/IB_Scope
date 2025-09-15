/**
 * Sistema de selección múltiple con botones para Feedback Tracker
 * Versión mejorada que usa botones en lugar de teclas Ctrl
 */

// Variables globales para manejar la selección múltiple
let isMultiSelectMode = false;
let selectedErrorIds = [];
const selectionCounter = document.getElementById("selection-counter");
const cancelSelectionBtn = document.getElementById("cancel-selection");
const toggleMultiSelectBtn = document.getElementById("toggle-multi-select");
const batchFeedbackBtn = document.getElementById("batch-feedback-btn");

/**
 * Inicializa el sistema de selección múltiple
 */
function initMultiSelectSystem() {
  console.log("🔄 Inicializando sistema de selección múltiple con botones...");

  // Configurar botón de toggle
  setupToggleButton();

  // Configurar botón de feedback por lotes
  setupBatchFeedbackButton();

  // Configurar botón de cancelar selección
  setupCancelButton();

  // Configurar eventos de teclado (solo para Escape)
  setupKeyboardEvents();

  console.log("✅ Sistema de selección múltiple inicializado");
}

/**
 * Configura los eventos de teclado (solo para Escape)
 */
function setupKeyboardEvents() {
  // Permitir cancelar con Escape
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (isMultiSelectMode) {
        deactivateMultiSelectMode();
      }
      clearSelection();
    }
  });
}

/**
 * Configura el botón de toggle para activar/desactivar selección múltiple
 */
function setupToggleButton() {
  if (!toggleMultiSelectBtn) {
    console.error("❌ Botón de toggle no encontrado");
    return;
  }

  toggleMultiSelectBtn.addEventListener("click", function () {
    if (isMultiSelectMode) {
      console.log("🔄 ❌ DESACTIVANDO modo selección múltiple");
      deactivateMultiSelectMode();
    } else {
      console.log("🔄 ✅ ACTIVANDO modo selección múltiple");
      activateMultiSelectMode();
    }
  });
}

/**
 * Configura el botón de feedback por lotes
 */
function setupBatchFeedbackButton() {
  if (!batchFeedbackBtn) {
    console.error("❌ Botón de feedback por lotes no encontrado");
    return;
  }

  batchFeedbackBtn.addEventListener("click", function () {
    console.log(
      `🔄 ✅ ABRIENDO MODAL PARA ACTUALIZACIÓN POR LOTES: ${selectedErrorIds.length} registros`
    );

    // Verificar si el controlador del modal está disponible
    if (window.feedbackModalController) {
      // Mostrar modal para actualización por lotes
      window.feedbackModalController.show(selectedErrorIds, (feedbackData) => {
        // Esta función se ejecuta cuando se envía el formulario
        console.log(
          "💾 Procesando actualización por lotes con datos:",
          feedbackData
        );

        // Buscar el servicio de actualización de estado
        const errorsTableController =
          document.querySelector("#errors-table").controller;
        if (errorsTableController && errorsTableController.statusService) {
          // Actualizar todos los registros seleccionados
          errorsTableController.statusService.updateErrorStatus(
            null, // No se usa en modo batch
            "done", // Siempre se cambia a 'done' en actualizaciones por lotes
            () => {
              // Callback para actualizar la tabla y contadores
              if (errorsTableController.updateTable) {
                errorsTableController.updateTable();
              }
            },
            feedbackData // Contiene errorIds[] y datos del formulario
          );
        } else {
          console.error(
            "❌ No se encontró el controlador de la tabla o el servicio de actualización"
          );
          alert("Error: No se pudo completar la actualización por lotes");
        }
      });
    } else {
      console.error("❌ Modal controller no disponible");
      alert(
        `No se puede procesar la actualización por lotes de ${selectedErrorIds.length} registros`
      );
    }
  });
}

/**
 * Activa el modo de selección múltiple
 */
function activateMultiSelectMode() {
  isMultiSelectMode = true;
  document.body.classList.add("multi-select-mode");
  toggleMultiSelectBtn.classList.add("active");
  toggleMultiSelectBtn.textContent = "Desactivar Selección";
  console.log(
    "🔍 ✅ MODO SELECCIÓN MÚLTIPLE ACTIVADO - Puedes hacer clic en varios botones"
  );
}

/**
 * Desactiva el modo de selección múltiple
 */
function deactivateMultiSelectMode() {
  isMultiSelectMode = false;
  document.body.classList.remove("multi-select-mode");
  toggleMultiSelectBtn.classList.remove("active");
  toggleMultiSelectBtn.innerHTML = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
    Selección Múltiple
  `;
  clearSelection();
  console.log("🔍 ❌ MODO SELECCIÓN MÚLTIPLE DESACTIVADO");
}

/**
 * Configura el botón de cancelar selección
 */
function setupCancelButton() {
  cancelSelectionBtn.addEventListener("click", function () {
    clearSelection();
  });
}

/**
 * Maneja el clic en un botón de estado
 * @param {Event} event - El evento de clic
 * @param {string} errorId - El ID del error
 * @param {HTMLElement} buttonElement - El elemento del botón
 */
function handleStatusButtonClick(event, errorId, buttonElement) {
  console.log(`🔄 Click en botón detectado:`);
  console.log(`   - Error ID: ${errorId}`);
  console.log(`   - Modo múltiple activo: ${isMultiSelectMode}`);
  console.log(`   - Elementos ya seleccionados: ${selectedErrorIds.length}`);

  if (isMultiSelectMode) {
    console.log(`🔄 ✅ PROCESANDO COMO SELECCIÓN MÚLTIPLE`);
    event.preventDefault(); // Prevenir la acción normal del botón
    event.stopPropagation(); // Evitar que el evento se propague

    toggleErrorSelection(errorId, buttonElement);
    return true; // Indica que se manejó como selección múltiple
  }

  console.log(`🔄 ❌ NO ES SELECCIÓN MÚLTIPLE - Procesando normalmente`);
  return false; // Indica que debe manejarse normalmente
}

/**
 * Alterna la selección de un error
 * @param {string} errorId - El ID del error
 * @param {HTMLElement} buttonElement - El elemento del botón
 */
function toggleErrorSelection(errorId, buttonElement) {
  const row = buttonElement.closest("tr");
  const index = selectedErrorIds.indexOf(errorId);

  if (index === -1) {
    // Añadir a la selección
    selectedErrorIds.push(errorId);
    row.classList.add("selected-for-batch");
    console.log(`✅ Error ID ${errorId} AÑADIDO a la selección`);
    console.log(`📋 Total seleccionados ahora: ${selectedErrorIds.length}`);
  } else {
    // Quitar de la selección
    selectedErrorIds.splice(index, 1);
    row.classList.remove("selected-for-batch");
    console.log(`❌ Error ID ${errorId} ELIMINADO de la selección`);
    console.log(`📋 Total seleccionados ahora: ${selectedErrorIds.length}`);
  }

  updateSelectionCounter();
}

/**
 * Actualiza el contador de selección
 */
function updateSelectionCounter() {
  if (selectedErrorIds.length > 0) {
    selectionCounter.textContent = `${selectedErrorIds.length} seleccionados`;
    selectionCounter.style.display = "block";
    cancelSelectionBtn.style.display = "block";

    // Mostrar botón de feedback por lotes si hay más de 1 elemento
    if (selectedErrorIds.length > 1) {
      batchFeedbackBtn.style.display = "block";
    } else {
      batchFeedbackBtn.style.display = "none";
    }
  } else {
    selectionCounter.style.display = "none";
    cancelSelectionBtn.style.display = "none";
    batchFeedbackBtn.style.display = "none";
  }
}

/**
 * Limpia la selección actual
 */
function clearSelection() {
  document.querySelectorAll(".selected-for-batch").forEach((el) => {
    el.classList.remove("selected-for-batch");
  });

  selectedErrorIds = [];
  updateSelectionCounter();
  console.log("🧹 Selección limpiada");
}

/**
 * Obtiene los IDs de errores seleccionados
 * @returns {Array} - Array con los IDs seleccionados
 */
function getSelectedErrorIds() {
  return [...selectedErrorIds];
}

// Exportar funciones para uso externo
window.multiSelect = {
  init: initMultiSelectSystem,
  handleStatusButtonClick,
  getSelectedErrorIds,
  clearSelection,
};

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", initMultiSelectSystem);
