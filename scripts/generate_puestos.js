/**
 * Genera puestos.json para la Pizarra a partir de Mapping_Qr.csv
 * CSV: Scan, Departamento, Puesto, Departamento_Dashboard, Process_dashboard, Task_dashboard
 * Output: Ejemplos/Safety/puestos_pizarra.json → copiar a Data_Flow/puestos.json
 */
const fs = require('fs');

const csv = fs.readFileSync('Ejemplos/Mapping_Qr.csv', 'utf8');
const lines = csv.trim().split('\n');
const rows = lines.slice(1).map(line => {
  const p = line.split(',').map(s => s.trim());
  return { scan: p[0], depto: p[1], puesto: p[2], area: p[3], process: p[4], task: p[5] };
}).filter(r => r.scan && r.area && r.process && r.task);

function toId(process, task) {
  return (process + '-' + task).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

const qrMapping = {};
const puestosMap = {};

rows.forEach(r => {
  const id = toId(r.process, r.task);
  qrMapping[r.scan.toUpperCase().trim()] = id;

  if (!puestosMap[id]) {
    puestosMap[id] = {
      id,
      departamento_principal: r.area,
      departamento_secundario: r.process,
      funcion: r.task,
      activo: true,
      qr_codes: []
    };
  }
  const scanKey = r.scan.toUpperCase().trim();
  if (!puestosMap[id].qr_codes.includes(scanKey)) {
    puestosMap[id].qr_codes.push(scanKey);
  }
});

const puestos = Object.values(puestosMap);
const resultado = {
  version: "2.0",
  generado_desde: "Mapping_Qr.csv",
  fecha_generacion: new Date().toISOString(),
  qr_mapping: qrMapping,
  puestos_predefinidos: puestos,
  puestos_personalizados: []
};

console.log(`QR: ${Object.keys(qrMapping).length}, Tasks: ${puestos.length}`);
const porArea = {};
puestos.forEach(p => {
  const k = `${p.departamento_principal} > ${p.departamento_secundario}`;
  if (!porArea[k]) porArea[k] = [];
  porArea[k].push(p.funcion);
});
Object.entries(porArea).sort().forEach(([k, v]) => console.log(`  ${k}: ${v.join(', ')}`));

fs.writeFileSync('Ejemplos/Safety/puestos_pizarra.json', JSON.stringify(resultado, null, 2));
console.log('\nDone → Ejemplos/Safety/puestos_pizarra.json');
