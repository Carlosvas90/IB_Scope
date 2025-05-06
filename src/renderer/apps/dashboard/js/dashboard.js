/**
 * dashboard.js
 * Script principal para la funcionalidad del dashboard
 */

// Función global de inicialización que será llamada por el app-loader
window.initDashboard = function (view) {
  console.log("Inicializando Dashboard");

  setupAppCards();
  updateLastUpdate();

  return true;
};

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
