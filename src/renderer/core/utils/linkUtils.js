/**
 * Devuelve la URL de la foto de usuario (login) para Amazon.
 * @param {string} login
 * @returns {string}
 */
export function getUserPhotoUrl(login) {
  if (!login) return "";
  return `https://internal-cdn.amazon.com/badgephotos.amazon.com/?uid=${login}`;
}

/**
 * Devuelve la URL de búsqueda de un ASIN en FCResearch.
 * @param {string} asin
 * @returns {string}
 */
export function getAsinResearchUrl(asin) {
  if (!asin) return "";
  return `http://fcresearch-eu.aka.amazon.com/VLC1/results?s=${asin}`;
}

/**
 * Abre un enlace externo usando la API segura de Electron.
 * @param {string} url
 */
export function openExternalLink(url) {
  if (window.api && window.api.openExternalLink) {
    window.api.openExternalLink(url);
  } else {
    window.open(url, "_blank");
  }
}
