/**
 * test-today-sync.js
 * Tests para TodaySyncService
 */

import { TodaySyncService } from "./services/TodaySyncService.js";

/**
 * Mock DataService para testing
 */
class MockDataService {
  constructor() {
    this.errors = [];
    this.mockData = [];
  }

  async refresh() {
    console.log("📥 Mock: refresh() llamado");
    return true;
  }

  async loadTodayData() {
    console.log("📥 Mock: loadTodayData() llamado");
    return this.mockData;
  }

  setMockData(data) {
    this.mockData = data;
  }
}

/**
 * Suite de tests para TodaySyncService
 */
export class TodaySyncTests {
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
    const mockDataService = new MockDataService();
    const syncService = new TodaySyncService(mockDataService, 5000);

    if (syncService.isPolling) {
      throw new Error("No debería estar polling al inicializar");
    }

    if (syncService.pollingInterval !== 5000) {
      throw new Error(`Intervalo incorrecto: ${syncService.pollingInterval}`);
    }

    if (!Array.isArray(syncService.changeListeners)) {
      throw new Error("changeListeners no es un array");
    }

    console.log("✓ Servicio inicializado correctamente");
  }

  /**
   * Test 2: Start/Stop Polling
   */
  async testStartStop() {
    const mockDataService = new MockDataService();
    const syncService = new TodaySyncService(mockDataService, 5000);

    // Iniciar
    syncService.start();
    if (!syncService.isPolling) {
      throw new Error("Polling debería estar activo después de start()");
    }

    if (!syncService.pollingTimer) {
      throw new Error("pollingTimer no está definido");
    }

    // Detener
    syncService.stop();
    if (syncService.isPolling) {
      throw new Error("Polling no debería estar activo después de stop()");
    }

    if (syncService.pollingTimer) {
      throw new Error("pollingTimer debería ser null");
    }

    console.log("✓ Start/Stop funcionan correctamente");
  }

  /**
   * Test 3: Cálculo de hash
   */
  async testHashCalculation() {
    const mockDataService = new MockDataService();
    const syncService = new TodaySyncService(mockDataService, 5000);

    const data1 = [{ id: 1, name: "Test" }];
    const data2 = [{ id: 1, name: "Test" }];
    const data3 = [{ id: 2, name: "Test" }];

    const hash1 = await syncService.calculateHash(data1);
    const hash2 = await syncService.calculateHash(data2);
    const hash3 = await syncService.calculateHash(data3);

    // Mismo contenido = mismo hash
    if (hash1 !== hash2) {
      throw new Error("Hashes deberían ser iguales para mismo contenido");
    }

    // Diferente contenido = diferente hash
    if (hash1 === hash3) {
      throw new Error(
        "Hashes deberían ser diferentes para diferente contenido"
      );
    }

    // Formato SHA-256 (64 caracteres hex)
    if (hash1.length !== 64) {
      throw new Error(
        `Hash debería tener 64 caracteres, tiene: ${hash1.length}`
      );
    }

    console.log("✓ Cálculo de hash correcto");
  }

  /**
   * Test 4: Registro de listeners
   */
  async testListeners() {
    const mockDataService = new MockDataService();
    const syncService = new TodaySyncService(mockDataService, 5000);

    let callCount = 0;
    const listener1 = (data) => {
      callCount++;
    };
    const listener2 = (data) => {
      callCount++;
    };

    // Registrar listeners
    const unsubscribe1 = syncService.onChange(listener1);
    const unsubscribe2 = syncService.onChange(listener2);

    if (syncService.changeListeners.length !== 2) {
      throw new Error(
        `Debería haber 2 listeners, hay: ${syncService.changeListeners.length}`
      );
    }

    // Notificar
    syncService.notifyChangeListeners([]);

    if (callCount !== 2) {
      throw new Error(`Debería haber 2 llamadas, hay: ${callCount}`);
    }

    // Remover un listener
    unsubscribe1();

    if (syncService.changeListeners.length !== 1) {
      throw new Error(
        `Debería haber 1 listener, hay: ${syncService.changeListeners.length}`
      );
    }

    // Notificar de nuevo
    callCount = 0;
    syncService.notifyChangeListeners([]);

    if (callCount !== 1) {
      throw new Error(`Debería haber 1 llamada, hay: ${callCount}`);
    }

    console.log("✓ Sistema de listeners funciona correctamente");
  }

  /**
   * Test 5: Detección de cambios
   */
  async testChangeDetection() {
    const mockDataService = new MockDataService();
    const syncService = new TodaySyncService(mockDataService, 5000);

    // Configurar para no auto-refresh
    syncService.autoRefresh = false;
    syncService.notifyUsers = false;

    // Mock data inicial
    const data1 = [{ id: 1, error: "Error A" }];
    mockDataService.setMockData(data1);

    // Primera verificación (establecer hash inicial)
    await syncService.checkForChanges();

    if (syncService.lastHash === null) {
      throw new Error("lastHash no debería ser null después del primer check");
    }

    if (syncService.stats.changesDetected !== 0) {
      throw new Error("No debería haber cambios detectados en el primer check");
    }

    // Segunda verificación con mismos datos (sin cambios)
    await syncService.checkForChanges();

    if (syncService.stats.changesDetected !== 0) {
      throw new Error("No debería haber cambios si los datos son iguales");
    }

    // Tercera verificación con datos diferentes (con cambios)
    const data2 = [{ id: 1, error: "Error B" }]; // Cambió el error
    mockDataService.setMockData(data2);

    await syncService.checkForChanges();

    if (syncService.stats.changesDetected !== 1) {
      throw new Error(
        `Debería haber 1 cambio detectado, hay: ${syncService.stats.changesDetected}`
      );
    }

    console.log("✓ Detección de cambios funciona correctamente");
  }

  /**
   * Test 6: Configuración
   */
  async testConfiguration() {
    const mockDataService = new MockDataService();
    const syncService = new TodaySyncService(mockDataService, 5000);

    // Valores por defecto
    if (!syncService.autoRefresh) {
      throw new Error("autoRefresh debería ser true por defecto");
    }

    if (!syncService.notifyUsers) {
      throw new Error("notifyUsers debería ser true por defecto");
    }

    // Cambiar configuración
    syncService.configure({
      autoRefresh: false,
      notifyUsers: false,
      pollingInterval: 10000,
    });

    if (syncService.autoRefresh) {
      throw new Error("autoRefresh debería ser false");
    }

    if (syncService.notifyUsers) {
      throw new Error("notifyUsers debería ser false");
    }

    if (syncService.pollingInterval !== 10000) {
      throw new Error(
        `pollingInterval debería ser 10000, es: ${syncService.pollingInterval}`
      );
    }

    console.log("✓ Configuración funciona correctamente");
  }

  /**
   * Test 7: Estadísticas
   */
  async testStats() {
    const mockDataService = new MockDataService();
    const syncService = new TodaySyncService(mockDataService, 5000);

    // Valores iniciales
    const initialStats = syncService.getStats();

    if (initialStats.checksCount !== 0) {
      throw new Error("checksCount debería ser 0 inicialmente");
    }

    if (initialStats.changesDetected !== 0) {
      throw new Error("changesDetected debería ser 0 inicialmente");
    }

    // Hacer algunos checks
    mockDataService.setMockData([{ id: 1 }]);
    await syncService.checkForChanges(); // Check 1
    await syncService.checkForChanges(); // Check 2

    const stats = syncService.getStats();

    if (stats.checksCount !== 2) {
      throw new Error(`checksCount debería ser 2, es: ${stats.checksCount}`);
    }

    // Reset stats
    syncService.resetStats();
    const resetStats = syncService.getStats();

    if (resetStats.checksCount !== 0) {
      throw new Error("checksCount debería ser 0 después de reset");
    }

    console.log("✓ Estadísticas funcionan correctamente");
  }

  /**
   * Test 8: Destroy
   */
  async testDestroy() {
    const mockDataService = new MockDataService();
    const syncService = new TodaySyncService(mockDataService, 5000);

    // Iniciar polling y registrar listener
    syncService.start();
    syncService.onChange(() => {});

    if (syncService.changeListeners.length !== 1) {
      throw new Error("Debería haber 1 listener");
    }

    // Destruir
    syncService.destroy();

    if (syncService.isPolling) {
      throw new Error("Polling debería estar detenido");
    }

    if (syncService.changeListeners.length !== 0) {
      throw new Error("Listeners deberían estar vacíos");
    }

    if (syncService.lastHash !== null) {
      throw new Error("lastHash debería ser null");
    }

    console.log("✓ Destroy funciona correctamente");
  }

  /**
   * Imprime reporte final
   */
  printReport() {
    console.log("\n" + "═".repeat(60));
    console.log("📊 REPORTE DE TESTS - TODAY SYNC SERVICE");
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
export async function runTodaySyncTests() {
  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║   🧪 EJECUTANDO TESTS - TODAY SYNC SERVICE           ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  const suite = new TodaySyncTests();

  await suite.runTest("1. Inicialización", () => suite.testInitialization());
  await suite.runTest("2. Start/Stop Polling", () => suite.testStartStop());
  await suite.runTest("3. Cálculo de hash", () => suite.testHashCalculation());
  await suite.runTest("4. Registro de listeners", () => suite.testListeners());
  await suite.runTest("5. Detección de cambios", () =>
    suite.testChangeDetection()
  );
  await suite.runTest("6. Configuración", () => suite.testConfiguration());
  await suite.runTest("7. Estadísticas", () => suite.testStats());
  await suite.runTest("8. Destroy", () => suite.testDestroy());

  suite.printReport();

  return {
    passed: suite.testsPassed,
    failed: suite.testsFailed,
    results: suite.results,
  };
}

// Hacer disponible globalmente
if (typeof window !== "undefined") {
  window.runTodaySyncTests = runTodaySyncTests;
  window.TodaySyncTests = TodaySyncTests;

  console.log(`
╔══════════════════════════════════════════════════════════╗
║   🧪 TODAY SYNC TEST SUITE CARGADO                       ║
╠══════════════════════════════════════════════════════════╣
║  Para ejecutar los tests:                                ║
║  > await runTodaySyncTests()                              ║
║                                                           ║
║  Para usar el TodaySyncService:                           ║
║  > import { TodaySyncService } from                      ║
║    './services/TodaySyncService.js'                      ║
╚══════════════════════════════════════════════════════════╝
  `);
}
