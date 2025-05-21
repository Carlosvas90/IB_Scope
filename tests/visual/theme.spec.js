const { test, expect } = require("@playwright/test");

test.describe("Sistema de Temas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/themes/test-variables.html");
  });

  test("Tema Claro - Colores Base", async ({ page }) => {
    // Verificar colores base en tema claro
    const colorGrid = await page.locator(".color-grid").first();
    await expect(colorGrid).toHaveScreenshot("theme-light-colors.png");
  });

  test("Tema Oscuro - Colores Base", async ({ page }) => {
    // Activar tema oscuro
    await page.click(".theme-toggle");

    // Verificar colores base en tema oscuro
    const colorGrid = await page.locator(".color-grid").first();
    await expect(colorGrid).toHaveScreenshot("theme-dark-colors.png");
  });

  test("Componentes - Tema Claro", async ({ page }) => {
    // Verificar componentes en tema claro
    const components = await page.locator(".component-preview");
    await expect(components).toHaveScreenshot("theme-light-components.png");
  });

  test("Componentes - Tema Oscuro", async ({ page }) => {
    // Activar tema oscuro
    await page.click(".theme-toggle");

    // Verificar componentes en tema oscuro
    const components = await page.locator(".component-preview");
    await expect(components).toHaveScreenshot("theme-dark-components.png");
  });

  test("Transición de Temas", async ({ page }) => {
    // Verificar transición suave entre temas
    const body = await page.locator("body");

    // Capturar tema claro
    await expect(body).toHaveScreenshot("theme-transition-light.png");

    // Cambiar a tema oscuro
    await page.click(".theme-toggle");
    await expect(body).toHaveScreenshot("theme-transition-dark.png");

    // Volver a tema claro
    await page.click(".theme-toggle");
    await expect(body).toHaveScreenshot("theme-transition-light-again.png");
  });
});
