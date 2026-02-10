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

      // Obtener rutas compartidas desde config
      const config = await window.api.getConfig();
      if (
        config &&
        config.pizarra_paths &&
        Array.isArray(config.pizarra_paths) &&
        config.pizarra_paths.length > 0
      ) {
        this.dataPaths = config.pizarra_paths;
        this.sharedDataPath = this.normalizarRutaWindows(this.dataPaths[0]);
        if (!this.sharedDataPath.endsWith("\\")) {
          this.sharedDataPath += "\\";
        }
        console.log("📁 Shared Data Paths:", this.dataPaths);
        console.log("📁 Shared Data Path:", this.sharedDataPath);
      } else {
        console.warn(
          "⚠️ No se encontraron pizarra_paths en config, usando userDataPath como fallback"
        );
        this.sharedDataPath = `${this.userDataPath}\\data\\skillmatrix`;
        this.dataPaths = [this.sharedDataPath];
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
   * Obtiene la ruta compartida para un archivo
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
        if (result.success) {
          return { path: filePath, data: result.data, basePath: normalizedPath };
        }
      } catch (error) {
        continue;
      }
    }

    return null;
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

      // Cargar roster
      const rosterResult = await this.obtenerRutaCompartida("roster.json");
      if (rosterResult && rosterResult.data && rosterResult.data.roster) {
        this.rosterData = rosterResult.data.roster;
        console.log(`✅ Roster cargado: ${this.rosterData.length} usuarios`);
      } else {
        this.rosterData = [];
        console.warn("⚠️ Roster no encontrado");
      }

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
    // Crear mapa de usuarios con información del roster
    const usuariosMap = new Map();

    // Agregar usuarios del roster (con información de turno)
    if (this.rosterData && this.rosterData.length > 0) {
      this.rosterData.forEach((empleado) => {
        if (empleado.login) {
          const login = empleado.login.toUpperCase();
          usuariosMap.set(login, {
            login: login,
            shift: empleado.shift || "Sin turno",
            employee_name: empleado.employee_name || "",
          });
        }
      });
    }

    // Agregar usuarios de la skillmatrix (si no están en el roster)
    if (this.skillmatrixData && this.skillmatrixData.usuarios) {
      Object.keys(this.skillmatrixData.usuarios).forEach((login) => {
        const loginUpper = login.toUpperCase();
        if (!usuariosMap.has(loginUpper)) {
          usuariosMap.set(loginUpper, {
            login: loginUpper,
            shift: "Sin turno",
            employee_name: "",
          });
        }
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

    // Cargar puestos disponibles
    const filterPuesto = document.getElementById("filter-puesto");
    if (filterPuesto && this.puestosData && this.puestosData.puestos_predefinidos) {
      // Mantener la opción "Todas las formaciones"
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

      this.puestosData.puestos_predefinidos
        .filter((p) => p.activo)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .forEach((puesto) => {
          const option = document.createElement("option");
          option.value = puesto.id;
          option.textContent = puesto.nombre;
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

    // Obtener todos los puestos
    const todosLosPuestos = [
      ...(this.puestosData?.puestos_predefinidos || []).filter((p) => p.activo),
      ...(this.puestosData?.puestos_personalizados || []).filter((p) => p.activo),
    ];

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
                <strong>${puesto.nombre}</strong>
                <span class="skill-puesto-depto">${puesto.departamento_principal} - ${puesto.departamento_secundario}</span>
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

