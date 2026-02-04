async function checkFileAge() {
  try {
    if (!window.api || !window.api.getConfig || !window.api.readJson) {
      console.warn("APIs no disponibles. Por favor, reinicia la aplicación.");
      return { exists: false, needsRestart: true };
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout al verificar archivo")), 10000)
    );

    const checkPromise = (async () => {
      const config = await window.api.getConfig();
      const spacePaths = config?.Space_paths;
      if (!spacePaths || !Array.isArray(spacePaths) || spacePaths.length === 0) {
        return { exists: false, error: "Space_paths no configurado" };
      }

      const basePath = spacePaths[0].replace(/[/\\]+$/, "");
      const updateFilePath = `${basePath}/last_update.json`;

      const result = await window.api.readJson(updateFilePath);
      if (!result || !result.success || !result.data) {
        return { exists: false };
      }

      const updateInfo = result.data;
      let lastModified = null;

      if (updateInfo.last_update) {
        lastModified = new Date(updateInfo.last_update);
      } else if (updateInfo.fecha && updateInfo.hora) {
        // Formato ej: "fecha": "04/02/2026", "hora": "19:25:38"
        const [d, m, y] = updateInfo.fecha.split("/");
        const dateStr = `${y}-${m}-${d}T${updateInfo.hora}`;
        lastModified = new Date(dateStr);
      }

      if (!lastModified || isNaN(lastModified.getTime())) {
        return { exists: true, lastModified: new Date(), ageInHours: 0, isOld: false };
      }

      const now = new Date();
      const ageInHours = (now - lastModified) / (1000 * 60 * 60);

      return {
        exists: true,
        lastModified,
        ageInHours,
        isOld: ageInHours > 1,
        filePath: updateFilePath
      };
    })();

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

  // Verificar el estado de los datos (last_update.json en Space_paths)
  updateFileStatus();

  if (updateInterval) {
    clearInterval(updateInterval);
  }
  updateInterval = setInterval(() => {
    updateFileStatus();
  }, 30000);
  console.log("✅ Actualización automática del estado cada 30 segundos");

  // Botón Actualizar: limpia caché y recarga JSON desde la red (Space_paths)
  const refreshBtn = document.getElementById("refresh-space-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.disabled = true;
      try {
        if (window.StowMapDataService && typeof window.StowMapDataService.clearCache === "function") {
          window.StowMapDataService.clearCache();
        }
        updateFileStatus();
        const loaded = await loadAndDisplayData();
        if (loaded && window.showToast) {
          window.showToast("Datos actualizados desde la red", "success");
        }
      } finally {
        refreshBtn.disabled = false;
      }
    });
  }

}

// ===================================
// FUNCIONES DE VISUALIZACIÓN DE DATOS
// ===================================

// Función auxiliar para mostrar mensaje de estado al usuario
function showDataLoadStatus(message, type = 'info') {
  const statusText = document.getElementById('status-text');
  const statusIcon = document.getElementById('status-icon');
  
  if (statusText) {
    statusText.textContent = message;
  }
  
  if (statusIcon) {
    if (type === 'error') {
      statusIcon.textContent = '❌';
    } else if (type === 'success') {
      statusIcon.textContent = '✅';
    } else if (type === 'loading') {
      statusIcon.textContent = '⏳';
    } else {
      statusIcon.textContent = '📊';
    }
  }
  
  console.log(`[Estado] ${message}`);
}

// Función auxiliar para mostrar mensaje de error visible
function showErrorMessage(message) {
  const tablesSection = document.getElementById('tables-section');
  if (tablesSection) {
    // Crear o actualizar mensaje de error
    let errorMessage = document.getElementById('data-load-error-message');
    if (!errorMessage) {
      errorMessage = document.createElement('div');
      errorMessage.id = 'data-load-error-message';
      errorMessage.style.cssText = `
        padding: 1.5rem;
        margin: 1rem;
        background-color: var(--Color-Red-1, #fee2e2);
        color: var(--Color-Red-5, #991b1b);
        border: 0.125rem solid var(--Color-Red-3, #ef4444);
        border-radius: 0.5rem;
        text-align: center;
        font-weight: 500;
      `;
      tablesSection.insertBefore(errorMessage, tablesSection.firstChild);
    }
    errorMessage.textContent = `⚠️ ${message}`;
    errorMessage.style.display = 'block';
  }
  
  showDataLoadStatus(message, 'error');
}

