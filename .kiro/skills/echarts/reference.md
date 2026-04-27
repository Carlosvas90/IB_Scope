# ECharts — Referencia completa (workspace-hub)

Versión literal de la skill original. Para uso rápido ver [SKILL.md](SKILL.md).

---

## Complete Examples

### Example 1: Loading Data from CSV
```javascript
fetch('../data/sales.csv')
  .then(response => response.text())
  .then(csvText => {
    const lines = csvText.trim().split('\n');
    const categories = [];
    const values = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      categories.push(row[0]);
      values.push(parseFloat(row[1]));
    }
    var myChart = echarts.init(document.getElementById('main'));
    var option = {
      title: { text: 'Sales Data from CSV' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: categories },
      yAxis: { type: 'value' },
      series: [{ name: 'Sales', type: 'line', data: values, smooth: true, areaStyle: {} }]
    };
    myChart.setOption(option);
  });
```

### Example 2: Multi-Axis Chart
```javascript
var option = {
  title: { text: 'Temperature and Precipitation' },
  tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
  legend: { data: ['Temperature', 'Precipitation'] },
  xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
  yAxis: [
    { type: 'value', name: 'Temperature (°C)', position: 'left', axisLabel: { formatter: '{value} °C' } },
    { type: 'value', name: 'Precipitation (mm)', position: 'right', axisLabel: { formatter: '{value} mm' } }
  ],
  series: [
    { name: 'Temperature', type: 'line', yAxisIndex: 0, data: [2, 5, 9, 15, 20, 25], smooth: true },
    { name: 'Precipitation', type: 'bar', yAxisIndex: 1, data: [50, 45, 40, 35, 30, 25] }
  ]
};
myChart.setOption(option);
```

### Example 3: Heatmap Calendar
```javascript
function getVirtulData(year) {
  const date = +echarts.time.parse(year + '-01-01');
  const end = +echarts.time.parse(+year + 1 + '-01-01');
  const dayTime = 3600 * 24 * 1000;
  const data = [];
  for (let time = date; time < end; time += dayTime) {
    data.push([
      echarts.time.format(time, '{yyyy}-{MM}-{dd}', false),
      Math.floor(Math.random() * 10000)
    ]);
  }
  return data;
}
var option = {
  title: { text: 'Activity Heatmap Calendar' },
  tooltip: { position: 'top', formatter: function (p) { return p.data[0] + ': ' + p.data[1]; } },
  visualMap: { min: 0, max: 10000, calculable: true, orient: 'horizontal', left: 'center', top: 'top' },
  calendar: { range: '2024', cellSize: ['auto', 13] },
  series: { type: 'heatmap', coordinateSystem: 'calendar', data: getVirtulData('2024') }
};
myChart.setOption(option);
```

### Example 4: Gauge Chart
```javascript
var option = {
  title: { text: 'Performance Score' },
  tooltip: { formatter: '{a} {b} : {c}%' },
  series: [{
    name: 'Score',
    type: 'gauge',
    progress: { show: true },
    detail: { valueAnimation: true, formatter: '{value}%' },
    data: [{ value: 85, name: 'Overall Score' }]
  }]
};
myChart.setOption(option);
setInterval(() => {
  option.series[0].data[0].value = (Math.random() * 100).toFixed(2);
  myChart.setOption(option);
}, 2000);
```

### Example 5: Geographic Map (China)
```javascript
fetch('https://cdn.jsdelivr.net/npm/echarts/map/json/china.json')
  .then(response => response.json())
  .then(chinaJson => {
    echarts.registerMap('china', chinaJson);
    var option = {
      title: { text: 'Sales by Province', left: 'center' },
      tooltip: { trigger: 'item', formatter: '{b} {c} (units)' },
      visualMap: { min: 0, max: 1000, text: ['High', 'Low'], calculable: true },
      series: [{
        name: 'Sales',
        type: 'map',
        map: 'china',
        roam: true,
        emphasis: { label: { show: true } },
        data: [
          { name: 'Beijing', value: 500 },
          { name: 'Shanghai', value: 800 },
          { name: 'Guangdong', value: 900 },
          { name: 'Zhejiang', value: 700 }
        ]
      }]
    };
    myChart.setOption(option);
  });
```

