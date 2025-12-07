/**
 * SimilarErrorsService.js
 * Servicio para detectar y manejar errores similares
 * Ruta: /src/renderer/apps/feedback-tracker/js/controllers/services/SimilarErrorsService.js
 */

export class SimilarErrorsService {
  constructor(dataController) {
    this.dataController = dataController;
  }

  /**
   * Encuentra errores similares basados en login, tipo de error y ASIN
   * @param {string} errorId - ID del error de referencia
   * @returns {Object} Objeto con información de errores similares
   */
  findSimilarErrors(errorId) {
    const allErrors = this.dataController.errors;
    const referenceError = allErrors.find((error) => error.id === errorId);

    if (!referenceError) {
      console.warn(
        `SimilarErrorsService: Error de referencia no encontrado: ${errorId}`
      );
      return {
        referenceError: null,
        similarErrors: [],
        totalCount: 0,
        pendingCount: 0,
      };
    }

    // Criterios para considerar errores similares:
    // 1. Mismo user_id (login)
    // 2. Mismo tipo de error (violation)
    // 3. Mismo ASIN
    const similarErrors = allErrors.filter(
      (error) =>
        error.id !== errorId && // Excluir el error de referencia
        error.user_id === referenceError.user_id &&
        error.violation === referenceError.violation &&
        error.asin === referenceError.asin // Agregar verificación de ASIN
    );

    // Contar errores pendientes (que no están marcados como "done")
    const pendingSimilarErrors = similarErrors.filter(
      (error) => error.feedback_status.toLowerCase() !== "done"
    );

    console.log(
      `🔍 SimilarErrorsService: Encontrados ${similarErrors.length} errores similares para ${errorId}`
    );
    console.log(
      `📋 SimilarErrorsService: ${pendingSimilarErrors.length} errores similares pendientes`
    );

    return {
      referenceError,
      similarErrors,
      pendingSimilarErrors,
      totalCount: similarErrors.length,
      pendingCount: pendingSimilarErrors.length,
    };
  }

  /**
   * Aplica el mismo feedback a todos los errores similares pendientes
   * @param {string} referenceErrorId - ID del error de referencia
   * @param {Object} feedbackData - Datos de feedback a aplicar
   * @param {string} username - Usuario que aplica el feedback
   * @returns {Promise<Object>} Resultado de la operación
   */
  async applyFeedbackToSimilarErrors(referenceErrorId, feedbackData, username) {
    try {
      const similarInfo = this.findSimilarErrors(referenceErrorId);

      if (similarInfo.pendingCount === 0) {
        console.log(
          "SimilarErrorsService: No hay errores similares pendientes para actualizar"
        );
        return {
          success: true,
          updatedCount: 0,
          message: "No hay errores similares pendientes para actualizar",
        };
      }

      console.log(
        `🔄 SimilarErrorsService: Aplicando feedback a ${similarInfo.pendingSimilarErrors.length} errores similares`
      );

      // Actualizar cada error similar pendiente
      const updatePromises = similarInfo.pendingSimilarErrors.map(
        async (error) => {
          return await this.dataController.updateErrorStatus(
            error.id,
            "done",
            username,
            feedbackData
          );
        }
      );

      // Esperar a que se completen todas las actualizaciones
      const results = await Promise.all(updatePromises);
      const successCount = results.filter((result) => result === true).length;

      console.log(
        `✅ SimilarErrorsService: ${successCount}/${similarInfo.pendingSimilarErrors.length} errores similares actualizados exitosamente`
      );

      return {
        success: successCount > 0,
        updatedCount: successCount,
        totalSimilar: similarInfo.pendingSimilarErrors.length,
        message: `Se aplicó el feedback a ${successCount} errores similares`,
      };
    } catch (error) {
      console.error(
        "SimilarErrorsService: Error al aplicar feedback a errores similares:",
        error
      );
      return {
        success: false,
        updatedCount: 0,
        message: "Error al aplicar feedback a errores similares",
        error: error.message,
      };
    }
  }

  /**
   * Genera un mensaje descriptivo sobre los errores similares encontrados
   * @param {Object} similarInfo - Información de errores similares
   * @returns {string} Mensaje descriptivo
   */
  generateSimilarErrorsMessage(similarInfo) {
    if (similarInfo.totalCount === 0) {
      return "No se encontraron errores similares";
    }

    if (similarInfo.pendingCount === 0) {
      return `${similarInfo.totalCount} errores similares (ya completados)`;
    }

    const userName = similarInfo.referenceError?.user_id || "este usuario";
    const asin = similarInfo.referenceError?.asin || "este ASIN";
    return `${similarInfo.pendingCount} errores del mismo usuario y ASIN (${asin}) se completarán automáticamente`;
  }

  /**
   * Obtiene detalles de los errores similares para mostrar en el modal
   * @param {Object} similarInfo - Información de errores similares
   * @returns {Array} Array con detalles de errores similares
   */
  getSimilarErrorsDetails(similarInfo) {
    return similarInfo.pendingSimilarErrors.map((error) => ({
      id: error.id,
      date: error.date,
      time: error.time,
      asin: error.asin,
      container: error.new_container,
      quantity: error.quantity || 1,
    }));
  }
}
