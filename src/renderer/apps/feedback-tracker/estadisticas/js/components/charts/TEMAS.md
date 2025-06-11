# 🎨 Sistema de Temas para Gráficos

El sistema de gráficos incluye soporte completo para temas claro y oscuro, con cambio automático sincronizado con el tema del sistema.

## ✨ Características

- **🌓 Temas automáticos**: Detecta y aplica automáticamente el tema del sistema
- **🎯 Sincronización global**: Todos los gráficos cambian de tema simultáneamente
- **🔄 Cambio dinámico**: Los temas se aplican sin necesidad de recargar
- **⚡ Performance optimizada**: Cambios eficientes sin reconstruir gráficos
- **🎨 Paletas personalizadas**: Colores específicos para cada tema

## 🛠️ Uso Básico

### Automático (Recomendado)

Los gráficos detectan automáticamente el tema del sistema:

```javascript
import { TrendChart } from "./charts/TrendChart.js";

// El gráfico se configura automáticamente con el tema del sistema
const chart = new TrendChart("mi-container");
await chart.render(datos);
```

### Manual

Puedes forzar un tema específico:

```javascript
import { getChartThemeService } from "./ChartThemeService.js";

const themeService = getChartThemeService();

// Cambiar a tema oscuro
themeService.setTheme("dark");

// Cambiar a tema claro
themeService.setTheme("light");

// Alternar entre temas
themeService.toggleTheme();
```

## 🎨 Configuración de Colores

### Tema Claro

```javascript
{
  backgroundColor: '#ffffff',
  textColor: '#333333',
  primaryColor: '#5470c6',
  axisColor: '#cccccc',
  gridColor: '#f0f0f0',
  borderColor: '#e0e0e0',
  palette: [
    '#5470c6', '#91cc75', '#fac858', '#ee6666',
    '#73c0de', '#3ba272', '#fc8452', '#9a60b4'
  ]
}
```

### Tema Oscuro

```javascript
{
  backgroundColor: '#1a1a1a',
  textColor: '#ffffff',
  primaryColor: '#4992ff',
  axisColor: '#404040',
  gridColor: '#2d2d2d',
  borderColor: '#404040',
  palette: [
    '#4992ff', '#7cfc00', '#ffcc02', '#ff6b6b',
    '#4ecdc4', '#45b7d1', '#f39c12', '#9b59b6'
  ]
}
```

## 🔧 Métodos Disponibles

### En BaseChart (todos los gráficos)

```javascript
// Obtener tema actual
const tema = chart.getCurrentTheme();

// Obtener configuración de colores
const config = chart.getThemeConfig();

// Obtener color específico
const textColor = chart.getThemeColor("textColor");

// Obtener color de paleta
const color = chart.getColorFromPalette(0);

// Aplicar tema específico
chart.applyTheme("dark");
```

### En ChartThemeService (global)

```javascript
import { getChartThemeService } from "./ChartThemeService.js";
const service = getChartThemeService();

// Cambiar tema globalmente
service.setTheme("dark");

// Alternar tema
service.toggleTheme();

// Obtener tema actual
const currentTheme = service.getCurrentTheme();

// Registrar listener para cambios
service.addListener(({ newTheme, oldTheme }) => {
  console.log(`Tema cambiado de ${oldTheme} a ${newTheme}`);
});

// Forzar actualización de todos los gráficos
service.refreshAllCharts();
```

## 🚀 Integración con Sistema

### Detección Automática

El sistema detecta el tema del sistema mediante:

1. **Atributo `data-theme`** en `document.documentElement`
2. **Clase `dark-theme`** en `document.documentElement`
3. **CSS custom property** `--current-theme`
4. **Preferencia del sistema** `prefers-color-scheme: dark`

### Conexión con ThemeService

Si existe un `ThemeService` global en `window.inboundScope.themeService`, el sistema se sincroniza automáticamente:

```javascript
// El ChartThemeService se conecta automáticamente
// y sincroniza con el ThemeService del sistema
```

## 📱 Eventos y Listeners

### Escuchar Cambios de Tema

```javascript
// En un gráfico específico
chart.on("themeChanged", ({ oldTheme, newTheme }) => {
  console.log(`Gráfico cambió de ${oldTheme} a ${newTheme}`);
});

// Globalmente
const themeService = getChartThemeService();
themeService.addListener(({ newTheme, oldTheme }) => {
  console.log(`Sistema cambió de ${oldTheme} a ${newTheme}`);
});
```

### Eventos Disponibles

- `themeChanged`: Cuando cambia el tema de un gráfico
- Listeners globales del ChartThemeService

## 🎯 Uso en Componentes

### Gráfico con Tema Específico

