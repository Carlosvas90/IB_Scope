/**
 * SkillMatrix Controller
 * Gestión de la matriz de habilidades de usuarios
 */

class SkillMatrixController {
  constructor() {
    this.userDataPath = null;
    this.dataPaths = null;
    this.sharedDataPath = null;
    this.skillmatrixData = null;
    this.puestosData = null;
    this.rosterData = null;
    this.usuariosFiltrados = null;
    this.usuarioActualEditando = null;

    this.init();
  }

  async init() {
    console.log("🔧 SkillMatrixController inicializando...");
    try {
      this.userDataPath = await window.api.getUserDataPath();
      console.log("📁 User Data Path:", this.userDataPath);

      // Misma resolución de rutas que Pizarra: pizarra_paths (Data_Flow) o data_paths + Data_Flow
      const config = await window.api.getConfig();
      if (
        config &&
        config.pizarra_paths &&
        Array.isArray(config.pizarra_paths) &&
        config.pizarra_paths.length > 0
      ) {
        this.dataPaths = config.pizarra_paths;
        console.log("📁 SkillMatrix usando pizarra_paths (mismo que Pizarra)");
      } else if (
        config &&
        config.data_paths &&
        Array.isArray(config.data_paths) &&
        config.data_paths.length > 0
      ) {
        this.dataPaths = config.data_paths.map((path) => {
          const normalized = this.normalizarRutaWindows(path);
          return normalized.endsWith("\\")
            ? normalized + "Data_Flow"
            : normalized + "\\Data_Flow";
        });
        console.log("📁 SkillMatrix usando data_paths + Data_Flow (fallback, mismo que Pizarra)");
      } else {
        console.warn(
          "⚠️ No se encontraron pizarra_paths ni data_paths, usando userDataPath como fallback"
        );
        this.sharedDataPath = `${this.userDataPath}\\data\\skillmatrix`;
        this.dataPaths = [this.sharedDataPath];
      }
      if (this.dataPaths.length > 0) {
        this.sharedDataPath = this.normalizarRutaWindows(this.dataPaths[0]);
        if (!this.sharedDataPath.endsWith("\\")) {
          this.sharedDataPath += "\\";
        }
        console.log("📁 Shared Data Path:", this.sharedDataPath);
      }

      await this.cargarDatos();
      this.configurarEventos();
      this.actualizarListaUsuarios();

      console.log("✅ SkillMatrixController inicializado correctamente");
    } catch (error) {
      console.error("❌ Error inicializando SkillMatrixController:", error);
      this.mostrarToast("Error al inicializar la aplicación", "error");
    }
  }

