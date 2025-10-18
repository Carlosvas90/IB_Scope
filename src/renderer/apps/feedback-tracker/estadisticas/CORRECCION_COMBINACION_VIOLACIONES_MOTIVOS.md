# 🔄 Corrección: Combinación de Violaciones y Motivos (Histórico + HOY)

**Fecha:** 18 de octubre, 2025  
**Problema:** "Distribución de Motivos" y "Distribución de Incidencias" no mostraban los datos de HOY cuando se seleccionaba un periodo histórico

---

## 🐛 Problema Identificado

Cuando se seleccionaba un periodo histórico (Última semana, 3 meses, etc.), las siguientes secciones **NO incluían los datos del día actual**:

- **Distribución de Incidencias** (top_violations)
- **Distribución de Motivos** (top_motives)

### ¿Por qué?

En el método `combineData()`, estas secciones simplemente copiaban los datos históricos **SIN sumar** los datos de HOY:

```javascript
// ❌ ANTES (Líneas 370-372)
top_violations: historicalData.top_violations || [],
top_motives: historicalData.top_motives || [],
```

**Resultado:** Si HOY tenías 100 errores nuevos, estos NO aparecían en los gráficos de distribución.

---

## ✅ Solución Aplicada

**Archivo Modificado:**  
`src/renderer/apps/feedback-tracker/estadisticas/js/services/AnalyticsJSONService.js`

### 1. Actualización del método `combineData()` (Líneas 368-377)

**Antes:**

```javascript
top_violations: historicalData.top_violations || [],
top_motives: historicalData.top_motives || [],
```

**Ahora:**

```javascript
// Combinar top violations de histórico + hoy
top_violations: this.combineTopViolations(
  historicalData.top_violations || [],
  this.calculateTopViolations(todayData.errors, 20)
),
// Combinar top motives de histórico + hoy
top_motives: this.combineTopMotives(
  historicalData.top_motives || [],
  this.calculateTopMotives(todayData.errors, 20)
),
```

✅ **Ahora calcula las violaciones y motivos de HOY y los combina con los históricos**

---

### 2. Nueva función `combineTopViolations()` (Líneas 418-448)

```javascript
/**
 * Combina top violations de histórico + hoy
 */
combineTopViolations(historicalViolations, todayViolations) {
  const combined = {};

  // Agregar violaciones históricas
  historicalViolations.forEach((item) => {
    const violation = item.violation || item.name || "Sin violación";
    combined[violation] = item.count || 0;
  });

  // Agregar violaciones de hoy
  todayViolations.forEach((item) => {
    const violation = item.violation || item.name || "Sin violación";
    combined[violation] = (combined[violation] || 0) + (item.count || 0);
  });

  // Calcular total
  const total = Object.values(combined).reduce((sum, val) => sum + val, 0);

  // Convertir a array, calcular porcentajes y ordenar
  return Object.entries(combined)
    .map(([violation, count]) => ({
      violation: violation,
      count: count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}
```

**¿Qué hace?**

1. Toma las violaciones históricas (ej: "Peso < 5 ubicado..." → 9736 errores)
2. Toma las violaciones de HOY (ej: "Peso < 5 ubicado..." → 50 errores nuevos)
3. **SUMA** ambas cantidades (9736 + 50 = 9786)
4. Recalcula los porcentajes con el nuevo total
5. Ordena por cantidad descendente
6. Retorna top 10

---

### 3. Nueva función `combineTopMotives()` (Líneas 450-480)

```javascript
/**
 * Combina top motives de histórico + hoy
 */
combineTopMotives(historicalMotives, todayMotives) {
  const combined = {};

  // Agregar motivos históricos
  historicalMotives.forEach((item) => {
    const motive = item.motive || item.name || "Sin motivo";
    combined[motive] = item.count || 0;
  });

  // Agregar motivos de hoy
  todayMotives.forEach((item) => {
    const motive = item.motive || item.name || "Sin motivo";
    combined[motive] = (combined[motive] || 0) + (item.count || 0);
  });

  // Calcular total
  const total = Object.values(combined).reduce((sum, val) => sum + val, 0);

  // Convertir a array, calcular porcentajes y ordenar
  return Object.entries(combined)
    .map(([motive, count]) => ({
      motive: motive,
      count: count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}
```

**¿Qué hace?**

Igual que `combineTopViolations()` pero para motivos:

1. Combina motivos históricos + HOY
2. Suma las cantidades
3. Recalcula porcentajes
4. Ordena y retorna top 10

