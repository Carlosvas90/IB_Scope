/**
 * test-optimized-data-service.js
 * Tests para OptimizedDataService (Fase 2)
 */

import { OptimizedDataService } from "./services/OptimizedDataService.js";

/**
 * Suite de tests para OptimizedDataService
 */
export class OptimizedDataServiceTests {
  constructor() {
    this.testsPassed = 0;
    this.testsFailed = 0;
    this.results = [];
  }

  /**
   * Ejecuta un test individual
   */
  async runTest(name, testFn) {
    try {
      console.log(`\n🧪 Test: ${name}`);
      await testFn();
      this.testsPassed++;
      this.results.push({ name, status: "✅ PASS" });
      console.log(`✅ PASS: ${name}`);
    } catch (error) {
      this.testsFailed++;
      this.results.push({ name, status: "❌ FAIL", error: error.message });
      console.error(`❌ FAIL: ${name}`, error);
    }
  }

  /**
   * Test 1: Inicialización
   */
  async testInitialization() {
    const ods = new OptimizedDataService();

    // Verificar estado inicial
    if (ods.isInitialized) {
      throw new Error("No debería estar inicializado antes de init()");
    }

    // Inicializar
    const success = await ods.init();

    if (!success) {
      throw new Error("Inicialización falló");
    }

    if (!ods.isInitialized) {
      throw new Error("Debería estar inicializado después de init()");
    }

    if (!ods.currentMonth) {
      throw new Error("currentMonth no está definido");
    }

    if (!ods.estadisticasService) {
      throw new Error("estadisticasService no está definido");
    }

    if (!ods.cacheManager) {
      throw new Error("cacheManager no está definido");
    }

    await ods.close();
    console.log("✓ Servicio inicializado correctamente");
  }

  /**
   * Test 2: Cálculo de claves de mes
   */
  async testMonthKeyCalculation() {
    const ods = new OptimizedDataService();

    // Test getCurrentMonthKey
    const currentMonth = ods.getCurrentMonthKey();
    const regex = /^\d{6}$/; // YYYYMM

    if (!regex.test(currentMonth)) {
      throw new Error(
        `getCurrentMonthKey retornó formato inválido: ${currentMonth}`
      );
    }

    // Test getMonthKeyFromDate
    const testCases = [
      { input: "2025/01/15", expected: "202501" },
      { input: "20250115", expected: "202501" },
      { input: "2024/12/31", expected: "202412" },
    ];

    for (const { input, expected } of testCases) {
      const result = ods.getMonthKeyFromDate(input);
      if (result !== expected) {
        throw new Error(
          `getMonthKeyFromDate(${input}) = ${result}, esperado: ${expected}`
        );
      }
    }

    console.log("✓ Cálculo de claves de mes correcto");
  }

  /**
   * Test 3: Generación de lista de meses para rango
   */
  async testMonthsForDateRange() {
    const ods = new OptimizedDataService();

    // Test: 0 días (solo hoy)
    const months0 = ods.getMonthsForDateRange(0);
    if (months0.length !== 1) {
      throw new Error(
        `0 días debería retornar 1 mes, retornó: ${months0.length}`
      );
    }

    // Test: 7 días (puede ser 1 o 2 meses dependiendo de la fecha)
    const months7 = ods.getMonthsForDateRange(7);
    if (months7.length < 1 || months7.length > 2) {
      throw new Error(
        `7 días debería retornar 1-2 meses, retornó: ${months7.length}`
      );
    }

    // Test: 60 días (debería ser 2-3 meses)
    const months60 = ods.getMonthsForDateRange(60);
    if (months60.length < 2 || months60.length > 3) {
      throw new Error(
        `60 días debería retornar 2-3 meses, retornó: ${months60.length}`
      );
    }

    // Verificar que están ordenados
    const sorted = [...months60].sort();
    if (JSON.stringify(months60) !== JSON.stringify(sorted)) {
      throw new Error("Los meses no están ordenados");
    }

    console.log("✓ Generación de meses para rango correcta");
  }

