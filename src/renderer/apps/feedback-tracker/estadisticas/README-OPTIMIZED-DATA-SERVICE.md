# 🚀 OptimizedDataService - Documentación

## 📋 Descripción

`OptimizedDataService` es una capa de optimización que envuelve `EstadisticasDataService` para proporcionar carga inteligente de datos con IndexedDB como caché primario.

---

## 🎯 Objetivos

1. **Reducir tiempo de carga** de ~2 minutos a segundos
2. **Minimizar acceso a red** mediante caché local
3. **Particionar datos** por mes para eficiencia
4. **Mantener compatibilidad** con código existente

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────┐
│     estadisticas.js (Controller)    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     OptimizedDataService (NEW!)     │ ◄── Capa de optimización
├─────────────────────────────────────┤
│  • Gestión de caché                 │
│  • Particionamiento                 │
│  • Detección de cambios             │
└──────────┬───────────────┬──────────┘
           │               │
           ▼               ▼
┌──────────────────┐  ┌─────────────┐
│ CacheManager     │  │ Estadisticas│
│ (IndexedDB)      │  │ DataService │
└──────────────────┘  └──────┬──────┘
                             │
                ┌────────────┴────────────┐
                ▼                         ▼
        ┌──────────────┐          ┌─────────────┐
        │ JSON (Hoy)   │          │ SQLite (DB) │
        └──────────────┘          └─────────────┘
```

---

## 🔄 Flujo de Carga de Datos

### **Escenario 1: Solo datos de HOY (Rango = 0)**

```
1. OptimizedDataService.loadData()
   ↓
2. Cargar JSON del día actual (siempre actualizado)
   ↓
3. Filtrar solo datos de hoy
   ↓
4. Retornar inmediatamente (< 1 segundo)
```

**Resultado:** 🚀 Carga ultra-rápida sin acceso a DB

---

### **Escenario 2: Datos HISTÓRICOS (Primera vez)**

```
1. OptimizedDataService.loadHistoricalData(30)
   ↓
2. Determinar meses necesarios (ej: 202501, 202412)
   ↓
3. Buscar en IndexedDB
   ↓ [CACHE MISS]
4. Cargar desde SQLite
   ↓
5. Particionar por mes
   ↓
6. Guardar en IndexedDB
   ↓
7. Combinar con datos de hoy (JSON)
   ↓
8. Retornar
```

**Resultado:** 📂 Carga inicial lenta (SQLite), pero cachea para futuro

---

### **Escenario 3: Datos HISTÓRICOS (Segunda vez)**

```
1. OptimizedDataService.loadHistoricalData(30)
   ↓
2. Determinar meses necesarios (ej: 202501, 202412)
   ↓
3. Buscar en IndexedDB
   ↓ [CACHE HIT] ✅
4. Leer desde IndexedDB (instantáneo)
   ↓
5. Combinar con datos de hoy (JSON)
   ↓
6. Retornar
```

**Resultado:** 🚀 Carga ultra-rápida desde caché local

---

## 📦 Particionamiento de Datos

Los datos se almacenan en **particiones mensuales**:

| Clave    | Rango          | Tamaño estimado |
| -------- | -------------- | --------------- |
| `202501` | Enero 2025     | ~500KB - 2MB    |
| `202412` | Diciembre 2024 | ~500KB - 2MB    |
| `202411` | Noviembre 2024 | ~500KB - 2MB    |

**Beneficios:**

- ✅ Carga selectiva (solo meses necesarios)
- ✅ Fácil limpieza de datos antiguos
- ✅ Actualización incremental

---

## 🔍 Detección de Cambios

Cada partición de mes incluye un **hash SHA-256**:

```javascript
{
  month: "202501",
  hash: "a3f5b2...",
  records: [...],
  lastUpdated: "2025-01-12T10:30:00Z"
}
```

**Uso:**

- Detectar si datos del mes cambiaron
- Sincronizar solo diferencias
- Validar integridad del caché

---

## 💾 Estructura en IndexedDB

### **Store: `historical_data`**

```javascript
{
  id: "feedback_202501",        // app_YYYYMM
  app: "feedback",              // Identificador de app
  month: "202501",              // Mes específico
  records: [...],               // Array de registros
  hash: "a3f5b2...",            // SHA-256 de records
  recordCount: 1234,            // Conteo para validación
  lastUpdated: "2025-01-12...", // Timestamp
  dataSize: 524288              // Tamaño en bytes
}
```

---

## 🚀 Uso Básico

### **Reemplazo directo en `estadisticas.js`:**

**ANTES:**

```javascript
import { EstadisticasDataService } from "./services/EstadisticasDataService.js";

