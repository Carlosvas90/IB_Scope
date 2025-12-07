# 🔄 Funcionalidad de Errores Similares - Feedback Automático

## 📋 Descripción

Esta funcionalidad permite aplicar automáticamente el mismo feedback a errores similares cuando se marca un error como "done". Los errores se consideran similares si comparten:

- **Mismo usuario** (`user_id`)
- **Mismo tipo de error** (`violation`)
- **Mismo ASIN** (`asin`)

**Importante**: Se aplicará el feedback SOLO a errores del mismo usuario, mismo tipo de error Y mismo ASIN, ya que cada ASIN puede tener situaciones diferentes (error real, necesita actualización, no es error, etc.).

## 🎯 Objetivo

Optimizar el proceso de feedback al permitir que un solo comentario se aplique automáticamente a múltiples errores similares del mismo usuario, reduciendo el tiempo de procesamiento y asegurando consistencia en el feedback.

## 🔧 Componentes Implementados

### 1. **SimilarErrorsService.js**

**Ubicación**: `src/renderer/apps/feedback-tracker/js/controllers/services/SimilarErrorsService.js`

**Funcionalidades**:

- `findSimilarErrors(errorId)`: Encuentra errores similares basados en login, tipo de error y ASIN
- `applyFeedbackToSimilarErrors(referenceErrorId, feedbackData, username)`: Aplica el mismo feedback a errores similares
- `generateSimilarErrorsMessage(similarInfo)`: Genera mensajes descriptivos
- `getSimilarErrorsDetails(similarInfo)`: Obtiene detalles para mostrar en el modal

### 2. **FeedbackModalController.js** (Actualizado)

**Ubicación**: `src/renderer/apps/feedback-tracker/js/controllers/FeedbackModalController.js`

**Nuevas funcionalidades**:

- `loadSimilarErrors(errorId)`: Carga errores similares al abrir el modal
- `showSimilarErrorsSection(similarInfo)`: Muestra la sección de errores similares
- `renderSimilarErrorsDetails(details)`: Renderiza la lista de errores similares

### 3. **StatusUpdateService.js** (Actualizado)

**Ubicación**: `src/renderer/apps/feedback-tracker/js/controllers/services/StatusUpdateService.js`

**Nuevas funcionalidades**:

- `applyFeedbackToSimilarErrors(referenceErrorId, feedbackData)`: Aplica feedback a errores similares automáticamente

### 4. **feedback-modal.html** (Actualizado)

**Ubicación**: `src/renderer/apps/feedback-tracker/views/feedback-modal.html`

**Nuevos elementos**:

- Sección de errores similares con mensaje informativo
- Lista de errores similares pendientes con ASIN visible
- Nota explicativa sobre la aplicación automática

### 5. **feedback-modal.css** (Actualizado)

**Ubicación**: `src/renderer/apps/feedback-tracker/css/feedback-modal.css`

**Nuevos estilos**:

- `.similar-errors-section`: Contenedor principal
- `.similar-error-item`: Elementos individuales de errores similares
- `.similar-error-asin`: Estilo especial para mostrar ASIN
- `.similar-error-quantity`: Badge de cantidad
- Estilos responsivos y accesibles

## 🚀 Flujo de Funcionamiento

### 1. **Detección de Errores Similares**

```javascript
// Al abrir el modal de feedback
const similarInfo = this.similarErrorsService.findSimilarErrors(errorId);
```

### 2. **Visualización en el Modal**

- Se muestra un mensaje indicando cuántos errores similares se encontraron
- Se lista cada error similar con sus detalles (ID, fecha, hora, contenedor, ASIN, cantidad)
- Se explica que el feedback se aplicará automáticamente

### 3. **Aplicación Automática**

```javascript
// Al marcar como "done" con feedback
if (newStatus === "done" && feedbackData) {
  await this.applyFeedbackToSimilarErrors(errorId, feedbackData);
}
```

### 4. **Notificación al Usuario**

