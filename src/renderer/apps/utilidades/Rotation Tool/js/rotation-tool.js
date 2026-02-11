/**
 * Rotation Tool - Dashboard por áreas, HC por departamento, modal de puestos
 */

const PUESTOS_JSON_PATH_FALLBACK = "src/renderer/apps/utilidades/Rotation Tool/data/puestos.json";
const PUESTOS_FILENAME = "puestos.json";
const SKILLMATRIX_FILENAME = "skillmatrix.json";
const CERTIFICADOS_FILENAME = "certificados.json";
const FC_INTERNAL_CERT = "FC_Internal";

const AREA_LABELS = {
  IB: "Inbound",
  OB: "Outbound",
  Support: "Support",
  ICQA: "Support",
};

/** Orden para repartir cupos: IB, ISS, OB, TOM, Support */
const AREA_ORDER = ["IB", "ISS", "OB", "TOM", "Support"];

/** Support en dashboard solo incluye estos (no Waste, etc.) */
const SUPPORT_DEPT_IDS = ["5s", "enfermeria", "learning", "space"];

/** Orden fijo de departamentos en IB (ISS está en Support) */
const ORDER_IB = ["dock", "receive", "stow", "pout", "grading"];

/** Stow Team Lift Assistant sigue automáticamente a Stow Team Lift (1:1) */
const PUESTO_ESPEJO = { "stow-tl-ast": "stow-tl" };

/** Orden y etiquetas para agrupar puestos por tipo_tarea. Pesado se muestra dentro de Directos con fondo rojo. */
const TIPO_ORDER = ["directa", "indirecta", "pesado", "critical_rol"];
const TIPO_ORDER_DISPLAY = ["directa", "indirecta", "critical_rol"];
const TIPO_LABELS = {
  directa: "Directos",
  indirecta: "Indirectos",
  pesado: "Red Task",
  critical_rol: "Critical rol",
};

/** Orden y etiquetas para Storage Area (dentro de cada tipo en el modal). */
const STORAGE_AREA_ORDER = ["", "pick_tower", "high_rack"];
const STORAGE_AREA_LABELS = {
  "": "—",
  pick_tower: "Pick Tower",
  high_rack: "High Rack",
};

/** Distribución automática: Inbound = IB + ISS (cada uno con su cupo). */
const DISTRIBUCION_AUTO_IB = {
  dock: { "dock-clerk": 1, "dock-idm": 2, "dock-unloader": 2, "dock-ocean": 1, "dock-ocean-cm": 1, "dock-corral": 1, "dock-wrapping": 1, "dock-ergopack": 1 },
  receive: { "rcv-decant-tsi": 3, "rcv-decant-pid": 2, "rcv-noncon": 4, "rcv-cubis": 1, "rcv-prep": 2, "rcv-ws": 1, "rcv-pallet": 1, "rcv-tl": 1, "rcv-tl-ast": 1 },
  stow: { "stow-pt": 12, "stow-cart": 2, "stow-walkie": 2, "stow-hr-pitc": 3, "stow-pitb": 2, "stow-tl": 2, "stow-tl-ast": 2, "stow-hr-pita": 1 },
  pout: { "pout-ps": 1, "pout-pick": 1 },
  grading: { "grading-whd": 2, "grading-pick-whd": 2, "grading-ps": 1 },
  ISS: { "iss-ps-receive": 1, "iss-sweeper": 1, "iss-TT": 1 },
};
/** Distribución automática: Outbound = OB + TOM (cada uno con su cupo). */
const DISTRIBUCION_AUTO_OB = {
  pack: { "pack-l9": 4, "pack-ws": 2, "pack-noncon-l2": 1, "pack-siat-l2": 1, "pack-obps": 1 },
  pick: { "pick-noncon-hr": 4, "pick-noncon-pt": 4, "pick-tospoo-hr": 3, "pick-tospoo-pt": 3, "pick-walkie": 2, "pick-cart": 2, "pick-tl-hr": 1, "pick-ast-tl": 1 },
  "v-ret": { "vret-pick": 2, "vret-pack": 2, "vret-ps": 1, "vret-cart": 1 },
  ship: { "ship-area-a": 2, "ship-area-b": 2, "ship-area-d": 2, "ship-clerk": 1, "ship-idm": 1 },
  TOM: { "tom-garitas": 1, "tom-ODM": 1 },
};
function getPresetFlatForArea(areaKey, selectedDeptIds) {
  const byDept = areaKey === "IB" ? DISTRIBUCION_AUTO_IB : areaKey === "OB" ? DISTRIBUCION_AUTO_OB : null;
  if (!byDept) return {};
  const flat = {};
  for (const [deptId, puestos] of Object.entries(byDept)) {
    if (selectedDeptIds && selectedDeptIds.length && !selectedDeptIds.includes(deptId)) continue;
    for (const [id, v] of Object.entries(puestos)) flat[id] = v;
  }
  return flat;
}
/** Preset solo para un cupo (ej. solo IB o solo ISS). */
function getPresetFlatForCupo(areaKey, cupoKey, selectedDeptIds) {
  const byDept = areaKey === "IB" ? DISTRIBUCION_AUTO_IB : DISTRIBUCION_AUTO_OB;
  if (!byDept) return {};
  const flat = {};
  for (const [deptId, puestos] of Object.entries(byDept)) {
    const deptCupo = deptId === "ISS" ? "ISS" : deptId === "TOM" ? "TOM" : areaKey;
    if (deptCupo !== cupoKey) continue;
    if (selectedDeptIds && selectedDeptIds.length && !selectedDeptIds.includes(deptId)) continue;
    for (const [id, v] of Object.entries(puestos)) flat[id] = v;
  }
  return flat;
}

class RotationToolController {
  constructor() {
    this.puestosData = null;
    this.skillmatrixData = null;
    this.dataFlowBasePath = null;
    this.totalHC = 0;
    this.areaHC = { IB: 0, ISS: 0, OB: 0, TOM: 0, Support: 0 };
    this.puestoHC = {}; // { puestoId: number }
    this.departmentHC = {}; // solo para departamentos sin puestos (ej. 5s)
    this.modalDeptId = null;
    this.selectedDeptByArea = { IB: null, OB: null, Support: null };
    this._csvOverlayDeptId = null;
    this.pizarraGenerada = false;
    this.asignacionesPorPuesto = {}; // { puestoId: [login1, login2, ...] } después de generar
    this.loginsDisponibles = []; // listado de logins cargados (para generar pizarra)
    this.duplicadosEliminados = 0; // cuántos duplicados se eliminaron en la última carga
    this.ultimaPizarraPropuesta = null; // JSON para comparar con pizarra final y aprendizaje (HC)
    this.init();
  }

  static get STORAGE_APRENDIZAJE() {
    return "rt_aprendizaje_comparaciones";
  }

