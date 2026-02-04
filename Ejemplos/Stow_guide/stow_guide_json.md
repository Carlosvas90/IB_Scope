# stow_guide.json — Formato y cómo leerlo

JSON comprimido para la guía de stow: **&lt; 2 MB**. Solo Mod B y C (Pick Tower), sin bins bloqueadas.

---

## Estructura del archivo

```json
{
  "t": ["LIBRARY-DEEP", "HALF-VERTICAL", "BARREL", ...],
  "d": ["", "dz-P-HRV", "dz-P-...", ...],
  "b": [
    ["P-1-B294A200", 0, 0, 1, "B", 0],
    ["P-1-B294B200", 0, 45, 1, "B", 2],
    ...
  ]
}
```

| Clave | Significado |
|-------|-------------|
| **`t`** | Lista de **tipos de bin** (sin repetir). Cada fila usa el **índice** en esta lista. |
| **`d`** | Lista de **dropzones** (sin repetir). Cada fila usa el **índice** en esta lista. |
| **`b`** | Array de **bins**. Cada elemento es una fila con 6 valores (ver abajo). |

---

## Formato de cada fila en `b`

Cada fila es un array de **6 elementos** en este orden:

| Índice | Nombre           | Tipo   | Ejemplo   | Cómo obtener el valor final |
|--------|------------------|--------|-----------|------------------------------|
| `0`    | Bin Id           | string | `"P-1-B294A200"` | usar directo |
| `1`    | Tipo de bin      | int    | `0`       | **`t[row[1]]`** → ej. `"LIBRARY-DEEP"` |
| `2`    | Utilization %    | int    | `45`      | 0–100, usar directo |
| `3`    | Dropzone         | int    | `1`       | **`d[row[3]]`** → ej. `"dz-P-HRV"` |
| `4`    | Mod              | string | `"B"`     | `"B"` o `"C"`, usar directo |
| `5`    | Unique Asin Count| int    | `2`       | usar directo |

---

## Cómo leerlo en código (ejemplo)

```javascript
const data = JSON.parse(jsonString);
const types = data.t;   // tipos de bin
const dzs   = data.d;   // dropzones
const bins  = data.b;   // filas

for (const row of bins) {
  const binId          = row[0];
  const binType        = types[row[1]];
  const utilizationPct = row[2];
  const dropzone       = dzs[row[3]];
  const mod            = row[4];
  const uniqueAsinCount = row[5];

  // Ejemplo: filtrar Half-Vertical con baja utilización
  if (binType === "HALF-VERTICAL" && utilizationPct < 70) {
    console.log(`Stow AQUÍ: ${binId} (${utilizationPct}%, ${uniqueAsinCount} ASINs)`);
  }
}
```

---

## Origen y actualización

- Lo genera el pipeline de Space (**Procesar_StowMap.py**) a partir del CSV de StowMap.
- Se escribe en **`Data/processed/stow_guide.json`** y se copia a red con el resto de JSON.
- Solo incluye **Mod B y C** (Pick Tower) y **excluye bins bloqueadas** (`IsLocked`).
