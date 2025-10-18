# 📊 Resumen Completo: Optimización de Estadísticas

**Fecha:** 17 de octubre, 2025  
**Objetivo:** Eliminar consultas a la DB desde el frontend y usar JSONs pre-procesados

---

## ✅ COMPLETADO

### 1. Script `generate_analytics_summaries.py` Actualizado

**Ubicación:** `Ejemplos/generate_analytics_summaries.py`

**Cambios implementados:**

#### a) `calculate_trends_by_day()` - Desglose por Estado

```python
# Antes:
{
  "date": "2025-10-14",
  "count": 1187
}

# Ahora:
{
  "date": "2025-10-14",
  "total": 1187,
  "pending": 1187,
  "resolved": 0
}
```

#### b) `calculate_insights()` - Análisis Automático (NUEVO)

```python
"insights": {
  "peak_hour": { "hour": "09:00", "count": 632, "percentage": 9.3 },
  "worst_day": { "date": "2025-10-16", "count": 2259 },
  "best_day": { "date": "2025-10-10", "count": 110 },
  "trend": "increasing",
  "trend_description": "Tendencia creciente (95.8% más errores)",
  "suggestions": [
    "🔥 El pico de errores ocurre a las 09:00 ...",
    "📈 Tendencia creciente ..."
  ]
}
```

#### c) `calculate_top_motives()` - Incluir "Sin motivo"

```python
# Ahora maneja casos sin motivo explícitamente
"top_motives": [
  {
    "motive": "Sin motivo",
    "count": 6500,
    "percentage": 95.4
  }
]
```

### 2. `config.json` Actualizado

**Ubicación:** `config/config.json`

**Cambio agregado:**

```json
"analytics_paths": [
  "\\\\ant\\dept-eu\\VLC1\\Public\\Apps_Tools\\chuecc\\IB_Scope\\Data\\Analytics\\",
  "C:\\Users\\carlo\\Downloads\\0-Proyecto_IB_Scope\\Analisis\\Data\\Analytics\\"
]
```

### 3. Documentación Creada

- ✅ `CAMBIOS_JSON_STRUCTURE.md` - Explicación detallada de cambios
- ✅ `INSTRUCCIONES_REGENERAR_JSON.md` - Guía paso a paso para regenerar JSONs
- ✅ `RESUMEN_CAMBIOS_Y_PROXIMOS_PASOS.md` - Este documento

---

## ⏳ PENDIENTE

### 1. Regenerar JSONs con el Script Actualizado

**Estado:** ⚠️ Los JSONs actuales son de la versión antigua

**Acción requerida:**

```bash
cd Ejemplos
python generate_analytics_summaries.py
```

**Verificación:**

- [ ] `trends.by_day` tiene `total`, `pending`, `resolved`
- [ ] Existe sección `insights`
- [ ] `top_motives` NO está vacío

**Ubicación de salida:**

```
C:\Users\carlo\Downloads\0-Proyecto_IB_Scope\Analisis\Data\Analytics\
```

### 2. Adaptar el Frontend para Leer JSONs

**Archivos a modificar:**

#### a) `EstadisticasDataService.js`

**Ubicación:** `src/renderer/apps/feedback-tracker/estadisticas/js/services/EstadisticasDataService.js`

**Cambios necesarios:**

- Eliminar/deprecar `DatabaseService` y `HistoricalDataService`
- Crear método para leer JSONs desde `analytics_paths`
- Implementar lógica de combinación (histórico + día actual)

#### b) `estadisticas-controller.js`

**Ubicación:** `src/renderer/apps/feedback-tracker/estadisticas/js/estadisticas-controller.js`

**Cambios necesarios:**

- Actualizar `loadData()` para usar nuevos métodos
- Eliminar referencias a base de datos
- Adaptar a nueva estructura de datos

#### c) `AnalyticsProcessor.js`