### Example 6: Dynamic Real-Time Data
```javascript
var data = [];
var now = new Date();
function randomData() {
  now = new Date(+now + 1000);
  return {
    name: now.toString(),
    value: [[now.getFullYear(), now.getMonth() + 1, now.getDate()].join('/') + ' ' +
      [now.getHours(), now.getMinutes(), now.getSeconds()].join(':'), Math.round(Math.random() * 100)]
  };
}
for (var i = 0; i < 100; i++) data.push(randomData());
var option = {
  title: { text: 'Real-Time Data Stream' },
  tooltip: {
    trigger: 'axis',
    formatter: function (params) { return params[0].value[0] + ' : ' + params[0].value[1]; },
    axisPointer: { animation: false }
  },
  xAxis: { type: 'time', splitLine: { show: false } },
  yAxis: { type: 'value', boundaryGap: [0, '100%'], splitLine: { show: false } },
  series: [{ name: 'Value', type: 'line', showSymbol: false, data: data, smooth: true }]
};
myChart.setOption(option);
setInterval(() => {
  data.shift();
  data.push(randomData());
  myChart.setOption({ series: [{ data: data }] });
}, 1000);
```

## Themes
```javascript
var myChart = echarts.init(document.getElementById('main'), 'dark');
// Or custom:
var customTheme = {
  color: ['#c23531', '#2f4554', '#61a0a8'],
  backgroundColor: '#f4f4f4'
};
var myChart = echarts.init(document.getElementById('main'), customTheme);
```

## TypeScript Support
```typescript
import * as echarts from 'echarts';
type EChartsOption = echarts.EChartsOption;
const option: EChartsOption = {
  title: { text: 'TypeScript Example' },
  xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  yAxis: { type: 'value' },
  series: [{ data: [120, 200, 150, 80, 70, 110, 130], type: 'line' }]
};
const chartDom = document.getElementById('main')!;
const myChart = echarts.init(chartDom);
myChart.setOption(option);
```

## Tree-shaking (NPM)
```javascript
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
echarts.use([LineChart, GridComponent, CanvasRenderer]);
```

## Advanced Features

### Animation
```javascript
option = {
  animation: true,
  animationDuration: 1000,
  animationEasing: 'cubicOut',
  animationDelay: function (idx) { return idx * 50; }
};
```

### DataZoom (Zoom/Pan)
```javascript
option = {
  dataZoom: [
    { type: 'inside', start: 0, end: 100 },
    { type: 'slider', start: 0, end: 100 }
  ]
  // ... rest of option
};
```

### Brush Selection
```javascript
option = {
  brush: { toolbox: ['rect', 'polygon', 'lineX', 'lineY', 'keep', 'clear'], xAxisIndex: 0 }
};
myChart.on('brushSelected', function (params) {
  var brushComponent = params.batch[0];
  var selected = brushComponent.selected[0].dataIndex;
  console.log('Selected data indices:', selected);
});
```

### Event Handling
```javascript
myChart.on('click', function (params) { console.log('Clicked:', params); });
myChart.on('mouseover', function (params) { console.log('Hovered:', params); });
myChart.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: 1 });
```

## React Integration
```jsx
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

function EChartsComponent({ option }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  useEffect(() => {
    if (!chartInstance.current) chartInstance.current = echarts.init(chartRef.current);
    chartInstance.current.setOption(option);
    const handleResize = () => chartInstance.current.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [option]);
  return <div ref={chartRef} style={{ width: '100%', height: 400 }} />;
}
```

## Vue Integration
```vue
<template>
  <div ref="chart" style="width: 100%; height: 400px;"></div>
</template>
<script>
import * as echarts from 'echarts';
export default {
  props: ['option'],
  mounted() {
    this.chart = echarts.init(this.$refs.chart);
    this.chart.setOption(this.option);
    window.addEventListener('resize', this.handleResize);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
    this.chart.dispose();
  },
  methods: { handleResize() { this.chart.resize(); } },
  watch: {
    option: { deep: true, handler(newOption) { this.chart.setOption(newOption); } }
  }
};
</script>
```

## Performance Tips
1. **Progressive rendering** for >10k points
2. **Sampling** (`sampling: 'lttb'`) for time series
3. **Lazy load** chart instances
4. **Dispose** charts when unmounting
5. **Canvas renderer** for large datasets

## Resources
- Docs: https://echarts.apache.org/en/index.html
- Examples: https://echarts.apache.org/examples/en/index.html
- GitHub: https://github.com/apache/echarts
- Community: https://github.com/ecomfe/awesome-echarts
