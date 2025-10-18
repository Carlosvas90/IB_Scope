# 🔄 Instrucciones para Regenerar JSONs Analytics

## ⚠️ Situación Actual

Los JSONs en la carpeta `Analytics/` son de la **versión antigua** del script. Necesitan ser regenerados con el script actualizado que incluye:

1. ✅ Desglose de `total`, `pending`, `resolved` en `trends.by_day`
2. ✅ Sección `insights` con análisis automático
3. ✅ `top_motives` poblado (incluyendo "Sin motivo")

---

## 📋 Verificación del Script

Antes de ejecutar, verifica que el script tenga estos cambios:

### 1. Función `calculate_trends_by_day()`

```python
return [
    {
        "date": date,
        "total": data['total'],      # ← Debe tener esto
        "pending": data['pending'],  # ← Debe tener esto
        "resolved": data['resolved'] # ← Debe tener esto
    }
    for date, data in sorted_days
]
```

### 2. Función `calculate_insights()` (nueva)

```python
def calculate_insights(errors, trends_by_day, trends_by_hour):
    """
    Genera insights automáticos basados en los datos.
    ...
```

### 3. Función `calculate_top_motives()` (actualizada)

```python
# Debe incluir "Sin motivo" cuando no hay feedback_motive
motive_counts['Sin motivo'] = motive_counts.get('Sin motivo', 0) + quantity
```

---

## 🚀 Pasos para Regenerar

### 1. Ubicación del Script

```
Ejemplos/generate_analytics_summaries.py
```

### 2. Verificar que config.json esté correcto

El script lee `config.json` de:

```
D:\Users\chuecc\Downloads\PPR_Scope\config.json
```

Asegúrate de que tenga las rutas correctas:

- `DB_Local`: Ruta a la carpeta con `Inventory_Health.db`
- `DB_Network`: Ruta de red alternativa (fallback)
- `UnificarRuta_Network`: Ruta donde se guardarán los JSONs

### 3. Ejecutar el Script

```bash
cd C:\Users\carlo\Downloads\0-IB-Scope\IB_Scope\Ejemplos
python generate_analytics_summaries.py
```

### 4. El script debe mostrar:

```
=== Generador de Resúmenes Analytics ===
Inicio: 2025-10-17 23:11:14

✅ Configuración cargada desde: D:\...\config.json
📊 Base de datos: LOCAL
📂 DB Path: C:\...\Inventory_Health.db
✅ Conectado a la base de datos

📂 Directorio de salida: C:\...\Analytics

📊 Generando resumen para: last_6_months (180 días)
📅 Rango: 2025-04-20 a 2025-10-16
✅ Errores encontrados: 14226
✅ Guardado: summary_last_6_months.json (11.4 KB)

📊 Generando resumen para: last_3_months (90 días)
...
```

---

## ✅ Verificación de los JSONs Generados

Después de ejecutar el script, verifica que los JSONs tengan la estructura correcta:

### Verificar `trends.by_day`:

```bash
# En PowerShell o Git Bash
cat Analytics/summary_last_week.json | grep -A 5 '"by_day"'
```

Debe mostrar:

```json
"by_day": [
  {
    "date": "2025-10-10",
    "total": 110,        ← ✅ Debe existir
    "pending": 110,      ← ✅ Debe existir
    "resolved": 0        ← ✅ Debe existir
  }
]
```

### Verificar `insights`:

```bash
cat Analytics/summary_last_week.json | grep -A 20 '"insights"'
```

Debe mostrar:

```json
"insights": {
  "peak_hour": {
    "hour": "09:00",
    "count": 632,
    "percentage": 9.3
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
  "trend_description": "Tendencia creciente (95.8% más errores)",
  "suggestions": [
    "🔥 El pico de errores ocurre a las 09:00 ...",
    "📈 Tendencia creciente ..."
  ]
}
```

### Verificar `top_motives`:

```bash
cat Analytics/summary_last_week.json | grep -A 10 '"top_motives"'
```

Debe mostrar:

```json
"top_motives": [
  {
    "motive": "Sin motivo",      ← ✅ NO debe estar vacío
    "count": 6500,
    "percentage": 95.4
  }
]
```

---

## 📂 Ubicación de los Archivos

### Archivos que se generan:

```
C:\Users\carlo\Downloads\0-Proyecto_IB_Scope\Analisis\Data\Analytics\
├── summary_last_6_months.json
├── summary_last_3_months.json
├── summary_last_month.json
├── summary_last_week.json
├── summary_last_3_days.json
└── metadata.json
```

### Archivo del día actual (actualizado cada 15 min):

```
C:\Users\carlo\Downloads\0-Proyecto_IB_Scope\Analisis\Data\
└── error_tracker_17102025.json
```

---

## 🔍 Solución de Problemas

### Error: "No se pudo cargar la configuración"

- Verifica que el archivo `config.json` exista en la ruta especificada
- El script busca en: `D:\Users\chuecc\Downloads\PPR_Scope\config.json`

### Error: "No se encontró la base de datos"

- Verifica que `Inventory_Health.db` exista
- Verifica las rutas en `config.json`:
  - `DB_Local`
  - `DB_Network`

### Error: "No se encontró UnificarRuta_Network"

- Agrega `UnificarRuta_Network` al `config.json`
- Debe apuntar a: `C:\...\Analisis\Data\`

### Los JSONs se generan pero tienen estructura antigua

- Verifica que estés ejecutando el script correcto
- Busca las funciones `calculate_insights()` en el script
- Si no existe, el script no está actualizado

---

## 📊 Después de Regenerar

Una vez que tengas los JSONs correctos:

1. ✅ Cópialos a la ruta de red si es necesario
2. ✅ Verifica que `config.json` de la app tenga `analytics_paths` configurado
3. ✅ Continuar con la adaptación del frontend para leer estos JSONs

---

## 🎯 Checklist Final

- [ ] Script verificado con las funciones actualizadas
- [ ] Script ejecutado correctamente sin errores
- [ ] JSONs generados tienen `trends.by_day` con `total`/`pending`/`resolved`
- [ ] JSONs tienen sección `insights` completa
- [ ] `top_motives` NO está vacío
- [ ] Archivos copiados a la ubicación correcta
- [ ] `config.json` de la app tiene `analytics_paths`

---

**Fecha:** 17 de octubre, 2025
**Script:** `generate_analytics_summaries.py` (versión actualizada)