  /**
   * Normaliza una ruta para Windows (especialmente rutas UNC)
   */
  normalizarRutaWindows(ruta) {
    if (ruta.startsWith("\\\\")) {
      return ruta.replace(/\//g, "\\");
    }
    return ruta.replace(/\//g, "\\");
  }

  /**
   * Obtiene la ruta compartida para un archivo (misma lógica que Pizarra).
   */
  async obtenerRutaCompartida(archivo) {
    if (!this.dataPaths || this.dataPaths.length === 0) {
      return null;
    }

    for (const basePath of this.dataPaths) {
      const normalizedBase = this.normalizarRutaWindows(basePath);
      const normalizedPath = normalizedBase.endsWith("\\")
        ? normalizedBase
        : normalizedBase + "\\";
      const filePath = normalizedPath + archivo;

      try {
        const result = await window.api.readJson(filePath);
        if (result && result.success && result.data) {
          return { path: filePath, data: result.data, basePath: normalizedPath };
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  /**
   * Carga roster.json desde las mismas rutas que Pizarra (Data_Flow) y, si no existe, desde data_paths (raíz Data).
   * Acepta varios formatos: { roster: [] }, array directo, { usuarios: [] }, { employees: [] }.
   */
  async cargarRosterMismoOrigenPizarra() {
    const config = await window.api.getConfig();

    // 1) Intentar Data_Flow (pizarra_paths / data_paths+Data_Flow) — mismo que Pizarra
    let rosterResult = await this.obtenerRutaCompartida("roster.json");
    if (rosterResult) {
      const arr = this.extraerArrayRoster(rosterResult.data);
      if (Array.isArray(arr) && arr.length > 0) {
        return { path: rosterResult.path, roster: arr };
      }
    }

    // 2) Intentar en raíz de data_paths (Data/roster.json) por si el archivo está ahí
    const dataPathsRaw =
      config &&
      Array.isArray(config.data_paths) &&
      config.data_paths.length > 0
        ? config.data_paths
        : [];
    for (const base of dataPathsRaw) {
      const normalized = this.normalizarRutaWindows(base);
      const path = normalized.endsWith("\\") ? normalized + "roster.json" : normalized + "\\roster.json";
      try {
        const result = await window.api.readJson(path);
        if (result && result.success && result.data) {
          const arr = this.extraerArrayRoster(result.data);
          if (Array.isArray(arr) && arr.length > 0) {
            return { path, roster: arr };
          }
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  }

  /**
   * Extrae array de empleados desde distintos formatos de JSON de roster.
   */
  extraerArrayRoster(data) {
    if (!data) return null;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.roster)) return data.roster;
    if (Array.isArray(data.usuarios)) return data.usuarios;
    if (Array.isArray(data.employees)) return data.employees;
    return null;
  }

  /** Ruta por defecto y nombre del CSV de certificados (Rotation Tool). */
  static get CERTIFICATE_CSV_FILENAME() {
    return "Certifcate Information.csv";
  }

  static get CERTIFICATE_CSV_FILENAME_ALT() {
    return "Certificate Information.csv";
  }

  /**
   * Obtiene la ruta completa al CSV de certificados (config certificate_csv_path o ruta por defecto).
   */
  async getCertificateCsvPath() {
    const config = await window.api.getConfig();
    const base =
      config?.certificate_csv_path ||
      "\\\\ant\\dept-eu\\VLC1\\Support\\Operaciones\\Leads\\Rotation Tool\\Rotarion-Tool-App";
    const normalized = this.normalizarRutaWindows(base);
    const pathWithSlash = normalized.endsWith("\\") ? normalized : normalized + "\\";
    return pathWithSlash + SkillMatrixController.CERTIFICATE_CSV_FILENAME;
  }

  /**
   * Parsea una línea CSV con campos entre comillas (respeta comas dentro de comillas).
   */
  parseCsvLine(line) {
    const fields = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        let end = i + 1;
        while (end < line.length) {
          const next = line.indexOf('"', end);
          if (next === -1) break;
          if (line[next + 1] === '"') {
            end = next + 2;
            continue;
          }
          end = next;
          break;
        }
        fields.push(line.slice(i + 1, end).replace(/""/g, '"'));
        i = end + 1;
        if (line[i] === ",") i++;
      } else {
        const end = line.indexOf(",", i);
        const value = end === -1 ? line.slice(i) : line.slice(i, end);
        fields.push(value.trim());
        i = end === -1 ? line.length : end + 1;
      }
    }
    return fields;
  }

  /**
   * Parsea el CSV de certificados: Employee Login, Employee Status = Active, Certificate Title, Certificate Status = Earned.
   * Devuelve Map<login (upper), Set<certificateTitle>>.
   */
  parseCertificateCsv(content) {
    const loginToCerts = new Map();
    const lines = content.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return loginToCerts;

    const headerFields = this.parseCsvLine(lines[0]);
    const idxLogin = headerFields.findIndex((h) => h === "Employee Login");
    const idxStatus = headerFields.findIndex((h) => h === "Employee Status");
    const idxCertTitle = headerFields.findIndex((h) => h === "Certificate Title");
    const idxCertStatus = headerFields.findIndex((h) => h === "Certificate Status");
    if (idxLogin === -1 || idxCertTitle === -1 || idxCertStatus === -1) {
      console.warn("[SkillMatrix] CSV de certificados sin columnas esperadas (Employee Login, Certificate Title, Certificate Status)");
      return loginToCerts;
    }

    for (let r = 1; r < lines.length; r++) {
      const fields = this.parseCsvLine(lines[r]);
      const login = fields[idxLogin]?.trim();
      const empStatus = fields[idxStatus]?.trim();
      const certTitle = fields[idxCertTitle]?.trim();
      const certStatus = fields[idxCertStatus]?.trim();
      if (!login || !certTitle) continue;
      if (idxStatus !== -1 && empStatus !== "Active") continue;
      if (certStatus !== "Earned") continue;

      const loginUpper = login.toUpperCase();
      if (!loginToCerts.has(loginUpper)) loginToCerts.set(loginUpper, new Set());
      loginToCerts.get(loginUpper).add(certTitle);
    }
    return loginToCerts;
  }

  /**
   * Devuelve la lista plana de puestos desde puestos.json.
   * Acepta formato mapper (departamentos[].puestos con certificados) o legacy (puestos_predefinidos / puestos_personalizados).
   * En formato mapper añade _departamentoNombre para mostrar en UI.
   */
  getTodosLosPuestos() {
    if (!this.puestosData) return [];
    if (Array.isArray(this.puestosData.departamentos)) {
      return this.puestosData.departamentos.flatMap((d) =>
        (d.puestos || []).map((p) => ({ ...p, _departamentoNombre: d.nombre }))
      );
    }
    return [
      ...(this.puestosData.puestos_predefinidos || []),
      ...(this.puestosData.puestos_personalizados || []),
    ];
  }

  /** Normaliza título de certificado para comparación (trim + colapsar espacios). */
  normalizarCertTitle(s) {
    return (s && String(s).trim().replace(/\s+/g, " ")) || "";
  }

  /**
   * Construye mapa Certificate Title → [puestoId] desde puestos.
   * Usa certificados (formato mapper: array de arrays) o certificate_titles (legacy).
   */
  buildCertificateTitleToPuestoIds() {
    const certToPuestoIds = new Map();
    const puestos = this.getTodosLosPuestos();
    for (const p of puestos) {
      if (!p.id) continue;
      let titles = [];
      if (Array.isArray(p.certificados)) {
        titles = p.certificados.flatMap((arr) => (Array.isArray(arr) ? arr : [arr])).filter(Boolean);
      }
      if (titles.length === 0) {
        titles = p.certificate_titles || (p.certificate_title ? [p.certificate_title] : []);
      }
      if (titles.length) {
        for (const t of titles) {
          const key = this.normalizarCertTitle(t);
          if (!key) continue;
          if (!certToPuestoIds.has(key)) certToPuestoIds.set(key, []);
          if (!certToPuestoIds.get(key).includes(p.id)) certToPuestoIds.get(key).push(p.id);
        }
      } else {
        if (p.nombre) {
          if (!certToPuestoIds.has(p.nombre)) certToPuestoIds.set(p.nombre, []);
          if (!certToPuestoIds.get(p.nombre).includes(p.id)) certToPuestoIds.get(p.nombre).push(p.id);
        }
        if (p.id) {
          if (!certToPuestoIds.has(p.id)) certToPuestoIds.set(p.id, []);
          if (!certToPuestoIds.get(p.id).includes(p.id)) certToPuestoIds.get(p.id).push(p.id);
        }
      }
    }
    return certToPuestoIds;
  }

  /**
   * Carga el CSV de certificados desde el path configurado y fusiona skills (Earned + Active) en skillmatrixData.
   * Solo se consideran puestos con certificate_titles o coincidencia por nombre/id.
   */
  async mergeCertificateSkillsIntoSkillmatrix() {
    if (!window.api?.readFileAbsolute) return;
    let csvPath = await this.getCertificateCsvPath();
    let result = await window.api.readFileAbsolute(csvPath);
    if (!result?.success && csvPath.endsWith(SkillMatrixController.CERTIFICATE_CSV_FILENAME)) {
      csvPath = csvPath.replace(
        SkillMatrixController.CERTIFICATE_CSV_FILENAME,
        SkillMatrixController.CERTIFICATE_CSV_FILENAME_ALT
      );
      result = await window.api.readFileAbsolute(csvPath);
    }
    if (!result?.success) {
      console.warn("[SkillMatrix] CSV de certificados no encontrado o no legible:", csvPath);
      return;
    }

    const loginToCerts = this.parseCertificateCsv(result.content);
    const certToPuestoIds = this.buildCertificateTitleToPuestoIds();
    if (certToPuestoIds.size === 0) {
      console.log("[SkillMatrix] Sin mapeo Certificate Title → puesto (puestos.json debe tener departamentos[].puestos[].certificados o certificate_titles)");
    }

    let merged = 0;
    if (!this.skillmatrixData.usuarios) this.skillmatrixData.usuarios = {};
    for (const [login, certs] of loginToCerts) {
      if (!this.skillmatrixData.usuarios[login]) {
        this.skillmatrixData.usuarios[login] = { puestos: {} };
      }
      const puestos = this.skillmatrixData.usuarios[login].puestos;
      for (const certTitle of certs) {
        const key = this.normalizarCertTitle(certTitle);
        const puestoIds = certToPuestoIds.get(key);
        if (!puestoIds) continue;
        for (const puestoId of puestoIds) {
          if (puestos[puestoId] !== true) {
            puestos[puestoId] = true;
            merged++;
          }
        }
      }
    }
    if (loginToCerts.size > 0) {
      console.log(
        `[SkillMatrix] Certificados CSV: ${loginToCerts.size} logins, ${merged} skills fusionadas desde ${csvPath}`
      );
    }
  }

  /**
   * Indica si el empleado debe considerarse inactivo (no mostrarlo).
   * Revisa: employee_status (A = activo, L/T/I/etc = inactivo), activo, status texto, Estado.
   */
  esInactivo(empleado) {
    const f = (v) => v === false || v === "false" || (typeof v === "string" && v.trim().toLowerCase() === "no");
    if (f(empleado.activo) || f(empleado.Active) || f(empleado.is_active)) return true;
    const status =
      empleado.employee_status ??
      empleado.status ??
      empleado["Employee Status"] ??
      empleado.Estado ??
      empleado.estado;
    if (status != null && typeof status === "string") {
      const s = status.trim();
      const sl = s.toLowerCase();
      // Código "A" = activo (formato roster.json); cualquier otro código = inactivo
      if (s.length <= 2) {
        if (sl === "a") return false;
        if (["l", "t", "i", "b", "p"].includes(sl)) return true; // Leave, Terminated, Inactive, Baja, etc.
      }
      if (["inactive", "inactivo", "leave", "baja", "offboarded", "terminated"].includes(sl)) return true;
    }
    return false;
  }

  /**
   * Filtra el roster para dejar solo empleados en activo (no muestra inactivos).
   */
  filtrarRosterSoloActivos(roster) {
    if (!Array.isArray(roster)) return [];
    return roster.filter((empleado) => !this.esInactivo(empleado));
  }

  /**
   * Guarda un archivo en la primera ruta disponible que funcione
   */
  async guardarEnRutaCompartida(archivo, datos) {
    if (!this.dataPaths || this.dataPaths.length === 0) {
      throw new Error("No hay rutas compartidas configuradas");
    }

    let lastError = null;
    for (const basePath of this.dataPaths) {
      const normalizedBase = this.normalizarRutaWindows(basePath);
      const normalizedPath = normalizedBase.endsWith("\\")
        ? normalizedBase
        : normalizedBase + "\\";
      const filePath = normalizedPath + archivo;

      try {
        const result = await window.api.writeJson(filePath, datos);
        if (result && result.success !== false) {
          if (filePath.startsWith("\\\\")) {
            try {
              const verifyResult = await window.api.readJson(filePath);
              if (verifyResult && verifyResult.success) {
                console.log(`✅ Archivo guardado y verificado en red: ${filePath}`);
                return filePath;
              } else {
                throw new Error("No se pudo verificar el guardado en red");
              }
            } catch (verifyError) {
              console.warn(
                `⚠️ No se pudo verificar guardado en red (${filePath}), intentando siguiente ruta...`
              );
              lastError = new Error("Ruta de red no accesible o no verificable");
              continue;
            }
          } else {
            console.log(`✅ Archivo guardado en: ${filePath}`);
            return filePath;
          }
        } else {
          throw new Error(result?.error || "Error desconocido al guardar");
        }
      } catch (error) {
        console.warn(`⚠️ No se pudo guardar en ${filePath}:`, error.message);
        lastError = error;
        continue;
      }
    }

    throw new Error(
      `No se pudo guardar en ninguna ruta: ${
        lastError?.message || "Error desconocido"
      }`
    );
  }

  async cargarDatos() {
    try {
      // Cargar skillmatrix
      const skillResult = await this.obtenerRutaCompartida("skillmatrix.json");
      if (skillResult) {
        this.skillmatrixData = skillResult.data;
        console.log("✅ Skillmatrix cargada desde:", skillResult.path);
      } else {
        this.skillmatrixData = { usuarios: {}, ultima_actualizacion: null };
        await this.guardarEnRutaCompartida(
          "skillmatrix.json",
          this.skillmatrixData
        );
      }

      // Cargar puestos
      const puestosResult = await this.obtenerRutaCompartida("puestos.json");
      if (puestosResult) {
        this.puestosData = puestosResult.data;
        console.log("✅ Puestos cargados desde:", puestosResult.path);
      } else {
        this.puestosData = { puestos_predefinidos: [], puestos_personalizados: [] };
      }

      // Cargar roster desde el mismo origen que Pizarra (Data_Flow o data_paths); varios formatos; solo activos
      const rosterResult = await this.cargarRosterMismoOrigenPizarra();
      if (rosterResult && rosterResult.roster && rosterResult.roster.length > 0) {
        const raw = rosterResult.roster;
        this.rosterData = this.filtrarRosterSoloActivos(raw);
        console.log(
          `✅ Roster cargado (solo activos): ${this.rosterData.length} de ${raw.length} usuarios desde ${rosterResult.path}`
        );
      } else {
        this.rosterData = [];
        console.warn("⚠️ Roster no encontrado en rutas compartidas (mismo origen que Pizarra)");
      }

      // Fusionar skills desde CSV de certificados (Employee Status=Active, Certificate Status=Earned)
      await this.mergeCertificateSkillsIntoSkillmatrix();

      console.log("✅ Datos cargados correctamente");
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
      throw error;
    }
  }

  configurarEventos() {
    // Búsqueda
    const searchInput = document.getElementById("search-usuario");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.filtrarUsuarios(e.target.value);
      });
    }

    // Filtros
    const filterTurno = document.getElementById("filter-turno");
    const filterPuesto = document.getElementById("filter-puesto");

    if (filterTurno) {
      filterTurno.addEventListener("change", () => {
        this.aplicarFiltros();
      });
    }

    if (filterPuesto) {
      filterPuesto.addEventListener("change", () => {
        this.aplicarFiltros();
      });
    }

    // Modal
    document
      .getElementById("close-modal-skill-matrix")
      .addEventListener("click", () => {
        this.cerrarModal("modal-skill-matrix");
      });
    document.getElementById("cancel-skill-matrix").addEventListener("click", () => {
      this.cerrarModal("modal-skill-matrix");
    });
    document.getElementById("save-skill-matrix").addEventListener("click", () => {
      this.guardarSkillMatrix();
    });
  }

  actualizarListaUsuarios() {
    // Crear mapa de usuarios con información del roster (misma fuente que Pizarra)
    const usuariosMap = new Map();

    // Agregar usuarios del roster (con información de turno); si hay roster, es la fuente de verdad
    if (this.rosterData && this.rosterData.length > 0) {
      this.rosterData.forEach((empleado) => {
        if (empleado.login) {
          const login = empleado.login.toUpperCase();
          const shift = empleado.shift ?? empleado.turno ?? empleado.Turno ?? "Sin turno";
          usuariosMap.set(login, {
            login: login,
            shift: shift || "Sin turno",
            employee_name: empleado.employee_name ?? empleado.name ?? empleado.employeeName ?? "",
          });
        }
      });
    }

    // Solo si no hay roster cargado: añadir usuarios de la skillmatrix como fallback (todos "Sin turno")
    if (usuariosMap.size === 0 && this.skillmatrixData && this.skillmatrixData.usuarios) {
      Object.keys(this.skillmatrixData.usuarios).forEach((login) => {
        const loginUpper = login.toUpperCase();
        usuariosMap.set(loginUpper, {
          login: loginUpper,
          shift: "Sin turno",
          employee_name: "",
        });
      });
    }

    // Convertir a array y crear objetos de usuario completos
    this.usuariosFiltrados = Array.from(usuariosMap.values()).map((usuario) => {
      const skills = this.skillmatrixData?.usuarios?.[usuario.login]?.puestos || {};
      const cantidadSkills = Object.keys(skills).filter(
        (puestoId) => skills[puestoId] === true
      ).length;

      return {
        login: usuario.login,
        shift: usuario.shift,
        employee_name: usuario.employee_name,
        cantidadSkills: cantidadSkills,
        tieneSkills: cantidadSkills > 0,
      };
    });

    // Ordenar por turno y luego por login
    this.usuariosFiltrados.sort((a, b) => {
      // Primero por turno
      const shiftCompare = a.shift.localeCompare(b.shift);
      if (shiftCompare !== 0) return shiftCompare;
      // Luego por login
      return a.login.localeCompare(b.login);
    });

    // Cargar opciones de filtros después de tener los usuarios
    this.cargarOpcionesFiltros();
    this.renderizarUsuarios();
  }

  filtrarUsuarios(termino) {
    // Usar aplicarFiltros para que respete todos los filtros activos
    this.aplicarFiltros();
  }

  cargarOpcionesFiltros() {
    // Cargar turnos únicos
    const turnos = new Set();
    if (this.usuariosFiltrados) {
      this.usuariosFiltrados.forEach((u) => {
        if (u.shift && u.shift !== "Sin turno") {
          turnos.add(u.shift);
        }
      });
    }
    const turnosOrdenados = Array.from(turnos).sort();

    const filterTurno = document.getElementById("filter-turno");
    if (filterTurno) {
      // Mantener la opción "Todos los turnos"
      const todasLasOpciones = filterTurno.querySelector('option[value=""]');
      filterTurno.innerHTML = "";
      if (todasLasOpciones) {
        filterTurno.appendChild(todasLasOpciones);
      } else {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Todos los turnos";
        filterTurno.appendChild(option);
      }

      turnosOrdenados.forEach((turno) => {
        const option = document.createElement("option");
        option.value = turno;
        option.textContent = `Turno ${turno}`;
        filterTurno.appendChild(option);
      });
    }

    // Cargar puestos disponibles (mapper: departamentos[].puestos o legacy: puestos_predefinidos)
    const filterPuesto = document.getElementById("filter-puesto");
    const todosPuestos = this.getTodosLosPuestos();
    if (filterPuesto && todosPuestos.length > 0) {
      const todasLasOpciones = filterPuesto.querySelector('option[value=""]');
      filterPuesto.innerHTML = "";
      if (todasLasOpciones) {
        filterPuesto.appendChild(todasLasOpciones);
      } else {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Todas las formaciones";
        filterPuesto.appendChild(option);
      }

      todosPuestos
        .filter((p) => p.activo !== false)
        .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
        .forEach((puesto) => {
          const option = document.createElement("option");
          option.value = puesto.id;
          option.textContent = puesto.nombre || puesto.id;
          filterPuesto.appendChild(option);
        });
    }
  }

  aplicarFiltros() {
    const filterTurno = document.getElementById("filter-turno")?.value || "";
    const filterPuesto = document.getElementById("filter-puesto")?.value || "";
    const searchTerm = document.getElementById("search-usuario")?.value || "";

    let usuarios = this.usuariosFiltrados || [];

    // Aplicar búsqueda
    if (searchTerm) {
      const terminoLower = searchTerm.toLowerCase().trim();
      usuarios = usuarios.filter((u) => {
        const loginMatch = u.login.toLowerCase().includes(terminoLower);
        const nameMatch = u.employee_name
          ? u.employee_name.toLowerCase().includes(terminoLower)
          : false;
        return loginMatch || nameMatch;
      });
    }

    // Aplicar filtro de turno
    if (filterTurno) {
      usuarios = usuarios.filter((u) => u.shift === filterTurno);
    }

    // Aplicar filtro de puesto
    if (filterPuesto) {
      usuarios = usuarios.filter((u) => {
        const skills = this.skillmatrixData?.usuarios?.[u.login]?.puestos || {};
        return skills[filterPuesto] === true;
      });
    }

    this.renderizarUsuarios(usuarios);
  }

  renderizarUsuarios(usuarios = null) {
    const container = document.getElementById("usuarios-list");
    const totalUsuarios = document.getElementById("total-usuarios");

    const usuariosAMostrar = usuarios || this.usuariosFiltrados || [];

    if (totalUsuarios) {
      totalUsuarios.textContent = usuariosAMostrar.length;
    }

    if (usuariosAMostrar.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><p>No se encontraron usuarios</p></div>';
      return;
    }

    // Agrupar usuarios por turno
    const usuariosPorTurno = {};
    usuariosAMostrar.forEach((usuario) => {
      const turno = usuario.shift || "Sin turno";
      if (!usuariosPorTurno[turno]) {
        usuariosPorTurno[turno] = [];
      }
      usuariosPorTurno[turno].push(usuario);
    });

    // Ordenar turnos (Sin turno al final)
    const turnosOrdenados = Object.keys(usuariosPorTurno).sort((a, b) => {
      if (a === "Sin turno") return 1;
      if (b === "Sin turno") return -1;
      return a.localeCompare(b);
    });

    // Generar HTML agrupado por turno (colapsado por defecto)
    let html = "";
    turnosOrdenados.forEach((turno) => {
      const usuariosDelTurno = usuariosPorTurno[turno];
      const turnoId = `turno-${turno.replace(/\s+/g, "-").toLowerCase()}`;
      const isExpanded = turno === "T4"; // Solo T4 expandido por defecto
      
      html += `
        <div class="turno-section">
          <div class="turno-header" onclick="window.skillMatrixController.toggleTurno('${turnoId}')">
            <div class="turno-header-left">
              <span class="turno-toggle-icon ${isExpanded ? "expanded" : ""}">▼</span>
              <h3>Turno ${turno}</h3>
            </div>
            <span class="turno-count">${usuariosDelTurno.length} usuario${usuariosDelTurno.length !== 1 ? "s" : ""}</span>
          </div>
          <div class="usuarios-grid ${isExpanded ? "" : "collapsed"}" id="${turnoId}">
      `;

      usuariosDelTurno.forEach((usuario) => {
        html += `
          <div class="usuario-card" onclick="window.skillMatrixController.mostrarModalSkillMatrix('${usuario.login}')">
            <div class="usuario-card-header">
              <strong>${usuario.login}</strong>
              <span class="skill-count">${usuario.cantidadSkills}</span>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  toggleTurno(turnoId) {
    const grid = document.getElementById(turnoId);
    if (!grid) return;

    const header = grid.previousElementSibling;
    const icon = header?.querySelector(".turno-toggle-icon");
    
    if (grid.classList.contains("collapsed")) {
      grid.classList.remove("collapsed");
      if (icon) icon.classList.add("expanded");
    } else {
      grid.classList.add("collapsed");
      if (icon) icon.classList.remove("expanded");
    }
  }

  mostrarModalSkillMatrix(login) {
    this.usuarioActualEditando = login.toUpperCase();
    document.getElementById("modal-usuario-login").textContent = login;

    // Obtener todos los puestos (mapper: departamentos[].puestos o legacy)
    const todosLosPuestos = this.getTodosLosPuestos().filter((p) => p.activo !== false);

    // Obtener skills del usuario (estructura optimizada: solo true)
    const skillsUsuario =
      this.skillmatrixData?.usuarios?.[login.toUpperCase()]?.puestos || {};

    // Generar HTML
    let html = "";
    if (todosLosPuestos.length === 0) {
      html = '<div class="empty-state"><p>No hay puestos disponibles</p></div>';
    } else {
      html = '<div class="skill-matrix-grid">';
      todosLosPuestos.forEach((puesto) => {
        const tieneSkill = skillsUsuario[puesto.id] === true;
        const deptoText =
          puesto.departamento_principal && puesto.departamento_secundario
            ? `${puesto.departamento_principal} - ${puesto.departamento_secundario}`
            : (puesto._departamentoNombre || puesto.departamento_principal || "");
        html += `
          <div class="skill-matrix-item">
            <label class="skill-checkbox-label">
              <input
                type="checkbox"
                class="skill-checkbox"
                data-puesto-id="${puesto.id}"
                ${tieneSkill ? "checked" : ""}
              />
              <span class="skill-checkbox-custom"></span>
              <div class="skill-puesto-info">
                <strong>${puesto.nombre || puesto.id}</strong>
                <span class="skill-puesto-depto">${deptoText}</span>
              </div>
            </label>
          </div>
        `;
      });
      html += "</div>";
    }

    document.getElementById("skill-matrix-content").innerHTML = html;
    this.mostrarModal("modal-skill-matrix");
  }

  async guardarSkillMatrix() {
    if (!this.usuarioActualEditando) return;

    const login = this.usuarioActualEditando;

    // Asegurar que existe la estructura
    if (!this.skillmatrixData.usuarios) {
      this.skillmatrixData.usuarios = {};
    }
    if (!this.skillmatrixData.usuarios[login]) {
      this.skillmatrixData.usuarios[login] = { puestos: {} };
    }

    // Obtener checkboxes marcados
    const checkboxes = document.querySelectorAll(
      "#skill-matrix-content .skill-checkbox:checked"
    );

    // Limpiar skills anteriores
    this.skillmatrixData.usuarios[login].puestos = {};

    // Agregar solo los marcados (estructura optimizada: solo true)
    checkboxes.forEach((checkbox) => {
      const puestoId = checkbox.getAttribute("data-puesto-id");
      this.skillmatrixData.usuarios[login].puestos[puestoId] = true;
    });

    this.skillmatrixData.ultima_actualizacion = new Date().toISOString();

    try {
      await this.guardarEnRutaCompartida("skillmatrix.json", this.skillmatrixData);
      this.mostrarToast(`Formaciones actualizadas para ${login}`, "success");
      this.cerrarModal("modal-skill-matrix");
      this.actualizarListaUsuarios();
    } catch (error) {
      console.error("Error guardando skillmatrix:", error);
      this.mostrarToast("Error al guardar las formaciones", "error");
    }
  }

  mostrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = "flex";
    }
  }

  cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = "none";
    }
    this.usuarioActualEditando = null;
  }

  mostrarToast(mensaje, tipo = "info") {
    // Implementación simple de toast
    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensaje;
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 2000;
      animation: toastSlideIn 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "fadeOut 0.3s ease-out";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// SPA: inicializar solo con app:ready (primera carga y al volver).
function initSkillMatrix() {
  if (window.skillMatrixController && typeof window.skillMatrixController.destroy === "function") {
    window.skillMatrixController.destroy();
  }
  window.skillMatrixController = new SkillMatrixController();
}
window.addEventListener("app:ready", (e) => {
  if (e.detail && e.detail.app === "skillmatrix") {
    initSkillMatrix();
  }
});

