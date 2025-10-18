# 📊 Cambios en Estructura de JSONs Analytics

## Fecha de actualización

**17 de octubre, 2025**

---

## 🎯 Objetivo

Optimizar el sistema de estadísticas para que **NO lea la base de datos**, sino que use JSONs pre-procesados que se generan diariamente. Los gráficos ahora se alimentan directamente de estos JSONs.

---

## ✅ Cambios Realizados en `generate_analytics_summaries.py`

### 1. **Tendencias por Día - Desglose por Estado** ⭐ CRÍTICO

**Antes:**

```json
"by_day": [
  {
    "date": "2025-10-14",
    "count": 1187
  }
]
```

**Ahora:**

```json
"by_day": [
  {
    "date": "2025-10-14",
    "total": 1187,
    "pending": 1187,
    "resolved": 0
  }
]
```

**Motivo:** El gráfico de tendencias (`TrendChart`) necesita mostrar 3 series: Total, Pendientes y Resueltos.

---

### 2. **Top Motivos - Incluir "Sin motivo"** ⭐ CRÍTICO

**Antes:**

```json
"top_motives": []  // Vacío si no hay motivos
```

**Ahora:**

```json
"top_motives": [
  {
    "motive": "Sin motivo",
    "count": 6500,
    "percentage": 95.4
  },
  {
    "motive": "Falta de capacidad",
    "count": 200,
    "percentage": 2.9
  }
]
```

**Motivo:** El dashboard necesita mostrar distribución de motivos incluso cuando los errores no tienen motivo asignado.

---

### 3. **Insights Automáticos** 💡 NUEVO

**Agregado:**

```json
"insights": {
  "peak_hour": {
    "hour": "16:00",
    "count": 552,
    "percentage": 8.1
  },
  "worst_day": {
    "date": "2025-10-16",
    "count": 2259
  },
  "best_day": {
    "date": "2025-10-10",
    "count": 110
  },
  "trend": "increasing",
  "trend_description": "Tendencia creciente (23.5% más errores)",
  "suggestions": [
    "🔥 El pico de errores ocurre a las 16:00 (552 errores, 8.1% del total). Considerar refuerzo en ese horario.",
    "📈 Tendencia creciente (23.5% más errores). Se recomienda analizar las causas del incremento.",
    "⚠️ Alta variabilidad entre días: el peor día tuvo 20.5x más errores que el mejor día. Investigar factores que causan estas variaciones."
  ]
}
```

**Motivo:** Proveer análisis automático que antes se calculaba en el frontend, mejorando performance y consistencia.

---

## 📋 Estructura Completa del JSON

```json
{
  "metadata": {
    "period": "last_week",
    "start_date": "2025-10-10",
    "end_date": "2025-10-16",
    "generated_at": "2025-10-17 23:11:14",
    "total_days": 7,
    "total_records": 2962,
    "excludes_today": true
  },
  "kpis": {
    "total_incidents": 6811,
    "daily_average": 973.0,
    "pending": 6811,
    "resolved": 0,
    "resolution_rate": 0.0
  },
  "trends": {
    "by_day": [
      {
        "date": "2025-10-14",
        "total": 1187,
        "pending": 1187,
        "resolved": 0
      }
    ],
    "by_hour": [
      {
        "hour": "16:00",
        "count": 552
      }
    ]
  },
  "distribution": {
    "by_status": [
      {
        "status": "pending",
        "count": 6811,
        "percentage": 100.0
      }
    ]
  },
  "top_asins": [
    /* ... */
  ],
  "top_violations": [
    /* ... */
  ],
  "top_motives": [
    /* Con datos incluyendo "Sin motivo" */
  ],
  "top_offenders": [
    /* ... */
  ],
  "asin_offenders": [
    /* ... */
  ],
  "insights": {
    /* Análisis automático */
  }
}
```

---

## 🔄 Estrategia de Combinación con el Día Actual

Los JSONs pre-procesados **excluyen el día de hoy** (se actualizan a las 05:00 AM con datos hasta ayer).

Para incluir el día actual, el frontend debe:

1. **Cargar el JSON histórico** según el periodo seleccionado:

   - `summary_last_week.json` (últimos 7 días SIN hoy)
   - `summary_last_month.json` (últimos 30 días SIN hoy)
   - etc.

2. **Cargar el archivo del día actual**:

   - `error_tracker_17102025.json` (actualizado cada 15 minutos)

3. **Combinar ambos**:
   - Sumar KPIs
   - Agregar el día actual a `trends.by_day`
   - Combinar las horas en `trends.by_hour`
   - Recalcular tops si es necesario

---

## 📊 Mapeo con los Gráficos

### KPIs (Tarjetas superiores)

- ✅ `kpis.total_incidents` → **Total de Incidencias**
- ✅ `kpis.daily_average` → **Promedio Diario**
- ✅ `kpis.pending` → **Incidencias Pendientes**
- ✅ `kpis.resolved` → **Incidencias Resueltas**
- ✅ `kpis.resolution_rate` → **Tasa de Resolución**

### Gráficos

- ✅ `trends.by_day` → **TrendChart** (Línea/Barras/Área con 3 series)
- ✅ `trends.by_hour` → **HourlyChart** (Distribución por hora)
- ✅ `distribution.by_status` → **StatusChart** (Dona/Pie)
- ✅ `top_violations` → **TopChart** (Violaciones más comunes)
- ✅ `top_motives` → **TopChart** (Motivos más comunes)

### Tablas

- ✅ `top_offenders` → **Tabla de Usuarios**
- ✅ `top_asins` → **Tabla de ASINs**

### Insights

- ✅ `insights.suggestions` → **Sección de Insights Automáticos**

---

## 🚀 Siguientes Pasos

1. ✅ **Script actualizado** - Cambios aplicados en `generate_analytics_summaries.py`
2. ⏳ **Regenerar JSONs** - Ejecutar el script para crear los nuevos JSONs con la estructura actualizada
3. ⏳ **Adaptar Frontend** - Modificar el módulo de estadísticas para leer estos JSONs en lugar de consultar la DB
4. ⏳ **Implementar combinación** - Lógica para combinar JSON histórico + día actual

---

## 🔍 Notas Técnicas

- **Fechas en DB**: Formato `YYYY-MM-DD` (ejemplo: `2025-10-14`)
- **Horas**: Formato `HH:00` (ejemplo: `16:00`)
- **Encoding**: UTF-8 para caracteres especiales en motivos/violaciones
- **Tamaño**: ~10-11 KB por archivo JSON (muy ligero)
- **Actualización**: Los JSONs se generan diariamente a las 05:00 AM
- **Día actual**: El archivo `error_tracker_DDMMYYYY.json` se actualiza cada 15 minutos

---

## ✨ Beneficios

1. **Performance**: No más consultas lentas a la DB desde el frontend
2. **Velocidad**: JSONs pre-calculados cargan instantáneamente
3. **Escalabilidad**: Fácil agregar más periodos sin afectar performance
4. **Consistencia**: Misma estructura siempre, validada en generación
5. **Insights**: Análisis automático pre-calculado y consistente

---

**Última actualización:** 17 de octubre, 2025 - Carlos Huerta
