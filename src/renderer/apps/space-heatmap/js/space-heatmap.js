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

  // Remover listener anterior si existe para evitar duplicados al reinicializar
  // Clonar el botón para remover todos los listeners anteriores
  const newDownloadBtn = downloadBtn.cloneNode(true);
  downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
  
  // Obtener referencias frescas después de clonar
  const freshDownloadBtn = document.getElementById("download-stowmap-btn");
  const freshDownloadBtnText = document.getElementById("download-btn-text");
  
  if (!freshDownloadBtn || !freshDownloadBtnText) {
    console.error("❌ No se encontraron elementos después de clonar");
    return;
  }
  
  console.log("✅ Listeners de evento configurados");
  
  freshDownloadBtn.addEventListener("click", async () => {
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
      freshDownloadBtn.disabled = true;
      freshDownloadBtn.classList.add("downloading");
      freshDownloadBtnText.textContent = "Descargando...";
      
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
      freshDownloadBtn.disabled = false;
      freshDownloadBtn.classList.remove("downloading");
      freshDownloadBtnText.textContent = "Descargar StowMap";
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
    
    // Cargar cada sección
    displayKPIs(dataService);
    displayPickTowerTable(dataService);
    displayHighRackTable(dataService);
    displayPalletLandTable(dataService);
    displayZone1Table(dataService);
    displayZone2Table(dataService);
    setupTableNavigation();
    setupHeatmapButtons();
    loadBintypeIcons();
    loadKpiIcons();
    loadBannerIcon();
    
    // Mostrar secciones
    const kpisSection = document.getElementById('kpis-section');
    const tablesSection = document.getElementById('tables-section');
    
    if (kpisSection) kpisSection.style.display = 'grid';
    if (tablesSection) tablesSection.style.display = 'block';
    
    return true;
  } catch (error) {
    console.error('[Visualización] Error al cargar datos:', error);
    return false;
  }
}

function displayKPIs(dataService) {
  // Usar KPIs desde Data_Fullness.json (VLC1)
  const dataFullness = dataService.getDataFullness();
  const vlc1 = dataFullness['VLC1'];
  
  if (!vlc1 || !vlc1.datos) {
    console.warn('[KPIs] No hay datos de VLC1 en Data_Fullness');
    return;
  }
  
  const datos = vlc1.datos;
  
  // Función auxiliar para formatear fullness con 2 decimales
  function formatFullness(value) {
    if (value === null || value === undefined) return '-';
    const percentage = (value * 100).toFixed(2);
    // Separar parte entera y decimales para aplicar estilo diferente
    const parts = percentage.split('.');
    return `${parts[0]}.<span class="fullness-decimals">${parts[1]}</span>%`;
  }
  
  // Actualizar KPIs principales
  const fullnessTotal = formatFullness(datos.fullness);
  document.getElementById('kpi-fullness-total').innerHTML = fullnessTotal;
  document.getElementById('kpi-total-units').textContent = datos.total_units.toLocaleString();
  document.getElementById('kpi-total-bins').textContent = datos.total_bins.toLocaleString();
  document.getElementById('kpi-occupied-bins').textContent = datos.occupied_bins.toLocaleString();
  document.getElementById('kpi-locked-bins').textContent = datos.locked_bins.toLocaleString();
  
  // Actualizar fullness por Storage Area
  const pickTower = dataFullness['Pick Tower'];
  const highRack = dataFullness['High Rack'];
  const palletLand = dataFullness['Pallet Land'];
  
  if (pickTower && pickTower.datos) {
    document.getElementById('kpi-fullness-pick-tower').innerHTML = formatFullness(pickTower.datos.fullness);
  }
  if (highRack && highRack.datos) {
    document.getElementById('kpi-fullness-high-rack').innerHTML = formatFullness(highRack.datos.fullness);
  }
  if (palletLand && palletLand.datos) {
    document.getElementById('kpi-fullness-pallet-land').innerHTML = formatFullness(palletLand.datos.fullness);
  }
  
  // Actualizar total_units por Storage Area
  if (pickTower && pickTower.datos && pickTower.datos.total_units) {
    document.getElementById('kpi-units-pick-tower').textContent = pickTower.datos.total_units.toLocaleString();
  }
  if (highRack && highRack.datos && highRack.datos.total_units) {
    document.getElementById('kpi-units-high-rack').textContent = highRack.datos.total_units.toLocaleString();
  }
  if (palletLand && palletLand.datos && palletLand.datos.total_units) {
    document.getElementById('kpi-units-pallet-land').textContent = palletLand.datos.total_units.toLocaleString();
  }
}

