/**
 * Process Mapper - Editar puestos (área, tipo tarea) y mapear process_name/function_name → puesto.
 * Puestos y mapping en Data_Flow (config pizarra_paths). rotations.csv en el path.
 */

const PROCESS_NAME_COL = 10;
const FUNCTION_NAME_COL = 11;
const PUESTOS_FILENAME = "puestos.json";
const MAPPING_FILENAME = "process_mapping.json";
const ROTATIONS_CSV_FILENAME = "rotations.csv";

const AREAS = ["IB", "OB", "ICQA", "Support"];
const TIPO_TAREA_OPTIONS = [
  { value: "directa", label: "Directo" },
  { value: "indirecta", label: "Indirecto" },
  { value: "pesado", label: "Pesado" },
  { value: "critical_rol", label: "Critical rol" },
];

/** Genera id tipo slug desde nombre (ej. "Receive" → "receive", "Decant TSI" → "decant-tsi"). */
function slug(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateDeptId(nombre) {
  return slug(nombre) || "dept";
}

function generatePuestoId(deptId, nombrePuesto) {
  const s = slug(nombrePuesto);
  return s ? deptId + "-" + s : deptId + "-puesto";
}

/** Parsea "L1, L2, L3" → ["L1","L2","L3"]. */
function parseLineas(text) {
  if (!text || typeof text !== "string") return [];
  return text.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Parsea "L3-1, L3-2" → ["L3-1","L3-2"]. */
function parseEstaciones(text) {
  if (!text || typeof text !== "string") return [];
  return text.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Parsea "L1: L1-1-2, L1-2-3; L2: L2-1-1" → [{ nombre: "L1", estaciones: ["L1-1-2","L1-2-3"] }, ...]. */
function parseLineasEstaciones(text) {
  if (!text || typeof text !== "string") return [];
  const out = [];
  const blocks = text.split(";").map((b) => b.trim()).filter(Boolean);
  for (const block of blocks) {
    const colon = block.indexOf(":");
    const nombre = colon >= 0 ? block.slice(0, colon).trim() : block.trim();
    const est = colon >= 0 ? parseEstaciones(block.slice(colon + 1)) : [];
    if (nombre) out.push({ nombre, estaciones: est });
  }
  return out;
}

/** Formatea [{ nombre: "L1", estaciones: ["L1-2", "L1-15"] }] → "L1: L1-2, L1-15; L2: L2-1". */
function formatLineasEstaciones(lineas) {
  if (!Array.isArray(lineas) || lineas.length === 0) return "";
  return lineas.map((l) => (l.nombre || "") + ": " + (l.estaciones || []).join(", ")).filter(Boolean).join("; ");
}

/** Muestra línea como "L1 (L1-2, L1-15, L1-6)" para la tabla. */
function formatLineaParaTabla(linea) {
  const est = (linea.estaciones || []).join(", ");
  return est ? linea.nombre + " (" + est + ")" : linea.nombre;
}

/** Combina nombres de líneas (L1, L2, L3, L4) con estaciones por línea (L1: L1-2, L1-15; L2: L2-1) → lineas[]. */
function mergeLineasConEstaciones(nombresText, estacionesText) {
  const nombres = parseLineas(nombresText);
  const conEst = parseLineasEstaciones(estacionesText);
  return nombres.map((nombre) => {
    const found = conEst.find((l) => (l.nombre || "").trim() === nombre.trim());
    return { nombre: nombre.trim(), estaciones: found ? (found.estaciones || []) : [] };
  });
}

/** Parsea una línea CSV respetando comillas dobles (campos con comas). */
function parseCSVLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && c === ",") {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** Extrae pares únicos (process_name, function_name) del texto CSV. */
function extractUniquePairs(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCSVLine(lines[0]);
  const idxProcess = header.findIndex((h) => h === "process_name");
  const idxFunction = header.findIndex((h) => h === "function_name");
  const i = idxProcess >= 0 ? idxProcess : PROCESS_NAME_COL;
  const j = idxFunction >= 0 ? idxFunction : FUNCTION_NAME_COL;
  const set = new Set();
  for (let row = 1; row < lines.length; row++) {
    const cols = parseCSVLine(lines[row]);
    const p = (cols[i] || "").trim();
    const f = (cols[j] || "").trim();
    if (p || f) set.add(JSON.stringify([p, f]));
  }
  return Array.from(set).map((s) => {
    const [process_name, function_name] = JSON.parse(s);
    return { process_name, function_name };
  });
}

/** Construye opciones: áreas únicas, y por área → depts, por dept → puestos. */
function buildPuestosOptions(departamentos) {
  const areas = [...new Set(departamentos.map((d) => d.area).filter(Boolean))].sort();
  const byArea = {};
  areas.forEach((a) => (byArea[a] = []));
  departamentos.forEach((d) => {
    if (d.area) byArea[d.area].push({ id: d.id, nombre: d.nombre, puestos: d.puestos || [] });
  });
  return { areas, byArea };
}

let state = {
  dataFlowPath: null,
  puestosData: null,
  options: null,
  rows: [],
  mapping: [],
  lastSavedMapping: null,
  lastSavedPuestos: null,
  saveMappingTimer: null,
  savePuestosTimer: null,
  filterPuestosArea: "",
  filterPuestosDept: "",
  soloSinMapear: false,
  modalLineasDeptIndex: null,
  modalLineasPuestoIndex: null,
  modalCertificadosDeptIndex: null,
  modalCertificadosPuestoIndex: null,
};

const el = {
  csvInput: null,
  csvFromPath: null,
  status: null,
  filter: null,
  tbody: null,
  puestosTbody: null,
  puestosLoad: null,
  puestosAddDept: null,
  puestosAddPuesto: null,
  puestosSync: null,
  filterArea: null,
  filterDept: null,
  mappingCount: null,
  soloSinMapear: null,
  mappingSync: null,
  viewPuestos: null,
  viewMapping: null,
  tabs: null,
  modalDept: null,
  modalPuesto: null,
  modalLineas: null,
  modalCertificados: null,
};

function setStatus(msg, isError = false) {
  if (!el.status) return;
  el.status.textContent = msg;
  el.status.style.color = isError ? "var(--Palette-Red-5, #c00)" : "";
}

function initElements() {
  el.csvInput = document.getElementById("pm-csv-input");
  el.csvFromPath = document.getElementById("pm-csv-from-path");
  el.status = document.getElementById("pm-status");
  el.filter = document.getElementById("pm-filter");
  el.tbody = document.getElementById("pm-tbody");
  el.puestosTbody = document.getElementById("pm-puestos-tbody");
  el.puestosLoad = document.getElementById("pm-puestos-load");
  el.puestosAddDept = document.getElementById("pm-puestos-add-dept");
  el.puestosAddPuesto = document.getElementById("pm-puestos-add-puesto");
  el.puestosSync = document.getElementById("pm-puestos-sync");
  el.filterArea = document.getElementById("pm-filter-area");
  el.filterDept = document.getElementById("pm-filter-dept");
  el.mappingCount = document.getElementById("pm-mapping-count");
  el.soloSinMapear = document.getElementById("pm-solo-sin-mapear");
  el.mappingSync = document.getElementById("pm-mapping-sync");
  el.viewPuestos = document.getElementById("pm-view-puestos");
  el.viewMapping = document.getElementById("pm-view-mapping");
  el.tabs = document.querySelectorAll(".pm-tab");
  el.modalDept = document.getElementById("pm-modal-dept");
  el.modalPuesto = document.getElementById("pm-modal-puesto");
  el.modalLineas = document.getElementById("pm-modal-lineas");
  el.modalCertificados = document.getElementById("pm-modal-certificados");
}

/** Formato corto de hora para "Guardado 12:34". */
function formatTime(d) {
  if (!d) return "";
  const t = new Date(d);
  return t.getHours().toString().padStart(2, "0") + ":" + t.getMinutes().toString().padStart(2, "0");
}

function updateSyncStatus(kind, saved, error) {
  const elSync = kind === "mapping" ? el.mappingSync : el.puestosSync;
  if (!elSync) return;
  if (error) {
    elSync.textContent = "Error al guardar";
    elSync.className = "pm-sync-status unsaved";
    return;
  }
  if (saved) {
    const t = kind === "mapping" ? state.lastSavedMapping : state.lastSavedPuestos;
    elSync.textContent = "Guardado " + formatTime(t);
    elSync.className = "pm-sync-status saved";
  } else {
    elSync.textContent = "Cambios sin guardar (se guarda solo)";
    elSync.className = "pm-sync-status unsaved";
  }
}

async function saveMappingToDataFlow() {
  if (!state.dataFlowPath || !window.api || !window.api.saveJson) return;
  const payload = {
    version: "1.0",
    generated_from: "process-mapper",
    last_updated: new Date().toISOString(),
    mapping: state.rows.map((r) => ({
      process_name: r.process_name,
      function_name: r.function_name,
      area: r.area || undefined,
      dept_id: r.dept_id || undefined,
      puesto_id: r.puesto_id || undefined,
      notes: r.notes || undefined,
    })),
  };
  try {
    const result = await window.api.saveJson(state.dataFlowPath + MAPPING_FILENAME, payload);
    if (result && result.success) {
      state.lastSavedMapping = Date.now();
      updateSyncStatus("mapping", true);
    } else {
      updateSyncStatus("mapping", false, true);
    }
  } catch (e) {
    updateSyncStatus("mapping", false, true);
  }
}

function scheduleSaveMapping() {
  if (state.saveMappingTimer) clearTimeout(state.saveMappingTimer);
  updateSyncStatus("mapping", false);
  state.saveMappingTimer = setTimeout(() => {
    state.saveMappingTimer = null;
    saveMappingToDataFlow();
  }, 800);
}

async function savePuestosToDataFlow() {
  if (!state.dataFlowPath || !window.api || !window.api.saveJson || !state.puestosData) return;
  try {
    const result = await window.api.saveJson(state.dataFlowPath + PUESTOS_FILENAME, state.puestosData);
    if (result && result.success) {
      state.lastSavedPuestos = Date.now();
      updateSyncStatus("puestos", true);
    } else {
      updateSyncStatus("puestos", false, true);
    }
  } catch (e) {
    updateSyncStatus("puestos", false, true);
  }
}

function scheduleSavePuestos() {
  if (state.savePuestosTimer) clearTimeout(state.savePuestosTimer);
  updateSyncStatus("puestos", false);
  state.savePuestosTimer = setTimeout(() => {
    state.savePuestosTimer = null;
    savePuestosToDataFlow();
  }, 800);
}

/** Obtiene la ruta base Data_Flow desde config (pizarra_paths). */
function getDataFlowPath() {
  return state.dataFlowPath;
}

async function loadConfigDataFlowPath() {
  if (state.dataFlowPath) return state.dataFlowPath;
  try {
    if (typeof window.api === "undefined" || !window.api.getConfig) return null;
    const config = await window.api.getConfig();
    const paths = config && config.pizarra_paths && Array.isArray(config.pizarra_paths) ? config.pizarra_paths : [];
    if (paths.length === 0) return null;
    let base = paths[0];
    if (typeof base !== "string") return null;
    base = base.replace(/\//g, "\\").trim();
    if (!base.endsWith("\\")) base += "\\";
    state.dataFlowPath = base;
    return state.dataFlowPath;
  } catch (e) {
    return null;
  }
}

async function loadPuestos() {
  try {
    await loadConfigDataFlowPath();
    if (state.dataFlowPath && typeof window.api !== "undefined" && window.api.readJson) {
      const puestosPath = state.dataFlowPath + PUESTOS_FILENAME;
      const res = await window.api.readJson(puestosPath);
      if (res && res.success && res.data) {
        state.puestosData = res.data;
        state.options = buildPuestosOptions(state.puestosData.departamentos || []);
        state.lastSavedPuestos = Date.now();
        updateSyncStatus("puestos", true);
        return state.options;
      }
    }
    const fallbackUrl = "../apps/utilidades/Rotation Tool/data/puestos.json";
    const res = await fetch(fallbackUrl);
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    state.puestosData = data;
    state.options = buildPuestosOptions(data.departamentos || []);
    return state.options;
  } catch (e) {
    setStatus("Error cargando puestos.json: " + e.message, true);
    return null;
  }
}

function mergeRowsWithMapping(uniquePairs, mapping) {
  const byKey = new Map();
  (mapping || []).forEach((m) => {
    const key = JSON.stringify([m.process_name, m.function_name]);
    byKey.set(key, { ...m });
  });
  uniquePairs.forEach((p) => {
    const key = JSON.stringify([p.process_name, p.function_name]);
    if (!byKey.has(key)) {
      byKey.set(key, {
        process_name: p.process_name,
        function_name: p.function_name,
        area: "",
        dept_id: "",
        puesto_id: "",
        notes: "",
      });
    }
  });
  return Array.from(byKey.values());
}

function renderAreaSelect(row, rowIndex) {
  const opt = state.options;
  if (!opt) return document.createElement("span");
  const sel = document.createElement("select");
  sel.dataset.row = rowIndex;
  sel.dataset.field = "area";
  sel.innerHTML = "<option value=''>— Sin mapear</option>" + opt.areas.map((a) => `<option value="${a}" ${row.area === a ? "selected" : ""}>${a}</option>`).join("");
  sel.addEventListener("change", () => onSelectChange(rowIndex, "area", sel.value));
  return sel;
}

function renderDeptSelect(row, rowIndex) {
  const opt = state.options;
  if (!opt) return document.createElement("span");
  const depts = (row.area && opt.byArea[row.area]) ? opt.byArea[row.area] : [];
  const sel = document.createElement("select");
  sel.dataset.row = rowIndex;
  sel.dataset.field = "dept_id";
  sel.innerHTML = "<option value=''>—</option>" + depts.map((d) => `<option value="${d.id}" ${row.dept_id === d.id ? "selected" : ""}>${d.nombre}</option>`).join("");
  sel.addEventListener("change", () => onSelectChange(rowIndex, "dept_id", sel.value));
  return sel;
}

function renderPuestoSelect(row, rowIndex) {
  const opt = state.options;
  if (!opt) return document.createElement("span");
  let puestos = [];
  if (row.area && row.dept_id && opt.byArea[row.area]) {
    const dept = opt.byArea[row.area].find((d) => d.id === row.dept_id);
    if (dept) puestos = dept.puestos || [];
  }
  const sel = document.createElement("select");
  sel.dataset.row = rowIndex;
  sel.dataset.field = "puesto_id";
  sel.innerHTML = "<option value=''>—</option>" + puestos.map((p) => `<option value="${p.id}" ${row.puesto_id === p.id ? "selected" : ""}>${p.nombre}</option>`).join("");
  sel.addEventListener("change", () => onSelectChange(rowIndex, "puesto_id", sel.value));
  return sel;
}

function onSelectChange(rowIndex, field, value) {
  const r = state.rows[rowIndex];
  if (!r) return;
  r[field] = value;
  if (field === "area") {
    r.dept_id = "";
    r.puesto_id = "";
  } else if (field === "dept_id") {
    r.puesto_id = "";
  }
  renderTable();
  scheduleSaveMapping();
}

function renderTable() {
  const filter = (el.filter && el.filter.value) ? el.filter.value.toLowerCase() : "";
  let rows = state.rows;
  if (state.soloSinMapear) {
    rows = rows.filter((r) => !r.area && !r.dept_id && !r.puesto_id);
  }
  if (filter) {
    rows = rows.filter((r) => (r.process_name || "").toLowerCase().includes(filter) || (r.function_name || "").toLowerCase().includes(filter));
  }
  const mapeados = state.rows.filter((r) => r.area || r.dept_id || r.puesto_id).length;
  const sinMapear = state.rows.length - mapeados;
  if (el.mappingCount) el.mappingCount.textContent = mapeados + " mapeados, " + sinMapear + " sin mapear";
  if (!el.tbody) return;
  el.tbody.innerHTML = "";
  rows.forEach((row, idx) => {
    const globalIndex = state.rows.indexOf(row);
    const tr = document.createElement("tr");
    if (!row.area && !row.dept_id && !row.puesto_id) tr.classList.add("pm-unmapped");
    tr.innerHTML = `
      <td>${escapeHtml(row.process_name)}</td>
      <td>${escapeHtml(row.function_name)}</td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    `;
    tr.cells[2].appendChild(renderAreaSelect(row, globalIndex));
    tr.cells[3].appendChild(renderDeptSelect(row, globalIndex));
    tr.cells[4].appendChild(renderPuestoSelect(row, globalIndex));
    const notesInput = document.createElement("input");
    notesInput.type = "text";
    notesInput.className = "pm-notes";
    notesInput.placeholder = "Notas";
    notesInput.value = row.notes || "";
    notesInput.addEventListener("input", () => { row.notes = notesInput.value; scheduleSaveMapping(); });
    notesInput.addEventListener("change", () => { row.notes = notesInput.value; scheduleSaveMapping(); });
    tr.cells[5].appendChild(notesInput);
    el.tbody.appendChild(tr);
  });
}

function escapeHtml(s) {
  if (s == null) return "";
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function onCsvLoaded(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  setStatus("Leyendo CSV…");
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const text = reader.result;
      const pairs = extractUniquePairs(text);
      setStatus(`Encontradas ${pairs.length} combinaciones únicas (process_name, function_name).`);
      if (!state.options) await loadPuestos();
      state.rows = mergeRowsWithMapping(pairs, state.rows.length ? state.rows : state.mapping);
      state.mapping = [];
      renderTable();
      saveMappingToDataFlow();
    } catch (err) {
      setStatus("Error: " + err.message, true);
    }
  };
  reader.readAsText(file, "UTF-8");
  e.target.value = "";
}

async function loadMappingFromDataFlow() {
  if (!state.dataFlowPath || typeof window.api === "undefined" || !window.api.readJson) return;
  try {
    const mappingPath = state.dataFlowPath + MAPPING_FILENAME;
    const res = await window.api.readJson(mappingPath);
    if (res && res.success && res.data && Array.isArray(res.data.mapping)) {
      state.mapping = res.data.mapping.map((m) => ({
        process_name: m.process_name || "",
        function_name: m.function_name || "",
        area: m.area || "",
        dept_id: m.dept_id || "",
        puesto_id: m.puesto_id || "",
        notes: m.notes || "",
      }));
      state.rows = state.mapping.length ? state.mapping : [];
      state.lastSavedMapping = Date.now();
      updateSyncStatus("mapping", true);
      setStatus("Mapping cargado desde Data_Flow: " + state.mapping.length + " entradas.");
      renderTable();
    }
  } catch (_) {}
}

async function loadRotationsFromDataFlow() {
  if (!state.dataFlowPath || typeof window.api === "undefined" || !window.api.readFileAbsolute) return;
  setStatus("Cargando rotations.csv desde Data_Flow…");
  try {
    const path = state.dataFlowPath + ROTATIONS_CSV_FILENAME;
    const result = await window.api.readFileAbsolute(path);
    if (!result || !result.success || !result.content) {
      setStatus("No se encontró rotations.csv en Data_Flow o no se pudo leer.", true);
      return;
    }
    const pairs = extractUniquePairs(result.content);
    setStatus("Rotations.csv cargado: " + pairs.length + " combinaciones únicas.");
    if (!state.options) await loadPuestos();
    state.rows = mergeRowsWithMapping(pairs, state.rows.length ? state.rows : state.mapping);
    state.mapping = [];
    renderTable();
    saveMappingToDataFlow();
  } catch (e) {
    setStatus("Error leyendo rotations.csv: " + e.message, true);
  }
}

function normalizeTipoTarea(t) {
  if (!t) return "directa";
  const lower = String(t).toLowerCase().replace(/\s+/g, "_");
  if (["directa", "indirecta", "pesado", "critical_rol"].includes(lower)) return lower;
  if (lower === "critical" || lower === "critical_rol") return "critical_rol";
  return lower || "directa";
}

function fillPuestosFilters() {
  if (!el.filterArea || !el.filterDept) return;
  const depts = state.puestosData?.departamentos || [];
  el.filterArea.innerHTML = "<option value=''>Todas</option>" + AREAS.map((a) => `<option value="${a}">${a}</option>`).join("");
  if (state.filterPuestosArea) el.filterArea.value = state.filterPuestosArea;
  const deptsInArea = state.filterPuestosArea
    ? depts.filter((d) => (d.area || "").toUpperCase() === state.filterPuestosArea)
    : depts;
  el.filterDept.innerHTML = "<option value=''>Todos</option>" + deptsInArea.map((d) => {
    const globalIndex = depts.indexOf(d);
    return `<option value="${globalIndex}">${escapeHtml(d.nombre || d.id)}</option>`;
  }).join("");
  if (state.filterPuestosDept !== "" && state.filterPuestosDept !== undefined) el.filterDept.value = String(state.filterPuestosDept);
}

function renderPuestosTable() {
  if (!el.puestosTbody || !state.puestosData || !state.puestosData.departamentos) {
    fillPuestosFilters();
    return;
  }
  const depts = state.puestosData.departamentos;
  fillPuestosFilters();
  let rows = [];
  depts.forEach((dept, deptIndex) => {
    const puestos = dept.puestos || [];
    puestos.forEach((puesto, puestoIndex) => {
      if (state.filterPuestosArea && (dept.area || "").toUpperCase() !== state.filterPuestosArea) return;
      if (state.filterPuestosDept !== "" && state.filterPuestosDept !== undefined && deptIndex !== parseInt(state.filterPuestosDept, 10)) return;
      rows.push({ dept, deptIndex, puesto, puestoIndex });
    });
  });
  el.puestosTbody.innerHTML = "";
  rows.forEach(({ dept, deptIndex, puesto, puestoIndex }) => {
    const tr = document.createElement("tr");
    tr.dataset.deptIndex = deptIndex;
    tr.dataset.puestoIndex = puestoIndex;
    const areaSelect = document.createElement("select");
    areaSelect.className = "pm-input-text";
    AREAS.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a;
      opt.textContent = a;
      if ((dept.area || "").toUpperCase() === a) opt.selected = true;
      areaSelect.appendChild(opt);
    });
    areaSelect.addEventListener("change", () => {
      state.puestosData.departamentos[deptIndex].area = areaSelect.value;
      scheduleSavePuestos();
    });
    const deptNombreInput = document.createElement("input");
    deptNombreInput.type = "text";
    deptNombreInput.className = "pm-input-text";
    deptNombreInput.value = dept.nombre || "";
    deptNombreInput.placeholder = "Departamento";
    deptNombreInput.addEventListener("change", () => {
      state.puestosData.departamentos[deptIndex].nombre = deptNombreInput.value.trim();
      scheduleSavePuestos();
    });
    const puestoNombreInput = document.createElement("input");
    puestoNombreInput.type = "text";
    puestoNombreInput.className = "pm-input-text";
    puestoNombreInput.value = puesto.nombre || "";
    puestoNombreInput.placeholder = "Proceso (Puesto)";
    puestoNombreInput.addEventListener("change", () => {
      state.puestosData.departamentos[deptIndex].puestos[puestoIndex].nombre = puestoNombreInput.value.trim();
      scheduleSavePuestos();
    });
    const tipoSelect = document.createElement("select");
    tipoSelect.className = "pm-input-text";
    const currentTipo = normalizeTipoTarea(puesto.tipo_tarea);
    TIPO_TAREA_OPTIONS.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      if (currentTipo === o.value) opt.selected = true;
      tipoSelect.appendChild(opt);
    });
    tipoSelect.addEventListener("change", () => {
      state.puestosData.departamentos[deptIndex].puestos[puestoIndex].tipo_tarea = tipoSelect.value;
      scheduleSavePuestos();
    });
    const lineasData = puesto.lineas && Array.isArray(puesto.lineas) ? puesto.lineas : [];
    const lineasCell = document.createElement("td");
    lineasCell.className = "pm-lineas-cell";
    if (lineasData.length === 0) {
      const btnAdd = document.createElement("button");
      btnAdd.type = "button";
      btnAdd.className = "pm-btn pm-btn-small pm-btn-link";
      btnAdd.textContent = "Agregar líneas";
      btnAdd.addEventListener("click", () => openModalLineas(deptIndex, puestoIndex));
      lineasCell.appendChild(btnAdd);
    } else {
      const text = document.createElement("span");
      text.className = "pm-lineas-text";
      text.textContent = lineasData.map(formatLineaParaTabla).join(" · ");
      lineasCell.appendChild(text);
      const btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "pm-btn pm-btn-small pm-btn-link";
      btnEdit.textContent = "Editar";
      btnEdit.addEventListener("click", () => openModalLineas(deptIndex, puestoIndex));
      lineasCell.appendChild(document.createTextNode(" "));
      lineasCell.appendChild(btnEdit);
    }
    const certificadosData = puesto.certificados && Array.isArray(puesto.certificados) ? puesto.certificados : [];
    const certCell = document.createElement("td");
    certCell.className = "pm-cert-cell";
    const certSummary = document.createElement("span");
    certSummary.className = "pm-cert-summary";
    if (certificadosData.length === 0) {
      certSummary.textContent = "—";
    } else {
      certSummary.textContent = certificadosData.length === 1
        ? "1 formación"
        : certificadosData.length + " formaciones";
    }
    const btnCert = document.createElement("button");
    btnCert.type = "button";
    btnCert.className = "pm-btn pm-btn-small pm-btn-link";
    btnCert.textContent = certificadosData.length === 0 ? "Agregar certificados" : "Editar";
    btnCert.addEventListener("click", () => openModalCertificados(deptIndex, puestoIndex));
    certCell.appendChild(certSummary);
    certCell.appendChild(document.createTextNode(" "));
    certCell.appendChild(btnCert);
    const btnRemove = document.createElement("button");
    btnRemove.type = "button";
    btnRemove.className = "pm-btn pm-btn-small";
    btnRemove.textContent = "Quitar";
    btnRemove.addEventListener("click", () => removePuesto(deptIndex, puestoIndex));
    tr.appendChild(document.createElement("td")).appendChild(areaSelect);
    const deptTd = document.createElement("td");
    deptTd.appendChild(deptNombreInput);
    tr.appendChild(deptTd);
    const puestoTd = document.createElement("td");
    puestoTd.appendChild(puestoNombreInput);
    tr.appendChild(puestoTd);
    tr.appendChild(document.createElement("td")).appendChild(tipoSelect);
    tr.appendChild(lineasCell);
    tr.appendChild(certCell);
    tr.appendChild(document.createElement("td")).appendChild(btnRemove);
    el.puestosTbody.appendChild(tr);
  });
}

