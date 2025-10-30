async function checkFileAge() {
  try {
    // Verificar que las APIs necesarias estén disponibles
    if (!window.api || !window.api.getUserDataPath || !window.api.readJson) {
      console.warn("APIs no disponibles todavía. Por favor, reinicia la aplicación.");
      return { exists: false, needsRestart: true };
    }
    
    // Agregar timeout de 2 segundos para evitar que se quede colgado
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout al verificar archivo")), 2000)
    );
    
    const checkPromise = (async () => {
      const userDataPath = await window.api.getUserDataPath();
      
      // Intentar leer el archivo JSON de última actualización (más rápido y simple)
      const updateFilePath = `${userDataPath}/data/pizarra/last_update.json`;
      const csvFilePath = `${userDataPath}/data/pizarra/employee_roster.csv`;
      
      try {
        // Leer archivo JSON de última actualización
        const result = await window.api.readJson(updateFilePath);
        if (result && result.success && result.data && result.data.last_update) {
          const lastModified = new Date(result.data.last_update);
          const now = new Date();
          const ageInHours = (now - lastModified) / (1000 * 60 * 60);
          
          return {
            exists: true,
            lastModified: lastModified,
            ageInHours: ageInHours,
            isOld: ageInHours > 24,
            filePath: csvFilePath,
            updateFilePath: updateFilePath
          };
        }
      } catch (jsonError) {
        // Si no existe el JSON, verificar el CSV como fallback
        console.log("JSON de actualización no encontrado, usando CSV como fallback");
      }
      
      // Fallback: verificar CSV si existe getFileInfo
      if (window.api.getFileInfo) {
        const fileInfo = await window.api.getFileInfo(csvFilePath);
        
        if (fileInfo.exists) {
          const lastModified = new Date(fileInfo.mtime);
          const now = new Date();
          const ageInHours = (now - lastModified) / (1000 * 60 * 60);
          
          return {
            exists: true,
            lastModified: lastModified,
            ageInHours: ageInHours,
            isOld: ageInHours > 24,
            filePath: csvFilePath
          };
        }
      }
      
      return { exists: false };
    })();
    
    // Race entre la verificación y el timeout
    return await Promise.race([checkPromise, timeoutPromise]);
    
  } catch (error) {
    console.error("Error verificando edad del archivo:", error);
    if (error.message === "Timeout al verificar archivo") {
      return { exists: false, timeout: true };
    }
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
  const fileStatusHeader = document.getElementById("file-status-header");
  const statusIcon = document.getElementById("status-icon");
  const statusText = document.getElementById("status-text");
  
  if (!fileStatusHeader || !statusIcon || !statusText) return;
  
  // Mostrar estado de carga inicialmente
  statusIcon.textContent = "⏳";
  statusText.textContent = "Verificando...";
  fileStatusHeader.classList.remove("status-fresh", "status-old", "status-warning");
  
  try {
    const fileInfo = await checkFileAge();
    
    // Limpiar clases previas
    fileStatusHeader.classList.remove("status-fresh", "status-old", "status-warning");
    
    // Si hubo timeout
    if (fileInfo.timeout) {
      statusIcon.textContent = "⚠️";
      statusText.textContent = "Sin datos";
      fileStatusHeader.classList.add("status-warning");
      return;
    }
    
    // Si las APIs no están disponibles, mostrar mensaje de reinicio
    if (fileInfo.needsRestart) {
      statusIcon.textContent = "🔄";
      statusText.textContent = "Reinicio requerido";
      fileStatusHeader.classList.add("status-warning");
      return;
    }
    
    if (!fileInfo.exists) {
      statusIcon.textContent = "⚠️";
      statusText.textContent = "Sin datos";
      fileStatusHeader.classList.add("status-warning");
      return;
    }
    
    if (fileInfo.isOld) {
      statusIcon.textContent = "🕐";
      statusText.textContent = `Actualizado hace ${formatTimeAgo(fileInfo.lastModified)}`;
      fileStatusHeader.classList.add("status-old");
    } else {
      statusIcon.textContent = "✅";
      statusText.textContent = `Actualizado hace ${formatTimeAgo(fileInfo.lastModified)}`;
      fileStatusHeader.classList.add("status-fresh");
    }
  } catch (error) {
    console.error("Error actualizando estado del archivo:", error);
    statusIcon.textContent = "⚠️";
    statusText.textContent = "Error al verificar";
    fileStatusHeader.classList.add("status-warning");
  }
}

