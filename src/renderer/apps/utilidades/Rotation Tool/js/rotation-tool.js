/**
 * Rotation Tool Controller
 * Gestión de rotaciones de personal
 */

class RotationToolController {
  constructor() {
    this.init();
  }

  async init() {
    console.log("🔄 RotationToolController inicializando...");
    try {
      // Inicialización básica
      this.configurarEventos();
      console.log("✅ RotationToolController inicializado correctamente");
    } catch (error) {
      console.error("❌ Error al inicializar RotationToolController:", error);
    }
  }

  /**
   * Configura los eventos de la aplicación
   */
  configurarEventos() {
    console.log("⚙️ Configurando eventos...");
    // Eventos se agregarán aquí
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  window.rotationToolController = new RotationToolController();
});
