/**
 * test-charts.js
 * Script de prueba para verificar que ECharts funciona correctamente
 */

// Función para probar ECharts básico
function testEChartsBasic() {
  console.log("🧪 Iniciando prueba básica de ECharts...");

  // Verificar que ECharts esté disponible
  if (typeof echarts === "undefined") {
    console.error("❌ ECharts no está disponible");
    return false;
  }

  console.log("✅ ECharts disponible:", echarts.version);

  // Buscar un contenedor de prueba
  const container = document.getElementById("errors-trend-chart");
  if (!container) {
    console.error("❌ No se encontró contenedor de prueba");
    return false;
  }

  console.log("✅ Contenedor encontrado:", container);
  console.log("📏 Dimensiones del contenedor:", {
    width: container.offsetWidth,
    height: container.offsetHeight,
    display: getComputedStyle(container).display,
    visibility: getComputedStyle(container).visibility,
  });

  try {
    // Crear gráfico de prueba simple
    const chart = echarts.init(container);

    const option = {
      title: {
        text: "Prueba ECharts",
      },
      tooltip: {},
      xAxis: {
        data: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
      },
      yAxis: {},
      series: [
        {
          name: "Errores",
          type: "bar",
          data: [5, 20, 36, 10, 10, 20, 15],
        },
      ],
    };

    chart.setOption(option);

    console.log("✅ Gráfico de prueba creado exitosamente");

    // Limpiar después de 5 segundos
    setTimeout(() => {
      chart.dispose();
      console.log("🧹 Gráfico de prueba limpiado");
    }, 5000);

    return true;
  } catch (error) {
    console.error("❌ Error creando gráfico de prueba:", error);
    return false;
  }
}

// Función para probar todos los contenedores
function testAllContainers() {
  console.log("🧪 Probando todos los contenedores de gráficos...");

  const containerIds = [
    "errors-trend-chart",
    "status-distribution-chart",
    "hourly-errors-chart",
    "top-products-chart",
  ];

  containerIds.forEach((id) => {
    const container = document.getElementById(id);
    if (container) {
      console.log(`✅ Contenedor ${id} encontrado:`, {
        width: container.offsetWidth,
        height: container.offsetHeight,
        display: getComputedStyle(container).display,
        visibility: getComputedStyle(container).visibility,
        position: getComputedStyle(container).position,
      });
    } else {
      console.error(`❌ Contenedor ${id} no encontrado`);
    }
  });
}

// Función para verificar el estado del DOM
function checkDOMState() {
  console.log("🧪 Verificando estado del DOM...");
  console.log("📄 Document ready state:", document.readyState);
  console.log("🌐 Window loaded:", document.readyState === "complete");

  // Verificar si los scripts están cargados
  const scripts = Array.from(document.scripts).map((s) => s.src);
  const echartsScript = scripts.find((src) => src.includes("echarts"));
  console.log("📜 Script de ECharts:", echartsScript || "No encontrado");

  // Verificar estilos
  const stylesheets = Array.from(document.styleSheets);
  console.log("🎨 Hojas de estilo cargadas:", stylesheets.length);
}

// Exportar funciones para uso global
window.testEChartsBasic = testEChartsBasic;
window.testAllContainers = testAllContainers;
window.checkDOMState = checkDOMState;

// Auto-ejecutar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  console.log("🧪 Script de prueba cargado");

  // Esperar un poco para que todo se cargue
  setTimeout(() => {
    checkDOMState();
    testAllContainers();

    // Probar ECharts si está disponible
    if (typeof echarts !== "undefined") {
      testEChartsBasic();
    } else {
      console.log("⏳ ECharts no disponible aún, esperando...");

      // Intentar cada segundo hasta que esté disponible
      const interval = setInterval(() => {
        if (typeof echarts !== "undefined") {
          clearInterval(interval);
          testEChartsBasic();
        }
      }, 1000);

      // Timeout después de 10 segundos
      setTimeout(() => {
        clearInterval(interval);
        console.error("❌ Timeout esperando ECharts");
      }, 10000);
    }
  }, 1000);
});

console.log("📋 Script de prueba de gráficos cargado");
