/**
 * test-cache-manager.js
 * Tests para validar la funcionalidad del CacheManager
 * Fase 1: Tests básicos de CRUD y funcionalidad
 */

import { CacheManager } from "./services/CacheManager.js";

/**
 * Suite de tests para CacheManager
 */
class CacheManagerTests {
  constructor() {
    this.cacheManager = null;
    this.testResults = [];
  }

  /**
   * Ejecuta todos los tests
   */
  async runAllTests() {
    console.log(`
╔═══════════════════════════════════════════════╗
║   🧪 CACHE MANAGER - SUITE DE TESTS          ║
║   Fase 1: Infraestructura Base               ║
╚═══════════════════════════════════════════════╝
    `);

    this.testResults = [];

    try {
      // Test 1: Inicialización
      await this.test1_initialization();

      // Test 2: Verificar stores
      await this.test2_verifyStores();

      // Test 3: Operaciones CRUD básicas
      await this.test3_crudOperations();

      // Test 4: Guardar y recuperar datos históricos
      await this.test4_historicalData();

      // Test 5: Metadata y sincronización
      await this.test5_metadata();

      // Test 6: Queries precalculadas
      await this.test6_aggregatedQueries();

      // Test 7: Configuración
      await this.test7_configuration();

      // Test 8: Estadísticas y salud del caché
      await this.test8_cacheHealth();

      // Test 9: Limpieza de stores
      await this.test9_cleanup();

      // Mostrar resumen
      this.showSummary();
    } catch (error) {
      console.error("❌ Error ejecutando tests:", error);
    }
  }

  /**
   * Test 1: Inicialización del CacheManager
   */
  async test1_initialization() {
    console.log("\n📋 Test 1: Inicialización");

    try {
      this.cacheManager = new CacheManager();
      const initialized = await this.cacheManager.init();

      this.assert(
        initialized === true,
        "CacheManager se inicializó correctamente"
      );
      this.assert(
        this.cacheManager.db !== null,
        "Conexión a IndexedDB establecida"
      );
      this.assert(
        this.cacheManager.isInitialized === true,
        "Flag isInitialized = true"
      );
    } catch (error) {
      this.fail("Inicialización falló", error);
    }
  }

  /**
   * Test 2: Verificar que todos los stores existen
   */
  async test2_verifyStores() {
    console.log("\n📋 Test 2: Verificación de Stores");

    try {
      const stores = [
        "historical_data",
        "aggregated_queries",
        "sync_metadata",
        "app_config",
      ];

      for (const storeName of stores) {
        const exists =
          this.cacheManager.db.objectStoreNames.contains(storeName);
        this.assert(exists, `Store '${storeName}' existe`);
      }
    } catch (error) {
      this.fail("Verificación de stores falló", error);
    }
  }

  /**
   * Test 3: Operaciones CRUD básicas
   */
  async test3_crudOperations() {
    console.log("\n📋 Test 3: Operaciones CRUD");

    try {
      // CREATE
      const testData = {
        key: "test_record_1",
        value: "Test data",
        timestamp: new Date().toISOString(),
      };

      await this.cacheManager.saveToStore("app_config", testData);
      this.assert(true, "CREATE: Datos guardados");

      // READ
      const retrieved = await this.cacheManager.getFromStore(
        "app_config",
        "test_record_1"
      );
      this.assert(retrieved !== null, "READ: Datos recuperados");
      this.assert(retrieved.value === "Test data", "READ: Datos correctos");

      // UPDATE
      testData.value = "Updated data";
      await this.cacheManager.saveToStore("app_config", testData);
      const updated = await this.cacheManager.getFromStore(
        "app_config",
        "test_record_1"
      );
      this.assert(
        updated.value === "Updated data",
        "UPDATE: Datos actualizados"
      );

      // DELETE
      await this.cacheManager.deleteFromStore("app_config", "test_record_1");
      const deleted = await this.cacheManager.getFromStore(
        "app_config",
        "test_record_1"
      );
      this.assert(deleted === null, "DELETE: Registro eliminado");
    } catch (error) {
      this.fail("Operaciones CRUD fallaron", error);
    }
  }

