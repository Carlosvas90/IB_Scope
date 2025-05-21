/**
 * app.js
 * Punto de entrada principal para la aplicación del lado del cliente
 */

// Importar servicios centrales
import { ThemeService } from "../core/services/ThemeService.js";
import { DataService } from "../apps/feedback-tracker/js/services/DataService.js";
import { router } from "./router.js";
import { appLoader } from "./app-loader.js";
// Ya no necesitamos importar lottie aquí, ya que lo cargamos desde CDN
// import lottie from "lottie-web";
import { permisosService } from "../core/services/PermisosService.js";
import { PermisosController } from "../core/controllers/PermisosController.js";
import { initializeLotties } from "./lottieManager.js";

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
// Inicializar Lotties
const isDarkMode = localStorage.getItem("darkMode") === "true";
initializeLotties(isDarkMode);

document.addEventListener("DOMContentLoaded", async () => {
  await permisosService.init();

  // Bloquear visualmente apps y submenús sin permiso en el sidebar
  const navLinks = document.querySelectorAll(".sidebar-nav a[data-app]");
  navLinks.forEach((link) => {
    const appName = link.getAttribute("data-app");
    const viewName = link.getAttribute("data-view") || null;
    if (!permisosService.tienePermiso(appName, viewName)) {
      link.classList.add("app-locked");
      // Añadir candado SVG si no existe ya
      if (!link.querySelector(".lock-icon")) {
        const lockSvg = document.createElement("span");
        lockSvg.className = "lock-icon";
        lockSvg.innerHTML = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="7" width="8" height="5" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M6 7V5.5A2 2 0 0 1 10 5.5V7" stroke="currentColor" stroke-width="1.2"/></svg>`;
        link.appendChild(lockSvg);
      }
    }
  });

  // Inicializar el controlador de permisos
  new PermisosController();

  // Inicializar el router y la app principal solo después de los permisos
  appLoader.init();
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
