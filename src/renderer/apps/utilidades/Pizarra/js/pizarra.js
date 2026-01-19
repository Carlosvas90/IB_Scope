/**
 * Pizarra - Gestión de Puestos y Asignaciones
 * Sistema de escaneo y gestión de personal en puestos de trabajo
 */

import { eventBus } from "./services/EventBus.js";
import { PIZARRA_EVENTS } from "./constants/events.js";

class PizarraController {
  constructor() {
    this.userDataPath = null; // Solo para archivos temporales del usuario
    this.sharedDataPath = null; // Ruta compartida desde data_paths
    this.dataPaths = null; // Array de rutas compartidas
    this.analyticsPaths = null; // Rutas de Analytics para obtener rates reales
    this.puestosData = null;
    this.skillmatrixData = null;
    this.pizarraActual = null;
    this.puestoActual = null;
    this.modoEscaneo = "puesto"; // "puesto" o "usuario"
    this.audioContext = null;
    this.eventBus = eventBus;
    this.rosterData = null; // Datos del roster de empleados
    this.usuarioActualSkillMatrix = null; // Usuario actual en modal de skill matrix
    this.puestoSeleccionadoParaAgregar = null; // Puesto seleccionado para agregar usuario
    this.usuariosDisponiblesFiltrados = null; // Usuarios filtrados en modal
    this.saveTimeout = null; // Para debounce del guardado
    this.pendingSave = false; // Flag para indicar si hay guardado pendiente
    this.procesoActualDetalle = null; // Proceso actual en modal de detalle
    this.userRatesCache = {}; // Cache de rates de usuarios para evitar múltiples lecturas

    // Configurar listeners del EventBus
    this.configurarEventListeners();

    this.init();
  }

  /**
   * Configurar listeners del EventBus
   */
  configurarEventListeners() {
    // Escuchar eventos de actualización del dashboard
    this.eventBus.subscribe(PIZARRA_EVENTS.PIZARRA_ACTUALIZADA, async () => {
      await this.actualizarDashboard();
    });

    // Escuchar eventos de datos guardados
    this.eventBus.subscribe(PIZARRA_EVENTS.DATOS_GUARDADOS, () => {
      console.log("[PizarraController] Datos guardados confirmados");
    });

    // Escuchar eventos de error
    this.eventBus.subscribe(PIZARRA_EVENTS.DATOS_ERROR, (error) => {
      console.error("[PizarraController] Error en datos:", error);
      this.mostrarToast(
        `Error: ${error.message || "Error desconocido"}`,
        "error"
      );
    });
  }

  async init() {
    console.log("🔧 PizarraController inicializando...");

    try {
      // Obtener ruta de datos del usuario (para archivos temporales)
      this.userDataPath = await window.api.getUserDataPath();
      console.log("📁 User Data Path:", this.userDataPath);

      // Obtener rutas compartidas desde config
      const config = await window.api.getConfig();

      // Intentar usar pizarra_paths primero (específico para Pizarra)
      if (
        config &&
        config.pizarra_paths &&
        Array.isArray(config.pizarra_paths) &&
        config.pizarra_paths.length > 0
      ) {
        // pizarra_paths ya apunta directamente a Data_Flow
        this.dataPaths = config.pizarra_paths;
        console.log("✅ Usando pizarra_paths del config");
      } else if (
        config &&
        config.data_paths &&
        Array.isArray(config.data_paths) &&
        config.data_paths.length > 0
      ) {
        // Fallback: construir desde data_paths + Data_Flow
        this.dataPaths = config.data_paths.map((path) => {
          const normalized = this.normalizarRutaWindows(path);
          return normalized.endsWith("\\")
            ? normalized + "Data_Flow"
            : normalized + "\\Data_Flow";
        });
        console.log("⚠️ Usando data_paths + Data_Flow (fallback)");
      } else {
        console.warn(
          "⚠️ No se encontraron rutas en config, usando userDataPath como fallback"
        );
        // Fallback: usar userDataPath si no hay rutas
        this.sharedDataPath = `${this.userDataPath}\\data\\pizarra`;
        this.dataPaths = [this.sharedDataPath];
      }

      // Normalizar la primera ruta
      if (this.dataPaths && this.dataPaths.length > 0) {
        this.sharedDataPath = this.normalizarRutaWindows(this.dataPaths[0]);
        // Asegurar que termine con \
        if (!this.sharedDataPath.endsWith("\\")) {
          this.sharedDataPath += "\\";
        }
        console.log("📁 Shared Data Paths (Pizarra):", this.dataPaths);
        console.log("📁 Shared Data Path (Data_Flow):", this.sharedDataPath);
      }

      // Cargar analytics_paths para obtener rates reales
      if (config && config.analytics_paths && Array.isArray(config.analytics_paths)) {
        this.analyticsPaths = config.analytics_paths;
        console.log("📁 Analytics Paths cargados:", this.analyticsPaths);
      } else {
        console.warn("⚠️ No se encontraron analytics_paths en config");
        this.analyticsPaths = [];
      }

      // Cargar datos
      await this.cargarDatos();

      // Cargar roster de empleados
      await this.cargarRoster();

      // Configurar UI
      this.configurarEventos();
      this.configurarInputs();

      // Actualizar dashboard
      await this.actualizarDashboard();

      // Actualizar estado del archivo
      await this.updateFileStatus();

      // Emitir evento de inicialización completa
      this.eventBus.emit(PIZARRA_EVENTS.PIZARRA_CARGADA, {
        puestos: this.puestosData,
        asignaciones: this.pizarraActual.asignaciones,
      });

      console.log("✅ PizarraController inicializado correctamente");
    } catch (error) {
      console.error("❌ Error inicializando PizarraController:", error);
      this.mostrarToast("Error al inicializar la aplicación", "error");
    }
  }

