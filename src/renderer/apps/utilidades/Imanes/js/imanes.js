/**
 * Imanes Controller
 * Gestión de generación de fichas de imanes para trabajadores
 */

class ImanesController {
  constructor() {
    this.userDataPath = null;
    this.dataPaths = null;
    this.sharedDataPath = null;
    this.rosterData = null;
    this.selectedLogins = new Set();
    this.allLogins = [];
    this.turnos = new Set();
    this.skillmatrixData = null;
    this.libreriasDisponibles = false;
    
    // Colores estándar (del SVG original)
    this.coloresEstandar = {
      turno: "#c2c1c0",      // st6 - gris claro
      login: "#606161",      // st10 - gris oscuro
      variacion: "#3a3838",  // st9 - casi negro
      typeAa: "#29ade4"      // st5 - azul celeste
    };
    
    // Colores personalizados (inician como estándar)
    this.coloresPersonalizados = { ...this.coloresEstandar };
    
    // Modo: false = estándar, true = personalizado
    this.modoColorPersonalizado = false;
    
    // Opción de colorear formaciones
    this.colorearFormaciones = false;

    this.init();
  }

  async init() {
    console.log("🔧 ImanesController inicializando...");
    try {
      // Cargar SVG del banner
      this.cargarBannerSVG();
      
      // Cargar librerías en segundo plano
      this.verificarLibrerias().catch((error) => {
        console.warn("⚠️ Librerías no disponibles:", error);
        this.libreriasDisponibles = false;
      });

      this.userDataPath = await window.api.getUserDataPath();

      const config = await window.api.getConfig();
      if (config?.pizarra_paths?.length > 0) {
        this.dataPaths = config.pizarra_paths;
        this.sharedDataPath = this.normalizarRutaWindows(this.dataPaths[0]);
        if (!this.sharedDataPath.endsWith("\\")) {
          this.sharedDataPath += "\\";
        }
      } else {
        this.sharedDataPath = `${this.userDataPath}\\data\\pizarra`;
        this.dataPaths = [this.sharedDataPath];
      }

      await this.cargarDatos();
      this.configurarEventos();
      this.poblarFiltroTurnos();

      console.log("✅ ImanesController inicializado");
    } catch (error) {
      console.error("❌ Error inicializando:", error);
      this.mostrarToast("Error al inicializar", "error");
    }
  }

