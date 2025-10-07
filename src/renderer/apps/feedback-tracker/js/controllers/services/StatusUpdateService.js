/**
 * StatusUpdateService.js
 * Servicio para actualizar el estado de los errores
 * Ruta: /src/renderer/apps/feedback-tracker/js/controllers/services/StatusUpdateService.js
 */

import { SimilarErrorsService } from "./SimilarErrorsService.js";

export class StatusUpdateService {
  constructor(dataController, currentUsername) {
    this.dataController = dataController;
    this.currentUsername = currentUsername;
    this.similarErrorsService = new SimilarErrorsService(dataController);
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
   * @param {Object} [feedbackData] - Datos de feedback con motivo y comentario separados
   */
  async updateErrorStatus(
    errorId,
    newStatus,
    updateCallback,
    feedbackData = null
  ) {
    try {
      // Llamar al servicio de datos para actualizar el estado
      const success = await this.dataController.updateErrorStatus(
        errorId,
        newStatus,
        this.currentUsername,
        feedbackData
      );

      if (success) {
        // Si se está marcando como "done" y hay feedback, aplicar a errores similares
        let similarErrorsUpdated = false;
        if (newStatus === "done" && feedbackData) {
          const result = await this.applyFeedbackToSimilarErrors(
            errorId,
            feedbackData
          );
          similarErrorsUpdated = result && result.updatedCount > 0;
        }

        this.showSuccessMessage(newStatus);

        // Actualizar el comentario en la vista de detalles si está abierta
        if (newStatus === "done" && feedbackData) {
          // Crear texto combinado para mostrar en la vista
          const displayText = feedbackData.comment
            ? `${feedbackData.reasonLabel}: ${feedbackData.comment}`
            : feedbackData.reasonLabel;
          this.updateFeedbackCommentInView(errorId, displayText);
        }

        // Siempre llamar al callback primero para actualización inmediata
        if (typeof updateCallback === "function") {
          console.log(
            "🔄 StatusUpdateService: Llamando callback de actualización inmediata"
          );
          updateCallback();
        }

        // Si se actualizaron errores similares, forzar actualización completa adicional
        if (similarErrorsUpdated) {
          console.log(
            "🔄 StatusUpdateService: Forzando guardado y actualización completa adicional"
          );
          // Esperar a que se guarden todos los cambios en el JSON
          setTimeout(async () => {
            try {
              // Primero: Forzar guardado del JSON
              console.log(
                "💾 StatusUpdateService: Guardando cambios en JSON..."
              );
              await this.dataController.saveData();

              // Segundo: Recargar datos desde el JSON (como el botón de actualizar)
              console.log(
                "🔄 StatusUpdateService: Recargando datos desde JSON..."
              );
              await this.dataController.refreshData();

              // Tercero: Llamar al callback de nuevo para refrescar la vista
              console.log(
                "🔄 StatusUpdateService: Llamando callback después de refrescar JSON"
              );
              if (typeof updateCallback === "function") {
                updateCallback();
              }

              console.log(
                "✅ StatusUpdateService: Actualización completa finalizada"
              );
            } catch (error) {
              console.error(
                "❌ StatusUpdateService: Error en actualización:",
                error
              );
            }
          }, 500);
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

  /**
   * Aplica el mismo feedback a errores similares
   * @param {string} referenceErrorId - ID del error de referencia
   * @param {Object} feedbackData - Datos de feedback a aplicar
   */
  async applyFeedbackToSimilarErrors(referenceErrorId, feedbackData) {
    try {
      console.log(
        `🔄 StatusUpdateService: Aplicando feedback a errores similares para ${referenceErrorId}`
      );

      const result =
        await this.similarErrorsService.applyFeedbackToSimilarErrors(
          referenceErrorId,
          feedbackData,
          this.currentUsername
        );

      if (result.success && result.updatedCount > 0) {
        console.log(`✅ StatusUpdateService: ${result.message}`);

        // Mostrar notificación de éxito
        if (window.showToast) {
          window.showToast(
            `Feedback aplicado a ${result.updatedCount} errores similares`,
            "success"
          );
        }
      } else if (result.updatedCount === 0) {
        console.log(`ℹ️ StatusUpdateService: ${result.message}`);
      } else {
        console.warn(`⚠️ StatusUpdateService: ${result.message}`);
      }

      return result;
    } catch (error) {
      console.error(
        "StatusUpdateService: Error al aplicar feedback a errores similares:",
        error
      );
      return {
        success: false,
        updatedCount: 0,
        message: "Error al aplicar feedback",
      };
    }
  }
}
