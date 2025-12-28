/**
 * app-loader.js
 * Carga dinámicamente las aplicaciones y gestiona su ciclo de vida
 * Versión optimizada para rendimiento
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
      "Inventory-Healt": {
        name: "Inventory Health",
        description: "Seguimiento y gestión de incidencias y estadísticas",
        icon: "alert-triangle",
        initializer: "initFeedbackTracker",
        styles: [
          "../apps/feedback-tracker/css/feedback-tracker.css",
          "../apps/feedback-tracker/css/table.css",
          "../apps/feedback-tracker/estadisticas/css/estadisticas.css",
          "../apps/feedback-tracker/estadisticas/css/modular-charts.css",
          "../apps/feedback-tracker/estadisticas/css/sync-notifications.css",
        ],
      },
      "inventory-stats": {
        name: "Stats",
        description: "KPIs principales de errores",
        icon: "trending-up",
        initializer: "initStats",
        styles: ["../apps/feedback-tracker/stats/css/stats.css"],
      },
      "space-heatmap": {
        name: "SpaceHeatMap",
        description: "Mapa de almacenamiento de Amazon",
        icon: "map",
        initializer: undefined, // No requiere inicializador
        styles: ["../apps/space-heatmap/css/space-heatmap.css"], // CSS se carga desde app-loader
      },
      "pizarra": {
        name: "Pizarra",
        description: "Roster de empleados del portal FCLM",
        icon: "users",
        initializer: undefined, // No requiere inicializador
        styles: ["../apps/utilidades/Pizarra/css/pizarra.css"], // CSS se carga desde app-loader
      },
      "skillmatrix": {
        name: "Skill Matrix",
        description: "Gestión de formaciones y habilidades de usuarios",
        icon: "file-text",
        initializer: undefined, // No requiere inicializador
        styles: ["../apps/utilidades/SkillMatrix/css/skillmatrix.css"], // CSS se carga desde app-loader
      },
      "imanes": {
        name: "Imanes",
        description: "Gestión de imanes",
        icon: "magnet",
        initializer: undefined, // No requiere inicializador
        styles: [], // CSS se carga desde app-loader
      },
      // Aquí se pueden registrar más aplicaciones en el futuro
    };

    console.log("[AppLoader] Configuración simplificada inicializada");

    // Aplicación actual
    this.currentApp = null;

    // Mantener registro de estilos cargados
    this.loadedStyles = {};

    // Estado de precarga
    this.preloadedStyles = {};
  }

  /**
   * Inicializa el cargador de aplicaciones
   */
  async init() {
    console.time("AppLoader:Init");

    // Escuchar eventos del router
    router.on("app:loaded", this.handleAppLoaded.bind(this));

    // Inicializar el router
    await router.init();

    // Detectar app actual desde URL
    this.detectCurrentApp();

    // Precarga de estilos para apps
    this.preloadAppStyles();

    console.timeEnd("AppLoader:Init");
    return true;
  }

  /**
   * Detecta la app actual basándose en la URL
   */
  detectCurrentApp() {
    const currentPath = window.location.pathname;
    const appMatch = currentPath.match(/apps\/([^\/]+)/);
    if (appMatch && appMatch[1]) {
      this.currentApp = appMatch[1];
      console.log(`App actual detectada: ${this.currentApp}`);
    }
  }

  /**
   * Precarga estilos de aplicaciones para mejorar rendimiento
   */
  preloadAppStyles() {
    // Primero precargar la app actual para priorizar su carga
    if (this.currentApp) {
      this.preloadCurrentAppStyles();
    }

    // En segundo plano, precargar otras apps
    if (window.cssOptimizer) {
      setTimeout(() => {
        const allAppStyles = window.cssOptimizer.preloadAllApps();
        this.preloadedStyles = { ...this.preloadedStyles, ...allAppStyles };
        console.log("Estilos de todas las apps precargados en segundo plano");
      }, 1000); // Retrasar 1 segundo para priorizar la carga inicial
    }
  }

  /**
   * Precarga estilos para la aplicación actual
   */
  preloadCurrentAppStyles() {
    if (!this.currentApp || !window.cssOptimizer) return;

    console.time(`CSS:Preload:${this.currentApp}`);

    // Precargar estilos combinados
    if (typeof window.cssOptimizer.preloadStyles === "function") {
      const styles = window.cssOptimizer.preloadStyles(this.currentApp);
      if (styles) {
        // Insertar estilos inmediatamente
        const styleEl = document.createElement("style");
        styleEl.id = `preloaded-styles-${this.currentApp}`;
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);

        // Marcar como precargados
        this.preloadedStyles[this.currentApp] = true;
        this.loadedStyles[this.currentApp] = true;

        console.log(`Estilos para ${this.currentApp} precargados e inyectados`);
      }
    }

    console.timeEnd(`CSS:Preload:${this.currentApp}`);
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

    // Deshabilitar estilos de otras aplicaciones antes de cargar la nueva
    this.disableOtherAppStyles(app);

    // Establecer como app actual
    this.currentApp = app;

    // Cargar estilos de la aplicación (solo si no han sido precargados)
    if (!this.preloadedStyles[app]) {
      this.loadAppStyles(app);
    } else {
      console.log(`Estilos de ${app} ya estaban precargados, omitiendo carga`);
      // Asegurar que los estilos estén habilitados
      this.enableAppStyles(app);
    }

    // Para vistas especiales (como Estadisticas), el router ya cargó el script necesario
    // No necesitamos llamar al initializer de la app principal
    const isSpecialView = view === "Estadisticas";
    
    if (isSpecialView) {
      console.log(`Vista especial detectada: ${view}. El script fue cargado por el router.`);
      this.currentApp = app;
      return;
    }

    // Inicializar la aplicación normalmente para otras vistas
    this.initializeApp(app, view);
  }

  /**
   * Deshabilita los estilos de otras aplicaciones (excepto la actual)
   */
  disableOtherAppStyles(currentAppName) {
    // Buscar TODOS los links de estilos, no solo los que tienen data-app
    const allStyleLinks = document.querySelectorAll('link[rel="stylesheet"]');
    
    allStyleLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const appName = link.getAttribute("data-app");
      
      // Si tiene atributo data-app, usar ese
      if (appName) {
        if (appName !== currentAppName) {
          link.media = "print"; // Deshabilitar usando media="print"
          console.log(`[AppLoader] Deshabilitando estilos de ${appName} (data-app)`);
        }
      } else {
        // Si no tiene data-app, intentar detectar la app por la ruta del CSS
        let detectedApp = null;
        
        if (href.includes("space-heatmap")) {
          detectedApp = "space-heatmap";
        } else if (href.includes("activity-scope") || href.includes("user-activity")) {
          detectedApp = "activity-scope";
        } else if (href.includes("feedback-tracker")) {
          detectedApp = "Inventory-Healt";
        } else if (href.includes("dashboard")) {
          detectedApp = "dashboard";
        } else if (href.includes("pizarra")) {
          detectedApp = "pizarra";
        }
        
        // Si detectamos una app diferente a la actual, deshabilitar
        if (detectedApp && detectedApp !== currentAppName) {
          link.media = "print";
          console.log(`[AppLoader] Deshabilitando estilos de ${detectedApp} (detectado por ruta: ${href})`);
        } else if (detectedApp === currentAppName) {
          // Si es la app actual pero no tiene data-app, agregarlo y habilitar
          link.setAttribute("data-app", detectedApp);
          link.media = "all";
          console.log(`[AppLoader] Agregando data-app="${detectedApp}" y habilitando: ${href}`);
        }
      }
    });
  }

  /**
   * Habilita los estilos de una aplicación específica
   */
  enableAppStyles(appName) {
    const styleLinks = document.querySelectorAll(`link[data-app="${appName}"][rel="stylesheet"]`);
    
    styleLinks.forEach((link) => {
      link.media = "all"; // Habilitar usando media="all"
      console.log(`Habilitando estilos de ${appName}`);
    });
  }

  /**
   * Carga los estilos de una aplicación
   */
  loadAppStyles(appName) {
    console.time(`CSS:Load:${appName}`);

    const app = this.apps[appName];
    if (!app || !app.styles || !app.styles.length) {
      console.timeEnd(`CSS:Load:${appName}`);
      return;
    }

    // Si los estilos ya están cargados, solo habilitarlos
    if (this.loadedStyles[appName]) {
      console.log(`Estilos para ${appName} ya cargados, habilitándolos`);
      this.enableAppStyles(appName);
      console.timeEnd(`CSS:Load:${appName}`);
      return;
    }

    console.log(`Cargando estilos para ${appName}:`, app.styles);

    // Cargar cada estilo
    app.styles.forEach((styleUrl) => {
      // Verificar si el estilo ya está en el documento
      const existingLink = document.querySelector(`link[href="${styleUrl}"]`);
      if (existingLink) {
        console.log(`Estilo ya cargado: ${styleUrl}`);
        // Asegurar que esté habilitado
        existingLink.media = "all";
        return;
      }

      // Crear elemento link
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = styleUrl;
      link.setAttribute("data-app", appName);

      // Usar técnica de carga diferida para no bloquear
      link.media = "print";
      link.onload = function () {
        this.media = "all";
        console.log(`Estilo cargado: ${styleUrl}`);
      };

      // Añadir al head
      document.head.appendChild(link);
    });

    // Marcar estilos como cargados
    this.loadedStyles[appName] = true;
    console.timeEnd(`CSS:Load:${appName}`);
  }

  /**
   * Inicializa una aplicación
   */
  initializeApp(appName, viewName) {
    console.time(`App:Init:${appName}`);

    const app = this.apps[appName];

    // Verificar si hay una función inicializadora
    if (app.initializer && typeof window[app.initializer] === "function") {
      try {
        // Llamar a la función inicializadora
        const result = window[app.initializer](viewName);

        // Establecer como aplicación actual
        this.currentApp = appName;

        console.log(`Aplicación ${appName} inicializada correctamente`);
        console.timeEnd(`App:Init:${appName}`);
        return result;
      } catch (error) {
        console.error(`Error al inicializar ${appName}:`, error);
        this.handleLoadError(appName, error);
        console.timeEnd(`App:Init:${appName}`);
      }
    } else {
      // Si no hay inicializador, no es un error, solo establecer como app actual
      if (app.initializer) {
        console.warn(
          `No se encontró la función inicializadora para ${appName}: ${app.initializer}`
        );
      } else {
        console.log(`App ${appName} no requiere inicializador`);
      }

      // Establecer como aplicación actual de todas formas
      this.currentApp = appName;
      console.timeEnd(`App:Init:${appName}`);
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
document.addEventListener("DOMContentLoaded", async () => {
  await appLoader.init();
});

// Exportar la instancia
export { appLoader };