  /**
   * Parsea líneas de logins, detecta duplicados (case-insensitive) y devuelve únicos + info de duplicados.
   * @returns { unique: string[], duplicatedCount: number, duplicatedLogins: { login: string, count: number }[] }
   */
  detectarDuplicadosLogins(lines) {
    const seen = new Map();
    const firstCase = new Map();
    for (const line of lines) {
      const key = line.toLowerCase();
      if (!firstCase.has(key)) firstCase.set(key, line);
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    const unique = [];
    const duplicatedLogins = [];
    let duplicatedCount = 0;
    for (const [key, count] of seen) {
      const login = firstCase.get(key);
      unique.push(login);
      if (count > 1) {
        duplicatedCount += count - 1;
        duplicatedLogins.push({ login, count });
      }
    }
    duplicatedLogins.sort((a, b) => b.count - a.count);
    return { unique, duplicatedCount, duplicatedLogins };
  }

  async init() {
    try {
      this.configurarEventos();
      await this.cargarPuestos();
      this.actualizarResumenGlobal();
      console.log("✅ Rotation Tool inicializado");
    } catch (e) {
      console.error("❌ Rotation Tool init:", e);
      this.mostrarErrorDashboard("No se pudo cargar la lista de puestos.");
    }
  }

  /** Limpieza al salir de la vista (SPA: DOM reemplazado al cambiar de app). */
  destroy() {
    this.puestosData = null;
    this.modalDeptId = null;
    this.selectedDeptByArea = { IB: null, OB: null, Support: null };
    this.asignacionesPorPuesto = {};
    this.loginsDisponibles = [];
  }

  async cargarPuestos() {
    let loaded = false;

    if (typeof window.api !== "undefined" && window.api.getConfig && window.api.readJson) {
      try {
        const config = await window.api.getConfig();
        const paths = config && config.pizarra_paths && Array.isArray(config.pizarra_paths) ? config.pizarra_paths : [];
        if (paths.length > 0) {
          let base = paths[0];
          if (typeof base === "string") {
            base = base.replace(/\//g, "\\").trim();
            if (!base.endsWith("\\")) base += "\\";
            const puestosPath = base + PUESTOS_FILENAME;
            const result = await window.api.readJson(puestosPath);
            if (result && result.success && result.data) {
              this.puestosData = result.data;
              loaded = true;
            }
          }
        }
      } catch (_) {}
    }

    if (!loaded) {
      const scriptBase =
        typeof import.meta !== "undefined" && import.meta.url
          ? import.meta.url
          : (document.currentScript && document.currentScript.src) || window.location.href;
      try {
        const dataUrl = new URL("../data/puestos.json", scriptBase).href;
        const res = await fetch(dataUrl);
        if (res.ok) {
          this.puestosData = await res.json();
          loaded = true;
        }
      } catch (_) {}
    }

    if (!loaded) {
      try {
        const res = await fetch("../apps/utilidades/Rotation Tool/data/puestos.json");
        if (res.ok) {
          this.puestosData = await res.json();
          loaded = true;
        }
      } catch (_) {}
    }

    if (!loaded && typeof window.api !== "undefined" && window.api.readFile) {
      try {
        const result = await window.api.readFile(PUESTOS_JSON_PATH_FALLBACK);
        if (result?.success && result.content) {
          this.puestosData = JSON.parse(result.content);
          loaded = true;
        }
      } catch (_) {}
    }

    if (!loaded && typeof window.api !== "undefined" && window.api.getConfig && window.api.readFileAbsolute) {
      try {
        const config = await window.api.getConfig();
        const paths = config && config.pizarra_paths && Array.isArray(config.pizarra_paths) ? config.pizarra_paths : [];
        if (paths.length > 0) {
          let base = paths[0];
          if (typeof base === "string") {
            base = base.replace(/\//g, "\\").trim();
            if (!base.endsWith("\\")) base += "\\";
            this.dataFlowBasePath = base;
            const puestosPath = base + PUESTOS_FILENAME;
            const result = await window.api.readFileAbsolute(puestosPath);
            if (result && result.success && result.content) {
              this.puestosData = JSON.parse(result.content);
              loaded = true;
            }
          }
        }
      } catch (_) {}
    }

    if (!loaded) {
      const loadingEl = document.getElementById("rt-dashboard-loading");
      if (loadingEl) loadingEl.textContent = "No se pudo cargar puestos.json.";
      return;
    }

    if (!this.puestosData || typeof this.puestosData !== "object") {
      this.puestosData = { version: "1.0", departamentos: [] };
    }
    if (!Array.isArray(this.puestosData.departamentos)) {
      this.puestosData.departamentos = [];
    }

    await this.cargarSkillMatrix();

    const loadingEl = document.getElementById("rt-dashboard-loading");
    if (loadingEl) loadingEl.remove();
    try {
      this.renderizarDashboard();
    } catch (err) {
      console.error("Rotation Tool renderizarDashboard:", err);
      const container = document.getElementById("rt-dashboard-content");
      if (container) {
        container.innerHTML = "";
        const errEl = document.createElement("div");
        errEl.className = "rt-dashboard-error";
        errEl.textContent = "Error al mostrar el dashboard: " + (err.message || String(err));
        container.appendChild(errEl);
      }
    }
  }

  /** Carga skillmatrix.json desde Data_Flow (misma ruta que puestos) para restringir asignaciones por formación. */
  async cargarSkillMatrix() {
    this.skillmatrixData = null;
    if (!this.dataFlowBasePath && typeof window.api !== "undefined" && window.api.getConfig && window.api.readFileAbsolute) {
      try {
        const config = await window.api.getConfig();
        const paths = config?.pizarra_paths && Array.isArray(config.pizarra_paths) ? config.pizarra_paths : [];
        if (paths.length > 0) {
          let base = paths[0];
          if (typeof base === "string") {
            base = base.replace(/\//g, "\\").trim();
            if (!base.endsWith("\\")) base += "\\";
            this.dataFlowBasePath = base;
          }
        }
      } catch (_) {}
    }
    if (!this.dataFlowBasePath || !window.api?.readFileAbsolute) return;
    try {
      const path = this.dataFlowBasePath + SKILLMATRIX_FILENAME;
      const result = await window.api.readFileAbsolute(path);
      if (result?.success && result.content) {
        this.skillmatrixData = typeof result.content === "string" ? JSON.parse(result.content) : result.content;
      }
    } catch (_) {}
    try {
      const certPath = this.dataFlowBasePath + CERTIFICADOS_FILENAME;
      const certResult = await window.api.readFileAbsolute(certPath);
      if (certResult?.success && certResult.content) {
        this.certificadosData = typeof certResult.content === "string" ? JSON.parse(certResult.content) : certResult.content;
      } else {
        this.certificadosData = { procesos: {} };
      }
    } catch (_) {
      this.certificadosData = { procesos: {} };
    }
  }

  /** true si el puesto tiene FC_Internal (asignación manual cuenta como verificada). */
  puestoTieneFCInternal(puestoId) {
    const grupos = this.certificadosData?.procesos?.[puestoId];
    if (!Array.isArray(grupos)) return false;
    const key = FC_INTERNAL_CERT.toLowerCase();
    return grupos.some((g) => Array.isArray(g) && g.some((c) => String(c || "").trim().toLowerCase() === key));
  }

  /** Skills efectivas de un login (manual + verificadas). */
  getSkillsUsuario(login) {
    if (!this.skillmatrixData?.usuarios) return {};
    const u = this.skillmatrixData.usuarios[login?.toUpperCase?.() ?? login];
    const manual = u?.puestos || {};
    const verified = u?.puestos_verificados || {};
    return { ...verified, ...manual };
  }

  /** true si el login tiene el puesto solo como manual (sin verificar por CSV). */
  isSkillSoloManual(login, puestoId) {
    const u = this.skillmatrixData?.usuarios?.[login?.toUpperCase?.() ?? login];
    if (!u) return false;
    const verified = u.puestos_verificados || {};
    const manual = u.puestos || {};
    return !verified[puestoId] && !!manual[puestoId];
  }

  /** Set de logins que tienen (verified o manual) el puesto. */
  getLoginsConSkillPuesto(puestoId) {
    const set = new Set();
    if (!this.skillmatrixData?.usuarios) return set;
    for (const [login, u] of Object.entries(this.skillmatrixData.usuarios)) {
      const skills = this.getSkillsUsuario(login);
      if (skills[puestoId]) set.add(login);
    }
    return set;
  }

  /** URL de la foto del empleado (mismo origen que Skill Matrix / Imanes). */
  getUserPhotoUrl(login) {
    if (!login) return "";
    return `https://internal-cdn.amazon.com/badgephotos.amazon.com/?uid=${login}`;
  }

  /** Cupo (HC) de un puesto o depto por id. */
  getCupoPuesto(puestoId) {
    if (!puestoId) return 0;
    const depts = this.puestosData?.departamentos || [];
    const dept = depts.find((d) => d.id === puestoId);
    if (dept && (!dept.puestos || dept.puestos.length === 0)) return this.departmentHC[puestoId] ?? 0;
    return this.puestoHC[puestoId] ?? 0;
  }

  /** Lista de puestos/deptos donde faltan personas: { id, label, cupo, asignados, faltan }. */
  getPuestosConFalta() {
    const options = this.getAllPuestoAndDeptOptions();
    const out = [];
    for (const { id, label } of options) {
      const cupo = this.getCupoPuesto(id);
      const asignados = (this.asignacionesPorPuesto[id] || []).length;
      const faltan = Math.max(0, cupo - asignados);
      if (faltan > 0) out.push({ id, label, cupo, asignados, faltan });
    }
    return out;
  }

  /** Puestos con más personas de las que caben: { id, label, cupo, asignados, sobra }. */
  getPuestosConExceso() {
    const options = this.getAllPuestoAndDeptOptions();
    const out = [];
    for (const { id, label } of options) {
      const cupo = this.getCupoPuesto(id);
      const asignados = (this.asignacionesPorPuesto[id] || []).length;
      const sobra = Math.max(0, asignados - cupo);
      if (sobra > 0) out.push({ id, label, cupo, asignados, sobra });
    }
    return out;
  }

  /** Opciones { id, label } para el selector de puesto (puestos + depts sin puestos). */
  getAllPuestoAndDeptOptions() {
    const out = [];
    const porArea = this.getDepartamentosPorArea();
    for (const areaKey of ["IB", "OB", "Support"]) {
      const depts = porArea[areaKey] || [];
      for (const dept of depts) {
        if (this.isNoCuentaHC(dept)) continue;
        const puestos = dept.puestos || [];
        if (puestos.length === 0) {
          out.push({ id: dept.id, label: `${dept.nombre || dept.id} (depto)` });
        } else {
          for (const puesto of puestos) {
            out.push({ id: puesto.id, label: puesto.nombre || puesto.id });
          }
        }
      }
    }
    return out;
  }

  /** Cupo del que sale el HC: ISS→ISS, TOM→TOM, resto por area (IB/OB). Support solo 5s, Enfermería, Learning, Space. */
  getAreaForHC(dept) {
    if (dept.id === "ISS") return "ISS";
    if (dept.id === "TOM") return "TOM";
    if (dept.area === "Support" || dept.area === "ICQA") return SUPPORT_DEPT_IDS.includes(dept.id) ? "Support" : null;
    return dept.area === "IB" ? "IB" : dept.area === "OB" ? "OB" : null;
  }

  /** Sección de visualización: Inbound (IB depts + ISS al final), Outbound (OB depts + TOM al final), Support (solo 5s, Enfermería, Learning, Space). */
  getDisplayArea(dept) {
    if (dept.id === "ISS") return "IB";
    if (dept.id === "TOM") return "OB";
    if (dept.area === "Support" || dept.area === "ICQA") return SUPPORT_DEPT_IDS.includes(dept.id) ? "Support" : null;
    return dept.area === "IB" ? "IB" : dept.area === "OB" ? "OB" : null;
  }

  getDepartamentosPorArea() {
    if (!this.puestosData?.departamentos) return {};
    const porArea = { IB: [], OB: [], Support: [] };
    for (const d of this.puestosData.departamentos) {
      const area = this.getDisplayArea(d);
      if (!area) continue;
      porArea[area].push(d);
    }
    if (porArea.IB.length) {
      porArea.IB.sort((a, b) => {
        if (a.id === "ISS") return 1;
        if (b.id === "ISS") return -1;
        const i = ORDER_IB.indexOf(a.id);
        const j = ORDER_IB.indexOf(b.id);
        if (i !== -1 && j !== -1) return i - j;
        if (i !== -1) return -1;
        if (j !== -1) return 1;
        return a.nombre.localeCompare(b.nombre);
      });
    }
    if (porArea.OB.length) {
      porArea.OB.sort((a, b) => {
        if (a.id === "TOM") return 1;
        if (b.id === "TOM") return -1;
        return a.nombre.localeCompare(b.nombre);
      });
    }
    porArea.Support.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return porArea;
  }

  /** Departamentos que no suman al HC (Learning, Enfermería) */
  isNoCuentaHC(dept) {
    return !!(dept && (dept.no_cuenta_hc === true || dept.id === "learning" || dept.id === "enfermeria"));
  }

  /** HC del departamento = suma de puestos, o departmentHC si no tiene puestos (ej. 5s) */
  getDepartmentHC(dept) {
    if (!dept || this.isNoCuentaHC(dept)) return 0;
    const puestos = dept.puestos || [];
    if (puestos.length === 0) return this.departmentHC[dept.id] ?? 0;
    return puestos.reduce((sum, p) => sum + (this.puestoHC[p.id] || 0), 0);
  }

  /** Suma de HC asignados en un área por cupo (IB, ISS, OB, TOM, Support) */
  getAreaAssignedHC(areaKey) {
    const depts = this.puestosData?.departamentos || [];
    return depts
      .filter((d) => !this.isNoCuentaHC(d) && this.getAreaForHC(d) === areaKey)
      .reduce((sum, d) => sum + this.getDepartmentHC(d), 0);
  }

  /** Máximo asignable a un departamento según su área de cupo */
  getMaxHCForDept(dept) {
    const areaKey = this.getAreaForHC(dept);
    const cupoArea = this.areaHC[areaKey] || 0;
    const asignadoEnArea = this.getAreaAssignedHC(areaKey);
    const asignadoEnEsteDept = this.getDepartmentHC(dept);
    return Math.max(0, cupoArea - asignadoEnArea + asignadoEnEsteDept);
  }

  renderizarDashboard() {
    const container = document.getElementById("rt-dashboard-content");
    if (!container) return;
    container.innerHTML = "";

    const porArea = this.getDepartamentosPorArea();
    const displayOrder = ["IB", "OB", "Support"];

    for (const areaKey of displayOrder) {
      const depts = porArea[areaKey] || [];
      if (depts.length === 0) continue;
      const label = areaKey === "IB" ? "Inbound" : areaKey === "OB" ? "Outbound" : "Support";

      const section = document.createElement("div");
      section.className = "rt-area";
      section.setAttribute("data-area", areaKey);
      if (areaKey === "Support") section.style.gridColumn = "1 / -1";

      const cupoArea = (areaKey === "IB" ? (this.areaHC.IB || 0) + (this.areaHC.ISS || 0) : areaKey === "OB" ? (this.areaHC.OB || 0) + (this.areaHC.TOM || 0) : this.areaHC.Support || 0);
      const asignadoEnArea = (areaKey === "IB" ? this.getAreaAssignedHC("IB") + this.getAreaAssignedHC("ISS") : areaKey === "OB" ? this.getAreaAssignedHC("OB") + this.getAreaAssignedHC("TOM") : this.getAreaAssignedHC("Support"));
      const quedan = Math.max(0, cupoArea - asignadoEnArea);

      const header = document.createElement("div");
      header.className = "rt-area-header";
      const headerLeft = document.createElement("div");
      headerLeft.className = "rt-area-header-left";
      headerLeft.innerHTML = `<span class="rt-area-header-label">${label}</span>`;
      if (areaKey === "IB" || areaKey === "OB") {
        const autoAreaBtn = document.createElement("button");
        autoAreaBtn.type = "button";
        autoAreaBtn.className = "rt-btn rt-btn-sm rt-area-auto-btn";
        autoAreaBtn.textContent = "Distribuir automáticamente";
        autoAreaBtn.addEventListener("click", () => {
          this.abrirModalDistribuirAuto(areaKey);
        });
        headerLeft.appendChild(autoAreaBtn);
      }
      const headerHc = document.createElement("span");
      headerHc.className = "rt-area-header-hc";
      headerHc.textContent = `${asignadoEnArea} de ${cupoArea}`;
      header.appendChild(headerLeft);
      header.appendChild(headerHc);
      section.appendChild(header);
      const body = document.createElement("div");
      body.className = "rt-area-body";
      const cardsCol = document.createElement("div");
      cardsCol.className = "rt-area-cards-col";
      const areaSummary = document.createElement("div");
      areaSummary.className = "rt-area-summary";
      areaSummary.textContent = `Quedan ${quedan} por asignar`;
      cardsCol.appendChild(areaSummary);
      const grid = document.createElement("div");
      grid.className = "rt-area-grid";

      for (const dept of depts) {
        const noHC = this.isNoCuentaHC(dept);
        const hcDept = this.getDepartmentHC(dept);
        const selected = this.selectedDeptByArea[areaKey]?.id === dept.id;
        const isISS = dept.id === "ISS";
        const isTOM = dept.id === "TOM";
        const card = document.createElement("div");
        card.className = "rt-dept-card" + (noHC ? " rt-dept-card-no-hc" : "") + (selected ? " rt-dept-card-selected" : "") + (isISS ? " rt-dept-card-iss" : "") + (isTOM ? " rt-dept-card-tom" : "");
        card.setAttribute("data-dept-id", dept.id);
        card.setAttribute("data-area", areaKey);
        if (noHC) {
          card.innerHTML = `
            <span class="rt-dept-name">${escapeHtml(dept.nombre)}</span>
            <span class="rt-dept-badge">Subir CSV</span>
          `;
          card.addEventListener("click", () => this.abrirOverlayCSV(dept));
        } else {
          card.innerHTML = `
            <span class="rt-dept-name">${escapeHtml(dept.nombre)}</span>
            <div class="rt-dept-hc-wrap">
              <span class="rt-dept-hc-value">${hcDept}</span>
            </div>
          `;
          card.addEventListener("click", () => this.seleccionarDepto(areaKey, dept));
        }
        grid.appendChild(card);
      }

      cardsCol.appendChild(grid);
      body.appendChild(cardsCol);
      const panel = document.createElement("div");
      panel.className = "rt-area-puestos-panel";
      panel.id = "rt-panel-" + areaKey;
      panel.setAttribute("data-area", areaKey);
      if (this.selectedDeptByArea[areaKey]) {
        this.fillPanelPuestos(areaKey, this.selectedDeptByArea[areaKey], panel);
      } else {
        panel.innerHTML = "<p class=\"rt-panel-placeholder\">Haz clic en un departamento para asignar puestos.</p>";
      }
      body.appendChild(panel);
      section.appendChild(body);
      container.appendChild(section);
    }
  }

  actualizarResumenGlobal() {
    const el = document.getElementById("rt-hc-total");
    if (el) el.textContent = this.totalHC;
    const sum = AREA_ORDER.reduce((acc, area) => acc + this.getAreaAssignedHC(area), 0);
    const sumEl = document.getElementById("rt-hc-sum");
    if (sumEl) sumEl.textContent = sum;
    const dupEl = document.getElementById("rt-hc-duplicados");
    if (dupEl) {
      if (this.duplicadosEliminados > 0) {
        dupEl.textContent = `(${this.duplicadosEliminados} duplicados eliminados)`;
        dupEl.className = "rt-hc-duplicados rt-hc-duplicados-visible";
      } else {
        dupEl.textContent = "";
        dupEl.className = "rt-hc-duplicados";
      }
    }
    this.actualizarAreaSumMsg();
    this.actualizarBotonesPizarra();
  }

  actualizarAreaSumMsg() {
    const totalArea = AREA_ORDER.reduce((acc, a) => acc + (this.areaHC[a] || 0), 0);
    const msg = document.getElementById("rt-area-hc-sum-msg");
    if (!msg) return;
    if (totalArea > this.totalHC) {
      msg.textContent = `La suma por área (${totalArea}) no puede superar el disponible (${this.totalHC}).`;
      msg.classList.add("rt-area-hc-error");
    } else {
      msg.textContent = totalArea === this.totalHC ? "Reparto completo." : `Faltan ${this.totalHC - totalArea} por repartir.`;
      msg.classList.remove("rt-area-hc-error");
    }
  }

  actualizarBotonesPizarra() {
    const totalArea = AREA_ORDER.reduce((acc, a) => acc + (this.areaHC[a] || 0), 0);
    const asignado = AREA_ORDER.reduce((acc, a) => acc + this.getAreaAssignedHC(a), 0);
    const generar = document.getElementById("btn-generar-pizarra");
    const enviar = document.getElementById("btn-enviar-pizarra");
    const descargarJson = document.getElementById("btn-descargar-json-propuesta");
    const puedeGenerar = this.totalHC > 0 && totalArea === this.totalHC && asignado === this.totalHC;
    if (generar) generar.disabled = !puedeGenerar;
    if (enviar) enviar.disabled = !this.pizarraGenerada;
    if (descargarJson) descargarJson.disabled = !this.pizarraGenerada;
    const aviso = document.getElementById("rt-generar-aviso");
    if (aviso && puedeGenerar) {
      aviso.hidden = true;
      aviso.textContent = "";
    }
  }

  seleccionarDepto(areaKey, dept) {
    if (this.isNoCuentaHC(dept)) {
      this.abrirOverlayCSV(dept);
      return;
    }
    this.selectedDeptByArea[areaKey] = dept;
    const panel = document.getElementById("rt-panel-" + areaKey);
    if (panel) this.fillPanelPuestos(areaKey, dept, panel);
    this.renderizarDashboard();
  }

  actualizarCardHC(areaKey, deptId, value) {
    const card = document.querySelector(`.rt-area[data-area="${areaKey}"] .rt-dept-card[data-dept-id="${deptId}"] .rt-dept-hc-value`);
    if (card) card.textContent = value;
  }

  fillPanelPuestos(areaKey, dept, panel) {
    const maxDept = this.getMaxHCForDept(dept);
    panel.innerHTML = "";
    const onUpdate = () => {
      const sum = this.getDepartmentHC(dept);
      this.actualizarCardHC(areaKey, dept.id, sum);
      this.actualizarResumenGlobal();
      if (btnLabelEl) btnLabelEl.textContent = expanded ? `${dept.nombre} — máx. ${maxDept}` : `Resumen · ${sum} de ${maxDept} asignados`;
      if (detailSummaryEl) {
        detailSummaryEl.textContent = `${sum} de ${maxDept} asignados`;
        detailSummaryEl.classList.toggle("rt-modal-summary-over", sum > maxDept);
      }
    };
    let expanded = false;
    const resumenWrap = document.createElement("div");
    resumenWrap.className = "rt-panel-resumen-wrap";
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "rt-panel-resumen-btn";
    const btnLabelEl = document.createElement("span");
    btnLabelEl.className = "rt-panel-resumen-btn-label";
    btnLabelEl.textContent = `Resumen · 0 de ${maxDept} asignados`;
    const chevron = document.createElement("span");
    chevron.className = "rt-panel-resumen-chevron";
    chevron.textContent = "▼";
    chevron.setAttribute("aria-hidden", "true");
    toggleBtn.appendChild(btnLabelEl);
    toggleBtn.appendChild(chevron);
    const collapseEl = document.createElement("div");
    collapseEl.className = "rt-panel-resumen-collapse";
    collapseEl.hidden = true;
    const detailTitle = document.createElement("div");
    detailTitle.className = "rt-panel-title";
    detailTitle.textContent = `${dept.nombre} — máx. ${maxDept}`;
    const detailSummaryEl = document.createElement("p");
    detailSummaryEl.className = "rt-panel-summary";
    detailSummaryEl.textContent = `0 de ${maxDept} asignados`;
    collapseEl.appendChild(detailTitle);
    collapseEl.appendChild(detailSummaryEl);
    toggleBtn.addEventListener("click", () => {
      expanded = !expanded;
      collapseEl.hidden = !expanded;
      chevron.textContent = expanded ? "▲" : "▼";
      btnLabelEl.textContent = expanded ? `${dept.nombre} — máx. ${maxDept}` : `Resumen · ${this.getDepartmentHC(dept)} de ${maxDept} asignados`;
    });
    resumenWrap.appendChild(toggleBtn);
    resumenWrap.appendChild(collapseEl);
    panel.appendChild(resumenWrap);
    const puestos = dept.puestos || [];
    if (puestos.length === 0) {
      const wrap = document.createElement("div");
      wrap.className = "rt-panel-sin-puestos";
      const val = this.departmentHC[dept.id] ?? 0;
      wrap.innerHTML = `
        <label for="rt-dept-hc-${escapeHtml(dept.id)}">Personas</label>
        <input type="number" id="rt-dept-hc-${escapeHtml(dept.id)}" class="rt-input-num" min="0" max="${maxDept}" value="${val}" data-dept-id="${escapeHtml(dept.id)}" />
      `;
      const input = wrap.querySelector("input");
      input.addEventListener("input", () => {
        const v = parseInt(input.value, 10);
        this.departmentHC[dept.id] = isNaN(v) ? 0 : Math.max(0, Math.min(maxDept, v));
        onUpdate();
      });
      const deptAsig = this.pizarraGenerada && this.asignacionesPorPuesto[dept.id];
      if (deptAsig && deptAsig.length > 0) {
        const asigEl = document.createElement("div");
        asigEl.className = "rt-puesto-asignados";
        asigEl.innerHTML = deptAsig
          .map((login) => {
            const sinVerificar = this.isSkillSoloManual(login, dept.id);
            if (sinVerificar) return `<span class="rt-asig-sin-verificar" title="Formación sin verificar (pendiente CSV)">${escapeHtml(login)}</span>`;
            return escapeHtml(login);
          })
          .join(", ");
        wrap.appendChild(asigEl);
      }
      panel.appendChild(wrap);
      onUpdate();
      return;
    }
    const puestosContainer = document.createElement("div");
    puestosContainer.className = "rt-modal-puestos";
    panel.appendChild(puestosContainer);
    const porTipo = this.agruparPuestosPorTipo(puestos);
    for (const tipoKey of TIPO_ORDER_DISPLAY) {
      const puestosList = porTipo[tipoKey] || [];
      if (puestosList.length === 0) continue;
      const section = document.createElement("div");
      section.className = "rt-modal-tipo-section";
      section.dataset.tipo = tipoKey;
      const tipoTitle = document.createElement("div");
      tipoTitle.className = "rt-modal-tipo-title";
      tipoTitle.textContent = TIPO_LABELS[tipoKey] || tipoKey;
      section.appendChild(tipoTitle);
      for (const storageKey of STORAGE_AREA_ORDER) {
        const puestosEnStorage = puestosList.filter((p) => p && typeof p === "object" && ((p.storage_area || "") + "").trim() === storageKey);
        if (puestosEnStorage.length === 0) continue;
        if (storageKey) {
          const storageLabel = STORAGE_AREA_LABELS[storageKey] || storageKey;
          const storageTitle = document.createElement("div");
          storageTitle.className = "rt-modal-storage-title";
          storageTitle.textContent = storageLabel;
          section.appendChild(storageTitle);
        }
        const grid = document.createElement("div");
        grid.className = "rt-modal-puestos-grid";
        for (const puesto of puestosEnStorage) {
          const espejoDe = PUESTO_ESPEJO[puesto.id];
          const val = espejoDe ? (this.puestoHC[espejoDe] ?? 0) : (this.puestoHC[puesto.id] ?? 0);
          const readonly = !!espejoDe;
          const t = ((puesto.tipo_tarea || "") + "").toLowerCase().replace(/\s+/g, "_");
          const isRedTask = puesto.red_task === true || t.includes("pesado");
          const row = document.createElement("div");
          row.className = "rt-modal-puesto-row" + (readonly ? " rt-modal-puesto-row-readonly" : "") + (isRedTask ? " rt-modal-puesto-row-red-task" : "");
          row.innerHTML = `
          <div class="rt-modal-puesto-row-main">
            <label for="rt-puesto-${escapeHtml(puesto.id)}" class="rt-modal-puesto-label">${escapeHtml(puesto.nombre)}</label>
            <input type="number" id="rt-puesto-${escapeHtml(puesto.id)}" class="rt-input-num rt-modal-puesto-input" data-puesto-id="${escapeHtml(puesto.id)}" data-espejo-de="${espejoDe || ""}" min="0" value="${val}" ${readonly ? "readonly" : ""} />
          </div>
        `;
          const asignados = this.pizarraGenerada && (this.asignacionesPorPuesto[puesto.id] || this.asignacionesPorPuesto[espejoDe]);
          const list = asignados ? (this.asignacionesPorPuesto[puesto.id] || this.asignacionesPorPuesto[espejoDe] || []) : [];
          const puestoIdForSkill = puesto.id;
          if (list.length > 0) {
            const asigEl = document.createElement("div");
            asigEl.className = "rt-puesto-asignados";
            asigEl.innerHTML = list
              .map((login) => {
                const sinVerificar = this.isSkillSoloManual(login, puestoIdForSkill);
                if (sinVerificar) return `<span class="rt-asig-sin-verificar" title="Formación sin verificar (pendiente CSV)">${escapeHtml(login)}</span>`;
                return escapeHtml(login);
              })
              .join(", ");
            row.appendChild(asigEl);
          }
          const input = row.querySelector("input");
          if (!readonly) {
            input.addEventListener("input", () => {
              this.syncStowTLAsistente(puestosContainer);
              this.guardarPuestosDesdePanel(puestosContainer);
              onUpdate();
            });
            input.addEventListener("change", () => {
              this.syncStowTLAsistente(puestosContainer);
              this.guardarPuestosDesdePanel(puestosContainer);
              onUpdate();
            });
          }
          grid.appendChild(row);
        }
        section.appendChild(grid);
      }
      puestosContainer.appendChild(section);
    }
    onUpdate();
  }

  guardarPuestosDesdePanel(puestosContainer) {
    if (!puestosContainer) return;
    this.syncStowTLAsistente(puestosContainer);
    puestosContainer.querySelectorAll(".rt-modal-puesto-input").forEach((input) => {
      const id = input.getAttribute("data-puesto-id");
      const v = parseInt(input.value, 10);
      if (id) this.puestoHC[id] = isNaN(v) ? 0 : Math.max(0, v);
    });
    Object.entries(PUESTO_ESPEJO).forEach(([astId, tlId]) => {
      this.puestoHC[astId] = this.puestoHC[tlId] ?? 0;
    });
  }

  agruparPuestosPorTipo(puestos) {
    const out = {};
    const list = Array.isArray(puestos) ? puestos : [];
    for (const p of list) {
      if (!p || typeof p !== "object") continue;
      const t = ((p.tipo_tarea || "directa") + "").toLowerCase().replace(/\s+/g, "_");
      const norm = t.includes("critical") ? "critical_rol" : t.includes("indirect") ? "indirecta" : t.includes("pesado") ? "pesado" : "directa";
      const groupKey = norm === "pesado" ? "directa" : norm;
      if (!out[groupKey]) out[groupKey] = [];
      out[groupKey].push(p);
    }
    return out;
  }

  /**
   * Distribuye un cupo concreto (IB, ISS, OB o TOM) entre los puestos del preset para ese cupo.
   * selectedDeptIds = ids de departamentos seleccionados en el modal.
   */
  aplicarDistribucionUnCupo(areaKey, cupoKey, selectedDeptIds, porArea) {
    const preset = getPresetFlatForCupo(areaKey, cupoKey, selectedDeptIds);
    if (Object.keys(preset).length === 0) return;
    const cupoArea = this.areaHC[cupoKey] || 0;
    if (cupoArea <= 0) return;
    const depts = (porArea[areaKey] || []).filter((d) => this.getAreaForHC(d) === cupoKey);
    const selectedDeptIdSet = selectedDeptIds && selectedDeptIds.length ? new Set(selectedDeptIds) : null;
    const areaPuestoIds = new Set();
    const puestoToDept = {};
    for (const d of depts) {
      if (this.isNoCuentaHC(d)) continue;
      const include = !selectedDeptIdSet || selectedDeptIdSet.has(d.id);
      for (const p of d.puestos || []) {
        areaPuestoIds.add(p.id);
        puestoToDept[p.id] = d.id;
        if (!include) this.puestoHC[p.id] = 0;
      }
    }
    const presetFiltered = {};
    for (const [id, v] of Object.entries(preset)) {
      if (PUESTO_ESPEJO[id]) continue;
      if (areaPuestoIds.has(id) && (!selectedDeptIdSet || selectedDeptIdSet.has(puestoToDept[id])))
        presetFiltered[id] = v;
    }
    const totalPreset = Object.values(presetFiltered).reduce((a, b) => a + b, 0);
    if (totalPreset <= 0) return;
    const scale = cupoArea / totalPreset;
    const values = {};
    let sum = 0;
    for (const [id, v] of Object.entries(presetFiltered)) {
      if (PUESTO_ESPEJO[id]) continue;
      const scaled = Math.round(v * scale);
      values[id] = scaled;
      sum += scaled;
    }
    Object.entries(PUESTO_ESPEJO).forEach(([astId, tlId]) => {
      if (areaPuestoIds.has(astId) && presetFiltered[tlId] != null) {
        values[astId] = values[tlId] ?? 0;
        sum += values[astId];
      }
    });
    let diff = cupoArea - sum;
    if (diff !== 0) {
      const mainEntry = Object.entries(presetFiltered).filter(([id]) => !PUESTO_ESPEJO[id]).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0];
      if (mainEntry) {
        const [mainId] = mainEntry;
        values[mainId] = Math.max(0, (values[mainId] || 0) + diff);
      }
    }
    for (const [id, val] of Object.entries(values)) {
      this.puestoHC[id] = val;
    }
    Object.entries(PUESTO_ESPEJO).forEach(([astId, tlId]) => {
      if (areaPuestoIds.has(astId)) this.puestoHC[astId] = this.puestoHC[tlId] ?? 0;
    });
  }

  /** Distribuye automáticamente: Inbound = cupo IB (depts IB seleccionados) + cupo ISS (ISS si está seleccionado). Outbound = cupo OB + cupo TOM. */
  aplicarDistribucionAutoArea(areaKey, selectedDeptIds) {
    const porArea = this.getDepartamentosPorArea();
    if (areaKey === "IB") {
      this.aplicarDistribucionUnCupo("IB", "IB", selectedDeptIds, porArea);
      this.aplicarDistribucionUnCupo("IB", "ISS", selectedDeptIds, porArea);
    } else if (areaKey === "OB") {
      this.aplicarDistribucionUnCupo("OB", "OB", selectedDeptIds, porArea);
      this.aplicarDistribucionUnCupo("OB", "TOM", selectedDeptIds, porArea);
    }
    this.renderizarDashboard();
    this.actualizarResumenGlobal();
  }

  abrirModalDistribuirAuto(areaKey) {
    const modal = document.getElementById("rt-auto-distrib-modal");
    const titleEl = document.getElementById("rt-auto-distrib-title");
    const container = document.getElementById("rt-auto-distrib-checkboxes");
    if (!modal || !titleEl || !container) return;
    const label = areaKey === "IB" ? "Inbound" : "Outbound";
    titleEl.textContent = `Distribuir en ${label}`;
    const porArea = this.getDepartamentosPorArea();
    const presetByDept = areaKey === "IB" ? DISTRIBUCION_AUTO_IB : DISTRIBUCION_AUTO_OB;
    const depts = (porArea[areaKey] || []).filter((d) => !this.isNoCuentaHC(d) && presetByDept[d.id]);
    container.innerHTML = "";
    for (const dept of depts) {
      const labelEl = document.createElement("label");
      labelEl.className = "rt-auto-distrib-check";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = true;
      cb.setAttribute("data-dept-id", dept.id);
      labelEl.appendChild(cb);
      labelEl.appendChild(document.createTextNode(" " + dept.nombre));
      container.appendChild(labelEl);
    }
    this._autoDistribAreaKey = areaKey;
    modal.hidden = false;
  }

  aplicarDistribucionAutoDesdeModal() {
    const areaKey = this._autoDistribAreaKey;
    if (!areaKey) return;
    const container = document.getElementById("rt-auto-distrib-checkboxes");
    const selectedDeptIds = container
      ? Array.from(container.querySelectorAll("input[type=checkbox]:checked")).map((cb) => cb.getAttribute("data-dept-id"))
      : [];
    if (selectedDeptIds.length === 0) return;
    document.getElementById("rt-auto-distrib-modal").hidden = true;
    this.aplicarDistribucionAutoArea(areaKey, selectedDeptIds);
    this._autoDistribAreaKey = null;
  }

  /** Logins que están en loginsDisponibles pero no asignados a ningún puesto. */
  getUnassignedLogins() {
    const assigned = new Set();
    for (const arr of Object.values(this.asignacionesPorPuesto || {})) {
      for (const l of arr) assigned.add(l);
    }
    return (this.loginsDisponibles || []).filter((l) => !assigned.has(l));
  }

  /** Rellena la columna "Puestos con falta de gente" en el modal. */
  rellenarPuestosConFalta() {
    const cont = document.getElementById("rt-logins-sin-puesto-puestos");
    if (!cont) return;
    const puestosConFalta = this.getPuestosConFalta();
    cont.innerHTML = "";
    const conExceso = this.getPuestosConExceso();
    if (conExceso.length > 0) {
      const sub = document.createElement("p");
      sub.className = "rt-modal-col-subtitle";
      sub.textContent = "Con gente de más (usa Rebalancear):";
      cont.appendChild(sub);
      for (const { label, asignados, cupo, sobra } of conExceso) {
        const card = document.createElement("div");
        card.className = "rt-puesto-falta-card rt-puesto-exceso-card";
        card.innerHTML = `
          <span class="rt-puesto-falta-label">${escapeHtml(label)}</span>
          <span class="rt-puesto-falta-num">Sobran <strong>${sobra}</strong> (${asignados}/${cupo})</span>
        `;
        cont.appendChild(card);
      }
    }
    if (puestosConFalta.length === 0 && conExceso.length === 0) {
      const p = document.createElement("p");
      p.className = "rt-sin-falta-msg";
      p.textContent = "No hay puestos con falta de gente.";
      cont.appendChild(p);
      return;
    }
    if (puestosConFalta.length > 0) {
      const sub = document.createElement("p");
      sub.className = "rt-modal-col-subtitle";
      sub.textContent = "Faltan personas:";
      cont.appendChild(sub);
      for (const { id, label, cupo, asignados, faltan } of puestosConFalta) {
        const card = document.createElement("div");
        card.className = "rt-puesto-falta-card";
        card.innerHTML = `
          <span class="rt-puesto-falta-label">${escapeHtml(label)}</span>
          <span class="rt-puesto-falta-num">Faltan <strong>${faltan}</strong> (${asignados}/${cupo})</span>
        `;
        cont.appendChild(card);
      }
    }
  }

  /** Abre el modal: puestos con falta + personas sin asignar (con foto); dropdown solo donde falta. */
  abrirModalLoginsSinPuesto(unassigned) {
    const modal = document.getElementById("rt-logins-sin-puesto-modal");
    const listEl = document.getElementById("rt-logins-sin-puesto-list");
    if (!modal || !listEl) return;
    this.rellenarPuestosConFalta();
    const puestosConFalta = this.getPuestosConFalta();
    listEl.innerHTML = "";
    const photoUrl = (login) => this.getUserPhotoUrl(login);
    for (const login of unassigned) {
      const row = document.createElement("div");
      row.className = "rt-logins-sin-puesto-row";
      row.dataset.login = login;
      const photoWrap = document.createElement("div");
      photoWrap.className = "rt-login-photo-wrap";
      photoWrap.innerHTML = `
        <img src="${photoUrl(login)}" alt="" class="rt-login-photo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
        <span class="rt-login-photo-placeholder">${(login || "?").slice(0, 2).toUpperCase()}</span>
      `;
      const loginSpan = document.createElement("span");
      loginSpan.className = "rt-login-label";
      loginSpan.textContent = login;
      const sel = document.createElement("select");
      sel.className = "rt-select-puesto";
      sel.dataset.login = login;
      const optEmpty = document.createElement("option");
      optEmpty.value = "";
      optEmpty.textContent = "— Elegir puesto —";
      sel.appendChild(optEmpty);
      for (const { id, label } of puestosConFalta) {
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = `${label} (falta)`;
        sel.appendChild(opt);
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rt-btn rt-btn-sm";
      btn.textContent = "Añadir aquí";
      btn.addEventListener("click", () => {
        const puestoId = sel.value;
        if (!puestoId) return;
        this.asignarLoginManualAPuesto(login, puestoId);
        row.remove();
        this.rellenarPuestosConFalta();
        this.renderizarDashboard();
        if (listEl.children.length === 0 && typeof window.showToast === "function") {
          window.showToast("Todos asignados. Cierra el modal cuando termines.", "success");
        }
      });
      row.appendChild(photoWrap);
      row.appendChild(loginSpan);
      row.appendChild(sel);
      row.appendChild(btn);
      listEl.appendChild(row);
    }
    modal.hidden = false;
  }

  /** Refresca el contenido del modal (puestos con falta + lista de sin asignar) sin reabrir. */
  refrescarContenidoModalLoginsSinPuesto() {
    this.rellenarPuestosConFalta();
    const listEl = document.getElementById("rt-logins-sin-puesto-list");
    if (!listEl) return;
    const unassigned = this.getUnassignedLogins();
    if (unassigned.length === 0) {
      listEl.innerHTML = "<p class=\"rt-sin-falta-msg\">No quedan personas sin asignar.</p>";
      return;
    }
    const puestosConFalta = this.getPuestosConFalta();
    listEl.innerHTML = "";
    const photoUrl = (login) => this.getUserPhotoUrl(login);
    for (const login of unassigned) {
      const row = document.createElement("div");
      row.className = "rt-logins-sin-puesto-row";
      row.dataset.login = login;
      const photoWrap = document.createElement("div");
      photoWrap.className = "rt-login-photo-wrap";
      photoWrap.innerHTML = `
        <img src="${photoUrl(login)}" alt="" class="rt-login-photo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
        <span class="rt-login-photo-placeholder">${(login || "?").slice(0, 2).toUpperCase()}</span>
      `;
      const loginSpan = document.createElement("span");
      loginSpan.className = "rt-login-label";
      loginSpan.textContent = login;
      const sel = document.createElement("select");
      sel.className = "rt-select-puesto";
      const optEmpty = document.createElement("option");
      optEmpty.value = "";
      optEmpty.textContent = "— Elegir puesto —";
      sel.appendChild(optEmpty);
      for (const { id, label } of puestosConFalta) {
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = `${label} (falta)`;
        sel.appendChild(opt);
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rt-btn rt-btn-sm";
      btn.textContent = "Añadir aquí";
      btn.addEventListener("click", () => {
        const puestoId = sel.value;
        if (!puestoId) return;
        this.asignarLoginManualAPuesto(login, puestoId);
        this.refrescarContenidoModalLoginsSinPuesto();
        this.renderizarDashboard();
      });
      row.appendChild(photoWrap);
      row.appendChild(loginSpan);
      row.appendChild(sel);
      row.appendChild(btn);
      listEl.appendChild(row);
    }
  }

  /** Mueve gente de puestos con exceso a puestos con falta; prioriza quien tenga otra formación. */
  async rebalancearAsignaciones() {
    const overflow = [];
    const porArea = this.getDepartamentosPorArea();
    for (const areaKey of ["IB", "OB", "Support"]) {
      for (const dept of porArea[areaKey] || []) {
        if (this.isNoCuentaHC(dept)) continue;
        const puestos = dept.puestos || [];
        if (puestos.length === 0) {
          const puestoId = dept.id;
          const cupo = this.getCupoPuesto(puestoId);
          const arr = this.asignacionesPorPuesto[puestoId] || [];
          if (arr.length > cupo) {
            for (let i = cupo; i < arr.length; i++) overflow.push({ login: arr[i], desdePuestoId: puestoId });
          }
          continue;
        }
        for (const puesto of puestos) {
          const cupo = this.getCupoPuesto(puesto.id);
          const arr = this.asignacionesPorPuesto[puesto.id] || [];
          if (arr.length > cupo) {
            for (let i = cupo; i < arr.length; i++) overflow.push({ login: arr[i], desdePuestoId: puesto.id });
          }
        }
      }
    }
    if (overflow.length === 0) {
      if (typeof window.showToast === "function") window.showToast("No hay puestos con gente de más para rebalancear.", "info");
      return;
    }
    const skillsByLogin = (login) => this.getSkillsUsuario(login);
    for (const { login, desdePuestoId } of overflow) {
      const arrDesde = this.asignacionesPorPuesto[desdePuestoId] || [];
      const idx = arrDesde.indexOf(login);
      if (idx === -1) continue;
      arrDesde.splice(idx, 1);
      this.asignacionesPorPuesto[desdePuestoId] = arrDesde.length ? arrDesde : [];
      const puestosConFalta = this.getPuestosConFalta();
      if (puestosConFalta.length === 0) break;
      const skills = skillsByLogin(login);
      const conSkill = puestosConFalta.filter((p) => skills[p.id]);
      const target = conSkill.length > 0 ? conSkill[0] : puestosConFalta[0];
      if (!target) continue;
      const arrTo = this.asignacionesPorPuesto[target.id] || [];
      arrTo.push(login);
      this.asignacionesPorPuesto[target.id] = arrTo;
      if (!this.skillmatrixData) this.skillmatrixData = { usuarios: {} };
      if (!this.skillmatrixData.usuarios[login]) this.skillmatrixData.usuarios[login] = { puestos: {}, puestos_verificados: {} };
      if (this.puestoTieneFCInternal(target.id)) {
        this.skillmatrixData.usuarios[login].puestos_verificados[target.id] = true;
      } else {
        this.skillmatrixData.usuarios[login].puestos[target.id] = true;
      }
    }
    if (this.dataFlowBasePath && window.api?.saveJson) {
      try {
        await window.api.saveJson(this.dataFlowBasePath + SKILLMATRIX_FILENAME, this.skillmatrixData);
      } catch (e) {
        if (typeof window.showToast === "function") window.showToast("Error al guardar Skill Matrix: " + (e.message || String(e)), "error");
      }
    }
    if (typeof window.showToast === "function") window.showToast("Rebalanceo aplicado. Revisa puestos con falta y personas sin asignar.", "success");
  }

  /** Asigna un login a un puesto manualmente y lo marca en skillmatrix como sin verificar; guarda skillmatrix. */
  async asignarLoginManualAPuesto(login, puestoId) {
    const arr = this.asignacionesPorPuesto[puestoId] || [];
    if (!arr.includes(login)) {
      arr.push(login);
      this.asignacionesPorPuesto[puestoId] = arr;
    }
    if (!this.skillmatrixData) this.skillmatrixData = { usuarios: {} };
    if (!this.skillmatrixData.usuarios[login]) {
      this.skillmatrixData.usuarios[login] = { puestos: {}, puestos_verificados: {} };
    }
    if (this.puestoTieneFCInternal(puestoId)) {
      this.skillmatrixData.usuarios[login].puestos_verificados[puestoId] = true;
    } else {
      this.skillmatrixData.usuarios[login].puestos[puestoId] = true;
    }
    if (!this.dataFlowBasePath || !window.api?.saveJson) return;
    try {
      const path = this.dataFlowBasePath + SKILLMATRIX_FILENAME;
      await window.api.saveJson(path, this.skillmatrixData);
    } catch (e) {
      if (typeof window.showToast === "function") window.showToast("Error al guardar Skill Matrix: " + (e.message || String(e)), "error");
    }
  }

  syncStowTLAsistente(puestosContainer) {
    const tl = puestosContainer.querySelector('input[data-puesto-id="stow-tl"]');
    const ast = puestosContainer.querySelector('input[data-puesto-id="stow-tl-ast"]');
    if (tl && ast) {
      const v = parseInt(tl.value, 10);
      ast.value = isNaN(v) ? 0 : Math.max(0, v);
    }
  }

  actualizarModalResumen(dept, maxDept) {
    const puestosContainer = document.getElementById("rt-modal-puestos");
    const summarySpan = document.getElementById("rt-modal-summary");
    const deptHcLabel = document.getElementById("rt-modal-dept-hc-label");
    if (!puestosContainer || !summarySpan || !this.modalDeptId) return;

    let sum = 0;
    puestosContainer.querySelectorAll(".rt-modal-puesto-input").forEach((input) => {
      const v = parseInt(input.value, 10);
      if (!isNaN(v) && v > 0) sum += v;
    });
    summarySpan.textContent = sum;
    if (deptHcLabel) deptHcLabel.textContent = maxDept != null ? maxDept : "";
    summarySpan.parentElement.classList.toggle("rt-modal-summary-over", sum > (maxDept || 0));
  }

  abrirOverlayCSV(dept) {
    const overlay = document.getElementById("rt-csv-overlay");
    const title = document.getElementById("rt-csv-overlay-title");
    const desc = document.getElementById("rt-csv-overlay-desc");
    const fileInput = document.getElementById("rt-csv-file-input");
    if (!overlay || !title) return;
    if (dept.id === "learning") {
      title.textContent = "Learning – Subir CSV";
      if (desc) desc.textContent = "Sube un CSV con avisos (logins y horarios). El sistema generará la info para avisar a esos logins que tienen que ir a learning de X hora a Y hora. No cuenta como HC.";
    } else if (dept.id === "enfermeria") {
      title.textContent = "Enfermería – Reconocimientos médicos";
      if (desc) desc.textContent = "Sube un CSV con los reconocimientos médicos. No cuenta como HC.";
    } else {
      title.textContent = dept.nombre + " – Subir CSV";
      if (desc) desc.textContent = dept.descripcion || "Subir archivo CSV.";
    }
    if (fileInput) fileInput.value = "";
    overlay.hidden = false;
    this._csvOverlayDeptId = dept.id;
  }

  cerrarModal() {
    const modal = document.getElementById("rt-modal");
    const puestosContainer = document.getElementById("rt-modal-puestos");
    if (puestosContainer) {
      this.syncStowTLAsistente(puestosContainer);
      puestosContainer.querySelectorAll(".rt-modal-puesto-input").forEach((input) => {
        const id = input.getAttribute("data-puesto-id");
        const v = parseInt(input.value, 10);
        if (id) this.puestoHC[id] = isNaN(v) ? 0 : Math.max(0, v);
      });
      Object.entries(PUESTO_ESPEJO).forEach(([astId, tlId]) => {
        this.puestoHC[astId] = this.puestoHC[tlId] ?? 0;
      });
    }
    this.modalDeptId = null;
    if (modal) modal.hidden = true;
    this.renderizarDashboard();
    this.actualizarResumenGlobal();
  }

  guardarModal() {
    this.cerrarModal();
  }

  mostrarErrorDashboard(mensaje) {
    const content = document.getElementById("rt-dashboard-content");
    const loading = document.getElementById("rt-dashboard-loading");
    if (loading) loading.remove();
    if (content) {
      const el = document.createElement("div");
      el.className = "rt-dashboard-error";
      el.textContent = mensaje;
      content.appendChild(el);
    }
  }

  configurarEventos() {
    document.getElementById("rt-modal-close")?.addEventListener("click", () => this.cerrarModal());
    document.getElementById("rt-modal-guardar")?.addEventListener("click", () => this.guardarModal());
    document.querySelector(".rt-modal-backdrop")?.addEventListener("click", () => this.cerrarModal());

    ["rt-input-ib", "rt-input-iss", "rt-input-ob", "rt-input-tom", "rt-input-support"].forEach((id) => {
      const input = document.getElementById(id);
      const area = input?.getAttribute("data-area");
      if (input && area) {
        input.value = this.areaHC[area] || 0;
        input.addEventListener("input", () => {
          const v = parseInt(input.value, 10);
          this.areaHC[area] = isNaN(v) ? 0 : Math.max(0, v);
          this.actualizarResumenGlobal();
          this.renderizarDashboard();
        });
      }
    });

    // Al enfocar un input numérico, seleccionar todo para que al escribir se reemplace el 0 (no quede 01 o 10)
    const container = document.querySelector(".rotation-tool-container");
    if (container) {
      container.addEventListener("focusin", (e) => {
        if (e.target.matches("input[type=\"number\"]")) {
          e.target.select();
        }
      });
    }

    document.getElementById("rt-logins-cancel")?.addEventListener("click", () => {
      document.getElementById("rt-logins-overlay").hidden = true;
    });
    const autoDistribModal = document.getElementById("rt-auto-distrib-modal");
    document.getElementById("rt-auto-distrib-cancel")?.addEventListener("click", () => {
      if (autoDistribModal) autoDistribModal.hidden = true;
    });
    document.getElementById("rt-auto-distrib-apply")?.addEventListener("click", () => this.aplicarDistribucionAutoDesdeModal());
    autoDistribModal?.querySelector(".rt-overlay-backdrop")?.addEventListener("click", () => {
      autoDistribModal.hidden = true;
    });
    document.getElementById("rt-logins-apply")?.addEventListener("click", () => {
      const ta = document.getElementById("rt-logins-textarea");
      const raw = (ta?.value || "").trim().split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
      const { unique, duplicatedCount, duplicatedLogins } = this.detectarDuplicadosLogins(raw);
      this.totalHC = unique.length;
      this.loginsDisponibles = [...unique];
      this.pizarraGenerada = false;
      this.asignacionesPorPuesto = {};
      this.duplicadosEliminados = duplicatedCount;
      this.actualizarResumenGlobal();
      if (duplicatedCount > 0) {
        const avisoOverlay = document.getElementById("rt-logins-duplicados-aviso");
        if (avisoOverlay) {
          avisoOverlay.hidden = false;
          const list = duplicatedLogins.slice(0, 12).map(({ login, count }) => `${login} (×${count})`).join(", ");
          const rest = duplicatedLogins.length > 12 ? ` … y ${duplicatedLogins.length - 12} más` : "";
          avisoOverlay.innerHTML = `<p class="rt-duplicados-msg"><strong>${duplicatedCount} duplicados detectados.</strong> HC = ${unique.length} únicos.</p><p class="rt-duplicados-list">${escapeHtml(list + rest)}</p>`;
        }
        if (typeof window.showToast === "function") {
          window.showToast(`Se eliminaron ${duplicatedCount} logins duplicados. HC = ${unique.length} únicos.`, "warning");
        }
      } else {
        const avisoOverlay = document.getElementById("rt-logins-duplicados-aviso");
        if (avisoOverlay) {
          avisoOverlay.hidden = true;
          avisoOverlay.innerHTML = "";
        }
      }
      document.getElementById("rt-logins-overlay").hidden = true;
    });
    document.querySelector("#rt-logins-overlay .rt-overlay-backdrop")?.addEventListener("click", () => {
      document.getElementById("rt-logins-overlay").hidden = true;
    });

    const loginsSinPuestoModal = document.getElementById("rt-logins-sin-puesto-modal");
    document.getElementById("rt-logins-sin-puesto-cerrar")?.addEventListener("click", () => {
      if (loginsSinPuestoModal) loginsSinPuestoModal.hidden = true;
    });
    loginsSinPuestoModal?.querySelector(".rt-overlay-backdrop")?.addEventListener("click", () => {
      if (loginsSinPuestoModal) loginsSinPuestoModal.hidden = true;
    });
    document.getElementById("rt-logins-sin-puesto-rebalancear")?.addEventListener("click", async () => {
      await this.rebalancearAsignaciones();
      this.refrescarContenidoModalLoginsSinPuesto();
      this.renderizarDashboard();
    });

    document.getElementById("btn-attendance")?.addEventListener("click", () => {
      document.getElementById("rt-logins-overlay").hidden = false;
      document.getElementById("rt-logins-textarea").value = "";
      const aviso = document.getElementById("rt-logins-duplicados-aviso");
      if (aviso) {
        aviso.hidden = true;
        aviso.innerHTML = "";
      }
      document.getElementById("rt-logins-textarea").focus();
    });

    document.getElementById("rt-csv-overlay-close")?.addEventListener("click", () => {
      document.getElementById("rt-csv-overlay").hidden = true;
      this._csvOverlayDeptId = null;
    });
    document.querySelector("#rt-csv-overlay .rt-overlay-backdrop")?.addEventListener("click", () => {
      document.getElementById("rt-csv-overlay").hidden = true;
      this._csvOverlayDeptId = null;
    });
    document.getElementById("rt-csv-apply")?.addEventListener("click", () => {
      const input = document.getElementById("rt-csv-file-input");
      if (input?.files?.length) {
        if (typeof window.showToast === "function") window.showToast("CSV cargado (procesamiento próximamente)", "info");
        else console.log("CSV:", input.files[0].name, "– procesamiento próximamente");
      }
      document.getElementById("rt-csv-overlay").hidden = true;
      this._csvOverlayDeptId = null;
    });

    document.getElementById("btn-generar-pizarra")?.addEventListener("click", () => {
      const btn = document.getElementById("btn-generar-pizarra");
      const aviso = document.getElementById("rt-generar-aviso");
      if (btn?.disabled && aviso) {
        this.sincronizarHCDesdeDOM();
        const totalArea = AREA_ORDER.reduce((acc, a) => acc + (this.areaHC[a] || 0), 0);
        const asignado = AREA_ORDER.reduce((acc, a) => acc + this.getAreaAssignedHC(a), 0);
        if (this.totalHC === 0) {
          aviso.textContent = "Primero carga logins (Attendance → Pegar logins y Aplicar).";
        } else if (totalArea !== this.totalHC) {
          aviso.textContent = `Reparte por área: IB+ISS+OB+TOM+Support (${totalArea}) debe ser igual al HC (${this.totalHC}).`;
        } else if (asignado !== this.totalHC) {
          aviso.textContent = `Faltan ${this.totalHC - asignado} por repartir: usa "Distribuir automáticamente" en Inbound y Outbound, y haz clic en cada departamento de Support.`;
        } else {
          aviso.textContent = "";
        }
        aviso.hidden = !aviso.textContent;
        aviso.classList.add("rt-generar-aviso-visible");
        return;
      }
      if (aviso) {
        aviso.hidden = true;
        aviso.textContent = "";
      }
      this.generarPizarra();
    });
    document.getElementById("btn-descargar-json-propuesta")?.addEventListener("click", () => this.descargarPizarraPropuesta());
    document.getElementById("btn-enviar-pizarra")?.addEventListener("click", () => this.enviarPizarra());

    ["btn-freeze", "btn-bloqueados"].forEach((id) => {
      document.getElementById(id)?.addEventListener("click", () => {
        if (typeof window.showToast === "function") window.showToast("Próximamente", "info");
        else console.log(id, "– próximamente");
      });
    });
  }

  /** Lee desde el DOM los HC de área (por si no se disparó input) y los inputs de puestos en los paneles. */
  sincronizarHCDesdeDOM() {
    ["rt-input-ib", "rt-input-iss", "rt-input-ob", "rt-input-tom", "rt-input-support"].forEach((id) => {
      const input = document.getElementById(id);
      const area = input?.getAttribute("data-area");
      if (input && area) {
        const v = parseInt(input.value, 10);
        this.areaHC[area] = isNaN(v) ? 0 : Math.max(0, v);
      }
    });
    document.querySelectorAll(".rt-modal-puestos").forEach((container) => {
      this.syncStowTLAsistente(container);
      container.querySelectorAll(".rt-modal-puesto-input").forEach((input) => {
        const id = input.getAttribute("data-puesto-id");
        const v = parseInt(input.value, 10);
        if (id) this.puestoHC[id] = isNaN(v) ? 0 : Math.max(0, v);
      });
    });
    Object.entries(PUESTO_ESPEJO).forEach(([astId, tlId]) => {
      this.puestoHC[astId] = this.puestoHC[tlId] ?? 0;
    });
    document.querySelectorAll("input[data-dept-id][id^='rt-dept-hc-']").forEach((input) => {
      const deptId = input.getAttribute("data-dept-id");
      const v = parseInt(input.value, 10);
      if (deptId) this.departmentHC[deptId] = isNaN(v) ? 0 : Math.max(0, v);
    });
  }

  generarPizarra() {
    const toast = (msg, type) => {
      if (typeof window.showToast === "function") window.showToast(msg, type || "info");
      else console.warn(msg);
    };
    if (this.totalHC === 0) {
      toast("Carga logins primero (Attendance / Pegar logins) para generar la pizarra.", "warning");
      return;
    }
    this.sincronizarHCDesdeDOM();
    const totalArea = AREA_ORDER.reduce((acc, a) => acc + (this.areaHC[a] || 0), 0);
    const asignado = AREA_ORDER.reduce((acc, a) => acc + this.getAreaAssignedHC(a), 0);
    if (totalArea !== this.totalHC) {
      toast(`El cupo por área (IB+ISS+OB+TOM+Support = ${totalArea}) debe coincidir con el HC total (${this.totalHC}). Ajusta los números en "Repartir por área".`, "warning");
      return;
    }
    if (asignado !== this.totalHC) {
      const faltan = this.totalHC - asignado;
      toast(
        `Faltan ${faltan} personas por repartir en puestos. Usa "Distribuir automáticamente" en Inbound y Outbound, y haz clic en cada departamento de Support para asignar personas hasta completar ${this.totalHC}.`,
        "warning"
      );
      return;
    }
    const porArea = this.getDepartamentosPorArea();
    const tieneDepts = (porArea.IB?.length || 0) + (porArea.OB?.length || 0) + (porArea.Support?.length || 0) > 0;
    if (!tieneDepts) {
      toast("No hay departamentos cargados. Comprueba que puestos.json esté en la ruta de Data_Flow.", "warning");
      return;
    }
    const logins = [...(this.loginsDisponibles || [])];
    if (logins.length < this.totalHC) {
      while (logins.length < this.totalHC) logins.push(`login-${logins.length + 1}`);
    }
    this.asignacionesPorPuesto = {};
    const useSkillFilter = !!this.skillmatrixData?.usuarios;

    if (useSkillFilter) {
      const pool = [...logins];
      for (const areaKey of ["IB", "OB", "Support"]) {
        const depts = porArea[areaKey] || [];
        for (const dept of depts) {
          if (this.isNoCuentaHC(dept)) continue;
          const puestos = dept.puestos || [];
          if (puestos.length === 0) {
            const n = this.departmentHC[dept.id] ?? 0;
            if (n <= 0) continue;
            const puestoId = dept.id;
            const conSkill = this.getLoginsConSkillPuesto(puestoId);
            const candidates = pool.filter((l) => conSkill.has(l));
            const take = Math.min(n, candidates.length);
            const assigned = candidates.slice(0, take);
            for (const l of assigned) pool.splice(pool.indexOf(l), 1);
            if (take > 0) this.asignacionesPorPuesto[puestoId] = assigned;
            continue;
          }
          for (const puesto of puestos) {
            const n = this.puestoHC[puesto.id] || 0;
            if (n <= 0) continue;
            const conSkill = this.getLoginsConSkillPuesto(puesto.id);
            const candidates = pool.filter((l) => conSkill.has(l));
            const take = Math.min(n, candidates.length);
            const assigned = candidates.slice(0, take);
            for (const l of assigned) pool.splice(pool.indexOf(l), 1);
            if (take > 0) this.asignacionesPorPuesto[puesto.id] = assigned;
          }
        }
      }
      const unassigned = pool;
      if (unassigned.length > 0) {
        this.abrirModalLoginsSinPuesto(unassigned);
      }
    } else {
      for (const areaKey of ["IB", "OB", "Support"]) {
        const depts = porArea[areaKey] || [];
        for (const dept of depts) {
          if (this.isNoCuentaHC(dept)) continue;
          const puestos = dept.puestos || [];
          if (puestos.length === 0) {
            const n = this.departmentHC[dept.id] ?? 0;
            if (n > 0) this.asignacionesPorPuesto[dept.id] = logins.splice(0, n);
            continue;
          }
          for (const puesto of puestos) {
            const n = this.puestoHC[puesto.id] || 0;
            if (n <= 0) continue;
            this.asignacionesPorPuesto[puesto.id] = logins.splice(0, n);
          }
        }
      }
    }

    this.pizarraGenerada = true;
    this.ultimaPizarraPropuesta = this.buildPizarraPropuestaJSON();
    this.actualizarBotonesPizarra();
    this.renderizarDashboard();
    toast("Pizarra generada. Haz clic en cada departamento para ver asignaciones.", "success");
  }

  /** Construye el JSON de la pizarra propuesta (para descargar y para comparar con la final). Enfocado en HC por puesto/depto. */
  buildPizarraPropuestaJSON() {
    const distribucion = {};
    const porArea = this.getDepartamentosPorArea();
    for (const areaKey of ["IB", "OB", "Support"]) {
      const depts = porArea[areaKey] || [];
      for (const dept of depts) {
        if (this.isNoCuentaHC(dept)) continue;
        const puestos = dept.puestos || [];
        if (puestos.length === 0) {
          const n = this.departmentHC[dept.id] ?? 0;
          if (n > 0) distribucion[dept.id] = n;
        } else {
          for (const puesto of puestos) {
            const n = this.puestoHC[puesto.id] || 0;
            if (n > 0) distribucion[puesto.id] = n;
          }
        }
      }
    }
    return {
      tipo: "pizarra_propuesta",
      version: "1.0",
      fecha: new Date().toISOString().slice(0, 10),
      fechaHora: new Date().toISOString(),
      cupos: { IB: this.areaHC.IB || 0, ISS: this.areaHC.ISS || 0, OB: this.areaHC.OB || 0, TOM: this.areaHC.TOM || 0, Support: this.areaHC.Support || 0 },
      totalHC: this.totalHC,
      distribucion,
      asignaciones: this.pizarraGenerada ? this.asignacionesPorPuesto : undefined,
    };
  }

  descargarPizarraPropuesta() {
    if (!this.ultimaPizarraPropuesta) {
      if (typeof window.showToast === "function") window.showToast("Genera primero la pizarra para descargar el JSON.", "warning");
      return;
    }
    const blob = new Blob([JSON.stringify(this.ultimaPizarraPropuesta, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pizarra_propuesta_${this.ultimaPizarraPropuesta.fecha}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    if (typeof window.showToast === "function") window.showToast("JSON descargado. Úsalo para comparar con la pizarra final.", "success");
  }

  /** Compara propuesta con pizarra final. Devuelve { diferencias, resumen } y opcionalmente guarda en historial. */
  compararConPizarraFinal(jsonFinal, guardarEnHistorial = false) {
    const prop = this.ultimaPizarraPropuesta;
    if (!prop || !prop.distribucion) {
      return { error: "No hay pizarra propuesta. Genera la pizarra primero." };
    }
    let final = jsonFinal;
    if (typeof final === "string") {
      try {
        final = JSON.parse(final);
      } catch (e) {
        return { error: "JSON de pizarra final inválido." };
      }
    }
    const distFinal = final.distribucion || final;
    const todosIds = new Set([...Object.keys(prop.distribucion), ...Object.keys(distFinal)]);
    const diferencias = {};
    let totalProp = 0;
    let totalFinal = 0;
    for (const id of todosIds) {
      const p = prop.distribucion[id] || 0;
      const f = distFinal[id] || 0;
      totalProp += p;
      totalFinal += f;
      const d = f - p;
      if (d !== 0) diferencias[id] = { propuesta: p, final: f, diff: d };
    }
    const resultado = {
      fechaPropuesta: prop.fecha,
      fechaFinal: final.fecha || final.fechaHora || null,
      cupos: prop.cupos,
      propuesta: prop.distribucion,
      final: distFinal,
      diferencias,
      resumen: { totalPropuesta: totalProp, totalFinal: totalFinal, desbalance: totalFinal - totalProp },
    };
    if (guardarEnHistorial) {
      const historial = this.getHistorialAprendizaje();
      historial.push({ fecha: new Date().toISOString(), ...resultado });
      try {
        localStorage.setItem(RotationToolController.STORAGE_APRENDIZAJE, JSON.stringify(historial));
      } catch (e) {
        console.warn("No se pudo guardar historial:", e);
      }
    }
    return resultado;
  }

  getHistorialAprendizaje() {
    try {
      const raw = localStorage.getItem(RotationToolController.STORAGE_APRENDIZAJE);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  /** Dataset para ML/aprendizaje: contexto (cupos) + cómo se distribuyó en la propuesta vs cómo quedó al final. Enfocado en HC, no en personas. */
  getDatasetAprendizajeJSON() {
    const historial = this.getHistorialAprendizaje();
    const dataset = historial.map((h) => ({
      contexto: h.cupos,
      totalHC: (h.cupos && AREA_ORDER.reduce((acc, k) => acc + (h.cupos[k] || 0), 0)) || null,
      propuesta: h.propuesta || {},
      final: h.final || {},
      desbalance_total: h.resumen ? h.resumen.desbalance : null,
    }));
    return { tipo: "dataset_aprendizaje", version: "1.0", registros: dataset };
  }

  exportarDatasetAprendizaje() {
    const json = this.getDatasetAprendizajeJSON();
    if (json.registros.length === 0) {
      if (typeof window.showToast === "function") window.showToast("No hay comparaciones guardadas. Compara una pizarra final y guarda para ir generando el dataset.", "warning");
      return;
    }
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rt_dataset_aprendizaje_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    if (typeof window.showToast === "function") window.showToast(`Dataset exportado (${json.registros.length} comparaciones).`, "success");
  }

  ejecutarComparacionPizarra(guardarEnHistorial) {
    const textarea = document.getElementById("rt-pizarra-final-json");
    const resultadoEl = document.getElementById("rt-aprendizaje-resultado");
    const raw = (textarea?.value || "").trim();
    if (!raw) {
      if (typeof window.showToast === "function") window.showToast("Pega el JSON de la pizarra final en el cuadro de texto.", "warning");
      return;
    }
    const r = this.compararConPizarraFinal(raw, guardarEnHistorial);
    if (r.error) {
      if (typeof window.showToast === "function") window.showToast(r.error, "warning");
      if (resultadoEl) {
        resultadoEl.hidden = false;
        resultadoEl.innerHTML = `<p class="rt-aprendizaje-error">${escapeHtml(r.error)}</p>`;
      }
      return;
    }
    const diffs = Object.entries(r.diferencias || {}).filter(([, v]) => v.diff !== 0);
    let html = `<p><strong>Resumen:</strong> Propuesta ${r.resumen.totalPropuesta} HC → Final ${r.resumen.totalFinal} HC. Desbalance: ${r.resumen.desbalance}</p>`;
    if (diffs.length > 0) {
      html += "<p><strong>Diferencias por puesto/depto:</strong></p><ul class=\"rt-aprendizaje-lista-diff\">";
      diffs.slice(0, 30).forEach(([id, v]) => {
        html += `<li><code>${escapeHtml(id)}</code>: propuesta ${v.propuesta} → final ${v.final} (${v.diff > 0 ? "+" : ""}${v.diff})</li>`;
      });
      if (diffs.length > 30) html += `<li>… y ${diffs.length - 30} más</li>`;
      html += "</ul>";
    } else {
      html += "<p>No hay diferencias por puesto (misma distribución).</p>";
    }
    if (guardarEnHistorial) {
      const n = this.getHistorialAprendizaje().length;
      html += `<p class="rt-aprendizaje-guardado">Guardado para aprendizaje. Total comparaciones: ${n}. Exporta el dataset cuando quieras usarlo fuera.</p>`;
      if (typeof window.showToast === "function") window.showToast("Comparación guardada para el dataset de aprendizaje.", "success");
    }
    if (resultadoEl) {
      resultadoEl.hidden = false;
      resultadoEl.innerHTML = html;
    }
  }

  enviarPizarra() {
    if (!this.pizarraGenerada) return;
    if (typeof window.showToast === "function") window.showToast("Enviar pizarra: integración próximamente", "info");
    else console.log("Enviar pizarra – próximamente");
  }
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function initRotationTool() {
  if (window.rotationToolController) {
    if (typeof window.rotationToolController.destroy === "function") {
      window.rotationToolController.destroy();
    }
    window.rotationToolController = null;
  }
  window.rotationToolController = new RotationToolController();
}

// SPA: inicializar solo con app:ready (primera carga y al volver); así el DOM ya está inyectado.
window.addEventListener("app:ready", (e) => {
  if (e.detail && e.detail.app === "rotation-tool") {
    initRotationTool();
  }
});