function removePuesto(deptIndex, puestoIndex) {
  const dept = state.puestosData.departamentos[deptIndex];
  if (!dept || !dept.puestos) return;
  dept.puestos.splice(puestoIndex, 1);
  if (dept.puestos.length === 0) {
    state.puestosData.departamentos.splice(deptIndex, 1);
  }
  refreshPuestosOptions();
  renderPuestosTable();
  scheduleSavePuestos();
}

function openModalDept() {
  if (!el.modalDept) return;
  if (!state.puestosData) state.puestosData = { version: "1.0", departamentos: [] };
  if (!state.puestosData.departamentos) state.puestosData.departamentos = [];
  const steps = el.modalDept.querySelectorAll(".pm-modal-step");
  steps.forEach((s, i) => { s.hidden = i !== 0; });
  el.modalDept.querySelector("#pm-modal-dept-area").value = "IB";
  el.modalDept.querySelector("#pm-modal-dept-nombre").value = "";
  el.modalDept.querySelector("#pm-modal-dept-lineas").value = "";
  el.modalDept.querySelector("#pm-modal-dept-next").hidden = false;
  el.modalDept.querySelector("#pm-modal-dept-done").hidden = true;
  el.modalDept.hidden = false;
}

function closeModalDept() {
  if (el.modalDept) el.modalDept.hidden = true;
}

