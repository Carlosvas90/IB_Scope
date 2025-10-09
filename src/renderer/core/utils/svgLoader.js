/**
 * svgLoader.js
 * Servicio para cargar SVG desde archivos externos
 * Funciona tanto en modo desarrollo como en build empaquetado
 */

/**
 * Carga un SVG desde una ruta y lo inserta en un elemento
 * @param {string} svgPath - Ruta relativa al archivo SVG (ej: 'assets/svg/feedback-icon.svg')
 * @param {HTMLElement} targetElement - Elemento donde insertar el SVG
 * @param {Object} options - Opciones de configuración (width, height, className)
 * @returns {Promise<boolean>} - True si se cargó correctamente
 */
export async function loadSvg(svgPath, targetElement, options = {}) {
  try {
    console.log(`🎨 Cargando SVG: ${svgPath}`);

    // Leer el archivo SVG usando el API del main process
    const result = await window.api.readFile(svgPath);

    if (!result.success) {
      throw new Error(result.error || "Error desconocido al cargar SVG");
    }

    const svgContent = result.content;

    // Insertar SVG en el elemento
    targetElement.innerHTML = svgContent;

    // Aplicar opciones si se proporcionan
    const svgElement = targetElement.querySelector("svg");
    if (svgElement) {
      if (options.width) svgElement.setAttribute("width", options.width);
      if (options.height) svgElement.setAttribute("height", options.height);
      if (options.className)
        svgElement.setAttribute("class", options.className);
      if (options.style) {
        Object.assign(svgElement.style, options.style);
      }
    }

    console.log(`✅ SVG cargado correctamente en`, targetElement);
    return true;
  } catch (error) {
    console.error(`❌ Error cargando SVG desde ${svgPath}:`, error);

    // Fallback: crear un icono simple de texto
    if (targetElement && options.fallbackText) {
      targetElement.innerHTML = `<span style="font-size: ${
        options.height || "24px"
      }">${options.fallbackText}</span>`;
    }

    return false;
  }
}

/**
 * Carga un SVG inline desde una ruta
 * @param {string} svgPath - Ruta relativa al archivo SVG
 * @returns {Promise<string>} - Contenido del SVG como string
 */
export async function getSvgContent(svgPath) {
  try {
    const result = await window.api.readFile(svgPath);

    if (!result.success) {
      throw new Error(result.error || "Error desconocido al cargar SVG");
    }

    return result.content;
  } catch (error) {
    console.error(`❌ Error obteniendo contenido de SVG:`, error);
    return "";
  }
}

/**
 * Inicializa todos los SVG de una página que tengan el atributo data-svg
 * @example <div data-svg="assets/svg/icon.svg" data-svg-width="24" data-svg-height="24"></div>
 */
export async function initPageSvgs() {
  const svgElements = document.querySelectorAll("[data-svg]");

  for (const element of svgElements) {
    const svgPath = element.getAttribute("data-svg");
    const width = element.getAttribute("data-svg-width") || "24";
    const height = element.getAttribute("data-svg-height") || "24";
    const className = element.getAttribute("data-svg-class") || "";
    const fallbackText = element.getAttribute("data-svg-fallback") || "📊";

    await loadSvg(svgPath, element, {
      width,
      height,
      className,
      fallbackText,
    });
  }

  console.log(`✅ ${svgElements.length} SVGs inicializados`);
}

// Auto-inicializar al cargar el DOM
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const hasSvgElements = document.querySelectorAll("[data-svg]").length > 0;
    if (hasSvgElements) {
      initPageSvgs();
    }
  });
}
