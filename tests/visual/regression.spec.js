const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

// Directorio para las capturas de referencia
const baselineDir = path.join(__dirname, "baseline");
// Directorio para las capturas actuales
const currentDir = path.join(__dirname, "screenshots");

// Asegurarse de que existan los directorios
if (!fs.existsSync(baselineDir)) {
  fs.mkdirSync(baselineDir, { recursive: true });
}
if (!fs.existsSync(currentDir)) {
  fs.mkdirSync(currentDir, { recursive: true });
}

test.describe("Pruebas de Regresión Visual", () => {
  test.beforeEach(async ({ page }) => {
    // Navegar a la página de prueba usando file://
    const testFilePath = path.join(
      __dirname,
      "../../src/renderer/css/themes/test-variables.html"
    );
    await page.goto(`file://${testFilePath}`);
  });

  test("Comparar Tema Claro", async ({ page }) => {
    // Capturar el tema claro actual
    const screenshot = await page.screenshot();

    // Guardar la captura actual
    const currentPath = path.join(currentDir, "theme-light-current.png");
    fs.writeFileSync(currentPath, screenshot);

    // Si existe una captura de referencia, comparar
    const baselinePath = path.join(baselineDir, "theme-light-baseline.png");
    if (fs.existsSync(baselinePath)) {
      const baseline = fs.readFileSync(baselinePath);
      expect(screenshot).toEqual(baseline);
    } else {
      // Si no existe, crear la línea base
      fs.writeFileSync(baselinePath, screenshot);
      console.log("✅ Creada nueva línea base para tema claro");
    }
  });

  test("Comparar Tema Oscuro", async ({ page }) => {
    // Activar tema oscuro
    await page.click(".theme-toggle");

    // Capturar el tema oscuro actual
    const screenshot = await page.screenshot();

    // Guardar la captura actual
    const currentPath = path.join(currentDir, "theme-dark-current.png");
    fs.writeFileSync(currentPath, screenshot);

    // Si existe una captura de referencia, comparar
    const baselinePath = path.join(baselineDir, "theme-dark-baseline.png");
    if (fs.existsSync(baselinePath)) {
      const baseline = fs.readFileSync(baselinePath);
      expect(screenshot).toEqual(baseline);
    } else {
      // Si no existe, crear la línea base
      fs.writeFileSync(baselinePath, screenshot);
      console.log("✅ Creada nueva línea base para tema oscuro");
    }
  });

  test("Comparar Componentes", async ({ page }) => {
    // Capturar cada componente
    const components = await page.locator(".component-preview").all();

    for (let i = 0; i < components.length; i++) {
      const screenshot = await components[i].screenshot();

      // Guardar la captura actual
      const currentPath = path.join(currentDir, `component-${i}-current.png`);
      fs.writeFileSync(currentPath, screenshot);

      // Si existe una captura de referencia, comparar
      const baselinePath = path.join(
        baselineDir,
        `component-${i}-baseline.png`
      );
      if (fs.existsSync(baselinePath)) {
        const baseline = fs.readFileSync(baselinePath);
        expect(screenshot).toEqual(baseline);
      } else {
        // Si no existe, crear la línea base
        fs.writeFileSync(baselinePath, screenshot);
        console.log(`✅ Creada nueva línea base para componente ${i}`);
      }
    }
  });
});
