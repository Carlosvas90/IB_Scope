/**
 * router.js
 * Sistema de enrutamiento para manejar la navegación entre aplicaciones
 */

import { permisosService } from "../core/services/PermisosService.js";

class Router {
  constructor() {
    // Detección más simple y confiable
    this.isPackaged =
      window.process &&
      window.process.type === "renderer" &&
      window.location.protocol === "file:";

    console.log("[Router] Detectando entorno...");
    console.log("[Router] Protocol:", window.location.protocol);
    console.log("[Router] Href:", window.location.href);
    console.log("[Router] Process type:", window.process?.type);

    this.routes = {
      dashboard: {
        path: "../apps/dashboard/views/Home.html",
        default: true,
        scripts: ["../apps/dashboard/js/dashboard.js"],
      },
      "shift-tasks": {
        path: "../apps/shift-tasks/views/shift-tasks.html",
        scripts: ["../apps/shift-tasks/js/shift-tasks.js"],
      },
      "Inventory-Healt": {
        path: "../apps/feedback-tracker/views/index.html",
        views: {
          Incidencias: "#errors-view",
          Estadisticas: {
            path: "../apps/feedback-tracker/estadisticas/views/Estadisticas.html",
            scripts: ["../apps/feedback-tracker/estadisticas/js/init-estadisticas.js"]
          },
          settings: "#settings-view",
        },
        defaultView: "Incidencias",
        scripts: ["../apps/feedback-tracker/js/feedback-tracker.js"],
        hasSubmenu: true,
      },
      "inventory-stats": {
        path: "../apps/feedback-tracker/stats/views/stats.html",
        scripts: ["../apps/feedback-tracker/stats/js/stats.js"],
      },
      "activity-scope": {
        path: "../apps/activity-scope/views/user-activity.html",
        scripts: ["../apps/activity-scope/js/user-activity.js"],
        hasSubmenu: true,
        defaultView: "user-activity",
        views: {
          "user-activity": {
            path: "../apps/activity-scope/views/user-activity.html",
            scripts: ["../apps/activity-scope/js/user-activity.js"]
          },
          "user-history": {
            path: "../apps/activity-scope/views/user-history.html",
            scripts: ["../apps/activity-scope/js/user-history.js"]
          },
        },
      },
      "idle-time": {
        path: "../apps/idle-time/views/idle-time.html",
        scripts: [],
      },
      "space-heatmap": {
        path: "../apps/space-heatmap/views/space-heatmap.html",
        scripts: [
          "../apps/space-heatmap/js/StowMapDataService.js",
          "../apps/space-heatmap/js/space-heatmap.js"
        ],
        styles: ["../apps/space-heatmap/css/space-heatmap.css"],
        hasSubmenu: true,
        views: {
          Dashboard: true,
          "stow-guide": {
            path: "../apps/space-heatmap/views/stow-guide.html",
            scripts: ["../apps/space-heatmap/js/stow-guide.js"]
          }
        }
      },
      "pizarra": {
        path: "../apps/utilidades/Pizarra/views/pizarra.html",
        scripts: ["../apps/utilidades/Pizarra/js/pizarra.js"],
      },
      "skillmatrix": {
        path: "../apps/utilidades/SkillMatrix/views/skillmatrix.html",
        scripts: ["../apps/utilidades/SkillMatrix/js/skillmatrix.js"],
      },
      "imanes": {
        path: "../apps/utilidades/Imanes/views/imanes.html",
        scripts: ["../apps/utilidades/Imanes/js/imanes.js"],
      },
      "rotation-tool": {
        path: "../apps/utilidades/Rotation Tool/views/rotation-tool.html",
        scripts: ["../apps/utilidades/Rotation Tool/js/rotation-tool.js"],
        styles: ["../apps/utilidades/Rotation Tool/css/rotation-tool.css"],
      },
      "process-mapper": {
        path: "../apps/utilidades/Process Mapper/views/process-mapper.html",
        scripts: ["../apps/utilidades/Process Mapper/js/process-mapper.js"],
        styles: ["../apps/utilidades/Process Mapper/css/process-mapper.css"],
      },
      "dock-control": {
        path: "../apps/dock-control/views/dock-control.html",
        scripts: ["../apps/dock-control/js/dock-control.js"],
      },
      "admin-panel": {
        name: "Gestión de Permisos",
        path: "../apps/admin-panel/views/admin-panel.html",
        scripts: ["../apps/admin-panel/js/admin-panel.js"],
        styles: ["../apps/admin-panel/css/admin-panel.css"],
        defaultView: "usuarios",
        views: {
          usuarios: "#usuarios-view",
          solicitudes: "#solicitudes-view",
          admins: "#admins-view",
        },
        hasSubmenu: true,
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

    console.log("[Router] App empaquetada:", this.isPackaged);
  }

  /**
   * Inicializa el router
   */
  async init() {
    this.appContainer = document.getElementById("app-container");

    if (!this.appContainer) {
      console.error("No se encontró el contenedor de la aplicación");
      return false;
    }

    // DESACTIVADO: Los submenus se manejan en Sidebar.html
    // this.closeAllSubmenus();

    // DESACTIVADO: La navegación se maneja en Sidebar.html
    // this.setupNavigation();

    // Cargar la aplicación predeterminada
    await this.loadDefaultApp();

    // Manejar los cambios en la historia del navegador
    window.addEventListener("popstate", async (event) => {
      if (event.state) {
        await this.navigateTo(event.state.app, event.state.view, false);
      }
    });

    // Configurar evento de navegación global
    window.addEventListener("navigate", async (event) => {
      console.log("Evento de navegación recibido:", event.detail);
      if (event.detail && event.detail.app) {
        await this.navigateTo(event.detail.app, event.detail.view);
      }
    });

    console.log(
      "Router inicializado - navegación del sidebar manejada por Sidebar.html"
    );
    return true;
  }

  /**
   * Cierra todos los submenús
   * DESACTIVADO: Ahora se maneja en Sidebar.html
   */
  closeAllSubmenus() {
    // DESACTIVADO: La lógica de submenus ahora se maneja en Sidebar.html
    console.log("closeAllSubmenus() desactivado - manejado por Sidebar.html");
    /*
    const submenus = document.querySelectorAll(".has-submenu");
    submenus.forEach((submenu) => {
      submenu.classList.remove("open");
    });
    */
  }

  /**
   * Configura los eventos de navegación
   * DESACTIVADO: Esta lógica ahora se maneja en Sidebar.html
   */
  setupNavigation() {
    // COMENTADO: La navegación del sidebar ahora se maneja directamente en Sidebar.html
    // para evitar conflictos con la lógica de submenus

    /*
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
            await this.navigateTo(app);
          }
        } else if (app) {
          // Si es un enlace regular o un submenú con view, navegar directamente
          await this.navigateTo(app, view);
        }
      });
    });
    */

    console.log("Navegación del sidebar manejada por Sidebar.html");
  }

  /**
   * Navega a una aplicación/vista específica
   */
  async navigateTo(appName, viewName = null, updateHistory = true) {
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
    // PERO aún así emitir eventos para que la app pueda reinicializarse si es necesario
    if (this.currentApp === appName && this.loadedApps[appName]) {
      if (viewName) {
        // Verificar si es una vista especial que necesita cargar su propio HTML
        const viewConfig = app.views && app.views[viewName];
        const isSpecialView = typeof viewConfig === 'object' && viewConfig.path;
        
        if (isSpecialView) {
          // Para vistas con HTML propio, cargar directamente ese HTML
          this.loadApp(appName, viewConfig.path, viewName, updateHistory);
          return true;
        } else {
          // Para vistas normales (como Incidencias), necesitamos verificar
          // si estamos viniendo de una vista especial
          // Si es así, necesitamos recargar el HTML base
          const currentViewConfig = app.views && app.views[this.currentView];
          const wasSpecialView = typeof currentViewConfig === 'object' && currentViewConfig.path;
          
          if (wasSpecialView) {
            // Recargar la app completa para volver al HTML base
            console.log("🔄 Volviendo de vista especial a vista normal, recargando HTML base...");
            this.loadApp(appName, app.path, viewName, updateHistory);
            return true;
          }
          
          // Si ya estamos en el HTML base, solo cambiar vista internamente
          this.updateActiveLink(appName, viewName);
          
          // Emitir evento para que la app cambie internamente
          this.emitEvent("view:changed", { app: appName, view: viewName });
        }
      }
      // Emitir eventos para permitir reinicialización
      this.emitEvent("app:loaded", { app: appName, view: viewName });
      setTimeout(() => {
        this.emitEvent("app:ready", { app: appName, view: viewName });
      }, 200);
      return true;
    }

    // Si la vista tiene HTML propio, cargar ese HTML primero (evita que el dashboard init corra y luego se reemplace el DOM)
    const view = viewName || app.defaultView;
    const viewConfig = view && app.views && app.views[view];
    const initialPath = (typeof viewConfig === "object" && viewConfig.path) ? viewConfig.path : app.path;
    this.loadApp(appName, initialPath, view, updateHistory);
    return true;
  }

  /**
   * Actualiza el estado de los submenús según la aplicación seleccionada
   * MODIFICADO: Simplificado para no interferir con la lógica del Sidebar.html
   */
  updateSubmenusForApp(appName) {
    // DESACTIVADO: No cerrar todos los submenus, eso lo maneja Sidebar.html
    // this.closeAllSubmenus();

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
          // Asegurarnos de que se abra (sin cerrar otros)
          parentLi.classList.add("open");
          console.log(`Submenú abierto para: ${appName}`);
        }
      }
    }