class EstadisticasController {
  constructor() {
    this.dataService = new EstadisticasDataService();
  }

  async init() {
    await this.dataService.init();
    await this.dataService.loadData();
  }
}
```

**DESPUÉS:**

```javascript
import { OptimizedDataService } from "./services/OptimizedDataService.js";

class EstadisticasController {
  constructor() {
    this.dataService = new OptimizedDataService(); // ← Solo cambiar esto!
  }

  async init() {
    await this.dataService.init();
    await this.dataService.loadData();
  }
}
```

**¡Listo!** Todo el código existente sigue funcionando igual.

---

## 📊 API

### **Inicialización**

```javascript
const dataService = new OptimizedDataService();
await dataService.init();
```

### **Cargar datos de HOY**

```javascript
// Ultra-rápido (< 1 segundo)
await dataService.loadData();

console.log(dataService.errors); // Array de errores de hoy
```

### **Cargar datos HISTÓRICOS**

```javascript
// Primera vez: lento (carga desde SQLite y cachea)
// Segunda vez: rápido (carga desde IndexedDB)
await dataService.loadHistoricalData(30); // Últimos 30 días

console.log(dataService.errors); // Array combinado
```

### **Cambiar rango de fechas**

```javascript
// Rango 0 = Hoy (ultra-rápido)
await dataService.changeDateRange(0);

// Rango 7 = Última semana (rápido si está cacheado)
await dataService.changeDateRange(7);

// Rango 30 = Último mes
await dataService.changeDateRange(30);
```

### **Refrescar datos**

```javascript
// Invalida caché en memoria y recarga
await dataService.refresh();
```

### **Estadísticas del caché**

```javascript
const stats = await dataService.getCacheStats();

console.log(stats);
// {
//   totalSize: "2.3 MB",
//   historicalRecords: 15234,
//   loadedMonths: ["202501", "202412"],
//   inMemoryCacheStatus: {
//     today: 123,
//     lastUpdated: Date
//   }
// }
```

### **Verificar salud del caché**

```javascript
await dataService.checkCacheHealth();
// Imprime reporte en consola
```

### **Limpiar caché antiguo**

```javascript
await dataService.cleanupCache();
// Elimina meses más antiguos que retentionMonths (12 por defecto)
```

---

## 🔧 Compatibilidad

`OptimizedDataService` expone **toda la API** de `EstadisticasDataService`:

| Método                        | Descripción          | Proxy |
| ----------------------------- | -------------------- | ----- |
| `getBasicStats()`             | Estadísticas básicas | ✅    |
| `filterByDateRange(days)`     | Filtrar por días     | ✅    |
| `onDataUpdate(callback)`      | Listener de cambios  | ✅    |
| `getLastUpdateFormatted()`    | Última actualización | ✅    |
| `getDatabaseStats()`          | Stats de SQLite      | ✅    |
| `getAvailableDates()`         | Fechas disponibles   | ✅    |
| `getAvailableDateRanges()`    | Rangos de fechas     | ✅    |
| `isHistoricalDataAvailable()` | Check DB histórica   | ✅    |
| `getCurrentDateRange()`       | Rango actual         | ✅    |

**Propiedades:**

- `errors` - Array de registros
- `lastUpdateTime` - Fecha de última carga
- `isLoading` - Estado de carga

---

## ⚡ Rendimiento Esperado

| Escenario              | ANTES | DESPUÉS  | Mejora |
| ---------------------- | ----- | -------- | ------ |
| Carga HOY (JSON)       | ~5s   | **< 1s** | 5x     |
| Carga 7 días (1ª vez)  | ~30s  | ~20s     | 1.5x   |
| Carga 7 días (2ª vez)  | ~30s  | **< 2s** | 15x    |
| Carga 30 días (1ª vez) | ~120s | ~60s     | 2x     |
| Carga 30 días (2ª vez) | ~120s | **< 3s** | 40x    |

**Nota:** Tiempos de "ANTES" asumen red lenta (servidor de red)

---

## 🧪 Testing

```javascript
// Ejecutar tests
const module = await import("./js/test-optimized-data-service.js");
await module.runOptimizedTests();
```

Ver: `test-optimized-data-service.js` para suite completa.

---

## 🐛 Debugging

### **Activar logs detallados**

```javascript
// En CacheManager
dataService.cacheManager.setDebugLogging(true);

