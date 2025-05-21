const { test, expect } = require("@playwright/test");

test.describe("Componentes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/themes/test-variables.html");
  });

  test("Botones - Tema Claro", async ({ page }) => {
    const buttons = await page.locator(".button");
    await expect(buttons).toHaveScreenshot("buttons-light.png");
  });

  test("Botones - Tema Oscuro", async ({ page }) => {
    await page.click(".theme-toggle");
    const buttons = await page.locator(".button");
    await expect(buttons).toHaveScreenshot("buttons-dark.png");
  });

  test("Estados - Tema Claro", async ({ page }) => {
    const statusBadges = await page.locator(".status-badge");
    await expect(statusBadges).toHaveScreenshot("status-light.png");
  });

  test("Estados - Tema Oscuro", async ({ page }) => {
    await page.click(".theme-toggle");
    const statusBadges = await page.locator(".status-badge");
    await expect(statusBadges).toHaveScreenshot("status-dark.png");
  });

  test("Tipografía - Tema Claro", async ({ page }) => {
    const typography = await page.locator(".component-preview").last();
    await expect(typography).toHaveScreenshot("typography-light.png");
  });

  test("Tipografía - Tema Oscuro", async ({ page }) => {
    await page.click(".theme-toggle");
    const typography = await page.locator(".component-preview").last();
    await expect(typography).toHaveScreenshot("typography-dark.png");
  });

  test("Interacciones - Hover", async ({ page }) => {
    // Probar hover en botones
    const button = await page.locator(".button-primary").first();
    await button.hover();
    await expect(button).toHaveScreenshot("button-hover.png");
  });

  test("Interacciones - Estados", async ({ page }) => {
    // Probar diferentes estados de los componentes
    const statusBadges = await page.locator(".status-badge");

    // Verificar estados pendiente y completado
    await expect(statusBadges).toHaveScreenshot("status-states.png");
  });
});
