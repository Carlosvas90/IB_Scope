# Sistema de KPIs Modular

Este sistema permite la gestión modular e independiente de los KPIs (Indicadores Clave de Rendimiento) en el dashboard de estadísticas.

## 🚀 Características

- **Independencia Total**: Cada KPI es un componente separado y autónomo
- **Agrupación Lógica**: Los KPIs relacionados pueden compartir datos
- **Fácil Extensibilidad**: Agregar nuevos KPIs es simple y no afecta a los existentes
- **Gestión Centralizada**: `KPIManager` coordina todos los componentes

## 📋 Estructura de Componentes

```
kpis/
├── index.js                  # Punto de entrada y exportaciones
├── KPIManager.js             # Gestor central de KPIs
├── TotalErrorsKPI.js         # KPI de Total de Errores (incluye Promedio Diario)
├── PendingErrorsKPI.js       # KPI de Errores Pendientes (incluye Tasa de Resolución)
├── ResolvedErrorsKPI.js      # KPI de Errores Resueltos
└── README.md                 # Esta documentación
```

## 🔧 Cómo Usar

### Importación

```javascript
// Importar todos los componentes
import * as KPIs from "./components/kpis/index.js";

// O importar componentes específicos
import { KPIManager } from "./components/kpis/index.js";
import { TotalErrorsKPI } from "./components/kpis/TotalErrorsKPI.js";
```

### Inicialización

```javascript
// Inicializar el gestor de KPIs (recomendado)
const kpiManager = new KPIManager();

// O inicializar KPIs individuales
const totalErrorsKPI = new TotalErrorsKPI();
const pendingErrorsKPI = new PendingErrorsKPI();
```

### Actualización de Datos

```javascript
// Actualizar todos los KPIs a través del gestor
kpiManager.updateAll({
  totalErrors: 1250,
  pendingErrors: 320,
  resolvedErrors: 930,
  resolutionRate: 74.4,
  dailyAverage: 42.5,
});

// O actualizar KPIs individuales
totalErrorsKPI.update({
  totalErrors: 1250,
  dailyAverage: 42.5,
});
```

### Estado de Carga

```javascript
// Establecer estado de carga para todos los KPIs
kpiManager.setLoading(true); // Mostrar indicadores de carga
kpiManager.setLoading(false); // Ocultar indicadores de carga
```

## ➕ Cómo Extender

### Crear un Nuevo KPI

1. Crear un nuevo archivo en la carpeta `kpis/`, por ejemplo `NewKPI.js`:

```javascript
export class NewKPI {
  constructor() {
    this.kpiElement = document.getElementById("new-kpi-value");
    this.trendElement = document.getElementById("new-kpi-trend");

    console.log("📊 NewKPI inicializado");
  }

  update(data) {
    if (!data) return;

    if (this.kpiElement) {
      this.kpiElement.textContent = data.value.toLocaleString();
    }

    if (this.trendElement) {
      this.trendElement.className = `kpi-trend ${data.trend || "neutral"}`;
      this.trendElement.textContent = data.description || "Nuevo KPI";
    }
  }

  setLoading(isLoading) {
    // Implementar lógica de estado de carga
  }
}
```

2. Agregar el nuevo KPI al archivo `index.js`:

```javascript
export { NewKPI } from "./NewKPI.js";
```

3. Actualizar el `KPIManager.js` para incluir el nuevo KPI:

```javascript
import { NewKPI } from "./NewKPI.js";

export class KPIManager {
  constructor() {
    // Componentes existentes...
    this.newKPI = new NewKPI();
  }

  updateAll(data) {
    // Actualizaciones existentes...
    this.newKPI.update({
      value: data.newValue,
      trend: data.newTrend,
      description: "Descripción del nuevo KPI",
    });
  }

  setLoading(isLoading) {
    // Componentes existentes...
    this.newKPI.setLoading(isLoading);
  }
}
```

## 🔄 Relaciones entre KPIs

### KPIs Agrupados

Actualmente, tenemos las siguientes agrupaciones lógicas:

1. **Total de Errores + Promedio Diario**

   - `TotalErrorsKPI.js` gestiona ambos KPIs
   - Comparten datos relacionados con el volumen total de errores

2. **Errores Pendientes + Tasa de Resolución**

   - `PendingErrorsKPI.js` gestiona ambos KPIs
   - Comparten datos relacionados con la eficiencia de resolución

3. **Errores Resueltos**
   - `ResolvedErrorsKPI.js` gestiona este KPI independiente

## 📈 Buenas Prácticas

1. **Mantener la Independencia**: Cada archivo KPI debe funcionar de forma autónoma
2. **Documentar APIs**: Documentar parámetros y comportamientos esperados
3. **Manejo de Errores**: Incluir validaciones y mensajes de error claros
4. **Logging Consistente**: Usar prefijos como `📊` para facilitar el filtrado en consola
5. **Evitar Dependencias Circulares**: No crear referencias circulares entre KPIs

## 🛠️ Solución de Problemas

### KPI no se actualiza

- Verificar que el ID del elemento DOM sea correcto
- Comprobar que los datos pasados al método `update()` tienen el formato esperado
- Revisar la consola para mensajes de advertencia o error

### Errores en la Consola

- `❌ Elementos del KPI no encontrados`: Verificar que los IDs en el HTML coinciden con los esperados en el componente
- `❌ No hay datos para actualizar los KPIs`: Asegurarse de que se están pasando datos válidos al método `updateAll()`

## 🔮 Futuras Mejoras

- [ ] Sistema de animaciones para transiciones de valores
- [ ] Soporte para temas personalizados por KPI
- [ ] Eventos para notificar cambios importantes en los KPIs
- [ ] Persistencia de preferencias de usuario para cada KPI
