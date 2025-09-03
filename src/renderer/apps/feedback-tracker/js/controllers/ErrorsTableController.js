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
    this.shiftFilter = "day"; // Nuevo filtro por turno (default: day)
    this.tableBody = null;
    this.rowTemplate = null;
    this.detailsTemplate = null;
    this.currentUsername = "";
    this.expandedRows = new Set(); // Tracking de filas expandidas
    this.isRenderingTable = false; // Control de renderizado
    this.pendingRefresh = false; // Control de refrescos pendientes
    this.isInitialized = false; // Control de inicialización múltiple

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
    console.log("🏁 Iniciando ErrorsTableController...");

    // Evitar múltiples inicializaciones
    if (this.isInitialized) {
      console.log(
        "⚠️ ErrorsTableController ya estaba inicializado, saltando..."
      );
      return true;
    }

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

    this.isInitialized = true;
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
      // Obtener errores filtrados por estado y turno
      const filteredErrors = this.dataController.getFilteredErrors(
        this.statusFilter,
        this.shiftFilter
      );

      console.log(
        `🔍 Renderizando filas virtuales. Errores filtrados: ${filteredErrors.length}`
      );

      // Limpiar tabla
      while (this.tableBody.firstChild) {
        this.tableBody.removeChild(this.tableBody.firstChild);
      }

      // Calcular índices visibles si no están establecidos
      if (this.virtualScroll.endIndex === 0) {
        this.virtualScroll.endIndex = Math.min(
          filteredErrors.length,
          this.virtualScroll.visibleRows + this.virtualScroll.bufferRows * 2
        );
      }

      console.log(
        `🔍 Índices virtuales: ${this.virtualScroll.startIndex} - ${this.virtualScroll.endIndex}`
      );

      // Calcular índices visibles
      const visibleErrorsSlice = filteredErrors.slice(
        this.virtualScroll.startIndex,
        this.virtualScroll.endIndex
      );

      console.log(
        `🔍 Errores visibles a renderizar: ${visibleErrorsSlice.length}`
      );

      // Crear fragmento para mejor rendimiento
      const fragment = document.createDocumentFragment();

      // Renderizar filas visibles
      visibleErrorsSlice.forEach((error, localIndex) => {
        const row = this.rendererService.createTableRow(error);

        // No usar posicionamiento absoluto para simplificar
        fragment.appendChild(row);

        // Si la fila estaba expandida, mostrar detalles
        if (this.expandedRows.has(error.id)) {
          const detailsRow = this.rendererService.createDetailsRow(error);
          fragment.appendChild(detailsRow);
        }
      });

      // Añadir filas al DOM
      this.tableBody.appendChild(fragment);

      console.log(
        `✅ Filas añadidas al DOM. Total en fragment: ${fragment.childNodes.length}`
      );

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
    // Configurar filtros de estado
    const statusFilterButtons = document.querySelectorAll(
      'input[name="status-filter"]'
    );
    statusFilterButtons.forEach((button) => {
      button.addEventListener("change", (e) => {
        this.statusFilter = e.target.value;
        this.filterTable();
      });
    });

    // Configurar filtros de turno
    const shiftFilterButtons = document.querySelectorAll(
      'input[name="shift-filter"]'
    );
    shiftFilterButtons.forEach((button) => {
      button.addEventListener("change", (e) => {
        this.shiftFilter = e.target.value;
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
    console.log("🔧 Configurando eventos de filas...");

    // LIMPIAR todos los event listeners anteriores antes de agregar nuevos
    this.clearAllRowEventListeners();

    // Botones para cambiar estado
    const statusButtons = document.querySelectorAll(".status-btn");
    console.log(`📍 Encontrados ${statusButtons.length} botones de estado`);
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
    console.log(`📍 Encontradas ${expandableRows.length} filas expandibles`);
    expandableRows.forEach((row) => {
      row.addEventListener("click", (event) => {
        console.log(
          "🖱️ Click en fila expandible:",
          row.getAttribute("data-id")
        );
        // Manejar clic en enlace ASIN directamente aquí
        const asinLink = event.target.closest(".asin-link");
        if (asinLink) {
          console.log("🔗 Clic detectado en ASIN link, manejando directamente");

          // Obtener el ASIN del texto del enlace
          const asin = asinLink.textContent.trim();
          console.log(`🎯 ASIN detectado: ${asin}`);

          // Crear URL y abrirla
          const url = `http://fcresearch-eu.aka.amazon.com/VLC1/results?s=${asin}`;
          console.log(`🎯 URL a abrir: ${url}`);

          // Abrir en navegador externo
          if (window.api && window.api.openExternalLink) {
            console.log("✅ Usando window.api.openExternalLink");
            window.api
              .openExternalLink(url)
              .then((result) => {
                console.log("📋 Resultado:", result);
                if (result && result.success) {
                  console.log(
                    "🎉 URL abierta correctamente en navegador externo"
                  );
                } else {
                  console.error(
                    "❌ Error:",
                    result ? result.error : "Desconocido"
                  );
                  window.open(url, "_blank");
                }
              })
              .catch((error) => {
                console.error("💥 Excepción:", error);
                window.open(url, "_blank");
              });
          } else {
            console.log("⚠️ API no disponible, usando window.open");
            window.open(url, "_blank");
          }

          return; // No expandir la fila
        }

        // No expandir si se hace clic en botón de estado
        if (event.target.closest(".status-btn")) {
          console.log("❌ Click ignorado - es en botón de estado");
          return;
        }
        const errorId = row.getAttribute("data-id");
        console.log("✅ Expandiendo detalles para error:", errorId);
        this.toggleErrorDetails(row, errorId);
      });
    });

    console.log("✅ Eventos de filas configurados correctamente");
  }

  /**
   * Limpia TODOS los event listeners de filas para evitar duplicados
   */
  clearAllRowEventListeners() {
    console.log("🧹 Limpiando event listeners anteriores...");

    // Limpiar botones de estado
    const statusButtons = document.querySelectorAll(".status-btn");
    statusButtons.forEach((button) => {
      // Clonar elemento para remover todos los event listeners
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
    });

    // Limpiar filas expandibles
    const expandableRows = document.querySelectorAll(".expandable-row");
    expandableRows.forEach((row) => {
      // Clonar elemento para remover todos los event listeners
      const newRow = row.cloneNode(true);
      row.parentNode.replaceChild(newRow, row);
    });

    console.log("🧹 Event listeners anteriores limpiados");
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
          feedbackData // Pasar todo el objeto feedbackData
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
        null // Sin datos de feedback para cambio a pending
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
   * Establece el filtro por turno
   */
  setShiftFilter(filter) {
    this.shiftFilter = filter;
  }

  /**
   * Actualiza la tabla con los datos actuales
   */
  updateTable() {
    console.log("🔄 updateTable llamado");
    console.time("UpdateTable");

    if (!this.tableBody) return;

    // Verificar si usar virtualización
    const errors = this.dataController.errors;
    console.log(`📊 Total de errores: ${errors.length}`);
    this.virtualScroll.enabled = errors.length > 1000; // Aumentar umbral para evitar problemas
    console.log(`🔧 Virtualización activada: ${this.virtualScroll.enabled}`);

    if (this.virtualScroll.enabled) {
      // Usar renderizado virtual para grandes conjuntos de datos
      this.renderVisibleRows();
    } else {
      // Limpiar tabla
      this.tableBody.innerHTML = "";

      // Obtener errores filtrados por estado y turno
      const filteredErrors = this.dataController.getFilteredErrors(
        this.statusFilter,
        this.shiftFilter
      );

      console.log(
        `📋 Errores filtrados (Estado: ${this.statusFilter}, Turno: ${this.shiftFilter}): ${filteredErrors.length}`
      );

      // Si no hay datos, mostrar mensaje
      if (filteredErrors.length === 0) {
        this.tableBody.innerHTML = `
          <tr>
            <td colspan="8" class="empty-message">
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
      filteredErrors.forEach((error, index) => {
        console.log(
          `🔨 Creando fila ${index + 1}/${filteredErrors.length} para error:`,
          error.id
        );
        const row = this.rendererService.createTableRow(error);
        fragment.appendChild(row);
      });

      console.log(`✅ Fragment creado con ${fragment.childNodes.length} filas`);

      // Añadir filas al DOM
      this.tableBody.appendChild(fragment);

      console.log(
        `✅ Filas añadidas al DOM. Tabla ahora tiene ${this.tableBody.children.length} filas`
      );

      // Añadir eventos a las filas
      this.setupRowEvents();
    }

    // Actualizar contadores
    this.updateCounters();

    console.timeEnd("UpdateTable");
  }

  /**
   * Filtra la tabla según los filtros seleccionados (estado y turno)
   */
  filterTable() {
    // Si usamos virtualización, refrescar todo el renderizado
    if (this.virtualScroll.enabled) {
      this.virtualScroll.startIndex = 0;
      this.renderVisibleRows();
      return;
    }

    // Para el enfoque tradicional, necesitamos volver a cargar los datos
    // ya que el filtro por turno requiere procesar la hora de cada error
    this.updateTable();

    // Actualizar contadores visibles
    this.updateCounters();
  }

  /**
   * Actualiza los contadores en la interfaz
   */
  updateCounters() {
    const stats = this.dataController.getStatistics();

    const totalElement = document.getElementById("total-errors");
    const pendingElement = document.getElementById("pending-errors");
    const doneElement = document.getElementById("done-errors");
    const lastUpdateElement = document.getElementById("last-update");

    if (totalElement) {
      // Mostrar el total real de errores (suma de quantities)
      totalElement.textContent = stats.total;
      // Opcionalmente, mostrar también el número de líneas
      totalElement.title = `${stats.total} errores totales (${stats.totalLines} líneas de datos)`;
    }

    if (pendingElement) {
      pendingElement.textContent = stats.pending;
    }

    if (doneElement) {
      doneElement.textContent = stats.done;
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
    console.log("🔍 toggleErrorDetails llamado para error:", errorId);

    // Manejar expansión diferente según si está virtualizada
    if (this.virtualScroll.enabled) {
      console.log("📊 Usando modo virtualización");
      // En modo virtualización, manejar con tracking de ids expandidos
      if (this.expandedRows.has(errorId)) {
        this.expandedRows.delete(errorId);
        console.log("➖ Contrayendo error en virtualización:", errorId);
      } else {
        this.expandedRows.add(errorId);
        console.log("➕ Expandiendo error en virtualización:", errorId);
      }

      // Re-renderizar filas visibles
      this.renderVisibleRows();
      return;
    }

    console.log("📋 Usando modo tradicional");
    // Modo tradicional
    const nextRow = row.nextElementSibling;
    console.log("🔍 Siguiente fila:", nextRow);

    // Si ya está expandido, solo alternar visibilidad
    if (nextRow && nextRow.classList.contains("error-details-row")) {
      console.log("🔄 Alternando visibilidad de fila existente");
      console.log("🔍 Estado antes:", {
        classList: Array.from(nextRow.classList),
        display: getComputedStyle(nextRow).display,
        visible: nextRow.offsetHeight > 0,
        height: nextRow.offsetHeight + "px",
      });

      nextRow.classList.toggle("expanded");

      // Verificar estado después del toggle
      setTimeout(() => {
        console.log("🔍 Estado después:", {
          classList: Array.from(nextRow.classList),
          display: getComputedStyle(nextRow).display,
          visible: nextRow.offsetHeight > 0,
          height: nextRow.offsetHeight + "px",
        });
      }, 50);

      return;
    }

    // Si no está expandido, generar y mostrar detalles
    console.log("🆕 Creando nueva fila de detalles");
    const error = this.dataController.errors.find(
      (error) => error.id === errorId
    );
    if (!error) {
      console.warn(`❌ Error no encontrado: ${errorId}`);
      return;
    }

    console.log("✅ Error encontrado, creando detalles:", error);
    const detailsElement = this.rendererService.createDetailsRow(error);
    detailsElement.classList.add("expanded"); // Asegurar que se muestre por defecto

    // Hacer la fila de detalles MUY VISIBLE para debug
    detailsElement.style.backgroundColor = "#e8f5e8";
    detailsElement.style.border = "2px solid #4CAF50";
    detailsElement.style.fontWeight = "bold";

    row.parentNode.insertBefore(detailsElement, row.nextSibling);
    console.log("✅ Fila de detalles insertada");
    console.log("🔍 Nueva fila estado:", {
      classList: Array.from(detailsElement.classList),
      display: getComputedStyle(detailsElement).display,
      visible: detailsElement.offsetHeight > 0,
      height: detailsElement.offsetHeight + "px",
    });
  }
}
