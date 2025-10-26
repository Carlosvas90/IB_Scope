function initSpaceHeatmap() {
  console.log("🔧 space-heatmap.js inicializando...");

  const downloadBtn = document.getElementById("download-stowmap-btn");
  const statusMessage = document.getElementById("status-message");

  console.log("🔍 downloadBtn:", downloadBtn);
  console.log("🔍 statusMessage:", statusMessage);

  if (!downloadBtn) {
    console.error("❌ No se encontró el botón download-stowmap-btn");
    return;
  }

  console.log("✅ Listeners de evento configurados");

  downloadBtn.addEventListener("click", async () => {
    console.log("🖱️ Click en botón detectado");

    try {
      downloadBtn.disabled = true;
      downloadBtn.textContent = "⏳ Descargando...";
      statusMessage.textContent = "Iniciando descarga de datos de StowMap...";
      statusMessage.className = "status-message loading";

      console.log("🚀 Ejecutando script de descarga de StowMap...");

      const result = await window.api.executePythonScript({
        scriptPath: "src/renderer/apps/space-heatmap/py/Descarga_StowMap.py",
        args: [],
      });

      console.log("📊 Resultado recibido:", result);

      if (result.success) {
        statusMessage.textContent = "✅ ¡Descarga completada exitosamente!";
        statusMessage.className = "status-message success";
        console.log("✅ Descarga completada:", result.output);
      } else {
        statusMessage.textContent = `❌ Error: ${
          result.error || "Error desconocido"
        }`;
        statusMessage.className = "status-message error";
        console.error("❌ Error:", result.error);
      }
    } catch (error) {
      statusMessage.textContent = `❌ Error: ${error.message}`;
      statusMessage.className = "status-message error";
      console.error("❌ Error al ejecutar script:", error);
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.textContent = "📥 Descargar StowMap Data";
    }
  });
}

// Inicializar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSpaceHeatmap);
} else {
  initSpaceHeatmap();
}
