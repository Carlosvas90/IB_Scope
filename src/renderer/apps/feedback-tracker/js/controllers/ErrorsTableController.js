/**
 * ErrorsTableController.js
 * Controlador principal para la tabla de errores
 * Ruta: /src/renderer/apps/feedback-tracker/js/controllers/ErrorsTableController.js
 * Versión optimizada para rendimiento
 */

import { TableRendererService } from "./services/TableRendererService.js";
import { UserImageService } from "./services/UserImageService.js";
import { StatusUpdateService } from "./services/StatusUpdateService.js";

export class ErrorsTableController {
  constructor(dataController) {
    this.dataController = dataController;
    this.statusFilter = "all";
    this.tableBody = null;
    this.rowTemplate = null;
    this.detailsTemplate = null;
    this.currentUsername = "";
    this.expandedRows = new Set(); // Tracking de filas expandidas
    this.isRenderingTable = false; // Control de renderizado
    this.pendingRefresh = false; // Control de refrescos pendientes

    // Servicios
    this.rendererService = new TableRendererService(this);
    this.imageService = new UserImageService();
    this.statusService = null; // Se inicializa después de obtener el username

    // Configuración de virtualización para tablas grandes
    this.virtualScroll = {
      enabled: false, // Se activa para conjuntos grandes de datos
      rowHeight: 50, // Altura aproximada en px
      visibleRows: 15, // Número aproximado de filas visibles
      bufferRows: 5, // Filas adicionales para suavizar scroll
      containerHeight: 0, // Se calcula durante inicialización
      startIndex: 0, // Índice de inicio para renderizado
      endIndex: 0, // Índice final para renderizado
    };
  }

  /**
   * Inicializa el controlador de la tabla
   */
  init() {
    console.time("TableController:Init");

    // Inicializar elementos DOM
    this.tableBody = document.getElementById("errors-table-body");
    this.rowTemplate = document.getElementById("error-row-template");
    this.detailsTemplate = document.getElementById("error-details-template");

    if (!this.tableBody || !this.rowTemplate || !this.detailsTemplate) {
      console.error("No se encontraron los elementos necesarios para la tabla");
      return false;
    }

    // Configurar evento de scroll para virtualización
    const tableContainer = document.querySelector(".table-container");
    if (tableContainer) {
      // Calcular altura disponible
      this.virtualScroll.containerHeight = tableContainer.clientHeight;
      this.virtualScroll.visibleRows = Math.ceil(
        this.virtualScroll.containerHeight / this.virtualScroll.rowHeight
      );

      // Configurar evento de scroll optimizado con debounce
      let scrollTimeout;
      tableContainer.addEventListener("scroll", () => {
        if (scrollTimeout) {
          window.cancelAnimationFrame(scrollTimeout);
        }
        scrollTimeout = window.requestAnimationFrame(() => {
          this.handleScroll(tableContainer);
        });
      });
    }

    // Obtener nombre de usuario y continuar inicialización
    this.getCurrentUsername().then(() => {
      // Inicializar servicio de estado
      this.statusService = new StatusUpdateService(
        this.dataController,
        this.currentUsername
      );

      // Actualizar tabla
      this.updateTable();

      // Configurar eventos
      this.setupEventListeners();

      console.timeEnd("TableController:Init");
    });

    return true;
  }

  /**
   * Maneja el evento de scroll para virtualización
   */
  handleScroll(container) {
    if (!this.virtualScroll.enabled) return;

    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;

    // Calcular índice de inicio basado en posición de scroll
    const newStartIndex = Math.max(
      0,
      Math.floor(scrollTop / this.virtualScroll.rowHeight) -
        this.virtualScroll.bufferRows
    );

    // Si el índice no cambió significativamente, no hacer nada
    if (Math.abs(newStartIndex - this.virtualScroll.startIndex) < 2) return;

    // Actualizar índices
    this.virtualScroll.startIndex = newStartIndex;
    this.virtualScroll.endIndex = Math.min(
      this.dataController.errors.length,
      newStartIndex +
        this.virtualScroll.visibleRows +
        this.virtualScroll.bufferRows * 2
    );

    // Renderizar filas visibles
    this.renderVisibleRows();
  }