function displayPickTowerTable(dataService) {
  const dataFullness = dataService.getDataFullness();
  const tbody = document.getElementById('pick-tower-table-body');
  if (!tbody) {
    console.warn('[Pick Tower] Tabla no encontrada');
    return;
  }
  
  tbody.innerHTML = '';
  
  // Función auxiliar para obtener fullness de una zona
  function getFullness(zoneKey) {
    const zone = dataFullness[zoneKey];
    if (!zone || !zone.datos || zone.datos.fullness === undefined) {
      return null;
    }
    return zone.datos.fullness;
  }
  
  // Función auxiliar para obtener datos completos de una zona (para PalletSingle)
  function getZoneData(zoneKey) {
    const zone = dataFullness[zoneKey];
    if (!zone || !zone.datos) {
      return null;
    }
    return zone.datos;
  }
  
  // Procesar cada floor (1-5)
  for (let floor = 1; floor <= 5; floor++) {
    const floorPrefix = `P${floor}`;
    
    // Obtener datos de cada zona/categoría
    const totalFloor = getFullness(`${floorPrefix}-Total`);
    const zone1 = getFullness(`${floorPrefix}-Z1`);
    const zone2 = getFullness(`${floorPrefix}-Z2`);
    const library = getFullness(`${floorPrefix}-Library`);
    const vertical = getFullness(`${floorPrefix}-Vertical`);
    const barrel = getFullness(`${floorPrefix}-Barrel`);
    const batBin = getFullness(`${floorPrefix}-BatBin`);
    const floorPallet = getFullness(`${floorPrefix}-FloorPallet`);
    const palletSingleData = getZoneData(`${floorPrefix}-PalletSingle`);
    
    // Crear la fila
    const row = document.createElement('tr');
    let rowHTML = `<td>P${floor}</td>`;
    
    // Función auxiliar para formatear fullness con 2 decimales
    function formatFullnessCell(value) {
      if (value === null || value === undefined) return '<td class="empty-cell">-</td>';
      const percentage = (value * 100).toFixed(2);
      const parts = percentage.split('.');
      return `<td class="percentage-cell">${parts[0]}.<span class="fullness-decimals">${parts[1]}</span>%</td>`;
    }
    
    // Total Floor
    rowHTML += formatFullnessCell(totalFloor);
    
    // Zone 1
    rowHTML += formatFullnessCell(zone1);
    
    // Zone 2
    rowHTML += formatFullnessCell(zone2);
    
    // Library
    rowHTML += formatFullnessCell(library);
    
    // Vertical (Half-Vertical)
    rowHTML += formatFullnessCell(vertical);
    
    // Barrel
    rowHTML += formatFullnessCell(barrel);
    
    // BatBin
    rowHTML += formatFullnessCell(batBin);
    
    // FloorPallet
    rowHTML += formatFullnessCell(floorPallet);
    
    // PalletSingle (mostrar fullness y empty_bins/total_bins en la misma línea)
    if (palletSingleData && palletSingleData.fullness !== undefined) {
      const percentage = (palletSingleData.fullness * 100).toFixed(2);
      const parts = percentage.split('.');
      const emptyBins = palletSingleData.empty_bins || 0;
      const totalBins = palletSingleData.total_bins || 0;
      rowHTML += `<td class="percentage-cell">
        ${parts[0]}.<span class="fullness-decimals">${parts[1]}</span>% <span class="pallet-single-ratio">${emptyBins} / ${totalBins}</span>
      </td>`;
    } else {
      rowHTML += `<td class="empty-cell">-</td>`;
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

function displayHighRackTable(dataService) {
  const dataFullness = dataService.getDataFullness();
  const tbody = document.getElementById('high-rack-table-body');
  
  if (!tbody) {
    console.warn('[High Rack] Tabla no encontrada');
    return;
  }
  
  tbody.innerHTML = '';
  
  // Función auxiliar para obtener datos de una zona
  function getZoneData(zoneKey) {
    const zone = dataFullness[zoneKey];
    if (!zone || !zone.datos) {
      return null;
    }
    return zone.datos;
  }
  
  // Función auxiliar para formatear fullness con 2 decimales
  function formatFullnessCell(value) {
    if (value === null || value === undefined) return '<td class="empty-cell">-</td>';
    const percentage = (value * 100).toFixed(2);
    const parts = percentage.split('.');
    return `<td class="percentage-cell">${parts[0]}.<span class="fullness-decimals">${parts[1]}</span>%</td>`;
  }
  
  // Tipos de bins para High Rack
  const binTypes = [
    { key: 'HRK-BatBin', label: 'BatBin' },
    { key: 'HRK-Cantilever', label: 'Cantilever' },
    { key: 'HRK-PassThrough', label: 'Pass Through' },
    { key: 'HRK-FloorPallet', label: 'Floor Pallet' },
    { key: 'HRK-PalletSingle', label: 'Pallet Single' },
    { key: 'HRK-Standard', label: 'Standard' },
    { key: 'HRK-SIOC', label: 'SIOC' }
  ];
  
  binTypes.forEach(binType => {
    const data = getZoneData(binType.key);
    
    if (!data) {
      return; // Saltar si no hay datos
    }
    
    const row = document.createElement('tr');
    let rowHTML = `<td>${binType.label}</td>`;
    
    // Fullness
    rowHTML += formatFullnessCell(data.fullness);
    
    // Total Bins
    if (data.total_bins !== undefined) {
      rowHTML += `<td>${data.total_bins.toLocaleString()}</td>`;
    } else {
      rowHTML += '<td class="empty-cell">-</td>';
    }
    
    // Occupied Bins
    if (data.occupied_bins !== undefined) {
      rowHTML += `<td>${data.occupied_bins.toLocaleString()}</td>`;
    } else {
      rowHTML += '<td class="empty-cell">-</td>';
    }
    
    // Empty Bins
    if (data.empty_bins !== undefined) {
      rowHTML += `<td>${data.empty_bins.toLocaleString()}</td>`;
    } else {
      rowHTML += '<td class="empty-cell">-</td>';
    }
    
    // Locked Bins
    if (data.locked_bins !== undefined) {
      rowHTML += `<td>${data.locked_bins.toLocaleString()}</td>`;
    } else {
      rowHTML += '<td class="empty-cell">-</td>';
    }
    
    // Total Units
    if (data.total_units !== undefined) {
      rowHTML += `<td>${data.total_units.toLocaleString()}</td>`;
    } else {
      rowHTML += '<td class="empty-cell">-</td>';
    }
    
    row.innerHTML = rowHTML;
    tbody.appendChild(row);
  });
}

function displayPalletLandTable(dataService) {
  const dataFullness = dataService.getDataFullness();
  const tbody = document.getElementById('pallet-land-table-body');
  
  if (!tbody) {
    console.warn('[Pallet Land] Tabla no encontrada');
    return;
  }
  
  tbody.innerHTML = '';
  
  // Función auxiliar para obtener datos de una zona
  function getZoneData(zoneKey) {
    const zone = dataFullness[zoneKey];
    if (!zone || !zone.datos) {
      return null;
    }
    return zone.datos;
  }
  
  // Función auxiliar para formatear fullness con 2 decimales
  function formatFullnessCell(value) {
    if (value === null || value === undefined) return '<td class="empty-cell">-</td>';
    const percentage = (value * 100).toFixed(2);
    const parts = percentage.split('.');
    return `<td class="percentage-cell">${parts[0]}.<span class="fullness-decimals">${parts[1]}</span>%</td>`;
  }
  
  // Zonas de Pallet Land
  const zones = [
    { key: 'Pallet-Land-TL', label: 'Team Lift' },
    { key: 'Pallet-Land-PetFood', label: 'Pet Food' }
  ];
  
  zones.forEach(zone => {
    const data = getZoneData(zone.key);
    
    if (!data) {
      return; // Saltar si no hay datos
    }
    
    const row = document.createElement('tr');
    let rowHTML = `<td>${zone.label}</td>`;
    
    // Fullness
    rowHTML += formatFullnessCell(data.fullness);
    
    // Total Bins
    if (data.total_bins !== undefined) {
      rowHTML += `<td>${data.total_bins.toLocaleString()}</td>`;
    } else {
      rowHTML += '<td class="empty-cell">-</td>';
    }
    
    // Occupied Bins
    if (data.occupied_bins !== undefined) {
      rowHTML += `<td>${data.occupied_bins.toLocaleString()}</td>`;
    } else {
      rowHTML += '<td class="empty-cell">-</td>';
    }
    
    // Empty Bins
    if (data.empty_bins !== undefined) {
      rowHTML += `<td>${data.empty_bins.toLocaleString()}</td>`;
    } else {
      rowHTML += '<td class="empty-cell">-</td>';
    }
    
    row.innerHTML = rowHTML;
    tbody.appendChild(row);
  });
}

function setupTableNavigation() {
  const navButtons = document.querySelectorAll('.table-nav-btn');
  const tableContainers = {
    'pick-tower': document.getElementById('pick-tower-table-container'),
    'high-rack': document.getElementById('high-rack-table-container'),
    'pallet-land': document.getElementById('pallet-land-table-container')
  };
  
  // Contenedores de Zone 1 y Zone 2 (solo se muestran con Pick Tower)
  const zone1Separator = document.querySelector('.section-separator');
  const zone1TablesContainer = zone1Separator ? zone1Separator.nextElementSibling : null;
  const zone2Separator = document.querySelectorAll('.section-separator')[1];
  const zone2TablesContainer = zone2Separator ? zone2Separator.nextElementSibling : null;
  
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTable = btn.getAttribute('data-table');
      
      // Remover clase active de todos los botones
      navButtons.forEach(b => b.classList.remove('active'));
      
      // Agregar clase active al botón clickeado
      btn.classList.add('active');
      
      // Ocultar todas las tablas principales
      Object.values(tableContainers).forEach(container => {
        if (container) {
          container.style.display = 'none';
        }
      });
      
      // Mostrar la tabla seleccionada
      if (tableContainers[targetTable]) {
        tableContainers[targetTable].style.display = 'block';
      }
      
      // Mostrar/ocultar tablas de Zone 1 y Zone 2 solo si es Pick Tower
      if (targetTable === 'pick-tower') {
        // Mostrar separadores y tablas de Zone 1 y Zone 2
        if (zone1Separator) zone1Separator.style.display = 'block';
        if (zone1TablesContainer) zone1TablesContainer.style.display = 'flex';
        if (zone2Separator) zone2Separator.style.display = 'block';
        if (zone2TablesContainer) zone2TablesContainer.style.display = 'flex';
      } else {
        // Ocultar separadores y tablas de Zone 1 y Zone 2
        if (zone1Separator) zone1Separator.style.display = 'none';
        if (zone1TablesContainer) zone1TablesContainer.style.display = 'none';
        if (zone2Separator) zone2Separator.style.display = 'none';
        if (zone2TablesContainer) zone2TablesContainer.style.display = 'none';
      }
    });
  });
}