- Se muestra una notificación de éxito indicando cuántos errores similares fueron actualizados
- Se registra en consola el resultado de la operación

## 📊 Ejemplo de Uso

### Escenario:

- Usuario: `amillped`
- Error: `Articulo <70cm en Barrel`
- Errores similares encontrados: 8 (6 pendientes)

### Resultado:

1. **Modal muestra**: "Se detectaron 8 errores similares (6 pendientes). Se aplicará el mismo feedback a los pendientes."
2. **Lista de errores similares** con detalles de cada uno (incluyendo ASIN)
3. **Al guardar**: Se aplica el feedback a los 6 errores pendientes automáticamente
4. **Notificación**: "Feedback aplicado a 6 errores similares"

## 🎨 Interfaz de Usuario

### Mensaje Principal

```
🔄 Errores Similares Detectados
Se detectaron 8 errores similares (6 pendientes). Se aplicará el mismo feedback a los pendientes.
```

### Lista de Errores

```
Error #123                    [2]
2025/01/15 14:30:10 - P-3-C214A542 | ASIN: B0CMZ8D9VD

Error #124                    [1]
2025/01/15 14:35:22 - P-3-C286A472 | ASIN: B0XYZ123ABC
```

### Nota Informativa

```
ℹ️ Nota: El mismo feedback se aplicará automáticamente a todos los errores similares pendientes.
```

## 🔍 Criterios de Similitud

Los errores se consideran similares si **AMBOS** estos campos coinciden:

1. **`user_id`**: Mismo usuario (login)
2. **`violation`**: Mismo tipo de error

### Ejemplo de Criterios:

```javascript
error.user_id === referenceError.user_id &&
  error.violation === referenceError.violation;
```

**Nota**: El ASIN ya no es un criterio de similitud, por lo que se incluirán errores con diferentes productos pero del mismo usuario y tipo de error.

## ⚡ Rendimiento

- **Detección**: O(n) - Recorre todos los errores una vez
- **Aplicación**: O(m) - Donde m es el número de errores similares
- **Caché**: Los errores similares se calculan solo cuando se abre el modal
- **Asíncrono**: La aplicación de feedback no bloquea la UI

## 🛡️ Manejo de Errores

- **Errores similares no encontrados**: Se oculta la sección
- **Error en la aplicación**: Se registra en consola, no interrumpe el flujo principal
- **Validación**: Solo se aplica a errores con estado "pending"
- **Rollback**: Si falla la aplicación a errores similares, el error principal se actualiza correctamente

## 📝 Logs de Debug

```javascript
// Detección
🔍 SimilarErrorsService: Encontrados 8 errores similares para 123
📋 SimilarErrorsService: 6 errores similares pendientes

// Aplicación
🔄 StatusUpdateService: Aplicando feedback a errores similares para 123
✅ StatusUpdateService: Se aplicó el feedback a 6 errores similares
```

## 🔧 Configuración

No requiere configuración adicional. Se activa automáticamente cuando:

- Se abre el modal de feedback
- Se marca un error como "done" con feedback

## 🚀 Beneficios

1. **Eficiencia**: Reduce el tiempo de procesamiento de feedback
2. **Consistencia**: Asegura que errores similares del mismo usuario reciban el mismo tratamiento
3. **Transparencia**: El usuario ve exactamente qué errores serán afectados (incluyendo ASIN)
4. **Flexibilidad**: Solo se aplica a errores pendientes
5. **Seguridad**: No interfiere con errores ya procesados
6. **Amplio alcance**: Incluye todos los errores del mismo usuario y tipo, sin importar el producto

## 🔄 Diferencias con la Versión Anterior

- **Criterio simplificado**: Solo login + tipo de error (sin ASIN)
- **Mayor cobertura**: Incluye errores con diferentes ASINs
- **Mejor UX**: Muestra el ASIN en la lista para mayor claridad
- **Más eficiente**: Menos restricciones = más errores agrupados

---

**Versión**: 2.0.0  
**Fecha**: Enero 2025  
**Desarrollado por**: Equipo IB Scope