  /**
   * Test 4: Cálculo de hash
   */
  async testDataHash() {
    const ods = new OptimizedDataService();

    const testData1 = [{ id: 1, name: "Test" }];
    const testData2 = [{ id: 1, name: "Test" }];
    const testData3 = [{ id: 2, name: "Test" }];

    const hash1 = await ods.calculateDataHash(testData1);
    const hash2 = await ods.calculateDataHash(testData2);
    const hash3 = await ods.calculateDataHash(testData3);

    // Mismo contenido debería dar mismo hash
    if (hash1 !== hash2) {
      throw new Error("Mismo contenido debería generar mismo hash");
    }

    // Diferente contenido debería dar diferente hash
    if (hash1 === hash3) {
      throw new Error("Diferente contenido debería generar diferente hash");
    }

    // Hash debería ser SHA-256 (64 caracteres hex)
    if (hash1.length !== 64) {
      throw new Error(
        `Hash debería tener 64 caracteres, tiene: ${hash1.length}`
      );
    }

    console.log("✓ Cálculo de hash correcto");
  }

  /**
   * Test 5: Carga de datos de HOY
   */
  async testLoadTodayData() {
    const ods = new OptimizedDataService();
    await ods.init();

    console.log("Cargando datos de hoy...");
    const todayData = await ods.loadTodayData();

    if (!Array.isArray(todayData)) {
      throw new Error("loadTodayData() debería retornar un array");
    }

    console.log(`✓ Datos de hoy cargados: ${todayData.length} registros`);

    await ods.close();
  }

  /**
   * Test 6: Carga básica de datos
   */
  async testLoadData() {
    const ods = new OptimizedDataService();
    await ods.init();

    console.log("Cargando datos (modo básico)...");
    const success = await ods.loadData();

    if (!success) {
      throw new Error("loadData() debería retornar true en éxito");
    }

    if (!Array.isArray(ods.errors)) {
      throw new Error("ods.errors debería ser un array");
    }

    console.log(`✓ Datos cargados: ${ods.errors.length} registros`);

    await ods.close();
  }