function modalDeptNext() {
  const steps = Array.from(el.modalDept.querySelectorAll(".pm-modal-step"));
  const nextBtn = el.modalDept.querySelector("#pm-modal-dept-next");
  const doneBtn = el.modalDept.querySelector("#pm-modal-dept-done");
  const current = steps.findIndex((s) => !s.hidden);
  if (current < steps.length - 1) {
    steps[current].hidden = true;
    steps[current + 1].hidden = false;
    if (current + 1 === steps.length - 1) {
      nextBtn.hidden = true;
      doneBtn.hidden = false;
    }
  }
}

function modalDeptPrev() {
  const steps = Array.from(el.modalDept.querySelectorAll(".pm-modal-step"));
  const nextBtn = el.modalDept.querySelector("#pm-modal-dept-next");
  const doneBtn = el.modalDept.querySelector("#pm-modal-dept-done");
  const current = steps.findIndex((s) => !s.hidden);
  if (current > 0) {
    steps[current].hidden = true;
    steps[current - 1].hidden = false;
    nextBtn.hidden = false;
    doneBtn.hidden = true;
  }
}

function modalDeptDone() {
  const nombre = (el.modalDept.querySelector("#pm-modal-dept-nombre").value || "").trim();
  if (!nombre) return;
  const id = generateDeptId(nombre);
  const existe = (state.puestosData.departamentos || []).some(
    (d) => (d.id && d.id.toLowerCase() === id.toLowerCase()) || (d.nombre && d.nombre.trim().toLowerCase() === nombre.toLowerCase())
  );
  if (existe) {
    setStatus("Ya existe un departamento con ese nombre.", true);
    if (typeof window.showToast === "function") {
      window.showToast("Ya existe un departamento \"" + nombre + "\". Para añadir un puesto, usa «Nuevo puesto» y elige el departamento en la lista.", "warning");
    }
    return;
  }
  const area = el.modalDept.querySelector("#pm-modal-dept-area").value || "IB";
  const lineasText = el.modalDept.querySelector("#pm-modal-dept-lineas").value || "";
  const dept = {
    id,
    nombre,
    area,
    lineas: parseLineas(lineasText),
    puestos: [],
  };
  state.puestosData.departamentos.push(dept);
  refreshPuestosOptions();
  renderPuestosTable();
  scheduleSavePuestos();
  closeModalDept();
  setStatus("Departamento \"" + nombre + "\" creado. Añade puestos con «Nuevo puesto».");
}

