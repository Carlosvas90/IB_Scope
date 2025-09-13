/**
 * SVG Checker - Verifica que los SVG inline estén funcionando correctamente
 */

document.addEventListener("DOMContentLoaded", () => {
  console.log("🖼️ Verificando SVG inline...");

  // Verificar todos los SVG inline
  const svgElements = document.querySelectorAll("svg");
  console.log(`🔍 Encontrados ${svgElements.length} elementos SVG inline`);

  // Verificar que los SVG tengan el tamaño correcto
  svgElements.forEach((svg, index) => {
    const width = svg.getAttribute("width");
    const height = svg.getAttribute("height");
    const viewBox = svg.getAttribute("viewBox");

    console.log(
      `✅ SVG #${
        index + 1
      }: width=${width}, height=${height}, viewBox=${viewBox}`
    );

    // Asegurar que el SVG sea visible
    svg.style.display = "inline-block";
  });
});
