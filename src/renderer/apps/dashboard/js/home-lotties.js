/**
 * home-lotties.js
 * Script para manejar los Lotties específicos de Home
 * Basado en la estructura de Sidebar.html
 */

import {
  updateActiveLottie,
  initializeLotties,
} from "../../../js/lottieManager.js";

// Mapa de navegación a IDs de Lottie para Home
const homeLottieMap = {
  "feedback-tracker": "feedback",
  "activity-scope": "activity",
  "idle-time": "idle",
  "space-heatmap": "heatmap",
};

// Función para actualizar el estado activo en Home
function updateHomeActiveState(activeApp) {
  // Actualizar la animación Lottie de Home
  const homeLottieId = homeLottieMap[activeApp];
  if (homeLottieId) {
    updateActiveLottie(`home-lottie-${homeLottieId}`, "home");
  }
}

// Función para configurar efectos hover
function setupHomeLottieEffects() {
  document.querySelectorAll(".app-card").forEach((card) => {
    const app = card.getAttribute("data-app");
    const lottieId = homeLottieMap[app];

    if (lottieId) {
      card.addEventListener("mouseenter", () => {
        const homeLottieId = `home-lottie-${lottieId}`;
        updateActiveLottie(homeLottieId, "home");
        console.log(`Hover en tarjeta del Home: ${app}`);
      });

      card.addEventListener("mouseleave", () => {
        // Al salir del hover, reactivar el elemento activo actual del sidebar
        const activeNavLink = document.querySelector(".sidebar-nav a.active");
        if (activeNavLink) {
          const activeApp = activeNavLink.getAttribute("data-app");
          const activeLottieId = homeLottieMap[activeApp];
          if (activeLottieId) {
            // Reactivar el lottie correspondiente en el sidebar
            updateActiveLottie(`lottie-${activeLottieId}`, "sidebar");
            console.log(`Restaurado lottie del sidebar activo: ${activeApp}`);
          }
        }
      });
    }
  });
}

// Función para configurar navegación
function setupHomeNavigation() {
  document.querySelectorAll(".app-card").forEach((card) => {
    card.addEventListener("click", () => {
      const app = card.getAttribute("data-app");
      if (app) {
        console.log(`Click en tarjeta del Home: ${app}`);

        // Activar el elemento correspondiente en el sidebar usando la función global
        if (typeof window.activateSidebarItem === "function") {
          window.activateSidebarItem(app);
        } else {
          console.warn("window.activateSidebarItem no está disponible");

          // Fallback: método anterior (menos confiable)
          const navLink = document.querySelector(
            `.sidebar-nav a[data-app="${app}"]`
          );
          if (navLink) {
            navLink.classList.add("active");
            const lottieId = homeLottieMap[app];
            if (lottieId) {
              updateActiveLottie(`lottie-${lottieId}`, "sidebar");
            }
          }
        }

        // Disparar el evento de navegación
        window.dispatchEvent(new CustomEvent("navigate", { detail: { app } }));
      }
    });
  });
}

// Inicializar cuando el DOM esté listo (igual que en Sidebar.html)
document.addEventListener("DOMContentLoaded", () => {
  console.log("Inicializando Lotties de Home...");

  // Obtener el modo oscuro
  const isDarkMode = localStorage.getItem("darkMode") === "true";

  // Inicializar los Lotties de Home
  initializeLotties(isDarkMode, "home");

  // Configurar efectos hover
  setupHomeLottieEffects();

  // Configurar navegación
  setupHomeNavigation();

  console.log("Lotties de Home inicializados correctamente");
});

// Función global para llamar desde dashboard.js
window.initHomeLotties = function () {
  console.log("Re-inicializando Lotties de Home...");

  // Siempre obtener el tema actual desde localStorage
  const isDarkMode = localStorage.getItem("darkMode") === "true";
  console.log(`Tema detectado en Home: ${isDarkMode ? "oscuro" : "claro"}`);

  initializeLotties(isDarkMode, "home");
  setupHomeLottieEffects();
  setupHomeNavigation();

  console.log("Lotties de Home re-inicializados correctamente");
};