  /**
   * Test 4: Guardar y recuperar datos históricos
   */
  async test4_historicalData() {
    console.log("\n📋 Test 4: Datos Históricos");

    try {
      const monthData = {
        key: "feedback_202501",
        app: "feedback",
        year: 2025,
        month: 1,
        records: [
          { id: 1, user: "user1", error: "Wrong Location", date: "2025-01-01" },
          { id: 2, user: "user2", error: "Missing Label", date: "2025-01-02" },
          {
            id: 3,
            user: "user3",
            error: "Damaged Item",
            date: "2025-01-03",
          },
        ],
        recordCount: 3,
        hash: "abc123",
        lastSync: new Date().toISOString(),
        size: 0,
      };

      // Calcular tamaño
      monthData.size = JSON.stringify(monthData.records).length;

      // Guardar datos históricos
      await this.cacheManager.saveToStore("historical_data", monthData);
      this.assert(true, "Datos históricos guardados");

      // Recuperar datos
      const retrieved = await this.cacheManager.getFromStore(
        "historical_data",
        "feedback_202501"
      );
      this.assert(retrieved !== null, "Datos históricos recuperados");
      this.assert(retrieved.recordCount === 3, "Número de registros correcto");
      this.assert(retrieved.app === "feedback", "App correcta");
      this.assert(retrieved.hash === "abc123", "Hash correcto");
    } catch (error) {
      this.fail("Test de datos históricos falló", error);
    }
  }

  /**
   * Test 5: Metadata y sincronización
   */
  async test5_metadata() {
    console.log("\n📋 Test 5: Metadata");

    try {
      const metadata = {
        key: "feedback_db_metadata",
        value: {
          app: "feedback",
          dbPath: "\\\\ant\\dept-eu\\...\\Inventory_Health.db",
          lastChecksum: "xyz789",
          lastModified: new Date().toISOString(),
          lastSync: new Date().toISOString(),
          monthsInCache: ["202412", "202501"],
          totalSizeInCache: 150000,
          recordCountInCache: 500,
          needsUpdate: false,
        },
      };

      await this.cacheManager.saveToStore("sync_metadata", metadata);
      this.assert(true, "Metadata guardada");

      const retrieved = await this.cacheManager.getFromStore(
        "sync_metadata",
        "feedback_db_metadata"
      );
      this.assert(retrieved !== null, "Metadata recuperada");
      this.assert(
        retrieved.value.app === "feedback",
        "App en metadata correcta"
      );
      this.assert(
        retrieved.value.monthsInCache.length === 2,
        "Meses en caché correcto"
      );
    } catch (error) {
      this.fail("Test de metadata falló", error);
    }
  }

  /**
   * Test 6: Queries precalculadas
   */
  async test6_aggregatedQueries() {
    console.log("\n📋 Test 6: Queries Precalculadas");

    try {
      const query = {
        key: "feedback_202501_by_category",
        value: {
          app: "feedback",
          queryType: "by_category",
          period: "202501",
          data: {
            "Wrong Location": 45,
            "Missing Label": 32,
            "Damaged Item": 18,
          },
          calculatedAt: new Date().toISOString(),
          expiresAt: null,
        },
      };

      await this.cacheManager.saveToStore("aggregated_queries", query);
      this.assert(true, "Query precalculada guardada");

      const retrieved = await this.cacheManager.getFromStore(
        "aggregated_queries",
        "feedback_202501_by_category"
      );
      this.assert(retrieved !== null, "Query recuperada");
      this.assert(
        retrieved.value.data["Wrong Location"] === 45,
        "Datos de query correctos"
      );
    } catch (error) {
      this.fail("Test de queries falló", error);
    }
  }

  /**
   * Test 7: Configuración
   */
  async test7_configuration() {
    console.log("\n📋 Test 7: Configuración");

    try {
      const config = await this.cacheManager.loadConfig();
      this.assert(config !== null, "Configuración cargada");
      this.assert(
        config.maxSizeBytes === 80 * 1024 * 1024,
        "Límite de tamaño correcto"
      );

      // Modificar configuración
      config.retentionMonths = 6;
      await this.cacheManager.saveConfig(config);

      const updated = await this.cacheManager.loadConfig();
      this.assert(updated.retentionMonths === 6, "Configuración actualizada");
    } catch (error) {
      this.fail("Test de configuración falló", error);
    }
  }