function openModalPuesto() {
  if (!el.modalPuesto) return;
  const deptSelect = el.modalPuesto.querySelector("#pm-modal-puesto-dept");
  const depts = state.puestosData?.departamentos || [];
  deptSelect.innerHTML = depts.map((d, i) => `<option value="${i}">${escapeHtml(d.nombre || d.id)}</option>`).join("");
  if (depts.length === 0) {
    setStatus("Crea antes un departamento.", true);
    return;
  }
  el.modalPuesto.querySelector("#pm-modal-puesto-nombre").value = "";
  el.modalPuesto.querySelector("#pm-modal-puesto-tipo").value = "directa";
  el.modalPuesto.hidden = false;
}

function closeModalPuesto() {
  if (el.modalPuesto) el.modalPuesto.hidden = true;
}

function modalPuestoDone() {
  const deptIndex = parseInt(el.modalPuesto.querySelector("#pm-modal-puesto-dept").value, 10);
  const nombre = (el.modalPuesto.querySelector("#pm-modal-puesto-nombre").value || "").trim();
  if (!nombre || isNaN(deptIndex)) return;
  const dept = state.puestosData.departamentos[deptIndex];
  if (!dept) return;
  const tipo = el.modalPuesto.querySelector("#pm-modal-puesto-tipo").value || "directa";
  const puestoId = generatePuestoId(dept.id, nombre);
  const puesto = {
    id: puestoId,
    nombre,
    skills_needed: [],
    tipo_tarea: tipo,
    lineas: [],
    mesas: [],
    certificados: [],
  };
  if (!dept.puestos) dept.puestos = [];
  dept.puestos.push(puesto);
  refreshPuestosOptions();
  renderPuestosTable();
  scheduleSavePuestos();
  closeModalPuesto();
}

