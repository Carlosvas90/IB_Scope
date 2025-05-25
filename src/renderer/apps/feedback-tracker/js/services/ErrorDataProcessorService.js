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
        escapeCsvField(error.feedback_comment),
      ];
      rows.push(row.join(","));
    });

    // Crear contenido CSV
    return rows.join("\n");
  }
}
