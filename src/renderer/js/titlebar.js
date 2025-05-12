/**
 * titlebar.js
 * Maneja la funcionalidad del titlebar personalizado
 */

class Titlebar {
  constructor() {
    this.minimizeButton = document.getElementById("minimize-button");
    this.maximizeButton = document.getElementById("maximize-button");
    this.closeButton = document.getElementById("close-button");
    this.dragRegion = document.querySelector(".titlebar-drag-region");

    this.init();
  }

  init() {
    // Configurar eventos de los botones
    this.setupButtonEvents();

    // Configurar área de arrastre
    this.setupDragRegion();

    // Escuchar cambios de tema
    this.setupThemeListener();
  }

  setupButtonEvents() {
    // Minimizar ventana
    this.minimizeButton.addEventListener("click", () => {
      window.api.minimize();
    });

    // Maximizar/Restaurar ventana
    this.maximizeButton.addEventListener("click", () => {
      window.api.maximize();
    });

    // Cerrar ventana
    this.closeButton.addEventListener("click", () => {
      window.api.close();
    });
  }

  setupDragRegion() {
    // El área de arrastre ya está configurada por CSS con -webkit-app-region: drag
    // Solo necesitamos asegurarnos de que los botones no sean arrastrables
    const buttons = document.querySelectorAll(".titlebar-button");
    buttons.forEach((button) => {
      button.style.webkitAppRegion = "no-drag";
    });
  }

  setupThemeListener() {
    // Escuchar cambios de tema
    window.api.onThemeChange((theme) => {
      document.documentElement.setAttribute("data-theme", theme);
    });
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  window.titlebar = new Titlebar();
});
