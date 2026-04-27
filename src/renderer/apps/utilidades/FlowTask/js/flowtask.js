/**
 * FlowTask Controller
 * Asignación de personal a tareas mediante escaneo de QR
 * Soporta WS (workstation), linea (line) tracking y modo asignación de máquinas
 */

class FlowTaskController {
  constructor() {
    this.qrMapping = {};       // { "DOCK CLERK": { dept, process, task, linea?, ws?, tiene_maquinas? } }
    this.asignaciones = {};    // { "IB|Dock|Clerk": [{ login, ws, linea, maquina? }, ...] }
    this.tareaActual = null;   // { dept, process, task, linea?, ws?, tiene_maquinas? } — from last QR scan
    this.rosterData = null;
    this.dataPaths = null;
    this.dataPathsBase = null;
    this.audioContext = null;
    this.saveTimeout = null;
    this._scanPanelVisible = false;
    this._pendingCambio = null;
    // Modo asignación de máquinas
    this._modoMaquinas = null; // { dept, process, task } — tarea activa para asignar máquinas
    this._maquinasDisponibles = []; // máquinas pendientes de asignar

    this.init();
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  async init() {
    console.log("🔧 FlowTaskController inicializando...");
    try {
      const config = await window.api.getConfig();

      // Resolve pizarra_paths
      if (config?.pizarra_paths?.length) {
        this.dataPaths = config.pizarra_paths;
      } else if (config?.data_paths?.length) {
        this.dataPaths = config.data_paths.map((p) => {
          const n = this.normalizarRuta(p);
          return n.endsWith("\\") ? n + "Data_Flow" : n + "\\Data_Flow";
        });
      } else {
        this.dataPaths = [];
        console.warn("⚠️ No se encontraron rutas en config");
      }

      // Resolve data_paths base (for roster)
      if (config?.data_paths?.length) {
        this.dataPathsBase = config.data_paths;
      } else {
        this.dataPathsBase = [];
      }

      // Load data in parallel
      await Promise.all([
        this.cargarQRMapping(),
        this.cargarAsignaciones(),
        this.cargarRoster(),
      ]);

      this.configurarEventos();
      this.actualizarDashboard();
      this.mostrarContenido();

      console.log("✅ FlowTaskController listo");
    } catch (err) {
      console.error("❌ Error en init:", err);
      this.mostrarToast("Error al inicializar FlowTask", "error");
      // Always show UI even on error
      this.configurarEventos();
      this.actualizarDashboard();
      this.mostrarContenido();
    }
  }

  mostrarContenido() {
    const container = document.getElementById("flowtask-container");
    const loader = document.getElementById("flowtask-loader");
    if (container) container.classList.add("css-loaded");
    if (loader) {
      loader.classList.add("hidden");
      setTimeout(() => { loader.style.display = "none"; }, 400);
    }
  }

  // ─── Path helpers ──────────────────────────────────────────────────────────

  normalizarRuta(ruta) {
    if (!ruta) return "";
    return ruta.replace(/\//g, "\\");
  }

  async leerArchivoDesdeRutas(paths, archivo) {
    if (!paths?.length) return null;
    for (const base of paths) {
      try {
        const normalized = this.normalizarRuta(base);
        const sep = normalized.endsWith("\\") ? "" : "\\";
        const fullPath = normalized + sep + archivo;
        const result = await window.api.readJson(fullPath);
        if (result && result.success && result.data) {
          console.log(`✅ Leído: ${fullPath}`);
          return { data: result.data, path: fullPath };
        }
      } catch (e) {
        // try next path
      }
    }
    return null;
  }

  async escribirArchivoEnRuta(paths, archivo, data) {
    if (!paths?.length) return false;
    for (const base of paths) {
      try {
        const normalized = this.normalizarRuta(base);
        const sep = normalized.endsWith("\\") ? "" : "\\";
        const fullPath = normalized + sep + archivo;
        await window.api.writeJson(fullPath, data);
        console.log(`✅ Guardado: ${fullPath}`);
        return true;
      } catch (e) {
        console.warn(`⚠️ No se pudo guardar en ${base}:`, e);
      }
    }
    return false;
  }

  // ─── Data loading ──────────────────────────────────────────────────────────

  async cargarQRMapping() {
    try {
      const result = await this.leerArchivoDesdeRutas(this.dataPaths, "mapping_qr.json");
      if (result?.data) {
        this.qrMapping = result.data;
        console.log(`📋 QR Mapping cargado: ${Object.keys(this.qrMapping).length} entradas`);
      } else {
        console.warn("⚠️ mapping_qr.json no encontrado, usando mapping vacío");
        this.qrMapping = {};
      }
    } catch (err) {
      console.error("❌ Error cargando QR mapping:", err);
      this.qrMapping = {};
    }
  }

  async cargarAsignaciones() {
    try {
      const result = await this.leerArchivoDesdeRutas(this.dataPaths, "flowtask_asignaciones.json");
      if (result?.data) {
        this.asignaciones = result.data;
        console.log(`📋 Asignaciones cargadas: ${Object.keys(this.asignaciones).length} tareas`);
      } else {
        this.asignaciones = {};
      }
    } catch (err) {
      console.error("❌ Error cargando asignaciones:", err);
      this.asignaciones = {};
    }
  }

  async guardarAsignaciones() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(async () => {
      try {
        const ok = await this.escribirArchivoEnRuta(
          this.dataPaths,
          "flowtask_asignaciones.json",
          this.asignaciones
        );
        if (!ok) console.warn("⚠️ No se pudieron guardar las asignaciones");
      } catch (err) {
        console.error("❌ Error guardando asignaciones:", err);
      }
    }, 500);
  }

  async cargarRoster() {
    try {
      const result = await this.leerArchivoDesdeRutas(this.dataPathsBase, "roster.json");
      if (result?.data) {
        this.rosterData = result.data;
        console.log("📋 Roster cargado");
      } else {
        this.rosterData = null;
      }
    } catch (err) {
      console.error("❌ Error cargando roster:", err);
      this.rosterData = null;
    }
  }

  // ─── Roster helpers ────────────────────────────────────────────────────────

  getNombreDesdeRoster(login) {
    if (!this.rosterData || !login) return null;
    // Support array or object roster formats
    if (Array.isArray(this.rosterData)) {
      const entry = this.rosterData.find(
        (r) => r.login?.toUpperCase() === login.toUpperCase()
      );
      return entry ? (entry.nombre || entry.name || entry.Nombre || null) : null;
    }
    if (typeof this.rosterData === "object") {
      const entry = this.rosterData[login.toUpperCase()] || this.rosterData[login];
      if (!entry) return null;
      return entry.nombre || entry.name || entry.Nombre || null;
    }
    return null;
  }

  // ─── Core logic ────────────────────────────────────────────────────────────

  procesarEscaneo(valor) {
    const v = valor.trim().toUpperCase();
    if (!v) return;

    // Modo máquinas tiene prioridad
    if (this._modoMaquinas) {
      this._procesarEnModoMaquinas(v);
      return;
    }

    // Cambio pendiente esperando confirmación
    if (this._pendingCambio) {
      if (v === this._pendingCambio.login) {
        this._confirmarCambio();
        return;
      }
      this._cancelarCambio();
    }

    // Check if it's a QR task code
    const mapping = this.qrMapping[v] || this.qrMapping[valor.trim()];
    if (mapping) {
      this.setTareaActual(mapping);
      this.reproducirSonido("qr");
      const wsInfo = mapping.ws ? ` · WS ${mapping.ws}` : mapping.linea ? ` · Línea ${mapping.linea}` : "";
      this.mostrarToast(
        `Tarea: ${mapping.dept} › ${mapping.process} › ${mapping.task}${wsInfo}`,
        "info"
      );
      this.mostrarInfoEscaneo(
        `📋 ${mapping.dept} › ${mapping.process} › ${mapping.task}${wsInfo}`,
        "info"
      );
      this.actualizarDashboard();
      return;
    }

    // Otherwise treat as login
    if (!this.tareaActual) {
      this.mostrarToast("Escanea primero un QR de tarea", "warning");
      this.reproducirSonido("error");
      return;
    }

    this.asignarLogin(v);
  }

  _confirmarCambio() {
    if (!this._pendingCambio) return;
    const { login, desde, hacia } = this._pendingCambio;
    this._pendingCambio = null;

    // Quitar del puesto anterior
    const keyDesde = `${desde.dept}|${desde.process}|${desde.task}`;
    if (this.asignaciones[keyDesde]) {
      this.asignaciones[keyDesde] = this.asignaciones[keyDesde].filter(
        (e) => e.login?.toUpperCase() !== login.toUpperCase()
      );
      if (this.asignaciones[keyDesde].length === 0) delete this.asignaciones[keyDesde];
    }

    // Asignar al nuevo
    const keyHacia = `${hacia.dept}|${hacia.process}|${hacia.task}`;
    if (!this.asignaciones[keyHacia]) this.asignaciones[keyHacia] = [];
    const ws = this._calcularWS(keyHacia);
    const linea = this.tareaActual?.linea || null;
    this.asignaciones[keyHacia].push({ login, ws, linea });

    this.guardarAsignaciones();
    this.actualizarDashboard();
    this.reproducirSonido("success");
    this.mostrarInfoEscaneo(
      `✅ ${login} movido a ${hacia.dept} › ${hacia.process} › ${hacia.task}`,
      "success"
    );
    this.mostrarToast(`${login} → ${hacia.task}`, "success");
  }

  _cancelarCambio() {
    this._pendingCambio = null;
    this.mostrarInfoEscaneo("Cambio cancelado", "warning");
  }

  asignarLogin(login) {
    const { dept, process, task } = this.tareaActual;
    const key = `${dept}|${process}|${task}`;

    if (!this.asignaciones[key]) this.asignaciones[key] = [];

    // Ya está en esta misma tarea
    const yaEnEstaTarea = this.asignaciones[key].some(
      (e) => e.login?.toUpperCase() === login.toUpperCase()
    );
    if (yaEnEstaTarea) {
      this.mostrarInfoEscaneo(`${login} ya está en esta tarea`, "warning");
      this.reproducirSonido("warning");
      return;
    }

    // Está en otra tarea → pedir confirmación
    let tareaAnterior = null;
    for (const [k, entries] of Object.entries(this.asignaciones)) {
      if (entries.some((e) => e.login?.toUpperCase() === login.toUpperCase())) {
        const [d, p, t] = k.split("|");
        tareaAnterior = { dept: d, process: p, task: t };
        break;
      }
    }

    if (tareaAnterior) {
      this._pendingCambio = {
        login,
        desde: tareaAnterior,
        hacia: { dept, process, task },
      };
      this.reproducirSonido("warning");
      this.mostrarInfoEscaneo(
        `⚠️ ${login} está en ${tareaAnterior.process} › ${tareaAnterior.task} → mover a ${process} › ${task}? Escanea de nuevo para confirmar`,
        "warning"
      );
      return;
    }

    // Asignación normal
    const ws = this._calcularWS(key);
    const linea = this.tareaActual.linea || null;
    this.asignaciones[key].push({ login, ws, linea });
    this.guardarAsignaciones();
    this.actualizarDashboard();
    this.reproducirSonido("success");
    const wsInfo = ws ? ` — ${ws}` : "";
    this.mostrarInfoEscaneo(`✅ ${login}${wsInfo} → ${process} › ${task}`, "success");
    this.mostrarToast(`${login} → ${task}`, "success");
  }

  setTareaActual(mapping) {
    this._pendingCambio = null;
    this.tareaActual = {
      dept: mapping.dept,
      process: mapping.process,
      task: mapping.task,
      linea: mapping.linea || null,
      ws: mapping.ws || null,
      tiene_maquinas: mapping.tiene_maquinas || false,
    };
    this.actualizarScanTaskDisplay();
  }

  // ─── WS / Estaciones ───────────────────────────────────────────────────────

  _calcularWS(key) {
    if (!this.tareaActual) return null;

    // Si la tarea tiene WS fijo, usarlo directamente
    if (this.tareaActual.ws) return this.tareaActual.ws;

    // Si tiene linea pero no ws fijo → asignar siguiente estación con menos gente
    if (this.tareaActual.linea) {
      const { dept, process, task, linea } = this.tareaActual;
      const estaciones = this._getEstacionesDeLinea(dept, process, task, linea);
      if (!estaciones || estaciones.length === 0) return null;

      const entries = this.asignaciones[key] || [];

      // Contar personas por estación
      const conteo = {};
      for (const est of estaciones) conteo[est] = 0;
      for (const e of entries) {
        if (e.ws && conteo[e.ws] !== undefined) conteo[e.ws]++;
      }

      // Ordenar estaciones descendente por número extraído, luego elegir la de menor ocupación
      const sorted = [...estaciones].sort((a, b) => {
        const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
        const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
        return nb - na;
      });

      let minCount = Infinity;
      let elegida = null;
      for (const est of sorted) {
        if (conteo[est] < minCount) {
          minCount = conteo[est];
          elegida = est;
        }
      }
      return elegida;
    }

    return null;
  }

  _getEstacionesDeLinea(dept, process, task, linea) {
    // Placeholder — se integrará con puestosData más adelante
    return null;
  }

  // ─── Modo máquinas ─────────────────────────────────────────────────────────

  activarModoMaquinas(dept, process, task) {
    this._modoMaquinas = { dept, process, task };
    this.mostrarInfoEscaneo(`🔧 Modo máquinas activo: ${process} › ${task}`, "info");
    this.mostrarToast(`Modo máquinas: ${task}`, "info");
    this.actualizarScanTaskDisplay();
  }

  desactivarModoMaquinas() {
    this._modoMaquinas = null;
    this.mostrarInfoEscaneo("Modo máquinas desactivado", "info");
    this.actualizarScanTaskDisplay();
  }

  _procesarEnModoMaquinas(v) {
    const { dept, process, task } = this._modoMaquinas;
    const key = `${dept}|${process}|${task}`;
    const entries = this.asignaciones[key] || [];

    // Si es un QR de tarea, salir del modo máquinas y procesar normalmente
    const mapping = this.qrMapping[v] || this.qrMapping[v.toLowerCase()];
    if (mapping) {
      this.desactivarModoMaquinas();
      this.procesarEscaneo(v);
      return;
    }

    // Buscar si es un login ya asignado a esta tarea
    const entry = entries.find((e) => e.login?.toUpperCase() === v.toUpperCase());
    if (!entry) {
      this.mostrarInfoEscaneo(`⚠️ ${v} no está asignado a ${task}`, "warning");
      this.reproducirSonido("warning");
      return;
    }

    // Asignar máquina pendiente si hay
    if (this._maquinasDisponibles.length > 0) {
      const maquina = this._maquinasDisponibles.shift();
      entry.maquina = maquina;
      this.guardarAsignaciones();
      this.actualizarDashboard();
      this.reproducirSonido("success");
      this.mostrarInfoEscaneo(`✅ ${v} → Máquina ${maquina}`, "success");
      return;
    }

    // Sin máquinas pendientes: mostrar info
    this.mostrarInfoEscaneo(`${v} — sin máquinas pendientes de asignar`, "warning");
    this.reproducirSonido("warning");
  }

  repartirMaquinasAleatorio(dept, process, task) {
    const key = `${dept}|${process}|${task}`;
    const entries = this.asignaciones[key];
    if (!entries || entries.length === 0) {
      this.mostrarToast("No hay personas en esta tarea", "warning");
      return;
    }

    // Generar números de máquina del 1 al N y mezclar aleatoriamente
    const n = entries.length;
    const nums = Array.from({ length: n }, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }

    entries.forEach((e, i) => { e.maquina = nums[i]; });
    this.guardarAsignaciones();
    this.actualizarDashboard();
    this.mostrarToast(`Máquinas repartidas aleatoriamente (${n})`, "success");
    // Refrescar modal si está abierto
    const modal = document.getElementById("modal-detalle");
    if (modal && modal.style.display === "flex") {
      this.mostrarDetalleTarea(dept, process, task);
    }
  }

  mostrarInfoEscaneo(mensaje, tipo = "info") {
    const el = document.getElementById("scan-info-msg");
    if (!el) return;
    el.textContent = mensaje;
    el.className = `scan-info-msg scan-info-${tipo}`;
    el.style.display = "block";
    clearTimeout(this._infoTimeout);
    // Mantener visible si hay cambio pendiente
    if (!this._pendingCambio) {
      this._infoTimeout = setTimeout(() => { el.style.display = "none"; }, 4000);
    }
  }

  removerLogin(login, dept, process, task) {
    const key = `${dept}|${process}|${task}`;
    if (!this.asignaciones[key]) return;
    this.asignaciones[key] = this.asignaciones[key].filter(
      (e) => e.login?.toUpperCase() !== login.toUpperCase()
    );
    if (this.asignaciones[key].length === 0) delete this.asignaciones[key];
    this.guardarAsignaciones();
    this.actualizarDashboard();
    this.mostrarToast(`${login} removido`, "info");
  }

  borrarTodo() {
    this.asignaciones = {};
    this.tareaActual = null;
    this.guardarAsignaciones();
    this.actualizarScanTaskDisplay();
    this.actualizarDashboard();
    this.mostrarToast("Todas las asignaciones borradas", "info");
  }

  exportar() {
    try {
      const exportData = {
        fecha: new Date().toISOString(),
        tareaActual: this.tareaActual,
        asignaciones: this.asignaciones,
        resumen: this.buildResumen(),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flowtask_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.mostrarToast("Exportado correctamente", "success");
    } catch (err) {
      console.error("Error exportando:", err);
      this.mostrarToast("Error al exportar", "error");
    }
  }

  buildResumen() {
    const resumen = {};
    for (const [key, entries] of Object.entries(this.asignaciones)) {
      const [dept, process, task] = key.split("|");
      if (!resumen[dept]) resumen[dept] = {};
      if (!resumen[dept][process]) resumen[dept][process] = {};
      resumen[dept][process][task] = entries.length;
    }
    return resumen;
  }

  // ─── Dashboard rendering ───────────────────────────────────────────────────

  actualizarDashboard() {
    const grid = document.getElementById("dashboard-grid");
    const empty = document.getElementById("dashboard-empty");
    if (!grid) return;

    // Build dept > process > task structure from qrMapping
    const estructura = this.buildEstructura();
    const depts = Object.keys(estructura);

    if (depts.length === 0) {
      grid.innerHTML = "";
      if (empty) {
        empty.style.display = "flex";
        empty.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
          </svg>
          <p>No hay datos de mapping_qr.json disponibles</p>`;
        grid.appendChild(empty);
      }
      return;
    }

    if (empty) empty.style.display = "none";

    // Render dept columns in order: IB, OB, Support
    const deptOrder = ["IB", "OB", "Support"];
    const orderedDepts = [
      ...deptOrder.filter((d) => estructura[d]),
      ...depts.filter((d) => !deptOrder.includes(d)),
    ];

    const html = orderedDepts
      .map((dept) => this.renderDeptColumn(dept, estructura[dept]))
      .join("");

    // Si no hay nada visible (sin asignaciones y sin tarea activa)
    if (!html.trim()) {
      grid.innerHTML = `
        <div class="dashboard-empty" style="display:flex;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
          <p>Escanea un QR de tarea para empezar</p>
        </div>`;
      return;
    }

    grid.innerHTML = html;

    // Re-attach process collapse listeners
    grid.querySelectorAll(".process-header").forEach((header) => {
      header.addEventListener("click", () => {
        const group = header.closest(".process-group");
        if (group) group.classList.toggle("collapsed");
      });
    });

    // Re-attach task card click listeners
    grid.querySelectorAll(".task-card").forEach((card) => {
      card.addEventListener("click", () => {
        const { dept, process, task } = card.dataset;
        this.mostrarDetalleTarea(dept, process, task);
      });
    });
  }

  buildEstructura() {
    // Build from qrMapping: dept > process > Set<task>
    const estructura = {};
    for (const entry of Object.values(this.qrMapping)) {
      const { dept, process, task } = entry;
      if (!dept || !process || !task) continue;
      if (!estructura[dept]) estructura[dept] = {};
      if (!estructura[dept][process]) estructura[dept][process] = new Set();
      estructura[dept][process].add(task);
    }
    // Also include tasks from asignaciones that might not be in mapping
    for (const key of Object.keys(this.asignaciones)) {
      const [dept, process, task] = key.split("|");
      if (!dept || !process || !task) continue;
      if (!estructura[dept]) estructura[dept] = {};
      if (!estructura[dept][process]) estructura[dept][process] = new Set();
      estructura[dept][process].add(task);
    }
    return estructura;
  }

  renderDeptColumn(dept, processes) {
    const deptClass = dept === "IB" ? "dept-ib" : dept === "OB" ? "dept-ob" : "dept-sup";
    const totalDept = this.contarPersonasDept(dept);

    const processesHtml = Object.entries(processes)
      .map(([process, tasks]) => this.renderProcessGroup(dept, process, [...tasks]))
      .join("");

    // Si no hay nada visible en este dept, no renderizar la columna
    if (!processesHtml.trim()) return "";

    return `
      <div class="dept-column ${deptClass}">
        <div class="dept-header">
          <h2 class="dept-title">${dept}</h2>
          <span class="dept-badge">${totalDept}</span>
        </div>
        <div class="dept-body">
          ${processesHtml}
        </div>
      </div>`;
  }

  renderProcessGroup(dept, process, tasks) {
    const totalProcess = this.contarPersonasProceso(dept, process);

    // Solo mostrar tasks que tienen gente O que es la tarea activa actual
    const tasksVisibles = tasks.filter((task) => {
      const key = `${dept}|${process}|${task}`;
      const tieneGente = (this.asignaciones[key] || []).length > 0;
      const esActiva = this.tareaActual &&
        this.tareaActual.dept === dept &&
        this.tareaActual.process === process &&
        this.tareaActual.task === task;
      return tieneGente || esActiva;
    });

    // Si no hay nada visible en este proceso, no renderizar
    if (tasksVisibles.length === 0) return "";

    const tasksHtml = tasksVisibles
      .map((task) => this.renderTaskCard(dept, process, task))
      .join("");

    return `
      <div class="process-group">
        <div class="process-header">
          <span class="process-name">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            ${process}
          </span>
          <div style="display:flex;align-items:center;gap:0.35rem;">
            <span class="process-count">${totalProcess}</span>
            <svg class="process-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>
        <div class="process-tasks">
          ${tasksHtml}
        </div>
      </div>`;
  }

  renderTaskCard(dept, process, task) {
    const key = `${dept}|${process}|${task}`;
    const entries = this.asignaciones[key] || [];
    const count = entries.length;
    const isActive =
      this.tareaActual &&
      this.tareaActual.dept === dept &&
      this.tareaActual.process === process &&
      this.tareaActual.task === task;

    // WS badge: show if any entry has a ws
    const hasWS = entries.some((e) => e.ws);
    const hasMaquinas = entries.some((e) => e.maquina);

    // Check if any QR for this task has tiene_maquinas
    const tieneMaquinasQR = Object.values(this.qrMapping).some(
      (m) => m.dept === dept && m.process === process && m.task === task && m.tiene_maquinas
    );

    const wsBadge = hasWS
      ? `<span class="task-ws-badge" title="Con WS asignado">WS</span>`
      : "";
    const maquinaIcon = (hasMaquinas || tieneMaquinasQR)
      ? `<span class="task-maquina-icon" title="Tiene máquinas">🔧</span>`
      : "";

    return `
      <div class="task-card ${isActive ? "active-task" : ""}"
           data-dept="${dept}" data-process="${process}" data-task="${task}">
        <span class="task-name">${task}${wsBadge}${maquinaIcon}</span>
        <span class="task-count ${count > 0 ? "has-people" : ""}">${count}</span>
      </div>`;
  }

  contarPersonasDept(dept) {
    return Object.entries(this.asignaciones)
      .filter(([key]) => key.startsWith(dept + "|"))
      .reduce((sum, [, entries]) => sum + entries.length, 0);
  }

  contarPersonasProceso(dept, process) {
    const prefix = `${dept}|${process}|`;
    return Object.entries(this.asignaciones)
      .filter(([key]) => key.startsWith(prefix))
      .reduce((sum, [, entries]) => sum + entries.length, 0);
  }

  // ─── Scan panel ────────────────────────────────────────────────────────────

  actualizarScanTaskDisplay() {
    const display = document.getElementById("scan-task-display");
    if (!display) return;
    if (this._modoMaquinas) {
      const { dept, process, task } = this._modoMaquinas;
      display.textContent = `🔧 Modo máquinas: ${dept} › ${process} › ${task}`;
      display.classList.remove("no-task");
    } else if (this.tareaActual) {
      const { dept, process, task, ws, linea } = this.tareaActual;
      const extra = ws ? ` · WS ${ws}` : linea ? ` · L${linea}` : "";
      display.textContent = `${dept} › ${process} › ${task}${extra}`;
      display.classList.remove("no-task");
    } else {
      display.textContent = "Ninguna — escanea un QR de tarea";
      display.classList.add("no-task");
    }
  }

  // ─── Modal: task detail ────────────────────────────────────────────────────

  mostrarDetalleTarea(dept, process, task) {
    const key = `${dept}|${process}|${task}`;
    const entries = this.asignaciones[key] || [];

    const title = document.getElementById("modal-detalle-title");
    const body = document.getElementById("modal-detalle-body");
    const modal = document.getElementById("modal-detalle");

    if (!modal || !title || !body) return;

    title.textContent = `${dept} › ${process} › ${task}`;

    // Check if task has tiene_maquinas (from any QR entry or from existing maquina assignments)
    const tieneMaquinasQR = Object.values(this.qrMapping).some(
      (m) => m.dept === dept && m.process === process && m.task === task && m.tiene_maquinas
    );
    const tieneMaquinasEntries = entries.some((e) => e.maquina);
    const mostrarBotonesMaquinas = tieneMaquinasQR || tieneMaquinasEntries;

    if (entries.length === 0) {
      body.innerHTML = `<div class="modal-empty">No hay personas asignadas a esta tarea.</div>`;
    } else {
      const rows = entries
        .map((entry) => {
          const login = entry.login || entry;
          const ws = entry.ws || null;
          const maquina = entry.maquina != null ? entry.maquina : null;
          const nombre = this.getNombreDesdeRoster(login);
          const wsLabel = ws ? `<span class="person-ws">${ws}</span>` : "";
          const maquinaLabel = maquina != null ? `<span class="person-maquina">M${maquina}</span>` : "";
          return `
            <div class="person-row">
              <div class="person-info">
                <span class="person-login">${login}</span>
                ${wsLabel}${maquinaLabel}
                ${nombre ? `<span class="person-name">${nombre}</span>` : ""}
              </div>
              <button class="btn-icon-sm" title="Remover"
                onclick="window.flowTaskController?.removerLogin('${login}','${dept}','${process}','${task}');window.flowTaskController?.mostrarDetalleTarea('${dept}','${process}','${task}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                </svg>
              </button>
            </div>`;
        })
        .join("");

      const botonesHtml = mostrarBotonesMaquinas ? `
        <div class="modal-maquinas-actions">
          <button class="btn-maquinas" onclick="window.flowTaskController?.activarModoMaquinas('${dept}','${process}','${task}');document.getElementById('modal-detalle').style.display='none'">
            🔧 Asignar máquinas
          </button>
          <button class="btn-maquinas-random" onclick="window.flowTaskController?.repartirMaquinasAleatorio('${dept}','${process}','${task}')">
            🎲 Repartir aleatoriamente
          </button>
        </div>` : "";

      body.innerHTML = `<div class="people-list">${rows}</div>${botonesHtml}`;
    }

    modal.style.display = "flex";
  }

  // ─── Event listeners ───────────────────────────────────────────────────────

  configurarEventos() {
    // Toggle scan panel
    const btnScan = document.getElementById("btn-toggle-scan");
    if (btnScan) {
      btnScan.addEventListener("click", () => {
        this._scanPanelVisible = !this._scanPanelVisible;
        const panel = document.getElementById("scan-panel");
        if (panel) panel.style.display = this._scanPanelVisible ? "block" : "none";
        btnScan.classList.toggle("active", this._scanPanelVisible);
        if (this._scanPanelVisible) {
          setTimeout(() => document.getElementById("scan-input")?.focus(), 50);
        }
      });
    }

    // Scan input
    const scanInput = document.getElementById("scan-input");
    if (scanInput) {
      scanInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const val = scanInput.value.trim();
          if (val) {
            this.procesarEscaneo(val);
            scanInput.value = "";
            scanInput.select();
          }
        }
      });
    }

    // Exportar
    const btnExportar = document.getElementById("btn-exportar");
    if (btnExportar) btnExportar.addEventListener("click", () => this.exportar());

    // Borrar
    const btnBorrar = document.getElementById("btn-borrar");
    if (btnBorrar) {
      btnBorrar.addEventListener("click", () => {
        document.getElementById("modal-borrar").style.display = "flex";
      });
    }

    // Modal borrar
    const modalBorrarClose = document.getElementById("modal-borrar-close");
    const modalBorrarCancel = document.getElementById("modal-borrar-cancel");
    const modalBorrarConfirm = document.getElementById("modal-borrar-confirm");
    const modalBorrar = document.getElementById("modal-borrar");

    if (modalBorrarClose) modalBorrarClose.addEventListener("click", () => { modalBorrar.style.display = "none"; });
    if (modalBorrarCancel) modalBorrarCancel.addEventListener("click", () => { modalBorrar.style.display = "none"; });
    if (modalBorrarConfirm) {
      modalBorrarConfirm.addEventListener("click", () => {
        modalBorrar.style.display = "none";
        this.borrarTodo();
      });
    }

    // Modal detalle close
    const modalDetalleClose = document.getElementById("modal-detalle-close");
    const modalDetalle = document.getElementById("modal-detalle");
    if (modalDetalleClose) {
      modalDetalleClose.addEventListener("click", () => { modalDetalle.style.display = "none"; });
    }

    // Close modals on overlay click
    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.style.display = "none";
      });
    });

    // Keyboard: Escape closes modals
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll(".modal-overlay").forEach((m) => {
          m.style.display = "none";
        });
      }
    });
  }

  // ─── Audio ─────────────────────────────────────────────────────────────────

  reproducirSonido(tipo) {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = this.audioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const configs = {
        success: { freq: 880, duration: 0.12, type: "sine" },
        qr:      { freq: 660, duration: 0.15, type: "sine" },
        error:   { freq: 220, duration: 0.2,  type: "sawtooth" },
        warning: { freq: 440, duration: 0.15, type: "triangle" },
      };

      const cfg = configs[tipo] || configs.success;
      osc.type = cfg.type;
      osc.frequency.setValueAtTime(cfg.freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cfg.duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + cfg.duration);
    } catch (e) {
      // Audio not critical
    }
  }

  // ─── Toast ─────────────────────────────────────────────────────────────────

  mostrarToast(msg, tipo = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${tipo}`;
    toast.textContent = msg;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // ─── Destroy ───────────────────────────────────────────────────────────────

  destroy() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    console.log("🗑️ FlowTaskController destruido");
  }
}

// ─── SPA Bootstrap ─────────────────────────────────────────────────────────

let flowTaskController;

function initFlowTask() {
  if (window.flowTaskController?.destroy) window.flowTaskController.destroy();
  flowTaskController = new FlowTaskController();
  window.flowTaskController = flowTaskController;
}

if (!window._flowTaskListenerRegistered) {
  window._flowTaskListenerRegistered = true;
  window.addEventListener("app:ready", (e) => {
    if (e.detail?.app === "flowtask") initFlowTask();
  });
}