  /**
   * Normaliza una ruta para Windows (especialmente rutas UNC)
   * Asegura que use barras invertidas consistentemente
   */
  normalizarRutaWindows(ruta) {
    // Para rutas UNC de Windows, usar siempre \
    if (ruta.startsWith("\\\\")) {
      return ruta.replace(/\//g, "\\");
    }
    // Para rutas normales de Windows, normalizar
    return ruta.replace(/\//g, "\\");
  }

  /**
   * Obtiene la ruta compartida para un archivo de pizarra
   * Intenta cargar desde todas las rutas disponibles
   */
  async obtenerRutaCompartida(archivo) {
    if (!this.dataPaths || this.dataPaths.length === 0) {
      return null;
    }

    // Intentar leer desde todas las rutas (prioridad: primera = red)
    for (const basePath of this.dataPaths) {
      // Normalizar la ruta base (ya apunta a Data_Flow)
      const normalizedBase = this.normalizarRutaWindows(basePath);
      const normalizedPath = normalizedBase.endsWith("\\")
        ? normalizedBase
        : normalizedBase + "\\";
      const filePath = normalizedPath + archivo;

      console.log(`🔍 Intentando leer desde: ${filePath}`);

      try {
        const result = await window.api.readJson(filePath);
        if (result.success && result.data) {
          console.log(`✅ [Pizarra] Archivo encontrado en: ${filePath}`);
          return {
            path: filePath,
            data: result.data,
            basePath: normalizedPath,
          };
        } else {
          console.log(
            `⚠️ [Pizarra] Archivo sin datos en: ${filePath}`,
            result.error || 'Sin datos'
          );
        }
      } catch (error) {
        console.warn(`⚠️ Error leyendo ${filePath}:`, error.message);
        // Continuar con la siguiente ruta
        continue;
      }
    }

    console.warn(
      `❌ [Pizarra] No se pudo encontrar ${archivo} en ninguna ruta compartida. Rutas intentadas:`,
      this.dataPaths
    );
    return null;
  }

  /**
   * Guarda un archivo en la primera ruta disponible que funcione
   */
  async guardarEnRutaCompartida(archivo, datos) {
    if (!this.dataPaths || this.dataPaths.length === 0) {
      throw new Error("No hay rutas compartidas configuradas");
    }

    // Intentar guardar en todas las rutas hasta que una funcione
    let lastError = null;
    for (const basePath of this.dataPaths) {
      // Normalizar la ruta base (ya apunta a Data_Flow)
      const normalizedBase = this.normalizarRutaWindows(basePath);
      const normalizedPath = normalizedBase.endsWith("\\")
        ? normalizedBase
        : normalizedBase + "\\";
      const filePath = normalizedPath + archivo;

      console.log(`💾 Intentando guardar en: ${filePath}`);

      try {
        const result = await window.api.writeJson(filePath, datos);
        // Verificar que realmente se guardó
        if (result && result.success === true) {
          // Si es ruta de red (UNC), intentar verificar que realmente se guardó
          // Si no se puede verificar, asumir que falló y continuar con siguiente ruta
          if (filePath.startsWith("\\\\")) {
            try {
              // Intentar leer inmediatamente para verificar
              const verifyResult = await window.api.readJson(filePath);
              if (verifyResult && verifyResult.success) {
                console.log(
                  `✅ Archivo guardado y verificado en red: ${filePath}`
                );
                return filePath;
              } else {
                throw new Error("No se pudo verificar el guardado en red");
              }
            } catch (verifyError) {
              console.warn(
                `⚠️ No se pudo verificar guardado en red (${filePath}), intentando siguiente ruta...`
              );
              lastError = new Error(
                "Ruta de red no accesible o no verificable"
              );
              continue;
            }
          } else {
            // Para rutas locales, confiar en el resultado
            console.log(`✅ Archivo guardado en: ${filePath}`);
            return filePath;
          }
        } else {
          throw new Error(result?.error || "Error desconocido al guardar");
        }
      } catch (error) {
        console.warn(`⚠️ No se pudo guardar en ${filePath}:`, error.message);
        lastError = error;
        // Continuar con la siguiente ruta
        continue;
      }
    }

    // Si llegamos aquí, ninguna ruta funcionó
    throw new Error(
      `No se pudo guardar en ninguna ruta: ${
        lastError?.message || "Error desconocido"
      }`
    );
  }

  async cargarDatos() {
    try {
      // Cargar puestos desde ruta compartida
      const puestosResult = await this.obtenerRutaCompartida("puestos.json");
      if (puestosResult) {
        this.puestosData = puestosResult.data;
        console.log("✅ Puestos cargados desde:", puestosResult.path);
      } else {
        // Cargar desde archivo local como fallback
        const localPuestosPath = `${window.location.origin}/apps/utilidades/Pizarra/data/puestos.json`;
        try {
          const response = await fetch(localPuestosPath);
          if (response.ok) {
            this.puestosData = await response.json();
            // Guardar en ruta compartida
            await this.guardarEnRutaCompartida(
              "puestos.json",
              this.puestosData
            );
          } else {
            throw new Error("Archivo local no encontrado");
          }
        } catch (error) {
          console.warn("No se pudo cargar puestos, usando datos por defecto");
          // Datos por defecto (ya están en el archivo local)
          this.puestosData = {
            puestos_predefinidos: [],
            puestos_personalizados: [],
          };
          await this.guardarEnRutaCompartida("puestos.json", this.puestosData);
        }
      }

      // Cargar skillmatrix desde ruta compartida
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

      // Cargar pizarra actual desde ruta compartida
      const pizarraResult = await this.obtenerRutaCompartida(
        "pizarra_actual.json"
      );
      if (pizarraResult && pizarraResult.data) {
        this.pizarraActual = pizarraResult.data;
        // Asegurar que tiene la estructura correcta
        if (!this.pizarraActual.asignaciones) {
          this.pizarraActual.asignaciones = [];
        }
        if (!this.pizarraActual.historial_cambios) {
          this.pizarraActual.historial_cambios = [];
        }
        // Normalizar tiene_formacion en todas las asignaciones (asegurar que sea boolean)
        this.pizarraActual.asignaciones.forEach((asignacion) => {
          if (
            asignacion.tiene_formacion === undefined ||
            asignacion.tiene_formacion === null
          ) {
            asignacion.tiene_formacion = false;
          }
        });
        console.log(
          `✅ Pizarra actual cargada desde: ${pizarraResult.path} (${this.pizarraActual.asignaciones.length} asignaciones)`
        );
      } else {
        console.log("⚠️ No se encontró pizarra_actual.json, creando nueva");
        this.pizarraActual = {
          fecha: new Date().toISOString().split("T")[0],
          asignaciones: [],
          historial_cambios: [],
        };
        await this.guardarEnRutaCompartida(
          "pizarra_actual.json",
          this.pizarraActual
        );
      }

      // Emitir evento de datos cargados
      this.eventBus.emit(PIZARRA_EVENTS.DATOS_CARGADOS, {
        puestos: this.puestosData,
        skillmatrix: this.skillmatrixData,
        pizarra: this.pizarraActual,
      });

      console.log("✅ Datos cargados correctamente");
    } catch (error) {
      console.error("❌ Error cargando datos:", error);

      // Emitir evento de error
      this.eventBus.emit(PIZARRA_EVENTS.DATOS_ERROR, {
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  async cargarRoster() {
    try {
      // Intentar cargar roster.json desde ruta compartida
      const rosterResult = await this.obtenerRutaCompartida("roster.json");

      if (rosterResult && rosterResult.data && rosterResult.data.roster) {
        this.rosterData = rosterResult.data.roster;
        console.log(
          `✅ Roster cargado desde: ${rosterResult.path} (${this.rosterData.length} usuarios)`
        );

        // Si la skillmatrix está vacía, generar una inicial
        if (
          !this.skillmatrixData ||
          Object.keys(this.skillmatrixData.usuarios || {}).length === 0
        ) {
          console.log("📋 Generando skillmatrix inicial desde roster...");
          await this.generarSkillMatrixDesdeRoster();
        }
      } else {
        // Fallback: usar asignaciones actuales
        this.rosterData = null;
        console.log(
          "⚠️ Roster JSON no encontrado en rutas compartidas, usando asignaciones actuales como fuente"
        );
      }
    } catch (error) {
      console.warn(
        "⚠️ No se pudo cargar roster, usando asignaciones actuales:",
        error
      );
      this.rosterData = null;
    }
  }

  /**
   * Helper: Verifica si un usuario tiene skill para un puesto
   * Ahora también verifica requisitos (módulos) si el puesto los requiere
   * Estructura optimizada: solo guarda true, false es implícito
   */
  tieneSkill(login, puestoId) {
    if (!this.skillmatrixData || !this.skillmatrixData.usuarios) {
      return false;
    }
    const usuario = this.skillmatrixData.usuarios[login];
    if (!usuario || !usuario.puestos) {
      return false;
    }

    // Obtener información del puesto
    const puesto = this.obtenerPuestoPorId(puestoId);
    if (!puesto) {
      // Si no existe el puesto, verificar solo si tiene el skill directo
      return usuario.puestos[puestoId] === true;
    }

    // Si el puesto tiene requisitos, verificar que el usuario tenga TODOS los módulos requeridos
    if (puesto.requisitos && Array.isArray(puesto.requisitos) && puesto.requisitos.length > 0) {
      // Verificar que el usuario tenga todos los requisitos
      const tieneTodosRequisitos = puesto.requisitos.every((requisito) => {
        // Primero, buscar el requisito como puesto (por id, nombre o función)
        const requisitoPuesto = this.buscarPuestoPorNombre(requisito);
        if (requisitoPuesto) {
          return usuario.puestos[requisitoPuesto.id] === true;
        }
        
        // Si no se encuentra como puesto, buscar directamente por nombre/id en los puestos del usuario
        // Esto permite que los requisitos sean módulos que no necesariamente están en puestos.json
        // Buscar por id normalizado
        const idNormalizado = requisito.toLowerCase().replace(/\s+/g, "-");
        if (usuario.puestos[idNormalizado] === true) {
          return true;
        }
        
        // Buscar por nombre exacto (case-insensitive)
        const tienePorNombre = Object.keys(usuario.puestos).some((puestoId) => {
          const puestoUsuario = this.obtenerPuestoPorId(puestoId);
          if (puestoUsuario) {
            return puestoUsuario.funcion?.toLowerCase() === requisito.toLowerCase();
          }
          return false;
        });
        
        return tienePorNombre;
      });
      
      return tieneTodosRequisitos;
    }

    // Si no tiene requisitos, verificar solo si tiene el skill directo del puesto
    return usuario.puestos[puestoId] === true;
  }

  /**
   * Busca un puesto por nombre (útil para encontrar requisitos)
   */
  buscarPuestoPorNombre(nombre) {
    if (!this.puestosData) return null;
    
    // Buscar en predefinidos
    let puesto = this.puestosData.puestos_predefinidos.find(
      (p) => p.funcion === nombre || p.id === nombre.toLowerCase().replace(/\s+/g, "-")
    );
    
    if (!puesto) {
      // Buscar en personalizados
      puesto = this.puestosData.puestos_personalizados.find(
        (p) => p.funcion === nombre || p.id === nombre.toLowerCase().replace(/\s+/g, "-")
      );
    }
    
    return puesto;
  }

  /**
   * Genera una skillmatrix inicial desde el roster
   * Estructura optimizada: solo guarda puestos con true
   */
  async generarSkillMatrixDesdeRoster() {
    // Si no hay roster cargado, intentar cargarlo primero
    if (!this.rosterData || this.rosterData.length === 0) {
      await this.cargarRoster();
      if (!this.rosterData || this.rosterData.length === 0) {
        this.mostrarToast(
          "⚠️ No hay datos de roster. Coloca roster.json en la ruta compartida (Pizarra/)",
          "error"
        );
        return;
      }
    }

    // Inicializar skillmatrix si no existe
    if (!this.skillmatrixData) {
      this.skillmatrixData = {
        usuarios: {},
        ultima_actualizacion: null,
      };
    }

    // Crear entrada vacía para cada usuario del roster
    let usuariosNuevos = 0;
    let usuariosExistentes = 0;

    this.rosterData.forEach((empleado) => {
      const login = empleado.login?.toUpperCase();
      if (login) {
        if (!this.skillmatrixData.usuarios[login]) {
          // Estructura optimizada: solo guardamos puestos con true
          // Si no está en la lista, es false implícitamente
          this.skillmatrixData.usuarios[login] = {
            puestos: {}, // Solo contendrá puestos con true
          };
          usuariosNuevos++;
        } else {
          usuariosExistentes++;
        }
      }
    });

    this.skillmatrixData.ultima_actualizacion = new Date().toISOString();
    await this.guardarDatos();

    const mensaje =
      usuariosNuevos > 0
        ? `✅ Skillmatrix actualizada: ${usuariosNuevos} usuarios nuevos, ${usuariosExistentes} existentes`
        : `✅ Skillmatrix verificada: ${usuariosExistentes} usuarios ya existían`;

    console.log(mensaje);
    this.mostrarToast(mensaje, "success");
  }

  async guardarDatos() {
    try {
      // Guardar en rutas compartidas
      await this.guardarEnRutaCompartida("puestos.json", this.puestosData);
      await this.guardarEnRutaCompartida(
        "skillmatrix.json",
        this.skillmatrixData
      );
      await this.guardarEnRutaCompartida(
        "pizarra_actual.json",
        this.pizarraActual
      );

      // Emitir evento de datos guardados
      this.eventBus.emit(PIZARRA_EVENTS.DATOS_GUARDADOS, {
        puestos: this.puestosData,
        skillmatrix: this.skillmatrixData,
        pizarra: this.pizarraActual,
      });

      console.log("✅ Datos guardados correctamente");
    } catch (error) {
      console.error("❌ Error guardando datos:", error);
      this.mostrarToast("Error al guardar datos", "error");
    }
  }

  /**
   * Guarda los datos con debounce para evitar múltiples guardados durante escaneo rápido
   * Espera 500ms después del último cambio antes de guardar
   */
  guardarDatosDebounced() {
    // Limpiar timeout anterior si existe
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Marcar que hay guardado pendiente
    this.pendingSave = true;

    // Establecer nuevo timeout
    this.saveTimeout = setTimeout(async () => {
      if (this.pendingSave) {
        this.pendingSave = false;
        // Guardar en segundo plano sin bloquear
        this.guardarDatos().catch((error) => {
          console.error("Error en guardado debounced:", error);
        });
      }
    }, 500); // Esperar 500ms después del último cambio
  }

  configurarEventos() {
    // Botón Generar Pizarra (mostrar panel de escaneo)
    const btnGenerarPizarra = document.getElementById("btn-generar-pizarra");
    if (btnGenerarPizarra) {
      btnGenerarPizarra.addEventListener("click", () => {
        this.toggleScanPanel();
      });
    }

    // Botón cerrar panel de escaneo
    const btnCerrarScan = document.getElementById("btn-cerrar-scan");
    if (btnCerrarScan) {
      btnCerrarScan.addEventListener("click", () => {
        this.toggleScanPanel(false);
      });
    }

    // Botón Exportar
    const btnExportar = document.getElementById("btn-exportar-pizarra");
    if (btnExportar) {
      btnExportar.addEventListener("click", () => {
        this.exportarPizarra();
      });
    }

    // Botón Borrar
    const btnBorrar = document.getElementById("btn-borrar-pizarra");
    if (btnBorrar) {
      btnBorrar.addEventListener("click", () => {
        this.borrarPizarra();
      });
    }

    // Botón Subir (preparado para futuro)
    const btnSubir = document.getElementById("btn-subir-pizarra");
    if (btnSubir) {
      btnSubir.addEventListener("click", () => {
        this.mostrarToast("Funcionalidad próximamente disponible", "info");
      });
    }

    // Input único de escaneo
    const scanInput = document.getElementById("scan-input");
    if (scanInput) {
      scanInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.procesarEscaneo(scanInput.value.trim());
          scanInput.value = "";
        }
      });
    }

    // Botón agregar puesto personalizado
    const btnAgregarPuesto = document.getElementById("btn-agregar-puesto");
    if (btnAgregarPuesto) {
      btnAgregarPuesto.addEventListener("click", () => {
        this.mostrarModalPuestoPersonalizado();
      });
    }

    // Modal detalle proceso
    const closeModalProceso = document.getElementById("close-modal-proceso");
    if (closeModalProceso) {
      closeModalProceso.addEventListener("click", () => {
        this.cerrarModal("modal-detalle-proceso");
      });
    }
    const btnCerrarDetalle = document.getElementById("btn-cerrar-detalle");
    if (btnCerrarDetalle) {
      btnCerrarDetalle.addEventListener("click", () => {
        this.cerrarModal("modal-detalle-proceso");
      });
    }
    const btnAgregarAlProceso = document.getElementById("btn-agregar-al-proceso");
    if (btnAgregarAlProceso) {
      btnAgregarAlProceso.addEventListener("click", () => {
        if (this.procesoActualDetalle) {
          this.cerrarModal("modal-detalle-proceso");
          this.mostrarModalAgregarUsuario(this.procesoActualDetalle);
        }
      });
    }

    // Modal puesto personalizado
    document
      .getElementById("close-modal-puesto")
      .addEventListener("click", () => {
        this.cerrarModal("modal-puesto-personalizado");
      });
    document.getElementById("cancel-puesto").addEventListener("click", () => {
      this.cerrarModal("modal-puesto-personalizado");
    });
    document.getElementById("save-puesto").addEventListener("click", () => {
      this.guardarPuestoPersonalizado();
    });

    // Modal agregar usuario
    document
      .getElementById("close-modal-agregar-usuario")
      .addEventListener("click", () => {
        this.cerrarModal("modal-agregar-usuario");
      });
    document
      .getElementById("cancel-agregar-usuario")
      .addEventListener("click", () => {
        this.cerrarModal("modal-agregar-usuario");
      });

    // Búsqueda en modal agregar usuario
    const searchInput = document.getElementById("search-usuario-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.filtrarUsuariosDisponibles(e.target.value);
      });
    }

    // Modal skill matrix
    document
      .getElementById("close-modal-skill-matrix")
      .addEventListener("click", () => {
        this.cerrarModal("modal-skill-matrix");
      });
    document
      .getElementById("cancel-skill-matrix")
      .addEventListener("click", () => {
        this.cerrarModal("modal-skill-matrix");
      });
    document
      .getElementById("save-skill-matrix")
      .addEventListener("click", () => {
        this.guardarSkillMatrix();
      });
  }

  configurarInputs() {
    // Auto-focus en input de escaneo al cargar
    const scanInput = document.getElementById("scan-input");
    if (scanInput) {
      setTimeout(() => scanInput.focus(), 100);
    }
  }

  /**
   * Procesa el escaneo - detecta automáticamente si es puesto o usuario
   */
  async procesarEscaneo(valor) {
    if (!valor) return;

    // Intentar primero como puesto
    const puesto = this.buscarPuesto(valor);

    if (puesto) {
      // Es un puesto
      this.puestoActual = puesto;
      this.mostrarInfoEscaneo(`Puesto: ${puesto.funcion}`, "success");

      // ACTUALIZAR DASHBOARD INMEDIATAMENTE para mostrar el puesto (aunque esté vacío)
      await this.actualizarDashboard();

      // Emitir evento
      this.eventBus.emit(PIZARRA_EVENTS.PUESTO_SELECCIONADO, {
        puesto: puesto,
      });

      // Sonido de confirmación
      this.reproducirSonido("success");
    } else if (this.puestoActual) {
      // Ya hay un puesto seleccionado, procesar como usuario
      this.procesarUsuario(valor);
    } else {
      // No hay puesto y no se encontró como puesto
      this.mostrarInfoEscaneo("Primero escanea un puesto", "warning");
      this.reproducirSonido("error");
    }
  }

  /**
   * Busca un puesto por valor escaneado
   */
  buscarPuesto(valor) {
    // Buscar en predefinidos
    let puesto = this.puestosData.puestos_predefinidos.find(
      (p) =>
        p.id === valor.toLowerCase().replace(/\s+/g, "-") ||
        p.funcion?.toLowerCase() === valor.toLowerCase()
    );

    // Si no se encuentra, buscar en personalizados
    if (!puesto) {
      puesto = this.puestosData.puestos_personalizados.find(
        (p) =>
          p.id === valor.toLowerCase().replace(/\s+/g, "-") ||
          p.funcion?.toLowerCase() === valor.toLowerCase()
      );
    }

    return puesto;
  }

  mostrarInfoEscaneo(mensaje, tipo = "info") {
    const infoDiv = document.getElementById("scan-info");
    if (infoDiv) {
      infoDiv.innerHTML = `<div class="info-puesto"><strong>${mensaje}</strong></div>`;
      infoDiv.className = `info-display info-${tipo}`;
    }
  }

  async procesarUsuario(valor) {
    if (!valor) return;
    if (!this.puestoActual) {
      this.mostrarInfoEscaneo("Primero escanea un puesto", "warning");
      this.reproducirSonido("error");
      return;
    }

    const login = valor.trim().toUpperCase();

    // Verificar si el usuario ya está asignado en este puesto
    const asignacionExistente = this.pizarraActual.asignaciones.find(
      (a) => a.puesto_id === this.puestoActual.id && a.usuario_login === login
    );

    if (asignacionExistente) {
      this.mostrarInfoEscaneo(
        `Usuario ${login} ya asignado a este puesto`,
        "warning"
      );
      this.reproducirSonido("error");

      // Emitir evento de usuario duplicado
      this.eventBus.emit(PIZARRA_EVENTS.USUARIO_DUPLICADO, {
        usuario_login: login,
        puesto_id: this.puestoActual.id,
        puesto_nombre: this.puestoActual.funcion,
      });

      return;
    }

    // Verificar si el usuario está en otro puesto
    const usuarioEnOtroPuesto = this.pizarraActual.asignaciones.find(
      (a) => a.usuario_login === login && a.puesto_id !== this.puestoActual.id
    );

    if (usuarioEnOtroPuesto) {
      // Remover del puesto anterior y asignar al nuevo (sin preguntar para velocidad)
      this.pizarraActual.asignaciones = this.pizarraActual.asignaciones.filter(
        (a) =>
          !(
            a.usuario_login === login &&
            a.puesto_id === usuarioEnOtroPuesto.puesto_id
          )
      );

      // Agregar historial de cambio
      this.pizarraActual.historial_cambios.push({
        fecha: new Date().toISOString(),
        usuario: login,
        accion: "cambio_puesto",
        desde: usuarioEnOtroPuesto.puesto_id,
        hacia: this.puestoActual.id,
      });

      // Emitir evento de asignación removida
      this.eventBus.emit(PIZARRA_EVENTS.ASIGNACION_REMOVIDA, {
        usuario_login: login,
        puesto_id: usuarioEnOtroPuesto.puesto_id,
        razon: "cambio_puesto",
      });
    }

    // Emitir evento de usuario escaneado
    this.eventBus.emit(PIZARRA_EVENTS.USUARIO_ESCANEADO, {
      login: login,
      puesto_id: this.puestoActual.id,
    });

    // Asignar directamente sin verificar skill matrix (se verifica después en dashboard)
    await this.asignarUsuario(login, false);
  }

  async asignarUsuario(login, tieneFormacion = false) {
    const asignacion = {
      usuario_login: login,
      puesto_id: this.puestoActual.id,
      puesto_nombre: this.puestoActual.funcion,
      departamento_principal: this.puestoActual.departamento_principal,
      departamento_secundario: this.puestoActual.departamento_secundario,
      funcion: this.puestoActual.funcion,
      fecha_asignacion: new Date().toISOString(),
      tiene_formacion: tieneFormacion,
    };

    this.pizarraActual.asignaciones.push(asignacion);

    // Agregar historial
    const historial = {
      fecha: new Date().toISOString(),
      usuario: login,
      accion: "asignacion",
      puesto: this.puestoActual.id,
    };
    this.pizarraActual.historial_cambios.push(historial);

    // ACTUALIZAR DASHBOARD INMEDIATAMENTE (sin esperar guardado)
    await this.actualizarDashboard();

    // Emitir eventos inmediatamente
    this.eventBus.emit(PIZARRA_EVENTS.ASIGNACION_CREADA, {
      asignacion: asignacion,
      timestamp: historial.fecha,
    });

    this.eventBus.emit(PIZARRA_EVENTS.PIZARRA_ACTUALIZADA, {
      asignaciones: this.pizarraActual.asignaciones,
      total: this.pizarraActual.asignaciones.length,
      timestamp: new Date().toISOString(),
    });

    // Feedback inmediato
    this.mostrarToast(
      `Usuario ${login} asignado a ${this.puestoActual.funcion}`,
      "success"
    );
    this.reproducirSonido("success");

    // Guardar datos de forma asíncrona con debounce (no bloquea)
    this.guardarDatosDebounced();

    // Resetear para siguiente escaneo
    this.resetearEscaneo();
  }

  resetearEscaneo() {
    // No resetear puesto actual - permite escanear múltiples usuarios al mismo puesto
    // Solo limpiar info display
    const scanInfo = document.getElementById("scan-info");
    if (scanInfo) {
      scanInfo.innerHTML = "";
      scanInfo.className = "info-display";
    }

    // Mantener focus en input
    const scanInput = document.getElementById("scan-input");
    if (scanInput) {
      scanInput.focus();
    }
  }

  obtenerPuestoPorId(puestoId) {
    let puesto = this.puestosData.puestos_predefinidos.find(
      (p) => p.id === puestoId
    );
    if (!puesto) {
      puesto = this.puestosData.puestos_personalizados.find(
        (p) => p.id === puestoId
      );
    }
    return puesto;
  }

  mostrarModalPuestoPersonalizado(valorPrellenado = null) {
    const modal = document.getElementById("modal-puesto-personalizado");

    if (valorPrellenado) {
      document.getElementById("puesto-funcion").value = valorPrellenado;
    } else {
      document.getElementById("puesto-funcion").value = "";
      document.getElementById("puesto-requisitos").value = "";
    }

    document.getElementById("puesto-depto-principal").value = "IB";
    document.getElementById("puesto-depto-secundario").value = "";

    this.mostrarModal("modal-puesto-personalizado");
    document.getElementById("puesto-funcion").focus();
  }

  async guardarPuestoPersonalizado() {
    const funcion = document.getElementById("puesto-funcion").value.trim();
    const deptoPrincipal = document.getElementById(
      "puesto-depto-principal"
    ).value;
    const deptoSecundario = document
      .getElementById("puesto-depto-secundario")
      .value.trim();
    const requisitosTexto = document.getElementById("puesto-requisitos").value.trim();

    if (!funcion || !deptoSecundario) {
      this.mostrarToast("Función y Departamento Secundario son requeridos", "error");
      return;
    }

    // Procesar requisitos: separar por comas y limpiar espacios
    const requisitos = requisitosTexto
      ? requisitosTexto.split(",").map((r) => r.trim()).filter((r) => r.length > 0)
      : [];

    const nuevoPuesto = {
      id: `${deptoSecundario.toLowerCase()}-${funcion.toLowerCase().replace(/\s+/g, "-")}`,
      departamento_principal: deptoPrincipal,
      departamento_secundario: deptoSecundario,
      funcion: funcion,
      requisitos: requisitos,
      personalizado: true,
      fecha_creacion: new Date().toISOString(),
    };
    
    // Agregar la función al orden si no existe
    if (!this.puestosData.orden_funciones) {
      this.puestosData.orden_funciones = {};
    }
    if (!this.puestosData.orden_funciones[deptoSecundario]) {
      this.puestosData.orden_funciones[deptoSecundario] = [];
    }
    if (!this.puestosData.orden_funciones[deptoSecundario].includes(funcion)) {
      this.puestosData.orden_funciones[deptoSecundario].push(funcion);
    }

    this.puestosData.puestos_personalizados.push(nuevoPuesto);

    // ACTUALIZAR DASHBOARD INMEDIATAMENTE (sin esperar guardado)
    await this.actualizarDashboard();

    // Emitir evento de puesto creado
    this.eventBus.emit(PIZARRA_EVENTS.PUESTO_CREADO, {
      puesto: nuevoPuesto,
      timestamp: new Date().toISOString(),
    });

    this.cerrarModal("modal-puesto-personalizado");
    this.mostrarToast(`Puesto "${nombre}" agregado correctamente`, "success");

    // Asignar el puesto recién creado
    this.puestoActual = nuevoPuesto;
    this.mostrarInfoEscaneo(`Puesto: ${nuevoPuesto.funcion}`, "success");

    // Guardar datos de forma asíncrona (no bloquea)
    this.guardarDatosDebounced();
  }

  async actualizarDashboard() {
    const dashboardContent = document.getElementById("dashboard-content");
    const totalAsignados = document.getElementById("total-asignados");

    if (totalAsignados) {
      totalAsignados.textContent = this.pizarraActual.asignaciones.length;
    }

    // Emitir evento de dashboard actualizado
    this.eventBus.emit(PIZARRA_EVENTS.DASHBOARD_ACTUALIZADO, {
      total: this.pizarraActual.asignaciones.length,
      asignaciones: this.pizarraActual.asignaciones,
    });

    // Agrupar asignaciones por puesto
    const porPuesto = {};

    this.pizarraActual.asignaciones.forEach((asignacion) => {
      if (!porPuesto[asignacion.puesto_id]) {
        // Obtener información completa del puesto
        const puestoCompleto = this.obtenerPuestoPorId(asignacion.puesto_id);
        const funcionNombre = puestoCompleto?.funcion || asignacion.funcion || asignacion.puesto_nombre || "Sin función";
        porPuesto[asignacion.puesto_id] = {
          puesto_id: asignacion.puesto_id,
          puesto_nombre: funcionNombre,
          departamento: asignacion.departamento_principal,
          proceso: asignacion.departamento_secundario,
          funcion: funcionNombre,
          asignaciones: [],
          alertas: 0
        };
      }
      porPuesto[asignacion.puesto_id].asignaciones.push(asignacion);
      if (!asignacion.tiene_formacion) {
        porPuesto[asignacion.puesto_id].alertas++;
      }
    });

    // Si hay un puesto actual seleccionado pero sin asignaciones, agregarlo
    if (this.puestoActual && !porPuesto[this.puestoActual.id]) {
      porPuesto[this.puestoActual.id] = {
        puesto_id: this.puestoActual.id,
        puesto_nombre: this.puestoActual.funcion,
        departamento: this.puestoActual.departamento_principal,
        proceso: this.puestoActual.departamento_secundario,
        funcion: this.puestoActual.funcion,
        asignaciones: [],
        alertas: 0
      };
    }

    // Generar HTML compacto del dashboard
    if (!dashboardContent) return;

    if (Object.keys(porPuesto).length === 0) {
      dashboardContent.innerHTML = `
        <div class="empty-dashboard">
          <p>No hay asignaciones. Usa "Generar" para comenzar a escanear.</p>
        </div>
      `;
      return;
    }

    // Agrupar jerárquicamente: Departamento Principal → Proceso → Función
    const jerarquia = {};

    Object.values(porPuesto).forEach((puesto) => {
      // Normalizar departamento principal (IB, OB, Support)
      let deptoPrincipal = puesto.departamento || "Otro";
      if (deptoPrincipal === "Inbound") deptoPrincipal = "IB";
      if (deptoPrincipal === "Outbound") deptoPrincipal = "OB";
      if (!deptoPrincipal || deptoPrincipal === "ICQA" || deptoPrincipal === "Otro") {
        deptoPrincipal = "Support";
      }

      const proceso = puesto.proceso || "Otro";
      const funcion = puesto.funcion || puesto.puesto_nombre || "Sin función";

      // Inicializar estructura si no existe
      if (!jerarquia[deptoPrincipal]) {
        jerarquia[deptoPrincipal] = {};
      }
      if (!jerarquia[deptoPrincipal][proceso]) {
        jerarquia[deptoPrincipal][proceso] = {};
      }
      if (!jerarquia[deptoPrincipal][proceso][funcion]) {
        jerarquia[deptoPrincipal][proceso][funcion] = {
          puesto_id: puesto.puesto_id,
          puesto_nombre: puesto.puesto_nombre,
          asignaciones: [],
          alertas: 0
        };
      }

      // Agregar asignaciones
      jerarquia[deptoPrincipal][proceso][funcion].asignaciones.push(...puesto.asignaciones);
      jerarquia[deptoPrincipal][proceso][funcion].alertas += puesto.alertas;
    });

    // Generar HTML jerárquico
    const ordenDepartamentos = ["IB", "OB", "Support"];
    let html = "";

    for (const depto of ordenDepartamentos) {
      if (!jerarquia[depto] || Object.keys(jerarquia[depto]).length === 0) continue;

      // Contar totales del departamento
      let totalDepto = 0;
      let alertasDepto = 0;
        Object.values(jerarquia[depto]).forEach((proceso) => {
          if (typeof proceso === 'object' && !Array.isArray(proceso)) {
            Object.values(proceso).forEach((funcion) => {
              totalDepto += funcion.asignaciones.length;
              alertasDepto += funcion.alertas;
            });
          }
        });

      // Calcular compensación para IB (Stow vs Receive) antes de generar HTML
      let compensacionHtml = '';
      if (depto === "IB") {
        let stowObjetivoIdeal = 0;
        let receiveObjetivoIdeal = 0;
        let stowObjetivoReal = 0;
        let receiveObjetivoReal = 0;
        
        // Calcular Stow (Ideal y Real)
        if (jerarquia[depto]["Stow"]) {
          // Ideal (aritmético)
          Object.values(jerarquia[depto]["Stow"]).forEach((funcionData) => {
            const puesto = this.obtenerPuestoPorId(funcionData.puesto_id);
            if (puesto && puesto.rate) {
              stowObjetivoIdeal += funcionData.asignaciones.length * puesto.rate;
            }
          });
          
          // Real (basado en historial + base cuando no hay datos)
          const stowReal = await this.calcularObjetivoReal(jerarquia[depto]["Stow"], "stow");
          stowObjetivoReal = stowReal.objetivoReal; // Ya incluye real + base
        }
        
        // Calcular Receive (Ideal y Real)
        if (jerarquia[depto]["Receive"]) {
          // Ideal (aritmético)
          Object.values(jerarquia[depto]["Receive"]).forEach((funcionData) => {
            const puesto = this.obtenerPuestoPorId(funcionData.puesto_id);
            if (puesto && puesto.rate) {
              receiveObjetivoIdeal += funcionData.asignaciones.length * puesto.rate;
            }
          });
          
          // Real (basado en historial + base cuando no hay datos)
          const receiveReal = await this.calcularObjetivoReal(jerarquia[depto]["Receive"], "receive");
          receiveObjetivoReal = receiveReal.objetivoReal; // Ya incluye real + base
        }
        
        // Calcular compensación usando el objetivo REAL
        const objetivoStow = stowObjetivoReal > 0 ? stowObjetivoReal : stowObjetivoIdeal;
        const objetivoReceive = receiveObjetivoReal > 0 ? receiveObjetivoReal : receiveObjetivoIdeal;
        
        if (objetivoStow > 0 || objetivoReceive > 0) {
          const diferencia = Math.abs(objetivoStow - objetivoReceive);
          const procesoMenor = objetivoStow < objetivoReceive ? "Stow" : "Receive";
          
          // Obtener rate promedio del proceso menor (usar real si está disponible)
          let rateMenor = 100; // Default
          if (procesoMenor === "Stow" && jerarquia[depto]["Stow"]) {
            if (stowObjetivoReal > 0) {
              // Calcular promedio real
              const totalPersonas = Object.values(jerarquia[depto]["Stow"]).reduce((sum, f) => sum + f.asignaciones.length, 0);
              rateMenor = totalPersonas > 0 ? stowObjetivoReal / totalPersonas : 100;
            } else {
              rateMenor = this.obtenerRatePromedioStow(jerarquia[depto]["Stow"]);
            }
          } else if (procesoMenor === "Receive" && jerarquia[depto]["Receive"]) {
            if (receiveObjetivoReal > 0) {
              // Calcular promedio real
              const totalPersonas = Object.values(jerarquia[depto]["Receive"]).reduce((sum, f) => sum + f.asignaciones.length, 0);
              rateMenor = totalPersonas > 0 ? receiveObjetivoReal / totalPersonas : 60;
            } else {
              rateMenor = this.obtenerRatePromedioReceive(jerarquia[depto]["Receive"]);
            }
          }
          
          const personasNecesarias = rateMenor > 0 ? Math.ceil(diferencia / rateMenor) : 0;
          const estaCompensado = diferencia <= 50; // Tolerancia de 50 unidades
          
          // Calcular variaciones porcentuales
          const variacionEstándar = stowObjetivoIdeal > 0 && receiveObjetivoIdeal > 0
            ? ((Math.abs(stowObjetivoIdeal - receiveObjetivoIdeal) / Math.max(stowObjetivoIdeal, receiveObjetivoIdeal)) * 100).toFixed(1)
            : null;
          
          const variacionHistorico = stowObjetivoReal > 0 && receiveObjetivoReal > 0
            ? ((Math.abs(stowObjetivoReal - receiveObjetivoReal) / Math.max(stowObjetivoReal, receiveObjetivoReal)) * 100).toFixed(1)
            : null;
          
          compensacionHtml = `
            <div class="compensacion-info">
              <span class="compensacion-badge ${estaCompensado ? 'compensado' : 'no-compensado'}" title="${estaCompensado ? 'Compensado' : `Faltan ${personasNecesarias} persona(s) en ${procesoMenor}`}">
                ${estaCompensado ? '✓' : '⚠'} ${estaCompensado ? 'Compensado' : `${personasNecesarias} en ${procesoMenor}`}
              </span>
              ${(stowObjetivoIdeal > 0 || receiveObjetivoIdeal > 0) ? `
                <div class="rate-comparison">
                  <span class="rate-comparison-label">Estándar:</span>
                  <span class="rate-value">Stow ${stowObjetivoIdeal.toLocaleString()}</span>
                  <span class="rate-separator">vs</span>
                  <span class="rate-value">Receive ${receiveObjetivoIdeal.toLocaleString()}</span>
                  ${variacionEstándar ? `<span class="rate-variacion">${variacionEstándar}%</span>` : ''}
                </div>
              ` : ''}
              ${(stowObjetivoReal > 0 || receiveObjetivoReal > 0) ? `
                <div class="rate-comparison">
                  <span class="rate-comparison-label">Histórico:</span>
                  <span class="rate-value">Stow ${stowObjetivoReal.toLocaleString()}</span>
                  <span class="rate-separator">vs</span>
                  <span class="rate-value">Receive ${receiveObjetivoReal.toLocaleString()}</span>
                  ${variacionHistorico ? `<span class="rate-variacion">${variacionHistorico}%</span>` : ''}
                </div>
              ` : ''}
            </div>
          `;
        }
      }

      html += `
        <div class="dashboard-section" data-depto="${depto}">
          <div class="section-header" onclick="pizarraController.toggleSection('${depto}')">
            <div class="section-title">
              <svg class="section-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <span class="section-name">${depto}</span>
            </div>
            <div class="section-stats">
              <span class="section-count">${totalDepto}</span>
              ${alertasDepto > 0 ? `<span class="section-alerts">${alertasDepto}</span>` : ''}
              ${compensacionHtml}
            </div>
          </div>
          <div class="section-content" id="section-${depto}" style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: flex-start; flex-direction: row;">
      `;

      // Ordenar procesos dentro del departamento según orden definido
      const ordenProcesos = this.puestosData?.orden_departamentos_secundarios?.[depto] || [];
      const procesosOrdenados = Object.keys(jerarquia[depto]).sort((a, b) => {
        const indexA = ordenProcesos.indexOf(a);
        const indexB = ordenProcesos.indexOf(b);
        // Si ambos están en el orden definido, usar ese orden
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        // Si solo uno está definido, ese va primero
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        // Si ninguno está definido, orden alfabético
        return a.localeCompare(b);
      });
      
      // Procesar procesos de forma secuencial para poder hacer async
      for (const proceso of procesosOrdenados) {
        const funciones = jerarquia[depto][proceso];
        
        // Contar totales del proceso y calcular objetivo por hora
        let totalProceso = 0;
        let alertasProceso = 0;
        let objetivoHoraIdeal = 0;
        
        Object.values(funciones).forEach((funcion) => {
          const puesto = this.obtenerPuestoPorId(funcion.puesto_id);
          const personas = funcion.asignaciones.length;
          totalProceso += personas;
          alertasProceso += funcion.alertas;
          
          // Calcular objetivo ideal si tiene rate
          if (puesto && puesto.rate) {
            objetivoHoraIdeal += personas * puesto.rate;
          }
        });

        // Calcular objetivo real basado en historial (solo si hay puestos con rate)
        let tipoProceso = null;
        if (proceso === "Stow") {
          tipoProceso = "stow";
        } else if (proceso === "Receive") {
          tipoProceso = "receive";
        }
        
        let objetivoReal = { objetivoReal: 0, objetivoRealPuro: 0, objetivoBase: 0, usuariosConRate: 0, usuariosSinRate: 0 };
        if (tipoProceso) {
          objetivoReal = await this.calcularObjetivoReal(funciones, tipoProceso);
        }
        
        // Generar HTML de objetivos
        let objetivoHtml = '';
        if (objetivoHoraIdeal > 0 || objetivoReal.objetivoReal > 0) {
          const estandarText = objetivoHoraIdeal > 0 ? 
            `<span class="process-target process-target-estandar" title="Proyección Estándar (basada en rate estándar del puesto)">Estándar: ${objetivoHoraIdeal.toLocaleString()}</span>` : '';
          
          let historicoText = '';
          let baseText = '';
          if (objetivoReal.objetivoRealPuro > 0) {
            historicoText = `<span class="process-target process-target-historico" title="Proyección Histórica: ${objetivoReal.usuariosConRate} usuarios con datos históricos">Histórico: ${objetivoReal.objetivoRealPuro.toLocaleString()}</span>`;
          }
          if (objetivoReal.objetivoBase > 0) {
            baseText = `<span class="process-target process-target-base" title="Proyección Base: ${objetivoReal.usuariosSinRate} usuarios usando rate base">Base: ${objetivoReal.objetivoBase.toLocaleString()}</span>`;
          }
          
          if (estandarText || historicoText || baseText) {
            objetivoHtml = `<div class="process-targets">${estandarText}${historicoText}${baseText}</div>`;
          }
        }

        html += `
          <div class="process-group">
            <div class="process-header">
              <div class="process-name-wrapper">
                <span class="process-name">${proceso}</span>
                ${objetivoHtml}
              </div>
              <div class="process-stats">
                <span class="process-count">${totalProceso}</span>
                ${alertasProceso > 0 ? `<span class="process-alerts">${alertasProceso}</span>` : ''}
              </div>
            </div>
            <div class="process-functions">
        `;

        // Ordenar funciones dentro del proceso según orden definido
        const ordenFunciones = this.puestosData?.orden_funciones?.[proceso] || [];
        const funcionesOrdenadas = Object.keys(funciones).sort((a, b) => {
          const puestoA = this.obtenerPuestoPorId(funciones[a].puesto_id);
          const puestoB = this.obtenerPuestoPorId(funciones[b].puesto_id);
          const funcionA = puestoA?.funcion || a;
          const funcionB = puestoB?.funcion || b;
          
          const indexA = ordenFunciones.indexOf(funcionA);
          const indexB = ordenFunciones.indexOf(funcionB);
          
          // Si ambos están en el orden definido, usar ese orden
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          // Si solo uno está definido, ese va primero
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          // Si ninguno está definido, orden alfabético
          return a.localeCompare(b);
        });
        
        // Renderizar tarjetas básicas (sin rates)
        for (const funcionNombre of funcionesOrdenadas) {
          const funcion = funciones[funcionNombre];
          const hasAlerts = funcion.alertas > 0;
          
          html += `
            <div class="proceso-card ${hasAlerts ? 'has-alerts' : ''}" 
                 data-puesto-id="${funcion.puesto_id}"
                 onclick="pizarraController.mostrarDetalleProceso('${funcion.puesto_id}')">
              <div class="proceso-nombre">${funcion.puesto_nombre || funcion.funcion || "Sin función"}</div>
              <div class="proceso-stats">
                <span class="proceso-count">${funcion.asignaciones.length}</span>
                ${hasAlerts ? `<span class="proceso-alert-badge">${funcion.alertas}</span>` : ''}
              </div>
            </div>
          `;
        }

        html += `
            </div>
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    dashboardContent.innerHTML = html;
    
    // Aplicar estilos inline inmediatamente y también en el siguiente frame
    const applyFlexLayout = () => {
      const sectionContents = dashboardContent.querySelectorAll('.section-content');
      sectionContents.forEach(section => {
        section.style.display = 'flex';
        section.style.flexWrap = 'wrap';
        section.style.flexDirection = 'row';
        section.style.gap = '0.5rem';
        section.style.alignItems = 'flex-start';
        section.style.width = '100%';
        section.style.padding = '0.5rem 0';
        section.style.boxSizing = 'border-box';
      });
      
      const processGroups = dashboardContent.querySelectorAll('.process-group');
      processGroups.forEach(group => {
        group.style.flex = '0 1 auto';
        group.style.display = 'flex';
        group.style.flexDirection = 'column';
        group.style.marginBottom = '0';
        group.style.width = 'auto';
      });
    };
    
    // Aplicar inmediatamente
    applyFlexLayout();
    
    // Aplicar también en el siguiente frame para asegurar
    requestAnimationFrame(() => {
      applyFlexLayout();
    });
  }

  /**
   * Obtiene el rate real de un usuario desde su archivo de historial
   * Solo busca rates del tipo de proceso especificado (stow o receive)
   * Prioridad: last_week > last_month > last_3_months
   * Para Stow: usa each_stow.combined.rate
   * Para Receive: usa each_receive.combined.rate (si existe) o similar
   */
  async obtenerRateRealUsuario(login, tipoProceso = "stow", puestoId = null) {
    // Normalizar login
    const loginNormalizado = login.trim().toUpperCase();
    
    // Obtener analytics_key del puesto si está disponible
    let analyticsKey = null;
    if (puestoId) {
      const puesto = this.obtenerPuestoPorId(puestoId);
      analyticsKey = puesto?.analytics_key || null;
    }
    
    // Verificar cache (incluir analytics_key en la clave)
    const cacheKey = `${loginNormalizado}_${tipoProceso}_${analyticsKey || 'combined'}`;
    if (this.userRatesCache[cacheKey]) {
      return this.userRatesCache[cacheKey];
    }

    if (!this.analyticsPaths || this.analyticsPaths.length === 0) {
      return null;
    }

    try {
      let userData = null;
      
      // Intentar cargar desde cada ruta de analytics
      for (const analyticsPath of this.analyticsPaths) {
        try {
          const userPath = `${analyticsPath}Users/${loginNormalizado}.json`;
          const result = await window.api.readJson(userPath);
          
          if (result.success && result.data) {
            userData = result.data;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (!userData) {
        return null;
      }

      // Buscar rate con prioridad: last_week > last_month > last_3_months
      const periods = ["last_week", "last_month", "last_3_months"];
      let rate = null;

      for (const period of periods) {
        if (userData[period]) {
          if (tipoProceso.toLowerCase() === "stow") {
            // Para Stow: usar each_stow.combined.rate
            if (userData[period].each_stow && userData[period].each_stow.combined) {
              rate = userData[period].each_stow.combined.rate;
              break;
            }
          } else if (tipoProceso.toLowerCase() === "receive") {
            // Para Receive: buscar en receive[analytics_key].rate
            if (userData[period].receive && analyticsKey) {
              // Buscar el analytics_key en receive (case-insensitive)
              const receiveData = userData[period].receive;
              const matchingKey = Object.keys(receiveData).find(
                key => key.toLowerCase() === analyticsKey.toLowerCase()
              );
              
              if (matchingKey && receiveData[matchingKey] && receiveData[matchingKey].rate) {
                rate = receiveData[matchingKey].rate;
                break;
              }
            }
          }
        }
      }

      // Guardar en cache
      this.userRatesCache[cacheKey] = rate;
      return rate;
    } catch (error) {
      console.warn(`⚠️ Error obteniendo rate real para ${loginNormalizado}:`, error);
      return null;
    }
  }

  /**
   * Calcula el objetivo real basado en historial de usuarios
   * Solo calcula para puestos que tienen rate definido
   * Suma los rates reales de cada usuario asignado
   * Si no hay rate real, usa el rate base del puesto
   */
  async calcularObjetivoReal(funciones, tipoProceso = "stow") {
    let objetivoReal = 0;
    let objetivoBase = 0; // Suma de rates base cuando no hay datos históricos
    let usuariosConRate = 0;
    let usuariosSinRate = 0;

      for (const funcionData of Object.values(funciones)) {
        const puesto = this.obtenerPuestoPorId(funcionData.puesto_id);
        const rateBase = puesto?.rate || 0;
        
        // Solo procesar si el puesto tiene rate definido
        if (rateBase === 0) continue;

        for (const asignacion of funcionData.asignaciones) {
          // Pasar el puesto_id para obtener el analytics_key correcto
          const rateReal = await this.obtenerRateRealUsuario(
            asignacion.usuario_login, 
            tipoProceso, 
            funcionData.puesto_id
          );
          if (rateReal && rateReal > 0) {
            objetivoReal += rateReal;
            usuariosConRate++;
          } else {
            // Usar rate base si no hay datos históricos
            objetivoBase += rateBase;
            usuariosSinRate++;
          }
        }
      }

    // El objetivo total incluye real + base
    const objetivoTotal = objetivoReal + objetivoBase;

    return {
      objetivoReal: objetivoTotal,
      objetivoRealPuro: objetivoReal, // Solo rates históricos
      objetivoBase: objetivoBase, // Solo rates base usados
      usuariosConRate,
      usuariosSinRate
    };
  }

  /**
   * Obtiene el rate promedio de Stow para calcular compensación
   */
  obtenerRatePromedioStow(funcionesStow) {
    let totalRate = 0;
    let totalPersonas = 0;
    
    Object.values(funcionesStow).forEach((funcionData) => {
      const puesto = this.obtenerPuestoPorId(funcionData.puesto_id);
      if (puesto && puesto.rate && funcionData.asignaciones.length > 0) {
        totalRate += puesto.rate * funcionData.asignaciones.length;
        totalPersonas += funcionData.asignaciones.length;
      }
    });
    
    return totalPersonas > 0 ? totalRate / totalPersonas : 100; // Default 100 si no hay
  }

  /**
   * Obtiene el rate promedio de Receive para calcular compensación
   */
  obtenerRatePromedioReceive(funcionesReceive) {
    let totalRate = 0;
    let totalPersonas = 0;
    
    Object.values(funcionesReceive).forEach((funcionData) => {
      const puesto = this.obtenerPuestoPorId(funcionData.puesto_id);
      if (puesto && puesto.rate && funcionData.asignaciones.length > 0) {
        totalRate += puesto.rate * funcionData.asignaciones.length;
        totalPersonas += funcionData.asignaciones.length;
      }
    });
    
    return totalPersonas > 0 ? totalRate / totalPersonas : 60; // Default 60 si no hay
  }

  toggleSection(depto) {
    const sectionElement = document.querySelector(`[data-depto="${depto}"]`);
    const sectionContent = document.getElementById(`section-${depto}`);
    const sectionHeader = sectionElement?.querySelector('.section-header');
    
    if (sectionElement && sectionContent) {
      const isCollapsed = sectionElement.classList.contains('collapsed');
      
      if (isCollapsed) {
        // Expandir
        sectionElement.classList.remove('collapsed');
        sectionContent.style.display = 'block';
        const icon = sectionHeader?.querySelector('.section-icon');
        if (icon) {
          icon.style.transform = 'rotate(90deg)';
        }
      } else {
        // Colapsar
        sectionElement.classList.add('collapsed');
        sectionContent.style.display = 'none';
        const icon = sectionHeader?.querySelector('.section-icon');
        if (icon) {
          icon.style.transform = 'rotate(0deg)';
        }
      }
    }
  }

  toggleUsuarioMenu(menuId) {
    // Cerrar todos los otros menús
    document.querySelectorAll(".usuario-menu").forEach((menu) => {
      if (menu.id !== menuId) {
        menu.style.display = "none";
      }
    });

    // Toggle el menú actual
    const menu = document.getElementById(menuId);
    if (menu) {
      menu.style.display = menu.style.display === "none" ? "block" : "none";
    }
  }

  async verificarSkill(login, puestoId) {
    // Normalizar login a mayúsculas (consistencia con el resto del código)
    const loginNormalizado = login.trim().toUpperCase();

    // Cerrar menú
    const menuId = `menu-${loginNormalizado}-${puestoId}`.replace(
      /[^a-zA-Z0-9-]/g,
      "-"
    );
    this.toggleUsuarioMenu(menuId);

    console.log(
      `🔍 Verificando skill para: ${loginNormalizado} en puesto: ${puestoId}`
    );
    console.log(
      `📋 Skillmatrix antes:`,
      JSON.stringify(this.skillmatrixData.usuarios[loginNormalizado] || {})
    );

    // Asegurar que existe la estructura de usuarios
    if (!this.skillmatrixData.usuarios) {
      this.skillmatrixData.usuarios = {};
    }

    // Actualizar skillmatrix (estructura optimizada: solo guarda true)
    if (!this.skillmatrixData.usuarios[loginNormalizado]) {
      this.skillmatrixData.usuarios[loginNormalizado] = { puestos: {} };
    }

    // Solo guardamos si es true (optimización de memoria)
    this.skillmatrixData.usuarios[loginNormalizado].puestos[puestoId] = true;
    this.skillmatrixData.ultima_actualizacion = new Date().toISOString();

    console.log(
      `📋 Skillmatrix después:`,
      JSON.stringify(this.skillmatrixData.usuarios[loginNormalizado])
    );

    // Actualizar asignación
    const asignacion = this.pizarraActual.asignaciones.find(
      (a) => a.usuario_login === loginNormalizado && a.puesto_id === puestoId
    );
    if (asignacion) {
      asignacion.tiene_formacion = true;
      console.log(`✅ Asignación actualizada: tiene_formacion = true`);
    } else {
      console.warn(
        `⚠️ No se encontró asignación para ${loginNormalizado} en ${puestoId}`
      );
    }

    try {
      await this.guardarDatos();
      console.log(`✅ Datos guardados correctamente`);
    } catch (error) {
      console.error(`❌ Error guardando datos:`, error);
      this.mostrarToast("Error al guardar la formación", "error");
      return;
    }

    // Emitir evento de skill actualizado
    this.eventBus.emit(PIZARRA_EVENTS.SKILL_ACTUALIZADO, {
      usuario_login: loginNormalizado,
      puesto_id: puestoId,
      tiene_formacion: true,
    });

    // Actualizar dashboard
    await this.actualizarDashboard();
    this.mostrarToast(
      `Formación verificada para ${loginNormalizado}`,
      "success"
    );
    this.reproducirSonido("success");
  }

  async quitarSkill(login, puestoId) {
    // Normalizar login a mayúsculas (consistencia con el resto del código)
    const loginNormalizado = login.trim().toUpperCase();

    // Cerrar menú
    const menuId = `menu-${loginNormalizado}-${puestoId}`.replace(
      /[^a-zA-Z0-9-]/g,
      "-"
    );
    this.toggleUsuarioMenu(menuId);

    console.log(
      `🔍 Quitando skill para: ${loginNormalizado} en puesto: ${puestoId}`
    );

    // Actualizar skillmatrix (estructura optimizada: remover de lista = false)
    if (
      this.skillmatrixData.usuarios[loginNormalizado] &&
      this.skillmatrixData.usuarios[loginNormalizado].puestos
    ) {
      // Remover el puesto de la lista (false implícito)
      delete this.skillmatrixData.usuarios[loginNormalizado].puestos[puestoId];
      this.skillmatrixData.ultima_actualizacion = new Date().toISOString();
      console.log(`✅ Skill removido de skillmatrix`);
    } else {
      console.warn(`⚠️ No se encontró skill para remover`);
    }

    // Actualizar asignación
    const asignacion = this.pizarraActual.asignaciones.find(
      (a) => a.usuario_login === loginNormalizado && a.puesto_id === puestoId
    );
    if (asignacion) {
      asignacion.tiene_formacion = false;
      console.log(`✅ Asignación actualizada: tiene_formacion = false`);
    }

    try {
      await this.guardarDatos();
      console.log(`✅ Datos guardados correctamente`);
    } catch (error) {
      console.error(`❌ Error guardando datos:`, error);
      this.mostrarToast("Error al guardar los cambios", "error");
      return;
    }

    // Emitir evento de skill actualizado
    this.eventBus.emit(PIZARRA_EVENTS.SKILL_ACTUALIZADO, {
      usuario_login: login,
      puesto_id: puestoId,
      tiene_formacion: false,
    });

    // Actualizar dashboard
    await this.actualizarDashboard();
    this.mostrarToast(`Verificación removida para ${login}`, "info");
  }

  async removerAsignacion(login, puestoId) {
    // Cerrar menú
    const menuId = `menu-${login}-${puestoId}`.replace(/[^a-zA-Z0-9-]/g, "-");
    this.toggleUsuarioMenu(menuId);

    this.pizarraActual.asignaciones = this.pizarraActual.asignaciones.filter(
      (a) => !(a.usuario_login === login && a.puesto_id === puestoId)
    );

    const remocionHistorial = {
      fecha: new Date().toISOString(),
      usuario: login,
      accion: "remocion",
      puesto: puestoId,
    };
    this.pizarraActual.historial_cambios.push(remocionHistorial);

    await this.guardarDatos();

    // Emitir evento de asignación removida
    this.eventBus.emit(PIZARRA_EVENTS.ASIGNACION_REMOVIDA, {
      usuario_login: login,
      puesto_id: puestoId,
      timestamp: remocionHistorial.fecha,
    });

    // Emitir evento de pizarra actualizada
    this.eventBus.emit(PIZARRA_EVENTS.PIZARRA_ACTUALIZADA, {
      asignaciones: this.pizarraActual.asignaciones,
      total: this.pizarraActual.asignaciones.length,
      timestamp: new Date().toISOString(),
    });

    await this.actualizarDashboard();
    this.mostrarToast(`Usuario ${login} removido del puesto`, "info");
  }

  /**
   * Obtiene lista de usuarios disponibles para un puesto
   * SOLO muestra usuarios con formación verificada para ese puesto específico
   */
  obtenerUsuariosDisponibles(puestoId) {
    const usuarios = [];
    const usuariosVistos = new Set(); // Para evitar duplicados

    // 1. Primero, agregar usuarios del roster que tienen formación verificada para este puesto
    if (this.rosterData && Array.isArray(this.rosterData)) {
      this.rosterData.forEach((empleado) => {
        const login = empleado.login?.toUpperCase();
        if (!login || usuariosVistos.has(login)) return;

        // SOLO incluir si tiene formación verificada para este puesto
        if (this.tieneSkill(login, puestoId)) {
          // Buscar si está asignado actualmente
          const asignacionActual = this.pizarraActual.asignaciones.find(
            (a) => a.usuario_login === login
          );

          let puestoActual = null;
          let puestoActualNombre = null;

          if (asignacionActual) {
            puestoActual = asignacionActual.puesto_id;
            const puestoObj = this.obtenerPuestoPorId(
              asignacionActual.puesto_id
            );
            puestoActualNombre = puestoObj
              ? puestoObj.funcion
              : asignacionActual.puesto_id;
          }

          usuarios.push({
            login: login,
            puesto_actual: puestoActual,
            puesto_actual_nombre: puestoActualNombre || "Sin asignación",
            tiene_skill: true, // Ya filtrado, siempre true
            ya_asignado: asignacionActual?.puesto_id === puestoId,
          });

          usuariosVistos.add(login);
        }
      });
    }

    // 2. Si no hay roster, usar asignaciones actuales como fallback (solo con formación)
    if (
      usuarios.length === 0 &&
      this.pizarraActual &&
      this.pizarraActual.asignaciones
    ) {
      this.pizarraActual.asignaciones.forEach((asignacion) => {
        if (!asignacion || !asignacion.usuario_login) return;
        const login = asignacion.usuario_login.toUpperCase();

        if (usuariosVistos.has(login)) return;

        // SOLO incluir si tiene formación verificada para este puesto
        if (this.tieneSkill(login, puestoId)) {
          const puestoActual = this.obtenerPuestoPorId(asignacion.puesto_id);
          const nombrePuestoActual = puestoActual
            ? puestoActual.funcion
            : asignacion.puesto_id;

          usuarios.push({
            login: login,
            puesto_actual: asignacion.puesto_id,
            puesto_actual_nombre: nombrePuestoActual,
            tiene_skill: true,
            ya_asignado: asignacion.puesto_id === puestoId,
          });

          usuariosVistos.add(login);
        }
      });
    }

    // Ordenar: primero los que ya están asignados a este puesto (para mostrarlos al final),
    // luego por puesto actual (para ver de dónde se pueden mover),
    // finalmente alfabéticamente
    usuarios.sort((a, b) => {
      // Los ya asignados al final
      if (a.ya_asignado && !b.ya_asignado) return 1;
      if (!a.ya_asignado && b.ya_asignado) return -1;

      // Ordenar por puesto actual (para agrupar por origen)
      if (a.puesto_actual_nombre && b.puesto_actual_nombre) {
        const puestoCompare = a.puesto_actual_nombre.localeCompare(
          b.puesto_actual_nombre
        );
        if (puestoCompare !== 0) return puestoCompare;
      }

      // Finalmente alfabéticamente por login
      return a.login.localeCompare(b.login);
    });

    console.log(
      `📋 Usuarios disponibles para ${puestoId}: ${usuarios.length} (solo con formación verificada)`
    );
    return usuarios;
  }

  mostrarModalAgregarUsuario(puestoId) {
    const puesto = this.obtenerPuestoPorId(puestoId);
    if (!puesto) return;

    document.getElementById("puesto-nombre-modal").textContent = puesto.funcion;
    this.puestoActual = puesto;
    this.puestoSeleccionadoParaAgregar = puestoId;

    const usuarios = this.obtenerUsuariosDisponibles(puestoId);
    this.renderizarUsuariosDisponibles(usuarios);

    this.mostrarModal("modal-agregar-usuario");

    // Focus en búsqueda
    setTimeout(() => {
      document.getElementById("search-usuario-input").focus();
    }, 100);
  }

  renderizarUsuariosDisponibles(usuarios) {
    const container = document.getElementById("usuarios-disponibles-list");

    if (usuarios.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><p>No hay usuarios con formación verificada para este puesto</p><p class="empty-state-hint">Verifica la formación de usuarios en el menú contextual para agregarlos aquí</p></div>';
      return;
    }

    let html = "";
    usuarios.forEach((usuario) => {
      // Todos los usuarios aquí ya tienen formación verificada (ya están filtrados)
      const skillBadge =
        '<span class="skill-badge skill-ok">✓ Formación verificada</span>';

      const puestoActualInfo =
        usuario.puesto_actual_nombre &&
        usuario.puesto_actual_nombre !== "Sin asignación"
          ? `<span class="puesto-actual">Puesto actual: ${usuario.puesto_actual_nombre}</span>`
          : '<span class="puesto-actual">Sin asignación</span>';

      const disabledClass = usuario.ya_asignado ? "disabled" : "";
      const disabledAttr = usuario.ya_asignado ? "disabled" : "";

      html += `
        <div class="usuario-disponible-item ${disabledClass}" data-login="${
        usuario.login
      }">
          <div class="usuario-info">
            <strong>${usuario.login}</strong>
            <div class="usuario-meta">
              ${puestoActualInfo}
              ${skillBadge}
            </div>
          </div>
          <button class="btn btn-primary btn-sm" 
                  onclick="pizarraController.asignarUsuarioDesdeModal('${
                    usuario.login
                  }')" 
                  ${disabledAttr}
                  ${
                    usuario.ya_asignado
                      ? 'title="Ya asignado a este puesto"'
                      : 'title="Agregar al puesto"'
                  }>
            ${usuario.ya_asignado ? "Ya asignado" : "Agregar"}
          </button>
        </div>
      `;
    });

    container.innerHTML = html;
    this.usuariosDisponiblesFiltrados = usuarios;
  }

  filtrarUsuariosDisponibles(busqueda) {
    if (!this.usuariosDisponiblesFiltrados) return;

    const termino = busqueda.toLowerCase().trim();
    const usuariosFiltrados = termino
      ? this.usuariosDisponiblesFiltrados.filter(
          (u) =>
            u.login.toLowerCase().includes(termino) ||
            (u.puesto_actual_nombre &&
              u.puesto_actual_nombre.toLowerCase().includes(termino))
        )
      : this.usuariosDisponiblesFiltrados;

    this.renderizarUsuariosDisponibles(usuariosFiltrados);
  }

  async asignarUsuarioDesdeModal(login) {
    if (!this.puestoSeleccionadoParaAgregar) return;

    // Verificar si ya está asignado
    const yaAsignado = this.pizarraActual.asignaciones.some(
      (a) =>
        a.usuario_login === login &&
        a.puesto_id === this.puestoSeleccionadoParaAgregar
    );

    if (yaAsignado) {
      this.mostrarToast("Usuario ya está asignado a este puesto", "warning");
      return;
    }

    // Verificar si está en otro puesto y removerlo
    const asignacionAnterior = this.pizarraActual.asignaciones.find(
      (a) => a.usuario_login === login
    );

    if (asignacionAnterior) {
      this.pizarraActual.asignaciones = this.pizarraActual.asignaciones.filter(
        (a) =>
          !(
            a.usuario_login === login &&
            a.puesto_id === asignacionAnterior.puesto_id
          )
      );

      this.pizarraActual.historial_cambios.push({
        fecha: new Date().toISOString(),
        usuario: login,
        accion: "cambio_puesto",
        desde: asignacionAnterior.puesto_id,
        hacia: this.puestoSeleccionadoParaAgregar,
      });

      this.eventBus.emit(PIZARRA_EVENTS.ASIGNACION_REMOVIDA, {
        usuario_login: login,
        puesto_id: asignacionAnterior.puesto_id,
        razon: "cambio_puesto",
      });
    }

    // Verificar skill usando helper optimizado
    const tieneSkill = this.tieneSkill(
      login,
      this.puestoSeleccionadoParaAgregar
    );

    // Asignar
    await this.asignarUsuario(login, tieneSkill);

    // Cerrar modal y actualizar lista
    this.cerrarModal("modal-agregar-usuario");
    this.mostrarToast(
      `Usuario ${login} agregado a ${this.puestoActual.funcion}`,
      "success"
    );
  }

  mostrarModalSkillMatrix(login) {
    this.usuarioActualSkillMatrix = login;
    document.getElementById("usuario-nombre-skill").textContent = login;

    // Cerrar menú contextual
    document.querySelectorAll(".usuario-menu").forEach((menu) => {
      menu.style.display = "none";
    });

    this.renderizarSkillMatrix(login);
    this.mostrarModal("modal-skill-matrix");
  }

  renderizarSkillMatrix(login) {
    const container = document.getElementById("skill-matrix-content");
    if (!container) {
      console.error("No se encontró el contenedor de skill matrix");
      return;
    }

    const usuarioSkills = this.skillmatrixData.usuarios[login] || {
      puestos: {},
    };

    // Obtener todos los puestos (predefinidos + personalizados)
    const todosPuestos = [
      ...(this.puestosData.puestos_predefinidos || []),
      ...(this.puestosData.puestos_personalizados || []),
    ];

    if (todosPuestos.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><p>No hay puestos configurados aún</p></div>';
      return;
    }

    let html = '<div class="skill-matrix-grid">';

    todosPuestos.forEach((puesto) => {
      if (!puesto || !puesto.id) return; // Validar que el puesto tenga id

      // Estructura optimizada: si está en la lista es true, si no está es false
      const tieneFormacion = usuarioSkills.puestos?.[puesto.id] === true;
      const checkboxId = `skill-${login}-${puesto.id}`.replace(
        /[^a-zA-Z0-9-]/g,
        "-"
      );

      html += `
        <div class="skill-matrix-item">
          <label class="skill-checkbox-label">
            <input type="checkbox" 
                   id="${checkboxId}" 
                   data-puesto-id="${puesto.id}"
                   ${tieneFormacion ? "checked" : ""}
                   class="skill-checkbox">
            <span class="skill-checkbox-custom"></span>
            <div class="skill-puesto-info">
              <strong>${puesto.funcion || puesto.id}</strong>
              <span class="skill-puesto-depto">${
                puesto.departamento_principal || "N/A"
              } → ${puesto.departamento_secundario || "N/A"}</span>
            </div>
          </label>
        </div>
      `;
    });

    html += "</div>";
    container.innerHTML = html;
  }

  async guardarSkillMatrix() {
    if (!this.usuarioActualSkillMatrix) {
      console.error("No hay usuario seleccionado para guardar skill matrix");
      return;
    }

    const checkboxes = document.querySelectorAll(
      "#skill-matrix-content .skill-checkbox"
    );

    if (checkboxes.length === 0) {
      this.mostrarToast("No hay puestos para actualizar", "warning");
      return;
    }

    // Inicializar skillmatrix si no existe
    if (!this.skillmatrixData) {
      this.skillmatrixData = { usuarios: {}, ultima_actualizacion: null };
    }

    // Inicializar usuario en skillmatrix si no existe
    if (!this.skillmatrixData.usuarios[this.usuarioActualSkillMatrix]) {
      this.skillmatrixData.usuarios[this.usuarioActualSkillMatrix] = {
        puestos: {},
      };
    }

    // Actualizar skills (estructura optimizada: solo guarda true)
    checkboxes.forEach((checkbox) => {
      const puestoId = checkbox.getAttribute("data-puesto-id");
      if (puestoId) {
        if (checkbox.checked) {
          // Solo guardamos si es true
          this.skillmatrixData.usuarios[this.usuarioActualSkillMatrix].puestos[
            puestoId
          ] = true;
        } else {
          // Remover de la lista (false implícito)
          delete this.skillmatrixData.usuarios[this.usuarioActualSkillMatrix]
            .puestos[puestoId];
        }
      }
    });

    this.skillmatrixData.ultima_actualizacion = new Date().toISOString();

    // Actualizar asignaciones actuales si el usuario está asignado
    if (this.pizarraActual && this.pizarraActual.asignaciones) {
      this.pizarraActual.asignaciones.forEach((asignacion) => {
        if (asignacion.usuario_login === this.usuarioActualSkillMatrix) {
          const puestoId = asignacion.puesto_id;
          // Usar helper optimizado
          asignacion.tiene_formacion = this.tieneSkill(
            this.usuarioActualSkillMatrix,
            puestoId
          );
        }
      });
    }

    await this.guardarDatos();

    // Emitir evento
    this.eventBus.emit(PIZARRA_EVENTS.SKILL_ACTUALIZADO, {
      usuario_login: this.usuarioActualSkillMatrix,
      skillmatrix: this.skillmatrixData.usuarios[this.usuarioActualSkillMatrix],
    });

    // Actualizar dashboard
    await this.actualizarDashboard();
    this.cerrarModal("modal-skill-matrix");
    this.mostrarToast(
      `Skill matrix actualizada para ${this.usuarioActualSkillMatrix}`,
      "success"
    );
    this.usuarioActualSkillMatrix = null;
  }

  mostrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = "flex";
      // Focus en primer input si existe
      const firstInput = modal.querySelector("input, select, textarea");
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }

      // Emitir evento de modal abierto
      this.eventBus.emit(PIZARRA_EVENTS.MODAL_ABIERTO, {
        modalId: modalId,
      });
    }
  }

  cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = "none";

      // Emitir evento de modal cerrado
      this.eventBus.emit(PIZARRA_EVENTS.MODAL_CERRADO, {
        modalId: modalId,
      });
    }
  }

  mostrarToast(mensaje, tipo = "info") {
    const toast = document.getElementById("toast-notification");
    toast.textContent = mensaje;
    toast.className = `toast toast-${tipo}`;
    toast.style.display = "block";

    // Emitir evento de toast mostrado
    this.eventBus.emit(PIZARRA_EVENTS.TOAST_MOSTRADO, {
      mensaje: mensaje,
      tipo: tipo,
    });

    setTimeout(() => {
      toast.style.display = "none";
    }, 3000);
  }

  reproducirSonido(tipo) {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      if (tipo === "success") {
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          this.audioContext.currentTime + 0.2
        );
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.2);
      } else if (tipo === "error") {
        oscillator.frequency.value = 300;
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          this.audioContext.currentTime + 0.3
        );
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.3);
      }
    } catch (error) {
      console.warn("No se pudo reproducir sonido:", error);
    }
  }

  async descargarRoster() {
    // Mantener funcionalidad existente de descarga de roster
    const downloadBtn = document.getElementById("download-roster-btn");
    const downloadBtnText = downloadBtn.querySelector("span");
    const statusMessage = document.getElementById("status-message");
    const progressContainer = document.getElementById("progress-container");
    const progressBar = document.getElementById("progress-bar");
    const progressText = document.getElementById("progress-text");
    const progressPercentage = document.getElementById("progress-percentage");

    try {
      if (
        !window.api.getUserDataPath ||
        !window.api.executePythonScript ||
        !window.api.readJson
      ) {
        statusMessage.textContent =
          "❌ Error: Por favor, reinicia la aplicación para continuar.";
        statusMessage.className = "status-message-banner error";
        statusMessage.style.display = "block";
        return;
      }

      // Emitir evento de inicio de descarga
      this.eventBus.emit(PIZARRA_EVENTS.ROSTER_DESCARGANDO, {
        timestamp: new Date().toISOString(),
      });

      downloadBtn.disabled = true;
      downloadBtn.classList.add("downloading");
      downloadBtnText.textContent = "Descargando...";

      statusMessage.style.display = "none";
      progressContainer.style.display = "block";
      progressBar.style.width = "0%";
      progressText.textContent = "Iniciando descarga...";
      progressPercentage.textContent = "0%";

      const userDataPath = await window.api.getUserDataPath();
      const progressFilePath = `${userDataPath}/data/pizarra/progress.json`;

      let progressRunning = false;
      let lastPercentage = 0;
      let updateCount = 0;

      async function updateProgress() {
        updateCount++;
        try {
          const result = await window.api.readJson(progressFilePath);
          if (!result || !result.success) return;

          const progressData = result.data;
          if (progressData && typeof progressData.percentage === "number") {
            const pct = Math.min(100, Math.max(0, progressData.percentage));
            if (pct !== lastPercentage || updateCount === 1) {
              progressBar.style.width = `${pct}%`;
              progressPercentage.textContent = `${Math.round(pct)}%`;
              if (progressData.message) {
                progressText.textContent = progressData.message;
              }
              lastPercentage = pct;
            }
          }
        } catch (error) {
          // Silenciar errores de progreso
        }
      }

      progressRunning = true;
      async function progressLoop() {
        while (progressRunning) {
          await updateProgress();
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      const progressLoopPromise = progressLoop();
      const scriptPromise = window.api.executePythonScript({
        scriptPath:
          "src/renderer/apps/utilidades/Pizarra/py/Descarga_Roster.py",
        args: [userDataPath],
      });

      const result = await scriptPromise;
      progressRunning = false;
      await new Promise((resolve) => setTimeout(resolve, 300));
      await updateProgress();

      if (result.success) {
        progressBar.style.width = "100%";
        progressPercentage.textContent = "100%";
        progressText.textContent = "¡Roster descargado exitosamente!";

        // Emitir evento de roster descargado
        this.eventBus.emit(PIZARRA_EVENTS.ROSTER_DESCARGADO, {
          timestamp: new Date().toISOString(),
          success: true,
        });

        setTimeout(() => {
          progressContainer.style.display = "none";
          statusMessage.textContent = "✅ ¡Roster descargado exitosamente!";
          statusMessage.className = "status-message-banner success";
          statusMessage.style.display = "block";
        }, 2000);

        setTimeout(() => {
          updateFileStatus();
          setTimeout(() => {
            statusMessage.style.display = "none";
          }, 5000);
        }, 1000);
      } else {
        progressContainer.style.display = "none";
        statusMessage.textContent = `❌ Error: ${
          result.error || "Error desconocido"
        }`;
        statusMessage.className = "status-message-banner error";
        statusMessage.style.display = "block";
      }
    } catch (error) {
      progressContainer.style.display = "none";
      statusMessage.textContent = `❌ Error: ${error.message}`;
      statusMessage.className = "status-message-banner error";
      statusMessage.style.display = "block";
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.classList.remove("downloading");
      downloadBtnText.textContent = "Descargar Roster";
    }
  }

  async updateFileStatus() {
    // Mantener funcionalidad existente de estado de archivo
    const fileStatusHeader = document.getElementById("file-status-header");
    const statusIcon = document.getElementById("status-icon");
    const statusText = document.getElementById("status-text");

    if (!fileStatusHeader || !statusIcon || !statusText) return;

    statusIcon.textContent = "⏳";
    statusText.textContent = "Verificando...";
    fileStatusHeader.classList.remove(
      "status-fresh",
      "status-old",
      "status-warning"
    );

    try {
      const userDataPath = await window.api.getUserDataPath();
      const updateFilePath = `${userDataPath}/data/pizarra/last_update.json`;

      try {
        const result = await window.api.readJson(updateFilePath);
        if (
          result &&
          result.success &&
          result.data &&
          result.data.last_update
        ) {
          const lastModified = new Date(result.data.last_update);
          const now = new Date();
          const ageInHours = (now - lastModified) / (1000 * 60 * 60);

          if (ageInHours > 24) {
            statusIcon.textContent = "🕐";
            statusText.textContent = `Actualizado hace ${this.formatTimeAgo(
              lastModified
            )}`;
            fileStatusHeader.classList.add("status-old");
          } else {
            statusIcon.textContent = "✅";
            statusText.textContent = `Actualizado hace ${this.formatTimeAgo(
              lastModified
            )}`;
            fileStatusHeader.classList.add("status-fresh");
          }
          return;
        }
      } catch (jsonError) {
        // Continuar con fallback
      }

      statusIcon.textContent = "⚠️";
      statusText.textContent = "Sin datos";
      fileStatusHeader.classList.add("status-warning");
    } catch (error) {
      console.error("Error actualizando estado del archivo:", error);
      statusIcon.textContent = "⚠️";
      statusText.textContent = "Error al verificar";
      fileStatusHeader.classList.add("status-warning");
    }
  }

  formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins} minuto${diffMins !== 1 ? "s" : ""}`;
    } else if (diffHours < 24) {
      return `${diffHours} hora${diffHours !== 1 ? "s" : ""}`;
    } else {
      return `${diffDays} día${diffDays !== 1 ? "s" : ""}`;
    }
  }