function openModalLineas(deptIndex, puestoIndex) {
  state.modalLineasDeptIndex = deptIndex;
  state.modalLineasPuestoIndex = puestoIndex;
  const puesto = state.puestosData.departamentos[deptIndex].puestos[puestoIndex];
  const lineas = puesto.lineas && Array.isArray(puesto.lineas) ? puesto.lineas : [];
  const nombresText = lineas.map((l) => l.nombre).filter(Boolean).join(", ");
  const estacionesText = formatLineasEstaciones(lineas);
  document.getElementById("pm-modal-lineas-nombres").value = nombresText;
  document.getElementById("pm-modal-lineas-estaciones").value = estacionesText;
  if (el.modalLineas) el.modalLineas.hidden = false;
}

function closeModalLineas() {
  if (el.modalLineas) el.modalLineas.hidden = true;
  state.modalLineasDeptIndex = null;
  state.modalLineasPuestoIndex = null;
}

function modalLineasGuardar() {
  const deptIndex = state.modalLineasDeptIndex;
  const puestoIndex = state.modalLineasPuestoIndex;
  if (deptIndex == null || puestoIndex == null) return;
  const nombresText = document.getElementById("pm-modal-lineas-nombres").value || "";
  const estacionesText = document.getElementById("pm-modal-lineas-estaciones").value || "";
  const lineas = mergeLineasConEstaciones(nombresText, estacionesText);
  const puesto = state.puestosData.departamentos[deptIndex].puestos[puestoIndex];
  puesto.lineas = lineas;
  puesto.mesas = lineas.flatMap((l) => l.estaciones || []);
  refreshPuestosOptions();
  renderPuestosTable();
  scheduleSavePuestos();
  closeModalLineas();
}

