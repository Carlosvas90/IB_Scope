// Utilidades de fechas

/**
 * Parsea una fecha y hora en string a un objeto Date.
 * @param {string} dateStr - Fecha en formato YYYY-MM-DD o similar
 * @param {string} timeStr - Hora en formato HH:mm:ss o similar
 * @returns {Date}
 */
export function parseDateTime(dateStr, timeStr) {
  return new Date(`${dateStr || ""} ${timeStr || ""}`);
}

/**
 * Formatea un objeto Date a string (YYYY-MM-DD HH:mm:ss)
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!(date instanceof Date)) return "";
  return date.toISOString().replace("T", " ").substring(0, 19);
}

/**
 * Formatea un objeto Date a string en formato DDMMYYYY
 * @param {Date} date
 * @returns {string}
 */
export function formatDateDDMMYYYY(date) {
  if (!(date instanceof Date)) return "";
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}${m}${y}`;
}

/**
 * Formatea un objeto Date a string en formato YYYYMMDD
 * @param {Date} date
 * @returns {string}
 */
export function formatDateYYYYMMDD(date) {
  if (!(date instanceof Date)) return "";
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${y}${m}${d}`;
}
