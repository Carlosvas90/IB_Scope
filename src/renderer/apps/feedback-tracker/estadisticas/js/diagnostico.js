/**
 * diagnostico.js
 * Script de diagnóstico para verificar el estado del sistema de estadísticas
 */

function diagnosticarSistema() {
  console.log("🔍 === DIAGNÓSTICO DEL SISTEMA DE ESTADÍSTICAS ===");

  const resultados = {
    echarts: false,
    initFunction: false,
    controller: false,
    domElements: {},
    errors: [],
  };

  // 1. Verificar ECharts
  if (typeof echarts !== "undefined") {
    resultados.echarts = true;
    console.log("✅ ECharts disponible:", echarts.version);
  } else {
    resultados.errors.push("ECharts no está disponible");
    console.log("❌ ECharts no disponible");
  }

  // 2. Verificar función de inicialización
  if (typeof window.initEstadisticas === "function") {
    resultados.initFunction = true;
    console.log("✅ Función initEstadisticas disponible");
  } else {
    resultados.errors.push("Función initEstadisticas no encontrada");
    console.log("❌ Función initEstadisticas no disponible");
  }

  // 3. Verificar controlador
  if (window.estadisticasController) {
    resultados.controller = true;
    console.log("✅ Controlador disponible");
    console.log(
      "🔧 Sistema modular:",
      window.estadisticasController.useModularCharts
        ? "ACTIVADO"
        : "DESACTIVADO"
    );
  } else {
    resultados.errors.push("Controlador no inicializado");
    console.log("❌ Controlador no disponible");
  }

  // 4. Verificar elementos DOM críticos
  const elementosImportantes = [
    "date-range",
    "refresh-stats",
    "toggle-chart-system",
    "errors-trend-chart",
    "status-distribution-chart",
    "total-errors-kpi",
  ];

  elementosImportantes.forEach((id) => {
    const elemento = document.getElementById(id);
    resultados.domElements[id] = !!elemento;
    console.log(
      `${elemento ? "✅" : "❌"} Elemento ${id}: ${
        elemento ? "Encontrado" : "No encontrado"
      }`
    );
  });

  // 5. Resumen
  console.log("\n📊 === RESUMEN DEL DIAGNÓSTICO ===");
  console.table(resultados);

  if (resultados.errors.length > 0) {
    console.log("\n⚠️ ERRORES ENCONTRADOS:");
    resultados.errors.forEach((error) => console.log(`  - ${error}`));
  }

  // 6. Recomendaciones
  console.log("\n💡 === RECOMENDACIONES ===");

  if (!resultados.echarts) {
    console.log("🔧 Verificar que ECharts se esté cargando correctamente");
  }

  if (!resultados.initFunction) {
    console.log("🔧 Verificar que init-estadisticas.js se esté cargando");
  }

  if (!resultados.controller) {
    console.log("🔧 Ejecutar manualmente: await initEstadisticas()");
  }

  return resultados;
}

// Función para intentar reparar problemas comunes
async function intentarReparacion() {
  console.log("🔧 === INTENTANDO REPARACIÓN AUTOMÁTICA ===");

  try {
    // 1. Intentar inicializar si no está inicializado
    if (
      !window.estadisticasController &&
      typeof window.initEstadisticas === "function"
    ) {
      console.log("🔄 Intentando inicializar controlador...");
      await window.initEstadisticas();

      if (window.estadisticasController) {
        console.log("✅ Controlador inicializado correctamente");
        return true;
      }
    }

    // 2. Si el controlador existe pero no funciona, reiniciar
    if (
      window.estadisticasController &&
      !window.estadisticasController.errors
    ) {
      console.log("🔄 Intentando cargar datos...");
      await window.estadisticasController.loadData();
      console.log("✅ Datos cargados");
      return true;
    }

    return false;
  } catch (error) {
    console.error("❌ Error en reparación automática:", error);
    return false;
  }
}

// Función para mostrar estado en tiempo real
function mostrarEstadoTiempoReal() {
  const indicador = document.createElement("div");
  indicador.id = "diagnostico-indicator";
  indicador.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: #333;
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 12px;
    z-index: 10000;
    max-width: 300px;
  `;

  document.body.appendChild(indicador);

  function actualizar() {
    const estado = {
      echarts: typeof echarts !== "undefined",
      controller: !!window.estadisticasController,
      modular: window.estadisticasController?.useModularCharts || false,
      datos: window.estadisticasController?.errors?.length || 0,
    };

    indicador.innerHTML = `
      <strong>📊 Estado del Sistema</strong><br>
      ECharts: ${estado.echarts ? "✅" : "❌"}<br>
      Controlador: ${estado.controller ? "✅" : "❌"}<br>
      Sistema: ${estado.modular ? "🔧 Modular" : "🔧 Tradicional"}<br>
      Datos: ${estado.datos} registros<br>
      <button onclick="diagnosticarSistema()" style="margin-top: 5px; padding: 2px 5px;">Diagnosticar</button>
      <button onclick="intentarReparacion()" style="margin-top: 5px; padding: 2px 5px;">Reparar</button>
    `;
  }

  actualizar();
  setInterval(actualizar, 2000);

  // Auto-remover después de 30 segundos
  setTimeout(() => {
    if (document.getElementById("diagnostico-indicator")) {
      document.body.removeChild(indicador);
    }
  }, 30000);
}

// Hacer funciones disponibles globalmente
window.diagnosticarSistema = diagnosticarSistema;
window.intentarReparacion = intentarReparacion;
window.mostrarEstadoTiempoReal = mostrarEstadoTiempoReal;

// Auto-ejecutar diagnóstico cuando se carga
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(diagnosticarSistema, 1000);
  });
} else {
  setTimeout(diagnosticarSistema, 1000);
}

console.log("🔍 Diagnóstico cargado. Funciones disponibles:");
console.log("  - diagnosticarSistema()");
console.log("  - intentarReparacion()");
console.log("  - mostrarEstadoTiempoReal()");
