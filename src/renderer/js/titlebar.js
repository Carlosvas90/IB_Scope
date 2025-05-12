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
    this.maximizeIcon = this.maximizeButton.querySelector("svg");

    this.init();
  }

  async init() {
    // Configurar eventos de los botones
    this.setupButtonEvents();

    // Configurar área de arrastre
    this.setupDragRegion();

    // Escuchar cambios de tema
    this.setupThemeListener();

    // Configurar icono inicial de maximizar/restaurar
    await this.updateMaximizeIcon();

    // Escuchar eventos de maximizar/restaurar
    window.api.onWindowMaximized(() => this.setRestoreIcon());
    window.api.onWindowRestored(() => this.setMaximizeIcon());
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

  async updateMaximizeIcon() {
    const isMaximized = await window.api.isWindowMaximized();
    if (isMaximized) {
      this.setRestoreIcon();
    } else {
      this.setMaximizeIcon();
    }
  }

  setMaximizeIcon() {
    // Icono de maximizar (cuadro)
    this.maximizeIcon.innerHTML = `
      <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1" />
    `;
    this.maximizeButton.title = "Maximizar";
  }

  setRestoreIcon() {
    // Icono de restaurar (dos cuadros superpuestos)
    this.maximizeIcon.innerHTML = `
      <rect x="3" y="3" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1" />
      <rect x="5" y="1" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1" />
    `;
    this.maximizeButton.title = "Restaurar";
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  window.titlebar = new Titlebar();
});
