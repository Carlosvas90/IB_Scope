/**
 * Utilidades para manejar estados de errores
 */

/**
 * Verifica si un error está resuelto usando múltiples criterios
 * @param {Object} error Objeto de error
 * @returns {boolean} true si el error está resuelto, false en caso contrario
 */
export function isErrorResolved(error) {
  if (!error) return false;

  return (
    // Status conocidos
    error.status === "done" ||
    error.status === "completed" ||
    error.status === 1 ||
    error.status === "1" ||
    // Propiedades alternativas
    error.resolved === true ||
    error.resolved === "true" ||
    error.resolved === 1 ||
    error.resolved === "1" ||
    error.is_resolved === true ||
    error.is_resolved === "true" ||
    error.is_resolved === 1 ||
    error.is_resolved === "1" ||
    // Fechas de resolución
    (error.done_date && error.done_date !== "") ||
    (error.resolved_date && error.resolved_date !== "")
  );
}

/**
 * Filtra un array de errores para obtener solo los resueltos
 * @param {Array} errors Array de errores
 * @returns {Array} Array de errores resueltos
 */
export function getResolvedErrors(errors) {
  if (!Array.isArray(errors)) return [];
  return errors.filter(isErrorResolved);
}

/**
 * Filtra un array de errores para obtener solo los pendientes
 * @param {Array} errors Array de errores
 * @returns {Array} Array de errores pendientes
 */
export function getPendingErrors(errors) {
  if (!Array.isArray(errors)) return [];
  return errors.filter((error) => !isErrorResolved(error));
}

/**
 * Calcula la cantidad total de errores resueltos, considerando el campo quantity
 * @param {Array} errors Array de errores
 * @returns {number} Cantidad total de errores resueltos
 */
export function calculateResolvedQuantity(errors) {
  if (!Array.isArray(errors)) return 0;

  return getResolvedErrors(errors).reduce((total, error) => {
    const quantity = parseInt(error.quantity) || 1;
    return total + quantity;
  }, 0);
}

/**
 * Calcula la cantidad total de errores pendientes, considerando el campo quantity
 * @param {Array} errors Array de errores
 * @returns {number} Cantidad total de errores pendientes
 */
export function calculatePendingQuantity(errors) {
  if (!Array.isArray(errors)) return 0;

  return getPendingErrors(errors).reduce((total, error) => {
    const quantity = parseInt(error.quantity) || 1;
    return total + quantity;
  }, 0);
}

/**
 * Analiza un array de errores y devuelve estadísticas sobre sus estados
 * @param {Array} errors Array de errores
 * @returns {Object} Objeto con estadísticas de estados
 */
export function analyzeErrorStatuses(errors) {
  if (!Array.isArray(errors)) {
    return {
      total: 0,
      resolved: 0,
      pending: 0,
      totalQuantity: 0,
      resolvedQuantity: 0,
      pendingQuantity: 0,
      uniqueStatuses: [],
      statusCounts: {},
    };
  }

  const resolvedErrors = getResolvedErrors(errors);
  const pendingErrors = getPendingErrors(errors);

  const uniqueStatuses = [...new Set(errors.map((e) => e.status))];

  // Contar errores por cada estado
  const statusCounts = {};
  uniqueStatuses.forEach((status) => {
    statusCounts[status] = errors.filter((e) => e.status === status).length;
  });

  // Calcular cantidades totales
  const totalQuantity = errors.reduce(
    (sum, e) => sum + (parseInt(e.quantity) || 1),
    0
  );
  const resolvedQuantity = calculateResolvedQuantity(errors);
  const pendingQuantity = calculatePendingQuantity(errors);

  return {
    total: errors.length,
    resolved: resolvedErrors.length,
    pending: pendingErrors.length,
    totalQuantity,
    resolvedQuantity,
    pendingQuantity,
    uniqueStatuses,
    statusCounts,
  };
}