**Ubicación:** `src/renderer/apps/feedback-tracker/estadisticas/js/services/AnalyticsProcessor.js`

**Cambios necesarios:**

- Puede simplificarse o eliminarse si los datos ya vienen procesados
- O adaptarse para solo combinar histórico + actual

---

## 🔄 Estrategia de Combinación

### Estructura de Archivos

**Históricos (pre-procesados, SIN hoy):**

```
Analytics/
├── summary_last_week.json      (últimos 7 días hasta AYER)
├── summary_last_month.json     (últimos 30 días hasta AYER)
├── summary_last_3_months.json  (últimos 90 días hasta AYER)
└── metadata.json               (info de todos los archivos)
```

**Día actual (actualizado cada 15 min):**

```
Data/
└── error_tracker_17102025.json  (solo HOY)
```

### Lógica de Combinación

**Cuando el usuario selecciona un periodo:**

1. **Cargar JSON histórico apropiado**

   ```javascript
   const periodo = "7"; // Última semana
   const historico = await loadHistoricalJSON("summary_last_week.json");
   ```

2. **Cargar archivo del día actual**

   ```javascript
   const hoy = await loadTodayJSON("error_tracker_17102025.json");
   ```

3. **Combinar datos**
   ```javascript
   const combined = {
     metadata: {
       ...historico.metadata,
       includes_today: true,
       total_days: historico.metadata.total_days + 1,
     },
     kpis: {
       total_incidents: historico.kpis.total_incidents + calcularTotalHoy(hoy),
       // ... sumar todos los KPIs
     },
     trends: {
       by_day: [
         ...historico.trends.by_day,
         calcularDiaActual(hoy), // Agregar día de hoy
       ],
       by_hour: combinarHoras(historico.trends.by_hour, hoy),
     },
     // ... combinar el resto
   };
   ```

### Funciones Helper Necesarias

```javascript
// Calcular KPIs del día actual
function calcularKPIsHoy(errorsHoy) {
  return {
    total_incidents: errorsHoy.errors.reduce((sum, e) => sum + e.quantity, 0),
    pending: errorsHoy.errors
      .filter((e) => e.feedback_status === "pending")
      .reduce((sum, e) => sum + e.quantity, 0),
    resolved: errorsHoy.errors
      .filter((e) => e.feedback_status === "done")
      .reduce((sum, e) => sum + e.quantity, 0),
  };
}

// Calcular tendencia del día actual
function calcularDiaActual(errorsHoy) {
  const totalHoy = errorsHoy.errors.reduce((sum, e) => sum + e.quantity, 0);
  const pendingHoy = errorsHoy.errors
    .filter((e) => e.feedback_status === "pending")
    .reduce((sum, e) => sum + e.quantity, 0);

  return {
    date: new Date().toISOString().split("T")[0],
    total: totalHoy,
    pending: pendingHoy,
    resolved: totalHoy - pendingHoy,
  };
}

// Combinar errores por hora
function combinarHoras(horasHistorico, errorsHoy) {
  const horasHoy = new Array(24).fill(0);

  errorsHoy.errors.forEach((error) => {
    const hour = parseInt(error.time.split(":")[0]);
    horasHoy[hour] += error.quantity;
  });

  return horasHistorico.map((h, index) => ({
    hour: h.hour,
    count: h.count + horasHoy[index],
  }));
}

// Combinar tops (ASINs, usuarios, violaciones)
function combinarTops(topHistorico, errorsHoy, campo, limit = 10) {
  // 1. Crear mapa de históricos
  const mapa = new Map();
  topHistorico.forEach((item) => {
    mapa.set(item[campo], item);
  });

  // 2. Agregar/actualizar con datos de hoy
  errorsHoy.errors.forEach((error) => {
    const key = error[campo];
    if (!mapa.has(key)) {
      mapa.set(key, { [campo]: key, total_errors: 0 });
    }
    mapa.get(key).total_errors += error.quantity;
  });

  // 3. Ordenar y limitar
  return Array.from(mapa.values())
    .sort((a, b) => b.total_errors - a.total_errors)
    .slice(0, limit);
}
```

