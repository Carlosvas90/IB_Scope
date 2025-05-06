/**
 * TableRendererService.js
 * Servicio para renderizar filas y detalles de la tabla
 * Ruta: /src/renderer/apps/feedback-tracker/js/controllers/services/TableRendererService.js
 */

export class TableRendererService {
  constructor(tableController) {
    this.tableController = tableController;
  }

  /**
   * Crea una fila de la tabla para un error
   * @param {Object} error - Objeto de error
   * @returns {HTMLElement} - Elemento DOM de la fila
   */
  createTableRow(error) {
    // Clonar la plantilla
    const row = this.tableController.rowTemplate.content.cloneNode(true);
    const rowElement = row.querySelector("tr");

    // Establecer ID del error
    rowElement.setAttribute("data-id", error.id);

    // Determinar estado y clases
    const status = error.feedback_status
      ? error.feedback_status.toLowerCase()
      : "pending";
    rowElement.classList.add(status === "done" ? "row-done" : "row-pending");

    // Configurar el botón de estado
    this.setupStatusButton(row, error, status);

    // Configurar celda de login con atributo data-login
    const loginCell = row.querySelector(".login-cell");
    loginCell.textContent = this.escapeHtml(error.user_id);
    loginCell.setAttribute("data-login", error.user_id);

    // Crear enlace para ASIN en lugar de texto simple
    this.setupAsinLink(row, error);

    // Completar el resto de celdas
    row.querySelector(".qty-cell").textContent = error.quantity || 1;
    row.querySelector(".bin-id-cell").textContent = this.escapeHtml(
      error.bin_id
    );
    row.querySelector(".time-cell").textContent = this.escapeHtml(error.time);

    // Usar textContent para el texto de la violación
    row.querySelector(".error-cell").textContent = error.violation;

    return row;
  }

  /**
   * Configura el botón de estado en una fila
   * @param {DocumentFragment} row - Fragmento de la fila
   * @param {Object} error - Objeto de error
   * @param {string} status - Estado actual (done/pending)
   */
  setupStatusButton(row, error, status) {
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
      const doneBy =
        error.feedback_user || this.tableController.currentUsername;
      statusText.textContent = `Done (${doneBy})`;
    } else {
      statusText.textContent = "Pending";
    }
  }

  /**
   * Configura el enlace ASIN en una fila
   * @param {DocumentFragment} row - Fragmento de la fila
   * @param {Object} error - Objeto de error
   */
  setupAsinLink(row, error) {
    const asinCell = row.querySelector(".asin-cell");
    asinCell.innerHTML = ""; // Limpiar contenido

    const asinLink = document.createElement("span");
    asinLink.className = "asin-link";
    asinLink.textContent = this.escapeHtml(error.asin);

    // Añadir evento de clic para abrir en navegador externo
    asinLink.addEventListener("click", (e) => {
      e.stopPropagation(); // Evitar que se expanda la fila

      // Crear URL completa
      const url = `http://fcresearch-eu.aka.amazon.com/VLC1/results?s=${error.asin}`;

      // Usar la API para abrir la URL en el navegador externo
      window.api
        .openExternalLink(url)
        .then((result) => {
          if (!result.success) {
            console.error("Error al abrir enlace:", result.error);
          }
        })
        .catch((err) => {
          console.error("Error al llamar a openExternalLink:", err);
        });
    });

    // Hacer que se vea como un enlace
    asinLink.style.cursor = "pointer";

    asinCell.appendChild(asinLink);
  }

  /**
   * Crea una fila de detalles para un error
   * @param {Object} error - Objeto de error
   * @returns {HTMLElement} - Elemento DOM de la fila de detalles
   */
  createDetailsRow(error) {
    // Clonar la plantilla de detalles
    const detailsRow =
      this.tableController.detailsTemplate.content.cloneNode(true);
    const detailsElement = detailsRow.querySelector(".error-details-row");
    detailsElement.classList.add("expanded");

    // Completar datos básicos de los detalles
    this.fillBasicDetails(detailsRow, error);

    // Mostrar comentario de feedback si existe
    if (error.feedback_comment) {
      this.addFeedbackComment(detailsRow, error.feedback_comment);
    }

    // Completar lista de ocurrencias
    this.fillOccurrencesList(detailsRow, error);

    return detailsElement;
  }

  /**
   * Completa los detalles básicos de una fila de detalles
   * @param {DocumentFragment} detailsRow - Fragmento de la fila de detalles
   * @param {Object} error - Objeto de error
   */
  fillBasicDetails(detailsRow, error) {
    detailsRow.querySelector(".id-value").textContent = error.id;
    detailsRow.querySelector(".date-value").textContent = error.date;
    detailsRow.querySelector(".notifications-value").textContent =
      error.times_notified || 0;
  }

  /**
   * Añade un comentario de feedback a los detalles
   * @param {DocumentFragment} detailsRow - Fragmento de la fila de detalles
   * @param {string} comment - Comentario de feedback
   */
  addFeedbackComment(detailsRow, comment) {
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
      value.textContent = comment;

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
        commentValue.textContent = comment;
      }
    }
  }

  /**
   * Completa la lista de ocurrencias en los detalles
   * @param {DocumentFragment} detailsRow - Fragmento de la fila de detalles
   * @param {Object} error - Objeto de error
   */
  fillOccurrencesList(detailsRow, error) {
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
  }

  /**
   * Escapa caracteres HTML para evitar XSS
   * @param {string} unsafe - Texto sin escapar
   * @returns {string} - Texto escapado
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