async function loadAndDisplayData() {
  try {
    console.log('[Visualización] ===== Iniciando carga de datos =====');
    showDataLoadStatus('Cargando datos...', 'loading');
    
    // Verificar que los elementos DOM críticos existan
    const kpisSection = document.getElementById('kpis-section');
    const tablesSection = document.getElementById('tables-section');
    
    if (!kpisSection || !tablesSection) {
      const errorMsg = 'Elementos del DOM no encontrados. Por favor, recarga la página.';
      console.error('[Visualización]', errorMsg);
      showErrorMessage(errorMsg);
      return false;
    }
    
    // Esperar a que el servicio esté disponible (con timeout aumentado)
    let attempts = 0;
    const maxAttempts = 100; // 10 segundos máximo (aumentado de 50)
    
    console.log('[Visualización] Esperando StowMapDataService...');
    while (!window.StowMapDataService && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    // Verificar que el servicio esté disponible
    if (!window.StowMapDataService) {
      const errorMsg = 'Servicio de datos no disponible. Por favor, reinicia la aplicación.';
      console.error('[Visualización]', errorMsg);
      console.error('[Visualización] window.StowMapDataService:', window.StowMapDataService);
      showErrorMessage(errorMsg);
      return false;
    }
    
    console.log('[Visualización] ✓ StowMapDataService encontrado');
    
    const dataService = window.StowMapDataService;
    
    // Verificar que el servicio esté completamente inicializado
    if (typeof dataService.initialize !== 'function' || typeof dataService.loadAll !== 'function') {
      const errorMsg = 'Servicio de datos no está completamente inicializado.';
      console.error('[Visualización]', errorMsg);
      showErrorMessage(errorMsg);
      return false;
    }
    
    // Inicializar el servicio
    console.log('[Visualización] Inicializando servicio...');
    const initialized = await dataService.initialize();
    if (!initialized) {
      const errorMsg = 'No se pudo inicializar el servicio de datos. Verifica los permisos.';
      console.warn('[Visualización]', errorMsg);
      showErrorMessage(errorMsg);
      return false;
    }
    
    console.log('[Visualización] ✓ Servicio inicializado');
    
    // Cargar datos
    console.log('[Visualización] Cargando datos procesados...');
    const loaded = await dataService.loadAll();
    
    if (!loaded) {
      const errorMsg = 'No se pudieron cargar los datos. Verifica que los archivos procesados existan.';
      console.warn('[Visualización]', errorMsg);
      showErrorMessage(errorMsg);
      return false;
    }
    
    // Verificar que los datos realmente se cargaron
    if (!dataService.isDataLoaded()) {
      const errorMsg = 'Los datos no se marcaron como cargados correctamente.';
      console.warn('[Visualización]', errorMsg);
      showErrorMessage(errorMsg);
      return false;
    }
    
    // Verificar que hay datos en caché
    const dataFullness = dataService.getDataFullness();
    if (!dataFullness || Object.keys(dataFullness).length === 0) {
      const errorMsg = 'Los datos están vacíos. Por favor, descarga y procesa los datos nuevamente.';
      console.warn('[Visualización]', errorMsg);
      console.warn('[Visualización] dataFullness:', dataFullness);
      showErrorMessage(errorMsg);
      return false;
    }
    
    // Verificar que hay datos válidos (al menos VLC1 o algún piso)
    const hasValidData = dataFullness['VLC1'] || 
                         dataFullness['P1-Total'] || 
                         dataFullness['P2-Total'] ||
                         Object.keys(dataFullness).length > 0;
    
    if (!hasValidData) {
      const errorMsg = 'Los datos no contienen información válida. Por favor, descarga los datos nuevamente.';
      console.warn('[Visualización]', errorMsg);
      console.warn('[Visualización] Claves disponibles:', Object.keys(dataFullness));
      showErrorMessage(errorMsg);
      return false;
    }
    
    console.log('[Visualización] ✓ Datos cargados y validados exitosamente');
    console.log('[Visualización] Claves de datos disponibles:', Object.keys(dataFullness).slice(0, 10), '...');
    
    // Ocultar mensaje de error si existe
    const errorMessage = document.getElementById('data-load-error-message');
    if (errorMessage) {
      errorMessage.style.display = 'none';
    }
    
    // Cargar cada sección con validación
    try {
      displayKPIs(dataService);
      console.log('[Visualización] ✓ KPIs renderizados');
    } catch (error) {
      console.error('[Visualización] Error renderizando KPIs:', error);
    }
    
    try {
      displayPickTowerTable(dataService);
      console.log('[Visualización] ✓ Tabla Pick Tower renderizada');
    } catch (error) {
      console.error('[Visualización] Error renderizando Pick Tower:', error);
    }
    
    try {
      displayHighRackTable(dataService);
      console.log('[Visualización] ✓ Tabla High Rack renderizada');
    } catch (error) {
      console.error('[Visualización] Error renderizando High Rack:', error);
    }
    
    try {
      displayHighRackPalletSingleTable(dataService);
      console.log('[Visualización] ✓ Tabla High Rack Pallet Single renderizada');
    } catch (error) {
      console.error('[Visualización] Error renderizando High Rack Pallet Single:', error);
    }
    
    try {
      displayPalletLandTable(dataService);
      console.log('[Visualización] ✓ Tabla Pallet Land renderizada');
    } catch (error) {
      console.error('[Visualización] Error renderizando Pallet Land:', error);
    }
    
    try {
      displayZone1Table(dataService);
      console.log('[Visualización] ✓ Tabla Zone 1 renderizada');
    } catch (error) {
      console.error('[Visualización] Error renderizando Zone 1:', error);
    }
    
    try {
      displayZone2Table(dataService);
      console.log('[Visualización] ✓ Tabla Zone 2 renderizada');
    } catch (error) {
      console.error('[Visualización] Error renderizando Zone 2:', error);
    }
    
    // Configurar navegación y botones
    try {
      setupTableNavigation();
      setupHeatmapButtons();
      loadBintypeIcons();
      loadKpiIcons();
      loadBannerIcon();
      console.log('[Visualización] ✓ Elementos de UI configurados');
    } catch (error) {
      console.error('[Visualización] Error configurando UI:', error);
    }
    
    // Mostrar secciones
    if (kpisSection) {
      kpisSection.style.display = 'grid';
      console.log('[Visualización] ✓ Sección KPIs mostrada');
    }
    
    if (tablesSection) {
      tablesSection.style.display = 'block';
      console.log('[Visualización] ✓ Sección de tablas mostrada');
    }
    
    showDataLoadStatus('Datos cargados correctamente', 'success');
    console.log('[Visualización] ===== Carga de datos completada exitosamente =====');
    
    return true;
  } catch (error) {
    const errorMsg = `Error inesperado al cargar datos: ${error.message}`;
    console.error('[Visualización]', errorMsg, error);
    console.error('[Visualización] Stack trace:', error.stack);
    showErrorMessage(errorMsg);
    return false;
  }
}

function displayKPIs(dataService) {
  // Validar que el servicio y los datos existen
  if (!dataService) {
    console.error('[KPIs] DataService no proporcionado');
    return;
  }
  
  // Usar KPIs desde Data_Fullness.json (VLC1)
  const dataFullness = dataService.getDataFullness();
  
  if (!dataFullness || typeof dataFullness !== 'object' || Object.keys(dataFullness).length === 0) {
    console.warn('[KPIs] DataFullness está vacío o no es válido');
    return;
  }
  
  const vlc1 = dataFullness['VLC1'];
  
  if (!vlc1 || !vlc1.datos) {
    console.warn('[KPIs] No hay datos de VLC1 en Data_Fullness');
    console.warn('[KPIs] Claves disponibles:', Object.keys(dataFullness));
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
  // Validar que el servicio y los datos existen
  if (!dataService) {
    console.error('[Pick Tower] DataService no proporcionado');
    return;
  }
  
  const dataFullness = dataService.getDataFullness();
  
  if (!dataFullness || typeof dataFullness !== 'object' || Object.keys(dataFullness).length === 0) {
    console.warn('[Pick Tower] DataFullness está vacío o no es válido');
    return;
  }
  
  const tbody = document.getElementById('pick-tower-table-body');
  if (!tbody) {
    console.error('[Pick Tower] Elemento tbody no encontrado en el DOM');
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
  // Validar que el servicio y los datos existen
  if (!dataService) {
    console.error('[High Rack] DataService no proporcionado');
    return;
  }
  
  const dataFullness = dataService.getDataFullness();
  
  if (!dataFullness || typeof dataFullness !== 'object' || Object.keys(dataFullness).length === 0) {
    console.warn('[High Rack] DataFullness está vacío o no es válido');
    return;
  }
  
  const tbody = document.getElementById('high-rack-table-body');

  if (!tbody) {
    console.error('[High Rack] Elemento tbody no encontrado en el DOM');
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
  
  // Obtener datos de cada categoría
  const total = getFullness('High Rack');
  const batBin = getFullness('HRK-BatBin');
  const cantilever = getFullness('HRK-Cantilever');
  const passThrough = getFullness('HRK-PassThrough');
  const floorPallet = getFullness('HRK-FloorPallet');
  const palletSingleData = getZoneData('HRK-PalletSingle');
  
  // Función auxiliar para formatear fullness con 2 decimales
  function formatFullnessCell(value) {
    if (value === null || value === undefined) return '<td class="empty-cell">-</td>';
    const percentage = (value * 100).toFixed(2);
    const parts = percentage.split('.');
    return `<td class="percentage-cell">${parts[0]}.<span class="fullness-decimals">${parts[1]}</span>%</td>`;
  }
  
  // Crear la fila (solo una fila con los totales)
  const row = document.createElement('tr');
  let rowHTML = '';
  
  // Total High Rack (primera columna)
  rowHTML += formatFullnessCell(total);
  
  // BatBin
  rowHTML += formatFullnessCell(batBin);
  
  // Cantilever
  rowHTML += formatFullnessCell(cantilever);
  
  // PassThrough
  rowHTML += formatFullnessCell(passThrough);
  
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
    rowHTML += '<td class="empty-cell">-</td>';
  }
  
  row.innerHTML = rowHTML;
  tbody.appendChild(row);
}

function displayHighRackPalletSingleTable(dataService) {
  // Validar que el servicio y los datos existen
  if (!dataService) {
    console.error('[High Rack Pallet Single] DataService no proporcionado');
    return;
  }
  
  const dataFullness = dataService.getDataFullness();
  
  if (!dataFullness || typeof dataFullness !== 'object' || Object.keys(dataFullness).length === 0) {
    console.warn('[High Rack Pallet Single] DataFullness está vacío o no es válido');
    return;
  }
  
  const tbody = document.getElementById('hrk-pallet-single-table-body');
  const shelfTbody = document.getElementById('hrk-pallet-single-shelf-table-body');

  if (!tbody || !shelfTbody) {
    console.error('[High Rack Pallet Single] Elementos tbody no encontrados en el DOM');
    return;
  }
  
  tbody.innerHTML = '';
  shelfTbody.innerHTML = '';
  
  // Función auxiliar para obtener datos completos de una zona
  function getZoneData(zoneKey) {
    const zone = dataFullness[zoneKey];
    if (!zone || !zone.datos) {
      return null;
    }
    return zone.datos;
  }
  
  // Función auxiliar para obtener fullness de una zona
  function getFullness(zoneKey) {
    const zone = dataFullness[zoneKey];
    if (!zone || !zone.datos || zone.datos.fullness === undefined) {
      return null;
    }
    return zone.datos.fullness;
  }
  
  // Función auxiliar para formatear fullness con 2 decimales
  function formatFullnessCell(value) {
    if (value === null || value === undefined) return '<td class="empty-cell">-</td>';
    const percentage = (value * 100).toFixed(2);
    const parts = percentage.split('.');
    return `<td class="percentage-cell">${parts[0]}.<span class="fullness-decimals">${parts[1]}</span>%</td>`;
  }
  
  // Zonas de Pallet Single para High Rack
  // Los keys tienen el prefijo HRK- pero los labels se muestran sin él
  const zones = [
    { key: 'HRK-Standard', label: 'Standard' },
    { key: 'HRK-SIOC', label: 'SIOC' },
    { key: 'HRK-TeamLift', label: 'TeamLift' },
    { key: 'HRK-PetFood', label: 'PetFood' },
    { key: 'HRK-BuildOut-mono', label: 'BuildOut-mono' },
    { key: 'HRK-Damage', label: 'Damage' }
  ];
  
  zones.forEach(zone => {
    const data = getZoneData(zone.key);
    
    // Crear la fila de la tabla principal (siempre mostrar, aunque no haya datos)
    const row = document.createElement('tr');
    let rowHTML = `<td>${zone.label}</td>`;
    
    // Fullness
    if (data && data.fullness !== undefined) {
      const percentage = (data.fullness * 100).toFixed(2);
      const parts = percentage.split('.');
      rowHTML += `<td class="percentage-cell">${parts[0]}.<span class="fullness-decimals">${parts[1]}</span>%</td>`;
    } else {
      rowHTML += '<td class="empty-cell">-</td>';
    }
    
    // Empty (empty_bins / total_bins)
    if (data && data.empty_bins !== undefined && data.total_bins !== undefined) {
      const emptyBins = data.empty_bins || 0;
      const totalBins = data.total_bins || 0;
      rowHTML += `<td class="pallet-single-ratio">${emptyBins} / ${totalBins}</td>`;
    } else {
      rowHTML += '<td class="empty-cell">-</td>';
    }
    
    row.innerHTML = rowHTML;
    tbody.appendChild(row);
    
    // Crear la fila de la tabla Shelf (A-G) - siempre mostrar todas las columnas
    const shelfRow = document.createElement('tr');
    let shelfRowHTML = '';
    
    // Obtener datos de Shelf A, B, C, D, E, F, G
    const shelfA = getFullness(`${zone.key}-A`);
    const shelfB = getFullness(`${zone.key}-B`);
    const shelfC = getFullness(`${zone.key}-C`);
    const shelfD = getFullness(`${zone.key}-D`);
    const shelfE = getFullness(`${zone.key}-E`);
    const shelfF = getFullness(`${zone.key}-F`);
    const shelfG = getFullness(`${zone.key}-G`);
    
    shelfRowHTML += formatFullnessCell(shelfA);
    shelfRowHTML += formatFullnessCell(shelfB);
    shelfRowHTML += formatFullnessCell(shelfC);
    shelfRowHTML += formatFullnessCell(shelfD);
    shelfRowHTML += formatFullnessCell(shelfE);
    shelfRowHTML += formatFullnessCell(shelfF);
    shelfRowHTML += formatFullnessCell(shelfG);
    
    shelfRow.innerHTML = shelfRowHTML;
    shelfTbody.appendChild(shelfRow);
  });
}

function displayPalletLandTable(dataService) {
  // Validar que el servicio y los datos existen
  if (!dataService) {
    console.error('[Pallet Land] DataService no proporcionado');
    return;
  }
  
  const dataFullness = dataService.getDataFullness();
  
  if (!dataFullness || typeof dataFullness !== 'object' || Object.keys(dataFullness).length === 0) {
    console.warn('[Pallet Land] DataFullness está vacío o no es válido');
    return;
  }
  
  const tbody = document.getElementById('pallet-land-table-body');

  if (!tbody) {
    console.error('[Pallet Land] Elemento tbody no encontrado en el DOM');
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
  const zone1Separator = document.getElementById('zone1-separator');
  const zone1TablesContainer = document.getElementById('zone1-tables-container');
  const zone2Separator = document.getElementById('zone2-separator');
  const zone2TablesContainer = document.getElementById('zone2-tables-container');
  
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
        // Ocultar tablas de High Rack Pallet Single
        const hrkPalletSingleSeparator = document.getElementById('hrk-pallet-single-separator');
        const hrkPalletSingleTablesContainer = document.getElementById('hrk-pallet-single-tables-container');
        if (hrkPalletSingleSeparator) hrkPalletSingleSeparator.style.display = 'none';
        if (hrkPalletSingleTablesContainer) hrkPalletSingleTablesContainer.style.display = 'none';
      } else if (targetTable === 'high-rack') {
        // Mostrar tablas de High Rack Pallet Single
        const hrkPalletSingleSeparator = document.getElementById('hrk-pallet-single-separator');
        const hrkPalletSingleTablesContainer = document.getElementById('hrk-pallet-single-tables-container');
        if (hrkPalletSingleSeparator) hrkPalletSingleSeparator.style.display = 'block';
        if (hrkPalletSingleTablesContainer) hrkPalletSingleTablesContainer.style.display = 'flex';
        // Ocultar separadores y tablas de Zone 1 y Zone 2
        if (zone1Separator) zone1Separator.style.display = 'none';
        if (zone1TablesContainer) zone1TablesContainer.style.display = 'none';
        if (zone2Separator) zone2Separator.style.display = 'none';
        if (zone2TablesContainer) zone2TablesContainer.style.display = 'none';
      } else {
        // Ocultar separadores y tablas de Zone 1 y Zone 2
        if (zone1Separator) zone1Separator.style.display = 'none';
        if (zone1TablesContainer) zone1TablesContainer.style.display = 'none';
        if (zone2Separator) zone2Separator.style.display = 'none';
        if (zone2TablesContainer) zone2TablesContainer.style.display = 'none';
        // Ocultar tablas de High Rack Pallet Single
        const hrkPalletSingleSeparator = document.getElementById('hrk-pallet-single-separator');
        const hrkPalletSingleTablesContainer = document.getElementById('hrk-pallet-single-tables-container');
        if (hrkPalletSingleSeparator) hrkPalletSingleSeparator.style.display = 'none';
        if (hrkPalletSingleTablesContainer) hrkPalletSingleTablesContainer.style.display = 'none';
      }
    });
  });
}