function displayZone1Table(dataService) {
  const dataFullness = dataService.getDataFullness();
  const tbody = document.getElementById('zone1-table-body');
  const shelfTbody = document.getElementById('zone1-shelf-table-body');
  
  if (!tbody || !shelfTbody) {
    console.warn('[Zone 1] Tablas no encontradas');
    return;
  }
  
  tbody.innerHTML = '';
  shelfTbody.innerHTML = '';
  
  // Función auxiliar para obtener fullness de una zona
  function getFullness(zoneKey) {
    const zone = dataFullness[zoneKey];
    if (!zone || !zone.datos || zone.datos.fullness === undefined) {
      return null;
    }
    return zone.datos.fullness;
  }
  
  // Función auxiliar para obtener datos completos de una zona (para PalletSingle)
  function getZoneData(zoneKey) {
    const zone = dataFullness[zoneKey];
    if (!zone || !zone.datos) {
      return null;
    }
    return zone.datos;
  }
  
  // Función auxiliar para formatear fullness con 2 decimales
  function formatFullnessCell(value) {
    if (value === null || value === undefined) return '<td class="empty-cell">-</td>';
    const percentage = (value * 100).toFixed(2);
    const parts = percentage.split('.');
    return `<td class="percentage-cell">${parts[0]}.<span class="fullness-decimals">${parts[1]}</span>%</td>`;
  }
  
  // Procesar cada floor (1-5) solo si tiene datos de Z1
  for (let floor = 1; floor <= 5; floor++) {
    const floorPrefix = `P${floor}`;
    const zone1Key = `${floorPrefix}-Z1`;
    
    // Verificar si existe Zone 1 para este floor
    const zone1Fullness = getFullness(zone1Key);
    if (zone1Fullness === null) {
      // No hay datos de Z1 para este floor, saltar
      continue;
    }
    
    // Obtener datos de cada categoría para Zone 1
    const zone1 = getFullness(`${floorPrefix}-Z1`);
    const library = getFullness(`${floorPrefix}-Z1-Library`);
    const vertical = getFullness(`${floorPrefix}-Z1-Vertical`);
    const barrel = getFullness(`${floorPrefix}-Z1-Barrel`);
    const batBin = getFullness(`${floorPrefix}-Z1-BatBin`);
    const floorPallet = getFullness(`${floorPrefix}-Z1-FloorPallet`);
    const palletSingleData = getZoneData(`${floorPrefix}-Z1-PalletSingle`);
    
    // Crear la fila de la tabla principal
    const row = document.createElement('tr');
    let rowHTML = `<td>P${floor}</td>`;
    
    // Zone 1
    rowHTML += formatFullnessCell(zone1);
    
    // Library
    rowHTML += formatFullnessCell(library);
    
    // Vertical (Half-Vertical)
    rowHTML += formatFullnessCell(vertical);
    
    // Barrel
    rowHTML += formatFullnessCell(barrel);
    
    // BatBin
    rowHTML += formatFullnessCell(batBin);
    
    // FloorPallet
    rowHTML += formatFullnessCell(floorPallet);
    
    // PalletSingle (mostrar fullness y empty_bins/total_bins en la misma línea)
    if (palletSingleData && palletSingleData.fullness !== undefined) {
      const percentage = (palletSingleData.fullness * 100).toFixed(2);
      const parts = percentage.split('.');
      const emptyBins = palletSingleData.empty_bins || 0;
      const totalBins = palletSingleData.total_bins || 0;
      rowHTML += `<td class="percentage-cell">
        ${parts[0]}.<span class="fullness-decimals">${parts[1]}</span>% <span class="pallet-single-ratio">${emptyBins} / ${totalBins}</span>
      </td>`;
    } else {
      rowHTML += `<td class="empty-cell">-</td>`;
    }
    
    row.innerHTML = rowHTML;
    tbody.appendChild(row);
    
    // Crear la fila de la tabla Library Shelf
    const shelfRow = document.createElement('tr');
    let shelfRowHTML = '';
    
    // Obtener datos de Library Shelf A, B, C, D
    const libraryA = getFullness(`${floorPrefix}-Z1-Library-A`);
    const libraryB = getFullness(`${floorPrefix}-Z1-Library-B`);
    const libraryC = getFullness(`${floorPrefix}-Z1-Library-C`);
    const libraryD = getFullness(`${floorPrefix}-Z1-Library-D`);
    
    shelfRowHTML += formatFullnessCell(libraryA);
    shelfRowHTML += formatFullnessCell(libraryB);
    shelfRowHTML += formatFullnessCell(libraryC);
    shelfRowHTML += formatFullnessCell(libraryD);
    
    shelfRow.innerHTML = shelfRowHTML;
    shelfTbody.appendChild(shelfRow);
  }
}

