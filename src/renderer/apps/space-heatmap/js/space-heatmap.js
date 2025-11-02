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
      const updateFilePath = `${userDataPath}/data/space-heatmap/last_update.json`;
      const csvFilePath = `${userDataPath}/data/space-heatmap/Stowmap_data.csv`;
      
      try {
        // Leer archivo JSON de última actualización
        const updateInfo = await window.api.readJson(updateFilePath);
        
        if (updateInfo && updateInfo.last_update) {
          const lastModified = new Date(updateInfo.last_update);
          const now = new Date();
          const ageInHours = (now - lastModified) / (1000 * 60 * 60);
          
          return {
            exists: true,
            lastModified: lastModified,
            ageInHours: ageInHours,
            isOld: ageInHours > 1,
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
            isOld: ageInHours > 1,
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

function initSpaceHeatmap() {
  console.log("🔧 space-heatmap.js inicializando...");

  const downloadBtn = document.getElementById("download-stowmap-btn");
  const downloadBtnText = document.getElementById("download-btn-text");
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
  
  // Configurar actualización automática cada 30 segundos
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  updateInterval = setInterval(() => {
    updateFileStatus();
  }, 30000); // Actualizar cada 30 segundos
  console.log("✅ Actualización automática configurada cada 30 segundos");

  // Función para verificar si el modal debe mostrarse (solo una vez al día)
  function shouldShowModal() {
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('stowmap-info-modal-last-shown');
    return lastShown !== today;
  }

  // Función para marcar el modal como mostrado hoy
  function markModalAsShown() {
    const today = new Date().toDateString();
    localStorage.setItem('stowmap-info-modal-last-shown', today);
  }

  // Función para mostrar el modal
  function showInfoModal() {
    return new Promise((resolve) => {
      const modal = document.getElementById('info-modal');
      const closeBtn = document.getElementById('close-modal-btn');
      const understandBtn = document.getElementById('modal-understand-btn');
      
      if (!modal) {
        console.warn('Modal no encontrado, continuando sin mostrar');
        resolve();
        return;
      }

      modal.style.display = 'flex';

      const closeModal = () => {
        modal.style.display = 'none';
        markModalAsShown();
        resolve();
      };

      // Usar once: true para que los listeners solo se ejecuten una vez
      closeBtn.addEventListener('click', closeModal, { once: true });
      understandBtn.addEventListener('click', closeModal, { once: true });
      
      // Cerrar al hacer clic fuera del modal
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      }, { once: true });
    });
  }

  downloadBtn.addEventListener("click", async () => {
    console.log("🖱️ Click en botón detectado");

    // Mostrar modal si es la primera vez hoy
    if (shouldShowModal()) {
      await showInfoModal();
    }

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

      console.log("🚀 Ejecutando script de descarga de StowMap...");

      // Obtener la ruta de userData de Electron para guardar los datos
      const userDataPath = await window.api.getUserDataPath();
      console.log("📁 User Data Path:", userDataPath);
      
      const progressFilePath = `${userDataPath}/data/space-heatmap/progress.json`;

      // Crear archivo de progreso inicial vacío para asegurar que existe
      try {
        const initialProgress = {
          percentage: 0,
          message: "Iniciando descarga...",
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
      let progressRunning = true;
      
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
        scriptPath: "src/renderer/apps/space-heatmap/py/Descarga_StowMap.py",
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
        progressText.textContent = "¡Descarga completada exitosamente!";
        
        // Ocultar barra de progreso después de 2 segundos
        setTimeout(() => {
          progressContainer.style.display = "none";
          statusMessage.textContent = "✅ ¡Descarga completada exitosamente!";
          statusMessage.className = "status-message-banner success";
          statusMessage.style.display = "block";
        }, 2000);
        
        console.log("✅ Descarga completada:", result.output);
        
        // Actualizar el estado del archivo y recargar visualizaciones
        setTimeout(() => {
          updateFileStatus();
          
          // Recargar visualizaciones con los nuevos datos
          loadAndDisplayData().then(loaded => {
            if (loaded) {
              console.log('[Visualización] Datos actualizados después de la descarga');
            }
          });
          
          // Ocultar el banner después de 5 segundos
          setTimeout(() => {
            statusMessage.style.display = "none";
          }, 5000);
        }, 1000); // Dar tiempo a que Python termine de procesar
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
      downloadBtnText.textContent = "Descargar StowMap";
    }
  });
}

// ===================================
// FUNCIONES DE VISUALIZACIÓN DE DATOS
// ===================================

async function loadAndDisplayData() {
  try {
    console.log('[Visualización] Intentando cargar datos procesados...');
    
    // Esperar a que el servicio esté disponible (con timeout)
    let attempts = 0;
    const maxAttempts = 50; // 5 segundos máximo
    
    while (!window.StowMapDataService && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    // Verificar que el servicio esté disponible
    if (!window.StowMapDataService) {
      console.error('[Visualización] StowMapDataService no está disponible después de esperar');
      console.error('[Visualización] window.StowMapDataService:', window.StowMapDataService);
      return false;
    }
    
    console.log('[Visualización] StowMapDataService encontrado');
    
    const dataService = window.StowMapDataService;
    
    // Inicializar y cargar datos
    const initialized = await dataService.initialize();
    if (!initialized) {
      console.warn('[Visualización] No se pudo inicializar el servicio');
      return false;
    }
    
    const loaded = await dataService.loadAll();
    if (!loaded || !dataService.isDataLoaded()) {
      console.warn('[Visualización] No hay datos procesados disponibles');
      return false;
    }
    
    console.log('[Visualización] Datos cargados exitosamente');
    
    // Mostrar secciones de visualización
    document.getElementById('kpis-section').style.display = 'grid';
    document.getElementById('tables-section').style.display = 'flex';
    
    // Cargar cada sección
    displayKPIs(dataService);
    displayPickTowerTable(dataService);
    
    return true;
  } catch (error) {
    console.error('[Visualización] Error al cargar datos:', error);
    return false;
  }
}

function displayKPIs(dataService) {
  // Calcular KPIs desde fullness_by_bintype.json
  const fullnessByBinType = dataService.getFullnessByBinType();
  if (!fullnessByBinType || Object.keys(fullnessByBinType).length === 0) {
    console.warn('[KPIs] No hay datos de fullness_by_bintype');
    return;
  }
  
  // Calcular totales sumando todos los floors y todas las storage areas
  let totalBins = 0;
  let occupiedBins = 0;
  let totalUnits = 0;
  let totalFullness = 0;
  let countFullness = 0;
  
  for (const [floor, floorData] of Object.entries(fullnessByBinType)) {
    for (const [storageArea, areaData] of Object.entries(floorData)) {
      for (const [binType, binData] of Object.entries(areaData)) {
        totalBins += binData.total_bins || 0;
        occupiedBins += binData.occupied_bins || 0;
        totalUnits += binData.total_units || 0;
        if (binData.avg_fullness !== undefined) {
          totalFullness += binData.avg_fullness;
          countFullness++;
        }
      }
    }
  }
  
  const emptyBins = totalBins - occupiedBins;
  const occupancyRate = totalBins > 0 ? (occupiedBins / totalBins * 100) : 0;
  const avgUtilization = countFullness > 0 ? (totalFullness / countFullness * 100) : 0;
  
  document.getElementById('kpi-total-bins').textContent = totalBins.toLocaleString();
  document.getElementById('kpi-occupied-bins').textContent = occupiedBins.toLocaleString();
  document.getElementById('kpi-occupancy-rate').textContent = `${occupancyRate.toFixed(1)}%`;
  document.getElementById('kpi-avg-utilization').textContent = `${avgUtilization.toFixed(1)}%`;
  document.getElementById('kpi-total-units').textContent = totalUnits.toLocaleString();
}

function displayPickTowerTable(dataService) {
  const fullnessByBinType = dataService.getFullnessByBinType();
  const tbody = document.getElementById('pick-tower-table-body');
  if (!tbody) {
    console.warn('[Pick Tower] Tabla no encontrada');
    return;
  }
  
  tbody.innerHTML = '';
  
  // Mapeo de bin types del JSON a nombres de columnas
  const binTypeMapping = {
    'LIBRARY-DEEP': 'Library',
    'HALF-VERTICAL': 'Vertical',
    'BARREL': 'Barrel',
    'BAT-BIN': 'BatBin',
    'FLOOR-PALLET': 'Floor Pallet',
    'PALLET-SINGLE': 'Pallet Single'
  };
  
  // Orden de las columnas (sin Floor que es la primera)
  const columnOrder = ['Total Floor', 'Zone 1', 'Zone 2', 'Library', 'Vertical', 'Barrel', 'BatBin', 'Floor Pallet', 'Pallet Single'];
  
  // Procesar cada floor (1-5)
  for (let floor = 1; floor <= 5; floor++) {
    const floorData = fullnessByBinType[floor];
    if (!floorData || !floorData['Pick Tower']) {
      // Crear fila vacía si no hay datos
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>P${floor}</td>
        <td class="empty-cell">-</td>
        <td class="empty-cell">-</td>
        <td class="empty-cell">-</td>
        <td class="empty-cell">-</td>
        <td class="empty-cell">-</td>
        <td class="empty-cell">-</td>
        <td class="empty-cell">-</td>
        <td class="empty-cell">-</td>
        <td class="empty-cell">-</td>
      `;
      tbody.appendChild(row);
      continue;
    }
    
    const pickTowerData = floorData['Pick Tower'];
    
    // Calcular Total Floor (promedio de avg_fullness de todos los bin types en Pick Tower)
    let totalFullness = 0;
    let totalCount = 0;
    const binTypeValues = {};
    
    for (const [binType, data] of Object.entries(pickTowerData)) {
      const mappedName = binTypeMapping[binType];
      if (mappedName && data.avg_fullness !== undefined) {
        totalFullness += data.avg_fullness;
        totalCount++;
        binTypeValues[mappedName] = {
          avg_fullness: data.avg_fullness,
          occupied_bins: data.occupied_bins,
          total_bins: data.total_bins
        };
      }
    }
    
    const totalFloorPercentage = totalCount > 0 
      ? Math.round(totalFullness / totalCount * 100) 
      : 0;
    
    // Zone 1 y Zone 2 - por ahora igual al Total Floor (se puede ajustar después)
    const zone1Percentage = totalFloorPercentage;
    const zone2Percentage = totalFloorPercentage;
    
    // Crear la fila
    const row = document.createElement('tr');
    let rowHTML = `<td>P${floor}</td>`;
    
    // Total Floor
    rowHTML += `<td class="percentage-cell">${totalFloorPercentage}%</td>`;
    
    // Zone 1 y Zone 2
    rowHTML += `<td class="percentage-cell">${zone1Percentage}%</td>`;
    rowHTML += `<td class="percentage-cell">${zone2Percentage}%</td>`;
    
    // Bin Types en orden
    const binTypeColumns = ['Library', 'Vertical', 'Barrel', 'BatBin', 'Floor Pallet', 'Pallet Single'];
    for (const binTypeName of binTypeColumns) {
      const binData = binTypeValues[binTypeName];
      if (binData) {
        const percentage = Math.round(binData.avg_fullness * 100);
        if (binTypeName === 'Pallet Single') {
          // Mostrar ratio para Pallet Single
          rowHTML += `<td class="percentage-cell">
            ${percentage}%
            <span class="pallet-single-ratio">${binData.occupied_bins} / ${binData.total_bins}</span>
          </td>`;
        } else {
          rowHTML += `<td class="percentage-cell">${percentage}%</td>`;
        }
      } else {
        rowHTML += `<td class="empty-cell">-</td>`;
      }
    }
    
    row.innerHTML = rowHTML;
    tbody.appendChild(row);
  }
}

function getPercentageClass(value) {
  if (value >= 70) return 'high';
  if (value >= 40) return 'medium';
  return 'low';
}

// Inicializar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initSpaceHeatmap();
    // Intentar cargar datos al iniciar
    loadAndDisplayData();
  });
} else {
  initSpaceHeatmap();
  // Intentar cargar datos al iniciar
  loadAndDisplayData();
}
