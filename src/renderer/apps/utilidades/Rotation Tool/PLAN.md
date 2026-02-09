# Rotation Tool – Plan de desarrollo

## 1. Objetivo

Herramienta para **gestionar la asignación y rotación de personal**: leer resumen de horas de los últimos 90 días, respetar formación (skillmatrix), restricciones, freezes y reglas de rotación, y generar/actualizar la pizarra de alineación en formato JSON.

---

## 2. Fuentes de datos (inputs)

| # | Fuente | Descripción | Formato / Origen |
|---|--------|-------------|-------------------|
| 1 | **Attendance** | Quién viene a trabajar (lista del día) | **CSV** (1 login por línea) o **pegar logins** en lista dentro de la app |
| 2 | **Skillmatrix** | Procesos que conoce cada persona; **main_process** por persona (prioridad: más tiempo en main, sin perder los otros); mínimo 20h/90d en main para permisos | Existente: `skillmatrix.json`; **añadir campo main_process**. Horas 90d desde CSV/TXT o JSON optimizado |
| 3 | **Rotation** | Horas recientes por proceso (semana, ayer) para reglas (ej. no repetir Team Lift, máx 8h/semana) | **TXT/CSV generado diariamente** o JSON optimizado (misma fuente que horas 90d) |
| 4 | **Freezed** | Personas fijas en un puesto (ej. formación). Hasta que alguien lo quite, **máx 5 días** estándar | Nuevo JSON: persona + puesto + fecha_inicio (opcional tope 5 días) |
| 5 | **Restricción** | Personas que NO pueden estar en un proceso | **Ambos**: “no en proceso X durante N días” y “hasta fecha Y”; puede ser **indefinido** hasta revisión médica |
| 6 | **Puestos** | Puestos con proceso asociado; cada puesto tiene **requisitos de formación** (skills) | `puestos.json` (existente) + **nuevo JSON** de requerimientos por puesto (skill_ids por puesto) |
| 7 | **Comunicaciones** | Mensajes para la pizarra – **solo texto** (ej. “A las 10 pasar por enfermería”) | Nuevo: lista de textos (no son puestos) |
| 8 | **Rates** | Rate por persona por proceso; **target por proceso** (ej. Pick = 100). Garantizar que se cumpla el rate del proceso | Lista de target rate por proceso + datos por persona (analytics_paths / DB) |

---

## 3. Dinámica de uso (flujos)

### 3.1 Generación de pizarra inicial (día D para día D+1)

1. Usuario **carga Attendance**: CSV (1 login por línea) o pega logins en lista en la app.
2. Usuario **define demanda directamente por puesto** (el proceso se deduce del puesto): ej. 4 Pick Tower, 4 Pick High Rack, 10 Stow, 5 Ship, etc.
3. Sistema **genera asignación** con **orden de prioridad**:
   - **1.º Critical roles**: llenar primero los puestos critical role (esas personas no rotan automáticamente).
   - **2.º Pocos procesos**: priorizar personas con menos procesos/formaciones para que también roten.
   - **3.º Resto**: personas que pueden ir en casi cualquier sitio.
4. Respetar en todo momento: formación por puesto, main process (más tiempo en main, 20h/90d), freezed, restricciones, reglas de rotación (JSON editable), y target de rate por proceso.
5. **Salida**: JSON de pizarra **de referencia** (fecha, asignaciones, comunicaciones). Este es el “plan” del día.

### 3.2 Comparación pizarra referencia vs final (día D)

1. **Pizarra de referencia**: la generada el día anterior (plan).
2. **Pizarra final**: la que se va actualizando al **escanear** en la app Pizarra durante el día.
3. El **dashboard de Pizarra** lee la referencia y, al actualizar, **marca los cambios** (discrepancias).
4. Rotation Tool (o Pizarra) puede **comparar** referencia vs final: qué cambió, por departamento, para análisis y justificación.

### 3.3 Regeneración pre-descanso (rotación parcial/total)

