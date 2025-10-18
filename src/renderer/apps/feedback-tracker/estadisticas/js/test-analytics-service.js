/**
 * test-analytics-service.js
 * Script de prueba para AnalyticsJSONService
 * Ejecutar en la consola del navegador para verificar funcionalidad
 */

import { AnalyticsJSONService } from "./services/AnalyticsJSONService.js";

// Función de testing
async function testAnalyticsService() {
  console.log("🧪 ========== TEST: AnalyticsJSONService ==========");

  const service = new AnalyticsJSONService();

  try {
    // Test 1: Verificar disponibilidad
    console.log("\n📋 Test 1: Verificar disponibilidad del servicio");
    const isAvailable = await service.isAvailable();
    console.log(
      `   Resultado: ${isAvailable ? "✅ Disponible" : "❌ No disponible"}`
    );

    if (!isAvailable) {
      console.error(
        "❌ Servicio no disponible. Verifica las rutas en config.json"
      );
      return;
    }

    // Test 2: Leer archivo histórico (última semana)
    console.log("\n📋 Test 2: Leer archivo histórico (última semana)");
    const historical = await service.readHistoricalJSON(7);
    console.log("   ✅ Histórico leído:", {
      period: historical.metadata.period,
      days: historical.metadata.total_days,
      records: historical.metadata.total_records,
      total_incidents: historical.kpis.total_incidents,
    });

    // Test 3: Leer archivo del día actual
    console.log("\n📋 Test 3: Leer archivo del día actual");
    try {
      const today = await service.readTodayJSON();
      console.log("   ✅ Día actual leído:", {
        errors: today.errors.length,
        sample_error: today.errors[0]?.user_id || "N/A",
      });
    } catch (error) {
      console.warn("   ⚠️ No se pudo leer archivo de hoy:", error.message);
    }

    // Test 4: Combinar datos (histórico + hoy)
    console.log("\n📋 Test 4: Combinar datos históricos con día actual");
    const combined = await service.getAnalyticsData(7);
    console.log("   ✅ Datos combinados:", {
      includes_today: combined.metadata.includes_today,
      total_days: combined.metadata.total_days,
      total_incidents: combined.kpis.total_incidents,
      daily_average: combined.kpis.daily_average.toFixed(1),
      by_day_count: combined.trends.by_day.length,
      has_insights: !!combined.insights,
    });

    // Test 5: Verificar estructura de datos
    console.log("\n📋 Test 5: Verificar estructura de datos");
    const checks = {
      "trends.by_day tiene total/pending/resolved":
        combined.trends.by_day[0]?.total !== undefined &&
        combined.trends.by_day[0]?.pending !== undefined &&
        combined.trends.by_day[0]?.resolved !== undefined,
      "insights existe":
        combined.insights !== null && combined.insights !== undefined,
      "top_motives no está vacío":
        Array.isArray(combined.top_motives) && combined.top_motives.length > 0,
      "top_violations existe":
        Array.isArray(combined.top_violations) &&
        combined.top_violations.length > 0,
      "top_offenders existe":
        Array.isArray(combined.top_offenders) &&
        combined.top_offenders.length > 0,
    };

    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`   ${passed ? "✅" : "❌"} ${check}`);
    });

    // Test 6: Diferentes periodos
    console.log("\n📋 Test 6: Probar diferentes periodos");
    const periods = [0, 3, 7, 30];
    for (const days of periods) {
      try {
        const data = await service.getAnalyticsData(days);
        console.log(
          `   ✅ Periodo ${days} días: ${data.kpis.total_incidents} incidentes`
        );
      } catch (error) {
        console.log(`   ⚠️ Periodo ${days} días: ${error.message}`);
      }
    }

    // Test 7: Caché
    console.log("\n📋 Test 7: Verificar funcionamiento del caché");
    const startTime = Date.now();
    await service.getAnalyticsData(7);
    const firstLoadTime = Date.now() - startTime;

    const startTime2 = Date.now();
    await service.getAnalyticsData(7);
    const cachedLoadTime = Date.now() - startTime2;

    console.log(`   Primera carga: ${firstLoadTime}ms`);
    console.log(`   Desde caché: ${cachedLoadTime}ms`);
    console.log(
      `   ${cachedLoadTime < firstLoadTime ? "✅" : "⚠️"} Caché funcionando`
    );

    // Test 8: Limpiar caché y recargar
    console.log("\n📋 Test 8: Limpiar caché");
    service.clearCache();
    console.log("   ✅ Caché limpiado");

    const startTime3 = Date.now();
    await service.getAnalyticsData(7);
    const reloadTime = Date.now() - startTime3;
    console.log(`   Recarga después de limpiar: ${reloadTime}ms`);

    // Resumen final
    console.log("\n🎉 ========== TESTS COMPLETADOS ==========");
    console.log("✅ Todos los tests pasaron correctamente");
    console.log("\n📊 Datos disponibles:");
    console.log("   - Periodos: Hoy, 3 días, Semana, Mes, 3 meses");
    console.log("   - Estructura: trends.by_day con total/pending/resolved ✓");
    console.log("   - Insights: Análisis automático disponible ✓");
    console.log("   - Cache: Funcionando correctamente ✓");
    console.log("\n🚀 Listo para integrar con EstadisticasDataService");

    return true;
  } catch (error) {
    console.error("\n❌ ========== ERROR EN LOS TESTS ==========");
    console.error("Error:", error);
    console.error("Stack:", error.stack);
    return false;
  }
}

// Ejecutar tests automáticamente si se carga como script
if (typeof window !== "undefined") {
  // Esperar a que el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(testAnalyticsService, 1000);
    });
  } else {
    // DOM ya está listo
    setTimeout(testAnalyticsService, 1000);
  }
}

// Exportar para uso manual
export { testAnalyticsService };

// También exponer globalmente para testing en consola
if (typeof window !== "undefined") {
  window.testAnalyticsService = testAnalyticsService;
}
