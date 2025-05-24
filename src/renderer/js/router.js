/**
 * router.js
 * Sistema de enrutamiento para manejar la navegación entre aplicaciones
 */

import { permisosService } from "../core/services/PermisosService.js";

class Router {
  constructor() {
    this.routes = {
      dashboard: {
        path: "../apps/dashboard/views/Home.html",
        default: true,
        scripts: ["../apps/dashboard/js/dashboard.js"],
      },
      "feedback-tracker": {
        path: "../apps/feedback-tracker/views/index.html",
        views: {
          errors: "#errors-view",
          settings: "#settings-view",
        },
        defaultView: "errors",
        scripts: ["../apps/feedback-tracker/js/feedback-tracker.js"],
        hasSubmenu: true,
      },
      estadisticas: {
        path: "../apps/feedback-tracker/estadisticas/views/estadisticas.html",
        scripts: ["../apps/feedback-tracker/estadisticas/js/estadisticas.js"],
      },
      "activity-scope": {
        path: "../apps/activity-scope/views/activity-scope.html",
        scripts: [],
      },
      "idle-time": {
        path: "../apps/idle-time/views/idle-time.html",
        scripts: [],
      },
      "space-heatmap": {
        path: "../apps/space-heatmap/views/space-heatmap.html",
        scripts: [],
      },
      // Aquí se pueden añadir más aplicaciones en el futuro
    };

    this.currentApp = null;
    this.currentView = null;
    this.appContainer = null;
    this.activeLink = null;
    this.loadedApps = {};

    // Eventos que el router puede emitir
    this.events = {
      "app:loaded": [],
      "view:changed": [],
      "app:ready": [],
    };
  }

  /**
   * Inicializa el router
   */
  init() {
    this.appContainer = document.getElementById("app-container");

    if (!this.appContainer) {
      console.error("No se encontró el contenedor de la aplicación");
      return false;
    }

    // Cerrar todos los submenús al inicio
    this.closeAllSubmenus();

    // Configurar la navegación
    this.setupNavigation();

    // Cargar la aplicación predeterminada
    this.loadDefaultApp();

    // Manejar los cambios en la historia del navegador
    window.addEventListener("popstate", (event) => {
      if (event.state) {
        this.navigateTo(event.state.app, event.state.view, false);
      }
    });

    // Configurar evento de navegación global
    window.addEventListener("navigate", (event) => {
      console.log("Evento de navegación recibido:", event.detail);
      if (event.detail && event.detail.app) {
        this.navigateTo(event.detail.app, event.detail.view);
      }
    });

    return true;
  }

  /**
   * Cierra todos los submenús
   */
  closeAllSubmenus() {
    const submenus = document.querySelectorAll(".has-submenu");
    submenus.forEach((submenu) => {
      submenu.classList.remove("open");
    });
  }