// Variable para almacenar el intervalo de actualización del estado del archivo
let updateInterval = null;

function initPizarra() {
  console.log("🔧 pizarra.js inicializando...");

  const downloadBtn = document.getElementById("download-roster-btn");
  const downloadBtnText = document.getElementById("download-btn-text");
  const statusMessage = document.getElementById("status-message");

  console.log("🔍 downloadBtn:", downloadBtn);
  console.log("🔍 statusMessage:", statusMessage);

  if (!downloadBtn) {
    console.error("❌ No se encontró el botón download-roster-btn");
    return;
  }

  console.log("✅ Listeners de evento configurados");
  
  // Verificar el estado del archivo al cargar
  updateFileStatus();
  
  // Configurar actualización automática cada 30 segundos
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  updateInterval = setInterval(() => {
    updateFileStatus();
  }, 30000); // Actualizar cada 30 segundos
  console.log("✅ Actualización automática configurada cada 30 segundos");

  downloadBtn.addEventListener("click", async () => {
    console.log("🖱️ Click en botón detectado");

    // Referencias a elementos de progreso
    const progressContainer = document.getElementById("progress-container");
    const progressBar = document.getElementById("progress-bar");
    const progressText = document.getElementById("progress-text");
    const progressPercentage = document.getElementById("progress-percentage");
    
    // Variable para controlar el bucle de progreso
    let progressRunning = false;

    try {
      // Verificar que las APIs necesarias estén disponibles
      if (!window.api.getUserDataPath || !window.api.executePythonScript || !window.api.readJson) {
        statusMessage.textContent = "❌ Error: Por favor, reinicia la aplicación para continuar.";
        statusMessage.className = "status-message-banner error";
        statusMessage.style.display = "block";
        console.error("APIs no disponibles. Se requiere reinicio.");
        return;
      }

      // Deshabilitar botón y agregar animación
      downloadBtn.disabled = true;
      downloadBtn.classList.add("downloading");
      downloadBtnText.textContent = "Descargando...";
      
      // Ocultar banner de estado y mostrar barra de progreso
      statusMessage.style.display = "none";
      progressContainer.style.display = "block";
      progressBar.style.width = "0%";
      progressText.textContent = "Iniciando descarga...";
      progressPercentage.textContent = "0%";

      console.log("🚀 Ejecutando script de descarga de Roster...");

      // Obtener la ruta de userData de Electron para guardar los datos
      const userDataPath = await window.api.getUserDataPath();
      console.log("📁 User Data Path:", userDataPath);
      
      const progressFilePath = `${userDataPath}/data/pizarra/progress.json`;

      // Crear archivo de progreso inicial vacío para asegurar que existe
      try {
        const initialProgress = {
          percentage: 0,
          message: "Iniciando descarga del roster...",
          timestamp: new Date().toISOString()
        };
        await window.api.writeJson(progressFilePath, initialProgress);
      } catch (e) {
        console.log("No se pudo crear archivo inicial (normal si no existe API writeJson)");
      }

      // Función mejorada para leer progreso con reintentos
      let lastPercentage = 0;
      let updateCount = 0;
      
      async function updateProgress() {
        updateCount++;
        try {
          const result = await window.api.readJson(progressFilePath);
          
          // readJson devuelve {success: true, data: {...}}
          if (!result || !result.success) {
            // Archivo no encontrado o error
            if (updateCount % 10 === 1) {
              console.log(`[Progreso #${updateCount}] Archivo no encontrado aún o error:`, result?.error);
            }
            return;
          }
          
          const progressData = result.data;
          
          // Debug: mostrar qué se leyó (solo ocasionalmente para no saturar)
          if (updateCount % 5 === 1) {
            console.log(`[Progreso Debug #${updateCount}] Datos leídos:`, progressData);
          }
          
          if (progressData && typeof progressData.percentage === 'number') {
            const pct = Math.min(100, Math.max(0, progressData.percentage));
            
            // Solo actualizar si el porcentaje cambió o es el primer update
            if (pct !== lastPercentage || updateCount === 1) {
              progressBar.style.width = `${pct}%`;
              progressPercentage.textContent = `${Math.round(pct)}%`;
              if (progressData.message) {
                progressText.textContent = progressData.message;
              }
              
              console.log(`[Progreso Update #${updateCount}] ${Math.round(pct)}% - ${progressData.message}`);
              lastPercentage = pct;
            }
          } else {
            // Datos inválidos
            if (updateCount % 10 === 1) {
              console.warn(`[Progreso #${updateCount}] Datos inválidos:`, progressData);
            }
          }
        } catch (error) {
          // Log detallado del error ocasionalmente
          if (updateCount % 10 === 1) {
            console.error(`[Progreso #${updateCount}] Error leyendo archivo:`, error.message);
          }
        }
      }

      // Leer inmediatamente
      await updateProgress();
      console.log("[Progreso] Primera lectura completada");

      // Usar un bucle asíncrono en lugar de setInterval para mejor control
      progressRunning = true;
      
      // Función para mantener el bucle de lectura de progreso
      async function progressLoop() {
        while (progressRunning) {
          await updateProgress();
          // Esperar 200ms antes de la siguiente lectura
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Iniciar el bucle de progreso en paralelo
      const progressLoopPromise = progressLoop();
      console.log("[Progreso] Bucle de actualización iniciado (200ms)");

      // Ejecutar script en paralelo
      console.log("[Progreso] Ejecutando script Python...");
      const scriptPromise = window.api.executePythonScript({
        scriptPath: "src/renderer/apps/utilidades/Pizarra/py/Descarga_Roster.py",
        args: [userDataPath],
      });

      // Verificar periódicamente que el bucle esté funcionando
      const checkInterval = setInterval(() => {
        console.log("[Progreso] Bucle todavía activo, updateCount:", updateCount);
      }, 2000);

      // Esperar a que termine el script
      const result = await scriptPromise;
      console.log("[Progreso] Script Python terminó");
      
      clearInterval(checkInterval);
      
      // Esperar un momento para capturar el progreso final
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Detener el bucle de progreso
      progressRunning = false;
      console.log("[Progreso] Bucle detenido");

      // Forzar último update del progreso
      await updateProgress();

      console.log("📊 Resultado recibido:", result);

      if (result.success) {
        // Mostrar 100% final
        progressBar.style.width = "100%";
        progressPercentage.textContent = "100%";
        progressText.textContent = "¡Roster descargado exitosamente!";
        
        // Ocultar barra de progreso después de 2 segundos
        setTimeout(() => {
          progressContainer.style.display = "none";
          statusMessage.textContent = "✅ ¡Roster descargado exitosamente!";
          statusMessage.className = "status-message-banner success";
          statusMessage.style.display = "block";
        }, 2000);
        
        console.log("✅ Descarga completada:", result.output);
        
        // Actualizar el estado del archivo
        setTimeout(() => {
          updateFileStatus();
          
          // Ocultar el banner después de 5 segundos
          setTimeout(() => {
            statusMessage.style.display = "none";
          }, 5000);
        }, 1000);
      } else {
        progressContainer.style.display = "none";
        statusMessage.textContent = `❌ Error: ${
          result.error || "Error desconocido"
        }`;
        statusMessage.className = "status-message-banner error";
        statusMessage.style.display = "block";
        console.error("❌ Error:", result.error);
      }
    } catch (error) {
      // Asegurar que el bucle de progreso se detenga en caso de error
      progressRunning = false;
      progressContainer.style.display = "none";
      statusMessage.textContent = `❌ Error: ${error.message}`;
      statusMessage.className = "status-message-banner error";
      statusMessage.style.display = "block";
      console.error("❌ Error al ejecutar script:", error);
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.classList.remove("downloading");
      downloadBtnText.textContent = "Descargar Roster";
    }
  });
}

// Inicializar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initPizarra();
  });
} else {
  initPizarra();
}

