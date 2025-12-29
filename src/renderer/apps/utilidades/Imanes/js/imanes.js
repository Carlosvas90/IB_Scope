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
    this.filteredLogins = [];
    this.skillmatrixData = null; // Para obtener formaciones
    this.libreriasDisponibles = false; // Flag para saber si las librerías están cargadas

    this.init();
  }

  async init() {
    console.log("🔧 ImanesController inicializando...");
    try {
      // Intentar cargar librerías en segundo plano (no bloquear la inicialización)
      this.verificarLibrerias().catch((error) => {
        console.warn("⚠️ Librerías no disponibles, se cargarán cuando sea necesario:", error);
        this.libreriasDisponibles = false;
      });

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
        this.sharedDataPath = `${this.userDataPath}\\data\\pizarra`;
        this.dataPaths = [this.sharedDataPath];
      }

      await this.cargarDatos();
      this.configurarEventos();
      this.actualizarListaLogins();

      console.log("✅ ImanesController inicializado correctamente");
      this.actualizarEstado("✅ Listo");
    } catch (error) {
      console.error("❌ Error inicializando ImanesController:", error);
      this.mostrarToast("Error al inicializar la aplicación", "error");
      this.actualizarEstado("❌ Error");
    }
  }

  /**
   * Carga las librerías necesarias dinámicamente
   * Primero intenta cargar desde node_modules, luego desde CDN como fallback
   */
  async cargarLibrerias() {
    // Obtener la ruta de la app para acceder a node_modules
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
        skipIfAvailable: () => typeof bwipjs !== "undefined" && bwipjs.toCanvas,
      },
      {
        name: "jsPDF",
        nodeModulesPath: appPath ? `node_modules/jspdf/dist/jspdf.umd.min.js` : null,
        cdnUrl: "https://unpkg.com/jspdf@2/dist/jspdf.umd.min.js",
        check: () => typeof window.jspdf !== "undefined",
        alternativeUrl: "https://cdn.jsdelivr.net/npm/jspdf@2/dist/jspdf.umd.min.js",
        skipIfAvailable: () => typeof window.jspdf !== "undefined",
      },
      {
        name: "html2canvas",
        nodeModulesPath: appPath ? `node_modules/html2canvas/dist/html2canvas.min.js` : null,
        cdnUrl: "https://unpkg.com/html2canvas@1/dist/html2canvas.min.js",
        check: () => typeof html2canvas !== "undefined",
        alternativeUrl: "https://cdn.jsdelivr.net/npm/html2canvas@1/dist/html2canvas.min.js",
        skipIfAvailable: () => typeof html2canvas !== "undefined",
      },
    ];

    for (const lib of librerias) {
      // Verificar si ya está cargada (incluyendo skipIfAvailable)
      if (lib.check() || (lib.skipIfAvailable && lib.skipIfAvailable())) {
        console.log(`✅ ${lib.name} ya está disponible`);
        continue;
      }

      // Verificar si el script ya existe
      const existingScript = document.querySelector(`script[src="${lib.url}"]`);
      if (existingScript) {
        console.log(`⏳ ${lib.name} ya se está cargando, esperando...`);
        // Esperar a que se cargue
        await new Promise((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 100;
          const checkInterval = setInterval(() => {
            attempts++;
            if (lib.check()) {
              clearInterval(checkInterval);
              console.log(`✅ ${lib.name} cargado`);
              resolve();
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval);
              reject(new Error(`Timeout esperando ${lib.name}`));
            }
          }, 100);
        });
        continue;
      }

      // Cargar la librería
      console.log(`📦 Cargando ${lib.name}...`);
      await new Promise((resolve, reject) => {
        let triedSources = 0;
        const maxSources = 3; // node_modules, CDN principal, CDN alternativo
        
        const tryLoad = async (source) => {
          triedSources++;
          let scriptUrl = null;
          
          if (source === "node_modules" && lib.nodeModulesPath && appPath) {
            // Intentar cargar desde node_modules usando readFile
            try {
              const result = await window.api.readFile(lib.nodeModulesPath);
              if (result.success) {
                // Crear un blob URL desde el contenido
                const blob = new Blob([result.content], { type: "application/javascript" });
                scriptUrl = URL.createObjectURL(blob);
                console.log(`📦 Cargando ${lib.name} desde node_modules...`);
              }
            } catch (error) {
              console.log(`⚠️ No se pudo cargar ${lib.name} desde node_modules:`, error);
            }
          } else if (source === "cdn") {
            scriptUrl = lib.cdnUrl;
            console.log(`📦 Cargando ${lib.name} desde CDN...`);
          } else if (source === "alternative") {
            scriptUrl = lib.alternativeUrl;
            console.log(`📦 Cargando ${lib.name} desde CDN alternativo...`);
          }
          
          if (!scriptUrl) {
            if (triedSources < maxSources) {
              // Intentar siguiente fuente
              if (source === "node_modules") {
                tryLoad("cdn");
              } else if (source === "cdn") {
                tryLoad("alternative");
              } else {
                reject(new Error(`No se pudo cargar ${lib.name} desde ninguna fuente`));
              }
              return;
            } else {
              reject(new Error(`No se pudo cargar ${lib.name} desde ninguna fuente`));
              return;
            }
          }
          
          const script = document.createElement("script");
          script.src = scriptUrl;
          script.async = true;
          if (source !== "node_modules") {
            script.crossOrigin = "anonymous";
          }

          script.onload = () => {
            // Esperar un poco más para que se inicialice
            setTimeout(() => {
              if (lib.check()) {
                console.log(`✅ ${lib.name} cargado correctamente desde ${source}`);
                if (scriptUrl.startsWith("blob:")) {
                  URL.revokeObjectURL(scriptUrl);
                }
                resolve();
              } else {
                if (triedSources < maxSources) {
                  // Intentar siguiente fuente
                  if (source === "node_modules") {
                    tryLoad("cdn");
                  } else if (source === "cdn") {
                    tryLoad("alternative");
                  } else {
                    reject(new Error(`${lib.name} no se inicializó correctamente`));
                  }
                } else {
                  if (scriptUrl.startsWith("blob:")) {
                    URL.revokeObjectURL(scriptUrl);
                  }
                  reject(new Error(`${lib.name} no se inicializó correctamente`));
                }
              }
            }, 100);
          };

          script.onerror = () => {
            if (scriptUrl.startsWith("blob:")) {
              URL.revokeObjectURL(scriptUrl);
            }
            if (triedSources < maxSources) {
              // Intentar siguiente fuente
              if (source === "node_modules") {
                tryLoad("cdn");
              } else if (source === "cdn") {
                tryLoad("alternative");
              } else {
                reject(new Error(`Error cargando ${lib.name}`));
              }
            } else {
              reject(new Error(`Error cargando ${lib.name} desde todas las fuentes`));
            }
          };

          document.head.appendChild(script);
        };
        
        // Intentar primero desde node_modules, luego CDN
        tryLoad("node_modules");
      });
    }
  }

  /**
   * Verifica que las librerías necesarias estén disponibles
   */
  async verificarLibrerias() {
    try {
      await this.cargarLibrerias();
      this.libreriasDisponibles = true;
      console.log("✅ Todas las librerías están disponibles");
    } catch (error) {
      console.error("❌ Error cargando librerías:", error);
      this.libreriasDisponibles = false;
      // No lanzar error, solo marcar como no disponibles
      // Las librerías se intentarán cargar cuando se necesiten
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
   * Carga los datos necesarios
   */
  async cargarDatos() {
    try {
      // Cargar roster
      const rosterResult = await this.obtenerRutaCompartida("roster.json");
      if (rosterResult && rosterResult.data && rosterResult.data.roster) {
        this.rosterData = rosterResult.data.roster;
        console.log(`✅ Roster cargado: ${this.rosterData.length} usuarios`);
      } else {
        this.rosterData = [];
        console.warn("⚠️ Roster no encontrado");
      }

      // Cargar skillmatrix para obtener formaciones
      const skillResult = await this.obtenerRutaCompartida("skillmatrix.json");
      if (skillResult) {
        this.skillmatrixData = skillResult.data;
        console.log("✅ Skillmatrix cargada");
      } else {
        this.skillmatrixData = { usuarios: {} };
        console.warn("⚠️ Skillmatrix no encontrada");
      }

      // Preparar lista de logins
      if (this.rosterData && this.rosterData.length > 0) {
        this.allLogins = this.rosterData.map((user) => ({
          login: user.login,
          employee_name: user.employee_name,
          shift: user.shift || "N/A",
        }));
        this.filteredLogins = [...this.allLogins];
      }
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
      throw error;
    }
  }

  /**
   * Configura los event listeners
   */
  configurarEventos() {
    // Búsqueda
    const searchInput = document.getElementById("search-login");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.filtrarLogins(e.target.value);
      });
    }

    // Botones
    document
      .getElementById("btn-limpiar-seleccion")
      .addEventListener("click", () => {
        this.limpiarSeleccion();
      });

    document
      .getElementById("btn-generar-preview")
      .addEventListener("click", () => {
        this.generarPreview();
      });

    document.getElementById("btn-exportar-pdf").addEventListener("click", () => {
      this.exportarPDF();
    });

    document
      .getElementById("btn-cerrar-preview")
      .addEventListener("click", () => {
        document.getElementById("preview-section").style.display = "none";
      });
  }

  /**
   * Filtra los logins según el texto de búsqueda
   */
  filtrarLogins(texto) {
    const textoLower = texto.toLowerCase().trim();
    if (!textoLower) {
      this.filteredLogins = [...this.allLogins];
    } else {
      this.filteredLogins = this.allLogins.filter(
        (user) =>
          user.login.toLowerCase().includes(textoLower) ||
          user.employee_name.toLowerCase().includes(textoLower)
      );
    }
    this.actualizarListaLogins();
  }

  /**
   * Actualiza la lista de logins en el DOM
   */
  actualizarListaLogins() {
    const loginList = document.getElementById("login-list");
    if (!loginList) return;

    if (this.filteredLogins.length === 0) {
      loginList.innerHTML = '<div class="empty-state">No se encontraron logins</div>';
      return;
    }

    loginList.innerHTML = this.filteredLogins
      .map((user) => {
        const isSelected = this.selectedLogins.has(user.login);
        return `
          <div class="login-item ${isSelected ? "selected" : ""}" data-login="${user.login}">
            <label>
              <input type="checkbox" ${isSelected ? "checked" : ""} />
              <div class="login-info">
                <span class="login-name">${user.login}</span>
                <span class="login-details">${user.employee_name} - ${user.shift}</span>
              </div>
            </label>
          </div>
        `;
      })
      .join("");

    // Agregar event listeners a los checkboxes
    loginList.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const loginItem = e.target.closest(".login-item");
        const login = loginItem.dataset.login;
        if (e.target.checked) {
          this.selectedLogins.add(login);
        } else {
          this.selectedLogins.delete(login);
        }
        this.actualizarSeleccion();
      });
    });
  }

  /**
   * Actualiza la lista de logins seleccionados
   */
  actualizarSeleccion() {
    const selectedList = document.getElementById("selected-logins-list");
    const selectedCount = document.getElementById("selected-count");
    const exportBtn = document.getElementById("btn-exportar-pdf");

    if (!selectedList || !selectedCount) return;

    selectedCount.textContent = this.selectedLogins.size;
    exportBtn.disabled = this.selectedLogins.size === 0;

    if (this.selectedLogins.size === 0) {
      selectedList.innerHTML = '<div class="empty-state">No hay logins seleccionados</div>';
      return;
    }

    const selectedUsers = Array.from(this.selectedLogins)
      .map((login) => this.allLogins.find((u) => u.login === login))
      .filter(Boolean);

    selectedList.innerHTML = selectedUsers
      .map((user) => {
        return `
          <div class="selected-login-item">
            <span class="selected-login-name">${user.login}</span>
            <span class="selected-login-details">${user.employee_name}</span>
            <button class="btn-remove" data-login="${user.login}">×</button>
          </div>
        `;
      })
      .join("");

    // Agregar event listeners a los botones de eliminar
    selectedList.querySelectorAll(".btn-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const login = e.target.dataset.login;
        this.selectedLogins.delete(login);
        this.actualizarSeleccion();
        this.actualizarListaLogins();
      });
    });
  }

  /**
   * Limpia la selección
   */
  limpiarSeleccion() {
    this.selectedLogins.clear();
    this.actualizarSeleccion();
    this.actualizarListaLogins();
  }

  /**
   * Obtiene los datos de un usuario del roster
   */
  obtenerDatosUsuario(login) {
    return this.rosterData.find((u) => u.login === login);
  }

  /**
   * Obtiene las formaciones de un usuario desde skillmatrix
   */
  obtenerFormacionesUsuario(login) {
    if (!this.skillmatrixData || !this.skillmatrixData.usuarios) {
      return [];
    }
    const usuario = this.skillmatrixData.usuarios[login];
    if (!usuario || !usuario.formaciones) {
      return [];
    }
    // Retornar solo las formaciones que tienen valor true
    return Object.entries(usuario.formaciones)
      .filter(([_, tieneFormacion]) => tieneFormacion === true)
      .map(([formacion, _]) => formacion);
  }

  /**
   * Genera un código DataMatrix para un login
   */
  async generarDataMatrix(login) {
    console.log("🔄 generarDataMatrix() para:", login);
    console.log("📦 bwipjs disponible:", typeof bwipjs !== "undefined", "toCanvas:", typeof bwipjs?.toCanvas);
    
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 segundos máximo
      
      // Esperar a que bwipjs esté disponible
      const checkBwipjs = () => {
        attempts++;
        console.log(`🔄 Intento ${attempts} de generar DataMatrix...`);
        
        if (typeof bwipjs !== "undefined" && bwipjs.toCanvas) {
          try {
            // Crear un canvas temporal
            const canvas = document.createElement("canvas");
            console.log("🎨 Canvas creado, llamando a bwipjs.toCanvas...");
            
            // bwip-js 4.x es SÍNCRONO, no usa callbacks
            // Generar DataMatrix usando bwip-js
            bwipjs.toCanvas(canvas, {
              bcid: "datamatrix", // Tipo: DataMatrix
              text: login, // Texto a codificar
              scale: 4, // Escala del código (ajustar para que quepa en el espacio)
              includetext: false, // No incluir texto debajo
            });
            
            // Convertir canvas a data URL
            const dataUrl = canvas.toDataURL("image/png");
            console.log("✅ DataMatrix generado exitosamente");
            resolve(dataUrl);
          } catch (error) {
            console.error("❌ Error en bwipjs.toCanvas:", error);
            reject(error);
          }
        } else if (attempts >= maxAttempts) {
          console.error("❌ Timeout esperando bwipjs");
          reject(new Error("bwip-js library no se cargó después de varios intentos. Verifica tu conexión a internet."));
        } else {
          // Reintentar después de 100ms
          setTimeout(checkBwipjs, 100);
        }
      };
      checkBwipjs();
    });
  }

  /**
   * Carga la plantilla SVG
   */
  async cargarPlantillaSVG() {
    try {
      console.log("📥 Cargando plantilla SVG...");
      // La plantilla está en assets/svg/Flow/Iman_plantilla.svg
      // Usar window.api.readFile para cargar desde assets
      const result = await window.api.readFile("assets/svg/Flow/Iman_plantilla.svg");
      console.log("📥 Resultado de readFile:", result.success, result.error || "OK");
      if (!result.success) {
        throw new Error(result.error || "No se pudo cargar la plantilla SVG");
      }
      console.log("✅ Plantilla SVG cargada, longitud:", result.content.length);
      return result.content;
    } catch (error) {
      console.error("❌ Error cargando plantilla SVG:", error);
      throw error;
    }
  }

  /**
   * Rellena un SVG con los datos de un usuario
   */
  async rellenarSVG(usuario, formaciones) {
    try {
      console.log("🔄 rellenarSVG() iniciando para:", usuario.login);
      const svgTemplate = await this.cargarPlantillaSVG();
      console.log("✅ Template cargado");
      
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgTemplate, "image/svg+xml");
      const svg = svgDoc.documentElement;
      console.log("✅ SVG parseado");

      // Parsear nombre completo
      const nombreCompleto = usuario.employee_name || "";
      const partes = nombreCompleto.split(",");
      const apellidos = partes[0]?.trim() || "";
      const nombres = partes[1]?.trim() || "";
      console.log("📝 Nombres:", nombres, "Apellidos:", apellidos);

      // Actualizar textos
      this.actualizarElementoSVG(svg, "Nombres", nombres);
      this.actualizarElementoSVG(svg, "Apellidos", apellidos);
      this.actualizarElementoSVG(svg, "Login", usuario.login);
      this.actualizarElementoSVG(svg, "Turno", usuario.shift || "N/A");
      console.log("✅ Textos actualizados");

      // Generar y actualizar DataMatrix
      console.log("🔄 Generando DataMatrix para:", usuario.login);
      const datamatrixDataUrl = await this.generarDataMatrix(usuario.login);
      console.log("✅ DataMatrix generado, longitud URL:", datamatrixDataUrl?.length || 0);
      const qrRect = svg.querySelector("#QR");
      if (qrRect) {
        // Crear elemento image para el DataMatrix
        const datamatrixImage = svgDoc.createElementNS("http://www.w3.org/2000/svg", "image");
        datamatrixImage.setAttribute("href", datamatrixDataUrl);
        datamatrixImage.setAttribute("x", qrRect.getAttribute("x"));
        datamatrixImage.setAttribute("y", qrRect.getAttribute("y"));
        datamatrixImage.setAttribute("width", qrRect.getAttribute("width"));
        datamatrixImage.setAttribute("height", qrRect.getAttribute("height"));
        datamatrixImage.setAttribute("preserveAspectRatio", "xMidYMid meet");
        // Reemplazar el rectángulo con la imagen (eliminar el rectángulo)
        qrRect.parentNode.replaceChild(datamatrixImage, qrRect);
      }

      // Actualizar formaciones (FN_1 a FN_25 y FNC_1 a FNC_25)
      for (let i = 1; i <= 25; i++) {
        const formacion = formaciones[i - 1] || "";
        this.actualizarElementoSVG(svg, `FN_${i}`, formacion);

        // Color del cuadro de formación (verde si tiene formación, gris si no)
        const colorRect = svg.querySelector(`#FNC_${i}`);
        if (colorRect) {
          if (formacion) {
            colorRect.setAttribute("fill", "#4ade80"); // Verde
          } else {
            colorRect.setAttribute("fill", "#9ca3af"); // Gris
          }
        }
      }

      // Serializar SVG
      const serializer = new XMLSerializer();
      return serializer.serializeToString(svg);
    } catch (error) {
      console.error("Error rellenando SVG:", error);
      throw error;
    }
  }

  /**
   * Actualiza un elemento de texto en el SVG
   */
  actualizarElementoSVG(svg, id, texto) {
    // Los IDs en SVG pueden tener _x5F_ en lugar de _
    const idVariants = [
      id,
      id.replace(/_/g, "_x5F_"),
      id.replace(/_x5F_/g, "_"),
    ];

    for (const variantId of idVariants) {
      const elemento = svg.querySelector(`#${variantId}`);
      if (elemento) {
        // Si es un grupo <g>, buscar el elemento <text> dentro
        if (elemento.tagName === "g") {
          const textElement = elemento.querySelector("text");
          if (textElement) {
            const tspan = textElement.querySelector("tspan");
            if (tspan) {
              tspan.textContent = texto;
            } else {
              textElement.textContent = texto;
            }
            return;
          }
        } else {
          // Si es directamente un elemento <text>
          const tspan = elemento.querySelector("tspan");
          if (tspan) {
            tspan.textContent = texto;
          } else {
            elemento.textContent = texto;
          }
          return;
        }
      }
    }
  }

  /**
   * Genera la vista previa de los imanes
   */
  async generarPreview() {
    console.log("🔄 generarPreview() llamado");
    console.log("📋 Logins seleccionados:", this.selectedLogins.size, Array.from(this.selectedLogins));
    
    if (this.selectedLogins.size === 0) {
      this.mostrarToast("Selecciona al menos un login", "warning");
      console.log("⚠️ No hay logins seleccionados");
      return;
    }

    // Verificar que las librerías estén disponibles antes de generar
    if (!this.libreriasDisponibles) {
      this.mostrarToast("Cargando librerías necesarias...", "info");
      try {
        await this.verificarLibrerias();
        if (!this.libreriasDisponibles) {
          this.mostrarToast(
            "No se pudieron cargar las librerías necesarias. Por favor, verifica tu conexión a internet e intenta recargar la página.",
            "error"
          );
          return;
        }
      } catch (error) {
        this.mostrarToast(
          "Error al cargar las librerías necesarias. Por favor, intenta recargar la página.",
          "error"
        );
        return;
      }
    }

    const previewSection = document.getElementById("preview-section");
    const previewContainer = document.getElementById("imanes-preview");

    previewSection.style.display = "block";
    previewContainer.innerHTML = '<div class="loading">Generando imanes...</div>';

    try {
      const imanesHTML = [];
      console.log("🔄 Procesando", this.selectedLogins.size, "logins...");

      for (const login of this.selectedLogins) {
        console.log(`📄 Procesando login: ${login}`);
        const usuario = this.obtenerDatosUsuario(login);
        if (!usuario) {
          console.warn(`Usuario ${login} no encontrado en roster`);
          continue;
        }
        console.log(`👤 Usuario encontrado:`, usuario);

        const formaciones = this.obtenerFormacionesUsuario(login);
        console.log(`📚 Formaciones:`, formaciones);
        
        console.log(`🎨 Generando SVG para ${login}...`);
        const svgRellenado = await this.rellenarSVG(usuario, formaciones);
        console.log(`✅ SVG generado para ${login}`);

        imanesHTML.push(`
          <div class="iman-preview-item">
            <div class="iman-svg-container">
              ${svgRellenado}
            </div>
            <div class="iman-info">
              <strong>${usuario.login}</strong> - ${usuario.employee_name}
            </div>
          </div>
        `);
      }

      console.log(`✅ Todos los imanes generados:`, imanesHTML.length);
      previewContainer.innerHTML = imanesHTML.join("");

      this.mostrarToast(
        `${this.selectedLogins.size} imanes generados correctamente`,
        "success"
      );
    } catch (error) {
      console.error("❌ Error generando preview:", error);
      previewContainer.innerHTML =
        '<div class="error">Error al generar los imanes: ' + error.message + '</div>';
      this.mostrarToast("Error al generar los imanes: " + error.message, "error");
    }
  }

  /**
   * Exporta los imanes a PDF
   * Formato: A4 landscape con 10 imanes por página (2 columnas x 5 filas)
   * Tamaño de cada imán: 117mm x 31.8mm
   * Separación entre imanes: 2mm
   */
  async exportarPDF() {
    if (this.selectedLogins.size === 0) {
      this.mostrarToast("Selecciona al menos un login", "warning");
      return;
    }

    this.mostrarToast("Generando PDF...", "info");

    try {
      // Primero generar el preview si no está visible
      const previewSection = document.getElementById("preview-section");
      if (previewSection.style.display === "none") {
        await this.generarPreview();
        // Esperar un poco para que se renderice
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Configuración de dimensiones
      const IMAN_WIDTH = 117; // mm
      const IMAN_HEIGHT = 31.8; // mm
      const SEPARACION = 2; // mm
      const COLUMNAS = 2;
      const FILAS = 5;
      const IMANES_POR_PAGINA = COLUMNAS * FILAS; // 10

      // A4 landscape: 297mm x 210mm
      const PAGE_WIDTH = 297;
      const PAGE_HEIGHT = 210;

      // Calcular márgenes para centrar los imanes en la página
      const CONTENT_WIDTH = (IMAN_WIDTH * COLUMNAS) + (SEPARACION * (COLUMNAS - 1)); // 236mm
      const CONTENT_HEIGHT = (IMAN_HEIGHT * FILAS) + (SEPARACION * (FILAS - 1)); // 167mm
      const MARGIN_LEFT = (PAGE_WIDTH - CONTENT_WIDTH) / 2; // ~30.5mm
      const MARGIN_TOP = (PAGE_HEIGHT - CONTENT_HEIGHT) / 2; // ~21.5mm

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const previewContainer = document.getElementById("imanes-preview");
      const imanesItems = previewContainer.querySelectorAll(".iman-preview-item");
      const totalImanes = imanesItems.length;
      
      console.log(`📄 Generando PDF con ${totalImanes} imanes...`);
      console.log(`📐 ${IMANES_POR_PAGINA} imanes por página, ${Math.ceil(totalImanes / IMANES_POR_PAGINA)} páginas`);

      let imanIndex = 0;
      let paginaActual = 0;

      while (imanIndex < totalImanes) {
        // Agregar nueva página si no es la primera
        if (paginaActual > 0) {
          pdf.addPage();
        }

        // Procesar imanes para esta página
        for (let fila = 0; fila < FILAS && imanIndex < totalImanes; fila++) {
          for (let col = 0; col < COLUMNAS && imanIndex < totalImanes; col++) {
            const item = imanesItems[imanIndex];
            const svgContainer = item.querySelector(".iman-svg-container");
            const svgElement = svgContainer.querySelector("svg");

            if (svgElement) {
              // Convertir SVG a imagen usando html2canvas
              const canvas = await html2canvas(svgContainer, {
                backgroundColor: "#ffffff",
                scale: 3, // Mayor resolución para mejor calidad
              });

              const imgData = canvas.toDataURL("image/png");
              
              // Calcular posición en la página
              const x = MARGIN_LEFT + (col * (IMAN_WIDTH + SEPARACION));
              const y = MARGIN_TOP + (fila * (IMAN_HEIGHT + SEPARACION));
              
              pdf.addImage(imgData, "PNG", x, y, IMAN_WIDTH, IMAN_HEIGHT);
            }

            imanIndex++;
          }
        }

        paginaActual++;
      }

      // Guardar PDF
      const nombreArchivo = `imanes_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(nombreArchivo);

      this.mostrarToast(`PDF exportado: ${totalImanes} imanes en ${paginaActual} página(s)`, "success");
    } catch (error) {
      console.error("Error exportando PDF:", error);
      this.mostrarToast("Error al exportar PDF: " + error.message, "error");
    }
  }

  /**
   * Muestra un toast de notificación
   */
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
   * Actualiza el estado en el header
   */
  actualizarEstado(mensaje) {
    const statusText = document.getElementById("status-text");
    if (statusText) {
      statusText.textContent = mensaje;
    }
  }
}

// Inicializar cuando el DOM esté listo
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

