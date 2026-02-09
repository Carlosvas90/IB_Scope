/**
 * Rotation Tool - Dashboard por áreas, HC por departamento, modal de puestos
 */

const PUESTOS_JSON_PATH = "src/renderer/apps/utilidades/Rotation Tool/data/puestos.json";

const AREA_LABELS = {
  IB: "Inbound",
  OB: "Outbound",
  Support: "Support",
  ICQA: "Support",
};

const AREA_ORDER = ["IB", "OB", "Support"];

/** Orden fijo de departamentos en IB (ISS está en Support) */
const ORDER_IB = ["dock", "receive", "stow", "pout", "grading"];

/** Stow Team Lift Assistant sigue automáticamente a Stow Team Lift (1:1) */
const PUESTO_ESPEJO = { "stow-tl-ast": "stow-tl" };

/** Orden y etiquetas para agrupar puestos por tipo_tarea */
const TIPO_ORDER = ["directa", "indirecta", "pesado", "critical_rol"];
const TIPO_LABELS = {
  directa: "Directos",
  indirecta: "Indirectos",
  pesado: "Pesados",
  critical_rol: "Critical rol",
};

/** Distribución automática por departamento (preset). Se escala al cupo disponible si es menor. */
const DISTRIBUCION_AUTO = {
  stow: {
    "stow-pt": 15,
    "stow-cart": 2,
    "stow-walkie": 2,
    "stow-hr-pitc": 3,
    "stow-pitb": 3,
    "stow-tl": 2,
    "stow-tl-ast": 2,
    "stow-hr-pita": 1,
  },
};

class RotationToolController {
  constructor() {
    this.puestosData = null;
    this.totalHC = 0;
    this.areaHC = { IB: 0, OB: 0, Support: 0 };
    this.puestoHC = {}; // { puestoId: number }
    this.departmentHC = {}; // solo para departamentos sin puestos (ej. 5s)
    this.modalDeptId = null;
    this.selectedDeptByArea = { IB: null, OB: null, Support: null };
    this._csvOverlayDeptId = null;
    this.pizarraGenerada = false;
    this.asignacionesPorPuesto = {}; // { puestoId: [login1, login2, ...] } después de generar
    this.loginsDisponibles = []; // listado de logins cargados (para generar pizarra)
    this.duplicadosEliminados = 0; // cuántos duplicados se eliminaron en la última carga
    this.init();
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

  async cargarPuestos() {
    const scriptBase =
      typeof import.meta !== "undefined" && import.meta.url
        ? import.meta.url
        : (document.currentScript && document.currentScript.src) || window.location.href;
    let loaded = false;

    try {
      const dataUrl = new URL("../data/puestos.json", scriptBase).href;
      const res = await fetch(dataUrl);
      if (res.ok) {
        this.puestosData = await res.json();
        loaded = true;
      }
    } catch (_) {}

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
        const result = await window.api.readFile(PUESTOS_JSON_PATH);
        if (result?.success && result.content) {
          this.puestosData = JSON.parse(result.content);
          loaded = true;
        }
      } catch (_) {}
    }

    if (!loaded) {
      document.getElementById("rt-dashboard-loading").textContent =
        "No se pudo cargar puestos.json.";
      return;
    }

