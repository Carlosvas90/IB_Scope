# Space Heatmap - Descarga de StowMap

## 📋 Descripción

Esta aplicación descarga datos de StowMap de Amazon para los pisos 1-5 del centro de distribución VLC1.

## 🎨 Diseño

La interfaz está diseñada siguiendo el patrón de `user-activity.html` con:
- **Header card** con gradiente morado que contiene el título, estado del archivo y botón de descarga
- **Indicador de estado** en tiempo real que muestra la antigüedad de los datos
- **Animación de descarga** en el botón durante el proceso
- **Banner de mensajes** que aparece solo durante descarga o errores
- **Card informativa** con detalles sobre el proceso

## 🔧 Funcionamiento

### Flujo de Ejecución

```
1. Al abrir la app, verifica automáticamente el estado del archivo CSV
   ↓
2. Muestra indicador visual del estado:
   - 🟢 Verde: Datos actualizados (menos de 1 hora)
   - 🔴 Rojo: Datos desactualizados (más de 1 hora) - Pulsa para llamar atención
   - 🟠 Naranja: No hay datos descargados
   ↓
3. Usuario hace clic en "Descargar StowMap Data"
   ↓
4. Frontend obtiene la ruta de userData de Electron
   ↓
5. Se ejecuta el script Python con la ruta como argumento
   ↓
6. Script detecta si necesita autenticación Midway
   ↓
7. [Si es necesario] Se abre ventana CMD para ingresar PIN
   ↓
8. Script descarga datos de pisos 1-5
   ↓
9. Guarda CSV en la ubicación apropiada (desarrollo o build)
   ↓
10. Actualiza automáticamente el indicador de estado
   ↓
11. Muestra confirmación al usuario
```

### Indicadores de Estado de Datos

La aplicación verifica automáticamente la antigüedad de los datos y muestra:

- **✅ Datos actualizados** (verde): El archivo tiene menos de 1 hora de antigüedad
- **🕐 Datos desactualizados** (rojo pulsante): El archivo tiene más de 1 hora y se recomienda actualizar
- **⚠️ No hay datos** (naranja): No se han descargado datos todavía

El indicador se actualiza automáticamente al cargar la página y después de cada descarga exitosa.

### Autenticación

- El script requiere autenticación con **Midway** (sistema de seguridad de Amazon)
- Se abrirá una **ventana CMD externa** automáticamente para que ingreses tu PIN
- La autenticación es válida por 20 horas
- No requieres interactuar con la aplicación, solo con la ventana CMD

### Ubicación de los Datos

Los archivos se guardan en diferentes ubicaciones según el modo:

**Modo Desarrollo:**
```
<root_del_proyecto>/data/space-heatmap/
├── Stowmap_data.csv          # CSV completo (159k filas)
└── processed/                 # JSONs procesados
    ├── fullness_by_floor.json
    ├── fullness_by_bintype.json
    ├── fullness_by_mod.json
    ├── fullness_by_shelf.json
    ├── summary_stats.json
    ├── heatmap_zones.json
    └── top_bins.json
```

**Modo Build (Producción):**
```
%APPDATA%/IB_Scope/data/space-heatmap/
├── Stowmap_data.csv
└── processed/
    └── [archivos JSON...]
```

Esta carpeta está excluida del control de versiones (`.gitignore`) para proteger datos sensibles.

## 📊 Procesamiento de Datos

### Flujo Automático

```
1. Usuario descarga StowMap (159k filas CSV)
   ↓
2. Se ejecuta automáticamente Procesar_StowMap.py
   ↓
3. Python procesa el CSV y genera JSONs pequeños (~20 KB total)
   ↓
4. Frontend carga JSONs instantáneamente
```

### Métricas Calculadas

El script `Procesar_StowMap.py` genera los siguientes JSONs optimizados:

1. **`fullness_by_floor.json`** (~1 KB)
   - Total bins por piso
   - Bins ocupados/vacíos
   - Tasa de ocupación
   - Utilización promedio
   - Total de unidades

2. **`fullness_by_bintype.json`** (~5 KB)
   - Mismas métricas pero agrupadas por tipo de bin
   - Ordenado por cantidad de bins descendente

3. **`fullness_by_mod.json`** (~2 KB)
   - Métricas agrupadas por módulo (A, B, C, etc.)

4. **`fullness_by_shelf.json`** (~1 KB)
   - Métricas agrupadas por estante (A, B, C, D, etc.)

5. **`summary_stats.json`** (~1 KB)
   - Estadísticas generales del warehouse completo
   - Fecha de procesamiento
   - Totales globales

6. **`heatmap_zones.json`** (~10 KB)
   - Datos combinados Floor + Mod
   - Intensidad de uso por zona (high/medium/low)
   - Ideal para visualizaciones de heatmap

7. **`top_bins.json`** (~5 KB)
   - Top 20 bins más utilizados
   - Top 20 bins con más unidades
   - Bins vacíos por tipo

### Uso en el Frontend

```javascript
// Cargar el servicio
const dataService = window.StowMapDataService;

// Inicializar y cargar todos los datos
await dataService.initialize();
await dataService.loadAll();

// Obtener datos específicos
const summaryStats = dataService.getSummaryStats();
const fullnessByFloor = dataService.getFullnessByFloor();
const fullnessByBinType = dataService.getFullnessByBinType();
const heatmapZones = dataService.getHeatmapZones();

// Ejemplo: Obtener ocupación del piso 1
const floor1 = fullnessByFloor[1];
console.log(`Piso 1: ${floor1.occupancy_rate}% ocupado`);
console.log(`Total bins: ${floor1.total_bins}`);
console.log(`Utilización promedio: ${floor1.avg_utilization}%`);
```

### Ejecutar Procesamiento Manualmente

Si necesitas reprocesar los datos sin descargar de nuevo:

```bash
# Desde la carpeta del proyecto
python src/renderer/apps/space-heatmap/py/Procesar_StowMap.py
```

## 📁 Estructura

```
space-heatmap/
├── css/                         # Estilos de la interfaz
│   └── space-heatmap.css
├── js/                          # Lógica frontend
│   ├── space-heatmap.js         # Controlador principal
│   └── StowMapDataService.js    # Servicio para cargar datos procesados
├── py/                          # Scripts Python
│   ├── amazon_utils.py          # Utilidades de autenticación Amazon
│   ├── Descarga_StowMap.py      # Script de descarga
│   └── Procesar_StowMap.py      # Script de procesamiento de datos
├── views/                       # Vistas HTML
│   └── space-heatmap.html
└── README.md                    # Este archivo
```

## ⚠️ Notas Importantes

1. **Seguridad**: Los datos descargados contienen información interna de Amazon y no deben ser compartidos
2. **Autenticación**: Si ves el error "GetConsoleMode failed", es normal - se resuelve automáticamente abriendo una ventana CMD separada
3. **Dependencias Python**: Requiere `pandas`, `requests`, `requests-kerberos`, `beautifulsoup4`

## 🐛 Solución de Problemas

- **Error de autenticación**: Asegúrate de tener `mwinit` instalado y configurado
- **Cookie expirada**: La aplicación te solicitará re-autenticarte automáticamente
- **Errores Unicode**: Los mensajes usan solo ASCII para compatibilidad con Windows cp1252