1. Al ir al descanso se **genera una nueva pizarra**: todos los puestos son “nuevos” en el sentido de que se reasignan siguiendo las mismas normas.
2. Usuario decide **qué rota**: todos, o solo algunos puestos (ej. solo Pick y Pack). **Critical role nunca rota** de forma automática.
3. Sistema genera **nueva pizarra** (JSON) con las rotaciones aplicadas. **Pizarra solo lee el JSON de la pizarra final**, no el de referencia.

---

## 4. Formato JSON de la pizarra (propuesta)

- **Pizarra de referencia** (plan del día): generada por Rotation Tool; el dashboard de Pizarra la usa para marcar cambios.
- **Pizarra final**: la que guarda Pizarra al escanear. **Pizarra solo lee el JSON de la pizarra final** para mostrar el estado actual.

```json
{
  "version": "1.0",
  "fecha": "2025-01-28",
  "tipo": "referencia|final",
  "generado_en": "2025-01-27T18:00:00Z",
  "demanda": [
    { "puesto_id": "pick-tower", "cantidad": 4 },
    { "puesto_id": "pick-highrack", "cantidad": 4 },
    { "puesto_id": "stow", "cantidad": 10 }
  ],
  "asignaciones": [
    {
      "login": "chuecc",
      "nombre": "Juan Pérez",
      "puesto_id": "pick-tower",
      "proceso_id": "pick",
      "es_main": false,
      "es_critical_role": false,
      "es_freeze": false,
      "notas": ""
    }
  ],
  "comunicaciones": [
    { "id": "msg1", "texto": "A las 10:00 pasar por enfermería" }
  ],
  "reglas_aplicadas": ["min_20h_main", "critical_primero", "balance_rates"],
  "historial_cambios": []
}
```

- **Demanda**: siempre por **puesto** (el proceso se infiere del puesto).
- **Comunicaciones**: solo **texto** (sin prioridad/hora en el modelo base).
- **Comparación**: referencia vs final → diff por persona/departamento.

---

## 5. Reglas de rotación (configurables)

- **Mínimo 20h en main (90 días)**: garantizar que cada persona tenga al menos 20h en su main process en el periodo.
- **Límites por proceso**: ej. máx 8h/semana en proceso X, no repetir Team Lift al día siguiente. **JSON editable**, visible y editable desde la app.
- **Restricción**: no asignar persona a proceso X. **Ambos tipos**: “durante N días” o “hasta fecha Y”; puede ser **indefinido** hasta revisión médica.
- **Freeze**: persona en puesto Z (formación, etc.). Hasta que alguien lo quite; **máximo 5 días** estándar.
- **Critical roles**: puestos que **nunca** rotan automáticamente; se llenan primero en el algoritmo.
- **Rates**: lista de **target por proceso** (ej. Pick = 100); garantizar que el proceso cumpla ese rate con las personas asignadas.

Las reglas se guardan en un **JSON editable** (ej. `rotation-rules.json`) y pueden verse/editarse desde la app.

---

## 6. Integración con el resto del sistema

- **Rutas**: Rotation Tool usa **las mismas rutas que Pizarra** (`pizarra_paths`) para leer skillmatrix, puestos, roster y escribir pizarras (referencia y final).
- **Pizarra**: lee **solo el JSON de la pizarra final**; la referencia se usa para marcar discrepancias en el dashboard.
- **SkillMatrix**: extender con campo **main_process** por persona; horas 90d desde CSV/TXT o JSON (fuente externa que se genera/sube).
- **Puestos**: `puestos.json` existente + **nuevo JSON de requerimientos por puesto** (qué skill_ids exige cada puesto, ej. L9 Pack = Pack + Shipping).
- **Rates**: target por proceso + datos por persona desde `analytics_paths` / DB; usarlos para cumplir rate del proceso.
- **Permisos**: **permiso específico** para Rotation Tool en `permission-groups` (no el mismo que Pizarra).

---

## 7. Fases de implementación sugeridas