function displayZone1Table(dataService) {
  // Validar que el servicio y los datos existen
  if (!dataService) {
    console.error('[Zone 1] DataService no proporcionado');
    return;
  }
  
  const dataFullness = dataService.getDataFullness();
  
  if (!dataFullness || typeof dataFullness !== 'object' || Object.keys(dataFullness).length === 0) {
    console.warn('[Zone 1] DataFullness está vacío o no es válido');
    return;
  }
  
  const tbody = document.getElementById('zone1-table-body');
  const shelfTbody = document.getElementById('zone1-shelf-table-body');

  if (!tbody || !shelfTbody) {
    console.error('[Zone 1] Elementos tbody no encontrados en el DOM');
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
  // Validar que el servicio y los datos existen
  if (!dataService) {
    console.error('[Zone 2] DataService no proporcionado');
    return;
  }
  
  const dataFullness = dataService.getDataFullness();
  
  if (!dataFullness || typeof dataFullness !== 'object' || Object.keys(dataFullness).length === 0) {
    console.warn('[Zone 2] DataFullness está vacío o no es válido');
    return;
  }
  
  const tbody = document.getElementById('zone2-table-body');
  const shelfTbody = document.getElementById('zone2-shelf-table-body');

  if (!tbody || !shelfTbody) {
    console.error('[Zone 2] Elementos tbody no encontrados en el DOM');
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
    'zone2-pallet-single-icon': 'assets/svg/Bintypes/Pallet_single.svg',
    // Iconos para High Rack
    'hrk-batbin-icon': 'assets/svg/Bintypes/Bat-Bin_HRK.svg',
    'hrk-cantilever-icon': 'assets/svg/Bintypes/Cantilever_HRK.svg',
    'hrk-passthrough-icon': 'assets/svg/Bintypes/PassThrough_HRK.svg',
    'hrk-floor-pallet-icon': 'assets/svg/Bintypes/FloorPallet_HRK.svg',
    'hrk-pallet-single-icon': 'assets/svg/Bintypes/PalletSingle_HRK.svg'
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
  
  // Cargar SVG desde Space_paths (carpeta HeatMaps en la red)
  try {
    const config = await window.api.getConfig();
    const spacePaths = config?.Space_paths || [];
    if (spacePaths.length === 0) {
      viewer.innerHTML = `<div class="error-heatmap">Space_paths no configurado en config.json</div>`;
      return;
    }

    const heatmapsBase = spacePaths.length > 1
      ? spacePaths[1].replace(/[/\\]+$/, "")
      : `${spacePaths[0].replace(/[/\\]+$/, "")}/HeatMaps`;
    const sep = heatmapsBase.includes("\\") ? "\\" : "/";
    const normalizedPath = `${heatmapsBase}${sep}${svgFileName}`;

    console.log("[Heatmaps] Cargando SVG desde:", normalizedPath);

    const result = await window.api.readFileAbsolute(normalizedPath);

    console.log("[Heatmaps] Resultado:", {
      success: result.success,
      hasContent: !!result.content,
      error: result.error
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
      viewer.innerHTML = `<div class="error-heatmap">Error al cargar el heatmap: ${errorMsg}<br><small>Ruta intentada: ${normalizedPath}</small></div>`;
    }
  } catch (error) {
    console.error('[Heatmaps] Excepción al cargar SVG:', error);
    viewer.innerHTML = `<div class="error-heatmap">Error al cargar el heatmap: ${error.message}<br><small>${error.stack}</small></div>`;
  }
}

function initializeHeatmapControls(viewer) {
  const showLockedCheckbox = document.getElementById('show-locked-bins');
  const binTypeFilter = document.getElementById('bin-type-filter');
  const fullnessRange = document.getElementById('fullness-range');
  const fullnessRangeValue = document.getElementById('fullness-range-value');
  const resetBtn = document.getElementById('reset-heatmap-filters');
  
  if (!viewer) return;
  
  // Función para aplicar filtros
  function applyFilters() {
    const showLocked = showLockedCheckbox ? showLockedCheckbox.checked : true;
    const binType = binTypeFilter ? binTypeFilter.value : 'all';
    const maxFullness = fullnessRange ? parseFloat(fullnessRange.value) / 100 : 1.0;
    
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
      
      // Filtro por rango máximo de fullness (ocultar lo más lleno)
      // Si el fullness es mayor al máximo, ocultarlo
      // Nota: Si maxFullness es 1.0 (100%), mostrar todo sin importar el valor de fullness
      if (shouldShow && maxFullness < 1.0 && fullness > maxFullness) {
        shouldShow = false;
      }
      
      // Aplicar visibilidad
      if (shouldShow) {
        elem.style.display = '';
        elem.style.opacity = '1';
        elem.style.stroke = '';
        elem.style.strokeWidth = '';
        elem.style.strokeDasharray = '';
        elem.classList.remove('best-zone-highlight');
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
  
  if (binTypeFilter) {
    binTypeFilter.addEventListener('change', applyFilters);
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
      if (binTypeFilter) binTypeFilter.value = 'all';
      if (fullnessRange) {
        fullnessRange.value = 100;
        if (fullnessRangeValue) fullnessRangeValue.textContent = '100%';
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
  
  // Verificar que los elementos DOM críticos existan antes de continuar
  const kpisSection = document.getElementById('kpis-section');
  const tablesSection = document.getElementById('tables-section');
  
  if (!kpisSection || !tablesSection) {
    console.warn('[Space Heatmap] Elementos DOM no encontrados, esperando 200ms...');
    setTimeout(() => {
      if (document.getElementById('kpis-section') && document.getElementById('tables-section')) {
        initializeSpaceHeatmap();
      } else {
        console.error('[Space Heatmap] No se pudieron encontrar los elementos DOM después de esperar');
        showErrorMessage('Error: No se encontraron los elementos necesarios. Por favor, recarga la página.');
      }
    }, 200);
    return;
  }
  
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
    // Delay aumentado para asegurar que el DOM esté completamente listo
    setTimeout(() => {
      // Verificar que los elementos DOM existan antes de inicializar
      const kpisSection = document.getElementById('kpis-section');
      const tablesSection = document.getElementById('tables-section');
      
      if (kpisSection && tablesSection) {
        initializeSpaceHeatmap();
      } else {
        console.warn('[Space Heatmap] Elementos DOM no listos, reintentando en 200ms...');
        setTimeout(() => {
          if (document.getElementById('kpis-section') && document.getElementById('tables-section')) {
            initializeSpaceHeatmap();
          } else {
            console.error('[Space Heatmap] No se pudieron encontrar los elementos DOM después de múltiples intentos');
          }
        }, 200);
      }
    }, 500); // Aumentado de 300ms a 500ms
  }
});

// También escuchar el evento app:loaded por si acaso
window.addEventListener("app:loaded", (event) => {
  console.log("📢 Evento app:loaded recibido:", event.detail);
  if (event.detail && event.detail.app === "space-heatmap") {
    console.log("🔄 Space Heatmap cargada, reinicializando datos...");
    // Delay aumentado para asegurar que el DOM esté completamente listo
    setTimeout(() => {
      // Verificar que los elementos DOM existan antes de cargar datos
      const kpisSection = document.getElementById('kpis-section');
      const tablesSection = document.getElementById('tables-section');
      
      if (kpisSection && tablesSection) {
        // Solo recargar datos, no reinicializar todo (para evitar duplicar listeners)
        loadBannerIcon();
        loadAndDisplayData();
      } else {
        console.warn('[Space Heatmap] Elementos DOM no listos, reintentando en 200ms...');
        setTimeout(() => {
          if (document.getElementById('kpis-section') && document.getElementById('tables-section')) {
            loadBannerIcon();
            loadAndDisplayData();
          } else {
            console.error('[Space Heatmap] No se pudieron encontrar los elementos DOM después de múltiples intentos');
            showErrorMessage('Error: No se encontraron los elementos necesarios. Por favor, recarga la página.');
          }
        }, 200);
      }
    }, 500); // Aumentado de 300ms a 500ms
  }
});
