// En lugar de importar lottie, usamos la variable global
// import lottie from 'lottie-web';

const lottieFiles = {
  // Lotties para el Sidebar (desde src/renderer/views/)
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
  // Lotties para el Home (desde src/renderer/apps/dashboard/views/)
  home: {
    feedback: {
      light: "../../../../../assets/animations/feedback_light.json",
      dark: "../../../../../assets/animations/feedback_dark.json",
    },
    activity: {
      light: "../../../../../assets/animations/activity_light.json",
      dark: "../../../../../assets/animations/activity_dark.json",
    },
    idle: {
      light: "../../../../../assets/animations/idle_light.json",
      dark: "../../../../../assets/animations/idle_dark.json",
    },
    heatmap: {
      light: "../../../../../assets/animations/heatmap_light.json",
      dark: "../../../../../assets/animations/heatmap_dark.json",
    },
  },
};

// Guardar instancias de animaciones
const lottieInstances = {};

// IDs de los lotties de navegación
const NAV_LOTTIES = ["dashboard", "feedback", "activity", "idle", "heatmap"];

async function loadLottieAnimation(id, mode, location = "sidebar") {
  console.log(
    `Intentando cargar Lottie: ${id} en modo ${mode} desde ${location}`
  );

  // Determinar el ID del contenedor según la ubicación
  const containerId =
    location === "home" ? `home-lottie-${id}` : `lottie-${id}`;
  const container = document.getElementById(containerId);

  if (!container) {
    console.error(`No se encontró el contenedor para ${containerId}`);
    return;
  }

  try {
    const animationData = lottieFiles[location][id][mode];
    console.log(`Ruta del archivo Lottie: ${animationData}`);

    // Verificar si el archivo existe
    const response = await fetch(animationData);
    if (!response.ok) {
      throw new Error(`No se pudo cargar el archivo: ${animationData}`);
    }

    // Si ya existe una instancia, destrúyela primero
    if (lottieInstances[containerId]) {
      console.log(`Destruyendo instancia existente de ${containerId}`);
      lottieInstances[containerId].destroy();
    }

    console.log(`Creando nueva instancia de Lottie para ${containerId}`);
    lottieInstances[containerId] = lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: false,
      autoplay: false,
      path: animationData,
    });

    console.log(`Lottie cargado exitosamente para ${containerId}`);
  } catch (error) {
    console.error(`Error al cargar Lottie para ${containerId}:`, error);
  }
}

// Función para detener todas las animaciones excepto la especificada
function stopOtherAnimations(activeId) {
  NAV_LOTTIES.forEach((id) => {
    const sidebarId = `lottie-${id}`;
    const homeId = `home-lottie-${id}`;

    if (sidebarId !== activeId && lottieInstances[sidebarId]) {
      lottieInstances[sidebarId].goToAndStop(0, true);
    }
    if (homeId !== activeId && lottieInstances[homeId]) {
      lottieInstances[homeId].goToAndStop(0, true);
    }
  });
}

// Función para reproducir una animación específica
export function playLottie(id, location = "sidebar") {
  console.log(`Reproduciendo Lottie: ${id} desde ${location}`);
  const containerId =
    location === "home" ? `home-lottie-${id}` : `lottie-${id}`;

  if (lottieInstances[containerId]) {
    stopOtherAnimations(containerId);
    lottieInstances[containerId].goToAndPlay(0, true);
  } else {
    console.error(`No se encontró la instancia de Lottie para ${containerId}`);
  }
}

// Función para inicializar los lotties
export async function initializeLotties(isDarkMode, location = "sidebar") {
  console.log(
    `Inicializando Lotties para ${location} en modo ${
      isDarkMode ? "dark" : "light"
    }`
  );
  const mode = isDarkMode ? "dark" : "light";

  try {
    const ids = Object.keys(lottieFiles[location]);
    for (const id of ids) {
      await loadLottieAnimation(id, mode, location);
    }
  } catch (error) {
    console.error(`Error al inicializar Lotties para ${location}:`, error);
  }
}

// Función para actualizar el estado activo de los lotties
export function updateActiveLottie(activeId, location = "sidebar") {
  console.log(`Actualizando Lottie activo: ${activeId} desde ${location}`);
  const ids = Object.keys(lottieFiles[location]);

  ids.forEach((id) => {
    const containerId =
      location === "home" ? `home-lottie-${id}` : `lottie-${id}`;
    const container = document.getElementById(containerId);
    if (container) {
      if (containerId === activeId) {
        playLottie(id, location);
      } else {
        if (lottieInstances[containerId]) {
          lottieInstances[containerId].goToAndStop(0, true);
        }
      }
    }
  });
}
