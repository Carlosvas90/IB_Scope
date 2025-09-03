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
  if (!url) {
    console.error("openExternalLink: URL no válida");
    return;
  }

  console.log(`🔗 Intentando abrir URL externa: ${url}`);
  console.log(`🔍 window.api disponible:`, !!window.api);
  console.log(
    `🔍 window.api.openExternalLink disponible:`,
    !!(window.api && window.api.openExternalLink)
  );

  if (window.api && window.api.openExternalLink) {
    console.log(
      "✅ Usando window.api.openExternalLink para abrir URL en navegador externo"
    );

    window.api
      .openExternalLink(url)
      .then((result) => {
        console.log("📋 Resultado de openExternalLink:", result);
        if (result && result.success) {
          console.log("🎉 URL abierta correctamente en navegador externo");
        } else {
          console.error(
            "❌ Error al abrir URL:",
            result ? result.error : "Desconocido"
          );
          console.log("🔄 Intentando fallback con window.open");
          window.open(url, "_blank");
        }
      })
      .catch((error) => {
        console.error("💥 Excepción al abrir URL:", error);
        console.log("🔄 Usando window.open como fallback por excepción");
        window.open(url, "_blank");
      });
  } else {
    console.log(
      "⚠️ API de Electron no disponible, usando window.open como fallback"
    );
    window.open(url, "_blank");
  }
}