  /**
   * Renderiza solo las filas actualmente visibles (para virtualización)
   */
  renderVisibleRows() {
    if (this.isRenderingTable) {
      this.pendingRefresh = true;
      return;
    }

    this.isRenderingTable = true;
    console.time("RenderVisibleRows");

    try {
      // Obtener errores filtrados
      const filteredErrors = this.dataController.getFilteredErrors(
        this.statusFilter
      );

      // Limpiar tabla
      while (this.tableBody.firstChild) {
        this.tableBody.removeChild(this.tableBody.firstChild);
      }

      // Crear spacer para mantener altura de scroll
      const totalHeight = filteredErrors.length * this.virtualScroll.rowHeight;
      const spacer = document.createElement("tr");
      spacer.className = "virtual-spacer";
      spacer.style.height = `${totalHeight}px`;
      spacer.style.padding = "0";
      spacer.style.margin = "0";
      this.tableBody.appendChild(spacer);

      // Calcular índices visibles
      const visibleErrorsSlice = filteredErrors.slice(
        this.virtualScroll.startIndex,
        this.virtualScroll.endIndex
      );

      // Crear fragmento para mejor rendimiento
      const fragment = document.createDocumentFragment();

      // Renderizar filas visibles
      visibleErrorsSlice.forEach((error, localIndex) => {
        const row = this.rendererService.createTableRow(error);
        const globalIndex = this.virtualScroll.startIndex + localIndex;

        // Posicionar fila
        row.style.position = "absolute";
        row.style.top = `${globalIndex * this.virtualScroll.rowHeight}px`;
        row.style.width = "100%";
        row.style.zIndex = "1";

        fragment.appendChild(row);

        // Si la fila estaba expandida, mostrar detalles
        if (this.expandedRows.has(error.id)) {
          const detailsRow = this.rendererService.createDetailsRow(error);
          detailsRow.style.position = "absolute";
          detailsRow.style.top = `${
            globalIndex * this.virtualScroll.rowHeight +
            this.virtualScroll.rowHeight
          }px`;
          detailsRow.style.width = "100%";
          detailsRow.style.zIndex = "1";
          fragment.appendChild(detailsRow);
        }
      });

      // Añadir filas al DOM
      this.tableBody.appendChild(fragment);

      // Configurar eventos
      this.setupRowEvents();
    } catch (error) {
      console.error("Error en renderizado de filas:", error);
    } finally {
      this.isRenderingTable = false;
      console.timeEnd("RenderVisibleRows");

      // Si hay un refresco pendiente, procesarlo
      if (this.pendingRefresh) {
        this.pendingRefresh = false;
        setTimeout(() => this.renderVisibleRows(), 0);
      }
    }
  }

  /**
   * Configura los event listeners para la tabla
   */
  setupEventListeners() {
    // Configurar filtros
    const filterButtons = document.querySelectorAll(
      'input[name="status-filter"]'
    );
    filterButtons.forEach((button) => {
      button.addEventListener("change", (e) => {
        this.statusFilter = e.target.value;
        this.filterTable();
      });
    });

    // Configurar eventos para popups de imagen
    this.imageService.setupPopupEvents(document.getElementById("errors-table"));

    // Configurar eventos para cambio de estado y expandir filas
    this.setupRowEvents();
  }