  /**
   * Carga el SVG del banner desde assets
   */
  async cargarBannerSVG() {
    try {
      const result = await window.api.readFile("assets/svg/Flow/Iman_plantilla.svg");
      if (result.success) {
        const iconContainer = document.getElementById("header-banner-icon");
        if (iconContainer) {
          // Crear un SVG simplificado para el icono
          iconContainer.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="8" width="18" height="8" rx="1"/>
              <path d="M7 8V6a2 2 0 012-2h6a2 2 0 012 2v2"/>
              <path d="M7 16v2a2 2 0 002 2h6a2 2 0 002-2v-2"/>
            </svg>
          `;
        }
      }
    } catch (error) {
      console.warn("No se pudo cargar el banner SVG:", error);
    }
  }

  /**
   * Carga las librerías necesarias dinámicamente
   */
  async cargarLibrerias() {
    let appPath = null;
    try {
      appPath = await window.api.getAppPath();
    } catch (error) {
      console.warn("⚠️ No se pudo obtener appPath:", error);
    }

    const librerias = [
      {
        name: "bwip-js",
        nodeModulesPath: appPath ? `node_modules/bwip-js/dist/bwip-js-min.js` : null,
        cdnUrl: "https://unpkg.com/bwip-js@4/dist/bwip-js-min.js",
        check: () => typeof bwipjs !== "undefined" && bwipjs.toCanvas,
        alternativeUrl: "https://cdn.jsdelivr.net/npm/bwip-js@4/dist/bwip-js-min.js",
      },
      {
        name: "jsPDF",
        nodeModulesPath: appPath ? `node_modules/jspdf/dist/jspdf.umd.min.js` : null,
        cdnUrl: "https://unpkg.com/jspdf@2/dist/jspdf.umd.min.js",
        check: () => typeof window.jspdf !== "undefined",
        alternativeUrl: "https://cdn.jsdelivr.net/npm/jspdf@2/dist/jspdf.umd.min.js",
      },
      {
        name: "html2canvas",
        nodeModulesPath: appPath ? `node_modules/html2canvas/dist/html2canvas.min.js` : null,
        cdnUrl: "https://unpkg.com/html2canvas@1/dist/html2canvas.min.js",
        check: () => typeof html2canvas !== "undefined",
        alternativeUrl: "https://cdn.jsdelivr.net/npm/html2canvas@1/dist/html2canvas.min.js",
      },
    ];

    for (const lib of librerias) {
      if (lib.check()) {
        console.log(`✅ ${lib.name} ya disponible`);
        continue;
      }

      console.log(`📦 Cargando ${lib.name}...`);
      await new Promise((resolve, reject) => {
        let triedSources = 0;
        const maxSources = 3;
        
        const tryLoad = async (source) => {
          triedSources++;
          let scriptUrl = null;
          
          if (source === "node_modules" && lib.nodeModulesPath && appPath) {
            try {
              const result = await window.api.readFile(lib.nodeModulesPath);
              if (result.success) {
                const blob = new Blob([result.content], { type: "application/javascript" });
                scriptUrl = URL.createObjectURL(blob);
                console.log(`📦 Cargando ${lib.name} desde node_modules...`);
              }
            } catch (error) {
              console.log(`⚠️ ${lib.name} no disponible en node_modules`);
            }
          } else if (source === "cdn") {
            scriptUrl = lib.cdnUrl;
          } else if (source === "alternative") {
            scriptUrl = lib.alternativeUrl;
          }
          
          if (!scriptUrl) {
            if (triedSources < maxSources) {
              if (source === "node_modules") tryLoad("cdn");
              else if (source === "cdn") tryLoad("alternative");
              else reject(new Error(`No se pudo cargar ${lib.name}`));
              return;
            }
            reject(new Error(`No se pudo cargar ${lib.name}`));
            return;
          }
          
          const script = document.createElement("script");
          script.src = scriptUrl;
          script.async = true;
          if (source !== "node_modules") script.crossOrigin = "anonymous";

          script.onload = () => {
            setTimeout(() => {
              if (lib.check()) {
                console.log(`✅ ${lib.name} cargado desde ${source}`);
                if (scriptUrl.startsWith("blob:")) URL.revokeObjectURL(scriptUrl);
                resolve();
              } else {
                if (triedSources < maxSources) {
                  if (source === "node_modules") tryLoad("cdn");
                  else if (source === "cdn") tryLoad("alternative");
                  else reject(new Error(`${lib.name} no se inicializó`));
                } else {
                  reject(new Error(`${lib.name} no se inicializó`));
                }
              }
            }, 100);
          };

          script.onerror = () => {
            if (scriptUrl.startsWith("blob:")) URL.revokeObjectURL(scriptUrl);
            if (triedSources < maxSources) {
              if (source === "node_modules") tryLoad("cdn");
              else if (source === "cdn") tryLoad("alternative");
              else reject(new Error(`Error cargando ${lib.name}`));
            } else {
              reject(new Error(`Error cargando ${lib.name}`));
            }
          };

          document.head.appendChild(script);
        };
        
        tryLoad("node_modules");
      });
    }
  }

  async verificarLibrerias() {
    try {
      await this.cargarLibrerias();
      this.libreriasDisponibles = true;
      console.log("✅ Librerías disponibles");
    } catch (error) {
      console.error("❌ Error cargando librerías:", error);
      this.libreriasDisponibles = false;
    }
  }

  normalizarRutaWindows(ruta) {
    return ruta.replace(/\//g, "\\");
  }

  async obtenerRutaCompartida(archivo) {
    if (!this.dataPaths?.length) return null;

    for (const basePath of this.dataPaths) {
      const normalizedBase = this.normalizarRutaWindows(basePath);
      const normalizedPath = normalizedBase.endsWith("\\") ? normalizedBase : normalizedBase + "\\";
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

  async cargarDatos() {
    try {
      const rosterResult = await this.obtenerRutaCompartida("roster.json");
      if (rosterResult?.data?.roster) {
        this.rosterData = rosterResult.data.roster;
        console.log(`✅ Roster: ${this.rosterData.length} usuarios`);
      } else {
        this.rosterData = [];
        console.warn("⚠️ Roster no encontrado");
      }

      const skillResult = await this.obtenerRutaCompartida("skillmatrix.json");
      if (skillResult) {
        this.skillmatrixData = skillResult.data;
        console.log("✅ Skillmatrix cargada");
      } else {
        this.skillmatrixData = { usuarios: {} };
      }

      if (this.rosterData?.length > 0) {
        this.allLogins = this.rosterData.map((user) => ({
          login: user.login,
          employee_name: user.employee_name,
          shift: user.shift || "N/A",
        }));
        
        // Extraer turnos únicos
        this.turnos = new Set(this.allLogins.map(u => u.shift).filter(Boolean).sort());
      }
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
      throw error;
    }
  }

  /**
   * Rellena el selector de turnos
   */
  poblarFiltroTurnos() {
    const select = document.getElementById("turno-select");
    if (!select) return;

    select.innerHTML = '<option value="">Todos los turnos</option>';
    for (const turno of this.turnos) {
      select.innerHTML += `<option value="${turno}">${turno}</option>`;
    }
  }

  configurarEventos() {
    // Autocompletado de búsqueda
    const searchInput = document.getElementById("search-login");
    const autocompleteList = document.getElementById("autocomplete-list");
    
    if (searchInput && autocompleteList) {
      searchInput.addEventListener("input", (e) => {
        this.mostrarAutocompletado(e.target.value);
      });

      searchInput.addEventListener("focus", () => {
        if (searchInput.value.length >= 2) {
          this.mostrarAutocompletado(searchInput.value);
        }
      });

      // Cerrar autocompletado al hacer clic fuera
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-wrapper")) {
          autocompleteList.classList.remove("show");
        }
      });
    }

    // Filtro por turno
    const turnoSelect = document.getElementById("turno-select");
    if (turnoSelect) {
      turnoSelect.addEventListener("change", () => {
        // Limpiar búsqueda al cambiar turno
        if (searchInput) searchInput.value = "";
        autocompleteList?.classList.remove("show");
      });
    }

    // Botón agregar turno completo
    const btnAgregarTurno = document.getElementById("btn-agregar-turno");
    if (btnAgregarTurno) {
      btnAgregarTurno.addEventListener("click", () => this.agregarTurnoCompleto());
    }

    // Toggle colorear formaciones
    const toggleFormaciones = document.getElementById("toggle-colorear-formaciones");
    if (toggleFormaciones) {
      toggleFormaciones.addEventListener("change", (e) => {
        this.colorearFormaciones = e.target.checked;
        console.log("🎨 Colorear formaciones:", this.colorearFormaciones ? "Sí" : "No");
      });
    }

    // Toggle color estándar/personalizado
    const toggleColorPersonalizado = document.getElementById("toggle-color-personalizado");
    const labelModoColor = document.getElementById("label-modo-color");
    const customizationPanel = document.getElementById("customization-panel");
    
    if (toggleColorPersonalizado) {
      toggleColorPersonalizado.addEventListener("change", (e) => {
        this.modoColorPersonalizado = e.target.checked;
        
        // Actualizar label
        if (labelModoColor) {
          labelModoColor.textContent = this.modoColorPersonalizado ? "Personalizado" : "Estándar";
        }
        
        // Mostrar/ocultar panel de colores
        if (customizationPanel) {
          customizationPanel.style.display = this.modoColorPersonalizado ? "block" : "none";
        }
        
        console.log("🎨 Modo color:", this.modoColorPersonalizado ? "Personalizado" : "Estándar");
      });
    }

    // Botones principales
    document.getElementById("btn-limpiar-seleccion")?.addEventListener("click", () => this.limpiarSeleccion());
    document.getElementById("btn-generar-preview")?.addEventListener("click", () => this.generarPreview());
    document.getElementById("btn-exportar-pdf")?.addEventListener("click", () => this.exportarPDF());

    // Toggle personalización
    const btnToggleCustomization = document.getElementById("btn-toggle-customization-main");
    if (btnToggleCustomization) {
      btnToggleCustomization.addEventListener("click", () => this.toggleCustomizationPanel());
    }

    const customizationHeader = document.querySelector(".customization-header");
    if (customizationHeader) {
      customizationHeader.addEventListener("click", () => this.toggleCustomizationContent());
    }

    // Inputs de color
    this.configurarEventosColores();
  }

  /**
   * Configura los eventos de los selectores de color
   */
  configurarEventosColores() {
    const colorInputs = {
      "color-turno": "turno",
      "color-login": "login",
      "color-variacion": "variacion",
      "color-type-aa": "typeAa"
    };

    for (const [inputId, colorKey] of Object.entries(colorInputs)) {
      const input = document.getElementById(inputId);
      if (input) {
        input.value = this.coloresPersonalizados[colorKey];
        input.addEventListener("change", (e) => {
          this.coloresPersonalizados[colorKey] = e.target.value;
          console.log(`🎨 Color ${colorKey} cambiado a: ${e.target.value}`);
        });
      }
    }
  }

  /**
   * Obtiene los colores a usar según el modo
   */
  obtenerColoresActuales() {
    return this.modoColorPersonalizado ? this.coloresPersonalizados : this.coloresEstandar;
  }

  /**
   * Muestra sugerencias de autocompletado
   */
  mostrarAutocompletado(texto) {
    const autocompleteList = document.getElementById("autocomplete-list");
    if (!autocompleteList) return;

    const textoLower = texto.toLowerCase().trim();
    
    if (textoLower.length < 2) {
      autocompleteList.classList.remove("show");
      return;
    }

    // Filtrar por turno si está seleccionado
    const turnoSelect = document.getElementById("turno-select");
    const turnoFiltro = turnoSelect?.value || "";

    let filtrados = this.allLogins.filter(user => {
      const coincideBusqueda = user.login.toLowerCase().includes(textoLower) ||
                                user.employee_name.toLowerCase().includes(textoLower);
      const coincideTurno = !turnoFiltro || user.shift === turnoFiltro;
      const noSeleccionado = !this.selectedLogins.has(user.login);
      return coincideBusqueda && coincideTurno && noSeleccionado;
    });

    // Limitar a 10 resultados
    filtrados = filtrados.slice(0, 10);

    if (filtrados.length === 0) {
      autocompleteList.innerHTML = '<div class="autocomplete-item"><span class="name">No se encontraron resultados</span></div>';
      autocompleteList.classList.add("show");
      return;
    }

    autocompleteList.innerHTML = filtrados.map(user => `
      <div class="autocomplete-item" data-login="${user.login}">
        <span class="login">${user.login}</span>
        <span class="name">${user.employee_name} - ${user.shift}</span>
      </div>
    `).join("");

    // Event listeners para seleccionar
    autocompleteList.querySelectorAll(".autocomplete-item[data-login]").forEach(item => {
      item.addEventListener("click", () => {
        const login = item.dataset.login;
        this.agregarLogin(login);
        document.getElementById("search-login").value = "";
        autocompleteList.classList.remove("show");
      });
    });

    autocompleteList.classList.add("show");
  }

  /**
   * Agrega un login a la selección
   */
  agregarLogin(login) {
    if (!this.selectedLogins.has(login)) {
      this.selectedLogins.add(login);
      this.actualizarBarraSeleccion();
    }
  }

  /**
   * Agrega todos los logins de un turno
   */
  agregarTurnoCompleto() {
    const turnoSelect = document.getElementById("turno-select");
    const turno = turnoSelect?.value;

    if (!turno) {
      this.mostrarToast("Selecciona un turno primero", "warning");
      return;
    }

    const loginsDelTurno = this.allLogins.filter(u => u.shift === turno);
    let agregados = 0;

    for (const user of loginsDelTurno) {
      if (!this.selectedLogins.has(user.login)) {
        this.selectedLogins.add(user.login);
        agregados++;
      }
    }

    this.actualizarBarraSeleccion();
    this.mostrarToast(`${agregados} logins del turno ${turno} agregados`, "success");
  }

  /**
   * Actualiza la barra de selección con chips compactos
   */
  actualizarBarraSeleccion() {
    const selectedBar = document.getElementById("selected-bar");
    const selectedList = document.getElementById("selected-logins-list");
    const selectedCount = document.getElementById("selected-count");
    const exportBtn = document.getElementById("btn-exportar-pdf");

    if (!selectedBar || !selectedList || !selectedCount) return;

    selectedCount.textContent = this.selectedLogins.size;
    exportBtn.disabled = this.selectedLogins.size === 0;

    if (this.selectedLogins.size === 0) {
      selectedBar.style.display = "none";
      return;
    }

    selectedBar.style.display = "flex";

    selectedList.innerHTML = Array.from(this.selectedLogins).map(login => `
      <div class="selected-chip">
        <span>${login}</span>
        <span class="remove" data-login="${login}">×</span>
      </div>
    `).join("");

    // Event listeners para eliminar
    selectedList.querySelectorAll(".remove").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const login = e.target.dataset.login;
        this.selectedLogins.delete(login);
        this.actualizarBarraSeleccion();
      });
    });
  }

  limpiarSeleccion() {
    this.selectedLogins.clear();
    this.actualizarBarraSeleccion();
    // Limpiar preview
    const previewContainer = document.getElementById("imanes-preview");
    if (previewContainer) {
      previewContainer.innerHTML = '<div class="empty-preview"><p>Busca y selecciona logins para generar imanes</p></div>';
    }
  }

  obtenerDatosUsuario(login) {
    return this.rosterData.find((u) => u.login === login);
  }

  obtenerFormacionesUsuario(login) {
    if (!this.skillmatrixData?.usuarios) return [];
    const usuario = this.skillmatrixData.usuarios[login];
    if (!usuario?.formaciones) return [];
    return Object.entries(usuario.formaciones)
      .filter(([_, tiene]) => tiene === true)
      .map(([formacion, _]) => formacion);
  }

  async generarDataMatrix(login) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50;
      
      const checkBwipjs = () => {
        attempts++;
        
        if (typeof bwipjs !== "undefined" && bwipjs.toCanvas) {
          try {
            const canvas = document.createElement("canvas");
            bwipjs.toCanvas(canvas, {
              bcid: "datamatrix",
              text: login,
              scale: 4,
              includetext: false,
            });
            resolve(canvas.toDataURL("image/png"));
          } catch (error) {
            console.error("❌ Error generando DataMatrix:", error);
            reject(error);
          }
        } else if (attempts >= maxAttempts) {
          reject(new Error("bwip-js no se cargó"));
        } else {
          setTimeout(checkBwipjs, 100);
        }
      };
      checkBwipjs();
    });
  }

  async cargarPlantillaSVG() {
    try {
      const result = await window.api.readFile("assets/svg/Flow/Iman_plantilla.svg");
      if (!result.success) {
        throw new Error(result.error || "No se pudo cargar la plantilla SVG");
      }
      return result.content;
    } catch (error) {
      console.error("❌ Error cargando plantilla SVG:", error);
      throw error;
    }
  }

  async rellenarSVG(usuario, formaciones) {
    try {
      const svgTemplate = await this.cargarPlantillaSVG();
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgTemplate, "image/svg+xml");
      const svg = svgDoc.documentElement;

      const nombreCompleto = usuario.employee_name || "";
      const partes = nombreCompleto.split(",");
      const apellidos = partes[0]?.trim() || "";
      const nombres = partes[1]?.trim() || "";

      // Actualizar textos
      this.actualizarElementoSVG(svg, "Nombres", nombres);
      this.actualizarElementoSVG(svg, "Apellidos", apellidos);
      this.actualizarElementoSVG(svg, "Login", usuario.login);
      this.actualizarElementoSVG(svg, "Turno", usuario.shift || "N/A");

      // Aplicar colores según el modo (estándar o personalizado)
      // Nota: El SVG tiene "TrunoColor" (sin la 'u' de Turno) - es una errata en el SVG original
      const colores = this.obtenerColoresActuales();
      this.aplicarColorElemento(svg, "TrunoColor", colores.turno);
      this.aplicarColorElemento(svg, "LoginColor", colores.login);
      this.aplicarColorElemento(svg, "VariacionColor", colores.variacion);
      this.aplicarColorElemento(svg, "Type_x5F_aa", colores.typeAa);

      // Generar y actualizar DataMatrix
      const datamatrixDataUrl = await this.generarDataMatrix(usuario.login);
      const qrRect = svg.querySelector("#QR");
      if (qrRect) {
        const datamatrixImage = svgDoc.createElementNS("http://www.w3.org/2000/svg", "image");
        datamatrixImage.setAttribute("href", datamatrixDataUrl);
        datamatrixImage.setAttribute("x", qrRect.getAttribute("x"));
        datamatrixImage.setAttribute("y", qrRect.getAttribute("y"));
        datamatrixImage.setAttribute("width", qrRect.getAttribute("width"));
        datamatrixImage.setAttribute("height", qrRect.getAttribute("height"));
        datamatrixImage.setAttribute("preserveAspectRatio", "xMidYMid meet");
        qrRect.parentNode.replaceChild(datamatrixImage, qrRect);
      }

      // Actualizar formaciones (FN_1 a FN_25 y FNC_1 a FNC_25)
      // Los IDs en el SVG usan _x5F_ en lugar de _ (encoding de Illustrator)
      for (let i = 1; i <= 25; i++) {
        const formacion = formaciones[i - 1] || "";
        this.actualizarElementoSVG(svg, `FN_x5F_${i}`, formacion);

        // Solo colorear si la opción está activada
        if (this.colorearFormaciones) {
          const colorRect = svg.querySelector(`#FNC_x5F_${i}`);
          if (colorRect) {
            colorRect.removeAttribute("class");
            colorRect.setAttribute("fill", formacion ? "#4ade80" : "#9ca3af");
            colorRect.style.fill = formacion ? "#4ade80" : "#9ca3af";
          }
        }
      }

      const serializer = new XMLSerializer();
      return serializer.serializeToString(svg);
    } catch (error) {
      console.error("Error rellenando SVG:", error);
      throw error;
    }
  }

