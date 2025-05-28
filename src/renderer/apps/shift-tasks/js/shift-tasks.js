/**
 * shift-tasks.js
 * Script principal para la aplicación Shift Tasks
 */

// Función global de inicialización que será llamada por el app-loader
window.initShiftTasks = function (view) {
  console.log("Inicializando Shift Tasks");

  setupShiftTasks();
  updateLastUpdate();

  return true;
};

/**
 * Configura la funcionalidad de Shift Tasks
 */
function setupShiftTasks() {
  console.log("Configurando Shift Tasks...");

  // Simular actualización de datos en tiempo real
  setInterval(updateStats, 30000); // Actualizar cada 30 segundos

  console.log("Shift Tasks configurado correctamente");
}

/**
 * Actualiza las estadísticas en tiempo real
 */
function updateStats() {
  const statNumbers = document.querySelectorAll(".stat-number");

  if (statNumbers.length > 0) {
    // Simular cambios pequeños en las estadísticas
    statNumbers.forEach((stat, index) => {
      const currentValue = parseInt(stat.textContent);
      let newValue = currentValue;

      switch (index) {
        case 0: // Tareas Activas
          newValue = Math.max(
            8,
            Math.min(20, currentValue + Math.floor(Math.random() * 3) - 1)
          );
          break;
        case 1: // Completadas Hoy
          newValue = Math.max(5, currentValue + Math.floor(Math.random() * 2));
          break;
        case 2: // Pendientes
          newValue = Math.max(
            0,
            Math.min(10, currentValue + Math.floor(Math.random() * 3) - 1)
          );
          break;
        case 3: // Eficiencia (porcentaje)
          const efficiency = Math.max(
            85,
            Math.min(100, currentValue + Math.floor(Math.random() * 5) - 2)
          );
          stat.textContent = efficiency + "%";
          return;
      }

      stat.textContent = newValue;
    });

    console.log("Estadísticas actualizadas");
  }
}

/**
 * Ver detalles de un turno específico
 */
window.viewShiftDetails = function (shift) {
  const shiftNames = {
    morning: "Turno Matutino",
    afternoon: "Turno Vespertino",
    night: "Turno Nocturno",
  };

  const message = `Mostrando detalles del ${shiftNames[shift]}.\n\nEsta funcionalidad se implementará en versiones futuras.`;

  if (window.showToast) {
    window.showToast(`Cargando detalles del ${shiftNames[shift]}...`, "info");
  } else {
    alert(message);
  }

  console.log(`Ver detalles del turno: ${shift}`);
};

/**
 * Generar reporte de productividad
 */
window.generateReport = function () {
  const message =
    "Generando reporte de productividad...\n\nEsta funcionalidad se implementará en versiones futuras.";

  if (window.showToast) {
    window.showToast("Generando reporte de productividad...", "info");
  } else {
    alert(message);
  }

  console.log("Generando reporte de productividad");
};

/**
 * Gestionar asignaciones de tareas
 */
window.manageAssignments = function () {
  const message =
    "Abriendo gestor de asignaciones...\n\nEsta funcionalidad se implementará en versiones futuras.";

  if (window.showToast) {
    window.showToast("Abriendo gestor de asignaciones...", "info");
  } else {
    alert(message);
  }

  console.log("Gestionar asignaciones");
};

/**
 * Ver todas las alertas
 */
window.viewAllAlerts = function () {
  const message =
    "Mostrando todas las alertas...\n\nEsta funcionalidad se implementará en versiones futuras.";

  if (window.showToast) {
    window.showToast("Cargando todas las alertas...", "info");
  } else {
    alert(message);
  }

  console.log("Ver todas las alertas");
};

/**
 * Actualiza la información de última actualización
 */
function updateLastUpdate() {
  console.log(
    "Shift Tasks - Última actualización:",
    new Date().toLocaleString()
  );
}

/**
 * Función global para activar Shift Tasks (opcional)
 */
window.activateShiftTasks = function () {
  console.log("Activando Shift Tasks");
  updateStats();
};

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM cargado - Shift Tasks listo");

  // Configurar algunos eventos adicionales si es necesario
  const cards = document.querySelectorAll(".shift-card");
  cards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-4px)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(-2px)";
    });
  });
});

console.log("Script Shift Tasks cargado");
