/**
 * FeedbackModalController.js
 * Controlador para el modal de comentarios de feedback
 * - Por defecto: Muestra formulario de feedback (90% de los casos)
 * - Botón "NO ES UN ERROR": Permite actualizar ASIN o agregar excepción
 *
 * Ruta: /src/renderer/apps/feedback-tracker/js/controllers/FeedbackModalController.js
 */

import { SimilarErrorsService } from "./services/SimilarErrorsService.js";
import { ASINUpdateService } from "./services/ASINUpdateService.js";
import { ExceptionsService } from "./services/ExceptionsService.js";

export class FeedbackModalController {
  constructor(dataService) {
    this.dataService = dataService;
    this.modal = null;
    this.form = null;

    // Elementos del formulario de feedback (por defecto)
    this.feedbackStep = null;
    this.reasonSelect = null;
    this.commentInput = null;

    // Elementos comunes
    this.closeBtn = null;
    this.cancelBtn = null;
    this.submitBtn = null;

    // Callback para cuando se envía el formulario
    this.onSubmitCallback = null;

    // Datos actuales del error
    this.currentErrorId = null;
    this.currentErrorData = null;

    // Razones disponibles (para feedback normal)
    this.reasons = [];

    // Ruta del archivo de configuración
    this.configPath = null;

    // Servicios
    this.similarErrorsService = new SimilarErrorsService(dataService);
    this.asinUpdateService = new ASINUpdateService();
    this.exceptionsService = new ExceptionsService();

    // Elementos del DOM para errores similares
    this.similarErrorsSection = null;
    this.similarErrorsMessage = null;

    // Modal de confirmación personalizado
    this.confirmationModal = null;
    this.confirmationTitle = null;
    this.confirmationMessage = null;
    this.confirmAcceptBtn = null;
    this.confirmCancelBtn = null;
    this.confirmResolve = null;
  }

