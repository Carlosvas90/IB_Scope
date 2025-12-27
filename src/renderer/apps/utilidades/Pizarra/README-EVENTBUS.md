# EventBus - Sistema de Eventos para Pizarra

## 📋 Descripción

El EventBus es un sistema centralizado de eventos diseñado para facilitar la migración futura a WebSocket. Todos los eventos de la aplicación pasan por este bus, permitiendo una arquitectura desacoplada y preparada para sincronización en tiempo real.

## 🏗️ Arquitectura

```
┌─────────────────┐
│ PizarraController│
│   (UI Logic)     │
└────────┬─────────┘
         │ emit/subscribe
         ▼
┌─────────────────┐
│   EventBus      │
│  (Central Hub)  │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────────┐
│Local   │ │  Transports   │
│Subs    │ │ (WebSocket)   │
└────────┘ └───────────────┘
```

## 📦 Estructura de Archivos

```
js/
├── constants/
│   └── events.js          # Constantes de eventos
├── services/
│   ├── EventBus.js        # Implementación del EventBus
│   └── WebSocketTransport.js  # Transporte WebSocket (futuro)
└── pizarra.js             # Controller que usa EventBus
```

## 🎯 Eventos Disponibles

### Asignaciones
- `pizarra:asignacion:creada` - Nueva asignación creada
- `pizarra:asignacion:removida` - Asignación eliminada
- `pizarra:asignacion:actualizada` - Asignación modificada

### Puestos
- `pizarra:puesto:seleccionado` - Puesto seleccionado para escaneo
- `pizarra:puesto:creado` - Nuevo puesto personalizado creado
- `pizarra:puesto:actualizado` - Puesto modificado

### Usuarios
- `pizarra:usuario:escaneado` - Usuario escaneado
- `pizarra:usuario:duplicado` - Intento de duplicar usuario
- `pizarra:usuario:cambio_puesto` - Usuario movido a otro puesto

### Skill Matrix
- `pizarra:skill:verificado` - Skill verificado
- `pizarra:skill:actualizado` - Skill actualizado en matriz
- `pizarra:skill:alerta` - Alerta de skill no verificado

### Pizarra (Estado General)
- `pizarra:actualizada` - Estado de pizarra actualizado
- `pizarra:cargada` - Pizarra inicializada
- `pizarra:reseteada` - Pizarra reseteada

### UI
- `pizarra:dashboard:actualizado` - Dashboard refrescado
- `pizarra:modal:abierto` - Modal abierto
- `pizarra:modal:cerrado` - Modal cerrado
- `pizarra:toast:mostrado` - Notificación toast mostrada

### Datos
- `pizarra:datos:cargados` - Datos cargados desde archivos
- `pizarra:datos:guardados` - Datos guardados en archivos
- `pizarra:datos:error` - Error al cargar/guardar datos

### Roster
- `pizarra:roster:descargando` - Inicio de descarga de roster
- `pizarra:roster:descargado` - Roster descargado exitosamente
- `pizarra:roster:error` - Error al descargar roster

## 💻 Uso Básico

### Emitir un Evento

```javascript
import { eventBus } from "./services/EventBus.js";
import { PIZARRA_EVENTS } from "./constants/events.js";

// Emitir evento simple
eventBus.emit(PIZARRA_EVENTS.ASIGNACION_CREADA, {
  asignacion: { usuario_login: "USER123", puesto_id: "water-spider" },
  timestamp: new Date().toISOString(),
});
```

### Suscribirse a un Evento

```javascript
// Suscripción simple
const unsubscribe = eventBus.subscribe(
  PIZARRA_EVENTS.ASIGNACION_CREADA,
  (data, eventData) => {
    console.log("Nueva asignación:", data);
  }
);

// Desuscribirse
unsubscribe();
```

### Suscripción con Opciones

```javascript
// Suscripción con prioridad y "once"
eventBus.subscribe(
  PIZARRA_EVENTS.PIZARRA_ACTUALIZADA,
  (data) => {
    actualizarDashboard(data);
  },
  {
    priority: 10,  // Mayor prioridad se ejecuta primero
    once: false,    // Ejecutar solo una vez
    id: "dashboard-updater"  // ID personalizado
  }
);
```

