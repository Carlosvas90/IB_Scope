/**
 * EJEMPLO DE USO DEL STOWMAP DATA SERVICE
 * 
 * Este archivo muestra cómo cargar y usar los datos procesados
 * de StowMap en tu aplicación.
 */

async function ejemploUsoDatos() {
  console.log('=== EJEMPLO DE USO DE DATOS DE STOWMAP ===\n');

  // 1. Obtener instancia del servicio
  const dataService = window.StowMapDataService;

  // 2. Inicializar el servicio
  await dataService.initialize();

  // 3. Cargar todos los datos
  console.log('Cargando datos...');
  await dataService.loadAll();

  if (!dataService.isDataLoaded()) {
    console.error('❌ No se pudieron cargar los datos');
    return;
  }

  console.log('✓ Datos cargados exitosamente\n');

  // ============================================
  // ESTADÍSTICAS GENERALES
  // ============================================
  console.log('--- ESTADÍSTICAS GENERALES ---');
  const stats = dataService.getSummaryStats();
  console.log(`Total de bins: ${stats.total_bins.toLocaleString()}`);
  console.log(`Bins ocupados: ${stats.occupied_bins.toLocaleString()} (${stats.occupancy_rate}%)`);
  console.log(`Bins vacíos: ${stats.empty_bins.toLocaleString()}`);
  console.log(`Total de unidades: ${stats.total_units.toLocaleString()}`);
  console.log(`Utilización promedio: ${stats.avg_utilization}%`);
  console.log(`Fecha de procesamiento: ${dataService.getFormattedProcessedDate()}\n`);

  // ============================================
  // FULLNESS POR PISO
  // ============================================
  console.log('--- FULLNESS POR PISO ---');
  const fullnessByFloor = dataService.getFullnessByFloor();
  
  for (const [floor, data] of Object.entries(fullnessByFloor)) {
    console.log(`\nPiso ${floor}:`);
    console.log(`  Total bins: ${data.total_bins.toLocaleString()}`);
    console.log(`  Ocupados: ${data.occupied_bins.toLocaleString()}`);
    console.log(`  Vacíos: ${data.empty_bins.toLocaleString()}`);
    console.log(`  Tasa ocupación: ${data.occupancy_rate}%`);
    console.log(`  Utilización promedio: ${data.avg_utilization}%`);
    console.log(`  Total unidades: ${data.total_units.toLocaleString()}`);
  }

  // ============================================
  // TOP 5 TIPOS DE BIN MÁS COMUNES
  // ============================================
  console.log('\n--- TOP 5 TIPOS DE BIN MÁS COMUNES ---');
  const fullnessByBinType = dataService.getFullnessByBinType();
  const topBinTypes = Object.entries(fullnessByBinType)
    .sort((a, b) => b[1].total_bins - a[1].total_bins)
    .slice(0, 5);

  topBinTypes.forEach(([type, data], index) => {
    console.log(`\n${index + 1}. ${type}:`);
    console.log(`   Total: ${data.total_bins.toLocaleString()} bins`);
    console.log(`   Ocupación: ${data.occupancy_rate}%`);
    console.log(`   Utilización: ${data.avg_utilization}%`);
  });

  // ============================================
  // HEATMAP DE ZONAS (ejemplo: piso 1)
  // ============================================
  console.log('\n--- HEATMAP PISO 1 (por módulo) ---');
  const heatmapZones = dataService.getHeatmapZones();
  const floor1Zones = heatmapZones[1];

  if (floor1Zones) {
    for (const [mod, data] of Object.entries(floor1Zones)) {
      const intensityEmoji = data.intensity === 'high' ? '🔥' : 
                             data.intensity === 'medium' ? '🟡' : '🟢';
      console.log(`  Mod ${mod}: ${data.avg_utilization}% ${intensityEmoji}`);
    }
  }

  // ============================================
  // TOP BINS MÁS UTILIZADOS
  // ============================================
  console.log('\n--- TOP 5 BINS MÁS UTILIZADOS ---');
  const topBins = dataService.getTopBins();
  
  if (topBins.top_utilized) {
    topBins.top_utilized.slice(0, 5).forEach((bin, index) => {
      console.log(`${index + 1}. ${bin['Bin Id']}`);
      console.log(`   Tipo: ${bin['Bin Type']}`);
      console.log(`   Piso: ${bin.Floor}, Mod: ${bin.Mod}`);
      console.log(`   Utilización: ${bin['Utilization %']}%`);
      console.log(`   Unidades: ${bin['Total Units']}`);
    });
  }

  console.log('\n=== FIN DEL EJEMPLO ===');
}

// Ejecutar ejemplo cuando se cargue la página
// (Descomenta la línea siguiente para probar)
// ejemploUsoDatos();