  /**
   * Aplica color a un elemento del SVG
   * Usa style inline para sobrescribir las clases CSS del SVG
   */
  aplicarColorElemento(svg, id, color) {
    const idVariants = [id, id.replace(/_/g, "_x5F_"), id.replace(/_x5F_/g, "_")];
    
    for (const variantId of idVariants) {
      const elemento = svg.querySelector(`#${variantId}`);
      if (elemento) {
        // Para rectángulos o elementos con fill - usar style para sobrescribir CSS
        if (elemento.tagName === "rect" || elemento.tagName === "path" || elemento.tagName === "circle") {
          elemento.removeAttribute("class"); // Quitar clase para evitar conflicto
          elemento.setAttribute("fill", color);
          elemento.style.fill = color; // También style para asegurar
        }
        // Para grupos, buscar hijos
        else if (elemento.tagName === "g") {
          const hijo = elemento.querySelector("rect, path, circle");
          if (hijo) {
            hijo.removeAttribute("class");
            hijo.setAttribute("fill", color);
            hijo.style.fill = color;
          }
        }
        console.log(`🎨 Color aplicado a ${variantId}: ${color}`);
        return;
      }
    }
    console.warn(`⚠️ Elemento no encontrado: ${id}`);
  }

  actualizarElementoSVG(svg, id, texto) {
    const idVariants = [id, id.replace(/_/g, "_x5F_"), id.replace(/_x5F_/g, "_")];

    for (const variantId of idVariants) {
      const elemento = svg.querySelector(`#${variantId}`);
      if (elemento) {
        if (elemento.tagName === "g") {
          const textElement = elemento.querySelector("text");
          if (textElement) {
            const tspan = textElement.querySelector("tspan");
            if (tspan) tspan.textContent = texto;
            else textElement.textContent = texto;
            return;
          }
        } else {
          const tspan = elemento.querySelector("tspan");
          if (tspan) tspan.textContent = texto;
          else elemento.textContent = texto;
          return;
        }
      }
    }
  }

