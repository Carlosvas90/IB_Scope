# 🔄 TodaySyncService - Documentación

## 📋 Descripción

`TodaySyncService` es un servicio de sincronización automática para detectar cambios en los datos del día actual y mantener a todos los usuarios actualizados en tiempo real.

---

## 🎯 Problema que Resuelve

En un entorno multi-usuario (6-7 personas usando la app):

- ❌ **Sin sync:** Cada usuario ve datos desactualizados hasta que refresque manualmente
- ❌ **Manual refresh:** Usuario debe recordar refrescar constantemente
- ❌ **Datos inconsistentes:** Diferentes usuarios ven diferentes valores

Con `TodaySyncService`:

- ✅ **Auto-sync:** Detecta cambios automáticamente cada X segundos
- ✅ **Notificaciones:** Avisa al usuario cuando hay datos nuevos
- ✅ **Consistencia:** Todos los usuarios ven los mismos datos

---

## 🏗️ Cómo Funciona

```
┌─────────────────────────────────────────────┐
│         TodaySyncService                    │
├─────────────────────────────────────────────┤
│                                             │
│  1. Polling cada 30s                        │
│     ↓                                       │
│  2. Cargar datos de HOY desde JSON          │
│     ↓                                       │
│  3. Calcular hash SHA-256                   │
│     ↓                                       │
│  4. Comparar con hash anterior              │
│     ↓                                       │
│  5. Si cambió:                              │
│     - Notificar listeners                   │
│     - Auto-refresh (opcional)               │
│     - Mostrar notificación (opcional)       │
│                                             │
└─────────────────────────────────────────────┘
```

### **Detección de Cambios:**

```javascript
// Primera vez
const hash1 = SHA256(datos_hoy); // "abc123..."
// Guardar hash1

// 30 segundos después...
const hash2 = SHA256(datos_hoy); // "abc123..." (igual)
// No hay cambios

// 60 segundos después...
const hash3 = SHA256(datos_hoy); // "def456..." (diferente!)
// ¡Cambios detectados! → Notificar
```

---

## 🚀 Uso Básico

### **1. Habilitar Sincronización**

```javascript
// En estadisticas.js después de cargar datos
const controller = new EstadisticasController();
await controller.init();

// Habilitar sincronización
const syncService = controller.dataService.enableSync({
  pollingInterval: 30000, // 30 segundos (por defecto)
  autoRefresh: true, // Auto-refrescar cuando hay cambios
  notifyUsers: true, // Mostrar notificación visual
});

console.log("✅ Sincronización habilitada");
```

### **2. Configuración Avanzada**

```javascript
// Configurar después de habilitar
syncService.configure({
  pollingInterval: 60000, // Cambiar a 60 segundos
  autoRefresh: false, // Deshabilitar auto-refresh
  notifyUsers: true, // Mantener notificaciones
});
```

### **3. Registrar Listener**

```javascript
// Escuchar cambios para hacer acciones personalizadas
const unsubscribe = syncService.onChange((newData) => {
  console.log("🔔 Datos cambiaron!", newData.length);

  // Actualizar UI personalizada
  updateCustomUI(newData);

  // Mostrar mensaje
  alert("Hay nuevos datos disponibles");
});

// Remover listener cuando sea necesario
// unsubscribe();
```

---

## 📊 API Completa

### **Métodos Principales**

#### `start()`

Inicia el polling periódico.

```javascript
syncService.start();
// ▶️  Iniciando sincronización automática...
// ✅ Sincronización automática activada
```

---

#### `stop()`

Detiene el polling.

```javascript
syncService.stop();
// ⏸️  Deteniendo sincronización automática...
// ✅ Sincronización automática detenida
```

---

#### `onChange(callback)`

Registra un listener para cambios.

```javascript
const unsubscribe = syncService.onChange((newData) => {
  console.log("Nuevos datos:", newData);
});

// Retorna función para des-registrar
unsubscribe();
```