    document.getElementById("rt-dashboard-loading").remove();
    this.renderizarDashboard();
  }

  /** Área de visualización (ISS en Support) */
  getDisplayArea(dept) {
    return dept.id === "ISS" ? "Support" : (dept.area === "ICQA" ? "Support" : dept.area);
  }

  /** Área de la que sale el cupo HC (ISS usa Support, no IB) */
  getAreaForHC(dept) {
    return dept.id === "ISS" ? "Support" : (dept.area === "ICQA" ? "Support" : dept.area);
  }

  getDepartamentosPorArea() {
    if (!this.puestosData?.departamentos) return {};
    const porArea = {};
    for (const d of this.puestosData.departamentos) {
      const area = this.getDisplayArea(d);
      if (!porArea[area]) porArea[area] = [];
      porArea[area].push(d);
    }
    for (const area of Object.keys(porArea)) {
      if (area === "IB") {
        porArea[area].sort((a, b) => {
          const i = ORDER_IB.indexOf(a.id);
          const j = ORDER_IB.indexOf(b.id);
          if (i !== -1 && j !== -1) return i - j;
          if (i !== -1) return -1;
          if (j !== -1) return 1;
          return a.nombre.localeCompare(b.nombre);
        });
      } else {
        porArea[area].sort((a, b) => a.nombre.localeCompare(b.nombre));
      }
    }
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

  /** Suma de HC asignados en un área por cupo (ISS cuenta en Support, no en IB) */
  getAreaAssignedHC(areaKey) {
    const depts = this.puestosData?.departamentos || [];
    return depts
      .filter((d) => !this.isNoCuentaHC(d) && this.getAreaForHC(d) === areaKey)
      .reduce((sum, d) => sum + this.getDepartmentHC(d), 0);
  }

  /** Máximo asignable a un departamento según su área de cupo (ISS = Support) */
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
    const order = AREA_ORDER.filter((a) => porArea[a]?.length);

    for (const areaKey of order) {
      const depts = porArea[areaKey] || [];
      const label = AREA_LABELS[areaKey] || areaKey;

      const section = document.createElement("div");
      section.className = "rt-area";
      section.setAttribute("data-area", areaKey);
      if (areaKey === "Support") section.style.gridColumn = "1 / -1";

      const cupoArea = this.areaHC[areaKey] || 0;
      const asignadoEnArea = this.getAreaAssignedHC(areaKey);
      const quedan = Math.max(0, cupoArea - asignadoEnArea);

      const header = document.createElement("div");
      header.className = "rt-area-header";
      header.innerHTML = `
        <span class="rt-area-header-label">${label}</span>
        <span class="rt-area-header-hc">${asignadoEnArea} de ${cupoArea}</span>
      `;
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
        const card = document.createElement("div");
        card.className = "rt-dept-card" + (noHC ? " rt-dept-card-no-hc" : "") + (selected ? " rt-dept-card-selected" : "");
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
    const totalArea = this.areaHC.IB + this.areaHC.OB + this.areaHC.Support;
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
    const totalArea = this.areaHC.IB + this.areaHC.OB + this.areaHC.Support;
    const asignado = AREA_ORDER.reduce((acc, a) => acc + this.getAreaAssignedHC(a), 0);
    const generar = document.getElementById("btn-generar-pizarra");
    const enviar = document.getElementById("btn-enviar-pizarra");
    const puedeGenerar = this.totalHC > 0 && totalArea === this.totalHC && asignado === this.totalHC;
    if (generar) {
      generar.disabled = !puedeGenerar;
    }
    if (enviar) {
      enviar.disabled = !this.pizarraGenerada;
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
    const title = document.createElement("div");
    title.className = "rt-panel-title";
    title.textContent = `${dept.nombre} — máx. ${maxDept}`;
    panel.appendChild(title);
    const summary = document.createElement("p");
    summary.className = "rt-panel-summary";
    panel.appendChild(summary);
    const onUpdate = () => {
      const sum = this.getDepartmentHC(dept);
      summary.textContent = `${sum} de ${maxDept} asignados`;
      summary.classList.toggle("rt-modal-summary-over", sum > maxDept);
      this.actualizarCardHC(areaKey, dept.id, sum);
      this.actualizarResumenGlobal();
    };
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
      panel.appendChild(wrap);
      onUpdate();
      return;
    }
    const autoBtnWrap = document.createElement("div");
    autoBtnWrap.className = "rt-modal-puestos-actions";
    const preset = DISTRIBUCION_AUTO[dept.id];
    if (preset) {
      const autoBtn = document.createElement("button");
      autoBtn.type = "button";
      autoBtn.className = "rt-btn rt-btn-sm";
      autoBtn.textContent = "Distribuir automáticamente";
      autoBtn.addEventListener("click", () => {
        this.aplicarDistribucionAuto(dept, puestosContainer, maxDept);
        onUpdate();
      });
      autoBtnWrap.appendChild(autoBtn);
    }
    panel.appendChild(autoBtnWrap);
    const puestosContainer = document.createElement("div");
    puestosContainer.className = "rt-modal-puestos";
    panel.appendChild(puestosContainer);
    const porTipo = this.agruparPuestosPorTipo(puestos);
    for (const tipoKey of TIPO_ORDER) {
      const puestosList = porTipo[tipoKey] || [];
      if (puestosList.length === 0) continue;
      const section = document.createElement("div");
      section.className = "rt-modal-tipo-section";
      const tipoTitle = document.createElement("div");
      tipoTitle.className = "rt-modal-tipo-title";
      tipoTitle.textContent = TIPO_LABELS[tipoKey] || tipoKey;
      section.appendChild(tipoTitle);
      const grid = document.createElement("div");
      grid.className = "rt-modal-puestos-grid";
      for (const puesto of puestosList) {
        const espejoDe = PUESTO_ESPEJO[puesto.id];
        const val = espejoDe ? (this.puestoHC[espejoDe] ?? 0) : (this.puestoHC[puesto.id] ?? 0);
        const readonly = !!espejoDe;
        const row = document.createElement("div");
        row.className = "rt-modal-puesto-row" + (readonly ? " rt-modal-puesto-row-readonly" : "");
        row.innerHTML = `
          <label for="rt-puesto-${escapeHtml(puesto.id)}" class="rt-modal-puesto-label">${escapeHtml(puesto.nombre)}</label>
          <input type="number" id="rt-puesto-${escapeHtml(puesto.id)}" class="rt-input-num rt-modal-puesto-input" data-puesto-id="${escapeHtml(puesto.id)}" data-espejo-de="${espejoDe || ""}" min="0" value="${val}" ${readonly ? "readonly" : ""} />
        `;
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
    for (const p of puestos) {
      const t = ((p.tipo_tarea || "directa") + "").toLowerCase().replace(/\s+/g, "_");
      const norm = t.includes("critical") ? "critical_rol" : t.includes("indirect") ? "indirecta" : t.includes("pesado") ? "pesado" : "directa";
      if (!out[norm]) out[norm] = [];
      out[norm].push(p);
    }
    return out;
  }

  aplicarDistribucionAuto(dept, puestosContainer, maxDept) {
    const preset = DISTRIBUCION_AUTO[dept.id];
    if (!preset || !puestosContainer || maxDept <= 0) return;
    const totalPreset = Object.values(preset).reduce((a, b) => a + b, 0);
    if (totalPreset <= 0) return;
    const scale = totalPreset > maxDept ? maxDept / totalPreset : 1;
    const values = {};
    let sum = 0;
    for (const [id, v] of Object.entries(preset)) {
      if (PUESTO_ESPEJO[id]) continue;
      const scaled = scale < 1 ? Math.round(v * scale) : v;
      values[id] = scaled;
      sum += scaled;
    }
    Object.entries(PUESTO_ESPEJO).forEach(([astId, tlId]) => {
      values[astId] = values[tlId] ?? 0;
      sum += values[astId];
    });
    let diff = maxDept - sum;
    if (diff !== 0 && scale < 1) {
      const mainId = Object.entries(preset).filter(([id]) => !PUESTO_ESPEJO[id]).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (mainId) values[mainId] = Math.max(0, (values[mainId] || 0) + diff);
    }
    puestosContainer.querySelectorAll(".rt-modal-puesto-input").forEach((input) => {
      const id = input.getAttribute("data-puesto-id");
      input.value = values[id] != null ? values[id] : 0;
    });
    this.syncStowTLAsistente(puestosContainer);
    this.actualizarModalResumen(dept, maxDept);
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

    ["rt-input-ib", "rt-input-ob", "rt-input-support"].forEach((id) => {
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

    document.getElementById("btn-pegar-logins")?.addEventListener("click", () => {
      document.getElementById("rt-logins-overlay").hidden = false;
      document.getElementById("rt-logins-textarea").value = "";
      const aviso = document.getElementById("rt-logins-duplicados-aviso");
      if (aviso) {
        aviso.hidden = true;
        aviso.innerHTML = "";
      }
      document.getElementById("rt-logins-textarea").focus();
    });
    document.getElementById("rt-logins-cancel")?.addEventListener("click", () => {
      document.getElementById("rt-logins-overlay").hidden = true;
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

    document.getElementById("btn-attendance")?.addEventListener("click", () => {
      document.getElementById("rt-logins-overlay").hidden = false;
      document.getElementById("rt-logins-textarea").value = "";
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

    document.getElementById("btn-generar-pizarra")?.addEventListener("click", () => this.generarPizarra());
    document.getElementById("btn-enviar-pizarra")?.addEventListener("click", () => this.enviarPizarra());

    ["btn-freeze", "btn-bloqueados"].forEach((id) => {
      document.getElementById(id)?.addEventListener("click", () => {
        if (typeof window.showToast === "function") window.showToast("Próximamente", "info");
        else console.log(id, "– próximamente");
      });
    });
  }

  generarPizarra() {
    const totalArea = this.areaHC.IB + this.areaHC.OB + this.areaHC.Support;
    const asignado = AREA_ORDER.reduce((acc, a) => acc + this.getAreaAssignedHC(a), 0);
    if (this.totalHC === 0 || totalArea !== this.totalHC || asignado !== this.totalHC) return;
    const logins = [...(this.loginsDisponibles || [])];
    if (logins.length < this.totalHC) {
      while (logins.length < this.totalHC) logins.push(`login-${logins.length + 1}`);
    }
    this.asignacionesPorPuesto = {};
    const porArea = this.getDepartamentosPorArea();
    for (const areaKey of AREA_ORDER) {
      const depts = porArea[areaKey] || [];
      for (const dept of depts) {
        if (this.isNoCuentaHC(dept)) continue;
        for (const puesto of dept.puestos || []) {
          const n = this.puestoHC[puesto.id] || 0;
          if (n <= 0) continue;
          this.asignacionesPorPuesto[puesto.id] = logins.splice(0, n);
        }
      }
    }
    this.pizarraGenerada = true;
    this.actualizarBotonesPizarra();
    if (typeof window.showToast === "function") window.showToast("Pizarra generada. Abre un departamento para ver quién está en cada puesto.", "success");
    else console.log("Pizarra generada");
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
  window.rotationToolController = new RotationToolController();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRotationTool);
} else {
  initRotationTool();
}
