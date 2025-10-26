async function checkFileAge() {
  try {
    // Verificar que las APIs necesarias estén disponibles
    if (!window.api.getUserDataPath || !window.api.getFileInfo) {
      console.warn("APIs no disponibles todavía. Por favor, reinicia la aplicación.");
      return { exists: false, needsRestart: true };
    }
    
    const userDataPath = await window.api.getUserDataPath();
    const filePath = `${userDataPath}/data/space-heatmap/Stowmap_data.csv`;
    
    const fileInfo = await window.api.getFileInfo(filePath);
    
    if (fileInfo.exists) {
      const lastModified = new Date(fileInfo.mtime);
      const now = new Date();
      const ageInHours = (now - lastModified) / (1000 * 60 * 60);
      
      return {
        exists: true,
        lastModified: lastModified,
        ageInHours: ageInHours,
        isOld: ageInHours > 1,
        filePath: filePath
      };
    }
    
    return { exists: false };
  } catch (error) {
    console.error("Error verificando edad del archivo:", error);
    return { exists: false, error: error.message };
  }
}

function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 60) {
    return `${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  } else {
    return `${diffDays} día${diffDays !== 1 ? 's' : ''}`;
  }
}

async function updateFileStatus() {
  const fileStatusDiv = document.getElementById("file-status");
  if (!fileStatusDiv) return;
  
  const fileInfo = await checkFileAge();
  
  // Si las APIs no están disponibles, mostrar mensaje de reinicio
  if (fileInfo.needsRestart) {
    fileStatusDiv.innerHTML = `
      <div class="file-status-warning">
        <span class="status-icon">🔄</span>
        <div class="status-text">
          <strong>Reinicio requerido</strong>
          <p>Por favor, reinicia la aplicación para activar las nuevas funciones.</p>
        </div>
      </div>
    `;
    return;
  }
  
  if (!fileInfo.exists) {
    fileStatusDiv.innerHTML = `
      <div class="file-status-warning">
        <span class="status-icon">⚠️</span>
        <div class="status-text">
          <strong>No hay datos descargados</strong>
          <p>Descarga los datos de StowMap para comenzar.</p>
        </div>
      </div>
    `;
    return;
  }
  
  if (fileInfo.isOld) {
    fileStatusDiv.innerHTML = `
      <div class="file-status-old">
        <span class="status-icon">🕐</span>
        <div class="status-text">
          <strong>Datos desactualizados</strong>
          <p>Última actualización: hace ${formatTimeAgo(fileInfo.lastModified)}</p>
          <p class="status-recommendation">Se recomienda descargar datos más recientes.</p>
        </div>
      </div>
    `;
  } else {
    fileStatusDiv.innerHTML = `
      <div class="file-status-fresh">
        <span class="status-icon">✅</span>
        <div class="status-text">
          <strong>Datos actualizados</strong>
          <p>Última actualización: hace ${formatTimeAgo(fileInfo.lastModified)}</p>
        </div>
      </div>
    `;
  }
}

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
  
  // Verificar el estado del archivo al cargar
  updateFileStatus();

  downloadBtn.addEventListener("click", async () => {
    console.log("🖱️ Click en botón detectado");

    try {
      // Verificar que las APIs necesarias estén disponibles
      if (!window.api.getUserDataPath || !window.api.executePythonScript) {
        statusMessage.textContent = "❌ Error: Por favor, reinicia la aplicación para continuar.";
        statusMessage.className = "status-message error";
        console.error("APIs no disponibles. Se requiere reinicio.");
        return;
      }

      downloadBtn.disabled = true;
      downloadBtn.textContent = "⏳ Descargando...";
      statusMessage.textContent = "Iniciando descarga de datos de StowMap...";
      statusMessage.className = "status-message loading";

      console.log("🚀 Ejecutando script de descarga de StowMap...");

      // Obtener la ruta de userData de Electron para guardar los datos
      const userDataPath = await window.api.getUserDataPath();
      console.log("📁 User Data Path:", userDataPath);

      const result = await window.api.executePythonScript({
        scriptPath: "src/renderer/apps/space-heatmap/py/Descarga_StowMap.py",
        args: [userDataPath], // Pasar la ruta de userData como argumento
      });

      console.log("📊 Resultado recibido:", result);

      if (result.success) {
        statusMessage.textContent = "✅ ¡Descarga completada exitosamente!";
        statusMessage.className = "status-message success";
        console.log("✅ Descarga completada:", result.output);
        
        // Actualizar el estado del archivo después de la descarga exitosa
        setTimeout(() => updateFileStatus(), 500);
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