function displayZone2Table(dataService) {
  const dataFullness = dataService.getDataFullness();
  const tbody = document.getElementById('zone2-table-body');
  const shelfTbody = document.getElementById('zone2-shelf-table-body');
  
  if (!tbody || !shelfTbody) {
    console.warn('[Zone 2] Tablas no encontradas');
    return;
  }
  
  tbody.innerHTML = '';
  shelfTbody.innerHTML = '';
  
  // Función auxiliar para obtener fullness de una zona
  function getFullness(zoneKey) {
    const zone = dataFullness[zoneKey];
    if (!zone || !zone.datos || zone.datos.fullness === undefined) {
      return null;
    }
    return zone.datos.fullness;
  }
  
  // Función auxiliar para obtener datos completos de una zona (para PalletSingle)
  function getZoneData(zoneKey) {
    const zone = dataFullness[zoneKey];
    if (!zone || !zone.datos) {
      return null;
    }
    return zone.datos;
  }
  
  // Función auxiliar para formatear fullness con 2 decimales
  function formatFullnessCell(value) {
    if (value === null || value === undefined) return '<td class="empty-cell">-</td>';
    const percentage = (value * 100).toFixed(2);
    const parts = percentage.split('.');
    return `<td class="percentage-cell">${parts[0]}.<span class="fullness-decimals">${parts[1]}</span>%</td>`;
  }
  
  // Procesar cada floor (1-5) solo si tiene datos de Z2
  for (let floor = 1; floor <= 5; floor++) {
    const floorPrefix = `P${floor}`;
    const zone2Key = `${floorPrefix}-Z2`;
    
    // Verificar si existe Zone 2 para este floor
    const zone2Fullness = getFullness(zone2Key);
    if (zone2Fullness === null) {
      // No hay datos de Z2 para este floor, saltar
      continue;
    }
    
    // Obtener datos de cada categoría para Zone 2
    const zone2 = getFullness(`${floorPrefix}-Z2`);
    const library = getFullness(`${floorPrefix}-Z2-Library`);
    const vertical = getFullness(`${floorPrefix}-Z2-Vertical`);
    const barrel = getFullness(`${floorPrefix}-Z2-Barrel`);
    const batBin = getFullness(`${floorPrefix}-Z2-BatBin`);
    const floorPallet = getFullness(`${floorPrefix}-Z2-FloorPallet`);
    const palletSingleData = getZoneData(`${floorPrefix}-Z2-PalletSingle`);
    
    // Crear la fila de la tabla principal
    const row = document.createElement('tr');
    let rowHTML = `<td>P${floor}</td>`;
    
    // Zone 2
    rowHTML += formatFullnessCell(zone2);
    
    // Library
    rowHTML += formatFullnessCell(library);
    
    // Vertical (Half-Vertical)
    rowHTML += formatFullnessCell(vertical);
    
    // Barrel
    rowHTML += formatFullnessCell(barrel);
    
    // BatBin
    rowHTML += formatFullnessCell(batBin);
    
    // FloorPallet
    rowHTML += formatFullnessCell(floorPallet);
    
    // PalletSingle (mostrar fullness y empty_bins/total_bins en la misma línea)
    if (palletSingleData && palletSingleData.fullness !== undefined) {
      const percentage = (palletSingleData.fullness * 100).toFixed(2);
      const parts = percentage.split('.');
      const emptyBins = palletSingleData.empty_bins || 0;
      const totalBins = palletSingleData.total_bins || 0;
      rowHTML += `<td class="percentage-cell">
        ${parts[0]}.<span class="fullness-decimals">${parts[1]}</span>% <span class="pallet-single-ratio">${emptyBins} / ${totalBins}</span>
      </td>`;
    } else {
      rowHTML += `<td class="empty-cell">-</td>`;
    }
    
    row.innerHTML = rowHTML;
    tbody.appendChild(row);
    
    // Crear la fila de la tabla Library Shelf
    const shelfRow = document.createElement('tr');
    let shelfRowHTML = '';
    
    // Obtener datos de Library Shelf A, B, C, D
    const libraryA = getFullness(`${floorPrefix}-Z2-Library-A`);
    const libraryB = getFullness(`${floorPrefix}-Z2-Library-B`);
    const libraryC = getFullness(`${floorPrefix}-Z2-Library-C`);
    const libraryD = getFullness(`${floorPrefix}-Z2-Library-D`);
    
    shelfRowHTML += formatFullnessCell(libraryA);
    shelfRowHTML += formatFullnessCell(libraryB);
    shelfRowHTML += formatFullnessCell(libraryC);
    shelfRowHTML += formatFullnessCell(libraryD);
    
    shelfRow.innerHTML = shelfRowHTML;
    shelfTbody.appendChild(shelfRow);
  }
}

