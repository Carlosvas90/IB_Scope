/**
 * test-integration.js
 * Script de prueba para validar la integración del dashboard de estadísticas
 */

// Función para verificar que todos los componentes estén cargados
function verifyIntegration() {
  console.log("🔍 Verificando integración del dashboard de estadísticas...");

  // Verificar que ECharts esté disponible
  if (typeof echarts !== "undefined") {
    console.log("✅ ECharts cargado correctamente");
  } else {
    console.error("❌ ECharts no está disponible");
    return false;
  }

  // Verificar que los elementos DOM críticos existan
  const criticalElements = [
    "errors-trend-chart",
    "status-distribution-chart",
    "hourly-errors-chart",
    "top-products-chart",
    "total-errors-kpi",
    "pending-errors-kpi",
    "resolved-errors-kpi",
    "resolution-rate-kpi",
    "avg-resolution-time-kpi",
    "daily-avg-kpi",
  ];

  let allElementsFound = true;
  criticalElements.forEach((elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
      console.log(`✅ Elemento encontrado: ${elementId}`);
    } else {
      console.error(`❌ Elemento no encontrado: ${elementId}`);
      allElementsFound = false;
    }
  });

  // Verificar que los controladores estén disponibles
  if (window.estadisticasController) {
    console.log("✅ EstadisticasController disponible");
  } else {
    console.error("❌ EstadisticasController no disponible");
    allElementsFound = false;
  }

  if (allElementsFound) {
    console.log("🎉 ¡Integración verificada exitosamente!");

    // Mostrar notificación en el dashboard
    showIntegrationSuccess();

    return true;
  } else {
    console.error("❌ La integración tiene problemas");
    return false;
  }
}

// Función para mostrar mensaje de éxito
function showIntegrationSuccess() {
  // Crear notificación temporal
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4caf50;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: var(--stats-font-family, 'Segoe UI', sans-serif);
    font-size: 14px;
    animation: slideIn 0.3s ease-out;
  `;

  notification.innerHTML = `
    <strong>✅ Dashboard Integrado</strong><br>
    El sistema de estadísticas está funcionando correctamente
  `;

  // Agregar estilos de animación
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  // Remover después de 5 segundos
  setTimeout(() => {
    notification.style.animation = "slideIn 0.3s ease-out reverse";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Ejecutar verificación cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(verifyIntegration, 1000); // Esperar 1 segundo para que todo se cargue
  });
} else {
  setTimeout(verifyIntegration, 1000);
}

// Exportar para uso manual
window.verifyStatsIntegration = verifyIntegration;
