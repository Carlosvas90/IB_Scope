/**
 * TableRendererService.js
 * Servicio para renderizar filas y detalles de la tabla
 * Ruta: /src/renderer/apps/feedback-tracker/js/controllers/services/TableRendererService.js
 */

import {
  getAsinResearchUrl,
  openExternalLink,
} from "../../../../../core/utils/linkUtils.js";

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
    console.log(`🏗️ Creando fila para error:`, error.id, error);

    // Clonar la plantilla
    const row = this.tableController.rowTemplate.content.cloneNode(true);
    const rowElement = row.querySelector("tr");

    if (!rowElement) {
      console.error("❌ No se pudo encontrar el elemento tr en la plantilla");
      return null;
    }

    // Establecer ID del error
    rowElement.setAttribute("data-id", error.id);

    // Determinar estado y clases
    const status = error.feedback_status
      ? error.feedback_status.toLowerCase()
      : "pending";
    rowElement.classList.add(status === "done" ? "row-done" : "row-pending");

    console.log(`🎨 Estado del error ${error.id}: ${status}`);

    // Configurar el botón de estado
    this.setupStatusButton(row, error, status);

    // Configurar celda de login con atributo data-login
    const loginCell = row.querySelector(".login-cell");
    if (loginCell) {
      loginCell.textContent = this.escapeHtml(error.user_id);
      loginCell.setAttribute("data-login", error.user_id);
    } else {
      console.warn("⚠️ No se encontró .login-cell");
    }

    // Crear enlace para ASIN en lugar de texto simple
    this.setupAsinLink(row, error);

    // Completar el resto de celdas
    const qtyCell = row.querySelector(".qty-cell");
    if (qtyCell) {
      qtyCell.textContent = error.quantity || 1;
    } else {
      console.warn("⚠️ No se encontró .qty-cell");
    }

    // Agregar old_container
    const oldContainerCell = row.querySelector(".old-container-cell");
    if (oldContainerCell) {
      oldContainerCell.textContent = this.escapeHtml(error.old_container || "");
    } else {
      console.warn("⚠️ No se encontró .old-container-cell");
    }

    // Actualizar para usar new_container en lugar de bin_id
    const binIdCell = row.querySelector(".bin-id-cell");
    if (binIdCell) {
      binIdCell.textContent = this.escapeHtml(error.new_container);
    } else {
      console.warn("⚠️ No se encontró .bin-id-cell");
    }

    const timeCell = row.querySelector(".time-cell");
    if (timeCell) {
      timeCell.textContent = this.escapeHtml(error.time);
    } else {
      console.warn("⚠️ No se encontró .time-cell");
    }

    // Usar textContent para el texto de la violación
    const errorCell = row.querySelector(".error-cell");
    if (errorCell) {
      errorCell.textContent = error.violation;
    } else {
      console.warn("⚠️ No se encontró .error-cell");
    }

    console.log(`✅ Fila creada exitosamente para error ${error.id}`);
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
    console.log(
      `🔧 setupAsinLink llamado para error:`,
      error.id,
      `ASIN: ${error.asin}`
    );

    const asinCell = row.querySelector(".asin-cell");
    if (!asinCell) {
      console.error("❌ No se encontró .asin-cell");
      return;
    }

    asinCell.innerHTML = ""; // Limpiar contenido

    // Validar que el ASIN existe ANTES de crear el elemento
    if (!error.asin) {
      console.log("⚠️ ASIN vacío, mostrando N/A");
      asinCell.textContent = "N/A";
      return;
    }

    const asinLink = document.createElement("span");
    asinLink.className = "asin-link";
    asinLink.textContent = this.escapeHtml(error.asin);
    console.log(`🏷️ Elemento ASIN creado:`, asinLink);

    // Crear URL completa una sola vez
    const url = getAsinResearchUrl(error.asin);
    console.log(`🎯 URL generada: ${url}`);

    // Añadir tooltip informativo
    asinLink.title = `Hacer clic para abrir ${error.asin} en FCResearch (navegador externo)`;

    // El evento de clic se maneja directamente en ErrorsTableController.js
    console.log(
      `✅ Enlace ASIN configurado, evento manejado por ErrorsTableController`
    );

    // Hacer que se vea como un enlace
    asinLink.style.cursor = "pointer";
    asinLink.style.textDecoration = "underline";
    asinLink.style.color = "#0066cc";
    console.log(`🎨 Estilos aplicados al enlace ASIN`);

    asinCell.appendChild(asinLink);
    console.log(`✅ Enlace ASIN agregado a la celda para ${error.asin}`);
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

    // Mostrar datos de feedback si existen
    if (error.feedback_motive || error.feedback_comment) {
      this.addFeedbackDetails(detailsRow, error);
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

    // Agregar old_container a los detalles si existe
    if (error.old_container) {
      // Buscar si ya existe un contenedor para old_container
      let oldContainerElement = detailsRow.querySelector(
        ".detail-item.old-container"
      );

      if (!oldContainerElement) {
        // Crear elemento para old_container
        oldContainerElement = document.createElement("div");
        oldContainerElement.className = "detail-item old-container";

        const label = document.createElement("div");
        label.className = "detail-label";
        label.textContent = "Old Container:";

        const value = document.createElement("div");
        value.className = "detail-value old-container-value";
        value.textContent = error.old_container;

        oldContainerElement.appendChild(label);
        oldContainerElement.appendChild(value);

        // Añadir al contenedor de detalles
        const detailsGrid = detailsRow.querySelector(".details-grid");
        if (detailsGrid) {
          detailsGrid.appendChild(oldContainerElement);
        }
      } else {
        // Si ya existe, actualizar el valor
        const oldContainerValue = oldContainerElement.querySelector(
          ".old-container-value"
        );
        if (oldContainerValue) {
          oldContainerValue.textContent = error.old_container;
        }
      }
    }
  }

  /**
   * Añade los detalles de feedback (motivo y comentario) a los detalles
   * @param {DocumentFragment} detailsRow - Fragmento de la fila de detalles
   * @param {Object} error - Objeto de error con datos de feedback
   */
  addFeedbackDetails(detailsRow, error) {
    const detailsGrid = detailsRow.querySelector(".details-grid");
    if (!detailsGrid) return;

    // Agregar motivo si existe
    if (error.feedback_motive) {
      const motiveContainer = document.createElement("div");
      motiveContainer.className = "detail-item feedback-motive";

      const motiveLabel = document.createElement("div");
      motiveLabel.className = "detail-label";
      motiveLabel.textContent = "Motivo:";

      const motiveValue = document.createElement("div");
      motiveValue.className = "detail-value feedback-motive-value";
      motiveValue.textContent = error.feedback_motive;

      motiveContainer.appendChild(motiveLabel);
      motiveContainer.appendChild(motiveValue);
      detailsGrid.appendChild(motiveContainer);
    }

    // Agregar comentario si existe
    if (error.feedback_comment) {
      const commentContainer = document.createElement("div");
      commentContainer.className = "detail-item feedback-comment";

      const commentLabel = document.createElement("div");
      commentLabel.className = "detail-label";
      commentLabel.textContent = "Comentario:";

      const commentValue = document.createElement("div");
      commentValue.className = "detail-value feedback-comment-value";
      commentValue.textContent = error.feedback_comment;

      commentContainer.appendChild(commentLabel);
      commentContainer.appendChild(commentValue);
      detailsGrid.appendChild(commentContainer);
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