async function loadBintypeIcons() {
  /**
   * Carga los SVG de los tipos de bin en los iconos de la tabla
   */
  const bintypeIcons = {
    'library-icon': 'assets/svg/Bintypes/Library.svg',
    'vertical-icon': 'assets/svg/Bintypes/Half-Vertical.svg',
    'barrel-icon': 'assets/svg/Bintypes/Barrel.svg',
    'batbin-icon': 'assets/svg/Bintypes/Bat-Bin.svg',
    'floor-pallet-icon': 'assets/svg/Bintypes/Floor-pallet.svg',
    'pallet-single-icon': 'assets/svg/Bintypes/Pallet_single.svg',
    // Iconos para Zone 1
    'zone1-library-icon': 'assets/svg/Bintypes/Library.svg',
    'zone1-vertical-icon': 'assets/svg/Bintypes/Half-Vertical.svg',
    'zone1-barrel-icon': 'assets/svg/Bintypes/Barrel.svg',
    'zone1-batbin-icon': 'assets/svg/Bintypes/Bat-Bin.svg',
    'zone1-floor-pallet-icon': 'assets/svg/Bintypes/Floor-pallet.svg',
    'zone1-pallet-single-icon': 'assets/svg/Bintypes/Pallet_single.svg',
    // Iconos para Zone 2
    'zone2-library-icon': 'assets/svg/Bintypes/Library.svg',
    'zone2-vertical-icon': 'assets/svg/Bintypes/Half-Vertical.svg',
    'zone2-barrel-icon': 'assets/svg/Bintypes/Barrel.svg',
    'zone2-batbin-icon': 'assets/svg/Bintypes/Bat-Bin.svg',
    'zone2-floor-pallet-icon': 'assets/svg/Bintypes/Floor-pallet.svg',
    'zone2-pallet-single-icon': 'assets/svg/Bintypes/Pallet_single.svg'
  };
  
  // Verificar que el API esté disponible
  if (!window.api || !window.api.readFile) {
    console.warn('[Bintype Icons] API readFile no disponible');
    return;
  }
  
  // Cargar cada icono
  for (const [iconId, svgPath] of Object.entries(bintypeIcons)) {
    try {
      const iconElement = document.getElementById(iconId);
      if (!iconElement) {
        console.warn(`[Bintype Icons] Elemento ${iconId} no encontrado`);
        continue;
      }
      
      const result = await window.api.readFile(svgPath);
      if (result.success && result.content) {
        // Insertar el SVG en el elemento
        iconElement.innerHTML = result.content;
        
        // El CSS ya maneja el tamaño (40x40px), solo asegurar que el SVG sea responsive
        const svgElement = iconElement.querySelector('svg');
        if (svgElement) {
          // Mantener el viewBox original pero hacer el SVG responsive
          if (!svgElement.getAttribute('viewBox') && svgElement.getAttribute('width') && svgElement.getAttribute('height')) {
            const width = svgElement.getAttribute('width');
            const height = svgElement.getAttribute('height');
            svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
          }
          // El CSS ya establece width y height al 100%, así que removemos los atributos fijos
          svgElement.removeAttribute('width');
          svgElement.removeAttribute('height');
        }
        
        console.log(`[Bintype Icons] ✓ Cargado: ${iconId}`);
      } else {
        console.warn(`[Bintype Icons] ✗ Error cargando ${svgPath}:`, result.error);
      }
    } catch (error) {
      console.error(`[Bintype Icons] Error cargando ${iconId}:`, error);
    }
  }
}

async function loadKpiIcons() {
  /**
   * Carga los SVG de los KPIs
   */
  const kpiIcons = {
    'kpi-icon-fullness': 'assets/svg/Space_Svg/Fullness.svg',
    'kpi-icon-units': 'assets/svg/Space_Svg/Units.svg',
    'kpi-icon-bins': 'assets/svg/Space_Svg/Bins.svg',
    'kpi-icon-heatmap-pt': 'assets/svg/Space_Svg/Heatmap_PT.svg',
    'kpi-icon-heatmap-hrk-pl': 'assets/svg/Space_Svg/Heatmap_HRK_PL.svg'
  };
  
  // Verificar que el API esté disponible
  if (!window.api || !window.api.readFile) {
    console.warn('[KPI Icons] API readFile no disponible');
    return;
  }
  
  // Cargar cada icono
  for (const [iconId, svgPath] of Object.entries(kpiIcons)) {
    try {
      const iconElement = document.getElementById(iconId);
      if (!iconElement) {
        console.warn(`[KPI Icons] Elemento ${iconId} no encontrado`);
        continue;
      }
      
      const result = await window.api.readFile(svgPath);
      if (result.success && result.content) {
        // Insertar el SVG en el elemento
        iconElement.innerHTML = result.content;
        
        // El CSS ya maneja el tamaño del kpi-icon, hacer el SVG responsive
        const svgElement = iconElement.querySelector('svg');
        if (svgElement) {
          // Mantener el viewBox original pero hacer el SVG responsive
          if (!svgElement.getAttribute('viewBox') && svgElement.getAttribute('width') && svgElement.getAttribute('height')) {
            const width = svgElement.getAttribute('width');
            const height = svgElement.getAttribute('height');
            svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
          }
          // El CSS ya establece width y height al 100%, así que removemos los atributos fijos
          svgElement.removeAttribute('width');
          svgElement.removeAttribute('height');
        }
        
        console.log(`[KPI Icons] ✓ Cargado: ${iconId}`);
      } else {
        console.warn(`[KPI Icons] ✗ Error cargando ${svgPath}:`, result.error);
      }
    } catch (error) {
      console.error(`[KPI Icons] Error cargando ${iconId}:`, error);
    }
  }
}

async function loadBannerIcon() {
  /**
   * Carga el SVG del banner en el header
   */
  const bannerElement = document.getElementById('header-banner-icon');
  if (!bannerElement) {
    console.warn('[Banner Icon] Elemento header-banner-icon no encontrado');
    return;
  }
  
  // Verificar que el API esté disponible
  if (!window.api || !window.api.readFile) {
    console.warn('[Banner Icon] API readFile no disponible');
    return;
  }
  
  try {
    const result = await window.api.readFile('assets/svg/Space_Svg/Banner.svg');
    if (result.success && result.content) {
      // Insertar el SVG en el elemento
      bannerElement.innerHTML = result.content;
      
      // Hacer el SVG responsive
      const svgElement = bannerElement.querySelector('svg');
      if (svgElement) {
        // Mantener el viewBox original pero hacer el SVG responsive
        if (!svgElement.getAttribute('viewBox') && svgElement.getAttribute('width') && svgElement.getAttribute('height')) {
          const width = svgElement.getAttribute('width');
          const height = svgElement.getAttribute('height');
          svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }
        // El contenedor ya tiene width y height definidos, hacer el SVG responsive
        svgElement.removeAttribute('width');
        svgElement.removeAttribute('height');
        svgElement.style.width = '100%';
        svgElement.style.height = '100%';
      }
      
      console.log('[Banner Icon] ✓ Cargado');
    } else {
      console.warn('[Banner Icon] ✗ Error cargando Banner.svg:', result.error);
    }
  } catch (error) {
    console.error('[Banner Icon] Error cargando:', error);
  }
}