  /**
   * Inicializa el controlador del modal
   */
  async init() {
    // Obtener elementos del DOM
    this.modal = document.getElementById("feedback-modal");
    this.form = document.getElementById("feedback-form");

    // Elementos del formulario de feedback
    this.feedbackStep = document.getElementById("feedback-step");
    this.reasonSelect = document.getElementById("feedback-reason");
    this.commentInput = document.getElementById("feedback-comment");

    // Elementos comunes
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

    // Elementos del modal de confirmación
    this.confirmationModal = document.getElementById("confirmation-modal");
    this.confirmationTitle = document.getElementById("confirmation-title");
    this.confirmationMessage = document.getElementById("confirmation-message");
    this.confirmAcceptBtn = document.getElementById("confirm-accept-btn");
    this.confirmCancelBtn = document.getElementById("confirm-cancel-btn");

    if (!this.modal || !this.form || !this.reasonSelect) {
      console.error(
        "No se encontraron los elementos necesarios para el modal de feedback"
      );
      return false;
    }

    if (!this.confirmationModal) {
      console.error("No se encontró el modal de confirmación");
      return false;
    }

    // Configurar eventos
    this.setupEvents();

    // Cargar razones desde configuración
    await this.loadReasons();

    // Inicializar servicios
    await this.asinUpdateService.init();
    await this.exceptionsService.init();

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
      this.handleFeedbackSubmit();
    });

    // Escuchar tecla Escape para cerrar
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isVisible()) {
        this.hide();
      }
    });

    // Botones de "NO ES UN ERROR" - Usar delegación de eventos
    document.addEventListener("click", (event) => {
      const btn = event.target.closest(
        '[data-action="exception"], [data-action="update-asin"]'
      );

      if (btn) {
        console.log(
          "🎯 Click en botón de acción detectado:",
          btn.dataset.action
        );
        console.log("📋 Modal visible:", this.isVisible());
        console.log("📋 Datos actuales:", this.currentErrorData);
      }

      // Solo procesar si el modal está visible y el botón existe
      if (btn && this.isVisible() && this.currentErrorData) {
        console.log("✅ Procesando acción del botón:", btn.dataset.action);
        event.preventDefault();
        event.stopPropagation();
        const action = btn.dataset.action;
        this.handleNotErrorAction(action);
      } else if (btn) {
        console.warn("⚠️ Botón clickeado pero condiciones no cumplidas:");
        console.warn("  - Modal visible:", this.isVisible());
        console.warn("  - Datos disponibles:", !!this.currentErrorData);
      }
    });
  }

  /**
   * Carga las razones desde el archivo de configuración
   */
  async loadReasons() {
    try {
      const appPath = await window.api.getAppPath();
      this.configPath = `${appPath}/config/config_reasons.json`;

      console.log("📋 Intentando cargar razones desde:", this.configPath);

      const result = await window.api.readJson(this.configPath);

      if (result.success && result.data && result.data.feedback_reasons) {
        this.reasons = result.data.feedback_reasons;
        this.populateReasonSelect();
        console.log("✅ Razones de feedback cargadas:", this.reasons.length);
      } else {
        console.warn(
          "⚠️ No se pudo cargar el archivo de razones, usando valores predeterminados"
        );
        this.useDefaultReasons();
      }
    } catch (error) {
      console.error("❌ Error al cargar razones de feedback:", error);
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

    // Establecer datos directamente (NO limpiar primero)
    this.currentErrorId = errorId;
    this.onSubmitCallback = callback;

    // Buscar datos del error
    console.log(
      "🔍 Buscando error en dataService.errors:",
      this.dataService.errors.length,
      "errores disponibles"
    );

    const errorData = this.dataService.errors.find((e) => e.id === errorId);

    if (!errorData) {
      console.error("❌ No se encontró el error con ID:", errorId);
      console.error(
        "IDs disponibles:",
        this.dataService.errors.slice(0, 5).map((e) => e.id)
      );
      this.currentErrorData = null;
      return;
    }

    // Asignar datos encontrados
    this.currentErrorData = errorData;

    // ROBUSTEZ: Guardar también en el DOM como backup
    this.modal.dataset.errorId = errorData.id;
    this.modal.dataset.errorAsin = errorData.asin;
    this.modal.dataset.errorViolation = errorData.violation || "";
    this.modal.dataset.errorUserId = errorData.user_id || "";

    console.log(
      "✅ Datos del error cargados y asignados a this.currentErrorData:",
      {
        id: this.currentErrorData.id,
        asin: this.currentErrorData.asin,
        violation: this.currentErrorData.violation,
      }
    );

    console.log("🔒 Datos también guardados en DOM como backup");

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
    console.log("🚪 Ocultando modal feedback");
    this.modal.classList.remove("show");

    // NO borrar currentErrorId ni currentErrorData aquí
    // Se limpiarán al abrir un nuevo error en show()
    // Esto permite que los botones de acción funcionen correctamente
  }

  /**
   * Verifica si el modal está visible
   */
  isVisible() {
    return this.modal.classList.contains("show");
  }

  /**
   * Maneja el envío de feedback normal
   */
  async handleFeedbackSubmit() {
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
        action: "feedback",
        reasonId: reasonId,
        reasonLabel: reasonLabel,
        comment: comment,
        feedbackComment: comment ? `${reasonLabel}: ${comment}` : reasonLabel,
      });
    }

    // Ocultar modal
    this.hide();
  }

  /**
   * Muestra el modal de confirmación personalizado
   * @param {string} title - Título del modal
   * @param {string} message - Mensaje a mostrar
   * @returns {Promise<boolean>} - true si confirma, false si cancela
   */
  showConfirmation(title, message) {
    console.log("🎨 showConfirmation llamado con:", { title, message });
    return new Promise((resolve) => {
      // Guardar resolve para usarlo en los event listeners
      this.confirmResolve = resolve;

      // Configurar contenido
      this.confirmationTitle.textContent = title;
      this.confirmationMessage.textContent = message;

      console.log("🎨 Mostrando modal de confirmación personalizado");
      // Mostrar modal
      this.confirmationModal.style.display = "flex";

      // Event listener para "Confirmar" (solo una vez)
      const handleAccept = () => {
        console.log("✅ Usuario hizo clic en CONFIRMAR");
        this.confirmationModal.style.display = "none";
        this.confirmAcceptBtn.removeEventListener("click", handleAccept);
        this.confirmCancelBtn.removeEventListener("click", handleCancel);
        resolve(true);
      };

      // Event listener para "Cancelar" (solo una vez)
      const handleCancel = () => {
        console.log("❌ Usuario hizo clic en CANCELAR");
        this.confirmationModal.style.display = "none";
        this.confirmAcceptBtn.removeEventListener("click", handleAccept);
        this.confirmCancelBtn.removeEventListener("click", handleCancel);
        resolve(false);
      };

      // Agregar event listeners
      this.confirmAcceptBtn.addEventListener("click", handleAccept);
      this.confirmCancelBtn.addEventListener("click", handleCancel);

      // También cerrar con ESC
      const handleEsc = (e) => {
        if (e.key === "Escape") {
          this.confirmationModal.style.display = "none";
          this.confirmAcceptBtn.removeEventListener("click", handleAccept);
          this.confirmCancelBtn.removeEventListener("click", handleCancel);
          document.removeEventListener("keydown", handleEsc);
          resolve(false);
        }
      };
      document.addEventListener("keydown", handleEsc);
    });
  }

  /**
   * Maneja las acciones de "NO ES UN ERROR"
   * @param {string} action - 'exception' o 'update-asin'
   */
  async handleNotErrorAction(action) {
    // Intentar obtener datos de currentErrorData o del DOM (backup)
    let errorData = this.currentErrorData;

    if (!errorData && this.modal.dataset.errorAsin) {
      console.warn("⚠️ currentErrorData es null, recuperando desde DOM backup");
      errorData = {
        id: this.modal.dataset.errorId,
        asin: this.modal.dataset.errorAsin,
        violation: this.modal.dataset.errorViolation,
        user_id: this.modal.dataset.errorUserId,
      };
      // Restaurar currentErrorData
      this.currentErrorData = errorData;
      console.log("✅ Datos restaurados desde DOM:", errorData);
    }

    if (!errorData || !errorData.asin) {
      console.error(
        "❌ No hay datos del error disponibles (ni en memory ni en DOM)"
      );
      return;
    }

    // Mostrar confirmación con explicación
    const asin = errorData.asin;
    const violation = errorData.violation || "N/A";

    let title = "";
    let message = "";

    if (action === "exception") {
      title = "Agregar como Excepción";
      message =
        `ASIN: ${asin}\n` +
        `Regla: ${violation}\n\n` +
        `Este ASIN se agregará a la lista de excepciones.\n` +
        `NO saldrá más como error para este motivo.\n\n` +
        `Los futuros errores de este ASIN serán ignorados.`;
    } else if (action === "update-asin") {
      title = "Actualizar Datos del ASIN";
      message =
        `ASIN: ${asin}\n` +
        `Regla: ${violation}\n\n` +
        `El ASIN se marcará para actualización por\n` +
        `discrepancia con datos de FCresearch.\n\n` +
        `Los datos se sincronizarán en el próximo proceso.`;
    }

    console.log("🔔 Mostrando modal de confirmación...");
    const confirmed = await this.showConfirmation(title, message);
    console.log("🔔 Resultado de confirmación:", confirmed);

    if (!confirmed) {
      console.log("❌ Usuario canceló la acción");
      return;
    }

    console.log("✅ Usuario confirmó la acción");
    console.log(`📌 Procesando acción: ${action} para ASIN:`, errorData.asin);

    let success = false;
    let feedbackComment = "";

    if (action === "exception") {
      // Asegurar que el servicio esté inicializado y usar rutas correctas
      console.log("🔧 Inicializando ExceptionsService...");
      
      // Si el servicio ya está inicializado pero usa ruta fallback, reinicializar
      const isUsingFallback = this.exceptionsService.filePath && 
        this.exceptionsService.filePath.includes("Ejemplos");
      
      if (!this.exceptionsService.isInitialized || isUsingFallback) {
        console.log("🔄 Reinicializando ExceptionsService para usar rutas del config...");
        this.exceptionsService.isInitialized = false;
        this.exceptionsService.initPromise = null;
        await this.exceptionsService.init();
      }
      
      console.log("🔧 ExceptionsService inicializado:", this.exceptionsService.isInitialized);
      console.log("🔧 Ruta del archivo:", this.exceptionsService.filePath);
      console.log("🔧 ExceptionsPaths:", this.exceptionsService.exceptionsPaths);
      
      // Agregar excepción
      console.log("📝 Llamando a addException con:", {
        asin: errorData.asin,
        violation: errorData.violation
      });
      success = await this.exceptionsService.addException(
        errorData.asin,
        errorData.violation,
        "Excepción manual del usuario - No es considerado un error"
      );
      console.log("📝 Resultado de addException:", success);
      feedbackComment = "EXCEPCIÓN: No es considerado un error";
    } else if (action === "update-asin") {
      // Asegurar que el servicio esté inicializado y usar rutas correctas
      console.log("🔧 Inicializando ASINUpdateService...");
      
      // Si el servicio ya está inicializado pero usa ruta fallback, reinicializar
      const isUsingFallback = this.asinUpdateService.filePath && 
        this.asinUpdateService.filePath.includes("Ejemplos");
      
      if (!this.asinUpdateService.isInitialized || isUsingFallback) {
        console.log("🔄 Reinicializando ASINUpdateService para usar rutas del config...");
        this.asinUpdateService.isInitialized = false;
        this.asinUpdateService.initPromise = null;
        await this.asinUpdateService.init();
      }
      
      console.log("🔧 ASINUpdateService inicializado:", this.asinUpdateService.isInitialized);
      console.log("🔧 Ruta del archivo:", this.asinUpdateService.filePath);
      console.log("🔧 DataPaths:", this.asinUpdateService.dataPaths);
      
      // Marcar para actualización
      console.log("📝 Llamando a addASIN con:", {
        asin: errorData.asin
      });
      success = await this.asinUpdateService.addASIN(
        errorData.asin,
        "Datos desactualizados - Solicitud manual del usuario"
      );
      console.log("📝 Resultado de addASIN:", success);
      feedbackComment = "ACTUALIZAR ASIN: Datos desactualizados";
    }

    if (success) {
      console.log(`✅ Acción ${action} completada exitosamente`);

      // Ejecutar callback
      if (typeof this.onSubmitCallback === "function") {
        this.onSubmitCallback({
          errorId: this.currentErrorId,
          action: action,
          reasonLabel:
            action === "exception"
              ? "Excepción agregada"
              : "ASIN marcado para actualización",
          comment: feedbackComment,
          feedbackComment: feedbackComment,
        });
      }

      // Ocultar modal
      this.hide();
    } else {
      console.error(
        `❌ Error al procesar la acción ${action}. Revisa los logs anteriores.`
      );
    }
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

    const message =
      this.similarErrorsService.generateSimilarErrorsMessage(similarInfo);
    this.similarErrorsMessage.textContent = message;

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