  /**
   * Test 8: Estadísticas y salud del caché
   */
  async test8_cacheHealth() {
    console.log("\n📋 Test 8: Salud del Caché");

    try {
      const stats = await this.cacheManager.checkCacheHealth();
      this.assert(stats !== null, "Estadísticas obtenidas");
      this.assert(
        typeof stats.totalSize === "number",
        "Tamaño total calculado"
      );
      this.assert(
        typeof stats.usage === "number",
        "Porcentaje de uso calculado"
      );
      this.assert(
        stats.usage >= 0 && stats.usage <= 100,
        "Uso en rango válido"
      );
    } catch (error) {
      this.fail("Test de salud del caché falló", error);
    }
  }

  /**
   * Test 9: Limpieza de stores
   */
  async test9_cleanup() {
    console.log("\n📋 Test 9: Limpieza");

    try {
      // Limpiar stores de test
      await this.cacheManager.clearStore("historical_data");
      const count1 = await this.cacheManager.countInStore("historical_data");
      this.assert(count1 === 0, "Store historical_data limpiado");

      await this.cacheManager.clearStore("aggregated_queries");
      const count2 = await this.cacheManager.countInStore("aggregated_queries");
      this.assert(count2 === 0, "Store aggregated_queries limpiado");

      await this.cacheManager.clearStore("sync_metadata");
      const count3 = await this.cacheManager.countInStore("sync_metadata");
      this.assert(count3 === 0, "Store sync_metadata limpiado");
    } catch (error) {
      this.fail("Test de limpieza falló", error);
    }
  }

  // ==================== UTILIDADES DE TESTING ====================

  /**
   * Asserción básica
   */
  assert(condition, message) {
    if (condition) {
      console.log(`  ✅ ${message}`);
      this.testResults.push({ status: "pass", message });
    } else {
      console.error(`  ❌ ${message}`);
      this.testResults.push({ status: "fail", message });
    }
  }

  /**
   * Registra un fallo
   */
  fail(message, error) {
    console.error(`  ❌ ${message}`);
    if (error) {
      console.error("     Error:", error);
    }
    this.testResults.push({ status: "fail", message, error });
  }

  /**
   * Muestra resumen de tests
   */
  showSummary() {
    const passed = this.testResults.filter((r) => r.status === "pass").length;
    const failed = this.testResults.filter((r) => r.status === "fail").length;
    const total = this.testResults.length;

    console.log(`
╔═══════════════════════════════════════════════╗
║             📊 RESUMEN DE TESTS               ║
╠═══════════════════════════════════════════════╣
║  Total:    ${total}                                   ║
║  Pasados:  ${passed} ✅                              ║
║  Fallados: ${failed} ❌                              ║
║  Éxito:    ${((passed / total) * 100).toFixed(1)}%                          ║
╚═══════════════════════════════════════════════╝
    `);

    if (failed === 0) {
      console.log("🎉 ¡Todos los tests pasaron exitosamente!");
    } else {
      console.warn(`⚠️ ${failed} test(s) fallaron. Revisar errores arriba.`);
    }
  }
}

// ==================== EJECUTAR TESTS ====================

/**
 * Función principal para ejecutar los tests
 */
async function runTests() {
  const tests = new CacheManagerTests();
  await tests.runAllTests();

  // Opción para limpiar la BD después de los tests
  console.log("\n💡 Para limpiar la base de datos completamente, ejecuta:");
  console.log("   await tests.cacheManager.deleteDatabase()");
  console.log("\n💡 Para cerrar la conexión:");
  console.log("   tests.cacheManager.close()");

  // Hacer disponible globalmente para debugging
  window.cacheManagerTests = tests;
  window.testCacheManager = tests.cacheManager;

  return tests;
}

// Hacer disponible globalmente cuando se carga como módulo
if (typeof window !== "undefined") {
  window.runTests = runTests;
  window.CacheManagerTests = CacheManagerTests;

  console.log(`
╔═══════════════════════════════════════════════╗
║   🧪 CACHE MANAGER TEST SUITE CARGADO         ║
╠═══════════════════════════════════════════════╣
║  Para ejecutar los tests:                     ║
║  > await runTests()                            ║
║                                                ║
║  Para usar el CacheManager:                    ║
║  > import { CacheManager } from               ║
║    './services/CacheManager.js'               ║
╚═══════════════════════════════════════════════╝
  `);
}

export { runTests, CacheManagerTests };