function modalLineasQuitar() {
  const deptIndex = state.modalLineasDeptIndex;
  const puestoIndex = state.modalLineasPuestoIndex;
  if (deptIndex == null || puestoIndex == null) return;
  const puesto = state.puestosData.departamentos[deptIndex].puestos[puestoIndex];
  puesto.lineas = [];
  puesto.mesas = [];
  refreshPuestosOptions();
  renderPuestosTable();
  scheduleSavePuestos();
  closeModalLineas();
}

/** Certificados: array de grupos; cada grupo = array de nombres (OR). Entre grupos = AND. */
function openModalCertificados(deptIndex, puestoIndex) {
  state.modalCertificadosDeptIndex = deptIndex;
  state.modalCertificadosPuestoIndex = puestoIndex;
  const puesto = state.puestosData.departamentos[deptIndex].puestos[puestoIndex];
  const nombrePuesto = puesto.nombre || puesto.id || "Puesto";
  document.getElementById("pm-modal-certificados-title").textContent = "Certificados: " + nombrePuesto;
  renderCertificadosGruposInModal(puesto.certificados && Array.isArray(puesto.certificados) ? puesto.certificados : []);
  if (el.modalCertificados) el.modalCertificados.hidden = false;
}

function closeModalCertificados() {
  if (el.modalCertificados) el.modalCertificados.hidden = true;
  state.modalCertificadosDeptIndex = null;
  state.modalCertificadosPuestoIndex = null;
}