  /**
   * Test 7: Filtrado por rango de fechas
   */
  async testFilterByDateRange() {
    const ods = new OptimizedDataService();

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 8);

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}/${month}/${day}`;
    };

    const testRecords = [
      { id: 1, date: formatDate(today), error: "A" },
      { id: 2, date: formatDate(yesterday), error: "B" },
      { id: 3, date: formatDate(lastWeek), error: "C" },
    ];

    // Test: Solo hoy (0 días)
    const filtered0 = ods.filterByDateRange(testRecords, 0);
    if (filtered0.length !== 1) {
      throw new Error(
        `Rango 0 debería retornar 1 registro, retornó: ${filtered0.length}`
      );
    }

    // Test: Últimos 3 días
    const filtered3 = ods.filterByDateRange(testRecords, 3);
    if (filtered3.length !== 2) {
      throw new Error(
        `Rango 3 debería retornar 2 registros, retornó: ${filtered3.length}`
      );
    }

    // Test: Últimos 10 días
    const filtered10 = ods.filterByDateRange(testRecords, 10);
    if (filtered10.length !== 3) {
      throw new Error(
        `Rango 10 debería retornar 3 registros, retornó: ${filtered10.length}`
      );
    }

    console.log("✓ Filtrado por rango de fechas correcto");
  }

  /**
   * Test 8: Proxy a métodos del servicio original
   */
  async testProxyMethods() {
    const ods = new OptimizedDataService();
    await ods.init();

    // Test getAvailableDateRanges
    const ranges = ods.getAvailableDateRanges();
    if (!Array.isArray(ranges)) {
      throw new Error("getAvailableDateRanges() debería retornar un array");
    }

    // Test getCurrentDateRange
    const currentRange = ods.getCurrentDateRange();
    if (typeof currentRange !== "number") {
      throw new Error("getCurrentDateRange() debería retornar un número");
    }

    // Test getLastUpdateFormatted
    const lastUpdate = ods.getLastUpdateFormatted();
    if (typeof lastUpdate !== "string") {
      throw new Error("getLastUpdateFormatted() debería retornar un string");
    }

    console.log("✓ Métodos proxy funcionan correctamente");

    await ods.close();
  }

  /**
   * Test 9: Estadísticas del caché
   */
  async testCacheStats() {
    const ods = new OptimizedDataService();
    await ods.init();

    const stats = await ods.getCacheStats();

    if (!stats) {
      throw new Error("getCacheStats() debería retornar un objeto");
    }

    if (!stats.hasOwnProperty("totalSize")) {
      throw new Error("stats debería tener propiedad totalSize");
    }

    if (!stats.hasOwnProperty("historicalRecords")) {
      throw new Error("stats debería tener propiedad historicalRecords");
    }

    if (!stats.hasOwnProperty("loadedMonths")) {
      throw new Error("stats debería tener propiedad loadedMonths");
    }

    if (!Array.isArray(stats.loadedMonths)) {
      throw new Error("loadedMonths debería ser un array");
    }

    console.log("✓ Estadísticas del caché:", stats);

    await ods.close();
  }

  /**
   * Test 10: Salud del caché
   */
  async testCacheHealth() {
    const ods = new OptimizedDataService();
    await ods.init();

    // No debería lanzar error
    await ods.checkCacheHealth();

    console.log("✓ Verificación de salud del caché correcta");

    await ods.close();
  }

  /**
   * Imprime reporte final
   */
  printReport() {
    console.log("\n" + "═".repeat(60));
    console.log("📊 REPORTE DE TESTS - OPTIMIZED DATA SERVICE");
    console.log("═".repeat(60));

    console.table(this.results);

    console.log("\n📈 Resumen:");
    console.log(`   ✅ Tests pasados: ${this.testsPassed}`);
    console.log(`   ❌ Tests fallidos: ${this.testsFailed}`);
    console.log(`   📊 Total: ${this.testsPassed + this.testsFailed}`);

    const percentage = (
      (this.testsPassed / (this.testsPassed + this.testsFailed)) *
      100
    ).toFixed(1);
    console.log(`   🎯 Tasa de éxito: ${percentage}%`);

    console.log("\n" + "═".repeat(60));

    if (this.testsFailed === 0) {
      console.log("🎉 ¡TODOS LOS TESTS PASARON!");
    } else {
      console.log("⚠️  Algunos tests fallaron, revisar detalles arriba");
    }

    console.log("═".repeat(60) + "\n");
  }
}

/**
 * Ejecuta todos los tests
 */
export async function runOptimizedTests() {
  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║   🧪 EJECUTANDO TESTS - OPTIMIZED DATA SERVICE       ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  const suite = new OptimizedDataServiceTests();

  await suite.runTest("1. Inicialización", () => suite.testInitialization());
  await suite.runTest("2. Cálculo de claves de mes", () =>
    suite.testMonthKeyCalculation()
  );
  await suite.runTest("3. Meses para rango de fechas", () =>
    suite.testMonthsForDateRange()
  );
  await suite.runTest("4. Cálculo de hash", () => suite.testDataHash());
  await suite.runTest("5. Carga de datos de HOY", () =>
    suite.testLoadTodayData()
  );
  await suite.runTest("6. Carga básica de datos", () => suite.testLoadData());
  await suite.runTest("7. Filtrado por rango de fechas", () =>
    suite.testFilterByDateRange()
  );
  await suite.runTest("8. Métodos proxy", () => suite.testProxyMethods());
  await suite.runTest("9. Estadísticas del caché", () =>
    suite.testCacheStats()
  );
  await suite.runTest("10. Salud del caché", () => suite.testCacheHealth());

  suite.printReport();

  return {
    passed: suite.testsPassed,
    failed: suite.testsFailed,
    results: suite.results,
  };
}

// Hacer disponible globalmente
if (typeof window !== "undefined") {
  window.runOptimizedTests = runOptimizedTests;
  window.OptimizedDataServiceTests = OptimizedDataServiceTests;

  console.log(`
╔══════════════════════════════════════════════════════════╗
║   🧪 OPTIMIZED DATA SERVICE TEST SUITE CARGADO           ║
╠══════════════════════════════════════════════════════════╣
║  Para ejecutar los tests:                                ║
║  > await runOptimizedTests()                              ║
║                                                           ║
║  Para usar el OptimizedDataService:                       ║
║  > import { OptimizedDataService } from                  ║
║    './services/OptimizedDataService.js'                  ║
╚══════════════════════════════════════════════════════════╝
  `);
}
