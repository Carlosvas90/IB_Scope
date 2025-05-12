// Utilidades de JSON

/**
 * Parsea un string JSON de forma segura (devuelve null si falla).
 * @param {string} jsonString
 * @returns {any|null}
 */
export function safeParseJSON(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return null;
  }
}

/**
 * Realiza una copia profunda de un objeto o array.
 * @param {any} obj
 * @returns {any}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