/** Parsea textarea: una línea = un nombre (trim, sin vacíos). */
function parseCertificadosGroupText(text) {
  if (!text || typeof text !== "string") return [];
  return text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

function renderCertificadosGruposInModal(grupos) {
  const container = document.getElementById("pm-modal-certificados-grupos");
  if (!container) return;
  container.innerHTML = "";
  (grupos.length ? grupos : [[]]).forEach((nombres, groupIndex) => {
    const div = document.createElement("div");
    div.className = "pm-cert-grupo";
    div.dataset.groupIndex = groupIndex;
    const label = document.createElement("label");
    label.textContent = "Grupo " + (groupIndex + 1) + " (OR: cualquiera de estos nombres)";
    div.appendChild(label);
    const textarea = document.createElement("textarea");
    textarea.placeholder = "EUCF_NTU_ALL_Carton Mover Training\nEUCF_ ILT_ALL_Carton Mover\n...";
    textarea.value = Array.isArray(nombres) ? nombres.join("\n") : "";
    div.appendChild(textarea);
    const actions = document.createElement("div");
    actions.className = "pm-cert-grupo-actions";
    const btnQuitar = document.createElement("button");
    btnQuitar.type = "button";
    btnQuitar.className = "pm-btn pm-btn-small pm-btn-link";
    btnQuitar.textContent = "Quitar grupo";
    btnQuitar.addEventListener("click", () => {
      div.remove();
    });
    actions.appendChild(btnQuitar);
    div.appendChild(actions);
    container.appendChild(div);
  });
}

function modalCertificadosAddGrupo() {
  const container = document.getElementById("pm-modal-certificados-grupos");
  if (!container) return;
  const div = document.createElement("div");
  div.className = "pm-cert-grupo";
  const label = document.createElement("label");
  label.textContent = "Nuevo grupo (OR: cualquiera de estos nombres)";
  div.appendChild(label);
  const textarea = document.createElement("textarea");
  textarea.placeholder = "Nombre del certificado (uno por línea)";
  div.appendChild(textarea);
  const actions = document.createElement("div");
  actions.className = "pm-cert-grupo-actions";
  const btnQuitar = document.createElement("button");
  btnQuitar.type = "button";
  btnQuitar.className = "pm-btn pm-btn-small pm-btn-link";
  btnQuitar.textContent = "Quitar grupo";
  btnQuitar.addEventListener("click", () => div.remove());
  actions.appendChild(btnQuitar);
  div.appendChild(actions);
  container.appendChild(div);
}

function modalCertificadosGuardar() {
  const deptIndex = state.modalCertificadosDeptIndex;
  const puestoIndex = state.modalCertificadosPuestoIndex;
  if (deptIndex == null || puestoIndex == null) return;
  const container = document.getElementById("pm-modal-certificados-grupos");
  if (!container) return;
  const grupos = [];
  container.querySelectorAll(".pm-cert-grupo").forEach((div) => {
    const textarea = div.querySelector("textarea");
    const names = textarea ? parseCertificadosGroupText(textarea.value) : [];
    if (names.length > 0) grupos.push(names);
  });
  const puesto = state.puestosData.departamentos[deptIndex].puestos[puestoIndex];
  puesto.certificados = grupos;
  refreshPuestosOptions();
  renderPuestosTable();
  scheduleSavePuestos();
  closeModalCertificados();
}

function refreshPuestosOptions() {
  state.options = buildPuestosOptions(state.puestosData?.departamentos || []);
}

async function onPuestosLoad() {
  await loadConfigDataFlowPath();
  if (!state.dataFlowPath || !window.api || !window.api.readJson) {
    setStatus("No hay ruta Data_Flow o API para leer.", true);
    return;
  }
  try {
    const res = await window.api.readJson(state.dataFlowPath + PUESTOS_FILENAME);
    if (res && res.success && res.data) {
      state.puestosData = res.data;
      state.options = buildPuestosOptions(state.puestosData.departamentos || []);
      renderPuestosTable();
      state.lastSavedPuestos = Date.now();
      updateSyncStatus("puestos", true);
      setStatus("Puestos cargados desde Data_Flow.");
    } else {
      setStatus("No se pudo cargar puestos.json desde Data_Flow.", true);
    }
  } catch (e) {
    setStatus("Error: " + e.message, true);
  }
}

async function onPuestosSave() {
  if (!state.dataFlowPath || !window.api || !window.api.saveJson) {
    setStatus("No hay ruta Data_Flow o API para guardar.", true);
    return;
  }
  if (!state.puestosData || !state.puestosData.departamentos) {
    setStatus("No hay datos de puestos para guardar.", true);
    return;
  }
  try {
    const result = await window.api.saveJson(state.dataFlowPath + PUESTOS_FILENAME, state.puestosData);
    if (result && result.success) {
      setStatus("Puestos guardados en Data_Flow: " + PUESTOS_FILENAME);
    } else {
      setStatus("Error guardando: " + (result && result.error ? result.error : "desconocido"), true);
    }
  } catch (e) {
    setStatus("Error: " + e.message, true);
  }
}

function switchTab(tabId) {
  el.tabs.forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === tabId);
  });
  if (el.viewPuestos) el.viewPuestos.classList.toggle("pm-view-active", tabId === "puestos");
  if (el.viewMapping) el.viewMapping.classList.toggle("pm-view-active", tabId === "mapping");
}

