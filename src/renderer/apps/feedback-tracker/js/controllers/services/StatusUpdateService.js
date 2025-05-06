/**
 * StatusUpdateService.js
 * Servicio para actualizar el estado de los errores
 * Ruta: /src/renderer/apps/feedback-tracker/js/controllers/services/StatusUpdateService.js
 */

export class StatusUpdateService {
  constructor(dataController, currentUsername) {
    this.dataController = dataController;
    this.currentUsername = currentUsername;
  }

  /**
   * Actualiza el botón de estado visualmente
   * @param {HTMLElement} button - Botón de estado
   * @param {string} newStatus - Nuevo estado (done/pending)
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
   * @param {Function} updateCallback - Función a llamar después de actualizar
   * @param {string} [feedbackComment] - Comentario opcional de feedback
   */
  async updateErrorStatus(
    errorId,
    newStatus,
    updateCallback,
    feedbackComment = null
  ) {
    try {
      // Llamar al servicio de datos para actualizar el estado
      const success = await this.dataController.updateErrorStatus(
        errorId,
        newStatus,
        this.currentUsername,
        feedbackComment
      );

      if (success) {
        this.showSuccessMessage(newStatus);

        // Actualizar el comentario en la vista de detalles si está abierta
        if (newStatus === "done" && feedbackComment) {
          this.updateFeedbackCommentInView(errorId, feedbackComment);
        }

        // Llamar al callback para actualizar contadores, etc.
        if (typeof updateCallback === "function") {
          updateCallback();
        }
      } else {
        this.showErrorMessage();
      }
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      this.showErrorMessage();
    }
  }

  /**
   * Muestra un mensaje de éxito al actualizar
   * @param {string} newStatus - Estado actualizado
   */
  showSuccessMessage(newStatus) {
    if (window.showToast) {
      window.showToast(
        `Estado cambiado a ${
          newStatus === "done" ? "completado" : "pendiente"
        }`,
        "success"
      );
    } else {
      console.log(
        `Estado cambiado a ${newStatus === "done" ? "completado" : "pendiente"}`
      );
    }
  }

  /**
   * Muestra un mensaje de error
   */
  showErrorMessage() {
    if (window.showToast) {
      window.showToast("Error al actualizar el estado", "error");
    } else {
      console.error("Error al actualizar el estado");
    }
  }

  /**
   * Actualiza el comentario de feedback en la vista de detalles
   * @param {string} errorId - ID del error
   * @param {string} feedbackComment - Comentario de feedback
   */
  updateFeedbackCommentInView(errorId, feedbackComment) {
    const row = document.querySelector(`tr[data-id="${errorId}"]`);
    if (!row) return;

    const nextRow = row.nextElementSibling;
    if (!nextRow || !nextRow.classList.contains("error-details-row")) return;

    // Buscar el contenedor de comentario
    let commentElement = nextRow.querySelector(".feedback-comment-value");

    if (commentElement) {
      // Si existe, actualizar el texto
      commentElement.textContent = feedbackComment;
    } else {
      // Si no existe, crear el contenedor de comentario
      this.createCommentElement(nextRow, feedbackComment);
    }
  }

  /**
   * Crea un elemento de comentario en los detalles
   * @param {HTMLElement} detailsRow - Fila de detalles
   * @param {string} comment - Comentario de feedback
   */
  createCommentElement(detailsRow, comment) {
    const detailsGrid = detailsRow.querySelector(".details-grid");
    if (!detailsGrid) return;

    const commentContainer = document.createElement("div");
    commentContainer.className = "detail-item feedback-comment";

    const label = document.createElement("div");
    label.className = "detail-label";
    label.textContent = "Comentario:";

    const value = document.createElement("div");
    value.className = "detail-value feedback-comment-value";
    value.textContent = comment;

    commentContainer.appendChild(label);
    commentContainer.appendChild(value);

    detailsGrid.appendChild(commentContainer);
  }
}
