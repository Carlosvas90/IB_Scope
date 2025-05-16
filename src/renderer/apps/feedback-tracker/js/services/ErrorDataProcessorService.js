export class ErrorDataProcessorService {
  constructor() {
    console.log("ErrorDataProcessorService inicializado");
  }

  /**
   * Normaliza los datos de errores directamente en el array proporcionado.
   * @param {Array<Object>} errorsToNormalize - El array de errores a normalizar.
   */
  normalize(errorsToNormalize) {
    if (!Array.isArray(errorsToNormalize)) {
      console.warn(
        "ErrorDataProcessorService.normalize: errorsToNormalize no es un array."
      );
      return;
    }
    errorsToNormalize.forEach((error) => {
      error.feedback_status = (
        error.feedback_status || "pending"
      ).toLowerCase();
      if (!Array.isArray(error.occurrences)) {
        error.occurrences = [{ date: error.date, time: error.time }];
      }
      error.quantity = error.quantity || error.occurrences.length || 1;
      error.feedback_notified = error.feedback_notified || false;
      error.feedback_user = error.feedback_user || "";
      error.times_notified = error.times_notified || 0;
      if (!error.feedback_comment) {
        error.feedback_comment = "";
      }
    });
  }

  /**
   * Crea datos de ejemplo para desarrollo.
   * @returns {Array<Object>} Un nuevo array con datos de ejemplo.
   */
  generateSampleData() {
    console.log(
      "ErrorDataProcessorService: Creando datos de ejemplo para desarrollo"
    );
    return [
      {
        id: "1",
        user_id: "usuario1",
        date: "2025/04/19",
        time: "13:30:10",
        asin: "B0CMZ8D9VD",
        bin_id: "P-3-C214A542",
        violation: "Articulo <70cm en Barrel",
        feedback_status: "pending",
        quantity: 4,
        occurrences: [
          { date: "2025/04/19", time: "13:29:43" },
          { date: "2025/04/19", time: "13:30:10" },
        ],
        feedback_notified: false,
        feedback_user: "",
        times_notified: 0,
        feedback_comment: "",
      },
      {
        id: "2",
        user_id: "usuario2",
        date: "2025/04/19",
        time: "14:25:39",
        asin: "B0CMZ8D9VD",
        bin_id: "P-3-C286A472",
        violation: "Articulo <70cm en Barrel",
        feedback_status: "done",
        quantity: 2,
        occurrences: [
          { date: "2025/04/19", time: "14:24:29" },
          { date: "2025/04/19", time: "14:25:39" },
        ],
        feedback_notified: true,
        feedback_user: "admin",
        feedback_date: "2025/04/30",
        feedback_comment:
          "Desconocimiento (no sabía): Usuario nuevo en el área - admin",
        times_notified: 1,
      },
    ];
  }

  /**
   * Filtra los errores por estado y los ordena por hora (ascendente).
   * @param {Array<Object>} allErrors - El array completo de errores.
   * @param {string} statusFilter - Filtro de estado ("all", "pending", "done").
   * @returns {Array<Object>} Un nuevo array con errores filtrados y ordenados.
   */
  filterAndSort(allErrors, statusFilter = "all") {
    let result;
    if (statusFilter === "all") {
      result = [...allErrors]; // Crear una copia para no modificar el original si solo se va a ordenar
    } else {
      result = allErrors.filter((error) =>
        statusFilter === "done"
          ? error.feedback_status.toLowerCase() === "done"
          : error.feedback_status.toLowerCase() !== "done"
      );
    }

    return [...result].sort((a, b) => {
      const timeA = new Date(`${a.date || ""} ${a.time || ""}`);
      const timeB = new Date(`${b.date || ""} ${b.time || ""}`);
      return timeA - timeB;
    });
  }

  /**
   * Devuelve estadísticas sobre los errores.
   * @param {Array<Object>} allErrors - El array completo de errores.
   * @returns {Object} Un objeto con las estadísticas.
   */
  calculateStatistics(allErrors) {
    const stats = {
      total: allErrors.length,
      pending: 0,
      done: 0,
      byUser: {},
      byViolation: {},
      byBin: {},
    };

    for (let i = 0; i < allErrors.length; i++) {
      const error = allErrors[i];
      if (error.feedback_status.toLowerCase() === "done") {
        stats.done++;
      } else {
        stats.pending++;
      }
      const userId = error.user_id;
      stats.byUser[userId] = (stats.byUser[userId] || 0) + 1;
      const violation = error.violation;
      stats.byViolation[violation] = (stats.byViolation[violation] || 0) + 1;
      const binId = error.bin_id;
      stats.byBin[binId] = (stats.byBin[binId] || 0) + 1;
    }
    return stats;
  }

  /**
   * Actualiza el estado de un error en el array proporcionado.
   * @param {Array<Object>} errorsList - El array de errores a modificar.
   * @param {string} errorId - ID del error a actualizar.
   * @param {string} newStatus - Nuevo estado (done/pending).
   * @param {string} username - Nombre del usuario que realiza el cambio.
   * @param {string} [feedbackComment] - Comentario opcional de feedback.
   * @returns {boolean} True si el error fue encontrado y actualizado, false en caso contrario.
   */
  updateDetails(
    errorsList,
    errorId,
    newStatus,
    username,
    feedbackComment = null
  ) {
    const errorIndex = errorsList.findIndex((error) => error.id === errorId);

    if (errorIndex === -1) {
      console.warn(
        `ErrorDataProcessorService.updateDetails: Error no encontrado: ${errorId}`
      );
      return false;
    }

    errorsList[errorIndex].feedback_status = newStatus.toLowerCase();

    if (newStatus.toLowerCase() === "done") {
      errorsList[errorIndex].feedback_date = new Date()
        .toISOString()
        .split("T")[0];
      errorsList[errorIndex].feedback_user = username;
      errorsList[errorIndex].feedback_notified = false; // Reiniciar notificación para este estado
      if (feedbackComment) {
        errorsList[
          errorIndex
        ].feedback_comment = `${feedbackComment} - ${username}`;
      } else {
        // Si no hay nuevo comentario y el estado es 'done', podríamos querer limpiar el comentario anterior
        // o mantenerlo. El comportamiento original parece construirlo.
        // Por ahora, si no hay feedbackComment, no se modifica el existente a menos que esté vacío.
        // errorsList[errorIndex].feedback_comment = errorsList[errorIndex].feedback_comment || `Completado por ${username}`;
      }
    } else {
      // pending u otro estado
      errorsList[errorIndex].feedback_date = null;
      errorsList[errorIndex].feedback_user = "";
      errorsList[errorIndex].feedback_comment = ""; // Limpiar comentario si vuelve a pendiente
    }
    return true;
  }
}