async function init() {
  initElements();
  await loadConfigDataFlowPath();
  await loadPuestos();
  await loadMappingFromDataFlow();
  if (el.csvInput) el.csvInput.addEventListener("change", onCsvLoaded);
  if (el.csvFromPath) el.csvFromPath.addEventListener("click", loadRotationsFromDataFlow);
  if (el.filter) el.filter.addEventListener("input", () => renderTable());
  state.soloSinMapear = el.soloSinMapear ? el.soloSinMapear.checked : false;
  if (el.soloSinMapear) el.soloSinMapear.addEventListener("change", () => { state.soloSinMapear = el.soloSinMapear.checked; renderTable(); });
  if (el.filterArea) el.filterArea.addEventListener("change", () => { state.filterPuestosArea = el.filterArea.value || ""; state.filterPuestosDept = ""; renderPuestosTable(); });
  if (el.filterDept) el.filterDept.addEventListener("change", () => { state.filterPuestosDept = el.filterDept.value === "" ? "" : el.filterDept.value; renderPuestosTable(); });
  if (el.puestosLoad) el.puestosLoad.addEventListener("click", onPuestosLoad);
  if (el.puestosAddDept) el.puestosAddDept.addEventListener("click", openModalDept);
  if (el.puestosAddPuesto) el.puestosAddPuesto.addEventListener("click", openModalPuesto);
  if (el.modalDept) {
    el.modalDept.querySelector(".pm-modal-backdrop").addEventListener("click", closeModalDept);
    el.modalDept.querySelector(".pm-modal-close").addEventListener("click", closeModalDept);
    el.modalDept.querySelector("#pm-modal-dept-prev").addEventListener("click", modalDeptPrev);
    el.modalDept.querySelector("#pm-modal-dept-next").addEventListener("click", modalDeptNext);
    el.modalDept.querySelector("#pm-modal-dept-done").addEventListener("click", modalDeptDone);
  }
  if (el.modalPuesto) {
    el.modalPuesto.querySelector(".pm-modal-backdrop").addEventListener("click", closeModalPuesto);
    el.modalPuesto.querySelector(".pm-modal-close").addEventListener("click", closeModalPuesto);
    el.modalPuesto.querySelector("#pm-modal-puesto-done").addEventListener("click", modalPuestoDone);
  }
  if (el.modalLineas) {
    el.modalLineas.querySelector(".pm-modal-backdrop").addEventListener("click", closeModalLineas);
    el.modalLineas.querySelector(".pm-modal-close").addEventListener("click", closeModalLineas);
    document.getElementById("pm-modal-lineas-guardar").addEventListener("click", modalLineasGuardar);
    document.getElementById("pm-modal-lineas-quitar").addEventListener("click", modalLineasQuitar);
  }
  if (el.modalCertificados) {
    el.modalCertificados.querySelector(".pm-modal-backdrop").addEventListener("click", closeModalCertificados);
    el.modalCertificados.querySelector(".pm-modal-close").addEventListener("click", closeModalCertificados);
    document.getElementById("pm-modal-certificados-add-grupo").addEventListener("click", modalCertificadosAddGrupo);
    document.getElementById("pm-modal-certificados-guardar").addEventListener("click", modalCertificadosGuardar);
  }
  el.tabs.forEach((t) => {
    t.addEventListener("click", () => switchTab(t.dataset.tab));
  });
  renderPuestosTable();
  if (!state.rows.length) setStatus("Carga rotations.csv desde Data_Flow o un CSV/mapping. Edita puestos en la pestaña Puestos.");
}
init();
