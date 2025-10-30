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

    // Caso especial para inventory-stats - usar permisos de feedback-tracker
    if (appName === "inventory-stats") {
      console.log(
        "Verificando permisos para inventory-stats usando feedback-tracker"
      );

      // Primero intentamos verificar si existe inventory-stats como subcategoría
      const permisosApp = this.permisos["feedback-tracker"];
      if (
        permisosApp &&
        typeof permisosApp === "object" &&
        !Array.isArray(permisosApp)
      ) {
        // Verificar si existe la subcategoría inventory-stats
        if (permisosApp["inventory-stats"]) {
          const arr = permisosApp["inventory-stats"];
          if (Array.isArray(arr)) {
            if (arr.includes("*")) return true;
            return arr.some((u) => u.toLowerCase() === user);
          }
        }

        // Si no existe la subcategoría específica, verificar acceso general
        const general = permisosApp["*"];
        if (Array.isArray(general)) {
          if (general.includes("*")) return true;
          return general.some((u) => u.toLowerCase() === user);
        }
      }
      return false;
    }

    // Casos especiales para pizarra e imanes - usar permisos de utilidades
    if (appName === "pizarra" || appName === "imanes") {
      const permisosUtilidades = this.permisos["utilidades"];
      if (
        permisosUtilidades &&
        typeof permisosUtilidades === "object" &&
        !Array.isArray(permisosUtilidades)
      ) {
        // Verificar si existe la subcategoría específica (pizarra o imanes)
        if (permisosUtilidades[appName]) {
          const arr = permisosUtilidades[appName];
          if (Array.isArray(arr)) {
            if (arr.includes("*")) return true;
            return arr.some((u) => u.toLowerCase() === user);
          }
        }

        // Si no existe la subcategoría específica, verificar acceso general a utilidades
        const general = permisosUtilidades["*"];
        if (Array.isArray(general)) {
          if (general.includes("*")) return true;
          return general.some((u) => u.toLowerCase() === user);
        }
      }
      return false;
    }

    // Verificación especial para admin-panel
    if (appName === "admin-panel") {
      return this.esAdmin();
    }

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
   * Verifica si el usuario actual es un administrador (cualquier tipo)
   * @returns {boolean}
   */
  esAdmin() {
    if (!this.permisos || !this.username) return false;
    const adminConfig = this.permisos["_admin_roles"];
    if (!adminConfig) return false;

    const user = this.username.toLowerCase();
    return (
      adminConfig.admins?.some((u) => u.toLowerCase() === user) ||
      adminConfig.master?.some((u) => u.toLowerCase() === user)
    );
  }

  /**
   * Verifica si el usuario actual es el administrador master
   * @returns {boolean}
   */
  esMasterAdmin() {
    if (!this.permisos || !this.username) return false;
    const adminConfig = this.permisos["_admin_roles"];
    if (!adminConfig || !adminConfig.master) return false;

    const user = this.username.toLowerCase();
    return adminConfig.master.some((u) => u.toLowerCase() === user);
  }

  /**
   * Obtiene el rol del usuario actual
   * @returns {string} 'master', 'admin', 'user' o 'none'
   */
  getRolUsuario() {
    if (!this.permisos || !this.username) return "none";

    if (this.esMasterAdmin()) return "master";
    if (this.esAdmin()) return "admin";

    // Verificar si tiene al menos acceso al dashboard (usuario normal)
    if (this.tienePermiso("dashboard")) return "user";

    return "none";
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
