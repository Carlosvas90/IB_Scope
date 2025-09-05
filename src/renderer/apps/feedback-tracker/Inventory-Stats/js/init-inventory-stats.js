/**
 * init-inventory-stats.js
 * Inicializador principal para Inventory Stats usando módulos ES6
 */

// Función de inicialización principal
async function initInventoryStats() {
  console.log("🎯 Inicializando Inventory Stats...");

  try {
    // Importar dinámicamente el controlador principal
    const { InventoryStatsController } = await import(
      "./inventory-stats-controller.js"
    );

    // Crear nueva instancia del controlador
    const controller = new InventoryStatsController();

    // Inicializar el controlador
    await controller.init();

    // Hacer el controlador accesible globalmente para debugging
    window.inventoryStatsController = controller;

    console.log("✅ Inventory Stats inicializado correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error inicializando Inventory Stats:", error);

    // Mostrar error en la UI
    showError(error.message || "Error al inicializar la aplicación");
    return false;
  }
}

/**
 * Muestra un mensaje de error en la UI
 */
function showError(message) {
  const errorContainer = document.getElementById("error-container");
  const loadingContainer = document.getElementById("loading-container");
  const mainContent = document.getElementById("main-content");

  if (errorContainer) {
    errorContainer.style.display = "flex";
    const errorMessage = errorContainer.querySelector(".error-message");
    if (errorMessage) {
      errorMessage.textContent = message;
    }
  }

  if (loadingContainer) loadingContainer.style.display = "none";
  if (mainContent) mainContent.style.display = "none";
}

// Exportar función principal
window.initInventoryStats = initInventoryStats;

// Auto-inicialización cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", async () => {
    console.log("🎯 DOM cargado, inicializando Inventory Stats...");
    await initInventoryStats();
  });
} else {
  // DOM ya está listo
  console.log("🎯 Inicializando Inventory Stats inmediatamente...");
  setTimeout(() => initInventoryStats(), 100);
}

console.log("📋 Inicializador de Inventory Stats cargado");