---

## 📊 Formato de Datos

### Archivo Histórico (summary\_\*.json)

```json
{
  "metadata": {
    "period": "last_week",
    "start_date": "2025-10-10",
    "end_date": "2025-10-16",
    "excludes_today": true
  },
  "kpis": { ... },
  "trends": {
    "by_day": [
      { "date": "2025-10-10", "total": 110, "pending": 110, "resolved": 0 }
    ],
    "by_hour": [ ... ]
  },
  "top_asins": [ ... ],
  "top_violations": [ ... ],
  "top_motives": [ ... ],
  "top_offenders": [ ... ],
  "insights": { ... }
}
```

### Archivo Día Actual (error*tracker*\*.json)

```json
{
  "errors": [
    {
      "id": "96fd0853-...",
      "user_id": "montejup",
      "date": "2025/10/16",
      "time": "00:33:15",
      "asin": "B0D14YFLXD",
      "violation": "Peso < 5 ubicado en Shelf C o B",
      "feedback_status": "pending",
      "feedback_motive": "",
      "quantity": 12,
      "occurrences": [ ... ]
    }
  ]
}
```

**Nota:** Las fechas están en formato diferente:

- Histórico: `"2025-10-16"` (guiones)
- Día actual: `"2025/10/16"` (slashes)

Necesitarás normalizar las fechas al combinar.

---

## 🎯 Plan de Acción

### Fase 1: Preparación (Ahora)

- [x] Actualizar script Python
- [x] Actualizar config.json
- [x] Crear documentación
- [ ] **Regenerar JSONs** ⚠️ **IMPORTANTE**
- [ ] Verificar estructura de JSONs

### Fase 2: Desarrollo Frontend (Siguiente)

- [ ] Crear servicio para leer JSONs
- [ ] Implementar lógica de combinación
- [ ] Adaptar controlador de estadísticas
- [ ] Eliminar/deprecar servicios de DB

### Fase 3: Testing (Después)

- [ ] Probar carga de cada periodo
- [ ] Verificar combinación histórico + hoy
- [ ] Validar que todos los gráficos funcionen
- [ ] Comparar con datos de DB (validación)

### Fase 4: Optimización (Final)

- [ ] Agregar caché de JSONs en frontend
- [ ] Implementar auto-refresh inteligente
- [ ] Manejo de errores robusto
- [ ] Loading states mejorados

---

## 🚨 Notas Importantes

### Diferencias de Formato

- **Fechas**: Histórico usa `YYYY-MM-DD`, día actual usa `YYYY/MM/DD`
- **Campo fecha**: Histórico usa `error_date`, día actual usa `date`
- **Campo hora**: Histórico usa `error_time`, día actual usa `time`

### Consideraciones de Performance

- JSONs históricos: ~10 KB (muy ligero)
- Archivo día actual: ~100 KB (tolerable)
- Combinación en memoria: Mínima, pre-calculados
- Carga prácticamente instantánea vs. consultas DB lentas

### Mantenimiento

- JSONs se regeneran diariamente a las 05:00 AM
- Archivo día actual se actualiza cada 15 minutos
- No requiere mantenimiento manual
- Los insights se pre-calculan, no se generan en tiempo real

---

## ✨ Beneficios Esperados

1. **Performance:** 100x más rápido que consultas a DB
2. **UX:** Carga instantánea de estadísticas
3. **Escalabilidad:** Fácil agregar más periodos
4. **Confiabilidad:** Datos pre-validados
5. **Insights:** Análisis automático consistente
6. **Mantenibilidad:** Código más simple

---

**Siguiente paso:** Regenerar los JSONs con el script actualizado y verificar que tengan la estructura correcta.

Luego podemos empezar con la adaptación del frontend.