  /**
   * Muestra/oculta el panel de escaneo
   */
  toggleScanPanel(show = null) {
    const scanPanel = document.getElementById("scan-panel");
    if (!scanPanel) return;

    const shouldShow = show !== null ? show : scanPanel.style.display === "none";
    scanPanel.style.display = shouldShow ? "block" : "none";

    if (shouldShow) {
      const scanInput = document.getElementById("scan-input");
      if (scanInput) {
        setTimeout(() => scanInput.focus(), 100);
      }
    }
  }

  /**
   * Muestra el modal de detalle de un proceso
   */
  async mostrarDetalleProceso(puestoId) {
    const puesto = this.obtenerPuestoPorId(puestoId);
    if (!puesto) return;

    this.procesoActualDetalle = puestoId;

    // Obtener asignaciones de este puesto
    const asignaciones = this.pizarraActual.asignaciones.filter(
      (a) => a.puesto_id === puestoId
    );

    // Actualizar título del modal
    const titulo = document.getElementById("modal-proceso-titulo");
    if (titulo) {
      titulo.textContent = `${puesto.funcion} (${asignaciones.length})`;
    }

    // Generar alertas
    const alertasContainer = document.getElementById("proceso-alertas");
    const alertas = asignaciones.filter((a) => !a.tiene_formacion);
    
    if (alertas.length > 0 && alertasContainer) {
      alertasContainer.innerHTML = alertas.map((a) => `
        <div class="alerta-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span><strong>${a.usuario_login}</strong> sin formación verificada</span>
        </div>
      `).join("");
    } else if (alertasContainer) {
      alertasContainer.innerHTML = "";
    }

    // Generar lista de personal con rates (solo si el puesto tiene rate)
    const personalList = document.getElementById("proceso-personal-list");
    if (personalList) {
      if (asignaciones.length === 0) {
        personalList.innerHTML = '<div class="empty-state">No hay personal asignado</div>';
      } else {
        const rateEsperado = puesto?.rate || 0;
        const tieneRate = rateEsperado > 0;
        const tipoProceso = (puesto?.departamento_secundario === "Stow") ? "stow" : 
                           (puesto?.departamento_secundario === "Receive") ? "receive" : null;
        
        // Obtener rates reales de usuarios (solo si el puesto tiene rate)
        const usuariosConRates = [];
        if (tieneRate && tipoProceso) {
          for (const asignacion of asignaciones) {
            // Pasar puestoId para obtener el analytics_key correcto
            const rateReal = await this.obtenerRateRealUsuario(
              asignacion.usuario_login, 
              tipoProceso, 
              puestoId
            );
            usuariosConRates.push({
              login: asignacion.usuario_login,
              rateReal: rateReal,
              rateEsperado: rateEsperado
            });
          }
        }
        
        personalList.innerHTML = asignaciones.map((a) => {
          const usuario = this.rosterData?.find((u) => u.login === a.usuario_login);
          const nombre = usuario?.employee_name || a.usuario_login;
          const skillClass = a.tiene_formacion ? "skill-ok" : "skill-warning";
          const skillIcon = a.tiene_formacion ? "✓" : "⚠";

          const photoUrl = `https://internal-cdn.amazon.com/badgephotos.amazon.com/?uid=${a.usuario_login}`;
          
          // Obtener rate info para este usuario
          const userRateInfo = usuariosConRates.find(u => u.login === a.usuario_login);
          let rateHtml = '';
          if (tieneRate && userRateInfo) {
            const tieneDatos = userRateInfo.rateReal && userRateInfo.rateReal > 0;
            const rateDisplay = tieneDatos ? userRateInfo.rateReal.toFixed(0) : rateEsperado.toFixed(0);
            const rateClass = tieneDatos ? 'rate-historico' : 'rate-base';
            const porcentaje = tieneDatos && rateEsperado > 0 
              ? ((userRateInfo.rateReal / rateEsperado) * 100).toFixed(0)
              : null;
            
            rateHtml = `
              <div class="personal-rate-info">
                <span class="rate-label">Estándar:</span>
                <span class="rate-value rate-estandar">${rateEsperado.toFixed(0)} UPH</span>
                <span class="rate-label">Histórico:</span>
                <span class="rate-value ${rateClass}">${rateDisplay} UPH${tieneDatos ? '' : ' (base)'}</span>
                ${porcentaje ? `<span class="rate-porcentaje" title="vs estándar">${porcentaje}%</span>` : ''}
              </div>
            `;
          }
          
          return `
            <div class="personal-item" data-login="${a.usuario_login}">
              <div class="personal-info">
                <div class="user-photo-container">
                  <img src="${photoUrl}" alt="${a.usuario_login}" class="user-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                  <div class="user-photo-placeholder" style="display: none;">
                    ${a.usuario_login.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div class="personal-details">
                  <span class="skill-icon ${skillClass}" title="${a.tiene_formacion ? 'Formación verificada' : 'Sin formación'}">${skillIcon}</span>
                  <div>
                    <span class="personal-login">${a.usuario_login}</span>
                    <span class="personal-nombre">${nombre}</span>
                  </div>
                </div>
              </div>
              ${rateHtml}
              <div class="personal-actions">
                <button class="btn-icon-small" onclick="pizarraController.mostrarSkillMatrix('${a.usuario_login}')" title="Ver formaciones">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                  </svg>
                </button>
                <button class="btn-icon-small btn-danger" onclick="pizarraController.removerAsignacion('${a.usuario_login}', '${puestoId}')" title="Remover">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
          `;
        }).join("");
      }
    }

    this.mostrarModal("modal-detalle-proceso");
  }

