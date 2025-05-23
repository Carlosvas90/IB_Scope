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
