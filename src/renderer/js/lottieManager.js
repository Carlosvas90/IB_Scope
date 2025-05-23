// En lugar de importar lottie, usamos la variable global
// import lottie from 'lottie-web';

const lottieFiles = {
  // Lotties para el Sidebar
  sidebar: {
    dashboard: {
      light: "../../../assets/animations/dashboard_light.json",
      dark: "../../../assets/animations/dashboard_dark.json",
    },
    feedback: {
      light: "../../../assets/animations/feedback_light.json",
      dark: "../../../assets/animations/feedback_dark.json",
    },
    activity: {
      light: "../../../assets/animations/activity_light.json",
      dark: "../../../assets/animations/activity_dark.json",
    },
    idle: {
      light: "../../../assets/animations/idle_light.json",
      dark: "../../../assets/animations/idle_dark.json",
    },
    heatmap: {
      light: "../../../assets/animations/heatmap_light.json",
      dark: "../../../assets/animations/heatmap_dark.json",
    },
  },
  // Lotties para el Home (usando los mismos archivos por ahora)
  home: {
    feedback: {
      light: "../../../assets/animations/feedback_light.json",
      dark: "../../../assets/animations/feedback_dark.json",
    },
    activity: {
      light: "../../../assets/animations/activity_light.json",
      dark: "../../../assets/animations/activity_dark.json",
    },
    idle: {
      light: "../../../assets/animations/idle_light.json",
      dark: "../../../assets/animations/idle_dark.json",
    },
    heatmap: {
      light: "../../../assets/animations/heatmap_light.json",
      dark: "../../../assets/animations/heatmap_dark.json",
    },
  },
};

// Guardar instancias de animaciones
const lottieInstances = {};

// IDs de los lotties de navegación
const NAV_LOTTIES = ["dashboard", "feedback", "activity", "idle", "heatmap"];

function loadLottieAnimation(id, mode, location = "sidebar") {
  const container = document.getElementById(`lottie-${id}`);
  if (!container) {
    console.log(`No se encontró el contenedor para lottie-${id}`);
    return;
  }

  const animationData = lottieFiles[location][id][mode];
  console.log(
    `Cargando Lottie para ${id} en modo ${mode} desde ${location}:`,
    animationData
  );

  // Si ya existe una instancia, destrúyela primero
  if (lottieInstances[id]) {
    lottieInstances[id].destroy();
  }

  try {
    lottieInstances[id] = lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: false,
      autoplay: false,
      path: animationData,
    });
    console.log(`Lottie cargado exitosamente para ${id}`);
  } catch (error) {
    console.error(`Error al cargar Lottie para ${id}:`, error);
  }
}

// Función para detener todas las animaciones excepto la especificada
function stopOtherAnimations(activeId) {
  NAV_LOTTIES.forEach((id) => {
    if (id !== activeId && lottieInstances[id]) {
      lottieInstances[id].goToAndStop(0, true);
    }
  });
}

// Función para reproducir una animación específica
export function playLottie(id, location = "sidebar") {
  if (lottieInstances[id]) {
    stopOtherAnimations(id);
    lottieInstances[id].goToAndPlay(0, true);
  }
}

// Función para inicializar los lotties
export function initializeLotties(isDarkMode, location = "sidebar") {
  const mode = isDarkMode ? "dark" : "light";
  Object.keys(lottieFiles[location]).forEach((id) => {
    loadLottieAnimation(id, mode, location);
  });
}

// Función para actualizar el estado activo de los lotties
export function updateActiveLottie(activeId, location = "sidebar") {
  NAV_LOTTIES.forEach((id) => {
    const container = document.getElementById(`lottie-${id}`);
    if (container) {
      if (id === activeId) {
        playLottie(id, location);
      } else {
        if (lottieInstances[id]) {
          lottieInstances[id].goToAndStop(0, true);
        }
      }
    }
  });
}