## 🔌 Middleware

Los middleware permiten transformar o filtrar eventos antes de que se emitan:

```javascript
// Agregar middleware
eventBus.use((event, data, options) => {
  // Transformar datos
  if (event === PIZARRA_EVENTS.ASIGNACION_CREADA) {
    return {
      event: event,
      data: {
        ...data,
        processed: true,
      }
    };
  }
  
  // Cancelar evento retornando false
  if (data.sensitive) {
    return false;
  }
  
  // Continuar normalmente
  return { event, data };
});
```

## 🌐 WebSocket (Futuro)

Cuando se implemente WebSocket, simplemente se agrega como transporte:

```javascript
import { WebSocketTransport } from "./services/WebSocketTransport.js";

// Crear transporte
const wsTransport = new WebSocketTransport("ws://servidor:8080/pizarra", {
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
});

// Agregar al EventBus
eventBus.addTransport(wsTransport);

// Conectar
wsTransport.connect();
```

El EventBus automáticamente:
- Envía todos los eventos emitidos al servidor
- Recibe eventos del servidor y los re-emite localmente
- Mantiene una cola de eventos mientras está desconectado
- Reintenta conexión automáticamente

## 📊 Estadísticas

Obtener estadísticas del EventBus:

```javascript
const stats = eventBus.getStats();
console.log(stats);
// {
//   totalSubscriptions: 15,
//   events: {
//     "pizarra:asignacion:creada": 3,
//     "pizarra:pizarra:actualizada": 2,
//     ...
//   },
//   transports: 1,
//   historySize: 50,
//   enabled: true
// }
```

## 🔍 Historial de Eventos

El EventBus mantiene un historial de los últimos eventos:

```javascript
// Obtener todos los eventos
const history = eventBus.getHistory();

// Filtrar por evento específico
const asignaciones = eventBus.getHistory(PIZARRA_EVENTS.ASIGNACION_CREADA);

// Limpiar historial
eventBus.clearHistory();
```

## 🎨 Mejores Prácticas

1. **Usar constantes de eventos**: Siempre usar `PIZARRA_EVENTS` en lugar de strings literales
2. **Desuscribirse**: Limpiar suscripciones cuando no se necesiten
3. **Middleware ligero**: Los middleware deben ser rápidos para no bloquear
4. **Payloads consistentes**: Mantener estructura de datos consistente en eventos similares
5. **Logging**: El EventBus ya incluye logging, no duplicar en callbacks

## 🚀 Migración a WebSocket

Cuando se migre a WebSocket:

1. **No cambiar código existente**: El EventBus abstrae el transporte
2. **Agregar transporte**: Simplemente agregar `WebSocketTransport` al EventBus
3. **Configurar servidor**: El servidor debe escuchar los mismos eventos
4. **Sincronización**: Los eventos se sincronizan automáticamente entre clientes

## 📝 Ejemplo Completo

```javascript
import { eventBus } from "./services/EventBus.js";
import { PIZARRA_EVENTS } from "./constants/events.js";

// Suscribirse a múltiples eventos
eventBus.subscribeMany(
  [
    PIZARRA_EVENTS.ASIGNACION_CREADA,
    PIZARRA_EVENTS.ASIGNACION_REMOVIDA,
  ],
  (data, eventData) => {
    console.log(`Evento ${eventData.event}:`, data);
    // Actualizar UI, enviar analytics, etc.
  }
);

// Emitir evento
eventBus.emit(PIZARRA_EVENTS.ASIGNACION_CREADA, {
  asignacion: {
    usuario_login: "USER123",
    puesto_id: "water-spider",
    // ...
  },
  timestamp: new Date().toISOString(),
});
```

## 🔧 Debugging

El EventBus incluye logging automático. Para ver todos los eventos:

```javascript
// Suscribirse a todos los eventos (usando wildcard si se implementa)
// O simplemente revisar el historial
console.log(eventBus.getHistory());
```

