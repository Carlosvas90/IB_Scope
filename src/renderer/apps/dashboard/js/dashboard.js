/**
 * dashboard.js
 * Script principal para la funcionalidad del dashboard
 */

// Función global de inicialización que será llamada por el app-loader
window.initDashboard = function (view) {
  console.log("Inicializando Dashboard");

  setupAppCards();
  updateLastUpdate();

  // Cargar manualmente el script home-lotties.js cuando se carga dinámicamente
  loadHomeLottiesScript();

  // Configurar listener para cambios de tema
  setupThemeListener();

  // Función para obtener y mostrar la versión de la aplicación
  async function loadAppVersion() {
    console.log("🔍 [Dashboard] Ejecutando loadAppVersion...");

    try {
      // Verificar si window.api está disponible
      if (!window.api) {
        console.warn("⚠️ [Dashboard] window.api no está disponible");
        const versionElement = document.getElementById("app-version");
        if (versionElement) {
          versionElement.textContent = "API no disponible";
        }
        return;
      }

      if (!window.api.getAppVersion) {
        console.warn(
          "⚠️ [Dashboard] window.api.getAppVersion no está disponible"
        );
        const versionElement = document.getElementById("app-version");
        if (versionElement) {
          versionElement.textContent = "getAppVersion no disponible";
        }
        return;
      }

      console.log("🔍 [Dashboard] Llamando a window.api.getAppVersion...");
      const result = await window.api.getAppVersion();
      console.log("🔍 [Dashboard] Resultado:", result);

      if (result && result.success && result.version) {
        console.log("✅ [Dashboard] Versión obtenida:", result.version);
        const versionElement = document.getElementById("app-version");
        if (versionElement) {
          versionElement.textContent = result.version;
        } else {
          console.warn("⚠️ [Dashboard] Elemento #app-version no encontrado");
        }
      } else {
        console.error("❌ [Dashboard] Error en resultado:", result);
        const versionElement = document.getElementById("app-version");
        if (versionElement) {
          versionElement.textContent = "Error obteniendo versión";
        }
      }
    } catch (error) {
      console.error("❌ [Dashboard] Exception:", error);
      const versionElement = document.getElementById("app-version");
      if (versionElement) {
        versionElement.textContent = "Error: " + error.message;
      }
    }
  }

  // Función para verificar si el elemento existe y ejecutar loadAppVersion
  function checkAndLoadVersion() {
    const versionElement = document.getElementById("app-version");
    if (versionElement) {
      console.log(
        "🎯 [Dashboard] Elemento #app-version encontrado, cargando versión..."
      );
      loadAppVersion();
    } else {
      console.log(
        "🔄 [Dashboard] Elemento #app-version no encontrado, reintentando..."
      );
      // Reintentar después de un breve delay
      setTimeout(checkAndLoadVersion, 100);
    }
  }

  // Inicializar verificación de versión
  console.log("🚀 [Dashboard] Iniciando verificación de versión...");
  checkAndLoadVersion();

  return true;
};

/**
 * Carga manualmente el script home-lotties.js
 * Esto es necesario porque el router no carga los scripts del head
 */
async function loadHomeLottiesScript() {
  try {
    console.log("Cargando script home-lotties.js manualmente...");

    // Verificar si ya está cargado
    if (typeof window.initHomeLotties === "function") {
      console.log("home-lotties.js ya está cargado, inicializando...");
      window.initHomeLotties();
      return;
    }

    // Cargar el script dinámicamente
    const script = document.createElement("script");
    script.type = "module";
    script.src = "../apps/dashboard/js/home-lotties.js";

    script.onload = () => {
      console.log("Script home-lotties.js cargado exitosamente");

      // Esperar un poco para que se ejecute y luego inicializar
      setTimeout(() => {
        if (typeof window.initHomeLotties === "function") {
          window.initHomeLotties();
          console.log("Lotties de Home inicializados desde dashboard.js");
        } else {
          console.error(
            "window.initHomeLotties no disponible después de cargar el script"
          );
        }
      }, 100);
    };

    script.onerror = (error) => {
      console.error("Error al cargar home-lotties.js:", error);
    };

    document.head.appendChild(script);
  } catch (error) {
    console.error("Error en loadHomeLottiesScript:", error);
  }
}

/**
 * Configura las tarjetas de aplicaciones
 */
function setupAppCards() {
  const appCards = document.querySelectorAll(
    ".app-card:not(.app-card-placeholder)"
  );

  appCards.forEach((card) => {
    card.addEventListener("click", () => {
      const app = card.getAttribute("data-app");

      if (app) {
        console.log("Click en app card:", app);
        // Usar la navegación proporcionada por window.router o window.activateApp si está disponible
        if (window.router) {
          window.router.navigateTo(app);
        } else if (typeof window.activateApp === "function") {
          window.activateApp(app);
        } else {
          // Última opción: usar evento personalizado
          window.dispatchEvent(
            new CustomEvent("navigate", {
              detail: { app },
            })
          );
        }
      }
    });
  });
}

/**
 * Actualiza la información de última actualización
 */
function updateLastUpdate() {
  const lastUpdateElement = document.getElementById("last-update");

  if (lastUpdateElement) {
    const now = new Date();
    lastUpdateElement.textContent = now.toLocaleString();
  }
}

// Función global para activar el dashboard (opcional)
window.activateDashboard = function () {
  console.log("Activando Dashboard");
  updateLastUpdate();
};

/**
 * Configura el listener para cambios de tema
 */
function setupThemeListener() {
  // Escuchar el evento personalizado de cambio de tema
  window.addEventListener("themeChanged", (event) => {
    console.log(
      "Tema cambiado en Dashboard, re-inicializando lotties de Home..."
    );

    // Re-inicializar los lotties del Home con el nuevo tema
    if (typeof window.initHomeLotties === "function") {
      window.initHomeLotties();
      console.log(
        "Lotties de Home re-inicializados después del cambio de tema"
      );
    } else {
      console.warn(
        "window.initHomeLotties no está disponible durante el cambio de tema"
      );
    }
  });
}