function setupHeatmapButtons() {
  const heatmapButtons = document.querySelectorAll('.kpi-heatmap-btn');
  
  heatmapButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const heatmapType = btn.getAttribute('data-heatmap');
      openHeatmap(heatmapType);
    });
  });
  
  // Configurar modal de heatmap
  setupHeatmapModal();
  
  console.log('[Heatmaps] Botones configurados:', heatmapButtons.length);
}

async function openHeatmap(heatmapType) {
  console.log('[Heatmaps] Abriendo heatmap:', heatmapType);
  
  const modal = document.getElementById('heatmap-modal');
  const viewer = document.getElementById('heatmap-viewer');
  const title = document.getElementById('heatmap-modal-title');
  
  if (!modal || !viewer) {
    console.error('[Heatmaps] Modal o viewer no encontrado');
    return;
  }
  
  // Determinar qué archivo SVG cargar según el tipo
  let svgFileName = null;
  let displayTitle = '';
  
  if (heatmapType.startsWith('pick-tower-p')) {
    const floor = heatmapType.replace('pick-tower-', '').toUpperCase();
    svgFileName = `${floor}_heatmap.svg`;
    displayTitle = `Heatmap Pick Tower - ${floor}`;
  } else if (heatmapType === 'high-rack') {
    svgFileName = 'HRK_heatmap.svg';
    displayTitle = 'Heatmap High Rack';
  } else if (heatmapType === 'pallet-land') {
    svgFileName = 'PL_heatmap.svg';
    displayTitle = 'Heatmap Pallet Land';
  }
  
  if (!svgFileName) {
    alert(`Tipo de heatmap no reconocido: ${heatmapType}`);
    return;
  }
  
  // Actualizar título
  title.textContent = displayTitle;
  
  // Limpiar viewer
  viewer.innerHTML = '<div class="loading-heatmap">Cargando heatmap...</div>';
  
  // Mostrar modal
  modal.style.display = 'flex';
  
  // Cargar SVG
  try {
    const userDataPath = await window.api.getUserDataPath();
    console.log('[Heatmaps] UserDataPath:', userDataPath);
    
    // Construir ruta usando path.join equivalente (normalizar separadores)
    // Detectar Windows por la presencia de backslash o formato C:\
    const isWindows = userDataPath.includes('\\') || /^[A-Za-z]:/.test(userDataPath);
    const pathSeparator = isWindows ? '\\' : '/';
    const svgPath = `${userDataPath}${pathSeparator}data${pathSeparator}space-heatmap${pathSeparator}heatmaps${pathSeparator}${svgFileName}`;
    
    // Asegurar que la ruta esté normalizada (sin dobles separadores, etc.)
    const normalizedPath = svgPath.replace(/[\\/]+/g, pathSeparator);
    
    console.log('[Heatmaps] Intentando cargar SVG desde:', normalizedPath);
    console.log('[Heatmaps] Archivo esperado:', svgFileName);
    console.log('[Heatmaps] Detección Windows:', isWindows);
    
    // Usar readFileAbsolute para rutas absolutas desde userData
    const result = await window.api.readFileAbsolute(normalizedPath);
    
    console.log('[Heatmaps] Resultado de readFile:', {
      success: result.success,
      hasContent: !!result.content,
      error: result.error,
      contentLength: result.content ? result.content.length : 0
    });
    
    if (result.success && result.content) {
      console.log('[Heatmaps] SVG cargado exitosamente, insertando en viewer...');
      console.log('[Heatmaps] Tamaño del contenido:', result.content.length, 'caracteres');
      
      // Limpiar viewer primero
      viewer.innerHTML = '';
      
      // Crear un contenedor temporal para parsear el SVG
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = result.content;
      
      // Obtener el elemento SVG
      const svgElement = tempDiv.querySelector('svg');
      
      if (svgElement) {
        // Agregar clase para estilos
        svgElement.classList.add('heatmap-svg');
        
        // Asegurar que el SVG se ajuste al contenedor sin barras de desplazamiento
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', '100%');
        
        // Insertar el SVG en el viewer
        viewer.appendChild(svgElement);
        
        console.log('[Heatmaps] SVG insertado en el DOM');
        
        // Inicializar controles interactivos después de un pequeño delay para asegurar que el DOM esté listo
        setTimeout(() => {
          initializeHeatmapControls(viewer);
          setupHoverInteractivity(viewer);
          updateHeatmapStats(viewer, 0);
          console.log('[Heatmaps] Heatmap inicializado correctamente');
        }, 100);
      } else {
        console.error('[Heatmaps] No se encontró elemento SVG en el contenido');
        viewer.innerHTML = `<div class="error-heatmap">Error: El archivo SVG no tiene un formato válido</div>`;
      }
    } else {
      const errorMsg = result.error || 'Archivo no encontrado';
      console.error('[Heatmaps] Error al cargar:', errorMsg);
      viewer.innerHTML = `<div class="error-heatmap">Error al cargar el heatmap: ${errorMsg}<br><small>Ruta intentada: ${svgPath}</small></div>`;
    }
  } catch (error) {
    console.error('[Heatmaps] Excepción al cargar SVG:', error);
    viewer.innerHTML = `<div class="error-heatmap">Error al cargar el heatmap: ${error.message}<br><small>${error.stack}</small></div>`;
  }
}

