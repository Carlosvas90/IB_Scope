// En lugar de importar lottie, usamos la variable global
// import lottie from 'lottie-web';

const lottieFiles = {
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
};

// Guardar instancias de animaciones
const lottieInstances = {};

// IDs de los lotties de navegación
const NAV_LOTTIES = ["dashboard", "feedback", "activity", "idle", "heatmap"];

function loadLottieAnimation(id, mode) {
  const container = document.getElementById(`lottie-${id}`);
  if (!container) return;

  const animationData = lottieFiles[id][mode];
  // Si ya existe una instancia, destrúyela primero
  if (lottieInstances[id]) {
    lottieInstances[id].destroy();
  }
  lottieInstances[id] = lottie.loadAnimation({
    container,
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: animationData,
  });
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
export function playLottie(id) {
  if (lottieInstances[id]) {
    stopOtherAnimations(id);
    lottieInstances[id].goToAndPlay(0, true);
  }
}

// Función para inicializar los lotties
export function initializeLotties(isDarkMode) {
  const mode = isDarkMode ? "dark" : "light";
  Object.keys(lottieFiles).forEach((id) => {
    loadLottieAnimation(id, mode);
  });
}

// Función para actualizar el estado activo de los lotties
export function updateActiveLottie(activeId) {
  NAV_LOTTIES.forEach((id) => {
    const container = document.getElementById(`lottie-${id}`);
    if (container) {
      if (id === activeId) {
        playLottie(id);
      } else {
        if (lottieInstances[id]) {
          lottieInstances[id].goToAndStop(0, true);
        }
      }
    }
  });
}