    console.log(`updateSubmenusForApp() simplificado para: ${appName}`);
  }

  /**
   * Verifica si el usuario tiene acceso al Dashboard (requisito básico para usar la aplicación)
   */
  hasAccessToDashboard() {
    if (!window.permisosService) {
      return false;
    }

    return window.permisosService.tienePermiso("dashboard");
  }

  /**
   * Muestra la pantalla de "Sin permisos"
   */
  showNoPermissionsScreen() {
    this.appContainer.innerHTML = `
      <div class="no-permissions">
        <div class="no-permissions-container">
          <div class="no-permissions-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M17 11V7a5 5 0 0 0-10 0v4" stroke="currentColor" stroke-width="2"/>
            </svg>
          </div>
                     <h2>Sin acceso autorizado</h2>
           <p>No tienes permisos para acceder al Dashboard principal de la aplicación.</p>
           <p class="no-permissions-subtext">
             El acceso al Dashboard es requerido para usar cualquier funcionalidad. Para solicitar acceso, contacta al administrador del sistema.
           </p>
          <div class="no-permissions-actions">
            <button id="request-permissions-btn" class="btn btn-primary">
              Solicitar permisos
            </button>
            <button id="refresh-permissions-btn" class="btn btn-secondary">
              Verificar nuevamente
            </button>
          </div>
        </div>
      </div>
    `;

    // Configurar botones
    document
      .getElementById("request-permissions-btn")
      .addEventListener("click", () => {
        this.requestPermissions();
      });

    document
      .getElementById("refresh-permissions-btn")
      .addEventListener("click", () => {
        this.refreshPermissions();
      });
  }

  /**
   * Maneja la solicitud de permisos
   */
  async requestPermissions() {
    try {
      // Obtener información del usuario
      const username =
        window.appServices?.username ||
        window.permisosService?.username ||
        "Usuario desconocido";

      // Obtener ruta de solicitudes usando la nueva función
      const permisosDir = await window.api.getPermisosDir();
      const solicitudesPath = permisosDir + "solicitudes_permisos.json";

      // Crear la solicitud
      const solicitud = {
        usuario: username,
        fecha: new Date().toISOString(),
        aplicacion: "dashboard",
        motivo: "Solicitud de acceso inicial al Dashboard",
        estado: "pendiente",
        ip: "N/A", // Podría obtenerse si es necesario
        computador: await window.api.getUsername(), // Nombre del usuario del sistema
      };

      // Leer solicitudes existentes
      let solicitudes = [];
      try {
        const result = await window.api.readJson(solicitudesPath);
        if (result && result.success && Array.isArray(result.data)) {
          solicitudes = result.data;
        }
      } catch (e) {
        // Archivo no existe, empezamos con array vacío
        console.log("Archivo de solicitudes no existe, creando uno nuevo");
      }

      // Verificar si ya existe una solicitud pendiente del mismo usuario
      const solicitudExistente = solicitudes.find(
        (s) =>
          s.usuario.toLowerCase() === username.toLowerCase() &&
          s.estado === "pendiente" &&
          s.aplicacion === "dashboard"
      );

      if (solicitudExistente) {
        if (window.showToast) {
          window.showToast(
            "Ya tienes una solicitud pendiente. El administrador la revisará pronto.",
            "info"
          );
        }
        return;
      }

      // Agregar nueva solicitud
      solicitudes.push(solicitud);

      // Guardar solicitudes actualizadas
      const saveResult = await window.api.saveJson(
        solicitudesPath,
        solicitudes
      );

      if (saveResult && saveResult.success) {
        if (window.showToast) {
          window.showToast(
            "Solicitud registrada correctamente. El administrador será notificado.",
            "success"
          );
        }
        console.log(`Solicitud de permisos guardada para: ${username}`);
      } else {
        throw new Error("Error al guardar la solicitud");
      }
    } catch (error) {
      console.error("Error al procesar solicitud de permisos:", error);
      if (window.showToast) {
        window.showToast(
          "Error al registrar la solicitud. Contacta al administrador directamente.",
          "error"
        );
      }
    }
  }

  /**
   * Refresca los permisos y vuelve a intentar cargar
   */
  async refreshPermissions() {
    try {
      if (window.permisosService) {
        await window.permisosService.init();

        // Intentar cargar app por defecto nuevamente
        if (this.hasAccessToDashboard()) {
          this.loadDefaultApp();
        } else {
          if (window.showToast) {
            window.showToast(
              "Aún no tienes permisos para acceder al Dashboard.",
              "info"
            );
          }
        }
      }
    } catch (error) {
      console.error("Error al refrescar permisos:", error);
      if (window.showToast) {
        window.showToast("Error al verificar permisos.", "error");
      }
    }
  }

  /**
   * Carga la aplicación predeterminada
   */
  async loadDefaultApp() {
    // Verificar si el usuario tiene acceso al Dashboard (requisito básico)
    if (!this.hasAccessToDashboard()) {
      console.log(
        "Usuario sin permisos para el Dashboard - sin acceso a la aplicación"
      );
      this.showNoPermissionsScreen();
      return;
    }

    // Si tiene acceso al Dashboard, cargar el Dashboard por defecto
    await this.navigateTo("dashboard");
  }

  /**
   * Carga una aplicación
   */
  async loadApp(appName, appPath, viewName, updateHistory) {
    try {
      // Ocultar contenedor actual con fade-out
      this.appContainer.classList.add('loading');
      this.appContainer.classList.remove('ready');
      
      // Esperar a que termine la animación de fade-out (sincronizado con CSS)
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Mostrar indicador de carga
      this.appContainer.innerHTML = `
        <div class="loading-app">
          <div class="loading-spinner"></div>
          <p>Cargando aplicación...</p>
        </div>
      `;

      // Cargar estilos PRIMERO (antes del HTML) para evitar FOUC
      await this.loadAppStyles(appName);

      let html;

      // Intentar fetch primero (funciona en desarrollo y a veces en producción)
      try {
        console.log("[Router] Intentando fetch para:", appPath);
        const response = await fetch(appPath);
        if (response.ok) {
          html = await response.text();
          console.log("[Router] ✅ Fetch exitoso");
        } else {
          throw new Error(`Fetch falló: ${response.status}`);
        }
      } catch (fetchError) {
        console.log(
          "[Router] ⚠️ Fetch falló, probando método IPC:",
          fetchError.message
        );

        // Si fetch falla, usar método IPC
        if (window.api && window.api.readHtmlFile) {
          const result = await window.api.readHtmlFile(appPath);
          if (result.success) {
            html = result.content;
            console.log("[Router] ✅ IPC method exitoso");
          } else {
            throw new Error(`IPC method falló: ${result.error}`);
          }
        } else {
          throw new Error("Ambos métodos de carga fallaron");
        }
      }

      // Crear un documento temporal para extraer el contenido
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const content = doc.querySelector("body").innerHTML;

      // Insertar el contenido en el contenedor (aún oculto)
      this.appContainer.innerHTML = content;

      const app = this.routes[appName];
      const isViewPath = viewName && app.views && app.views[viewName] && typeof app.views[viewName] === "object" && app.views[viewName].path === appPath;

      // Si la vista tiene HTML propio (ej. Estadísticas), no cargar el script principal de la app
      // para no reemplazar el contenido inyectado (feedback-tracker.js haría showLoadingScreen etc.)
      if (!isViewPath) {
        await this.loadAppScripts(appName);
      }

      // Si cargamos el HTML de una vista con path propio, cargar solo sus scripts
      if (isViewPath && app.views[viewName].scripts && app.views[viewName].scripts.length) {
        for (const scriptPath of app.views[viewName].scripts) {
          try {
            const scriptId = `view-script-${appName}-${viewName}-${scriptPath.replace(/[^a-z0-9]/gi, "-")}`;
            if (document.getElementById(scriptId)) continue;
            console.log("[Router] Cargando script de vista:", scriptPath);
            const script = document.createElement("script");
            script.id = scriptId;
            script.type = "module";
            script.src = scriptPath;
            await new Promise((resolve, reject) => {
              script.onload = () => resolve();
              script.onerror = () => {
                console.warn("[Router] Error al cargar script de vista:", scriptPath);
                resolve();
              };
              document.body.appendChild(script);
            });
          } catch (e) {
            console.warn("[Router] Error cargando script de vista:", scriptPath, e);
          }
        }
      }

      // Inicializar Estadísticas si es esta vista (script ya cargado o recién cargado)
      if (isViewPath && appName === "Inventory-Healt" && viewName === "Estadisticas") {
        const estadisticasContainer = document.querySelector(".estadisticas-container");
        await new Promise((r) => setTimeout(r, 80));
        if (typeof window.initEstadisticas === "function") {
          try {
            await window.initEstadisticas();
            await new Promise((r) => setTimeout(r, 150));
            if (typeof window.resizeEstadisticasCharts === "function") window.resizeEstadisticasCharts();
          } catch (err) {
            console.error("[Router] Error al inicializar estadísticas:", err);
          }
        }
        if (estadisticasContainer) estadisticasContainer.style.opacity = "1";
      }

      // Si es activity-scope, cargar el CSS de la vista actual (user-activity o user-history)
      if (appName === "activity-scope") {
        const activityCssFile =
          isViewPath && viewName ? `${viewName}.css` : "user-activity.css";
        const cssPath = `../apps/activity-scope/css/${activityCssFile}`;
        const existingLink = document.querySelector(`link[href="${cssPath}"]`);

        if (!existingLink) {
          try {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = cssPath;
            link.setAttribute("data-app", appName);

            await new Promise((resolve) => {
              link.onload = () => {
                console.log(`✅ CSS cargado para activity-scope: ${cssPath}`);
                resolve();
              };
              link.onerror = () => {
                console.warn(`⚠️ No se pudo cargar CSS: ${cssPath}`);
                resolve();
              };
              document.head.appendChild(link);
            });
          } catch (cssError) {
            console.warn(`⚠️ Error al cargar CSS: ${cssPath}`, cssError);
          }
        } else {
          existingLink.setAttribute("data-app", appName);
          existingLink.media = "all";
        }
      }

      // Actualizar estado
      this.currentApp = appName;
      this.loadedApps[appName] = true;

      // Si ya cargamos el HTML de la vista, no llamar changeView; solo fijar currentView y emitir view:loaded
      if (viewName) {
        if (isViewPath) {
          this.currentView = viewName;
          document.dispatchEvent(new CustomEvent("view:loaded", { detail: { app: appName, view: viewName } }));
        } else {
          await this.changeView(viewName);
        }
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

      // Esperar un frame para asegurar que todo se haya renderizado
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // Mostrar contenido con fade-in suave
      this.appContainer.classList.remove('loading');
      this.appContainer.classList.add('ready');

      // Emitir evento de aplicación lista después de un momento para permitir la inicialización
      setTimeout(() => {
        this.emitEvent("app:ready", { app: appName, view: viewName });
      }, 300);

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

      // Mostrar el error con fade-in
      this.appContainer.classList.remove('loading');
      this.appContainer.classList.add('ready');

      // Configurar botón de reintento
      document.getElementById("retry-btn").addEventListener("click", () => {
        this.loadApp(appName, appPath, viewName, updateHistory);
      });

      return false;
    }
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
          console.log(`[Router] Deshabilitando estilos de ${appName} (data-app)`);
        }
      } else {
        // Si no tiene data-app, intentar detectar la app por la ruta del CSS
        let detectedApp = null;
        
        if (href.includes("space-heatmap")) {
          detectedApp = "space-heatmap";
        } else if (href.includes("activity-scope") || href.includes("user-activity")) {
          detectedApp = "activity-scope";
        } else if (href.includes("feedback-tracker")) {
          detectedApp = "feedback-tracker";
        } else if (href.includes("dashboard")) {
          detectedApp = "dashboard";
        } else if (href.includes("pizarra")) {
          detectedApp = "pizarra";
        }
        
        // Si detectamos una app diferente a la actual, deshabilitar
        if (detectedApp && detectedApp !== currentAppName) {
          link.media = "print";
          console.log(`[Router] Deshabilitando estilos de ${detectedApp} (detectado por ruta: ${href})`);
        } else if (detectedApp === currentAppName) {
          // Si es la app actual pero no tiene data-app, agregarlo y habilitar
          link.setAttribute("data-app", detectedApp);
          link.media = "all";
          console.log(`[Router] Agregando data-app="${detectedApp}" y habilitando: ${href}`);
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
      console.log(`[Router] Habilitando estilos de ${appName}`);
    });
  }

  /**
   * Carga los estilos definidos para la aplicación
   */
  async loadAppStyles(appName) {
    // Deshabilitar estilos de otras aplicaciones antes de cargar la nueva
    this.disableOtherAppStyles(appName);

    // Verificar si la app tiene estilos definidos
    const app = this.routes[appName];
    if (!app.styles || !app.styles.length) {
      return;
    }

    // Cargar estilos secuencialmente
    for (const stylePath of app.styles) {
      try {
        console.log(`Cargando estilo: ${stylePath}`);

        // Verificar si el estilo ya está cargado
        const existingLink = document.querySelector(
          `link[href="${stylePath}"]`
        );
        if (existingLink) {
          console.log(`Estilo ya cargado: ${stylePath}`);
          // Asegurar que esté habilitado
          existingLink.media = "all";
          continue;
        }

        // Crear elemento link
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = stylePath;
        link.setAttribute("data-app", appName);
        link.media = "all"; // Habilitar inmediatamente

        // Esperar a que se cargue
        await new Promise((resolve, reject) => {
          link.onload = resolve;
          link.onerror = (event) => {
            console.error(`Error al cargar estilo: ${stylePath}`, event);
            reject(new Error(`Error al cargar estilo: ${stylePath}`));
          };
          document.head.appendChild(link);
        });

        console.log(`Estilo cargado correctamente: ${stylePath}`);
      } catch (error) {
        console.warn(`Error al cargar estilo ${stylePath}: ${error.message}`);
        // Continuamos con el siguiente estilo aunque falle uno
      }
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
  async changeView(viewName) {
    console.log(`🔄 Cambiando a vista: ${viewName}`);

    const app = this.routes[this.currentApp];
    if (!app) return false;
    // Apps sin vistas (ej. space-heatmap, pizarra): no hacer nada
    if (!app.views) return true;
    if (!app.views[viewName]) {
      console.error(`Vista no encontrada: ${viewName} en ${this.currentApp}`);
      return false;
    }

    console.log(`📋 Vistas disponibles:`, app.views);

    // Obtener la configuración de la vista
    const viewConfig = app.views[viewName];
    const isSpecialView = typeof viewConfig === 'object' && viewConfig.path;

    // Para vistas especiales con path propio (activity-scope, space-heatmap Stow Guide, etc.)
    if (this.currentApp === "activity-scope" || (this.currentApp === "Inventory-Healt" && isSpecialView) || (this.currentApp === "space-heatmap" && isSpecialView)) {
      const viewPath = isSpecialView ? viewConfig.path : viewConfig;
      console.log(`🎯 Cargando vista desde archivo:`, viewPath);

      try {
        // Ocultar contenedor actual con fade-out
        this.appContainer.classList.add('loading');
        this.appContainer.classList.remove('ready');
        
        // Esperar a que termine la animación de fade-out
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Mostrar indicador de carga
        this.appContainer.innerHTML = `
          <div class="loading-app">
            <div class="loading-spinner"></div>
            <p>Cargando vista...</p>
          </div>
        `;

        // Cargar CSS PRIMERO para activity-scope (antes del HTML)
        if (this.currentApp === "activity-scope") {
          const cssPath = `../apps/activity-scope/css/${viewName}.css`;
            const existingLink = document.querySelector(
              `link[href="${cssPath}"]`
            );

            if (!existingLink) {
              try {
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = cssPath;
                link.setAttribute("data-app", "activity-scope");

                await new Promise((resolve, reject) => {
                  link.onload = () => {
                    console.log(`✅ CSS cargado: ${cssPath}`);
                    resolve();
                  };
                  link.onerror = () => {
                    console.warn(`⚠️ No se pudo cargar CSS: ${cssPath}`);
                    resolve();
                  };
                  document.head.appendChild(link);
                });
              } catch (cssError) {
                console.warn(`⚠️ Error al cargar CSS: ${cssPath}`, cssError);
              }
            } else {
              existingLink.setAttribute("data-app", "activity-scope");
              existingLink.media = "all";
              console.log(`✅ CSS ya cargado: ${cssPath}`);
            }
          }

        // Cargar el archivo HTML de la vista (DESPUÉS del CSS)
        const response = await fetch(viewPath);
        if (response.ok) {
          const html = await response.text();
          this.appContainer.innerHTML = html;

          this.currentView = viewName;
          console.log(`✅ Vista cargada exitosamente: ${viewName}`);

          // Disparar evento personalizado para notificar que la vista se cargó
          const viewLoadedEvent = new CustomEvent("view:loaded", {
            detail: { app: this.currentApp, view: viewName },
          });
          document.dispatchEvent(viewLoadedEvent);
          console.log(`📢 Evento view:loaded disparado para: ${viewName}`);

          // Cargar scripts específicos si existen
          const scriptsToLoad = isSpecialView && viewConfig.scripts ? viewConfig.scripts : 
                               (this.currentApp === "activity-scope" ? [`../apps/activity-scope/js/${viewName}.js`] : []);
          
          for (const scriptPath of scriptsToLoad) {
            const scriptId = `${this.currentApp}-${viewName}-script-${scriptPath.replace(/[^a-z0-9]/gi, '-')}`;
            const existingScript = document.getElementById(scriptId);

            if (!existingScript) {
              try {
                const script = document.createElement("script");
                script.id = scriptId;
                script.type = "module";
                script.src = scriptPath;
                
                await new Promise((resolve, reject) => {
                  script.onload = () => {
                    console.log(`✅ Script cargado: ${scriptPath}`);
                    resolve();
                  };
                  script.onerror = () => {
                    console.warn(`⚠️ No se pudo cargar script: ${scriptPath}`);
                    resolve();
                  };
                  document.body.appendChild(script);
                });
                
                // Inicializar scripts específicos después de cargarlos
                if (this.currentApp === "Inventory-Healt" && viewName === "Estadisticas") {
                  // El contenedor ya está oculto desde el HTML con opacity: 0
                  const estadisticasContainer = document.querySelector('.estadisticas-container');
                  
                  // Esperar a que el DOM esté completamente renderizado
                  await new Promise(resolve => setTimeout(resolve, 100));
                  
                  if (typeof window.initEstadisticas === "function") {
                    console.log("🚀 Inicializando estadisticas...");
                    try {
                      await window.initEstadisticas();
                      console.log("✅ Estadisticas inicializado correctamente");
                      
                      // Forzar redimensionamiento de gráficos después de inicializar
                      await new Promise(resolve => setTimeout(resolve, 150));
                      
                      if (typeof window.resizeEstadisticasCharts === "function") {
                        window.resizeEstadisticasCharts();
                        console.log("✅ Gráficos redimensionados");
                      }
                      
                      // Mostrar el contenedor con transición suave
                      if (estadisticasContainer) {
                        estadisticasContainer.style.opacity = '1';
                      }
                    } catch (error) {
                      console.error("❌ Error al inicializar estadisticas:", error);
                      // Mostrar el contenedor incluso si hay error
                      if (estadisticasContainer) {
                        estadisticasContainer.style.opacity = '1';
                      }
                    }
                  } else {
                    console.warn("⚠️ window.initEstadisticas no está disponible");
                    // Mostrar el contenedor
                    if (estadisticasContainer) {
                      estadisticasContainer.style.opacity = '1';
                    }
                  }
                }
              } catch (scriptError) {
                console.warn(
                  `⚠️ Error al cargar script: ${scriptPath}`,
                  scriptError
                );
              }
            } else {
              console.log(`✅ Script ya cargado: ${scriptPath}`);
              
              // Si el script ya estaba cargado pero necesita reinicializarse
              if (this.currentApp === "Inventory-Healt" && viewName === "Estadisticas") {
                // El contenedor ya está oculto desde el HTML
                const estadisticasContainer = document.querySelector('.estadisticas-container');
                
                // Asegurar que esté oculto antes de reinicializar
                if (estadisticasContainer) {
                  estadisticasContainer.style.opacity = '0';
                }
                
                // Esperar a que el DOM se actualice
                await new Promise(resolve => setTimeout(resolve, 100));
                
                if (typeof window.initEstadisticas === "function") {
                  console.log("🔄 Reinicializando estadisticas...");
                  try {
                    await window.initEstadisticas();
                    console.log("✅ Estadisticas reinicializado correctamente");
                    
                    // Forzar redimensionamiento después de reinicializar
                    await new Promise(resolve => setTimeout(resolve, 150));
                    
                    if (typeof window.resizeEstadisticasCharts === "function") {
                      window.resizeEstadisticasCharts();
                      console.log("✅ Gráficos redimensionados");
                    }
                    
                    // Mostrar el contenedor con transición suave
                    if (estadisticasContainer) {
                      estadisticasContainer.style.opacity = '1';
                    }
                  } catch (error) {
                    console.error("❌ Error al reinicializar estadisticas:", error);
                    // Mostrar el contenedor incluso si hay error
                    if (estadisticasContainer) {
                      estadisticasContainer.style.opacity = '1';
                    }
                  }
                }
              }
            }
          }

          // Actualizar enlace activo
          this.updateActiveLink(this.currentApp, viewName);

          // Asegurar que los submenús estén en el estado correcto
          this.updateSubmenusForApp(this.currentApp);

          // Esperar un frame para asegurar que todo se haya renderizado
          await new Promise(resolve => requestAnimationFrame(resolve));
          
          // Mostrar contenido con fade-in suave
          this.appContainer.classList.remove('loading');
          this.appContainer.classList.add('ready');

          // Emitir evento de cambio de vista
          this.emitEvent("view:changed", {
            app: this.currentApp,
            view: viewName,
          });

          return true;
        } else {
          throw new Error(`Error al cargar vista: ${response.status}`);
        }
      } catch (error) {
        console.error(`❌ Error al cargar vista ${viewName}:`, error);
        this.appContainer.innerHTML = `
          <div class="error-app">
            <h2>Error al cargar la vista</h2>
            <p>No se pudo cargar la vista: ${viewName}</p>
            <button id="retry-btn" class="btn-primary">Reintentar</button>
          </div>
        `;
        // Mostrar el error con fade-in
        this.appContainer.classList.remove('loading');
        this.appContainer.classList.add('ready');
        return false;
      }
    }

    // Para otras aplicaciones, usar el método original
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
    // Emitir eventos internos del router
    if (this.events[eventName]) {
      this.events[eventName].forEach((callback) => {
        callback(data);
      });
    }
    
    // También emitir eventos del DOM para que los listeners de window funcionen
    const domEvent = new CustomEvent(eventName, {
      detail: data,
      bubbles: true
    });
    window.dispatchEvent(domEvent);
  }
}

// Exportar una instancia única del router
export const router = new Router();
