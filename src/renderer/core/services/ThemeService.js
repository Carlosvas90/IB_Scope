/**
 * ThemeService.js
 * Servicio para manejar el cambio entre temas claro y oscuro
 */

export class ThemeService {
  constructor() {
    this.currentTheme = "light";
    this.init();
  }

  /**
   * Inicializa el servicio de temas
   */
  init() {
    // Intentar obtener el tema guardado
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme) {
      this.setTheme(savedTheme);
    } else {
      // Si no hay tema guardado, usar el tema del sistema o el tema por defecto
      this.setThemeFromConfig();
    }
  }

  /**
   * Establece el tema basado en la configuración general
   */
  async setThemeFromConfig() {
    try {
      // Intentar obtener configuración
      const config = await window.api.getConfig();

      if (config && config.preferred_theme) {
        this.setTheme(config.preferred_theme);
      } else {
        // Si no hay config o no tiene preferencia, verificar preferencia del sistema
        this.setThemeFromSystem();
      }
    } catch (error) {
      console.warn(
        "Error al obtener tema de configuración, usando preferencia del sistema",
        error
      );
      this.setThemeFromSystem();
    }
  }

  /**
   * Establece el tema basado en la preferencia del sistema
   */
  setThemeFromSystem() {
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      this.setTheme("dark");
    } else {
      this.setTheme("light");
    }
  }

  /**
   * Establece el tema
   */
  setTheme(theme) {
    if (theme !== "light" && theme !== "dark") {
      theme = "light";
    }

    this.currentTheme = theme;

    // Actualizar clase en el elemento html
    if (theme === "dark") {
      document.documentElement.classList.add("dark-theme");
    } else {
      document.documentElement.classList.remove("dark-theme");
    }

    // Actualizar iconos
    const lightIcon = document.getElementById("light-icon");
    const darkIcon = document.getElementById("dark-icon");

    if (lightIcon && darkIcon) {
      if (theme === "dark") {
        lightIcon.style.display = "none";
        darkIcon.style.display = "block";
      } else {
        lightIcon.style.display = "block";
        darkIcon.style.display = "none";
      }
    }

    // Guardar en localStorage
    localStorage.setItem("theme", theme);

    // Guardar en configuración
    this.saveThemeToConfig(theme);

    // Emitir evento de cambio de tema
    if (window.ipcRenderer) {
      window.ipcRenderer.send("theme:changed", theme);
    }

    return theme;
  }

  /**
   * Guarda el tema en la configuración
   */
  async saveThemeToConfig(theme) {
    try {
      // Obtener configuración actual
      const config = await window.api.getConfig();

      // Actualizar preferencia de tema
      const updatedConfig = { ...config, preferred_theme: theme };

      // Guardar configuración
      await window.api.saveConfig(updatedConfig);
    } catch (error) {
      console.warn("Error al guardar preferencia de tema en config", error);
    }
  }

  /**
   * Alterna entre los temas claro y oscuro
   */
  toggleTheme() {
    if (this.currentTheme === "light") {
      this.setTheme("dark");
    } else {
      this.setTheme("light");
    }
  }

  /**
   * Obtiene el tema actual
   */
  getCurrentTheme() {
    return this.currentTheme;
  }
}