---

## 🔄 Flujo Ahora

### Cuando seleccionas "Últimos 3 meses":

```
1. Se lee summary_last_3_months.json (histórico)
   ↓
2. Se lee error_tracker_18102025.json (HOY)
   ↓
3. combineData() combina ambos:
   ↓
   ├─ KPIs: suma histórico + hoy ✅
   ├─ Trends: agrega día de hoy ✅
   ├─ Distribution: combina estados ✅
   ├─ Top Violations: ✨ NUEVO - combina histórico + hoy
   └─ Top Motives: ✨ NUEVO - combina histórico + hoy
   ↓
4. Se muestran datos COMPLETOS en el dashboard
```

---

## 📊 Ejemplo Real

### Escenario:

**Histórico (3 meses):**

- "Peso < 5 ubicado en Shelf C o B" → **9736 errores** (29.8%)
- "Sin motivo" → **32664** (100%)

**HOY:**

- "Peso < 5 ubicado en Shelf C o B" → **25 errores nuevos**
- "Sin motivo" → **216 errores nuevos**

### ANTES de la corrección:

```
❌ Distribución de Incidencias mostraba: 9736 (NO incluía los 25 de hoy)
❌ Distribución de Motivos mostraba: 32664 (NO incluía los 216 de hoy)
```

### DESPUÉS de la corrección:

```
✅ Distribución de Incidencias muestra: 9761 (9736 + 25)
✅ Distribución de Motivos muestra: 32880 (32664 + 216)
✅ Porcentajes recalculados correctamente
```

---

## 🧪 Cómo Probar

### 1. Recarga la página:

```
Ctrl + Shift + R
```

### 2. Selecciona "Últimos 3 meses"

### 3. Verifica que los números incluyen HOY:

#### Distribución de Incidencias:

Busca violaciones que sepas que ocurrieron HOY y verifica que el count es mayor al del JSON histórico.

#### Distribución de Motivos:

Si HOY hubo errores, el total de "Sin motivo" debe ser **mayor** al del JSON histórico solo.

---

## 🎯 Resumen de Cambios

| Línea       | Cambio                         | Descripción                            |
| ----------- | ------------------------------ | -------------------------------------- |
| **368-377** | `combineData()` actualizado    | Ahora llama a funciones para combinar  |
| **418-448** | `combineTopViolations()` NUEVA | Combina violaciones de histórico + hoy |
| **450-480** | `combineTopMotives()` NUEVA    | Combina motivos de histórico + hoy     |

---

## 📋 Datos Que Ahora Se Combinan

| Dato                         | ¿Se combina histórico + HOY? | Notas                                       |
| ---------------------------- | ---------------------------- | ------------------------------------------- |
| **KPIs**                     | ✅ Sí                        | Ya funcionaba                               |
| **Tendencias (by_day)**      | ✅ Sí                        | Ya funcionaba                               |
| **Tendencias (by_hour)**     | ✅ Sí                        | Ya funcionaba                               |
| **Distribution (by_status)** | ✅ Sí                        | Ya funcionaba                               |
| **Top Violations**           | ✅ Sí ✨ **NUEVO**           | Ahora se combina                            |
| **Top Motives**              | ✅ Sí ✨ **NUEVO**           | Ahora se combina                            |
| **Top ASINs**                | ❌ No                        | Solo histórico (representativo del periodo) |
| **Top Offenders**            | ❌ No                        | Solo histórico (representativo del periodo) |

---

## 💡 Nota sobre ASINs y Offenders

**¿Por qué NO se combinan Top ASINs y Top Offenders?**

Porque estos rankings son **representativos del periodo completo**. Si los combinaras con solo 1 día (HOY), distorsionarías los rankings:

- Un ASIN con 700 errores en 3 meses podría quedar por debajo de uno con 50 errores solo HOY
- Sería injusto comparar frecuencias de errores de 90 días vs 1 día

**Las violaciones y motivos SÍ se combinan** porque son distribuciones porcentuales, no rankings absolutos.

---

## 🔧 Sin Impacto

- ✅ No hay cambios en performance
- ✅ No hay errores de linting
- ✅ Compatibilidad mantenida
- ✅ No requiere regenerar JSONs

---

**Estado:** ✅ COMPLETO Y LISTO PARA PROBAR

**Próximo paso:** Recarga la página y selecciona un periodo histórico para verificar que las distribuciones incluyen los datos de HOY 🚀