  /**
   * Configura los eventos de las filas
   */
  setupRowEvents() {
    // Botones para cambiar estado
    const statusButtons = document.querySelectorAll(".status-btn");
    statusButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const row = button.closest("tr");
        const errorId = row.getAttribute("data-id");
        this.handleStatusChange(button, row, errorId);
      });
    });

    // Expandir/colapsar detalles
    const expandableRows = document.querySelectorAll(".expandable-row");
    expandableRows.forEach((row) => {
      row.addEventListener("click", (event) => {
        // No expandir si se hace clic en enlace o botón
        if (
          event.target.closest(".asin-link") ||
          event.target.closest(".status-btn")
        ) {
          return;
        }
        const errorId = row.getAttribute("data-id");
        this.toggleErrorDetails(row, errorId);
      });
    });
  }

  /**
   * Maneja el cambio de estado de un error
   */
  handleStatusChange(button, row, errorId) {
    const isDone = button.classList.contains("status-done");
    const newStatus = isDone ? "pending" : "done";

    // Solo mostrar modal si se cambia a "done"
    if (newStatus === "done" && window.feedbackModalController) {
      window.feedbackModalController.show(errorId, (feedbackData) => {
        this.statusService.updateStatusButton(button, newStatus);
        row.classList.toggle("row-done");
        row.classList.toggle("row-pending");
        this.statusService.updateErrorStatus(
          errorId,
          newStatus,
          this.updateCounters.bind(this),
          feedbackData.feedbackComment
        );
      });
    } else {
      // Si cambia a pending, actualizar directamente sin modal
      this.statusService.updateStatusButton(button, newStatus);
      row.classList.toggle("row-done");
      row.classList.toggle("row-pending");
      this.statusService.updateErrorStatus(
        errorId,
        newStatus,
        this.updateCounters.bind(this),
        null // Sin comentario para cambio a pending
      );
    }
  }

  /**
   * Obtiene el nombre de usuario actual desde la API
   */
  async getCurrentUsername() {
    try {
      this.currentUsername = await window.api.getUsername();
    } catch (error) {
      console.warn("No se pudo obtener el nombre de usuario:", error);
      this.currentUsername = "usuario";
    }
  }

  /**
   * Establece el filtro por estado
   */
  setStatusFilter(filter) {
    this.statusFilter = filter;
  }

  /**
   * Actualiza la tabla con los datos actuales
   */
  updateTable() {
    console.time("UpdateTable");

    if (!this.tableBody) return;

    // Verificar si usar virtualización
    const errors = this.dataController.errors;
    this.virtualScroll.enabled = errors.length > 100; // Activar para conjuntos grandes

    if (this.virtualScroll.enabled) {
      // Usar renderizado virtual para grandes conjuntos de datos
      this.renderVisibleRows();
    } else {
      // Limpiar tabla
      this.tableBody.innerHTML = "";

      // Obtener errores filtrados
      const filteredErrors = this.dataController.getFilteredErrors(
        this.statusFilter
      );

      // Si no hay datos, mostrar mensaje
      if (filteredErrors.length === 0) {
        this.tableBody.innerHTML = `
          <tr>
            <td colspan="7" class="empty-message">
              No se encontraron errores con el filtro seleccionado
            </td>
          </tr>
        `;
        console.timeEnd("UpdateTable");
        return;
      }

      // Crear fragmento para mejor rendimiento
      const fragment = document.createDocumentFragment();

      // Generar filas
      filteredErrors.forEach((error) => {
        const row = this.rendererService.createTableRow(error);
        fragment.appendChild(row);
      });

      // Añadir filas al DOM
      this.tableBody.appendChild(fragment);

      // Añadir eventos a las filas
      this.setupRowEvents();
    }

    // Actualizar contadores
    this.updateCounters();

    console.timeEnd("UpdateTable");
  }

  /**
   * Filtra la tabla según el filtro seleccionado
   */
  filterTable() {
    // Si usamos virtualización, refrescar todo el renderizado
    if (this.virtualScroll.enabled) {
      this.virtualScroll.startIndex = 0;
      this.renderVisibleRows();
      return;
    }

    // Enfoque tradicional para conjuntos pequeños
    const rows = this.tableBody.querySelectorAll("tr.expandable-row");
    rows.forEach((row) => {
      if (this.statusFilter === "all") {
        row.style.display = "";
      } else if (this.statusFilter === "pending") {
        row.style.display = row.classList.contains("row-pending") ? "" : "none";
      } else if (this.statusFilter === "done") {
        row.style.display = row.classList.contains("row-done") ? "" : "none";
      }
    });

    // Actualizar contadores visibles
    this.updateCounters();
  }

  /**
   * Actualiza los contadores en la interfaz
   */
  updateCounters() {
    const errors = this.dataController.errors;

    const totalElement = document.getElementById("total-errors");
    const pendingElement = document.getElementById("pending-errors");
    const doneElement = document.getElementById("done-errors");
    const lastUpdateElement = document.getElementById("last-update");

    if (totalElement) {
      totalElement.textContent = errors.length;
    }

    if (pendingElement) {
      const pendingCount = errors.filter(
        (error) => error.feedback_status === "pending"
      ).length;
      pendingElement.textContent = pendingCount;
    }

    if (doneElement) {
      const doneCount = errors.filter(
        (error) => error.feedback_status === "done"
      ).length;
      doneElement.textContent = doneCount;
    }

    if (lastUpdateElement && this.dataController.lastUpdateTime) {
      lastUpdateElement.textContent =
        this.dataController.getLastUpdateFormatted();
    }
  }

  /**
   * Muestra u oculta los detalles de un error
   */
  toggleErrorDetails(row, errorId) {
    // Manejar expansión diferente según si está virtualizada
    if (this.virtualScroll.enabled) {
      // En modo virtualización, manejar con tracking de ids expandidos
      if (this.expandedRows.has(errorId)) {
        this.expandedRows.delete(errorId);
      } else {
        this.expandedRows.add(errorId);
      }

      // Re-renderizar filas visibles
      this.renderVisibleRows();
      return;
    }

    // Modo tradicional
    const nextRow = row.nextElementSibling;

    // Si ya está expandido, solo alternar visibilidad
    if (nextRow && nextRow.classList.contains("error-details-row")) {
      nextRow.classList.toggle("expanded");
      return;
    }

    // Si no está expandido, generar y mostrar detalles
    const error = this.dataController.errors.find(
      (error) => error.id === errorId
    );
    if (!error) {
      console.warn(`Error no encontrado: ${errorId}`);
      return;
    }

    const detailsElement = this.rendererService.createDetailsRow(error);
    row.parentNode.insertBefore(detailsElement, row.nextSibling);
  }
}