  /**
   * Configura los eventos de navegación
   */
  setupNavigation() {
    // Enlaces de navegación principal
    const navLinks = document.querySelectorAll(".sidebar-nav a");

    navLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();

        const app = link.getAttribute("data-app");
        const view = link.getAttribute("data-view");

        // Si es un elemento con submenú y no tiene view
        const parentLi = link.closest(".has-submenu");
        if (parentLi && !view) {
          // Alternar estado del submenú al hacer clic
          const wasOpen = parentLi.classList.contains("open");

          // Primero cerrar todos los submenús
          this.closeAllSubmenus();

          // Si estaba cerrado, abrirlo
          if (!wasOpen) {
            parentLi.classList.add("open");
          }

          // Si se hace clic en una app diferente a la actual, navegar a ella
          if (app && app !== this.currentApp) {
            this.navigateTo(app);
          }
        } else if (app) {
          // Si es un enlace regular o un submenú con view, navegar directamente
          this.navigateTo(app, view);
        }
      });
    });
  }

  /**
   * Navega a una aplicación/vista específica
   */
  navigateTo(appName, viewName = null, updateHistory = true) {
    // Bloqueo de permisos (app o submenú)
    if (permisosService && !permisosService.tienePermiso(appName, viewName)) {
      if (window.showToast) {
        window.showToast("No tienes acceso a esta app o sección.", "error");
      } else {
        alert("No tienes acceso a esta app o sección.");
      }
      return false;
    }
    console.log(`Navegando a: ${appName}${viewName ? " - " + viewName : ""}`);

    // Verificar si la aplicación existe
    if (!this.routes[appName]) {
      console.error(`Aplicación no encontrada: ${appName}`);
      return false;
    }

    const app = this.routes[appName];

    // Primero manejar submenús según la aplicación
    this.updateSubmenusForApp(appName);

    // Si es la misma aplicación y ya está cargada, solo cambiar la vista
    if (this.currentApp === appName && this.loadedApps[appName]) {
      if (viewName) {
        this.changeView(viewName);
      }
      return true;
    }

    // Cargar la nueva aplicación
    this.loadApp(appName, app.path, viewName || app.defaultView, updateHistory);
    return true;
  }

  /**
   * Actualiza el estado de los submenús según la aplicación seleccionada
   */
  updateSubmenusForApp(appName) {
    // Primero cerrar todos los submenús
    this.closeAllSubmenus();

    // Verificar si la app tiene submenú
    const app = this.routes[appName];
    if (app && app.hasSubmenu) {
      // Buscar el elemento de submenú correspondiente
      const submenuItem = document.querySelector(
        `.has-submenu a[data-app="${appName}"]:not([data-view])`
      );
      if (submenuItem) {
        const parentLi = submenuItem.closest(".has-submenu");
        if (parentLi) {
          // Asegurarnos de que se abra
          parentLi.classList.add("open");
          console.log(`Submenú abierto para: ${appName}`);
        }
      }
    }
  }

  /**
   * Carga la aplicación predeterminada
   */
  loadDefaultApp() {
    // Buscar la aplicación predeterminada
    const defaultApp = Object.keys(this.routes).find(
      (key) => this.routes[key].default
    );

    if (defaultApp) {
      this.navigateTo(defaultApp);
    } else {
      // Si no hay aplicación predeterminada, cargar la primera
      const firstApp = Object.keys(this.routes)[0];
      if (firstApp) {
        this.navigateTo(firstApp);
      } else {
        console.error("No se encontraron aplicaciones configuradas");
      }
    }
  }

  /**
   * Carga una aplicación
   */
  async loadApp(appName, appPath, viewName, updateHistory) {
    try {
      // Mostrar indicador de carga
      this.appContainer.innerHTML = `
        <div class="loading-app">
          <div class="loading-spinner"></div>
          <p>Cargando aplicación...</p>
        </div>
      `;

      // Cargar el contenido de la aplicación
      const response = await fetch(appPath);

      if (!response.ok) {
        throw new Error(`Error al cargar la aplicación: ${response.status}`);
      }

      const html = await response.text();

      // Crear un documento temporal para extraer el contenido
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const content = doc.querySelector("body").innerHTML;

      // Insertar el contenido en el contenedor
      this.appContainer.innerHTML = content;

      // Cargar scripts definidos en la aplicación
      await this.loadAppScripts(appName);

      // Actualizar estado
      this.currentApp = appName;
      this.loadedApps[appName] = true;

      // Cambiar a la vista solicitada
      if (viewName) {
        this.changeView(viewName);
      }

      // Actualizar enlace activo
      this.updateActiveLink(appName, viewName);

      // Volver a aplicar el estado de los submenús ahora que la app está cargada
      // Esto es crucial para asegurar que los submenús estén abiertos después de cargar la app
      setTimeout(() => {
        this.updateSubmenusForApp(appName);
      }, 100);

      // Actualizar historial de navegación
      if (updateHistory) {
        window.history.pushState(
          { app: appName, view: viewName },
          `${appName} - ${viewName || ""}`,
          `#/${appName}${viewName ? "/" + viewName : ""}`
        );
      }

      // Emitir evento de aplicación cargada
      this.emitEvent("app:loaded", { app: appName, view: viewName });

      // Emitir evento de aplicación lista después de un momento para permitir la inicialización
      setTimeout(() => {
        this.emitEvent("app:ready", { app: appName, view: viewName });
      }, 200);

      return true;
    } catch (error) {
      console.error("Error al cargar la aplicación:", error);

      // Mostrar mensaje de error
      this.appContainer.innerHTML = `
        <div class="app-error">
          <h2>Error al cargar la aplicación</h2>
          <p>${error.message}</p>
          <button id="retry-btn" class="btn btn-primary">Reintentar</button>
        </div>
      `;

      // Configurar botón de reintento
      document.getElementById("retry-btn").addEventListener("click", () => {
        this.loadApp(appName, appPath, viewName, updateHistory);
      });

      return false;
    }
  }

  /**
   * Carga los scripts definidos para la aplicación
   */
  async loadAppScripts(appName) {
    // Verificar si la app tiene scripts definidos
    const app = this.routes[appName];
    if (!app.scripts || !app.scripts.length) {
      return;
    }

    // Cargar scripts secuencialmente
    for (const scriptPath of app.scripts) {
      try {
        console.log(`Cargando script: ${scriptPath}`);

        // Crear elemento script
        const script = document.createElement("script");
        script.type = "module";
        script.src = scriptPath;

        // Esperar a que se cargue
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = (event) => {
            console.error(`Error al cargar script: ${scriptPath}`, event);
            reject(new Error(`Error al cargar script: ${scriptPath}`));
          };
          document.body.appendChild(script);
        });

        console.log(`Script cargado correctamente: ${scriptPath}`);
      } catch (error) {
        console.warn(`Error al cargar script ${scriptPath}: ${error.message}`);
        // Continuamos con el siguiente script aunque falle uno
      }
    }
  }

  /**
   * Cambia a una vista específica dentro de la aplicación actual
   */
  changeView(viewName) {
    console.log(`🔄 Cambiando a vista: ${viewName}`);

    // Verificar si la aplicación actual tiene la vista solicitada
    const app = this.routes[this.currentApp];

    if (!app || !app.views || !app.views[viewName]) {
      console.error(`Vista no encontrada: ${viewName} en ${this.currentApp}`);
      return false;
    }

    console.log(`📋 Vistas disponibles:`, app.views);

    // Ocultar todas las vistas
    const views = document.querySelectorAll(".view");
    console.log(`👁️ Vistas encontradas en DOM:`, views.length);
    views.forEach((view) => {
      view.classList.remove("active");
      console.log(`🚫 Ocultando vista:`, view.id);
    });

    // Mostrar la vista solicitada
    const selector = app.views[viewName];
    console.log(`🎯 Buscando vista con selector:`, selector);
    const view = document.querySelector(selector);

    if (view) {
      view.classList.add("active");
      this.currentView = viewName;

      console.log(`✅ Vista activada exitosamente:`, view.id);

      // Actualizar enlace activo
      this.updateActiveLink(this.currentApp, viewName);

      // Asegurar que los submenús estén en el estado correcto
      this.updateSubmenusForApp(this.currentApp);

      // Emitir evento de cambio de vista
      this.emitEvent("view:changed", { app: this.currentApp, view: viewName });

      return true;
    } else {
      console.error(`❌ Elemento de vista no encontrado: ${selector}`);
      return false;
    }
  }

  /**
   * Actualiza el enlace activo en la navegación
   */
  updateActiveLink(appName, viewName) {
    // Quitar la clase active de todos los enlaces
    const navLinks = document.querySelectorAll(".sidebar-nav a");
    navLinks.forEach((link) => {
      link.classList.remove("active");
    });

    // Si es una vista específica, activar el enlace correspondiente
    if (viewName) {
      const viewLink = document.querySelector(
        `.sidebar-nav a[data-app="${appName}"][data-view="${viewName}"]`
      );

      if (viewLink) {
        viewLink.classList.add("active");
      }
    } else {
      // Si no hay vista específica, activar el enlace de la aplicación
      const appLink = document.querySelector(
        `.sidebar-nav a[data-app="${appName}"]:not([data-view])`
      );

      if (appLink) {
        appLink.classList.add("active");
      }
    }
  }

  /**
   * Registra un manejador de eventos
   */
  on(eventName, callback) {
    if (this.events[eventName]) {
      this.events[eventName].push(callback);
    }
  }

  /**
   * Emite un evento
   */
  emitEvent(eventName, data) {
    if (this.events[eventName]) {
      this.events[eventName].forEach((callback) => {
        callback(data);
      });
    }
  }
}

// Exportar una instancia única del router
export const router = new Router();