  async generarPreview() {
    if (this.selectedLogins.size === 0) {
      this.mostrarToast("Selecciona al menos un login", "warning");
      return;
    }

    if (!this.libreriasDisponibles) {
      this.mostrarToast("Cargando librerías...", "info");
      try {
        await this.verificarLibrerias();
        if (!this.libreriasDisponibles) {
          this.mostrarToast("No se pudieron cargar las librerías", "error");
          return;
        }
      } catch (error) {
        this.mostrarToast("Error al cargar librerías", "error");
        return;
      }
    }

    const previewContainer = document.getElementById("imanes-preview");
    previewContainer.innerHTML = '<div class="loading">Generando imanes...</div>';

    try {
      const imanesHTML = [];

      for (const login of this.selectedLogins) {
        const usuario = this.obtenerDatosUsuario(login);
        if (!usuario) continue;

        const formaciones = this.obtenerFormacionesUsuario(login);
        const svgRellenado = await this.rellenarSVG(usuario, formaciones);

        imanesHTML.push(`
          <div class="iman-preview-item">
            <div class="iman-svg-container">
              ${svgRellenado}
            </div>
            <div class="iman-info">${usuario.login}</div>
          </div>
        `);
      }

      previewContainer.innerHTML = imanesHTML.join("");
      this.mostrarToast(`${this.selectedLogins.size} imanes generados`, "success");
    } catch (error) {
      console.error("❌ Error:", error);
      previewContainer.innerHTML = '<div class="error">Error al generar imanes</div>';
      this.mostrarToast("Error al generar imanes", "error");
    }
  }

