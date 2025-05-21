const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

async function runTests() {
  console.log("🚀 Iniciando pruebas visuales...");

  // Crear directorio para screenshots si no existe
  const screenshotsDir = path.join(__dirname, "screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navegar a la página de prueba con la ruta corregida
    const testFilePath = path.join(
      __dirname,
      "../../src/renderer/css/themes/test-variables.html"
    );
    console.log("📄 Ruta del archivo de prueba:", testFilePath);

    await page.goto(`file://${testFilePath}`);

    // Ejecutar pruebas de tema
    console.log("📸 Capturando tema claro...");
    await page.screenshot({
      path: path.join(screenshotsDir, "theme-light.png"),
    });

    console.log("🌙 Cambiando a tema oscuro...");
    await page.click(".theme-toggle");
    await page.screenshot({
      path: path.join(screenshotsDir, "theme-dark.png"),
    });

    // Ejecutar pruebas de componentes
    console.log("🔍 Probando componentes...");
    const components = await page.locator(".component-preview").all();
    for (let i = 0; i < components.length; i++) {
      await components[i].screenshot({
        path: path.join(screenshotsDir, `component-${i}.png`),
      });
    }

    console.log("✅ Pruebas completadas exitosamente");
  } catch (error) {
    console.error("❌ Error durante las pruebas:", error);
  } finally {
    await browser.close();
  }
}

runTests();