function initializeHeatmapControls(viewer) {
  const showLockedCheckbox = document.getElementById('show-locked-bins');
  const bestZonesMode = document.getElementById('best-zones-mode');
  const binTypeFilter = document.getElementById('bin-type-filter');
  const fullnessFilter = document.getElementById('fullness-filter');
  const fullnessRange = document.getElementById('fullness-range');
  const fullnessRangeValue = document.getElementById('fullness-range-value');
  const resetBtn = document.getElementById('reset-heatmap-filters');
  
  if (!viewer) return;
  
  // Función para aplicar filtros
  function applyFilters() {
    const showLocked = showLockedCheckbox ? showLockedCheckbox.checked : true;
    const bestZones = bestZonesMode ? bestZonesMode.checked : false;
    const binType = binTypeFilter ? binTypeFilter.value : 'all';
    const filterType = fullnessFilter ? fullnessFilter.value : 'all';
    const minFullness = fullnessRange ? parseFloat(fullnessRange.value) / 100 : 0;
    
    const elements = viewer.querySelectorAll('[data-fullness]');
    let visibleCount = 0;
    let lowFullnessCount = 0;
    
    elements.forEach(elem => {
      const fullness = parseFloat(elem.getAttribute('data-fullness')) || 0;
      const isLocked = elem.getAttribute('data-locked') === 'true';
      const binTypePrimary = elem.getAttribute('data-bin-type-primary') || '';
      const binTypes = elem.getAttribute('data-bin-types') || '';
      
      // Determinar si debe mostrarse según filtros
      let shouldShow = true;
      let isLowFullness = fullness <= 0.60 && !isLocked;
      
      // Filtro de bins bloqueadas
      if (isLocked && !showLocked) {
        shouldShow = false;
      }
      
      // Filtro por tipo de bin
      if (shouldShow && binType !== 'all') {
        // Normalizar nombres de bin types para comparación
        // Mapeo de nombres del filtro a nombres del CSV
        const binTypeMap = {
          'HALF-VERTICAL': ['HALF-VERTICAL', 'VERTICAL'],
          'LIBRARY-DEEP': ['LIBRARY-DEEP', 'LIBRARY'],
          'BARREL': ['BARREL'],
          'BATBIN': ['BATBIN'],
          'FLOOR-PALLET': ['FLOOR-PALLET', 'FLOORPALLET'],
          'PALLET-SINGLE': ['PALLET-SINGLE', 'PALLETSINGLE']
        };
        
        const normalizedBinType = binType.toUpperCase();
        const normalizedPrimary = binTypePrimary.toUpperCase();
        const normalizedAll = binTypes.toUpperCase();
        
        // Obtener variantes posibles del tipo de bin
        const possibleNames = binTypeMap[normalizedBinType] || [normalizedBinType];
        
        // Verificar si el tipo coincide con el filtro
        const matches = possibleNames.some(name => 
          normalizedPrimary.includes(name) || 
          normalizedAll.includes(name) ||
          name.includes(normalizedPrimary)
        );
        
        if (!matches) {
          shouldShow = false;
        }
      }
      
      // Filtro por tipo de fullness
      if (shouldShow && filterType !== 'all') {
        const clase = elem.getAttribute('class') || '';
        if (filterType === 'low' && !clase.includes('fullness-low')) shouldShow = false;
        else if (filterType === 'medium' && !clase.includes('fullness-medium')) shouldShow = false;
        else if (filterType === 'high' && !clase.includes('fullness-high')) shouldShow = false;
        else if (filterType === 'very-high' && !clase.includes('fullness-very-high')) shouldShow = false;
      }
      
      // Filtro por rango mínimo de fullness
      if (shouldShow && fullness < minFullness) {
        shouldShow = false;
      }
      
      // Aplicar visibilidad y efectos visuales
      if (shouldShow) {
        elem.style.display = '';
        
        // Modo "Mejores Zonas": resaltar zonas con bajo fullness
        if (bestZones && isLowFullness) {
          elem.style.opacity = '1';
          elem.style.stroke = '#00ff00';
          elem.style.strokeWidth = '3';
          elem.style.strokeDasharray = '5,5';
          elem.classList.add('best-zone-highlight');
          lowFullnessCount++;
        } else {
          elem.style.opacity = '1';
          elem.style.stroke = '';
          elem.style.strokeWidth = '';
          elem.style.strokeDasharray = '';
          elem.classList.remove('best-zone-highlight');
        }
        
        visibleCount++;
      } else {
        elem.style.display = 'none';
        elem.classList.remove('best-zone-highlight');
      }
    });
    
    // Actualizar estadísticas
    updateHeatmapStats(viewer, lowFullnessCount);
  }
  
  // Event listeners
  if (showLockedCheckbox) {
    showLockedCheckbox.addEventListener('change', applyFilters);
  }
  
  if (bestZonesMode) {
    bestZonesMode.addEventListener('change', applyFilters);
  }
  
  if (binTypeFilter) {
    binTypeFilter.addEventListener('change', applyFilters);
  }
  
  if (fullnessFilter) {
    fullnessFilter.addEventListener('change', applyFilters);
  }
  
  if (fullnessRange) {
    fullnessRange.addEventListener('input', (e) => {
      if (fullnessRangeValue) {
        fullnessRangeValue.textContent = `${e.target.value}%`;
      }
      applyFilters();
    });
  }
  
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (showLockedCheckbox) showLockedCheckbox.checked = true;
      if (bestZonesMode) bestZonesMode.checked = false;
      if (binTypeFilter) binTypeFilter.value = 'all';
      if (fullnessFilter) fullnessFilter.value = 'all';
      if (fullnessRange) {
        fullnessRange.value = 0;
        if (fullnessRangeValue) fullnessRangeValue.textContent = '0%';
      }
      applyFilters();
    });
  }
  
  // Aplicar filtros iniciales
  applyFilters();
}

function updateHeatmapStats(viewer, lowFullnessCount = 0) {
  if (!viewer) return;
  
  const elements = viewer.querySelectorAll('[data-fullness]');
  const visibleElements = Array.from(elements).filter(e => e.style.display !== 'none');
  const lockedElements = Array.from(elements).filter(e => e.getAttribute('data-locked') === 'true');
  
  const totalEl = document.getElementById('total-elements');
  const visibleEl = document.getElementById('visible-elements');
  const lockedEl = document.getElementById('locked-elements');
  const lowFullnessEl = document.getElementById('low-fullness-count');
  
  if (totalEl) totalEl.textContent = `Total: ${elements.length}`;
  if (visibleEl) visibleEl.textContent = `Visibles: ${visibleElements.length}`;
  if (lockedEl) lockedEl.textContent = `Bloqueadas: ${lockedElements.length}`;
  if (lowFullnessEl) lowFullnessEl.textContent = `Zonas bajas (≤60%): ${lowFullnessCount}`;
}

/**
 * Configura la interactividad de hover para mostrar información del pasillo
 */
