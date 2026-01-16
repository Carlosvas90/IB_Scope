// src/renderer/core/services/MidwayService.js
// Servicio para gestión de autenticación con Midway
// Puede ser usado desde cualquier app que requiera validar/refrescar cookies

/**
 * MidwayService - Gestión de autenticación con Midway
 * 
 * Uso básico:
 * ```javascript
 * const midway = window.MidwayService;
 * 
 * // Verificar y actualizar cookie si es necesario
 * const result = await midway.ensureValidCookie();
 * if (result.needsAuth) {
 *   // Mostrar UI indicando que se requiere autenticación
 *   await midway.authenticate();
 * }
 * ```
 */
class MidwayService {
  constructor() {
    this.isAuthenticating = false;
    this.lastValidation = null;
    console.log("[MidwayService] Servicio inicializado");
  }

  /**
   * Verifica si la cookie remota de Midway es válida
   * @returns {Promise<object>} { valid, needsRefresh, hoursRemaining, message }
   */
  async validateRemoteCookie() {
    if (!window.api || !window.api.midwayValidateRemote) {
      console.warn("[MidwayService] API no disponible");
      return { valid: false, error: "API no disponible" };
    }

    try {
      const result = await window.api.midwayValidateRemote();
      console.log("[MidwayService] Validación remota:", result);
      this.lastValidation = { ...result, timestamp: Date.now() };
      return result;
    } catch (error) {
      console.error("[MidwayService] Error validando cookie remota:", error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Verifica si la cookie local de Midway es válida
   * @returns {Promise<object>} { valid, needsRefresh, hoursRemaining, message }
   */
  async validateLocalCookie() {
    if (!window.api || !window.api.midwayValidateLocal) {
      console.warn("[MidwayService] API no disponible");
      return { valid: false, error: "API no disponible" };
    }

    try {
      const result = await window.api.midwayValidateLocal();
      console.log("[MidwayService] Validación local:", result);
      return result;
    } catch (error) {
      console.error("[MidwayService] Error validando cookie local:", error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Copia la cookie local al servidor remoto
   * @returns {Promise<object>} { success, error }
   */
  async copyToRemote() {
    if (!window.api || !window.api.midwayCopyToRemote) {
      console.warn("[MidwayService] API no disponible");
      return { success: false, error: "API no disponible" };
    }

    try {
      const result = await window.api.midwayCopyToRemote();
      console.log("[MidwayService] Copia a remoto:", result);
      return result;
    } catch (error) {
      console.error("[MidwayService] Error copiando cookie:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Inicia el proceso de autenticación con Midway
   * Abre una ventana CMD para que el usuario ingrese su PIN
   * @returns {Promise<object>} { success, message, hoursRemaining }
   */
  async authenticate() {
    if (this.isAuthenticating) {
      console.warn("[MidwayService] Ya hay una autenticación en progreso");
      return { success: false, error: "Autenticación ya en progreso" };
    }

    if (!window.api || !window.api.midwayAuthenticate) {
      console.warn("[MidwayService] API no disponible");
      return { success: false, error: "API no disponible" };
    }

    try {
      this.isAuthenticating = true;
      console.log("[MidwayService] Iniciando autenticación...");
      
      const result = await window.api.midwayAuthenticate();
      console.log("[MidwayService] Resultado autenticación:", result);
      
      return result;
    } catch (error) {
      console.error("[MidwayService] Error en autenticación:", error);
      return { success: false, error: error.message };
    } finally {
      this.isAuthenticating = false;
    }
  }

  /**
   * Flujo completo para asegurar que hay una cookie válida disponible
   * 1. Verifica cookie remota
   * 2. Si es inválida, verifica cookie local
   * 3. Si la local es válida, la copia al remoto
   * 4. Si la local es inválida, indica que se requiere autenticación
   * 
   * @returns {Promise<object>} { success, action, message, needsAuth, hoursRemaining }
   */
  async ensureValidCookie() {
    if (!window.api || !window.api.midwayEnsureValid) {
      console.warn("[MidwayService] API no disponible");
      return { success: false, needsAuth: true, error: "API no disponible" };
    }

    try {
      console.log("[MidwayService] Verificando validez de cookie...");
      const result = await window.api.midwayEnsureValid();
      console.log("[MidwayService] Resultado ensureValid:", result);
      
      this.lastValidation = { ...result, timestamp: Date.now() };
      return result;
    } catch (error) {
      console.error("[MidwayService] Error en ensureValidCookie:", error);
      return { success: false, needsAuth: true, error: error.message };
    }
  }

  /**
   * Flujo completo con autenticación automática si es necesario
   * Útil para apps que requieren cookie válida antes de ejecutar
   * 
   * @param {object} options - Opciones de configuración
   * @param {function} options.onAuthRequired - Callback cuando se requiere autenticación
   * @param {function} options.onAuthComplete - Callback cuando la autenticación termina
   * @param {function} options.onError - Callback en caso de error
   * @returns {Promise<object>} { success, hoursRemaining, error }
   */
  async ensureValidWithAuth(options = {}) {
    const { onAuthRequired, onAuthComplete, onError } = options;

    try {
      // Paso 1: Verificar estado actual
      const validation = await this.ensureValidCookie();

      if (validation.success) {
        // Cookie válida, no se necesita hacer nada
        return { success: true, hoursRemaining: validation.hoursRemaining };
      }

      if (!validation.needsAuth) {
        // Error que no se resuelve con autenticación
        if (onError) onError(validation.error || "Error desconocido");
        return { success: false, error: validation.error };
      }

      // Paso 2: Se requiere autenticación
      console.log("[MidwayService] Se requiere autenticación con Midway");
      if (onAuthRequired) onAuthRequired();

      // Paso 3: Ejecutar autenticación
      const authResult = await this.authenticate();

      if (!authResult.success) {
        if (onError) onError(authResult.error);
        return { success: false, error: authResult.error };
      }

      // Paso 4: Copiar cookie local al remoto
      const copyResult = await this.copyToRemote();

      if (!copyResult.success) {
        if (onError) onError(copyResult.error);
        return { success: false, error: copyResult.error };
      }

      // Paso 5: Verificar que todo está correcto
      const finalValidation = await this.validateRemoteCookie();

      if (onAuthComplete) onAuthComplete(finalValidation);

      return { 
        success: finalValidation.valid, 
        hoursRemaining: finalValidation.hoursRemaining 
      };

    } catch (error) {
      console.error("[MidwayService] Error en ensureValidWithAuth:", error);
      if (onError) onError(error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene la última validación realizada (cache)
   * @returns {object|null} Última validación o null
   */
  getLastValidation() {
    return this.lastValidation;
  }

  /**
   * Formatea las horas restantes en un string legible
   * @param {number} hours - Horas restantes
   * @returns {string} String formateado (ej: "2h 30m")
   */
  formatTimeRemaining(hours) {
    if (!hours || hours <= 0) return "Expirada";
    
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }
}

// Crear instancia global
const midwayService = new MidwayService();

// Exponer globalmente
window.MidwayService = midwayService;

// Exportar para uso como módulo
if (typeof module !== 'undefined' && module.exports) {
  module.exports = midwayService;
}