  /**
   * Muestra efecto visual de cambio de usuario
   */
  mostrarEfectoCambio(login, destino, origen = null) {
    const indicator = document.getElementById("cambio-indicator");
    if (!indicator) return;

    const loginSpan = document.getElementById("cambio-login");
    const destinoSpan = document.getElementById("cambio-destino");

    if (loginSpan) loginSpan.textContent = login;
    if (destinoSpan) destinoSpan.textContent = destino;

    indicator.style.display = "block";

    // Ocultar después de la animación
    setTimeout(() => {
      indicator.style.display = "none";
    }, 1500);

    // Animar tarjetas de proceso
    if (origen) {
      const origenCards = document.querySelectorAll(`[data-puesto-id="${origen}"]`);
      origenCards.forEach((card) => {
        card.classList.add("usuario-removed");
        setTimeout(() => card.classList.remove("usuario-removed"), 300);
      });
    }

    const destinoCards = document.querySelectorAll(`[data-puesto-id="${destino}"]`);
    destinoCards.forEach((card) => {
      card.classList.add("usuario-added");
      setTimeout(() => card.classList.remove("usuario-added"), 500);
    });
  }

  /**
   * Borra todas las asignaciones de la pizarra
   */
  async borrarPizarra() {
    if (!this.pizarraActual || !this.pizarraActual.asignaciones || this.pizarraActual.asignaciones.length === 0) {
      this.mostrarToast("La pizarra ya está vacía", "info");
      return;
    }

    // Confirmar acción
    const confirmar = confirm(
      `¿Estás seguro de que quieres borrar todas las asignaciones?\n\nSe eliminarán ${this.pizarraActual.asignaciones.length} asignación(es).`
    );

    if (!confirmar) {
      return;
    }

    try {
      // Resetear pizarra
      this.pizarraActual = {
        asignaciones: [],
        historial_cambios: [],
        fecha_creacion: new Date().toISOString(),
        ultima_actualizacion: new Date().toISOString(),
      };

      // Guardar pizarra vacía
      await this.guardarDatos();

      // Resetear puesto actual
      this.puestoActual = null;

      // Actualizar dashboard
      await this.actualizarDashboard();

      // Emitir evento
      this.eventBus.emit(PIZARRA_EVENTS.PIZARRA_ACTUALIZADA, {
        asignaciones: [],
        total: 0,
        timestamp: new Date().toISOString(),
      });

      this.mostrarToast("Pizarra borrada correctamente", "success");
      this.reproducirSonido("success");
    } catch (error) {
      console.error("❌ Error borrando pizarra:", error);
      this.mostrarToast("Error al borrar la pizarra: " + error.message, "error");
    }
  }