---

#### `configure(options)`

Cambia la configuración en tiempo de ejecución.

```javascript
syncService.configure({
  pollingInterval: 60000,
  autoRefresh: false,
  notifyUsers: true,
});
```

**Opciones:**

- `pollingInterval` (number): Intervalo en milisegundos
- `autoRefresh` (boolean): Auto-refrescar datos cuando hay cambios
- `notifyUsers` (boolean): Mostrar notificación visual

---

#### `forceCheck()`

Fuerza una verificación manual inmediata.

```javascript
await syncService.forceCheck();
// 🔍 [Sync] Verificación manual forzada...
```

---

#### `getStats()`

Obtiene estadísticas del servicio.

```javascript
const stats = syncService.getStats();
console.log(stats);
```

**Retorna:**

```javascript
{
  isPolling: true,
  pollingInterval: 30000,
  checksCount: 42,
  changesDetected: 5,
  lastCheckTime: Date,
  lastChange: Date,
  listenersCount: 2,
  errors: 0,
  autoRefresh: true,
  notifyUsers: true
}
```

---

#### `printStats()`

Imprime estadísticas en consola (formato bonito).

```javascript
syncService.printStats();
```

**Salida:**

```
══════════════════════════════════════════════════
📊 TODAY SYNC SERVICE - ESTADÍSTICAS
══════════════════════════════════════════════════
🔄 Estado: ▶️  ACTIVO
⏱️  Intervalo: 30s
🔍 Verificaciones: 42
🔔 Cambios detectados: 5
❌ Errores: 0
📢 Listeners: 2
⚙️  Auto-refresh: ON
🔔 Notificaciones: ON
🕐 Último check: 12/01/2025 14:30:45
📅 Último cambio: 12/01/2025 14:28:12
══════════════════════════════════════════════════
```

---

#### `resetStats()`

Resetea las estadísticas a cero.

```javascript
syncService.resetStats();
// 🔄 Estadísticas reseteadas
```

---

#### `destroy()`

Destruye el servicio y limpia todos los recursos.

```javascript
syncService.destroy();
// 🔌 [Sync] Destruyendo TodaySyncService...
// ✅ [Sync] Servicio destruido
```

---

## 🎨 Notificaciones Visuales

Cuando `notifyUsers: true`, se muestra una notificación automática:

```
┌──────────────────────────┐
│  🔔  Datos actualizados   │
└──────────────────────────┘
```

- ✅ Aparece en la esquina superior derecha
- ✅ Se desvanece automáticamente en 3 segundos
- ✅ Estilo adaptado al tema (claro/oscuro)
- ✅ Animación suave (slide-in/slide-out)

---

## ⚙️ Configuración Recomendada

### **Desarrollo:**

```javascript
syncService.configure({
  pollingInterval: 10000, // 10s (más frecuente para testing)
  autoRefresh: true,
  notifyUsers: true,
});
```

### **Producción:**

```javascript
syncService.configure({
  pollingInterval: 30000, // 30s (balance entre frescura y carga)
  autoRefresh: true,
  notifyUsers: true,
});
```

### **Servidor lento:**

```javascript
syncService.configure({
  pollingInterval: 60000, // 60s (menos carga en red)
  autoRefresh: false, // Usuario decide cuándo refrescar
  notifyUsers: true, // Avisar que hay cambios disponibles
});
```

---

## 🔧 Integración con OptimizedDataService

El `TodaySyncService` se integra automáticamente:

```javascript
// estadisticas.js
const controller = new EstadisticasController();
await controller.init();

// Habilitar sync
controller.dataService.enableSync({
  pollingInterval: 30000,
});

// Ver estadísticas
const stats = controller.dataService.getSyncStats();
console.table(stats);

// Deshabilitar sync
controller.dataService.disableSync();
```

---

## 🐛 Debugging

### **Ver logs en consola:**

