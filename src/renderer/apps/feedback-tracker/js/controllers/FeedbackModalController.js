/**
 * FeedbackModalController.js
 * Controlador para el modal de comentarios de feedback
 * Ruta: /src/renderer/apps/feedback-tracker/js/controllers/FeedbackModalController.js
 */

import { SimilarErrorsService } from "./services/SimilarErrorsService.js";

export class FeedbackModalController {
  constructor(dataService) {
    this.dataService = dataService;
    this.modal = null;
    this.form = null;
    this.reasonSelect = null;
    this.commentInput = null;
    this.closeBtn = null;
    this.cancelBtn = null;
    this.submitBtn = null;

    // Callback para cuando se envía el formulario
    this.onSubmitCallback = null;

    // Datos actuales del error
    this.currentErrorId = null;

    // Razones disponibles
    this.reasons = [];

    // Ruta del archivo de configuración
    this.configPath = "config/config_reasons.json";

    // Servicio de errores similares
    this.similarErrorsService = new SimilarErrorsService(dataService);

    // Elementos del DOM para errores similares
    this.similarErrorsSection = null;
    this.similarErrorsMessage = null;
    this.similarErrorsDetails = null;
  }

  /**
   * Inicializa el controlador del modal
   */
  async init() {
    // Obtener elementos del DOM
    this.modal = document.getElementById("feedback-modal");
    this.form = document.getElementById("feedback-form");
    this.reasonSelect = document.getElementById("feedback-reason");
    this.commentInput = document.getElementById("feedback-comment");
    this.closeBtn = document.getElementById("modal-close-btn");
    this.cancelBtn = document.getElementById("cancel-feedback-btn");
    this.submitBtn = document.getElementById("submit-feedback-btn");

    // Elementos para errores similares
    this.similarErrorsSection = document.getElementById(
      "similar-errors-section"
    );
    this.similarErrorsMessage = document.getElementById(
      "similar-errors-message"
    );
    this.similarErrorsDetails = document.getElementById(
      "similar-errors-details"
    );

    if (!this.modal || !this.form || !this.reasonSelect) {
      console.error(
        "No se encontraron los elementos necesarios para el modal de feedback"
      );
      return false;
    }

    // Configurar eventos
    this.setupEvents();

    // Cargar razones desde configuración
    await this.loadReasons();

    return true;
  }

