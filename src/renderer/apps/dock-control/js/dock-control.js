/**
 * dock-control.js
 * Script principal para la aplicación Dock Control
 */

// Función global de inicialización que será llamada por el app-loader
window.initDockControl = function (view) {
  console.log("Inicializando Dock Control");

  setupDockControl();
  updateLastUpdate();
  startRealTimeUpdates();

  return true;
};

/**
 * Configura la funcionalidad de Dock Control
 */
function setupDockControl() {
  console.log("Configurando Dock Control...");

  // Configurar interactividad de los elementos del dock
  setupDockInteractivity();

  console.log("Dock Control configurado correctamente");
}

/**
 * Configura la interactividad de los elementos del dock
 */
function setupDockInteractivity() {
  const dockItems = document.querySelectorAll(".dock-item");

  dockItems.forEach((item) => {
    item.addEventListener("click", () => {
      const dockName = item.querySelector(".dock-name").textContent;
      const status = item.querySelector(".dock-status").textContent;

      showDockDetails(dockName, status);
    });

    // Efecto visual mejorado al hacer hover
    item.addEventListener("mouseenter", () => {
      item.style.transform = "translateX(8px)";
      item.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
    });

    item.addEventListener("mouseleave", () => {
      item.style.transform = "translateX(5px)";
      item.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
    });
  });
}

/**
 * Muestra detalles de un muelle específico
 */
function showDockDetails(dockName, status) {
  const message = `Detalles del ${dockName}\nEstado: ${status}\n\nEsta funcionalidad se implementará en versiones futuras.`;

  if (window.showToast) {
    window.showToast(`Mostrando detalles de ${dockName}...`, "info");
  } else {
    alert(message);
  }

  console.log(`Mostrar detalles del ${dockName} - Estado: ${status}`);
}

/**
 * Asignar camión a un muelle
 */
window.assignTruck = function () {
  const message =
    "Abriendo asistente de asignación de camiones...\n\nEsta funcionalidad se implementará en versiones futuras.";

  if (window.showToast) {
    window.showToast("Abriendo asistente de asignación...", "info");
  } else {
    alert(message);
  }

  console.log("Asignar camión");
};

/**
 * Programar mantenimiento
 */
window.scheduleMaintenace = function () {
  const message =
    "Abriendo programador de mantenimiento...\n\nEsta funcionalidad se implementará en versiones futuras.";

  if (window.showToast) {
    window.showToast("Abriendo programador de mantenimiento...", "info");
  } else {
    alert(message);
  }

  console.log("Programar mantenimiento");
};

/**
 * Generar reporte de muelles
 */
window.generateDockReport = function () {
  const message =
    "Generando reporte de actividad de muelles...\n\nEsta funcionalidad se implementará en versiones futuras.";

  if (window.showToast) {
    window.showToast("Generando reporte de muelles...", "info");
  } else {
    alert(message);
  }

  console.log("Generar reporte de muelles");
};

/**
 * Actualizar estado de muelles
 */
window.refreshDockStatus = function () {
  const message = "Actualizando estado de todos los muelles...";

  if (window.showToast) {
    window.showToast("Actualizando estado de muelles...", "info");
  } else {
    alert(message);
  }

  // Simular actualización
  updateOverviewNumbers();
  addNewLogEntry();

  console.log("Estado de muelles actualizado");
};

/**
 * Actualiza los números del overview
 */
function updateOverviewNumbers() {
  const overviewNumbers = document.querySelectorAll(".overview-number");

  if (overviewNumbers.length > 0) {
    // Simular pequeños cambios en los números
    overviewNumbers.forEach((number, index) => {
      if (index === 0) return; // Muelles totales no cambian

      const currentValue = parseInt(number.textContent);
      let newValue = currentValue;

      switch (index) {
        case 1: // En Operación
          newValue = Math.max(
            3,
            Math.min(7, currentValue + Math.floor(Math.random() * 3) - 1)
          );
          break;
        case 2: // Disponibles
          newValue = Math.max(
            0,
            Math.min(5, currentValue + Math.floor(Math.random() * 3) - 1)
          );
          break;
        case 3: // Mantenimiento
          newValue = Math.max(
            0,
            Math.min(2, currentValue + (Math.random() > 0.8 ? 1 : 0))
          );
          break;
      }

      number.textContent = newValue;
    });

    console.log("Números del overview actualizados");
  }
}

/**
 * Agrega una nueva entrada al log de actividad
 */
function addNewLogEntry() {
  const activityLog = document.querySelector(".activity-log");

  if (activityLog) {
    const now = new Date();
    const timeString = now.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const activities = [
      "Sistema: Estado actualizado automáticamente",
      "Muelle A-01: Verificación de seguridad completada",
      "Muelle B-02: Limpieza de área de carga",
      "Sistema: Sincronización con base de datos",
      "Muelle C-02: Inspección rutinaria",
      "Sistema: Backup de datos completado",
    ];

    const randomActivity =
      activities[Math.floor(Math.random() * activities.length)];

    const newEntry = document.createElement("div");
    newEntry.className = "log-entry";
    newEntry.innerHTML = `<span class="log-time">${timeString}</span>${randomActivity}`;

    // Agregar al principio del log
    activityLog.insertBefore(newEntry, activityLog.firstChild);

    // Limitar a 10 entradas máximo
    const entries = activityLog.querySelectorAll(".log-entry");
    if (entries.length > 10) {
      activityLog.removeChild(entries[entries.length - 1]);
    }

    console.log("Nueva entrada agregada al log");
  }
}

/**
 * Inicia actualizaciones en tiempo real
 */
function startRealTimeUpdates() {
  // Actualizar cada 45 segundos
  setInterval(() => {
    updateOverviewNumbers();
    addNewLogEntry();
  }, 45000);

  console.log("Actualizaciones en tiempo real iniciadas");
}

/**
 * Actualiza la información de última actualización
 */
function updateLastUpdate() {
  console.log(
    "Dock Control - Última actualización:",
    new Date().toLocaleString()
  );
}

/**
 * Función global para activar Dock Control (opcional)
 */
window.activateDockControl = function () {
  console.log("Activando Dock Control");
  updateOverviewNumbers();
  addNewLogEntry();
};

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM cargado - Dock Control listo");

  // Agregar efectos visuales a las tarjetas del overview
  const overviewCards = document.querySelectorAll(".overview-card");
  overviewCards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-5px) scale(1.02)";
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0) scale(1)";
    });
  });

  // Agregar scroll automático al log de actividad
  const activityLog = document.querySelector(".activity-log");
  if (activityLog) {
    activityLog.addEventListener("wheel", (e) => {
      e.stopPropagation();
    });
  }
});

console.log("Script Dock Control cargado");
