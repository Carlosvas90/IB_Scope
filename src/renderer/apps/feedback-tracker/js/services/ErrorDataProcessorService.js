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

      // Nuevos campos separados
      error.feedback_motive = error.feedback_motive || "";
      error.feedback_comment = error.feedback_comment || "";

      // Mantener compatibilidad con feedback_comment antiguo si existe
      if (
        !error.feedback_motive &&
        !error.feedback_comment &&
        error.feedback_comment_old
      ) {
        // Si existe el campo antiguo, intentar separarlo
        const oldComment = error.feedback_comment_old;
        if (oldComment.includes(":")) {
          const parts = oldComment.split(":");
          error.feedback_motive = parts[0].trim();
          error.feedback_comment = parts.slice(1).join(":").trim();
        } else {
          error.feedback_motive = oldComment;
          error.feedback_comment = "";
        }
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
        old_container: "tspt0000369",
        new_container: "P-3-C214A542",
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
        old_container: "tspt0000533",
        new_container: "P-3-C286A472",
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
        feedback_motive: "Desconocimiento (no sabía)",
        feedback_comment: "Usuario nuevo en el área",
        times_notified: 1,
      },
    ];
  }

  /**
   * Determina si una hora está dentro del rango de un turno específico
   * @param {string} timeString - Hora en formato HH:MM:SS
   * @param {string} shiftType - Tipo de turno ("day", "early", "late")
   * @returns {boolean} True si la hora está en el turno especificado
   */
  isTimeInShift(timeString, shiftType) {
    if (!timeString || typeof timeString !== "string") return false;

    // Extraer solo la parte de la hora (HH:MM) para comparar
    const timeParts = timeString.split(":");
    if (timeParts.length < 2) return false;

    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);

    // Si no se pudo parsear la hora correctamente
    if (isNaN(hour) || isNaN(minute)) return false;

    // Convertir a minutos desde medianoche para comparación más fácil
    const timeInMinutes = hour * 60 + minute;

    switch (shiftType.toLowerCase()) {
      case "day":
        // Day es cualquier hora (siempre retorna true)
        return true;

      case "early":
        // Early es desde las 05:00 hasta las 15:29
        const earlyStart = 5 * 60; // 05:00
        const earlyEnd = 15 * 60 + 29; // 15:29
        return timeInMinutes >= earlyStart && timeInMinutes <= earlyEnd;

      case "late":
        // Late es desde las 15:30 hasta las 02:00 del día siguiente
        const lateStart = 15 * 60 + 30; // 15:30
        const lateEnd = 2 * 60; // 02:00

        // Si la hora está entre 15:30 y 23:59 o entre 00:00 y 02:00
        return timeInMinutes >= lateStart || timeInMinutes <= lateEnd;

      default:
        return false;
    }
  }

  /**
   * Filtra los errores por estado y turno, y los ordena por hora (descendente - más recientes primero).
   * @param {Array<Object>} allErrors - El array completo de errores.
   * @param {string} statusFilter - Filtro de estado ("all", "pending", "done").
   * @param {string} shiftFilter - Filtro de turno ("day", "early", "late").
   * @returns {Array<Object>} Un nuevo array con errores filtrados y ordenados.
   */
  filterAndSort(allErrors, statusFilter = "all", shiftFilter = "day") {
    // Primero filtrar por estado
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

    // Luego filtrar por turno si no es "day" (que muestra todos)
    if (shiftFilter !== "day") {
      result = result.filter((error) =>
        this.isTimeInShift(error.time, shiftFilter)
      );
    }

    // Finalmente ordenar por fecha y hora (descendente - más recientes primero)
    return [...result].sort((a, b) => {
      const timeA = new Date(`${a.date || ""} ${a.time || ""}`);
      const timeB = new Date(`${b.date || ""} ${b.time || ""}`);
      return timeB - timeA; // Invertido: timeB - timeA para orden descendente
    });
  }

  /**
   * Devuelve estadísticas sobre los errores.
   * @param {Array<Object>} allErrors - El array completo de errores.
   * @returns {Object} Un objeto con las estadísticas.
   */
  calculateStatistics(allErrors) {
    const stats = {
      total: 0, // Ahora será la suma de quantities
      totalLines: allErrors.length, // Número de líneas de errores
      pending: 0,
      done: 0,
      byUser: {},
      byViolation: {},
      byBin: {},
    };

    for (let i = 0; i < allErrors.length; i++) {
      const error = allErrors[i];
      const quantity = error.quantity || 1; // Usar quantity o 1 por defecto

      // Sumar quantity al total
      stats.total += quantity;

      if (error.feedback_status.toLowerCase() === "done") {
        stats.done += quantity; // Sumar quantity, no 1
      } else {
        stats.pending += quantity; // Sumar quantity, no 1
      }

      const userId = error.user_id;
      stats.byUser[userId] = (stats.byUser[userId] || 0) + quantity; // Sumar quantity

      const violation = error.violation;
      stats.byViolation[violation] =
        (stats.byViolation[violation] || 0) + quantity; // Sumar quantity

      const binId = error.new_container;
      stats.byBin[binId] = (stats.byBin[binId] || 0) + quantity; // Sumar quantity
    }
    return stats;
  }

  /**
   * Obtiene lista de usuarios únicos con su cantidad total de errores (sumando quantity), filtrada por turno si es necesario
   * @param {Array<Object>} allErrors - El array completo de errores.
   * @param {string} shiftFilter - Filtro de turno ("day", "early", "late").
   * @returns {Array<Object>} Array de usuarios ordenados por cantidad total de errores (descendente).
   */
  getUsersWithErrorCount(allErrors, shiftFilter = "day") {
    // Primero filtrar errores por turno si no es "day"
    let filteredErrors = allErrors;
    if (shiftFilter !== "day") {
      filteredErrors = allErrors.filter((error) =>
        this.isTimeInShift(error.time, shiftFilter)
      );
    }

    // Sumar quantities por usuario
    const userErrorCount = {};
    filteredErrors.forEach((error) => {
      const userId = error.user_id || "Desconocido";
      const quantity = error.quantity || 1; // Usar quantity o 1 por defecto
      userErrorCount[userId] = (userErrorCount[userId] || 0) + quantity;
    });

    // Convertir a array y ordenar por cantidad total de errores (descendente)
    return Object.entries(userErrorCount)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Obtiene lista de tipos de errores únicos con su cantidad total (sumando quantity), filtrada por turno y login si es necesario
   * @param {Array<Object>} allErrors - El array completo de errores.
   * @param {string} shiftFilter - Filtro de turno ("day", "early", "late").
   * @param {string} loginFilter - Filtro de login ("all" o un userId específico).
   * @returns {Array<Object>} Array de tipos de errores ordenados por cantidad total (descendente).
   */
  getErrorTypesWithCount(allErrors, shiftFilter = "day", loginFilter = "all") {
    // Primero filtrar errores por turno si no es "day"
    let filteredErrors = allErrors;
    if (shiftFilter !== "day") {
      filteredErrors = allErrors.filter((error) =>
        this.isTimeInShift(error.time, shiftFilter)
      );
    }

    // Filtrar por login si está especificado
    if (loginFilter !== "all") {
      filteredErrors = filteredErrors.filter(
        (error) => error.user_id === loginFilter
      );
    }

    // Sumar quantities por tipo de error
    const errorTypeCount = {};
    filteredErrors.forEach((error) => {
      const errorType = error.violation || error.error || "Error desconocido";
      const quantity = error.quantity || 1; // Usar quantity o 1 por defecto
      errorTypeCount[errorType] = (errorTypeCount[errorType] || 0) + quantity;
    });

    // Convertir a array y ordenar por cantidad total (descendente)
    return Object.entries(errorTypeCount)
      .map(([errorType, count]) => ({ errorType, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Actualiza el estado de un error en el array proporcionado.
   * @param {Array<Object>} errorsList - El array de errores a modificar.
   * @param {string} errorId - ID del error a actualizar.
   * @param {string} newStatus - Nuevo estado (done/pending).
   * @param {string} username - Nombre del usuario que realiza el cambio.
   * @param {Object} [feedbackData] - Datos de feedback con motivo y comentario separados.
   * @returns {boolean} True si el error fue encontrado y actualizado, false en caso contrario.
   */
  updateDetails(errorsList, errorId, newStatus, username, feedbackData = null) {
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
        .split("T")[0]
        .replace(/-/g, "/");
      errorsList[errorIndex].feedback_user = username;
      errorsList[errorIndex].feedback_notified = false; // Reiniciar notificación para este estado

      if (feedbackData) {
        // Nueva estructura con campos separados
        errorsList[errorIndex].feedback_motive = feedbackData.reasonLabel || "";
        errorsList[errorIndex].feedback_comment = feedbackData.comment || "";
      } else {
        // Limpiar campos si no hay datos
        errorsList[errorIndex].feedback_motive = "";
        errorsList[errorIndex].feedback_comment = "";
      }
    } else {
      // pending u otro estado
      errorsList[errorIndex].feedback_date = null;
      errorsList[errorIndex].feedback_user = "";
      errorsList[errorIndex].feedback_motive = ""; // Limpiar motivo
      errorsList[errorIndex].feedback_comment = ""; // Limpiar comentario
    }
    return true;
  }

  generateCsvContent(errorsToExport) {
    if (!Array.isArray(errorsToExport)) {
      console.warn(
        "ErrorDataProcessorService.generateCsvContent: errorsToExport no es un array."
      );
      return ""; // Devuelve una cadena vacía si no hay datos o son inválidos
    }

    if (errorsToExport.length === 0) {
      console.log(
        "ErrorDataProcessorService.generateCsvContent: No hay errores para exportar a CSV."
      );
      return ""; // Devuelve una cadena vacía si no hay errores
    }

    console.log(
      `ErrorDataProcessorService.generateCsvContent: Generando contenido CSV para ${errorsToExport.length} errores.`
    );

    // Crear cabeceras CSV
    const headers = [
      "ID",
      "Usuario",
      "Fecha",
      "Hora",
      "ASIN",
      "Old Container",
      "New Container",
      "Infracción",
      "Estado",
      "Cantidad",
      "Fecha Feedback",
      "Completado por",
      "Motivo",
      "Comentario",
    ];

    // Crear filas
    const rows = [headers.join(",")];

    errorsToExport.forEach((error) => {
      // Asegurarse de que los valores undefined o null se traten como cadenas vacías para el CSV
      const ensureString = (value) =>
        value === undefined || value === null ? "" : String(value);

      // Escapar comillas dobles dentro de los campos y rodear el campo con comillas dobles
      const escapeCsvField = (value) =>
        `"${ensureString(value).replace(/"/g, '""')}"`;

      const row = [
        escapeCsvField(error.id),
        escapeCsvField(error.user_id),
        escapeCsvField(error.date),
        escapeCsvField(error.time),
        escapeCsvField(error.asin),
        escapeCsvField(error.old_container),
        escapeCsvField(error.new_container),
        escapeCsvField(error.violation),
        escapeCsvField(
          error.feedback_status === "done" ? "Completado" : "Pendiente"
        ),
        escapeCsvField(error.quantity), // quantity ya debería ser un número o normalizado a 1
        escapeCsvField(error.feedback_date),
        escapeCsvField(error.feedback_user),
        escapeCsvField(error.feedback_motive),
        escapeCsvField(error.feedback_comment),
      ];
      rows.push(row.join(","));
    });

    // Crear contenido CSV
    return rows.join("\n");
  }
}