function setupHoverInteractivity(viewer) {
  if (!viewer) return;
  
  const svg = viewer.querySelector('svg');
  if (!svg) return;
  
  const aisleNumberEl = document.getElementById('aisle-number');
  const hoverInfoPlaceholder = document.querySelector('.hover-info-placeholder');
  const hoverInfoContent = document.getElementById('hover-info-content');
  const hoverAisle = document.getElementById('hover-aisle');
  const hoverAisleFullness = document.getElementById('hover-aisle-fullness');
  const hoverBayFullness = document.getElementById('hover-bay-fullness');
  const hoverBinType = document.getElementById('hover-bin-type');
  
  // Cache para almacenar fullness por pasillo (para optimización)
  const aisleFullnessCache = {};
  
  /**
   * Extrae el número de pasillo del ID del elemento
   * Ejemplos:
   * - P3-288A460 → 288
   * - P1-294A200 → 294
   * - HRK-250A200 → 250
   */
  function extractAisleNumber(bayId) {
    if (!bayId) return null;
    
    // Formato: P{floor}-{aisle}A{altura} o HRK-{aisle}A{altura}
    const match = bayId.match(/(?:P\d+-|HRK-|PL-)(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }
  
  /**
   * Calcula el fullness promedio de un pasillo
   */
  function calculateAisleFullness(aisleNumber) {
    if (aisleFullnessCache[aisleNumber] !== undefined) {
      return aisleFullnessCache[aisleNumber];
    }
    
    const elements = Array.from(svg.querySelectorAll('[data-fullness]'));
    const aisleElements = elements.filter(elem => {
      const bayId = elem.getAttribute('data-bay-id');
      const elemAisle = extractAisleNumber(bayId);
      return elemAisle === aisleNumber;
    });
    
    if (aisleElements.length === 0) {
      aisleFullnessCache[aisleNumber] = null;
      return null;
    }
    
    const fullnessSum = aisleElements.reduce((sum, elem) => {
      const fullness = parseFloat(elem.getAttribute('data-fullness')) || 0;
      return sum + fullness;
    }, 0);
    
    const avgFullness = fullnessSum / aisleElements.length;
    aisleFullnessCache[aisleNumber] = avgFullness;
    return avgFullness;
  }
  
  /**
   * Formatea un valor de fullness como porcentaje
   */
  function formatFullness(fullness) {
    if (fullness === null || fullness === undefined) return '—';
    return `${(fullness * 100).toFixed(1)}%`;
  }
  
  /**
   * Maneja el evento hover sobre un elemento
   */
  function handleElementHover(elem) {
    const bayId = elem.getAttribute('data-bay-id');
    const bayFullness = parseFloat(elem.getAttribute('data-fullness')) || 0;
    const binType = elem.getAttribute('data-bin-type-primary') || 'N/A';
    
    const aisleNumber = extractAisleNumber(bayId);
    
    if (aisleNumber !== null) {
      // Mostrar número de pasillo arriba
      if (aisleNumberEl) {
        aisleNumberEl.textContent = aisleNumber;
        aisleNumberEl.classList.add('has-value');
      }
      
      // Calcular fullness del pasillo
      const aisleFullness = calculateAisleFullness(aisleNumber);
      
      // Mostrar información detallada abajo
      if (hoverInfoPlaceholder) hoverInfoPlaceholder.style.display = 'none';
      if (hoverInfoContent) hoverInfoContent.style.display = 'flex';
      
      if (hoverAisle) hoverAisle.textContent = aisleNumber;
      if (hoverAisleFullness) hoverAisleFullness.textContent = formatFullness(aisleFullness);
      if (hoverBayFullness) hoverBayFullness.textContent = formatFullness(bayFullness);
      if (hoverBinType) hoverBinType.textContent = binType;
    }
  }
  
  /**
   * Maneja cuando el mouse sale del elemento
   */
  function handleElementLeave() {
    if (aisleNumberEl) {
      aisleNumberEl.textContent = '—';
      aisleNumberEl.classList.remove('has-value');
    }
    
    if (hoverInfoPlaceholder) hoverInfoPlaceholder.style.display = 'flex';
    if (hoverInfoContent) hoverInfoContent.style.display = 'none';
  }
  
  // Agregar event listeners a todos los elementos con data-fullness
  const elements = svg.querySelectorAll('[data-fullness]');
  
  elements.forEach(elem => {
    elem.addEventListener('mouseenter', () => handleElementHover(elem));
    elem.addEventListener('mouseleave', handleElementLeave);
  });
  
  // Limpiar cache cuando se aplican filtros (se recalculará)
  const originalApplyFilters = window.__originalApplyFilters;
  if (!originalApplyFilters) {
    // Guardar referencia para limpiar cache cuando sea necesario
    window.__clearAisleCache = () => {
      Object.keys(aisleFullnessCache).forEach(key => delete aisleFullnessCache[key]);
    };
  }
  
  console.log('[Heatmaps] Hover interactivity configurado para', elements.length, 'elementos');
}

// Cerrar modal de heatmap
function setupHeatmapModal() {
  const modal = document.getElementById('heatmap-modal');
  const closeBtn = document.getElementById('close-heatmap-modal-btn');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
    });
  }
  
  // Cerrar al hacer clic fuera del modal
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }
}

// Función para inicializar la aplicación
function initializeSpaceHeatmap() {
  console.log("🔧 Inicializando Space Heatmap...");
  initSpaceHeatmap();
  // Cargar banner inmediatamente
  loadBannerIcon();
  // Intentar cargar datos al iniciar
  loadAndDisplayData();
}

// Inicializar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initializeSpaceHeatmap();
  });
} else {
  initializeSpaceHeatmap();
}

// También escuchar eventos del router para cuando se navega de vuelta a esta app
window.addEventListener("app:ready", (event) => {
  console.log("📢 Evento app:ready recibido:", event.detail);
  if (event.detail && event.detail.app === "space-heatmap") {
    console.log("🔄 Space Heatmap cargada de nuevo, reinicializando...");
    // Pequeño delay para asegurar que el DOM esté completamente listo
    setTimeout(() => {
      initializeSpaceHeatmap();
    }, 300);
  }
});

// También escuchar el evento app:loaded por si acaso
window.addEventListener("app:loaded", (event) => {
  console.log("📢 Evento app:loaded recibido:", event.detail);
  if (event.detail && event.detail.app === "space-heatmap") {
    console.log("🔄 Space Heatmap cargada, reinicializando datos...");
    // Pequeño delay para asegurar que el DOM esté completamente listo
    setTimeout(() => {
      // Solo recargar datos, no reinicializar todo (para evitar duplicar listeners)
      loadBannerIcon();
      loadAndDisplayData();
    }, 300);
  }
});