  /**
   * Exporta la pizarra a XLSX
   */
  async exportarPizarra() {
    try {
      if (!this.pizarraActual?.asignaciones?.length) {
        this.mostrarToast("No hay datos para exportar", "warning");
        return;
      }

      // Preparar datos para exportación
      const datos = this.pizarraActual.asignaciones.map((a) => {
        const usuario = this.rosterData?.find((u) => u.login === a.usuario_login);
        return {
          Login: a.usuario_login,
          Nombre: usuario?.employee_name || "",
          Turno: usuario?.shift || "",
          Departamento: a.departamento_principal,
          SubDepartamento: a.departamento_secundario,
          Puesto: a.puesto_nombre,
          Formacion: a.tiene_formacion ? "Sí" : "No",
          Hora: new Date(a.hora_asignacion).toLocaleTimeString()
        };
      });

      // Intentar usar la API de exportación si existe
      if (window.api?.exportToExcel) {
        const result = await window.api.exportToExcel({
          data: datos,
          filename: `pizarra_${new Date().toISOString().split("T")[0]}.xlsx`,
          sheetName: "Pizarra"
        });

        if (result.success) {
          this.mostrarToast("Pizarra exportada correctamente", "success");
        } else {
          throw new Error(result.error || "Error al exportar");
        }
      } else {
        // Fallback: descargar como JSON
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pizarra_${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.mostrarToast("Pizarra exportada como JSON", "success");
      }
    } catch (error) {
      console.error("Error exportando pizarra:", error);
      this.mostrarToast("Error al exportar: " + error.message, "error");
    }
  }
}

// Inicializar cuando el DOM esté listo
let pizarraController;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    pizarraController = new PizarraController();
    // Exponer globalmente para que los onclick en HTML dinámico funcionen
    window.pizarraController = pizarraController;
  });
} else {
  pizarraController = new PizarraController();
  // Exponer globalmente para que los onclick en HTML dinámico funcionen
  window.pizarraController = pizarraController;
}
