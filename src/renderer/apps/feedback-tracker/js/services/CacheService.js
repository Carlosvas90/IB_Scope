export class CacheService {
  constructor(cacheKey = "feedback_tracker_data") {
    this.cacheKey = cacheKey;
    console.log(`CacheService inicializado con cacheKey: ${this.cacheKey}`);
  }

  /**
   * Carga datos desde localStorage.
   * @returns {Object|null} Los datos parseados o null si no existen o hay error.
   */
  loadData() {
    try {
      const cachedData = localStorage.getItem(this.cacheKey);
      if (!cachedData) {
        console.log("CacheService: No hay datos en caché local.");
        return null;
      }
      const data = JSON.parse(cachedData);
      console.log("CacheService: Datos cargados desde caché local.");
      return data;
    } catch (error) {
      console.warn("CacheService: Error cargando desde caché:", error);
      return null;
    }
  }

  /**
   * Guarda datos en localStorage.
   * @param {Object} data - Los datos a guardar.
   */
  saveData(data) {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(data));
      console.log("CacheService: Datos guardados en caché local.");
    } catch (error) {
      console.warn("CacheService: Error guardando en caché:", error);
    }
  }

  /**
   * Limpia los datos de la caché de localStorage.
   */
  clearData() {
    try {
      localStorage.removeItem(this.cacheKey);
      console.log("CacheService: Caché local limpiada.");
    } catch (error) {
      console.warn("CacheService: Error limpiando caché:", error);
    }
  }
}