```javascript
const chart = new TrendChart("container", {
  theme: "dark", // Forzar tema oscuro
  title: "Mi Gráfico",
});
```

### Gráfico con Tema Automático

```javascript
const chart = new StatusChart("container", {
  theme: "auto", // Seguir tema del sistema (por defecto)
  title: "Mi Gráfico",
});
```

### Múltiples Gráficos Sincronizados

```javascript
// Todos estos gráficos cambiarán de tema simultáneamente
const chart1 = new TrendChart("container1");
const chart2 = new StatusChart("container2");
const chart3 = new HourlyChart("container3");

// Cambiar tema para todos
const themeService = getChartThemeService();
themeService.setTheme("dark");
```

## 🔧 Personalización

### Crear Tema Personalizado

```javascript
const themeService = getChartThemeService();

// Modificar configuración de tema existente
const customTheme = {
  ...themeService.getThemeConfig("dark"),
  palette: [
    "#ff6b6b",
    "#4ecdc4",
    "#45b7d1",
    "#96ceb4",
    "#feca57",
    "#ff9ff3",
    "#54a0ff",
    "#5f27cd",
  ],
};

// Aplicar tema personalizado
chart.applyTheme(customTheme);
```

### Extender ChartThemeService

```javascript
import { ChartThemeService } from "./ChartThemeService.js";

class CustomChartThemeService extends ChartThemeService {
  constructor() {
    super();

    // Agregar tema personalizado
    this.themes.corporate = {
      name: "corporate",
      backgroundColor: "#f8f9fa",
      textColor: "#2c3e50",
      primaryColor: "#3498db",
      // ... más colores
    };
  }
}
```

## 📋 CSS Variables

Los temas también pueden usar CSS variables para mayor integración:

```css
:root {
  --chart-bg: #ffffff;
  --chart-text: #333333;
  --chart-primary: #5470c6;
}

[data-theme="dark"] {
  --chart-bg: #1a1a1a;
  --chart-text: #ffffff;
  --chart-primary: #4992ff;
}
```

```javascript
// Usar en configuración de tema
getThemeColor(colorKey) {
  // Primero intentar CSS variable
  const cssValue = getComputedStyle(document.documentElement)
    .getPropertyValue(`--chart-${colorKey}`)?.trim();

  if (cssValue) return cssValue;

  // Fallback a configuración local
  return this.getThemeConfig()[colorKey];
}
```

## 🧪 Testing y Debugging

### Probar Cambios de Tema

```javascript
// En la consola del navegador
import { runChartThemeExample } from "./ChartThemeExample.js";

// Ejecutar ejemplo interactivo
const example = await runChartThemeExample();

// Cambiar temas manualmente
example.themeService.setTheme("dark");
example.themeService.setTheme("light");
```

### Debug de Temas

```javascript
const themeService = getChartThemeService();

// Ver tema actual
console.log("Tema actual:", themeService.getCurrentTheme());

// Ver gráficos registrados
console.log("Gráficos registrados:", themeService.charts.size);

// Ver configuración de tema
console.log("Configuración:", themeService.getCurrentThemeConfig());

// Forzar actualización
themeService.refreshAllCharts();
```

## ⚠️ Consideraciones

### Performance

- Los cambios de tema son eficientes y no recrean los gráficos
- Se usa `setOption(options, true)` para actualizaciones optimizadas
- Los listeners se configuran automáticamente y se limpian al destruir

### Compatibilidad

- Funciona con todos los navegadores modernos
- Graceful fallback si `MutationObserver` no está disponible
- Compatible con el `ThemeService` existente del sistema

### Memoria

- Los gráficos se auto-registran y auto-desregistran
- Los listeners se limpian automáticamente
- No hay memory leaks si se destruyen correctamente

## 🔧 Solución de Problemas

### El tema no cambia automáticamente

1. Verificar que el `document.documentElement` tenga `data-theme` o clase `dark-theme`
2. Comprobar que el `ChartThemeService` está inicializado
3. Verificar en consola: `getChartThemeService().getCurrentTheme()`

### Los colores no se ven bien

1. Verificar la paleta de colores en `getThemeConfig()`
2. Comprobar que `getThemeColor()` devuelve valores válidos
3. Usar herramientas de desarrollador para inspeccionar valores

### Temas no sincronizados

1. Verificar que todos los gráficos usan `BaseChart`
2. Comprobar que se registran automáticamente: `themeService.charts.size`
3. Forzar actualización: `themeService.refreshAllCharts()`

## 📝 Ejemplos Completos

Consulta `ChartThemeExample.js` para ver ejemplos interactivos completos del sistema de temas en acción.

```bash
# Abrir ejemplo en navegador
http://localhost:3000/estadisticas?theme-example
```
