---
name: echarts
description: Create powerful interactive charts with Apache ECharts - balanced ease-of-use and customization. Use when creating or modifying charts, dashboards, visualizations, or when the user mentions ECharts, graphs, or data visualization. In IB_Scope, follow ChartService pattern and theme tokens.
---

# Apache ECharts Visualization Skill

Create stunning, interactive charts with Apache ECharts - the perfect balance of ease-of-use and extensive customization.

*Skill original: [workspace-hub](https://github.com/vamseeachanta/workspace-hub) → `_archive/skills/charts/echarts`. Integrada en este proyecto con convenciones IB_Scope al final.*

## When to Use This Skill

Use ECharts when you need:
- **Balance of ease and power** - Easy to start, powerful when needed
- **Broad chart variety** - 20+ chart types including geo maps
- **TypeScript support** - Full type definitions
- **Mobile responsiveness** - Built-in responsive design
- **Large datasets** - Efficient rendering of 100k+ points
- **Chinese/International** - Excellent i18n support

**Avoid when:**
- Ultimate customization needed (use D3.js)
- Only need simple charts (use Chart.js)
- 3D scientific visualizations (use Plotly)

## Core Capabilities

### 1. Basic Line Chart
```html
<script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
<div id="main" style="width: 600px; height: 400px;"></div>
<script>
var myChart = echarts.init(document.getElementById('main'));
var option = {
  title: { text: 'Monthly Sales' },
  tooltip: { trigger: 'axis' },
  legend: { data: ['Sales'] },
  xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
  yAxis: { type: 'value' },
  series: [{ name: 'Sales', type: 'line', data: [120, 200, 150, 80, 70, 110], smooth: true }]
};
myChart.setOption(option);
</script>
```

### 2. Bar Chart with Multiple Series
```javascript
var option = {
  title: { text: 'Quarterly Revenue Comparison' },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { data: ['2023', '2024'] },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: ['Q1', 'Q2', 'Q3', 'Q4'] },
  yAxis: { type: 'value', name: 'Revenue (k$)' },
  series: [
    { name: '2023', type: 'bar', data: [120, 200, 150, 80], itemStyle: { color: '#5470C6' } },
    { name: '2024', type: 'bar', data: [180, 250, 200, 120], itemStyle: { color: '#91CC75' } }
  ]
};
myChart.setOption(option);
```

### 3. Pie Chart with Rich Formatting
```javascript
var option = {
  title: { text: 'Traffic Sources', left: 'center' },
  tooltip: { trigger: 'item', formatter: '{a} {b}: {c} ({d}%)' },
  legend: { orient: 'vertical', left: 'left' },
  series: [{
    name: 'Access From',
    type: 'pie',
    radius: '50%',
    data: [
      { value: 1048, name: 'Search Engine' },
      { value: 735, name: 'Direct' },
      { value: 580, name: 'Email' },
      { value: 484, name: 'Affiliate' },
      { value: 300, name: 'Video Ads' }
    ],
    emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
  }]
};
myChart.setOption(option);
```

## Best Practices

### Responsive design
```javascript
window.addEventListener('resize', function() { myChart.resize(); });
```

### Loading and empty states
```javascript
myChart.showLoading();
// ... fetch data ...
myChart.hideLoading();
myChart.setOption(option);
```

### Dispose when unmounting
```javascript
if (this.charts[containerId]) {
  this.charts[containerId].dispose();
}
const chart = echarts.init(container);
this.charts[containerId] = chart;
```

### Large datasets
```javascript
option = {
  series: [{
    type: 'line',
    sampling: 'lttb',
    progressive: 1000,
    progressiveThreshold: 3000,
    data: largeDataArray
  }]
};
```

## Available Chart Types

- **Basic:** Line, Bar, Pie, Scatter, Candlestick
- **Advanced:** Radar, Heatmap, Tree, Treemap, Sunburst, Parallel, Sankey, Funnel, Gauge
- **Maps:** GeoMap, BMap, Google Maps
- **3D (GL):** 3D Bar/Line/Scatter/Surface, Globe
- **Graph:** Force-directed Graph

## Installation (IB_Scope ya usa ECharts 5)

```bash
npm install echarts
```

```javascript
import * as echarts from 'echarts';
// Or tree-shake: echarts/core + charts + components + renderers
```

## Resources

- **Official Docs**: https://echarts.apache.org/en/index.html
- **Examples**: https://echarts.apache.org/examples/en/index.html
- **GitHub**: https://github.com/apache/echarts

**Para más ejemplos y referencia completa** (CSV, multi-eje, heatmap, gauge, mapas, React/Vue, TypeScript, DataZoom, eventos): ver [reference.md](reference.md).

---

## En este proyecto (IB_Scope)

Al crear o modificar gráficos en IB_Scope:

1. **Referencia:** `src/renderer/apps/feedback-tracker/estadisticas/js/services/ChartService.js` — patrón con `dispose()` antes de init, mapa `this.charts[containerId]`, `setupResponsive`.
2. **Colores:** Usar tokens de `src/renderer/css/themes/variables.css` (`--Palette-*`, `--Color-*`). No hardcodear hex en opciones; paleta derivada de tokens o `getComputedStyle` para leer CSS variables.
3. **Tema:** Aplicar skill **theme-tokens-guardian** si se añaden o cambian colores en gráficos. `backgroundColor: 'transparent'` para respetar tema claro/oscuro.
4. **Estructura:** Nuevos gráficos en la app correspondiente bajo `src/renderer/apps/<nombre-app>/`; lógica reutilizable en `src/renderer/core/`.

Checklist: dispose antes de init; contenedor con tamaño definido; `chart.resize()` en resize; colores desde tokens.
