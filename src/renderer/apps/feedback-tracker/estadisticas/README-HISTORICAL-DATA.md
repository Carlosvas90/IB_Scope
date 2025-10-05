# Funcionalidad de Datos Históricos - Estadísticas

## Descripción

Esta funcionalidad permite al módulo de estadísticas leer datos históricos desde una base de datos SQLite (`Inventory_Health.db`) que contiene las tablas `error_tracking` y `dpmo_metrics`. Los datos históricos se combinan con los datos actuales para proporcionar análisis más completos.

## Estructura de la Base de Datos

### Tabla `error_tracking`
```sql
CREATE TABLE error_tracking (
    id INTEGER PRIMARY KEY,
    fecha TEXT NOT NULL,           -- Formato: YYYYMMDD
    user_id TEXT NOT NULL,
    asin TEXT NOT NULL,
    violation TEXT NOT NULL,
    feedback_comment TEXT,
    feedback_status TEXT DEFAULT 'pending',
    quantity INTEGER DEFAULT 1,
    times_notified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla `dpmo_metrics`
```sql
CREATE TABLE dpmo_metrics (
    id INTEGER PRIMARY KEY,
    fecha TEXT NOT NULL,           -- Formato: YYYYMMDD
    dpmo REAL NOT NULL,
    total_movimientos INTEGER NOT NULL,
    total_errores INTEGER NOT NULL,
    sigma INTEGER NOT NULL,
    calidad TEXT NOT NULL,
    ultima_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Configuración

### Rutas de Base de Datos

Las rutas de la base de datos se configuran en `config/config.json`:

```json
{
  "db_paths": [
    "\\\\ant\\dept-eu\\VLC1\\Public\\Apps_Tools\\chuecc\\IB_Scope\\Data\\DB\\",
    "C:\\Users\\carlo\\Downloads\\0-Proyecto_IB_Scope\\Analisis\\Data\\DB\\"
  ]
}
```

### Archivo de Base de Datos

El archivo de base de datos debe llamarse `Inventory_Health.db` y estar ubicado en una de las rutas configuradas.

## Opciones de Rango de Fechas

El sistema soporta los siguientes rangos de fechas:

- **Hoy (0)**: Solo datos actuales del día actual
- **Ayer (1)**: Solo datos del día anterior (históricos)
- **Últimos 3 días (3)**: Datos de los últimos 3 días (históricos + actuales)
- **Última semana (7)**: Datos de la última semana (históricos + actuales)
- **Último mes (30)**: Datos del último mes (históricos + actuales)
- **Últimos 3 meses (90)**: Datos de los últimos 3 meses (históricos + actuales)

## Servicios

### DatabaseService

Maneja la conexión y consultas a la base de datos SQLite.

```javascript
import { DatabaseService } from './services/DatabaseService.js';

const dbService = new DatabaseService();
await dbService.init();

// Obtener datos históricos
const data = await dbService.getHistoricalData('20250101', '20250131');
```

### HistoricalDataService

Combina datos históricos con datos actuales y los normaliza para el sistema.

```javascript
import { HistoricalDataService } from './services/HistoricalDataService.js';

const historicalService = new HistoricalDataService();
await historicalService.init();

// Obtener datos para un rango específico
const data = await historicalService.getHistoricalData(7); // Última semana
```

### EstadisticasDataService (Actualizado)

El servicio principal de datos ahora incluye funcionalidad histórica:

```javascript
// Cambiar rango de fechas
await dataService.changeDateRange(30); // Último mes

// Verificar disponibilidad de datos históricos
const isAvailable = await dataService.isHistoricalDataAvailable();

// Obtener estadísticas de la base de datos
const stats = await dataService.getDatabaseStats();
```

## Uso en la Interfaz

### Selector de Rango de Fechas

El selector de rango de fechas en la interfaz permite seleccionar diferentes períodos:

```html
<select id="date-range">
  <option value="0" selected>Hoy</option>
  <option value="1">Ayer</option>
  <option value="3">Últimos 3 días</option>
  <option value="7">Última semana</option>
  <option value="30">Último mes</option>
  <option value="90">Últimos 3 meses</option>
</select>
```

### Información del Rango Seleccionado

La interfaz muestra información sobre el rango seleccionado:

```html
<div id="date-range-info" class="date-range-info">
  <span class="period-text">📅 último mes</span>
  <span class="data-source">📊 datos históricos + actuales</span>
  <span class="record-count">📈 1,234 registros</span>
</div>
```

## Flujo de Datos

1. **Selección de Rango**: El usuario selecciona un rango de fechas
2. **Verificación de DB**: El sistema verifica si la base de datos está disponible
3. **Carga de Datos Históricos**: Si el rango > 0, se cargan datos de la DB
4. **Carga de Datos Actuales**: Se cargan datos actuales del archivo JSON
5. **Combinación**: Los datos se combinan y normalizan
6. **Actualización de UI**: Todos los componentes se actualizan con los nuevos datos

## Manejo de Errores

- Si la base de datos no está disponible, el sistema fallback a datos actuales
- Si no se pueden cargar datos actuales, se usan solo datos históricos
- Los errores se registran en la consola y se muestran al usuario

## Dependencias

- `sqlite3`: Para manejar la base de datos SQLite
- APIs de Electron: Para acceso al sistema de archivos y base de datos

## Instalación

```bash
npm install sqlite3
```

## Notas Técnicas

- Las fechas en la base de datos están en formato `YYYYMMDD`
- Los datos se normalizan al formato del sistema (`YYYY/MM/DD`)
- Los datos históricos se marcan con `isHistorical: true`
- El sistema mantiene compatibilidad con datos existentes
