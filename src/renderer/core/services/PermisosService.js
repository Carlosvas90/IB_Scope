// PermisosService.js
// Servicio para gestionar permisos de apps y usuario actual

class PermisosService {
  constructor() {
    this.username = null;
    this.permisos = null;
    this.isReady = false;
  }

  async init() {
    this.username = await window.api.getUsername();
    this.permisos = await window.api.getPermisos();
    this.isReady = true;
  }

  /**
   * Comprueba si el usuario tiene permiso para acceder a una app o submenú
   * @param {string} appName
   * @param {string|null} viewName
   * @returns {boolean}
   */
  tienePermiso(appName, viewName = null) {
    if (!this.permisos || !this.username) return false;
    const user = this.username.toLowerCase();
    const permisosApp = this.permisos[appName];
    if (!permisosApp) return false;
    // Permiso por submenú/vista (objeto)
    if (typeof permisosApp === "object" && !Array.isArray(permisosApp)) {
      const general = permisosApp["*"];
      // Si no se especifica viewName, solo comprobamos el general
      if (!viewName) {
        if (Array.isArray(general)) {
          if (general.includes("*")) return true;
          return general.some((u) => u.toLowerCase() === user);
        }
        return false;
      }
      // Si hay permisos específicos para la vista
      if (permisosApp[viewName]) {
        const arr = permisosApp[viewName];
        if (Array.isArray(arr)) {
          if (arr.includes("*")) return true;
          return arr.some((u) => u.toLowerCase() === user);
        }
        return false;
      }
      // Si no hay permisos específicos para la vista, se permite por el general
      if (Array.isArray(general)) {
        if (general.includes("*")) return true;
        return general.some((u) => u.toLowerCase() === user);
      }
      return false;
    }
    // Permiso por app (array)
    if (Array.isArray(permisosApp)) {
      if (permisosApp.includes("*")) return true;
      return permisosApp.some((u) => u.toLowerCase() === user);
    }
    return false;
  }

  /**
   * Devuelve el usuario actual
   */
  getUsuario() {
    return this.username;
  }

  /**
   * Devuelve el objeto de permisos
   */
  getPermisos() {
    return this.permisos;
  }
}

// Instancia global
export const permisosService = new PermisosService();
