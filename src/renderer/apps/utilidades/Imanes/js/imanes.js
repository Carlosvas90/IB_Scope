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
    
    // Colores por turno (cargados desde JSON)
    this.coloresPorTurno = null;
    
    // Estilos de texto globales (iguales para todos los turnos)
    this.estilosTextoGlobales = null;
    
    // Nombres de formaciones (FN_1 a FN_25) cargados desde JSON
    this.nombresFormaciones = null;
    
    // Navegación en autocompletado
    this.autocompleteIndex = -1;
    this.currentAutocompleteItems = [];
    
    // Turnos temporales asignados (para usuarios sin turno)
    this.turnosTemporales = new Map(); // Map<login, turno>
    
    // Colores estándar (del SVG original) - fallback si no hay colores por turno
    this.coloresEstandar = {
      turno: "#c2c1c0",      // st6 - gris claro
      login: "#606161",      // st10 - gris oscuro
      variacion: "#3a3838",  // st9 - casi negro
      typeAa: "#29ade4",     // st5 - azul celeste
      loginText: "#FFFFFF",
      turnoText: "#000000"
    };
    
    // Colores personalizados (inician como estándar)
    this.coloresPersonalizados = { ...this.coloresEstandar };
    
    // Modo: false = estándar (por turno), true = personalizado
    this.modoColorPersonalizado = false;
    
    // Opción de colorear formaciones
    this.colorearFormaciones = false;

    this.init();
  }

  /**
   * Muestra el contenido cuando el CSS esté cargado
   */
  mostrarContenidoCuandoListo() {
    const container = document.getElementById("imanes-container");
    const loader = document.getElementById("imanes-loader");
    
    // Función para mostrar el contenido y ocultar el loader
    const mostrarContenido = () => {
      if (container) {
        container.classList.add("css-loaded");
      }
      if (loader) {
        // Ocultar el loader inmediatamente
        loader.classList.add("hidden");
        // También forzar ocultación con estilos inline
        setTimeout(() => {
          loader.style.display = "none";
          loader.style.visibility = "hidden";
          loader.style.opacity = "0";
          loader.style.pointerEvents = "none";
        }, 300);
      }
    };
    
    // Función para verificar si el CSS está cargado
    const verificarCSS = () => {
      // Verificar si hay un link de stylesheet para imanes
      const cssLink = document.querySelector('link[href*="imanes.css"]');
      
      if (cssLink) {
        // Verificar si el stylesheet está cargado
        try {
          if (cssLink.sheet) {
            // CSS cargado
            mostrarContenido();
            return true;
          }
        } catch (e) {
          // En algunos navegadores puede fallar, continuar
        }
      }
      
      // Verificar por estilos aplicados (más confiable)
      if (container) {
        try {
          const styles = window.getComputedStyle(container);
          // Verificar si tiene estilos aplicados (no solo los inline)
          const display = styles.display;
          const padding = styles.padding;
          
          // Si tiene padding o display diferente de none, probablemente el CSS está cargado
          if (padding && padding !== '0px' && display && display !== 'none') {
            mostrarContenido();
            return true;
          }
        } catch (e) {
          // Continuar intentando
        }
      }
      
      return false;
    };
    
    // Escuchar cuando se carga un stylesheet
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    links.forEach(link => {
      if (link.href && link.href.includes('imanes.css')) {
        link.addEventListener('load', () => {
          setTimeout(mostrarContenido, 100);
        });
        link.addEventListener('error', () => {
          // Si falla, mostrar de todas formas después de un tiempo
          setTimeout(mostrarContenido, 500);
        });
      }
    });
    
    // Verificar periódicamente
    let intentos = 0;
    const maxIntentos = 30; // 3 segundos máximo
    
    const intervalo = setInterval(() => {
      intentos++;
      if (verificarCSS() || intentos >= maxIntentos) {
        clearInterval(intervalo);
        // Asegurar que se muestre incluso si el CSS tarda
        if (intentos >= maxIntentos) {
          mostrarContenido();
        }
      }
    }, 100);
    
    // También verificar cuando el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          if (!verificarCSS()) {
            // Si aún no está listo, seguir verificando
          }
        }, 150);
      });
    } else {
      setTimeout(() => {
        verificarCSS();
      }, 150);
    }
  }

  async init() {
    console.log("🔧 ImanesController inicializando...");
    
    // Mostrar contenido cuando CSS esté cargado
    this.mostrarContenidoCuandoListo();
    
    // Marcar preview como inicializando
    this.marcarPreviewInicializando();
    
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
      
      // Marcar que los eventos están configurados
      const searchInput = document.getElementById("search-login");
      if (searchInput) {
        searchInput.setAttribute('data-events-configured', 'true');
      }

      // Marcar preview como listo
      this.marcarPreviewListo();
      
      // Asegurar que el loader se oculte cuando todo esté listo
      this.ocultarLoader();
      
      console.log("✅ ImanesController inicializado");
    } catch (error) {
      console.error("❌ Error inicializando:", error);
      this.mostrarToast("Error al inicializar", "error");
      // Mostrar preview incluso si hay error
      try {
        this.marcarPreviewListo();
        this.ocultarLoader();
      } catch (e) {
        console.error("Error al marcar preview como listo:", e);
      }
    }
  }

  /**
   * Oculta el loader inicial
   */
  ocultarLoader() {
    const loader = document.getElementById("imanes-loader");
    if (loader) {
      loader.classList.add("hidden");
      // También forzar ocultación con estilos inline por si acaso
      setTimeout(() => {
        loader.style.display = "none";
        loader.style.visibility = "hidden";
        loader.style.opacity = "0";
      }, 400);
    }
  }

  /**
   * Marca el preview como inicializando
   */
  marcarPreviewInicializando() {
    const previewSection = document.getElementById("preview-section");
    const previewContainer = document.getElementById("imanes-preview");
    
    if (previewSection) {
      previewSection.classList.add("initializing");
      previewSection.classList.remove("ready");
      // Forzar ocultación con estilos inline
      previewSection.style.opacity = "0";
      previewSection.style.pointerEvents = "none";
    }
    
    if (previewContainer) {
      // No mostrar spinner en el preview, solo mensaje simple
      previewContainer.innerHTML = `
        <div class="empty-preview">
          <p>Busca y selecciona logins para generar imanes</p>
        </div>
      `;
      // Ocultar cualquier SVG que pueda estar presente
      const svgs = previewContainer.querySelectorAll("svg");
      svgs.forEach(svg => {
        svg.style.display = "none";
        svg.style.visibility = "hidden";
        svg.style.opacity = "0";
        svg.style.width = "0";
        svg.style.height = "0";
        svg.style.maxWidth = "0";
        svg.style.maxHeight = "0";
      });
    }
  }

  /**
   * Marca el preview como listo y muestra el estado vacío
   */
  marcarPreviewListo() {
    const previewSection = document.getElementById("preview-section");
    const previewContainer = document.getElementById("imanes-preview");
    
    if (previewSection) {
      previewSection.classList.remove("initializing");
      previewSection.classList.add("ready");
      // Restaurar visibilidad
      previewSection.style.opacity = "";
      previewSection.style.pointerEvents = "";
    }
    
    if (previewContainer) {
      // Solo cambiar a estado vacío si no hay contenido
      const currentContent = previewContainer.innerHTML.trim();
      if (currentContent.includes("initializing-preview") || currentContent === "") {
        previewContainer.innerHTML = `
          <div class="empty-preview">
            <p>Busca y selecciona logins para generar imanes</p>
          </div>
        `;
      }
    }
  }

  /**
   * Limpia eventos y recursos al destruir la instancia
   */
  destroy() {
    // Remover event listeners si es necesario
    const searchInput = document.getElementById("search-login");
    if (searchInput) {
      const newInput = searchInput.cloneNode(true);
      searchInput.parentNode.replaceChild(newInput, searchInput);
    }
    
    // Limpiar otros event listeners si los hay
    // Por ahora solo limpiamos el estado
    this.selectedLogins.clear();
    this.turnosTemporales.clear();
  }

  /**
   * Carga el SVG del banner desde assets
   */
  async cargarBannerSVG() {
    try {
      const iconContainer = document.getElementById("header-banner-icon");
      if (!iconContainer) return;
      
      // Ocultar el contenedor hasta que esté listo
      iconContainer.style.opacity = "0";
      iconContainer.style.visibility = "hidden";
      
      const result = await window.api.readFile("assets/svg/Flow/Iman_plantilla.svg");
      if (result.success) {
        // Crear un SVG simplificado para el icono con dimensiones fijas
        iconContainer.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28" style="width: 28px; height: 28px; max-width: 28px; max-height: 28px;">
            <rect x="3" y="8" width="18" height="8" rx="1"/>
            <path d="M7 8V6a2 2 0 012-2h6a2 2 0 012 2v2"/>
            <path d="M7 16v2a2 2 0 002 2h6a2 2 0 002-2v-2"/>
          </svg>
        `;
        
        // Mostrar con transición suave
        setTimeout(() => {
          iconContainer.style.opacity = "1";
          iconContainer.style.visibility = "visible";
          iconContainer.classList.add("ready");
        }, 100);
      } else {
        // Si no se puede cargar, ocultar completamente
        iconContainer.style.display = "none";
      }
    } catch (error) {
      console.warn("No se pudo cargar el banner SVG:", error);
      const iconContainer = document.getElementById("header-banner-icon");
      if (iconContainer) {
        iconContainer.style.display = "none";
      }
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

  /**
   * Obtiene la ruta del roster.json desde data_paths (no desde pizarra_paths)
   * El roster siempre está en Data/, no en Data_Flow/
   */
  async obtenerRutaRoster() {
    const config = await window.api.getConfig();
    const rosterPaths = config?.data_paths || [];

    if (rosterPaths.length === 0) {
      return null;
    }

    for (const basePath of rosterPaths) {
      const normalizedBase = this.normalizarRutaWindows(basePath);
      const normalizedPath = normalizedBase.endsWith("\\") ? normalizedBase : normalizedBase + "\\";
      const filePath = normalizedPath + "roster.json";

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
   * Carga los colores por turno y estilos globales desde Data_Flow/imanes-colores.json
   */
  async cargarColoresPorTurno() {
    try {
      const coloresResult = await this.obtenerRutaCompartida("imanes-colores.json");
      if (coloresResult?.data) {
        // Separar colores por turno y estilos globales
        const { globalTextStyles, ...coloresPorTurno } = coloresResult.data;
        
        this.coloresPorTurno = coloresPorTurno;
        this.estilosTextoGlobales = globalTextStyles || null;
        
        console.log("✅ Colores por turno cargados correctamente");
        if (this.estilosTextoGlobales) {
          console.log("✅ Estilos de texto globales cargados correctamente");
        }
      } else {
        console.warn("⚠️ Archivo imanes-colores.json no encontrado, usando colores estándar");
        this.coloresPorTurno = null;
        this.estilosTextoGlobales = null;
      }
    } catch (error) {
      console.warn("⚠️ Error cargando colores por turno:", error);
      this.coloresPorTurno = null;
      this.estilosTextoGlobales = null;
    }
  }

  /**
   * Carga los nombres de formaciones desde Data_Flow/imanes-formaciones.json
   */
  async cargarNombresFormaciones() {
    try {
      const formacionesResult = await this.obtenerRutaCompartida("imanes-formaciones.json");
      if (formacionesResult?.data) {
        this.nombresFormaciones = formacionesResult.data;
        console.log("✅ Nombres de formaciones cargados correctamente");
      } else {
        console.warn("⚠️ Archivo imanes-formaciones.json no encontrado, usando nombres por defecto");
        this.nombresFormaciones = null;
      }
    } catch (error) {
      console.warn("⚠️ Error cargando nombres de formaciones:", error);
      this.nombresFormaciones = null;
    }
  }

  async cargarDatos() {
    try {
      // Cargar roster desde data_paths (no desde pizarra_paths)
      const rosterResult = await this.obtenerRutaRoster();
      if (rosterResult?.data?.roster) {
        this.rosterData = rosterResult.data.roster;
        console.log(`✅ Roster cargado desde: ${rosterResult.path} (${this.rosterData.length} usuarios)`);
      } else {
        this.rosterData = [];
        console.warn("⚠️ Roster no encontrado en data_paths");
      }

      const skillResult = await this.obtenerRutaCompartida("skillmatrix.json");
      if (skillResult) {
        this.skillmatrixData = skillResult.data;
        console.log("✅ Skillmatrix cargada");
      } else {
        this.skillmatrixData = { usuarios: {} };
      }

      // Cargar colores por turno desde Data_Flow
      await this.cargarColoresPorTurno();
      
      // Cargar nombres de formaciones desde Data_Flow
      await this.cargarNombresFormaciones();

      if (this.rosterData?.length > 0) {
        // Filtrar solo usuarios activos (employee_status === "A")
        this.allLogins = this.rosterData
          .filter(user => 
            user.login && 
            user.login.trim() !== "" && 
            user.employee_status === "A"
          )
          .map((user) => ({
            login: user.login.trim(),
            employee_name: user.employee_name || "",
            shift: user.shift || "",
            employee_type: user.employee_type || "",
            formaciones: user.formaciones || [],
            manager: user.login_manager || user.manager || "", // Usar login_manager del roster
            employee_status: user.employee_status || ""
          }));
        
        // Extraer turnos únicos (solo los que tienen turno)
        this.turnos = new Set(this.allLogins.map(u => u.shift).filter(Boolean).sort());
      }
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
      throw error;
    }
  }


  configurarEventos() {
    // Autocompletado de búsqueda
    const searchInput = document.getElementById("search-login");
    const autocompleteList = document.getElementById("autocomplete-list");
    
    if (searchInput && autocompleteList) {
      searchInput.addEventListener("input", (e) => {
        this.autocompleteIndex = -1; // Resetear índice al escribir
        this.mostrarAutocompletado(e.target.value);
      });

      searchInput.addEventListener("focus", () => {
        if (searchInput.value.length >= 2) {
          this.mostrarAutocompletado(searchInput.value);
        }
      });

      // Manejar teclas especiales
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.manejarEnterAutocompletado();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          this.navegarAutocompletado(1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          this.navegarAutocompletado(-1);
        } else if (e.key === "Escape") {
          autocompleteList.classList.remove("show");
          this.autocompleteIndex = -1;
        }
      });

      // Cerrar autocompletado al hacer clic fuera
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-wrapper")) {
          autocompleteList.classList.remove("show");
          this.autocompleteIndex = -1;
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

    // Botón agregar por turno (modal)
    const btnAgregarTurno = document.getElementById("btn-agregar-turno");
    if (btnAgregarTurno) {
      btnAgregarTurno.addEventListener("click", () => {
        this.mostrarModalPorTurno();
      });
    }

    // Botón agregar por manager (modal)
    const btnAgregarManager = document.getElementById("btn-agregar-manager");
    if (btnAgregarManager) {
      btnAgregarManager.addEventListener("click", () => {
        this.mostrarModalPorManager();
      });
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
   * Obtiene los colores a usar según el modo y el turno del usuario
   * @param {Object} usuario - Objeto usuario con shift y employee_type
   * @returns {Object} Objeto con los colores a aplicar
   */
  obtenerColoresActuales(usuario = null) {
    // Si está en modo personalizado, usar colores personalizados
    if (this.modoColorPersonalizado) {
      return this.coloresPersonalizados;
    }

    // Si no hay usuario o no hay colores por turno, usar estándar
    if (!usuario || !this.coloresPorTurno) {
      return this.coloresEstandar;
    }

    // Obtener el turno del usuario (T1, T2, etc.)
    // Usar turno temporal si existe, sino el turno del usuario
    const turno = this.turnosTemporales.get(usuario.login) || usuario.shift || "N/A";
    const coloresTurno = this.coloresPorTurno[turno];

    // Si no hay colores para este turno, usar estándar
    if (!coloresTurno) {
      console.warn(`⚠️ No hay colores definidos para el turno ${turno}, usando estándar`);
      return this.coloresEstandar;
    }

    // Construir objeto de colores según el turno
    const employeeType = usuario.employee_type || "";
    // Solo "E" y "LA" usan VariacionColor especial (ya no se usa "L")
    const esLAoE = employeeType === "E" || employeeType === "LA";
    const esFT = employeeType === "FT";

    return {
      login: coloresTurno.LoginColor,
      variacion: esLAoE ? coloresTurno.VariacionColor : coloresTurno.LoginColor,
      turno: coloresTurno.TurnoColor,
      typeAa: esFT ? coloresTurno.Type_aa_FT : coloresTurno.Type_aa_Other,
      loginText: coloresTurno.LoginText,
      turnoText: coloresTurno.TurnoText,
      textStyles: this.estilosTextoGlobales // Usar estilos globales (iguales para todos los turnos)
    };
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
      this.currentAutocompleteItems = [];
      return;
    }

    // NO filtrar por turno en la búsqueda - mostrar todos los resultados
    let filtrados = this.allLogins.filter(user => {
      const coincideBusqueda = user.login.toLowerCase().includes(textoLower) ||
                                user.employee_name.toLowerCase().includes(textoLower);
      const noSeleccionado = !this.selectedLogins.has(user.login);
      return coincideBusqueda && noSeleccionado;
    });

    // Limitar a 10 resultados
    filtrados = filtrados.slice(0, 10);
    this.currentAutocompleteItems = filtrados;

    if (filtrados.length === 0) {
      autocompleteList.innerHTML = '<div class="autocomplete-item"><span class="name">No se encontraron resultados</span></div>';
      autocompleteList.classList.add("show");
      this.autocompleteIndex = -1;
      return;
    }

    autocompleteList.innerHTML = filtrados.map((user, index) => `
      <div class="autocomplete-item ${index === this.autocompleteIndex ? 'active' : ''}" data-login="${user.login}" data-index="${index}">
        <span class="login">${user.login}</span>
        <span class="name">${user.employee_name} - ${user.shift || 'Sin turno'}</span>
      </div>
    `).join("");

    // Event listeners para seleccionar
    autocompleteList.querySelectorAll(".autocomplete-item[data-login]").forEach(item => {
      item.addEventListener("click", () => {
        const login = item.dataset.login;
        this.agregarLogin(login);
        document.getElementById("search-login").value = "";
        autocompleteList.classList.remove("show");
        this.autocompleteIndex = -1;
      });
    });

    autocompleteList.classList.add("show");
  }

  /**
   * Navega por el autocompletado con flechas
   */
  navegarAutocompletado(direccion) {
    const autocompleteList = document.getElementById("autocomplete-list");
    if (!autocompleteList || !autocompleteList.classList.contains("show")) {
      // Si el autocompletado no está visible pero hay texto, mostrarlo
      const searchInput = document.getElementById("search-login");
      if (searchInput && searchInput.value.length >= 2) {
        this.mostrarAutocompletado(searchInput.value);
      } else {
        return;
      }
    }

    const items = this.currentAutocompleteItems;
    if (items.length === 0) return;

    // Si es la primera navegación, empezar desde el principio
    if (this.autocompleteIndex === -1) {
      this.autocompleteIndex = direccion === 1 ? 0 : items.length - 1;
    } else {
      // Actualizar índice
      this.autocompleteIndex += direccion;
      
      if (this.autocompleteIndex < 0) {
        this.autocompleteIndex = items.length - 1;
      } else if (this.autocompleteIndex >= items.length) {
        this.autocompleteIndex = 0;
      }
    }

    // Actualizar visualización
    const itemElements = autocompleteList.querySelectorAll(".autocomplete-item[data-login]");
    itemElements.forEach((item, index) => {
      if (index === this.autocompleteIndex) {
        item.classList.add("active");
        item.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else {
        item.classList.remove("active");
      }
    });
  }

  /**
   * Maneja la tecla Enter en el autocompletado
   */
  manejarEnterAutocompletado() {
    const autocompleteList = document.getElementById("autocomplete-list");
    const searchInput = document.getElementById("search-login");
    
    if (!autocompleteList || !searchInput) return;

    const texto = searchInput.value.trim();
    
    // Si hay un item seleccionado en el autocompletado (con flechas)
    if (this.autocompleteIndex >= 0 && this.currentAutocompleteItems.length > 0 && this.currentAutocompleteItems[this.autocompleteIndex]) {
      const user = this.currentAutocompleteItems[this.autocompleteIndex];
      if (!this.selectedLogins.has(user.login)) {
        this.agregarLogin(user.login);
        searchInput.value = "";
        autocompleteList.classList.remove("show");
        this.autocompleteIndex = -1;
        this.currentAutocompleteItems = [];
        return;
      } else {
        this.mostrarToast("Este login ya está seleccionado", "warning");
        return;
      }
    }

    // Si no hay selección con flechas, buscar el login exacto
    if (texto.length >= 2) {
      // Primero buscar coincidencia exacta
      let user = this.allLogins.find(u => 
        u.login.toLowerCase() === texto.toLowerCase()
      );
      
      // Si no hay coincidencia exacta, buscar la primera de la lista de autocompletado
      if (!user && this.currentAutocompleteItems.length > 0) {
        user = this.currentAutocompleteItems[0];
      }
      
      if (user) {
        if (!this.selectedLogins.has(user.login)) {
          this.agregarLogin(user.login);
          searchInput.value = "";
          autocompleteList.classList.remove("show");
          this.autocompleteIndex = -1;
          this.currentAutocompleteItems = [];
        } else {
          this.mostrarToast("Este login ya está seleccionado", "warning");
        }
      } else {
        this.mostrarToast("Login no encontrado", "warning");
      }
    }
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
   * Muestra modal para seleccionar turno primero, luego usuarios
   */
  mostrarModalPorTurno() {
    // Crear modal para seleccionar turno
    const turnosValidos = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"];
    
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Seleccionar Turno</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="turno-grid">
            ${turnosValidos.map(turno => {
              const count = this.allLogins.filter(u => u.shift === turno).length;
              return `
                <div class="turno-card" data-turno="${turno}">
                  <div class="turno-card-header">${turno}</div>
                  <div class="turno-card-count">${count} empleados</div>
                  <button class="btn btn-sm btn-primary">Seleccionar</button>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelectorAll(".turno-card button").forEach(btn => {
      btn.addEventListener("click", () => {
        const turno = btn.closest(".turno-card").dataset.turno;
        modal.remove();
        const usuariosDelTurno = this.allLogins.filter(u => u.shift === turno);
        this.crearModalSeleccion(usuariosDelTurno, `Turno ${turno}`, turno);
      });
    });

    // Cerrar al hacer clic fuera
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
   * Muestra modal para seleccionar usuarios por manager
   */
  mostrarModalPorManager() {
    // Obtener lista de managers que tienen empleados con turnos válidos (T1-T8)
    const turnosValidos = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"];
    
    // Agrupar por manager y filtrar solo los que tienen empleados con turnos válidos
    const managersConEmpleados = {};
    
    this.allLogins.forEach(user => {
      if (user.manager && user.manager.trim() !== "" && turnosValidos.includes(user.shift)) {
        if (!managersConEmpleados[user.manager]) {
          managersConEmpleados[user.manager] = [];
        }
        managersConEmpleados[user.manager].push(user);
      }
    });
    
    const managers = Object.keys(managersConEmpleados).sort();
    
    if (managers.length === 0) {
      this.mostrarToast("No hay managers con empleados en turnos válidos", "warning");
      return;
    }

    // Crear modal para seleccionar manager
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h3>Seleccionar Manager</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="manager-list">
            ${managers.map(manager => {
              const count = managersConEmpleados[manager].length;
              return `
                <div class="manager-item" data-manager="${manager}">
                  <div class="manager-info">
                    <span class="manager-name">${manager}</span>
                    <span class="manager-count">${count} empleados</span>
                  </div>
                  <button class="btn btn-sm btn-primary">Seleccionar</button>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelectorAll(".manager-item button").forEach(btn => {
      btn.addEventListener("click", () => {
        const manager = btn.closest(".manager-item").dataset.manager;
        modal.remove();
        const usuariosDelManager = managersConEmpleados[manager];
        this.crearModalSeleccion(usuariosDelManager, `Manager: ${manager}`, null);
      });
    });

    // Cerrar al hacer clic fuera
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
   * Crea modal para seleccionar usuarios con checkboxes y fotos
   */
  crearModalSeleccion(usuarios, titulo, turnoFiltro) {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    
    // Separar usuarios con y sin turno
    const usuariosConTurno = usuarios.filter(u => u.shift && u.shift.trim() !== "");
    const usuariosSinTurno = usuarios.filter(u => !u.shift || u.shift.trim() === "");
    
    modal.innerHTML = `
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h3>${titulo} (${usuarios.length} usuarios)</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="modal-actions-top">
            <button class="btn btn-sm btn-secondary" id="select-all">Seleccionar todos</button>
            <button class="btn btn-sm btn-secondary" id="deselect-all">Deseleccionar todos</button>
            <span class="selected-count-modal">0 seleccionados</span>
          </div>
          
          ${usuariosSinTurno.length > 0 ? `
            <div class="users-section">
              <h4>Usuarios sin turno (${usuariosSinTurno.length})</h4>
              <div class="users-list-grid">
                ${usuariosSinTurno.map(user => `
                  <div class="user-item-card">
                    <label>
                      <input type="checkbox" class="user-checkbox" data-login="${user.login}" data-has-shift="false">
                      <div class="user-card-content">
                        <div class="user-photo-container">
                          <img src="${this.getUserPhotoUrl(user.login)}" alt="${user.login}" class="user-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                          <div class="user-photo-placeholder" style="display: none;">
                            <span>${user.login.charAt(0).toUpperCase()}</span>
                          </div>
                        </div>
                        <div class="user-details">
                          <strong class="user-login">${user.login}</strong>
                          <span class="user-name">${user.employee_name}</span>
                          <select class="temp-shift-select" data-login="${user.login}">
                            <option value="">Asignar turno...</option>
                            <option value="T1">T1</option>
                            <option value="T2">T2</option>
                            <option value="T3">T3</option>
                            <option value="T4">T4</option>
                            <option value="T5">T5</option>
                            <option value="T6">T6</option>
                            <option value="T7">T7</option>
                            <option value="T8">T8</option>
                          </select>
                        </div>
                      </div>
                    </label>
                  </div>
                `).join("")}
              </div>
            </div>
          ` : ""}
          
          <div class="users-section">
            <h4>Usuarios con turno (${usuariosConTurno.length})</h4>
            <div class="users-list-grid">
              ${usuariosConTurno.map(user => `
                <div class="user-item-card">
                  <label>
                    <input type="checkbox" class="user-checkbox" data-login="${user.login}" data-has-shift="true" data-shift="${user.shift}">
                    <div class="user-card-content">
                      <div class="user-photo-container">
                        <img src="${this.getUserPhotoUrl(user.login)}" alt="${user.login}" class="user-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="user-photo-placeholder" style="display: none;">
                          <span>${user.login.charAt(0).toUpperCase()}</span>
                        </div>
                      </div>
                      <div class="user-details">
                        <strong class="user-login">${user.login}</strong>
                        <span class="user-name">${user.employee_name}</span>
                        <span class="user-shift">${user.shift}</span>
                      </div>
                    </div>
                  </label>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-primary" id="add-selected-users">Agregar seleccionados</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Actualizar contador
    const updateCount = () => {
      const count = modal.querySelectorAll(".user-checkbox:checked").length;
      modal.querySelector(".selected-count-modal").textContent = `${count} seleccionados`;
    };

    // Seleccionar todos
    modal.querySelector("#select-all").addEventListener("click", () => {
      modal.querySelectorAll(".user-checkbox").forEach(cb => cb.checked = true);
      updateCount();
    });

    // Deseleccionar todos
    modal.querySelector("#deselect-all").addEventListener("click", () => {
      modal.querySelectorAll(".user-checkbox").forEach(cb => cb.checked = false);
      updateCount();
    });

    // Actualizar contador al cambiar checkboxes
    modal.querySelectorAll(".user-checkbox").forEach(cb => {
      cb.addEventListener("change", updateCount);
    });

    // Guardar turno temporal al seleccionar
    modal.querySelectorAll(".temp-shift-select").forEach(select => {
      select.addEventListener("change", (e) => {
        const login = e.target.dataset.login;
        const turno = e.target.value;
        if (turno) {
          this.turnosTemporales.set(login, turno);
          // Marcar checkbox automáticamente
          const checkbox = modal.querySelector(`.user-checkbox[data-login="${login}"]`);
          if (checkbox) checkbox.checked = true;
          updateCount();
        }
      });
    });

    // Agregar seleccionados
    modal.querySelector("#add-selected-users").addEventListener("click", () => {
      const checkboxes = modal.querySelectorAll(".user-checkbox:checked");
      let agregados = 0;

      checkboxes.forEach(cb => {
        const login = cb.dataset.login;
        const hasShift = cb.dataset.hasShift === "true";
        
        if (!this.selectedLogins.has(login)) {
          this.selectedLogins.add(login);
          
          // Si no tiene turno pero se asignó uno temporal, guardarlo
          if (!hasShift) {
            const tempSelect = modal.querySelector(`.temp-shift-select[data-login="${login}"]`);
            if (tempSelect && tempSelect.value) {
              this.turnosTemporales.set(login, tempSelect.value);
            }
          }
          
          agregados++;
        }
      });

      this.actualizarBarraSeleccion();
      modal.remove();
      this.mostrarToast(`${agregados} usuarios agregados`, "success");
    });

    // Cerrar al hacer clic fuera
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    updateCount();
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

  /**
   * Obtiene la URL de la foto del empleado desde Amazon
   * @param {string} login
   * @returns {string}
   */
  getUserPhotoUrl(login) {
    if (!login) return "";
    return `https://internal-cdn.amazon.com/badgephotos.amazon.com/?uid=${login}`;
  }

  /**
   * Carga la foto del empleado y la convierte a data URL (base64)
   * @param {string} login
   * @returns {Promise<string>} Data URL de la imagen
   */
  async cargarFotoEmpleado(login) {
    if (!login) return null;

    const photoUrl = this.getUserPhotoUrl(login);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // Permitir CORS si es necesario
      
      img.onload = () => {
        try {
          // Crear canvas para convertir a base64
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          
          // Convertir a data URL
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          console.log(`✅ Foto cargada para ${login}`);
          resolve(dataUrl);
        } catch (error) {
          console.warn(`⚠️ Error convirtiendo foto a base64 para ${login}:`, error);
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        console.warn(`⚠️ No se pudo cargar la foto para ${login} desde ${photoUrl}`);
        reject(error);
      };
      
      img.src = photoUrl;
    });
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

      // Establecer dimensiones exactas: 127mm x 33mm
      svg.setAttribute("width", "127mm");
      svg.setAttribute("height", "33mm");
      
      // Asegurar viewBox para escalado correcto (si no existe)
      if (!svg.getAttribute("viewBox")) {
        svg.setAttribute("viewBox", "0 0 127 33");
      }
      
      // Asegurar que preserveAspectRatio esté configurado
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

      const nombreCompleto = usuario.employee_name || "";
      const partes = nombreCompleto.split(",");
      const apellidos = partes[0]?.trim() || "";
      const nombres = partes[1]?.trim() || "";

      // Obtener colores según el turno del usuario
      const colores = this.obtenerColoresActuales(usuario);
      
      // Actualizar textos con estilos globales
      if (colores.textStyles) {
        // Aplicar estilos a Nombres
        if (colores.textStyles.Nombres) {
      this.actualizarElementoSVG(svg, "Nombres", nombres);
          this.aplicarEstilosTexto(svg, "Nombres", "#231f20", colores.textStyles.Nombres);
        } else {
          this.actualizarElementoSVG(svg, "Nombres", nombres);
        }
        
        // Aplicar estilos a Apellidos
        if (colores.textStyles.Apellidos) {
      this.actualizarElementoSVG(svg, "Apellidos", apellidos);
          this.aplicarEstilosTexto(svg, "Apellidos", "#231f20", colores.textStyles.Apellidos);
        } else {
          this.actualizarElementoSVG(svg, "Apellidos", apellidos);
        }
        
        // Aplicar estilos a Login
        if (colores.textStyles.Login) {
      this.actualizarElementoSVG(svg, "Login", usuario.login);
          this.aplicarEstilosTexto(svg, "Login", colores.loginText, colores.textStyles.Login);
        } else {
          this.actualizarElementoSVG(svg, "Login", usuario.login);
          this.aplicarColorTexto(svg, "Login", colores.loginText);
        }
        
        // Aplicar estilos a Turno
        if (colores.textStyles.Turno) {
      this.actualizarElementoSVG(svg, "Turno", usuario.shift || "N/A");
          this.aplicarEstilosTexto(svg, "Turno", colores.turnoText, colores.textStyles.Turno);
        } else {
          const turnoMostrar = this.turnosTemporales.get(usuario.login) || usuario.shift || "N/A";
          this.actualizarElementoSVG(svg, "Turno", turnoMostrar);
          this.aplicarColorTexto(svg, "Turno", colores.turnoText);
        }
      } else {
        // Fallback sin estilos globales
        this.actualizarElementoSVG(svg, "Nombres", nombres);
        this.actualizarElementoSVG(svg, "Apellidos", apellidos);
        this.actualizarElementoSVG(svg, "Login", usuario.login);
        this.actualizarElementoSVG(svg, "Turno", usuario.shift || "N/A");
        this.aplicarColorTexto(svg, "Login", colores.loginText);
        this.aplicarColorTexto(svg, "Turno", colores.turnoText);
      }
      
      // Actualizar VariacionShift: solo mostrar employee_type si es "E" o "LA"
      const employeeType = usuario.employee_type || "";
      const variacionText = (employeeType === "E" || employeeType === "LA") ? employeeType : "";
      this.actualizarElementoSVG(svg, "VariacionShift", variacionText);
      
      // Aplicar estilos a VariacionShift si están disponibles
      if (colores.textStyles?.VariacionShift) {
        this.aplicarEstilosTexto(svg, "VariacionShift", "#231f20", colores.textStyles.VariacionShift);
      }

      // Aplicar colores de fondo
      // Nota: El SVG ahora tiene "TurnoColor" (corregido)
      this.aplicarColorElemento(svg, "TurnoColor", colores.turno);
      this.aplicarColorElemento(svg, "LoginColor", colores.login);
      this.aplicarColorElemento(svg, "VariacionColor", colores.variacion);
      this.aplicarColorElemento(svg, "Type_x5F_aa", colores.typeAa);

      // Cargar y actualizar foto del empleado
      const fotoRect = svg.querySelector("#Foto");
      if (fotoRect && usuario.login) {
        try {
          const fotoDataUrl = await this.cargarFotoEmpleado(usuario.login);
          if (fotoDataUrl) {
            const fotoImage = svgDoc.createElementNS("http://www.w3.org/2000/svg", "image");
            fotoImage.setAttribute("href", fotoDataUrl);
            fotoImage.setAttribute("x", fotoRect.getAttribute("x"));
            fotoImage.setAttribute("y", fotoRect.getAttribute("y"));
            fotoImage.setAttribute("width", fotoRect.getAttribute("width"));
            fotoImage.setAttribute("height", fotoRect.getAttribute("height"));
            fotoImage.setAttribute("preserveAspectRatio", "xMidYMid slice");
            fotoRect.parentNode.replaceChild(fotoImage, fotoRect);
          }
        } catch (error) {
          console.warn(`⚠️ No se pudo cargar la foto para ${usuario.login}:`, error);
          // Mantener el rect original si falla la carga
        }
      }

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
        // Obtener el nombre de la formación desde el JSON (si está disponible)
        const nombreFormacion = this.nombresFormaciones?.[`FN_${i}`] || "";
        
        // Verificar si el usuario tiene esta formación
        const tieneFormacion = formaciones.includes(nombreFormacion);
        
        // Obtener estilos específicos de FN_i desde JSON si están disponibles
        // Primero busca FN_i específico, luego FN genérico como fallback
        const fnStyles = colores.textStyles?.[`FN_${i}`] || colores.textStyles?.FN;
        
        // Si hay coordenadas x e y en el JSON, usarlas directamente
        if (fnStyles && fnStyles.x !== undefined && fnStyles.y !== undefined) {
          // Usar coordenadas del JSON
          if (nombreFormacion) {
            this.actualizarElementoSVGCentrado(svg, `FN_x5F_${i}`, nombreFormacion, fnStyles.x, fnStyles.y, fnStyles);
          } else {
            // Si no hay nombre, limpiar el texto
            this.actualizarElementoSVG(svg, `FN_x5F_${i}`, "");
          }
        } else {
          // Si no hay coordenadas en JSON, calcular el centro del rect (fallback)
          const colorRect = svg.querySelector(`#FNC_x5F_${i}`);
          if (colorRect) {
            const rectX = parseFloat(colorRect.getAttribute("x")) || 0;
            const rectWidth = parseFloat(colorRect.getAttribute("width")) || 0;
            const rectY = parseFloat(colorRect.getAttribute("y")) || 0;
            const rectHeight = parseFloat(colorRect.getAttribute("height")) || 0;
            
            // Calcular el centro de la celda
            const centerX = rectX + (rectWidth / 2);
            const centerY = rectY + (rectHeight / 2);
            
            // Actualizar el texto y centrarlo (solo si hay texto)
            if (nombreFormacion) {
              this.actualizarElementoSVGCentrado(svg, `FN_x5F_${i}`, nombreFormacion, centerX, centerY, fnStyles);
            } else {
              // Si no hay nombre, limpiar el texto
              this.actualizarElementoSVG(svg, `FN_x5F_${i}`, "");
            }
          } else {
            // Fallback si no se encuentra el rect
            this.actualizarElementoSVG(svg, `FN_x5F_${i}`, nombreFormacion);
          }
        }

        // Solo colorear si la opción está activada
        if (this.colorearFormaciones) {
          const colorRect = svg.querySelector(`#FNC_x5F_${i}`);
          if (colorRect) {
            colorRect.removeAttribute("class");
            // Verde si tiene la formación, gris si no
            colorRect.setAttribute("fill", tieneFormacion ? "#4ade80" : "#9ca3af");
            colorRect.style.fill = tieneFormacion ? "#4ade80" : "#9ca3af";
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

  /**
   * Aplica estilos completos a un elemento de texto del SVG
   * @param {SVGElement} svg - Elemento SVG raíz
   * @param {string} id - ID del elemento de texto
   * @param {string} color - Color en formato hexadecimal (#RRGGBB)
   * @param {Object} styles - Objeto con estilos (fontSize, fontFamily, fontWeight, x, y)
   */
  aplicarEstilosTexto(svg, id, color, styles) {
    const idVariants = [id, id.replace(/_/g, "_x5F_"), id.replace(/_x5F_/g, "_")];
    
    for (const variantId of idVariants) {
      const elemento = svg.querySelector(`#${variantId}`);
      if (elemento) {
        let textElement = null;
        let tspan = null;
        
        if (elemento.tagName === "g") {
          textElement = elemento.querySelector("text");
          if (textElement) {
            tspan = textElement.querySelector("tspan");
          }
        } else if (elemento.tagName === "text") {
          textElement = elemento;
          tspan = elemento.querySelector("tspan");
        }
        
        if (textElement) {
          // Aplicar color
          textElement.setAttribute("fill", color);
          textElement.style.fill = color;
          
          // Aplicar estilos
          if (styles.fontSize) {
            textElement.setAttribute("font-size", styles.fontSize);
            textElement.style.fontSize = styles.fontSize;
          }
          if (styles.fontFamily) {
            textElement.setAttribute("font-family", styles.fontFamily);
            textElement.style.fontFamily = styles.fontFamily;
          }
          if (styles.fontWeight) {
            textElement.setAttribute("font-weight", styles.fontWeight);
            textElement.style.fontWeight = styles.fontWeight;
          }
          
          // Aplicar posición si está definida
          if (styles.x !== undefined && styles.y !== undefined) {
            textElement.setAttribute("transform", `translate(${styles.x} ${styles.y})`);
          }
          
          // Aplicar también al tspan si existe
          if (tspan) {
            tspan.setAttribute("fill", color);
            tspan.style.fill = color;
            if (styles.fontSize) {
              tspan.setAttribute("font-size", styles.fontSize);
              tspan.style.fontSize = styles.fontSize;
            }
            if (styles.fontFamily) {
              tspan.setAttribute("font-family", styles.fontFamily);
              tspan.style.fontFamily = styles.fontFamily;
            }
            if (styles.fontWeight) {
              tspan.setAttribute("font-weight", styles.fontWeight);
              tspan.style.fontWeight = styles.fontWeight;
            }
          }
          
          return;
        }
      }
    }
    console.warn(`⚠️ Elemento de texto no encontrado para aplicar estilos: ${id}`);
  }

  /**
   * Aplica color a un elemento de texto del SVG
   * @param {SVGElement} svg - Elemento SVG raíz
   * @param {string} id - ID del elemento de texto
   * @param {string} color - Color en formato hexadecimal (#RRGGBB)
   */
  aplicarColorTexto(svg, id, color) {
    const idVariants = [id, id.replace(/_/g, "_x5F_"), id.replace(/_x5F_/g, "_")];
    
    for (const variantId of idVariants) {
      const elemento = svg.querySelector(`#${variantId}`);
      if (elemento) {
        // Para elementos de texto
        if (elemento.tagName === "text" || elemento.tagName === "tspan") {
          elemento.removeAttribute("class");
          elemento.setAttribute("fill", color);
          elemento.style.fill = color;
          console.log(`🎨 Color de texto aplicado a ${variantId}: ${color}`);
          return;
        }
        // Si es un grupo, buscar el texto dentro
        else if (elemento.tagName === "g") {
          const texto = elemento.querySelector("text, tspan");
          if (texto) {
            texto.removeAttribute("class");
            texto.setAttribute("fill", color);
            texto.style.fill = color;
            console.log(`🎨 Color de texto aplicado a ${variantId} (dentro de grupo): ${color}`);
            return;
          }
        }
      }
    }
    console.warn(`⚠️ Elemento de texto no encontrado: ${id}`);
  }

  /**
   * Actualiza un elemento SVG de texto y lo centra en una posición específica
   * @param {SVGElement} svg - Elemento SVG raíz
   * @param {string} id - ID del elemento de texto
   * @param {string} texto - Texto a mostrar
   * @param {number} centerX - Posición X del centro
   * @param {number} centerY - Posición Y del centro
   * @param {Object} styles - Estilos opcionales (fontSize, fontFamily, fontWeight)
   */
  actualizarElementoSVGCentrado(svg, id, texto, centerX, centerY, styles = null) {
    const idVariants = [id, id.replace(/_/g, "_x5F_"), id.replace(/_x5F_/g, "_")];

    for (const variantId of idVariants) {
      const elemento = svg.querySelector(`#${variantId}`);
      if (elemento) {
        if (elemento.tagName === "g") {
          const textElement = elemento.querySelector("text");
          if (textElement) {
            const tspan = textElement.querySelector("tspan");
            if (tspan) {
              tspan.textContent = texto;
              // Centrar el texto
              tspan.setAttribute("text-anchor", "middle");
              tspan.setAttribute("x", "0");
              tspan.setAttribute("y", "0");
            } else {
              textElement.textContent = texto;
            }
            // Aplicar estilos si están disponibles
            if (styles) {
              if (styles.fontSize) {
                textElement.setAttribute("font-size", styles.fontSize);
                textElement.style.fontSize = styles.fontSize;
                if (tspan) {
                  tspan.setAttribute("font-size", styles.fontSize);
                  tspan.style.fontSize = styles.fontSize;
                }
              }
              if (styles.fontFamily) {
                textElement.setAttribute("font-family", styles.fontFamily);
                textElement.style.fontFamily = styles.fontFamily;
                if (tspan) {
                  tspan.setAttribute("font-family", styles.fontFamily);
                  tspan.style.fontFamily = styles.fontFamily;
                }
              }
              if (styles.fontWeight) {
                textElement.setAttribute("font-weight", styles.fontWeight);
                textElement.style.fontWeight = styles.fontWeight;
                if (tspan) {
                  tspan.setAttribute("font-weight", styles.fontWeight);
                  tspan.style.fontWeight = styles.fontWeight;
                }
              }
            }
            // Actualizar transform del grupo para centrar en la celda
            elemento.setAttribute("transform", `translate(${centerX} ${centerY})`);
            textElement.setAttribute("text-anchor", "middle");
            return;
          }
        } else if (elemento.tagName === "text") {
          const tspan = elemento.querySelector("tspan");
          if (tspan) {
            tspan.textContent = texto;
            tspan.setAttribute("text-anchor", "middle");
            tspan.setAttribute("x", "0");
            tspan.setAttribute("y", "0");
          } else {
            elemento.textContent = texto;
          }
          // Aplicar estilos si están disponibles
          if (styles) {
            if (styles.fontSize) {
              elemento.setAttribute("font-size", styles.fontSize);
              elemento.style.fontSize = styles.fontSize;
              if (tspan) {
                tspan.setAttribute("font-size", styles.fontSize);
                tspan.style.fontSize = styles.fontSize;
              }
            }
            if (styles.fontFamily) {
              elemento.setAttribute("font-family", styles.fontFamily);
              elemento.style.fontFamily = styles.fontFamily;
              if (tspan) {
                tspan.setAttribute("font-family", styles.fontFamily);
                tspan.style.fontFamily = styles.fontFamily;
              }
            }
            if (styles.fontWeight) {
              elemento.setAttribute("font-weight", styles.fontWeight);
              elemento.style.fontWeight = styles.fontWeight;
              if (tspan) {
                tspan.setAttribute("font-weight", styles.fontWeight);
                tspan.style.fontWeight = styles.fontWeight;
              }
            }
          }
          // Actualizar transform para centrar en la celda
          elemento.setAttribute("text-anchor", "middle");
          elemento.setAttribute("transform", `translate(${centerX} ${centerY})`);
          return;
        }
      }
    }
    // Si no se encuentra, usar el método normal
    this.actualizarElementoSVG(svg, id, texto);
  }

  actualizarElementoSVG(svg, id, texto) {
    const idVariants = [id, id.replace(/_/g, "_x5F_"), id.replace(/_x5F_/g, "_")];
    
    // Detectar si es un elemento FN_ para centrarlo
    const esFormacion = id.startsWith("FN_") || id.startsWith("FN_x5F_");

    for (const variantId of idVariants) {
      const elemento = svg.querySelector(`#${variantId}`);
      if (elemento) {
        if (elemento.tagName === "g") {
          const textElement = elemento.querySelector("text");
          if (textElement) {
            const tspan = textElement.querySelector("tspan");
            if (tspan) {
              tspan.textContent = texto;
              // Centrar texto si es una formación
              if (esFormacion) {
                tspan.setAttribute("text-anchor", "middle");
                textElement.setAttribute("text-anchor", "middle");
              }
            } else {
              textElement.textContent = texto;
              // Centrar texto si es una formación
              if (esFormacion) {
                textElement.setAttribute("text-anchor", "middle");
              }
            }
            return;
          }
        } else {
          const tspan = elemento.querySelector("tspan");
          if (tspan) {
            tspan.textContent = texto;
            // Centrar texto si es una formación
            if (esFormacion) {
              tspan.setAttribute("text-anchor", "middle");
              elemento.setAttribute("text-anchor", "middle");
            }
          } else {
            elemento.textContent = texto;
            // Centrar texto si es una formación
            if (esFormacion) {
              elemento.setAttribute("text-anchor", "middle");
            }
          }
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

    // Crear modal de carga
    const loadingModal = this.crearModalCarga();
    document.body.appendChild(loadingModal);
    const progressBar = loadingModal.querySelector(".progress-bar-fill");
    const progressText = loadingModal.querySelector(".progress-text");

    try {
      const previewContainer = document.getElementById("imanes-preview");
      const hasPreview = previewContainer.querySelector(".iman-preview-item");
      
      if (!hasPreview) {
        progressText.textContent = "Generando preview...";
        await this.generarPreview();
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Dimensiones exactas del imán: 127mm x 33mm
      const IMAN_WIDTH = 127;
      const IMAN_HEIGHT = 33;
      const SEPARACION = 2;
      const COLUMNAS = 2;
      const FILAS = 5;
      const IMANES_POR_PAGINA = COLUMNAS * FILAS;

      const PAGE_WIDTH = 297; // A4 landscape width
      const PAGE_HEIGHT = 210; // A4 landscape height

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

      // Procesar imanes con actualización de progreso
      while (imanIndex < totalImanes) {
        if (paginaActual > 0) pdf.addPage();

        for (let fila = 0; fila < FILAS && imanIndex < totalImanes; fila++) {
          for (let col = 0; col < COLUMNAS && imanIndex < totalImanes; col++) {
            const item = imanesItems[imanIndex];
            const svgContainer = item.querySelector(".iman-svg-container");

            if (svgContainer) {
              // Actualizar progreso
              const progress = Math.round(((imanIndex + 1) / totalImanes) * 100);
              progressBar.style.width = `${progress}%`;
              progressText.textContent = `Procesando imán ${imanIndex + 1} de ${totalImanes} (${progress}%)...`;
              
              // Permitir que el navegador actualice la UI
              await new Promise(resolve => setTimeout(resolve, 10));

              // Convertir SVG a imagen con scale optimizado (2 en lugar de 3 para mejor rendimiento)
              const canvas = await html2canvas(svgContainer, {
                backgroundColor: "#ffffff",
                scale: 2, // Reducido de 3 a 2 para mejor rendimiento (suficiente calidad)
                useCORS: true,
                logging: false,
              });

              const imgData = canvas.toDataURL("image/png", 0.95);
              const x = MARGIN_LEFT + (col * (IMAN_WIDTH + SEPARACION));
              const y = MARGIN_TOP + (fila * (IMAN_HEIGHT + SEPARACION));
              
              pdf.addImage(imgData, "PNG", x, y, IMAN_WIDTH, IMAN_HEIGHT);
            }

            imanIndex++;
          }
        }
        paginaActual++;
      }

      // Finalizar
      progressBar.style.width = "100%";
      progressText.textContent = "Guardando PDF...";
      await new Promise(resolve => setTimeout(resolve, 100));

      const nombreArchivo = `imanes_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(nombreArchivo);

      loadingModal.remove();
      this.mostrarToast(`PDF generado: ${totalImanes} imanes en ${paginaActual} página(s)`, "success");
    } catch (error) {
      console.error("Error exportando PDF:", error);
      loadingModal.remove();
      this.mostrarToast("Error al exportar PDF", "error");
    }
  }

  /**
   * Crea modal de carga con barra de progreso
   */
  crearModalCarga() {
    const modal = document.createElement("div");
    modal.className = "modal-overlay loading-modal";
    modal.innerHTML = `
      <div class="modal-content modal-loading">
        <div class="modal-header">
          <h3>Generando PDF</h3>
        </div>
        <div class="modal-body">
          <div class="loading-spinner"></div>
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-bar-fill" style="width: 0%"></div>
            </div>
            <div class="progress-text">Iniciando...</div>
          </div>
        </div>
      </div>
    `;
    return modal;
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

  /**
   * 🔧 HERRAMIENTA DE DEPURACIÓN: Obtiene las coordenadas actuales de todos los elementos de texto
   * Útil para ajustar posiciones en el JSON
   * Uso: imanesController.obtenerCoordenadasTexto()
   */
  obtenerCoordenadasTexto() {
    const coordenadas = {};
    
    // Elementos principales
    const elementos = [
      "Login", "Turno", "VariacionShift", "Apellidos", "Nombres"
    ];
    
    elementos.forEach(id => {
      const elemento = document.querySelector(`#${id}`);
      if (elemento) {
        const textElement = elemento.tagName === "g" ? elemento.querySelector("text") : elemento;
        if (textElement) {
          const transform = textElement.getAttribute("transform");
          const match = transform?.match(/translate\(([\d.]+)\s+([\d.]+)\)/);
          if (match) {
            coordenadas[id] = {
              x: parseFloat(match[1]),
              y: parseFloat(match[2]),
              fontSize: textElement.getAttribute("font-size") || "no definido",
              fontFamily: textElement.getAttribute("font-family") || "no definido",
              fontWeight: textElement.getAttribute("font-weight") || "no definido"
            };
          }
        }
      }
    });
    
    // Elementos FN_1 a FN_25
    for (let i = 1; i <= 25; i++) {
      const id = `FN_x5F_${i}`;
      const elemento = document.querySelector(`#${id}`);
      if (elemento) {
        const textElement = elemento.tagName === "g" ? elemento.querySelector("text") : elemento;
        if (textElement) {
          const transform = textElement.getAttribute("transform") || elemento.getAttribute("transform");
          const match = transform?.match(/translate\(([\d.]+)\s+([\d.]+)\)/);
          if (match) {
            coordenadas[`FN_${i}`] = {
              x: parseFloat(match[1]),
              y: parseFloat(match[2]),
              fontSize: textElement.getAttribute("font-size") || "no definido",
              fontFamily: textElement.getAttribute("font-family") || "no definido",
              fontWeight: textElement.getAttribute("font-weight") || "no definido"
            };
          }
        }
      }
    }
    
    console.log("📍 Coordenadas actuales de los elementos de texto:");
    console.table(coordenadas);
    
    return coordenadas;
  }

  /**
   * 🔧 HERRAMIENTA DE DEPURACIÓN: Genera un JSON con las coordenadas actuales para copiar
   * Útil para actualizar el JSON de colores
   * Uso: imanesController.generarJSONCoordenadas()
   */
  generarJSONCoordenadas() {
    const coordenadas = this.obtenerCoordenadasTexto();
    
    const json = {
      globalTextStyles: {
        Login: {
          fontSize: coordenadas.Login?.fontSize || "11px",
          fontFamily: coordenadas.Login?.fontFamily || "AmazonEmber-Regular, 'Amazon Ember'",
          fontWeight: coordenadas.Login?.fontWeight || "normal",
          x: coordenadas.Login?.x || 0,
          y: coordenadas.Login?.y || 0
        },
        Turno: {
          fontSize: coordenadas.Turno?.fontSize || "30px",
          fontFamily: coordenadas.Turno?.fontFamily || "AmazonEmber-Medium, 'Amazon Ember'",
          fontWeight: coordenadas.Turno?.fontWeight || "500",
          x: coordenadas.Turno?.x || 0,
          y: coordenadas.Turno?.y || 0
        },
        VariacionShift: {
          fontSize: coordenadas.VariacionShift?.fontSize || "12px",
          fontFamily: coordenadas.VariacionShift?.fontFamily || "AmazonEmber-Regular, 'Amazon Ember'",
          fontWeight: coordenadas.VariacionShift?.fontWeight || "normal",
          x: coordenadas.VariacionShift?.x || 0,
          y: coordenadas.VariacionShift?.y || 0
        },
        Apellidos: {
          fontSize: coordenadas.Apellidos?.fontSize || "7.5px",
          fontFamily: coordenadas.Apellidos?.fontFamily || "AmazonEmber-Regular, 'Amazon Ember'",
          fontWeight: coordenadas.Apellidos?.fontWeight || "normal",
          x: coordenadas.Apellidos?.x || 0,
          y: coordenadas.Apellidos?.y || 0
        },
        Nombres: {
          fontSize: coordenadas.Nombres?.fontSize || "7.5px",
          fontFamily: coordenadas.Nombres?.fontFamily || "AmazonEmber-Regular, 'Amazon Ember'",
          fontWeight: coordenadas.Nombres?.fontWeight || "normal",
          x: coordenadas.Nombres?.x || 0,
          y: coordenadas.Nombres?.y || 0
        }
      }
    };
    
    // Agregar FN_1 a FN_25
    for (let i = 1; i <= 25; i++) {
      const key = `FN_${i}`;
      if (coordenadas[key]) {
        json.globalTextStyles[key] = {
          fontSize: coordenadas[key].fontSize || "6px",
          fontFamily: coordenadas[key].fontFamily || "AmazonEmber-Regular, 'Amazon Ember'",
          fontWeight: coordenadas[key].fontWeight || "normal",
          centered: true
        };
      } else {
        json.globalTextStyles[key] = {
          fontSize: "6px",
          fontFamily: "AmazonEmber-Regular, 'Amazon Ember'",
          fontWeight: "normal",
          centered: true
        };
      }
    }
    
    const jsonString = JSON.stringify(json, null, 2);
    console.log("📋 JSON generado (copia esto al archivo imanes-colores.json):");
    console.log(jsonString);
    
    // Copiar al portapapeles si es posible
    if (navigator.clipboard) {
      navigator.clipboard.writeText(jsonString).then(() => {
        console.log("✅ JSON copiado al portapapeles");
      }).catch(err => {
        console.warn("⚠️ No se pudo copiar al portapapeles:", err);
      });
    }
    
    return jsonString;
  }

  /**
   * 🔧 HERRAMIENTA DE DEPURACIÓN: Muestra información de un elemento específico al hacer clic
   * Útil para ver coordenadas de un elemento específico
   * Uso: imanesController.activarModoDepuracion()
   */
  activarModoDepuracion() {
    console.log("🔧 Modo depuración activado. Haz clic en cualquier texto del SVG para ver sus coordenadas.");
    
    const previewContainer = document.getElementById("imanes-preview");
    if (!previewContainer) {
      console.warn("⚠️ No se encontró el contenedor de preview");
      return;
    }
    
    // Agregar listener a todos los SVGs
    const svgs = previewContainer.querySelectorAll("svg");
    svgs.forEach(svg => {
      svg.style.cursor = "crosshair";
      
      const textos = svg.querySelectorAll("text, g[id^='FN'], g[id^='Login'], g[id^='Turno'], g[id^='VariacionShift'], g[id^='Apellidos'], g[id^='Nombres']");
      textos.forEach(texto => {
        texto.addEventListener("click", (e) => {
          e.stopPropagation();
          const elemento = e.target.closest("g") || e.target;
          const id = elemento.id || elemento.closest("g")?.id;
          
          if (id) {
            const textElement = elemento.tagName === "g" ? elemento.querySelector("text") : elemento;
            const transform = textElement?.getAttribute("transform") || elemento.getAttribute("transform");
            const match = transform?.match(/translate\(([\d.]+)\s+([\d.]+)\)/);
            
            const info = {
              id: id,
              x: match ? parseFloat(match[1]) : "no encontrado",
              y: match ? parseFloat(match[2]) : "no encontrado",
              fontSize: textElement?.getAttribute("font-size") || "no definido",
              fontFamily: textElement?.getAttribute("font-family") || "no definido",
              fontWeight: textElement?.getAttribute("font-weight") || "no definido",
              textContent: textElement?.textContent || elemento.textContent
            };
            
            console.log(`📍 Información del elemento ${id}:`, info);
            alert(`Elemento: ${id}\nX: ${info.x}\nY: ${info.y}\nTamaño: ${info.fontSize}\nFuente: ${info.fontFamily}\nPeso: ${info.fontWeight}`);
          }
        });
      });
    });
    
    console.log("✅ Modo depuración activado. Haz clic en los textos para ver sus coordenadas.");
  }
}

// Inicializar
let imanesController;
let isInitializing = false;
let lastInitTime = 0;
const MIN_INIT_INTERVAL = 1000; // Evitar inicializaciones muy seguidas

function inicializarImanes(force = false) {
  // Evitar múltiples inicializaciones simultáneas
  if (isInitializing) {
    console.log("⏳ Inicialización ya en curso, esperando...");
    return;
  }
  
  // Evitar inicializaciones muy seguidas (a menos que sea forzada)
  const now = Date.now();
  if (!force && (now - lastInitTime) < MIN_INIT_INTERVAL) {
    console.log("⏳ Esperando antes de reinicializar...");
    return;
  }
  
  // Verificar que el DOM esté presente
  const previewSection = document.getElementById("preview-section");
  const searchInput = document.getElementById("search-login");
  
  if (!previewSection || !searchInput) {
    // Si no existe el preview, esperar un poco y reintentar
    console.log("⏳ Esperando elementos del DOM...");
    setTimeout(() => {
      const retrySection = document.getElementById("preview-section");
      const retryInput = document.getElementById("search-login");
      if (retrySection && retryInput && !isInitializing) {
        inicializarImanes(force);
      }
    }, 200);
    return;
  }
  
  // Si ya existe una instancia funcionando y no es forzada, no reinicializar
  if (!force && imanesController && searchInput.hasAttribute('data-events-configured')) {
    console.log("✅ ImanesController ya está inicializado y funcionando");
    return;
  }
  
  isInitializing = true;
  lastInitTime = now;
  console.log("🔄 Inicializando ImanesController...");
  
  // Si ya existe una instancia, limpiarla primero
  if (imanesController && typeof imanesController.destroy === 'function') {
    try {
      console.log("🧹 Limpiando instancia anterior...");
      imanesController.destroy();
    } catch (e) {
      console.warn("⚠️ Error al destruir instancia anterior:", e);
    }
  }
  
  // Limpiar el marcador de eventos para forzar reconfiguración
  if (searchInput) {
    searchInput.removeAttribute('data-events-configured');
  }
  
  // Crear nueva instancia
  try {
    imanesController = new ImanesController();
    window.imanesController = imanesController;
    console.log("✅ ImanesController creado exitosamente");
  } catch (error) {
    console.error("❌ Error al inicializar ImanesController:", error);
    isInitializing = false;
  }
}

// Función para verificar y reinicializar si es necesario
function verificarYReinicializar(force = false) {
  if (isInitializing) return;
  
  const previewSection = document.getElementById("preview-section");
  const searchInput = document.getElementById("search-login");
  
  // Si existe el DOM pero no hay controlador o no está funcionando
  if (previewSection && searchInput) {
    // Verificar si los eventos están configurados
    const hasEvents = searchInput.hasAttribute('data-events-configured');
    
    if (!imanesController || !hasEvents || force) {
      console.log("🔄 Verificación: reinicializando ImanesController...");
      inicializarImanes(force);
    }
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    inicializarImanes();
  });
} else {
  // Si el DOM ya está listo, inicializar inmediatamente
  inicializarImanes();
}

// Escuchar eventos del router para detectar cuando se carga la app de imanes
if (typeof window !== 'undefined') {
  // Función para verificar y reinicializar con múltiples intentos
  function intentarReinicializar(intentos = 0, maxIntentos = 15) {
    // Limpiar el flag de inicialización si lleva mucho tiempo
    if (isInitializing && (Date.now() - lastInitTime) > 5000) {
      console.warn("⚠️ Limpiando flag de inicialización bloqueado");
      isInitializing = false;
    }
    
    const previewSection = document.getElementById("preview-section");
    const searchInput = document.getElementById("search-login");
    
    if (previewSection && searchInput) {
      // Verificar que los elementos estén realmente en el DOM actual (no de una carga anterior)
      const isInCurrentDOM = document.body && document.body.contains(previewSection) && document.body.contains(searchInput);
      
      if (isInCurrentDOM) {
        // Si el DOM está disponible, verificar y reinicializar
        const hasEvents = searchInput.hasAttribute('data-events-configured');
        if (!imanesController || !hasEvents) {
          console.log("🔄 DOM disponible, reinicializando ImanesController...");
          verificarYReinicializar(true);
        } else {
          console.log("✅ ImanesController ya está funcionando correctamente");
        }
      } else if (intentos < maxIntentos) {
        // Si los elementos no están en el DOM actual, esperar más
        console.log(`⏳ Esperando DOM actual... (intento ${intentos + 1}/${maxIntentos})`);
        setTimeout(() => {
          intentarReinicializar(intentos + 1, maxIntentos);
        }, 200);
      } else {
        console.warn("⚠️ Los elementos no están en el DOM actual después de múltiples intentos");
      }
    } else if (intentos < maxIntentos) {
      // Si el DOM no está disponible, intentar de nuevo
      console.log(`⏳ Esperando DOM... (intento ${intentos + 1}/${maxIntentos})`);
      setTimeout(() => {
        intentarReinicializar(intentos + 1, maxIntentos);
      }, 200);
    } else {
      console.warn("⚠️ No se pudo encontrar el DOM después de múltiples intentos");
    }
  }
  
  // Escuchar evento de app cargada
  window.addEventListener('app:loaded', (e) => {
    const { app } = e.detail || {};
    if (app === 'imanes') {
      console.log("📢 Evento app:loaded recibido para imanes");
      // Esperar un poco más para que el router termine de cargar el HTML
      setTimeout(() => {
        intentarReinicializar();
      }, 500);
    }
  });
  
  // Escuchar evento de app lista
  window.addEventListener('app:ready', (e) => {
    const { app } = e.detail || {};
    if (app === 'imanes') {
      console.log("📢 Evento app:ready recibido para imanes");
      // En este punto el DOM debería estar listo
      setTimeout(() => {
        intentarReinicializar();
      }, 300);
    }
  });
  
  // Verificar después de delays para navegación SPA
  setTimeout(() => {
    verificarYReinicializar();
  }, 500);
  
  setTimeout(() => {
    verificarYReinicializar();
  }, 1500);
  
  // También verificar cuando se detecta que se carga contenido nuevo
  if (document.body) {
    let checkTimeout;
    const observer = new MutationObserver((mutations) => {
      // Solo verificar si se agregaron nodos que podrían ser la app de imanes
      const hasRelevantChanges = mutations.some(mutation => {
        return Array.from(mutation.addedNodes).some(node => {
          if (node.nodeType === 1) { // Element node
            return node.id === 'preview-section' || 
                   node.querySelector?.('#preview-section') ||
                   node.id === 'search-login' ||
                   node.querySelector?.('#search-login');
          }
          return false;
        });
      });
      
      if (hasRelevantChanges) {
        // Debounce: esperar a que termine el cambio antes de verificar
        clearTimeout(checkTimeout);
        checkTimeout = setTimeout(() => {
          verificarYReinicializar();
        }, 300);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }
}
