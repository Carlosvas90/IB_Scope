async function checkFileAge() {
  try {
    // Verificar que las APIs necesarias estén disponibles
    if (!window.api || !window.api.getUserDataPath || !window.api.getFileInfo) {
      console.warn("APIs no disponibles todavía. Por favor, reinicia la aplicación.");
      return { exists: false, needsRestart: true };
    }
    
    // Agregar timeout de 2 segundos para evitar que se quede colgado
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout al verificar archivo")), 2000)
    );
    
    const checkPromise = (async () => {
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

  downloadBtn.addEventListener("click", async () => {
    console.log("🖱️ Click en botón detectado");

    try {
      // Verificar que las APIs necesarias estén disponibles
      if (!window.api.getUserDataPath || !window.api.executePythonScript) {
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
      
      // Mostrar banner de estado
      statusMessage.textContent = "⏳ Iniciando descarga de datos de StowMap...";
      statusMessage.className = "status-message-banner loading";
      statusMessage.style.display = "block";

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
        statusMessage.className = "status-message-banner success";
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
        statusMessage.textContent = `❌ Error: ${
          result.error || "Error desconocido"
        }`;
        statusMessage.className = "status-message-banner error";
        console.error("❌ Error:", result.error);
      }
    } catch (error) {
      statusMessage.textContent = `❌ Error: ${error.message}`;
      statusMessage.className = "status-message-banner error";
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
    
    // Verificar que el servicio esté disponible
    if (!window.StowMapDataService) {
      console.error('[Visualización] StowMapDataService no está disponible');
      return false;
    }
    
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
    
    // Mostrar secciones de visualización y ocultar mensaje "no data"
    document.getElementById('kpis-section').style.display = 'grid';
    document.getElementById('tables-section').style.display = 'flex';
    document.getElementById('no-data-message').style.display = 'none';
    
    // Cargar cada sección
    displayKPIs(dataService);
    displayFloorTable(dataService);
    displayBinTypeTable(dataService);
    displayFloorChart(dataService);
    displayBinTypeChart(dataService);
    
    return true;
  } catch (error) {
    console.error('[Visualización] Error al cargar datos:', error);
    return false;
  }
}

function displayKPIs(dataService) {
  const stats = dataService.getSummaryStats();
  if (!stats) return;
  
  document.getElementById('kpi-total-bins').textContent = stats.total_bins.toLocaleString();
  document.getElementById('kpi-occupied-bins').textContent = stats.occupied_bins.toLocaleString();
  document.getElementById('kpi-occupancy-rate').textContent = `${stats.occupancy_rate}%`;
  document.getElementById('kpi-avg-utilization').textContent = `${stats.avg_utilization}%`;
  document.getElementById('kpi-total-units').textContent = stats.total_units.toLocaleString();
}

function displayFloorTable(dataService) {
  const fullnessByFloor = dataService.getFullnessByFloor();
  const tbody = document.getElementById('table-floor-body');
  tbody.innerHTML = '';
  
  for (const [floor, data] of Object.entries(fullnessByFloor)) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>Piso ${floor}</strong></td>
      <td class="number">${data.total_bins.toLocaleString()}</td>
      <td class="number">${data.occupied_bins.toLocaleString()}</td>
      <td class="number">${data.empty_bins.toLocaleString()}</td>
      <td class="number percentage ${getPercentageClass(data.occupancy_rate)}">${data.occupancy_rate}%</td>
      <td class="number percentage ${getPercentageClass(data.avg_utilization)}">${data.avg_utilization}%</td>
      <td class="number">${data.total_units.toLocaleString()}</td>
    `;
    tbody.appendChild(row);
  }
}

function displayBinTypeTable(dataService) {
  const fullnessByBinType = dataService.getFullnessByBinType();
  const tbody = document.getElementById('table-bintype-body');
  tbody.innerHTML = '';
  
  // Tomar los primeros 15 tipos de bin
  const entries = Object.entries(fullnessByBinType).slice(0, 15);
  
  for (const [binType, data] of entries) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${binType}</strong></td>
      <td class="number">${data.total_bins.toLocaleString()}</td>
      <td class="number">${data.occupied_bins.toLocaleString()}</td>
      <td class="number">${data.empty_bins.toLocaleString()}</td>
      <td class="number percentage ${getPercentageClass(data.occupancy_rate)}">${data.occupancy_rate}%</td>
      <td class="number percentage ${getPercentageClass(data.avg_utilization)}">${data.avg_utilization}%</td>
    `;
    tbody.appendChild(row);
  }
}

function displayFloorChart(dataService) {
  const fullnessByFloor = dataService.getFullnessByFloor();
  const container = document.getElementById('chart-floor');
  container.innerHTML = '<div class="simple-bar-chart"></div>';
  const chart = container.querySelector('.simple-bar-chart');
  
  const maxValue = Math.max(...Object.values(fullnessByFloor).map(d => d.avg_utilization));
  
  for (const [floor, data] of Object.entries(fullnessByFloor)) {
    const barItem = document.createElement('div');
    barItem.className = 'bar-item';
    
    const percentage = (data.avg_utilization / maxValue) * 100;
    
    barItem.innerHTML = `
      <div class="bar-label">Piso ${floor}</div>
      <div class="bar-wrapper">
        <div class="bar-fill" style="width: ${percentage}%">
          <span class="bar-value">${data.avg_utilization}%</span>
        </div>
      </div>
    `;
    chart.appendChild(barItem);
  }
}

function displayBinTypeChart(dataService) {
  const fullnessByBinType = dataService.getFullnessByBinType();
  const container = document.getElementById('chart-bintype');
  container.innerHTML = '<div class="simple-bar-chart"></div>';
  const chart = container.querySelector('.simple-bar-chart');
  
  // Top 10 tipos de bin por cantidad
  const entries = Object.entries(fullnessByBinType).slice(0, 10);
  const maxValue = Math.max(...entries.map(([_, d]) => d.total_bins));
  
  for (const [binType, data] of entries) {
    const barItem = document.createElement('div');
    barItem.className = 'bar-item';
    
    const percentage = (data.total_bins / maxValue) * 100;
    
    barItem.innerHTML = `
      <div class="bar-label">${binType}</div>
      <div class="bar-wrapper">
        <div class="bar-fill" style="width: ${percentage}%">
          <span class="bar-value">${data.total_bins.toLocaleString()}</span>
        </div>
      </div>
    `;
    chart.appendChild(barItem);
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
