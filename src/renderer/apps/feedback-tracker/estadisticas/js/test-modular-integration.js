/**
 * test-modular-integration.js
 * Script de prueba para verificar la integración del sistema modular
 */

// Función para probar la integración modular
async function testModularIntegration() {
  console.log("🧪 Iniciando pruebas de integración modular...");

  const results = {
    chartRegistry: false,
    baseChart: false,
    trendChart: false,
    statusChart: false,
    controller: false,
    integration: false,
  };

  try {
    // 1. Verificar que ChartRegistry esté disponible
    console.log("📋 Verificando ChartRegistry...");
    if (typeof window.chartRegistry !== "undefined") {
      results.chartRegistry = true;
      console.log("✅ ChartRegistry disponible");
    } else {
      console.log("❌ ChartRegistry no disponible");
    }

    // 2. Verificar BaseChart
    console.log("🏗️ Verificando BaseChart...");
    try {
      const { BaseChart } = await import("./components/charts/BaseChart.js");
      if (BaseChart) {
        results.baseChart = true;
        console.log("✅ BaseChart disponible");
      }
    } catch (error) {
      console.log("❌ Error cargando BaseChart:", error.message);
    }

    // 3. Verificar TrendChart
    console.log("📈 Verificando TrendChart...");
    try {
      const { TrendChart } = await import(
        "./components/charts/charts/TrendChart.js"
      );
      if (TrendChart) {
        results.trendChart = true;
        console.log("✅ TrendChart disponible");
      }
    } catch (error) {
      console.log("❌ Error cargando TrendChart:", error.message);
    }

    // 4. Verificar StatusDistributionChart
    console.log("🥧 Verificando StatusDistributionChart...");
    try {
      const { StatusDistributionChart } = await import(
        "./components/charts/charts/StatusDistributionChart.js"
      );
      if (StatusDistributionChart) {
        results.statusChart = true;
        console.log("✅ StatusDistributionChart disponible");
      }
    } catch (error) {
      console.log("❌ Error cargando StatusDistributionChart:", error.message);
    }

    // 5. Verificar controlador principal
    console.log("🎮 Verificando controlador principal...");
    if (typeof window.estadisticasController !== "undefined") {
      const controller = window.estadisticasController;
      if (
        controller.useModularCharts !== undefined &&
        controller.modularCharts
      ) {
        results.controller = true;
        console.log("✅ Controlador con soporte modular disponible");
        console.log(
          `🔧 Sistema actual: ${
            controller.useModularCharts ? "MODULAR" : "TRADICIONAL"
          }`
        );
      } else {
        console.log("❌ Controlador sin soporte modular");
      }
    } else {
      console.log("❌ Controlador principal no disponible");
    }

    // 6. Verificar integración completa
    console.log("🔗 Verificando integración completa...");
    if (
      results.chartRegistry &&
      results.baseChart &&
      results.trendChart &&
      results.statusChart &&
      results.controller
    ) {
      results.integration = true;
      console.log("✅ Integración modular completa");
    } else {
      console.log("❌ Integración modular incompleta");
    }

    // Mostrar resumen
    console.log("\n📊 Resumen de pruebas:");
    console.table(results);

    // Verificar elementos DOM
    console.log("\n🔍 Verificando elementos DOM...");
    const domElements = {
      "toggle-chart-system": document.getElementById("toggle-chart-system"),
      "errors-trend-chart": document.getElementById("errors-trend-chart"),
      "status-distribution-chart": document.getElementById(
        "status-distribution-chart"
      ),
    };

    Object.entries(domElements).forEach(([id, element]) => {
      console.log(
        `${element ? "✅" : "❌"} ${id}: ${
          element ? "Encontrado" : "No encontrado"
        }`
      );
    });

    // Verificar ECharts
    console.log("\n📈 Verificando ECharts...");
    if (typeof echarts !== "undefined") {
      console.log("✅ ECharts disponible:", echarts.version);
    } else {
      console.log("❌ ECharts no disponible");
    }

    return results;
  } catch (error) {
    console.error("❌ Error en pruebas de integración:", error);
    return results;
  }
}

// Función para probar creación de gráfico modular
async function testModularChartCreation() {
  console.log("\n🎨 Probando creación de gráfico modular...");

  try {
    // Importar registro
    const chartRegistry = (await import("./components/charts/ChartRegistry.js"))
      .default;

    // Inicializar si no está inicializado
    if (!chartRegistry.initialized) {
      await chartRegistry.initialize();
    }

    // Crear contenedor de prueba
    const testContainer = document.createElement("div");
    testContainer.id = "test-chart-container";
    testContainer.style.width = "400px";
    testContainer.style.height = "300px";
    testContainer.style.border = "1px solid #ccc";
    testContainer.style.margin = "20px";
    document.body.appendChild(testContainer);

    // Crear gráfico de prueba
    const testChart = chartRegistry.create("trend", testContainer, {
      title: "Gráfico de Prueba",
      period: "7d",
      granularity: "day",
    });

    // Renderizar
    await testChart.render();

    console.log("✅ Gráfico de prueba creado exitosamente");
    console.log("📊 ID del gráfico:", testChart.chartId);

    // Limpiar después de 5 segundos
    setTimeout(() => {
      testChart.destroy();
      document.body.removeChild(testContainer);
      console.log("🧹 Gráfico de prueba limpiado");
    }, 5000);

    return true;
  } catch (error) {
    console.error("❌ Error creando gráfico de prueba:", error);
    return false;
  }
}

// Función para probar alternancia de sistemas
function testSystemToggle() {
  console.log("\n🔄 Probando alternancia de sistemas...");

  const controller = window.estadisticasController;
  if (!controller) {
    console.log("❌ Controlador no disponible");
    return false;
  }

  const initialSystem = controller.useModularCharts;
  console.log(
    `🔧 Sistema inicial: ${initialSystem ? "MODULAR" : "TRADICIONAL"}`
  );

  // Simular clic en botón de alternancia
  const toggleBtn = document.getElementById("toggle-chart-system");
  if (toggleBtn) {
    toggleBtn.click();

    setTimeout(() => {
      const newSystem = controller.useModularCharts;
      console.log(
        `🔧 Sistema después de toggle: ${newSystem ? "MODULAR" : "TRADICIONAL"}`
      );

      if (newSystem !== initialSystem) {
        console.log("✅ Alternancia de sistemas funciona correctamente");
      } else {
        console.log("❌ Alternancia de sistemas no funcionó");
      }
    }, 1000);

    return true;
  } else {
    console.log("❌ Botón de alternancia no encontrado");
    return false;
  }
}

// Ejecutar pruebas automáticamente cuando se carga el script
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", async () => {
    // Esperar un poco para que todo se inicialice
    setTimeout(async () => {
      await testModularIntegration();
      await testModularChartCreation();
      testSystemToggle();
    }, 2000);
  });
} else {
  // Si ya está cargado, ejecutar inmediatamente
  setTimeout(async () => {
    await testModularIntegration();
    await testModularChartCreation();
    testSystemToggle();
  }, 1000);
}

// Hacer funciones disponibles globalmente para testing manual
window.testModularIntegration = testModularIntegration;
window.testModularChartCreation = testModularChartCreation;
window.testSystemToggle = testSystemToggle;

console.log("🧪 Script de pruebas modular cargado");
console.log("💡 Funciones disponibles:");
console.log("  - testModularIntegration()");
console.log("  - testModularChartCreation()");
console.log("  - testSystemToggle()");
