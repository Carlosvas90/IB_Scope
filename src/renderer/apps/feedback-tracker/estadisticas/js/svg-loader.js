/**
 * SVG Loader - Carga SVG desde archivos externos y verifica SVG inline
 */

async function loadExternalSvgs() {
  const svgContainers = document.querySelectorAll("[data-svg]");

  console.log(
    `🎨 Encontrados ${svgContainers.length} contenedores de SVG externos`
  );

  for (const container of svgContainers) {
    try {
      const svgPath = container.getAttribute("data-svg");
      const width = container.getAttribute("data-svg-width") || "24";
      const height = container.getAttribute("data-svg-height") || "24";
      const fallback = container.getAttribute("data-svg-fallback") || "📊";

      console.log(`📥 Intentando cargar SVG: ${svgPath}`);

      // Obtener ruta base de la aplicación
      const appPath = await window.api.getAppPath();
      console.log(`📁 App path: ${appPath}`);

      // Construir la ruta completa con normalización
      const fullPath = `${appPath}/${svgPath}`.replace(/\\/g, "/");
      console.log(`📍 Ruta completa: ${fullPath}`);

      // Intentar múltiples métodos de carga
      let svgContent = null;

      // Método 1: Fetch con file://
      try {
        const fileUrl = `file:///${fullPath}`;
        console.log(`🔍 Intentando fetch con: ${fileUrl}`);
        const response = await fetch(fileUrl);

        if (response.ok) {
          svgContent = await response.text();
          console.log(`✅ SVG cargado con fetch`);
        } else {
          console.warn(`⚠️ Fetch falló con status: ${response.status}`);
        }
      } catch (fetchError) {
        console.warn(`⚠️ Fetch falló:`, fetchError.message);
      }

      // Si tenemos contenido SVG, insertarlo
      if (svgContent) {
        container.innerHTML = svgContent;

        // Aplicar atributos
        const svgElement = container.querySelector("svg");
        if (svgElement) {
          svgElement.setAttribute("width", width);
          svgElement.setAttribute("height", height);
          svgElement.style.display = "inline-block";
          svgElement.style.verticalAlign = "middle";
        }

        console.log(`✅ SVG insertado correctamente: ${svgPath}`);
      } else {
        // Usar fallback
        console.warn(`⚠️ Usando fallback para: ${svgPath}`);
        container.innerHTML = `<span style="font-size: ${height}px">${fallback}</span>`;
      }
    } catch (error) {
      console.error(`❌ Error general cargando SVG:`, error);
      const fallback = container.getAttribute("data-svg-fallback") || "📊";
      const height = container.getAttribute("data-svg-height") || "24";
      container.innerHTML = `<span style="font-size: ${height}px">${fallback}</span>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🖼️ Inicializando cargador de SVG...");

  // Cargar SVG externos primero
  await loadExternalSvgs();

  // Luego verificar SVG inline
  const svgElements = document.querySelectorAll("svg");
  console.log(`🔍 Encontrados ${svgElements.length} elementos SVG inline`);

  // Asegurar que los SVG inline sean visibles
  svgElements.forEach((svg, index) => {
    svg.style.display = "inline-block";
  });

  console.log("✅ Cargador de SVG inicializado");
});