| Fase | Alcance |
|------|--------|
| **F1 – Datos y modelos** | Definir JSON: Freezed, Restricciones, Comunicaciones, **rotation-rules** (editable), **requerimientos por puesto**. Extender Skillmatrix con **main_process**. Formato CSV/TXT o JSON para horas 90d y rotation. |
| **F2 – Lectura de fuentes** | Cargar Attendance (CSV o lista), Skillmatrix+main, Puestos+requerimientos, Freezed, Restricciones, reglas, horas/rotation (TXT o JSON). |
| **F3 – Algoritmo de asignación** | Orden: 1) Critical roles, 2) Pocos procesos, 3) Resto. Respetar skills, main, 20h/90d, freezed, restricciones, reglas, rate target. |
| **F4 – UI generación pizarra** | Subir/pegar attendance, demanda por puesto, “Generar”, vista previa, export JSON (referencia/final). |
| **F5 – Comparación referencia vs final** | Cargar referencia y final, diff por persona/departamento, reporte discrepancias (Pizarra puede marcar cambios en vivo). |
| **F6 – Rotación pre-descanso** | Qué puestos rotan (todos o parcial); critical roles nunca; generar nueva pizarra JSON. |
| **F7 – Rates y afinado** | Target rate por proceso; garantizar cumplimiento. Comunicaciones (solo texto) en pizarra. Permiso específico en permission-groups. |

---

## 10. Archivos y modelos de datos a crear / extender

| Archivo / dato | Descripción |
|----------------|-------------|
| **Skillmatrix** (existente) | Añadir campo `main_process` (id de proceso principal por persona). |
| **requerimientos_puesto.json** (nuevo) | Por puesto_id: lista de skill_ids requeridos (ej. `pick-tower` → `["pick","pick_tower"]`). |
| **rotation-rules.json** (nuevo) | Reglas editables: máx horas/semana por proceso, no repetir puesto/process en 24h, etc. Visible/editable en app. |
| **freezed.json** (nuevo) | Lista: login, puesto_id, fecha_inicio; tope 5 días. |
| **restricciones.json** (nuevo) | Lista: login, proceso_id, motivo, tipo (dias \| hasta_fecha \| indefinido), valor (N o fecha). |
| **comunicaciones.json** (nuevo) | Lista: id, texto (mensajes para la pizarra). |
| **Horas 90d / rotation** | CSV o TXT (1 por línea o columnas login, proceso, horas, periodo) o JSON optimizado; se genera/sube externamente. |
| **Pizarra referencia / final** | Mismo esquema JSON; `tipo`: `referencia` \| `final`. Pizarra lee solo el de tipo final. |

---

## 8. Respuestas de clarificación (resumen)

| Tema | Decisión |
|------|----------|
| **Attendance** | CSV (1 login por línea) o pegar logins en lista en la app |
| **Skillmatrix** | Añadir **main_process** por persona; 20h/90d desde CSV/TXT o JSON |
| **Rotation / horas** | TXT generado diariamente (o JSON); reglas en **JSON editable**, visibles/editables en la app |
| **Freezed** | Hasta que alguien lo quite; **máx 5 días** estándar |
| **Restricción** | Ambos: “N días” y “hasta fecha Y”; puede ser indefinido hasta revisión médica |
| **Puestos** | **Nuevo JSON** de requerimientos por puesto (skills por puesto); demanda **directamente por puesto** |
| **Prioridad algoritmo** | 1) Critical roles; 2) Pocos procesos; 3) Resto (muy flexibles) |
| **Comunicaciones** | Solo texto |
| **Rates** | Lista target por proceso (ej. Pick=100); garantizar que se cumpla |
| **Pizarra** | Referencia = plan; final = escaneada. **Pizarra lee solo el JSON final** |
| **Rutas** | Mismas que Pizarra (`pizarra_paths`) |
| **Permisos** | **Permiso específico** en permission-groups |

---

## 9. Orden de prioridad del algoritmo de asignación

Al generar la pizarra (inicial o pre-descanso), el sistema debe:

1. **Llenar primero puestos critical role**: asignar a las personas que ya están en esos puestos (o que cumplan formación) y **no moverlas** en rotaciones automáticas.
2. **Priorizar personas con pocos procesos**: asignar a quienes tienen menos formaciones para que también puedan rotar y no quedarse siempre en el mismo sitio.
3. **Último: personas muy flexibles**: asignar a quienes pueden ir en casi cualquier puesto para completar la demanda.

En todo el proceso se respetan: formación requerida por puesto, main process (y 20h/90d), freezed, restricciones, reglas del JSON y target de rate por proceso.
