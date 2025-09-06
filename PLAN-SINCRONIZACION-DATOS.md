# Plan de Mejora: Sincronización de Datos entre Feedback-Tracker e Inventory-Stats

## 🔍 Problema Actual

### Situación Actual

- **Inventory-Stats** usa `window.inboundScope.dataService` (referencia al DataService de feedback-tracker)
- **Feedback-Tracker** actualiza datos directamente en su DataService
- **Problema**: Los cambios en feedback-tracker no se propagan automáticamente a Inventory-Stats
- **Causa raíz**: Falta un sistema de notificaciones reactivo entre aplicaciones

### Flujo de Datos Actual

```
feedback-tracker → DataService → Archivo JSON
                ↓
                NotificationService (solo IPC)

Inventory-Stats → DataService (misma instancia) → Datos obsoletos
```

## 🎯 Objetivos

1. **Sincronización en Tiempo Real**: Los cambios en una app se reflejan inmediatamente en la otra
2. **Eficiencia**: Evitar recargas innecesarias del archivo
3. **Consistencia**: Ambas apps siempre muestran los mismos datos
4. **Performance**: Mantener buena performance sin polling constante

## 🏗️ Solución Propuesta: Sistema de Eventos Reactivo

### Fase 1: Mejorar el Sistema de Notificaciones Existente

#### 1.1 Extender NotificationService

- Añadir soporte para eventos locales (no solo IPC)
- Crear sistema de suscripción por tipo de evento
- Implementar eventos granulares (error-updated, error-created, error-deleted)

#### 1.2 Crear EventBus Global

- Sistema centralizado de eventos para toda la aplicación
- Permite comunicación entre módulos sin dependencias directas
- Soporte para namespaces (feedback-tracker._, inventory-stats._)

### Fase 2: Implementar Listeners Reactivos

#### 2.1 En Feedback-Tracker

- Emitir eventos cuando se actualicen errores
- Notificar cambios de estado (pending → done, etc.)
- Eventos de CRUD: create, update, delete, bulk-update

#### 2.2 En Inventory-Stats

- Suscribirse a eventos de cambio de datos
- Actualizar KPIs automáticamente sin recargar archivo
- Mantener cache local sincronizado

### Fase 3: Optimizaciones de Performance

#### 3.1 Cache Inteligente

- Cache compartido entre aplicaciones
- Invalidación selectiva por tipo de cambio
- Lazy loading de datos no críticos

#### 3.2 Debouncing y Throttling

- Agrupar múltiples cambios en una sola actualización
- Evitar actualizaciones excesivas de UI
- Priorizar cambios críticos vs. cosméticos

## 🛠️ Implementación Técnica

### Estructura Propuesta

```
src/renderer/core/
├── services/
│   ├── EventBus.js              # Sistema central de eventos
│   ├── DataSyncService.js       # Coordinador de sincronización
│   └── SharedCacheService.js    # Cache compartido entre apps
└── events/
    ├── DataEvents.js            # Definiciones de eventos de datos
    └── EventTypes.js            # Constantes de tipos de eventos
```

### API de Eventos

```javascript
// Emitir evento de cambio
EventBus.emit("feedback-tracker.error.updated", {
  errorId: "123",
  oldStatus: "pending",
  newStatus: "done",
  timestamp: Date.now(),
  data: errorObject,
});

// Suscribirse a eventos
EventBus.on("feedback-tracker.error.*", (event) => {
  inventoryStats.refreshKPIs(event.data);
});
```

### Beneficios Inmediatos

1. **Sincronización Instantánea**: Cambios visibles en ambas apps inmediatamente
2. **Mejor UX**: No necesidad de recargar manualmente
3. **Consistencia**: Datos siempre actualizados
4. **Performance**: Solo se actualizan los datos que cambiaron

## 📅 Cronograma de Implementación

### Semana 1: Fundamentos

- [ ] Crear EventBus central
- [ ] Implementar DataSyncService
- [ ] Extender NotificationService existente

### Semana 2: Integración Feedback-Tracker

- [ ] Añadir emisión de eventos en todas las operaciones CRUD
- [ ] Migrar sistema actual a usar EventBus
- [ ] Testing de eventos en feedback-tracker

### Semana 3: Integración Inventory-Stats

- [ ] Implementar listeners reactivos
- [ ] Actualizar KPIs automáticamente
- [ ] Sincronizar cache local

### Semana 4: Optimizaciones y Testing

- [ ] Implementar debouncing/throttling
- [ ] Testing de sincronización completa
- [ ] Optimizaciones de performance
- [ ] Documentación

## 🔧 Cambios Específicos Requeridos

### En DataService.js

```javascript
// Añadir emisión de eventos
async updateErrorStatus(errorId, newStatus, userData) {
  const oldError = this.errors.find(e => e.id === errorId);
  const result = await this.errorProcessor.updateDetails(/* ... */);

  if (result) {
    // Emitir evento de cambio
    EventBus.emit('feedback-tracker.error.updated', {
      errorId,
      oldStatus: oldError.status,
      newStatus,
      timestamp: Date.now(),
      data: this.errors.find(e => e.id === errorId)
    });
  }

  return result;
}
```

### En InventoryStatsController.js

```javascript
// Suscribirse a eventos
init() {
  // ... inicialización existente ...

  // Suscribirse a cambios de datos
  EventBus.on('feedback-tracker.error.updated', this.handleErrorUpdate.bind(this));
  EventBus.on('feedback-tracker.data.refreshed', this.handleDataRefresh.bind(this));
}

handleErrorUpdate(event) {
  // Actualizar solo los KPIs afectados sin recargar archivo
  this.updateKPIsFromEvent(event);
}
```

## 🎯 Resultados Esperados

### Antes (Situación Actual)

- Usuario cambia estado en feedback-tracker ✅
- Inventory-Stats muestra datos obsoletos ❌
- Usuario debe recargar manualmente ❌
- Performance: Recarga completa del archivo ❌

### Después (Con Mejoras)

- Usuario cambia estado en feedback-tracker ✅
- Inventory-Stats se actualiza automáticamente ✅
- Datos siempre consistentes ✅
- Performance: Solo actualiza lo necesario ✅

## 🚀 Beneficios Adicionales

1. **Escalabilidad**: Fácil añadir nuevas aplicaciones que consuman los mismos datos
2. **Debugging**: Sistema de eventos facilita el debugging de flujo de datos
3. **Testing**: Eventos permiten testing más granular
4. **Mantenibilidad**: Separación clara de responsabilidades
5. **Extensibilidad**: Base sólida para futuras funcionalidades

## 🎨 Implementación Opcional: UI Visual

### Dashboard de Estado de Datos

- Indicador visual de sincronización
- Timestamp de última actualización
- Estado de conexión entre aplicaciones
- Botón de "Forzar Sincronización" para casos edge

---

**Estado**: 📋 Propuesta  
**Prioridad**: 🔥 Alta  
**Esfuerzo Estimado**: 2-3 semanas  
**Impacto**: 🎯 Alto - Mejora significativa en UX y consistencia de datos
