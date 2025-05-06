/**
 * ErrorsTableController.js
 * Maneja la tabla de errores y sus interacciones
 * Ruta: /src/renderer/apps/feedback-tracker/js/controllers/ErrorsTableController.js
 */

export class ErrorsTableController {
  constructor(dataController) {
    this.dataController = dataController;
    this.statusFilter = "all";
    this.tableBody = null;
    this.rowTemplate = null;
    this.detailsTemplate = null;
    this.currentUsername = ""; // Se establecerá más tarde
  }

  /**
   * Inicializa el controlador de la tabla
   */
  init() {
    this.tableBody = document.getElementById("errors-table-body");
    this.rowTemplate = document.getElementById("error-row-template");
    this.detailsTemplate = document.getElementById("error-details-template");

    if (!this.tableBody || !this.rowTemplate || !this.detailsTemplate) {
      console.error("No se encontraron los elementos necesarios para la tabla");
      return false;
    }

    // Intentar obtener el nombre de usuario actual
    this.getCurrentUsername();

    // Actualizar la tabla inicialmente
    this.updateTable();
    return true;
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
      const row = this.createTableRow(error);
      this.tableBody.appendChild(row);
    });

    // Añadir eventos a las filas
    this.setupRowEvents();
  }

  /**
   * Crea una fila de la tabla para un error
   */
  createTableRow(error) {
    // Clonar la plantilla
    const row = this.rowTemplate.content.cloneNode(true);
    const rowElement = row.querySelector("tr");

    // Establecer ID del error
    rowElement.setAttribute("data-id", error.id);

    // Determinar estado y clases
    const status = error.feedback_status
      ? error.feedback_status.toLowerCase()
      : "pending";
    rowElement.classList.add(status === "done" ? "row-done" : "row-pending");

    // Configurar el botón de estado
    const statusBtn = row.querySelector(".status-btn");
    const pendingIcon = row.querySelector(".pending-icon");
    const doneIcon = row.querySelector(".done-icon");
    const statusText = row.querySelector(".status-text");

    if (status === "done") {
      statusBtn.classList.remove("status-pending");
      statusBtn.classList.add("status-done");
      pendingIcon.style.display = "none";
      doneIcon.style.display = "inline";

      // Mostrar quién completó el error
      const doneBy = error.feedback_user || this.currentUsername;
      statusText.textContent = `Done (${doneBy})`;
    } else {
      statusText.textContent = "Pending";
    }

    // Completar datos de la fila con escape HTML correcto
    row.querySelector(".login-cell").textContent = this.escapeHtml(
      error.user_id
    );
    row.querySelector(".asin-cell").textContent = this.escapeHtml(error.asin);
    row.querySelector(".qty-cell").textContent = error.quantity || 1;
    row.querySelector(".bin-id-cell").textContent = this.escapeHtml(
      error.bin_id
    );
    row.querySelector(".time-cell").textContent = this.escapeHtml(error.time);

    // Usar textContent para el texto de la violación - esto ya maneja caracteres especiales correctamente
    row.querySelector(".error-cell").textContent = error.violation;

    return row;
  }

  /**
   * Configura los eventos de las filas
   */
  setupRowEvents() {
    // Botones para cambiar estado
    const statusButtons = document.querySelectorAll(".status-btn");
    statusButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation(); // Evitar que se expanda la fila

        const row = button.closest("tr");
        const errorId = row.getAttribute("data-id");
        const isDone = button.classList.contains("status-done");
        const newStatus = isDone ? "pending" : "done";

        // Si se cambia a "done", mostrar modal de feedback
        if (newStatus === "done" && window.feedbackModalController) {
          // Mostrar modal y pasar callback para cuando se complete
          window.feedbackModalController.show(errorId, (feedbackData) => {
            // Actualizar estado visualmente mientras se procesa
            this.updateStatusButton(button, newStatus);

            // Actualizar clases de la fila
            row.classList.toggle("row-done");
            row.classList.toggle("row-pending");

            // Actualizar el estado en los datos con comentario
            this.updateErrorStatus(
              errorId,
              newStatus,
              feedbackData.feedbackComment
            );
          });
        } else {
          // Actualizar estado visualmente mientras se procesa
          this.updateStatusButton(button, newStatus);

          // Actualizar clases de la fila
          row.classList.toggle("row-done");
          row.classList.toggle("row-pending");

          // Actualizar el estado en los datos sin comentario
          this.updateErrorStatus(errorId, newStatus);
        }
      });
    });

    // Expandir/colapsar detalles
    const expandableRows = document.querySelectorAll(".expandable-row");
    expandableRows.forEach((row) => {
      row.addEventListener("click", () => {
        const errorId = row.getAttribute("data-id");
        this.toggleErrorDetails(row, errorId);
      });
    });
  }

  /**
   * Actualiza el botón de estado visualmente
   */
  updateStatusButton(button, newStatus) {
    const pendingIcon = button.querySelector(".pending-icon");
    const doneIcon = button.querySelector(".done-icon");
    const statusText = button.querySelector(".status-text");

    if (newStatus === "done") {
      button.classList.remove("status-pending");
      button.classList.add("status-done");
      pendingIcon.style.display = "none";
      doneIcon.style.display = "inline";
      statusText.textContent = `Done (${this.currentUsername})`;
    } else {
      button.classList.remove("status-done");
      button.classList.add("status-pending");
      pendingIcon.style.display = "inline";
      doneIcon.style.display = "none";
      statusText.textContent = "Pending";
    }
  }

  /**
   * Actualiza el estado de un error en el almacenamiento
   * @param {string} errorId - ID del error a actualizar
   * @param {string} newStatus - Nuevo estado (done/pending)
   * @param {string} [feedbackComment] - Comentario opcional de feedback
   */
  async updateErrorStatus(errorId, newStatus, feedbackComment = null) {
    try {
      // Llamar al servicio de datos para actualizar el estado
      const success = await this.dataController.updateErrorStatus(
        errorId,
        newStatus,
        this.currentUsername,
        feedbackComment
      );

      if (success) {
        window.showToast(
          `Estado cambiado a ${
            newStatus === "done" ? "completado" : "pendiente"
          }`,
          "success"
        );

        // Si hay un comentario, actualizar la vista de detalles si está abierta
        if (newStatus === "done" && feedbackComment) {
          const row = document.querySelector(`tr[data-id="${errorId}"]`);
          if (row) {
            const nextRow = row.nextElementSibling;
            if (nextRow && nextRow.classList.contains("error-details-row")) {
              // Si los detalles están abiertos, actualizar comentario
              const commentElement = nextRow.querySelector(
                ".feedback-comment-value"
              );
              if (commentElement) {
                commentElement.textContent = feedbackComment;
              }
            }
          }
        }
      } else {
        window.showToast("Error al actualizar el estado", "error");
      }
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      window.showToast("Error al actualizar el estado", "error");
    }
  }

  /**
   * Muestra u oculta los detalles de un error
   */
  toggleErrorDetails(row, errorId) {
    // Verificar si los detalles ya están expandidos
    const nextRow = row.nextElementSibling;
    if (nextRow && nextRow.classList.contains("error-details-row")) {
      // Ya está expandido, ocultar
      nextRow.classList.toggle("expanded");
      return;
    }

    // Buscar el error en los datos
    const error = this.findErrorById(errorId);
    if (!error) {
      console.warn(`Error no encontrado: ${errorId}`);
      return;
    }

    // Clonar la plantilla de detalles
    const detailsRow = this.detailsTemplate.content.cloneNode(true);
    const detailsElement = detailsRow.querySelector(".error-details-row");
    detailsElement.classList.add("expanded");

    // Completar datos de los detalles con escape HTML
    detailsRow.querySelector(".id-value").textContent = error.id;
    detailsRow.querySelector(".date-value").textContent = error.date;
    detailsRow.querySelector(".notifications-value").textContent =
      error.times_notified || 0;

    // Mostrar comentario de feedback si existe
    if (error.feedback_comment) {
      // Buscar contenedor de comentario o crear uno si no existe
      let commentContainer = detailsRow.querySelector(
        ".detail-item.feedback-comment"
      );
      if (!commentContainer) {
        commentContainer = document.createElement("div");
        commentContainer.className = "detail-item feedback-comment";

        const label = document.createElement("div");
        label.className = "detail-label";
        label.textContent = "Comentario:";

        const value = document.createElement("div");
        value.className = "detail-value feedback-comment-value";
        value.textContent = error.feedback_comment;

        commentContainer.appendChild(label);
        commentContainer.appendChild(value);

        // Añadir al contenedor de detalles
        const detailsGrid = detailsRow.querySelector(".details-grid");
        if (detailsGrid) {
          detailsGrid.appendChild(commentContainer);
        }
      } else {
        // Si ya existe, simplemente actualizar el texto
        const commentValue = commentContainer.querySelector(
          ".feedback-comment-value"
        );
        if (commentValue) {
          commentValue.textContent = error.feedback_comment;
        }
      }
    }

    // Completar lista de ocurrencias
    const occurrencesList = detailsRow.querySelector(".occurrences-list");
    if (error.occurrences && error.occurrences.length > 0) {
      error.occurrences.forEach((occurrence) => {
        const li = document.createElement("li");
        li.textContent = `${occurrence.date} ${occurrence.time}`;
        occurrencesList.appendChild(li);
      });
    } else {
      occurrencesList.innerHTML = "<li>No hay datos de ocurrencias</li>";
    }

    // Insertar después de la fila actual
    row.parentNode.insertBefore(detailsElement, row.nextSibling);
  }

  /**
   * Busca un error por su ID
   */
  findErrorById(errorId) {
    return this.dataController.errors.find((error) => error.id === errorId);
  }

  /**
   * Escapa caracteres HTML para evitar XSS
   * Esta función asegura que caracteres como < y > se muestren correctamente
   */
  escapeHtml(unsafe) {
    if (!unsafe) return "";

    return unsafe
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
