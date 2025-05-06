/**
 * app-loader.js
 * Carga dinámicamente las aplicaciones y gestiona su ciclo de vida
 */

import { router } from "./router.js";

class AppLoader {
  constructor() {
    // Registrar las aplicaciones disponibles
    this.apps = {
      dashboard: {
        name: "Inicio",
        description: "Panel de control principal",
        icon: "home",
        initializer: "initDashboard",
        styles: ["../apps/dashboard/css/dashboard.css"],
      },
      "feedback-tracker": {
        name: "Feedback Tracker",
        description: "Seguimiento y gestión de errores",
        icon: "alert-triangle",
        initializer: "initFeedbackTracker",
        styles: [
          "../apps/feedback-tracker/css/feedback-tracker.css",
          "../apps/feedback-tracker/css/table.css",
        ],
      },
      // Aquí se pueden registrar más aplicaciones en el futuro
    };

    // Aplicación actual
    this.currentApp = null;

    // Mantener registro de estilos cargados
    this.loadedStyles = {};
  }

  /**
   * Inicializa el cargador de aplicaciones
   */
  init() {
    // Escuchar eventos del router
    router.on("app:loaded", this.handleAppLoaded.bind(this));

    // Inicializar el router
    router.init();

    return true;
  }

  /**
   * Maneja el evento de carga de aplicación
   */
  handleAppLoaded(data) {
    const { app, view } = data;

    // Verificar si la aplicación está registrada
    if (!this.apps[app]) {
      console.error(`Aplicación no registrada: ${app}`);
      return;
    }

    // Cargar estilos de la aplicación
    this.loadAppStyles(app);

    // Inicializar la aplicación
    this.initializeApp(app, view);
  }

  /**
   * Carga los estilos de una aplicación
   */
  loadAppStyles(appName) {
    const app = this.apps[appName];
    if (!app || !app.styles || !app.styles.length) {
      return;
    }

    // Si los estilos ya están cargados, no hacer nada
    if (this.loadedStyles[appName]) {
      console.log(`Estilos para ${appName} ya cargados`);
      return;
    }

    console.log(`Cargando estilos para ${appName}:`, app.styles);

    // Cargar cada estilo
    app.styles.forEach((styleUrl) => {
      // Verificar si el estilo ya está en el documento
      if (document.querySelector(`link[href="${styleUrl}"]`)) {
        console.log(`Estilo ya cargado: ${styleUrl}`);
        return;
      }

      // Crear elemento link
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = styleUrl;
      link.setAttribute("data-app", appName);

      // Añadir al head
      document.head.appendChild(link);
      console.log(`Estilo cargado: ${styleUrl}`);
    });

    // Marcar estilos como cargados
    this.loadedStyles[appName] = true;
  }

  /**
   * Inicializa una aplicación
   */
  initializeApp(appName, viewName) {
    const app = this.apps[appName];

    // Verificar si hay una función inicializadora
    if (app.initializer && typeof window[app.initializer] === "function") {
      try {
        // Llamar a la función inicializadora
        const result = window[app.initializer](viewName);

        // Establecer como aplicación actual
        this.currentApp = appName;

        console.log(`Aplicación ${appName} inicializada correctamente`);

        return result;
      } catch (error) {
        console.error(`Error al inicializar ${appName}:`, error);
        this.handleLoadError(appName, error);
      }
    } else {
      console.warn(
        `No se encontró la función inicializadora para ${appName}: ${app.initializer}`
      );

      // Establecer como aplicación actual de todas formas
      this.currentApp = appName;
    }
  }

  /**
   * Maneja errores de carga
   */
  handleLoadError(appName, error) {
    // Mostrar mensaje de error
    const appContainer = document.getElementById("app-container");

    if (appContainer) {
      appContainer.innerHTML = `
        <div class="app-error">
          <h2>Error al cargar la aplicación ${
            this.apps[appName]?.name || appName
          }</h2>
          <p>${error.message}</p>
          <button id="retry-btn" class="btn btn-primary">Reintentar</button>
        </div>
      `;

      // Configurar botón de reintento
      document.getElementById("retry-btn").addEventListener("click", () => {
        // Volver a cargar la aplicación
        router.navigateTo(appName);
      });
    }
  }
}

// Inicializar el cargador de aplicaciones
const appLoader = new AppLoader();

// Al cargar el documento
document.addEventListener("DOMContentLoaded", () => {
  appLoader.init();
});

// Exportar la instancia
export { appLoader };
