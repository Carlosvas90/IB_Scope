/**
 * ErrorsTableController.js
 * Controlador principal para la tabla de errores
 * Ruta: /src/renderer/apps/feedback-tracker/js/controllers/ErrorsTableController.js
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

    // Servicios
    this.rendererService = new TableRendererService(this);
    this.imageService = new UserImageService();
    this.statusService = null; // Se inicializa después de obtener el username
  }

  /**
   * Inicializa el controlador de la tabla
   */
  init() {
    // Inicializar elementos DOM
    this.tableBody = document.getElementById("errors-table-body");
    this.rowTemplate = document.getElementById("error-row-template");
    this.detailsTemplate = document.getElementById("error-details-template");

    if (!this.tableBody || !this.rowTemplate || !this.detailsTemplate) {
      console.error("No se encontraron los elementos necesarios para la tabla");
      return false;
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
    });

    return true;
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

    // Si se cambia a "done", mostrar modal de feedback
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
      this.statusService.updateStatusButton(button, newStatus);
      row.classList.toggle("row-done");
      row.classList.toggle("row-pending");
      this.statusService.updateErrorStatus(
        errorId,
        newStatus,
        this.updateCounters.bind(this)
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
    if (!this.tableBody) return;

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
      return;
    }

    // Generar filas
    filteredErrors.forEach((error) => {
      const row = this.rendererService.createTableRow(error);
      this.tableBody.appendChild(row);
    });

    // Añadir eventos a las filas
    this.setupRowEvents();

    // Actualizar contadores
    this.updateCounters();
  }

  /**
   * Filtra la tabla según el filtro seleccionado
   */
  filterTable() {
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

    if (lastUpdateElement && this.dataController.lastUpdate) {
      lastUpdateElement.textContent = this.dataController.lastUpdate;
    }
  }

  /**
   * Muestra u oculta los detalles de un error
   */
  toggleErrorDetails(row, errorId) {
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