```javascript
// Todos los checks se registran automáticamente:
// 🔍 [Sync] Check #42 - 14:30:45
// ✅ [Sync] Sin cambios
//
// 🔍 [Sync] Check #43 - 14:31:15
// 🔔 [Sync] ¡CAMBIOS DETECTADOS!
//    Hash anterior: abc123...
//    Hash nuevo:    def456...
```

### **Verificar estado:**

```javascript
console.log("Polling activo?", syncService.isPolling);
console.log("Último check:", syncService.lastCheckTime);
console.log("Último hash:", syncService.lastHash);
```

### **Probar detección de cambios:**

```javascript
// 1. Activar sync
syncService.start();

// 2. Modificar el JSON manualmente

// 3. Esperar próximo check (o forzar)
await syncService.forceCheck();

// 4. Verificar si detectó el cambio
syncService.printStats();
```

---

## 📈 Rendimiento

### **Carga de Red:**

- **Polling 30s:** ~1.9 MB/hora (asumiendo 30KB por check)
- **Polling 60s:** ~0.95 MB/hora

### **CPU:**

- **Hash calculation:** ~5ms por dataset de 1000 registros
- **Negligible:** <0.1% uso de CPU

---

## ✅ Tests

```javascript
// Ejecutar suite de tests
await runTodaySyncTests();
```

**Tests incluidos:**

1. ✅ Inicialización
2. ✅ Start/Stop Polling
3. ✅ Cálculo de hash
4. ✅ Registro de listeners
5. ✅ Detección de cambios
6. ✅ Configuración
7. ✅ Estadísticas
8. ✅ Destroy

---

## 🎯 Casos de Uso

### **Caso 1: Notificar pero no auto-refrescar**

```javascript
// Usuario decide cuándo actualizar
syncService.configure({
  autoRefresh: false,
  notifyUsers: true,
});

syncService.onChange((newData) => {
  // Mostrar botón "Actualizar"
  showUpdateButton();
});
```

---

### **Caso 2: Auto-refrescar silenciosamente**

```javascript
// Para pantallas de monitoreo
syncService.configure({
  autoRefresh: true,
  notifyUsers: false, // Sin notificaciones
});
```

---

### **Caso 3: Acción personalizada al cambiar**

```javascript
syncService.onChange((newData) => {
  // Reproducir sonido
  playNotificationSound();

  // Parpadear indicador
  blinkIndicator();

  // Log a servidor
  logToServer("data_changed", { count: newData.length });
});
```

---

## 🚨 Troubleshooting

### **Problema: No detecta cambios**

**Posibles causas:**

1. Polling no está activo (`syncService.isPolling === false`)
2. Intervalo muy largo
3. Datos realmente no cambiaron

**Solución:**

```javascript
// Verificar
console.log("Polling activo?", syncService.isPolling);

// Forzar check manual
await syncService.forceCheck();

// Ver stats
syncService.printStats();
```

---

### **Problema: Demasiadas notificaciones**

**Solución:**

```javascript
// Aumentar intervalo
syncService.configure({ pollingInterval: 60000 });

// O deshabilitar notificaciones
syncService.configure({ notifyUsers: false });
```

---

### **Problema: Alto uso de CPU**

**Causas:**

- Intervalo muy corto (<10s)
- Dataset muy grande (>10,000 registros)

**Solución:**

```javascript
// Aumentar intervalo
syncService.configure({ pollingInterval: 60000 });
```

---

## 📚 Recursos Adicionales

| Documento                          | Descripción        |
| ---------------------------------- | ------------------ |
| `README-OPTIMIZED-DATA-SERVICE.md` | Servicio principal |
| `README-FASE2-COMPLETE.md`         | Resumen de Fase 2  |
| `test-today-sync.js`               | Suite de tests     |

---

**Creado:** 2025-01-12  
**Versión:** 1.0  
**Estado:** ✅ Implementado (Fase 2)
