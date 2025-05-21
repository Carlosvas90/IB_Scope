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

function loadLottieAnimation(id, mode) {
  const container = document.getElementById(`lottie-${id}`);
  if (!container) return;

  const animationData = lottieFiles[id][mode];
  lottie.loadAnimation({
    container,
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: animationData,
  });

  container.addEventListener("click", () => {
    const animation = lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: false,
      autoplay: true,
      path: animationData,
    });
    animation.goToAndPlay(0, true);
  });
}

export function initializeLotties(isDarkMode) {
  const mode = isDarkMode ? "dark" : "light";
  Object.keys(lottieFiles).forEach((id) => {
    loadLottieAnimation(id, mode);
  });
}