  /**
   * Configura los eventos del modal
   */
  setupEvents() {
    // Cerrar modal con botón X
    this.closeBtn.addEventListener("click", () => {
      this.hide();
    });

    // Cerrar modal con botón Cancelar
    this.cancelBtn.addEventListener("click", () => {
      this.hide();
    });

    // Cerrar modal al hacer clic fuera del contenido
    this.modal.addEventListener("click", (event) => {
      if (event.target === this.modal) {
        this.hide();
      }
    });

    // Manejar envío del formulario
    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.handleSubmit();
    });

    // Escuchar tecla Escape para cerrar
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isVisible()) {
        this.hide();
      }
    });
  }

  /**
   * Carga las razones desde el archivo de configuración
   */
  async loadReasons() {
    try {
      // Intentar cargar razones desde el archivo de configuración
      const result = await window.api.readJson(this.configPath);

      if (result.success && result.data && result.data.feedback_reasons) {
        this.reasons = result.data.feedback_reasons;
        this.populateReasonSelect();
        console.log("Razones de feedback cargadas:", this.reasons.length);
      } else {
        // Si no se puede cargar, usar valores predeterminados
        console.warn(
          "No se pudo cargar el archivo de razones, usando valores predeterminados"
        );
        this.useDefaultReasons();
      }
    } catch (error) {
      console.error("Error al cargar razones de feedback:", error);
      this.useDefaultReasons();
    }
  }

  /**
   * Establece razones predeterminadas si no se puede cargar el archivo
   */
  useDefaultReasons() {
    this.reasons = [
      { id: "desconocimiento", label: "Desconocimiento (no sabía)" },
      { id: "filtro_incorrecto", label: "Filtro incorrecto" },
      { id: "reincidente", label: "Persona reincidente" },
      { id: "bins_llenas", label: "Bins llenas" },
      { id: "otro", label: "Otro motivo" },
    ];

    this.populateReasonSelect();
  }

  /**
   * Llena el dropdown con las razones disponibles
   */
  populateReasonSelect() {
    // Limpiar opciones actuales
    while (this.reasonSelect.options.length > 1) {
      this.reasonSelect.remove(1);
    }

    // Añadir nuevas opciones
    this.reasons.forEach((reason) => {
      const option = document.createElement("option");
      option.value = reason.id;
      option.textContent = reason.label;
      this.reasonSelect.appendChild(option);
    });
  }

  /**
   * Muestra el modal para un error específico
   */
  show(errorId, callback) {
    console.log(
      `🎭 FeedbackModalController: Abriendo modal para error ID: ${errorId}`
    );
    this.currentErrorId = errorId;
    this.onSubmitCallback = callback;

    // Reiniciar formulario
    this.form.reset();

    // Ocultar sección de errores similares inicialmente
    this.hideSimilarErrorsSection();

    // Buscar errores similares
    this.loadSimilarErrors(errorId);

    // Mostrar modal con animación
    this.modal.classList.add("show");

    // Enfocar en el select de razones
    setTimeout(() => {
      this.reasonSelect.focus();
    }, 300);
  }

  /**
   * Oculta el modal
   */
  hide() {
    this.modal.classList.remove("show");
    this.currentErrorId = null;
  }

  /**
   * Verifica si el modal está visible
   */
  isVisible() {
    return this.modal.classList.contains("show");
  }

  /**
   * Maneja el envío del formulario
   */
  handleSubmit() {
    // Validar formulario
    if (!this.reasonSelect.value) {
      alert("Por favor seleccione una razón");
      return;
    }

    // Obtener valores
    const reasonId = this.reasonSelect.value;
    const reasonLabel =
      this.reasonSelect.options[this.reasonSelect.selectedIndex].text;
    const comment = this.commentInput.value.trim();

    // Ejecutar callback con datos separados
    if (typeof this.onSubmitCallback === "function") {
      this.onSubmitCallback({
        errorId: this.currentErrorId,
        reasonId: reasonId,
        reasonLabel: reasonLabel,
        comment: comment,
        // Mantener feedbackComment para compatibilidad temporal
        feedbackComment: comment ? `${reasonLabel}: ${comment}` : reasonLabel,
      });
    }

    // Ocultar modal
    this.hide();
  }

  /**
   * Carga y muestra información de errores similares
   */
  loadSimilarErrors(errorId) {
    try {
      console.log(
        `🔍 FeedbackModalController: Buscando errores similares para error ID: ${errorId}`
      );
      const similarInfo = this.similarErrorsService.findSimilarErrors(errorId);

      console.log(`📊 FeedbackModalController: Resultados de búsqueda:`, {
        totalCount: similarInfo.totalCount,
        pendingCount: similarInfo.pendingCount,
        referenceError: similarInfo.referenceError,
      });

      if (similarInfo.totalCount === 0) {
        console.log(
          `ℹ️ FeedbackModalController: No se encontraron errores similares, ocultando sección`
        );
        this.hideSimilarErrorsSection();
        return;
      }

      console.log(
        `✅ FeedbackModalController: Mostrando sección de errores similares`
      );
      // Mostrar la sección de errores similares
      this.showSimilarErrorsSection(similarInfo);
    } catch (error) {
      console.error(
        "❌ FeedbackModalController: Error al cargar errores similares:",
        error
      );
      this.hideSimilarErrorsSection();
    }
  }

  /**
   * Muestra la sección de errores similares
   */
  showSimilarErrorsSection(similarInfo) {
    if (!this.similarErrorsSection) return;

    // Generar y mostrar solo el mensaje
    const message =
      this.similarErrorsService.generateSimilarErrorsMessage(similarInfo);
    this.similarErrorsMessage.textContent = message;

    // Mostrar la sección
    this.similarErrorsSection.style.display = "block";
  }

  /**
   * Oculta la sección de errores similares
   */
  hideSimilarErrorsSection() {
    if (this.similarErrorsSection) {
      this.similarErrorsSection.style.display = "none";
    }
  }
}