// Logs mostrarán prefijo:
// 🗄️ [CacheManager] ...
// 🚀 [ODS] ...
```

### **Inspeccionar IndexedDB**

1. Abrir DevTools → Application
2. IndexedDB → `inbound_scope_cache`
3. Ver stores: `historical_data`, `sync_metadata`

### **Verificar qué se está cargando**

```javascript
// Ver en consola de dónde viene la data
await dataService.loadHistoricalData(7);

// Buscar en logs:
// 🚀 [CACHE HIT] → Viene de IndexedDB (rápido)
// 📂 [CACHE MISS] → Viene de SQLite (lento)
```

---

## 📈 Monitoreo

```javascript
// Estadísticas del caché
const stats = await dataService.getCacheStats();
console.table(stats);

// Salud del caché
await dataService.checkCacheHealth();

// Tamaño total usado
const health = await dataService.cacheManager.checkCacheHealth();
console.log(`Uso: ${health.totalSize} / 80 MB`);
```

---

## 🔄 Sincronización Multi-Usuario

**Problema:** 6-7 usuarios usando la app simultáneamente.

**Solución (Fase 3):**

- Polling cada X segundos para JSON del día
- Hash check para detectar cambios en datos históricos
- Invalidación de caché cuando hay cambios

**Actualmente (Fase 2):**

- Datos de HOY siempre actualizados (carga desde JSON)
- Datos históricos pueden estar desactualizados hasta cleanup

---

## 🗑️ Limpieza Automática

```javascript
// Configuración en CacheManager
maxSizeBytes: 80 * 1024 * 1024,  // 80MB máximo
retentionMonths: 12                // Mantener 12 meses

// Limpieza manual
await dataService.cleanupCache();

// Limpieza automática al superar 80MB
// (se ejecuta automáticamente)
```

---

## 🚨 Manejo de Errores

```javascript
try {
  await dataService.loadHistoricalData(30);
} catch (error) {
  console.error("Error cargando datos:", error);
  // Automáticamente hace fallback a método original
}
```

**Estrategia de fallback:**

1. Intenta IndexedDB
2. Si falla → Intenta SQLite
3. Si falla → Intenta JSON solo de hoy
4. Si falla → Muestra error al usuario

---

## 📚 Recursos Adicionales

- **Fase 1:** `README-FASE1-COMPLETE.md` - CacheManager básico
- **Estrategia:** `README-OPTIMIZATION-STRATEGY.md` - Plan completo
- **Tests:** `test-optimized-data-service.js` - Suite de pruebas

---

## 🎯 Próximos Pasos (Fase 3)

- [ ] Sincronización en tiempo real para datos de HOY
- [ ] Detección de cambios en datos históricos
- [ ] Precalculación de queries frecuentes
- [ ] Compresión de datos (gzip)
- [ ] Service Worker para carga en background

---

**Creado:** 2025-01-12  
**Versión:** 1.0  
**Estado:** ✅ Implementado (Fase 2)
