/**
 * app.js
 * Punto de entrada principal para la aplicación del lado del cliente
 */

// Importar servicios centrales
import { ThemeService } from "../core/services/ThemeService.js";
import { DataService } from "../apps/feedback-tracker/js/services/DataService.js";
import { router } from "./router.js";
import { appLoader } from "./app-loader.js";

// Clase principal de la aplicación
class InboundScope {
  constructor() {
    this.themeService = null;
    this.dataService = null;
    this.username = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa la aplicación
   */
  async init() {
    try {
      console.log("Inicializando Inbound Scope...");

      // Inicializar servicios
      this.themeService = new ThemeService();
      this.dataService = new DataService();

      // Cargar usuario y configuración
      await this.loadUserInfo();

      // Configurar eventos globales
      this.setupGlobalEvents();

      // Marcar como inicializado
      this.isInitialized = true;

      console.log("Inbound Scope inicializado correctamente");
      return true;
    } catch (error) {
      console.error("Error al inicializar la aplicación:", error);
      this.showErrorMessage(
        "Error al inicializar la aplicación",
        error.message
      );
      return false;
    }
  }

  /**
   * Carga la información del usuario
   */
  async loadUserInfo() {
    try {
      // Obtener nombre de usuario desde la API
      this.username = await window.api.getUsername();

      // Actualizar en la interfaz
      const usernameElement = document.getElementById("username");
      if (usernameElement) {
        usernameElement.textContent = `Usuario: ${this.username}`;
      }

      return true;
    } catch (error) {
      console.error("Error al cargar información del usuario:", error);

      // Establecer un valor por defecto
      this.username = "Usuario";

      return false;
    }
  }

  /**
   * Configura eventos globales
   */
  setupGlobalEvents() {
    // Toggle de tema
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        this.themeService.toggleTheme();
      });
    }

    // Escuchar eventos del router
    router.on("app:ready", (data) => {
      // Asegurarse de que los servicios sean accesibles para la aplicación cargada
      console.log("Aplicación lista:", data.app);

      // Registrar servicios globalmente para que la app los pueda usar
      window.appServices = {
        dataService: this.dataService,
        themeService: this.themeService,
        username: this.username,
      };
    });
  }

  /**
   * Muestra un mensaje de error en la interfaz
   */
  showErrorMessage(title, message) {
    // Implementar notificación de error
    console.error(title, message);

    // Mostrar toast si está disponible
    if (window.showToast) {
      window.showToast(`${title}: ${message}`, "error");
    }
  }
}

// Crear instancia global
window.inboundScope = new InboundScope();

// Al cargar el documento
document.addEventListener("DOMContentLoaded", async () => {
  // Inicializar la aplicación
  await window.inboundScope.init();
});

// Función global para mostrar notificaciones al usuario
window.showToast = function (message, type = "info") {
  const toast = document.getElementById("toast");

  if (!toast) return;

  // Limpiar clases anteriores
  toast.className = "toast";

  // Añadir clase según el tipo
  toast.classList.add(`toast-${type}`);

  // Establecer el mensaje
  toast.textContent = message;

  // Mostrar el toast
  toast.classList.add("show");

  // Ocultar después de 3 segundos
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
};

// Exportar la instancia
export { InboundScope };