  async exportarPDF() {
    if (this.selectedLogins.size === 0) {
      this.mostrarToast("Selecciona al menos un login", "warning");
      return;
    }

    this.mostrarToast("Generando PDF...", "info");

    try {
      const previewContainer = document.getElementById("imanes-preview");
      const hasPreview = previewContainer.querySelector(".iman-preview-item");
      
      if (!hasPreview) {
        await this.generarPreview();
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const IMAN_WIDTH = 117;
      const IMAN_HEIGHT = 31.8;
      const SEPARACION = 2;
      const COLUMNAS = 2;
      const FILAS = 5;
      const IMANES_POR_PAGINA = COLUMNAS * FILAS;

      const PAGE_WIDTH = 297;
      const PAGE_HEIGHT = 210;

      const CONTENT_WIDTH = (IMAN_WIDTH * COLUMNAS) + (SEPARACION * (COLUMNAS - 1));
      const CONTENT_HEIGHT = (IMAN_HEIGHT * FILAS) + (SEPARACION * (FILAS - 1));
      const MARGIN_LEFT = (PAGE_WIDTH - CONTENT_WIDTH) / 2;
      const MARGIN_TOP = (PAGE_HEIGHT - CONTENT_HEIGHT) / 2;

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const imanesItems = previewContainer.querySelectorAll(".iman-preview-item");
      const totalImanes = imanesItems.length;

      let imanIndex = 0;
      let paginaActual = 0;

      while (imanIndex < totalImanes) {
        if (paginaActual > 0) pdf.addPage();

        for (let fila = 0; fila < FILAS && imanIndex < totalImanes; fila++) {
          for (let col = 0; col < COLUMNAS && imanIndex < totalImanes; col++) {
            const item = imanesItems[imanIndex];
            const svgContainer = item.querySelector(".iman-svg-container");

            if (svgContainer) {
              const canvas = await html2canvas(svgContainer, {
                backgroundColor: "#ffffff",
                scale: 3,
              });

              const imgData = canvas.toDataURL("image/png");
              const x = MARGIN_LEFT + (col * (IMAN_WIDTH + SEPARACION));
              const y = MARGIN_TOP + (fila * (IMAN_HEIGHT + SEPARACION));
              
              pdf.addImage(imgData, "PNG", x, y, IMAN_WIDTH, IMAN_HEIGHT);
            }

            imanIndex++;
          }
        }
        paginaActual++;
      }

      const nombreArchivo = `imanes_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(nombreArchivo);

      this.mostrarToast(`PDF: ${totalImanes} imanes en ${paginaActual} página(s)`, "success");
    } catch (error) {
      console.error("Error exportando PDF:", error);
      this.mostrarToast("Error al exportar PDF", "error");
    }
  }

  mostrarToast(mensaje, tipo = "info") {
    const toast = document.getElementById("toast-notification");
    if (!toast) return;

    toast.textContent = mensaje;
    toast.className = `toast toast-${tipo}`;
    toast.style.display = "block";

    setTimeout(() => {
      toast.style.display = "none";
    }, 3000);
  }
}

// Inicializar
let imanesController;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    imanesController = new ImanesController();
    window.imanesController = imanesController;
  });
} else {
  imanesController = new ImanesController();
  window.imanesController = imanesController;
}
