/**
 * admin-panel.js
 * Panel de administración para gestión de permisos
 */

class AdminPanel {
  constructor() {
    this.permisosData = null;
    this.solicitudesData = [];
    this.currentUser = null;
    this.userRole = null;
    this.isEditing = false;
    this.editingUser = null;

    this.init();
  }

  async init() {
    try {
      // Obtener información del usuario actual
      this.currentUser = await window.api.getUsername();

      // Cargar datos de permisos
      await this.loadPermisosData();

      // Verificar rol del usuario
      this.userRole = window.permisosService?.getRolUsuario() || "none";

      // Configurar interfaz según el rol
      this.setupUI();

      // Configurar eventos
      this.setupEvents();

      // Cargar datos iniciales
      await this.loadAllData();

      console.log("Admin Panel inicializado correctamente");
    } catch (error) {
      console.error("Error al inicializar Admin Panel:", error);
      this.showError("Error al cargar el panel de administración");
    }
  }

  async loadPermisosData() {
    try {
      this.permisosData = await window.api.getPermisos();
      if (!this.permisosData) {
        throw new Error("No se pudieron cargar los permisos");
      }
    } catch (error) {
      console.error("Error al cargar permisos:", error);
      throw error;
    }
  }

  setupUI() {
    // Configurar información del admin
    const adminBadge = document.getElementById("admin-role");
    const adminUsername = document.getElementById("admin-username");

    if (adminBadge && adminUsername) {
      adminUsername.textContent = this.currentUser;

      if (this.userRole === "master") {
        adminBadge.textContent = "Master Admin";
        adminBadge.classList.add("master");
      } else if (this.userRole === "admin") {
        adminBadge.textContent = "Administrador";
      } else {
        adminBadge.textContent = "Sin permisos";
      }
    }

    // Ocultar pestaña de administradores si no es master
    const adminsTab = document.getElementById("admins-tab");
    if (adminsTab && this.userRole !== "master") {
      adminsTab.style.display = "none";
    }
  }

  setupEvents() {
    // Navegación entre pestañas
    const tabBtns = document.querySelectorAll(".tab-btn");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tabName = e.currentTarget.getAttribute("data-tab");
        this.switchTab(tabName);
      });
    });

    // Botones principales
    document.getElementById("add-user-btn")?.addEventListener("click", () => {
      this.showUserModal();
    });

    document.getElementById("add-admin-btn")?.addEventListener("click", () => {
      this.showAdminModal();
    });

    document
      .getElementById("refresh-requests-btn")
      ?.addEventListener("click", () => {
        this.loadSolicitudes();
      });

    // Búsqueda y filtros
    document.getElementById("user-search")?.addEventListener("input", (e) => {
      this.filterUsers(e.target.value);
    });

    document.getElementById("app-filter")?.addEventListener("change", (e) => {
      this.filterUsersByApp(e.target.value);
    });

    document
      .getElementById("status-filter")
      ?.addEventListener("change", (e) => {
        this.filterSolicitudes(e.target.value);
      });

    // Modales
    this.setupModalEvents();
  }

  setupModalEvents() {
    // Cerrar modales
    document.querySelectorAll(".modal-close").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const modal = e.target.closest(".modal");
        this.closeModal(modal);
      });
    });

    // Cancelar formularios
    document
      .getElementById("cancel-user-btn")
      ?.addEventListener("click", () => {
        this.closeModal(document.getElementById("user-modal"));
      });

    document
      .getElementById("cancel-admin-btn")
      ?.addEventListener("click", () => {
        this.closeModal(document.getElementById("admin-modal"));
      });

    // Enviar formularios
    document.getElementById("user-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveUser();
    });

    document.getElementById("admin-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveAdmin();
    });

    // Cerrar modal al hacer clic fuera
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
        }
      });
    });
  }

  async loadAllData() {
    await Promise.all([
      this.loadUsers(),
      this.loadSolicitudes(),
      this.loadAdmins(),
    ]);
  }

  switchTab(tabName) {
    // Actualizar botones de pestañas
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add("active");

    // Actualizar vistas
    document.querySelectorAll(".view").forEach((view) => {
      view.classList.remove("active");
    });
    document.getElementById(`${tabName}-view`)?.classList.add("active");

    // Cargar datos si es necesario
    if (tabName === "solicitudes") {
      this.loadSolicitudes();
    } else if (tabName === "admins") {
      this.loadAdmins();
    }
  }

  async loadUsers() {
    const container = document.getElementById("users-grid");
    if (!container) return;

    try {
      container.innerHTML =
        '<div class="loading-state"><div class="loading-spinner"></div><p>Cargando usuarios...</p></div>';

      // Procesar datos de permisos para extraer usuarios
      const users = this.extractUsersFromPermisos();

      // Llenar filtro de aplicaciones
      this.populateAppFilter();

      if (users.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <h3>No hay usuarios registrados</h3>
            <p>Agrega el primer usuario para comenzar.</p>
          </div>
        `;
        return;
      }

      // Renderizar usuarios
      container.innerHTML = users
        .map((user) => this.renderUserCard(user))
        .join("");

      // Configurar eventos de las tarjetas
      this.setupUserCardEvents();
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      container.innerHTML =
        '<div class="empty-state"><p>Error al cargar usuarios</p></div>';
    }
  }

  extractUsersFromPermisos() {
    const users = new Map();

    // Iterar por todas las aplicaciones
    Object.entries(this.permisosData).forEach(([appName, appPermisos]) => {
      if (appName.startsWith("_")) return; // Ignorar configuraciones especiales

      if (Array.isArray(appPermisos)) {
        // Permiso simple por app
        appPermisos.forEach((username) => {
          if (username && username !== "*") {
            if (!users.has(username)) {
              users.set(username, { name: username, permissions: {} });
            }
            users.get(username).permissions[appName] = {
              type: "full",
              views: ["*"],
            };
          }
        });
      } else if (typeof appPermisos === "object") {
        // Permisos por vista
        Object.entries(appPermisos).forEach(([viewName, viewUsers]) => {
          if (Array.isArray(viewUsers)) {
            viewUsers.forEach((username) => {
              if (username && username !== "*") {
                if (!users.has(username)) {
                  users.set(username, { name: username, permissions: {} });
                }
                if (!users.get(username).permissions[appName]) {
                  users.get(username).permissions[appName] = {
                    type: "partial",
                    views: [],
                  };
                }
                users.get(username).permissions[appName].views.push(viewName);
              }
            });
          }
        });
      }
    });

    return Array.from(users.values());
  }

  populateAppFilter() {
    const select = document.getElementById("app-filter");
    if (!select) return;

    const apps = Object.keys(this.permisosData).filter(
      (key) => !key.startsWith("_")
    );

    select.innerHTML =
      '<option value="">Todas las aplicaciones</option>' +
      apps
        .map(
          (app) =>
            `<option value="${app}">${this.getAppDisplayName(app)}</option>`
        )
        .join("");
  }

  getAppDisplayName(appName) {
    const displayNames = {
      dashboard: "Dashboard",
      "feedback-tracker": "Inventory Health",
      "shift-tasks": "Shift Tasks",
      estadisticas: "Estadísticas",
      "activity-scope": "Activity Scope",
      "idle-time": "Idle Time",
      "space-heatmap": "Space HeatMap",
      "dock-control": "Dock Control",
    };
    return displayNames[appName] || appName;
  }

  renderUserCard(user) {
    const permissionTags = Object.entries(user.permissions)
      .map(([app, perm]) => {
        const className =
          perm.type === "full" ? "permission-tag" : "permission-tag partial";
        const displayName = this.getAppDisplayName(app);
        const viewsText =
          perm.type === "full" ? "" : ` (${perm.views.join(", ")})`;
        return `<span class="${className}">${displayName}${viewsText}</span>`;
      })
      .join("");

    return `
      <div class="user-card" data-username="${user.name}">
        <div class="user-card-header">
          <div class="user-name">${user.name}</div>
          <div class="user-actions">
            <button class="btn btn-small btn-secondary edit-user-btn" data-username="${
              user.name
            }">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Editar
            </button>
            <button class="btn btn-small btn-danger delete-user-btn" data-username="${
              user.name
            }">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
              </svg>
              Eliminar
            </button>
          </div>
        </div>
        <div class="user-permissions">
          ${
            permissionTags ||
            '<span class="permission-tag" style="background-color: var(--Color-Red-3);">Sin permisos</span>'
          }
        </div>
      </div>
    `;
  }

  setupUserCardEvents() {
    // Editar usuarios
    document.querySelectorAll(".edit-user-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const username = e.currentTarget.getAttribute("data-username");
        this.editUser(username);
      });
    });

    // Eliminar usuarios
    document.querySelectorAll(".delete-user-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const username = e.currentTarget.getAttribute("data-username");
        this.deleteUser(username);
      });
    });
  }

  async loadSolicitudes() {
    const container = document.getElementById("requests-container");
    if (!container) return;

    try {
      container.innerHTML =
        '<div class="loading-state"><div class="loading-spinner"></div><p>Cargando solicitudes...</p></div>';

      // Obtener ruta de solicitudes usando la nueva función
      const permisosDir = await window.api.getPermisosDir();
      const solicitudesPath = permisosDir + "solicitudes_permisos.json";

      // Cargar solicitudes
      try {
        const result = await window.api.readJson(solicitudesPath);
        this.solicitudesData = result && result.success ? result.data : [];
      } catch (e) {
        this.solicitudesData = [];
      }

      // Actualizar contador de pendientes
      this.updatePendingCount();

      if (this.solicitudesData.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4"/>
              <path d="M21 12c.552 0 1-.448 1-1V5c0-.552-.448-1-1-1H3c-.552 0-1 .448-1 1v6c0 .552.448 1 1 1h18z"/>
            </svg>
            <h3>No hay solicitudes</h3>
            <p>Las nuevas solicitudes aparecerán aquí.</p>
          </div>
        `;
        return;
      }

      // Ordenar por fecha (más recientes primero)
      const sortedSolicitudes = this.solicitudesData.sort(
        (a, b) => new Date(b.fecha) - new Date(a.fecha)
      );

      container.innerHTML = sortedSolicitudes
        .map((solicitud) => this.renderRequestCard(solicitud))
        .join("");
      this.setupRequestCardEvents();
    } catch (error) {
      console.error("Error al cargar solicitudes:", error);
      container.innerHTML =
        '<div class="empty-state"><p>Error al cargar solicitudes</p></div>';
    }
  }

  updatePendingCount() {
    const badge = document.getElementById("pending-count");
    if (!badge) return;

    const pendingCount = this.solicitudesData.filter(
      (s) => s.estado === "pendiente"
    ).length;

    if (pendingCount > 0) {
      badge.textContent = pendingCount;
      badge.style.display = "inline";
    } else {
      badge.style.display = "none";
    }
  }

  renderRequestCard(solicitud) {
    const fecha = new Date(solicitud.fecha).toLocaleString("es-ES");
    const statusClass = solicitud.estado;
    const statusText =
      {
        pendiente: "Pendiente",
        aprobada: "Aprobada",
        rechazada: "Rechazada",
      }[solicitud.estado] || solicitud.estado;

    const actions =
      solicitud.estado === "pendiente"
        ? `
      <div class="request-actions">
        <button class="btn btn-small btn-success approve-request-btn" data-id="${solicitud.fecha}_${solicitud.usuario}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
          Aprobar
        </button>
        <button class="btn btn-small btn-danger reject-request-btn" data-id="${solicitud.fecha}_${solicitud.usuario}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Rechazar
        </button>
      </div>
    `
        : "";

    const processingInfo = solicitud.fecha_procesada
      ? `
      <div class="request-meta">
        Procesada el ${new Date(solicitud.fecha_procesada).toLocaleString(
          "es-ES"
        )} por ${solicitud.procesada_por}
        ${
          solicitud.razon_rechazo
            ? `<br>Motivo: ${solicitud.razon_rechazo}`
            : ""
        }
      </div>
    `
      : "";

    return `
      <div class="request-card ${statusClass}">
        <div class="request-header">
          <div class="request-user">${solicitud.usuario}</div>
          <div class="request-status ${statusClass}">${statusText}</div>
        </div>
        <div class="request-details">
          <strong>Aplicación:</strong> ${this.getAppDisplayName(
            solicitud.aplicacion
          )}<br>
          <strong>Motivo:</strong> ${solicitud.motivo}<br>
          <strong>Fecha:</strong> ${fecha}<br>
          <strong>Computador:</strong> ${solicitud.computador}
        </div>
        ${actions}
        ${processingInfo}
      </div>
    `;
  }

  setupRequestCardEvents() {
    document.querySelectorAll(".approve-request-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const requestId = e.currentTarget.getAttribute("data-id");
        this.approveRequest(requestId);
      });
    });

    document.querySelectorAll(".reject-request-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const requestId = e.currentTarget.getAttribute("data-id");
        this.rejectRequest(requestId);
      });
    });
  }

  async approveRequest(requestId) {
    const [fecha, usuario] = requestId.split("_");
    const solicitud = this.solicitudesData.find(
      (s) => s.fecha === fecha && s.usuario === usuario
    );

    if (!solicitud) return;

    try {
      // Agregar permisos al usuario
      if (!this.permisosData.dashboard) {
        this.permisosData.dashboard = [];
      }

      if (!this.permisosData.dashboard.includes(solicitud.usuario)) {
        this.permisosData.dashboard.push(solicitud.usuario);
      }

      // Actualizar estado de la solicitud
      solicitud.estado = "aprobada";
      solicitud.fecha_procesada = new Date().toISOString();
      solicitud.procesada_por = this.currentUser;

      // Guardar cambios
      await this.savePermisosData();
      await this.saveSolicitudesData();

      // Recargar vistas
      await this.loadUsers();
      await this.loadSolicitudes();

      this.showSuccess(
        `Solicitud de ${solicitud.usuario} aprobada correctamente`
      );
    } catch (error) {
      console.error("Error al aprobar solicitud:", error);
      this.showError("Error al aprobar la solicitud");
    }
  }

  async rejectRequest(requestId) {
    const [fecha, usuario] = requestId.split("_");
    const solicitud = this.solicitudesData.find(
      (s) => s.fecha === fecha && s.usuario === usuario
    );

    if (!solicitud) return;

    const motivo =
      prompt("Motivo del rechazo (opcional):") || "Sin motivo especificado";

    try {
      // Actualizar estado de la solicitud
      solicitud.estado = "rechazada";
      solicitud.fecha_procesada = new Date().toISOString();
      solicitud.procesada_por = this.currentUser;
      solicitud.razon_rechazo = motivo;

      // Guardar cambios
      await this.saveSolicitudesData();

      // Recargar vista
      await this.loadSolicitudes();

      this.showSuccess(`Solicitud de ${solicitud.usuario} rechazada`);
    } catch (error) {
      console.error("Error al rechazar solicitud:", error);
      this.showError("Error al rechazar la solicitud");
    }
  }

  async loadAdmins() {
    if (this.userRole !== "master") return;

    const masterContainer = document.getElementById("master-admins");
    const secondaryContainer = document.getElementById("secondary-admins");

    if (!masterContainer || !secondaryContainer) return;

    try {
      const adminRoles = this.permisosData._admin_roles || {
        master: [],
        admins: [],
      };

      // Renderizar administradores master
      if (adminRoles.master && adminRoles.master.length > 0) {
        masterContainer.innerHTML = adminRoles.master
          .map((admin) => this.renderAdminCard(admin, "master"))
          .join("");
      } else {
        masterContainer.innerHTML =
          "<p>No hay administradores master configurados</p>";
      }

      // Renderizar administradores secundarios
      if (adminRoles.admins && adminRoles.admins.length > 0) {
        secondaryContainer.innerHTML = adminRoles.admins
          .map((admin) => this.renderAdminCard(admin, "secondary"))
          .join("");
      } else {
        secondaryContainer.innerHTML =
          "<p>No hay administradores secundarios</p>";
      }

      this.setupAdminCardEvents();
    } catch (error) {
      console.error("Error al cargar administradores:", error);
    }
  }

  renderAdminCard(adminName, type) {
    const canDelete = type === "secondary"; // Solo se pueden eliminar admins secundarios

    return `
      <div class="admin-card ${type}">
        <div class="admin-name">${adminName}</div>
        ${
          canDelete
            ? `
          <button class="btn btn-small btn-danger delete-admin-btn" data-admin="${adminName}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6"/>
              <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
            </svg>
          </button>
        `
            : ""
        }
      </div>
    `;
  }

  setupAdminCardEvents() {
    document.querySelectorAll(".delete-admin-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const adminName = e.currentTarget.getAttribute("data-admin");
        this.deleteAdmin(adminName);
      });
    });
  }

  // Métodos de modal y formularios
  showUserModal(username = null) {
    const modal = document.getElementById("user-modal");
    const title = document.getElementById("user-modal-title");
    const usernameInput = document.getElementById("username-input");

    this.isEditing = username !== null;
    this.editingUser = username;

    if (this.isEditing) {
      title.textContent = "Editar Usuario";
      usernameInput.value = username;
      usernameInput.disabled = true;
      this.populateUserPermissions(username);
    } else {
      title.textContent = "Agregar Usuario";
      usernameInput.value = "";
      usernameInput.disabled = false;
      this.populateUserPermissions();
    }

    this.showModal(modal);
  }

  populateUserPermissions(username = null) {
    const container = document.getElementById("app-permissions");
    if (!container) return;

    const userPermissions = username ? this.getUserPermissions(username) : {};
    const apps = Object.keys(this.permisosData).filter(
      (key) => !key.startsWith("_")
    );

    container.innerHTML = apps
      .map((appName) => {
        const appPermisos = this.permisosData[appName];
        const userHasApp = userPermissions[appName] || {};

        if (Array.isArray(appPermisos)) {
          // Permiso simple
          const checked = userHasApp.type === "full" ? "checked" : "";
          return `
          <div class="permission-item">
            <div class="permission-app">${this.getAppDisplayName(appName)}</div>
            <div class="permission-checkbox">
              <input type="checkbox" id="app_${appName}" name="apps" value="${appName}" ${checked}>
              <label for="app_${appName}">Acceso completo</label>
            </div>
          </div>
        `;
        } else {
          // Permisos por vista
          const viewsHtml = Object.keys(appPermisos)
            .map((viewName) => {
              const checked =
                userHasApp.views && userHasApp.views.includes(viewName)
                  ? "checked"
                  : "";
              return `
            <div class="permission-checkbox">
              <input type="checkbox" id="view_${appName}_${viewName}" name="views" value="${appName}:${viewName}" ${checked}>
              <label for="view_${appName}_${viewName}">${
                viewName === "*" ? "Acceso general" : viewName
              }</label>
            </div>
          `;
            })
            .join("");

          return `
          <div class="permission-item">
            <div class="permission-app">${this.getAppDisplayName(appName)}</div>
            ${viewsHtml}
          </div>
        `;
        }
      })
      .join("");
  }

  getUserPermissions(username) {
    const users = this.extractUsersFromPermisos();
    const user = users.find((u) => u.name === username);
    return user ? user.permissions : {};
  }

  showAdminModal() {
    const modal = document.getElementById("admin-modal");
    document.getElementById("admin-username-input").value = "";
    document.getElementById("admin-type-select").value = "";
    this.showModal(modal);
  }

  showModal(modal) {
    modal.classList.add("show");
    modal.style.display = "flex";
  }

  closeModal(modal) {
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 150);
  }

  async saveUser() {
    try {
      const username = document.getElementById("username-input").value.trim();
      if (!username) {
        this.showError("El nombre de usuario es requerido");
        return;
      }

      // Obtener permisos seleccionados
      const selectedApps = Array.from(
        document.querySelectorAll('input[name="apps"]:checked')
      ).map((input) => input.value);

      const selectedViews = Array.from(
        document.querySelectorAll('input[name="views"]:checked')
      ).map((input) => {
        const [app, view] = input.value.split(":");
        return { app, view };
      });

      // Remover permisos existentes del usuario
      this.removeUserFromAllPermissions(username);

      // Agregar nuevos permisos
      selectedApps.forEach((appName) => {
        if (!this.permisosData[appName]) {
          this.permisosData[appName] = [];
        }
        if (!this.permisosData[appName].includes(username)) {
          this.permisosData[appName].push(username);
        }
      });

      selectedViews.forEach(({ app, view }) => {
        if (!this.permisosData[app]) {
          this.permisosData[app] = {};
        }
        if (!this.permisosData[app][view]) {
          this.permisosData[app][view] = [];
        }
        if (!this.permisosData[app][view].includes(username)) {
          this.permisosData[app][view].push(username);
        }
      });

      // Guardar cambios
      await this.savePermisosData();

      // Cerrar modal y recargar datos
      this.closeModal(document.getElementById("user-modal"));
      await this.loadUsers();

      this.showSuccess(
        `Usuario ${username} ${
          this.isEditing ? "actualizado" : "creado"
        } correctamente`
      );
    } catch (error) {
      console.error("Error al guardar usuario:", error);
      this.showError("Error al guardar el usuario");
    }
  }

  removeUserFromAllPermissions(username) {
    Object.keys(this.permisosData).forEach((appName) => {
      if (appName.startsWith("_")) return;

      const appPermisos = this.permisosData[appName];

      if (Array.isArray(appPermisos)) {
        const index = appPermisos.indexOf(username);
        if (index > -1) {
          appPermisos.splice(index, 1);
        }
      } else if (typeof appPermisos === "object") {
        Object.keys(appPermisos).forEach((viewName) => {
          if (Array.isArray(appPermisos[viewName])) {
            const index = appPermisos[viewName].indexOf(username);
            if (index > -1) {
              appPermisos[viewName].splice(index, 1);
            }
          }
        });
      }
    });
  }

  async deleteUser(username) {
    if (
      !confirm(
        `¿Estás seguro de que quieres eliminar al usuario "${username}"?`
      )
    ) {
      return;
    }

    try {
      this.removeUserFromAllPermissions(username);
      await this.savePermisosData();
      await this.loadUsers();
      this.showSuccess(`Usuario ${username} eliminado correctamente`);
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      this.showError("Error al eliminar el usuario");
    }
  }

  editUser(username) {
    this.showUserModal(username);
  }

  async saveAdmin() {
    try {
      const username = document
        .getElementById("admin-username-input")
        .value.trim();
      const type = document.getElementById("admin-type-select").value;

      if (!username || !type) {
        this.showError("Todos los campos son requeridos");
        return;
      }

      if (!this.permisosData._admin_roles) {
        this.permisosData._admin_roles = { master: [], admins: [] };
      }

      if (type === "admin") {
        if (!this.permisosData._admin_roles.admins.includes(username)) {
          this.permisosData._admin_roles.admins.push(username);
        }
      }

      await this.savePermisosData();
      this.closeModal(document.getElementById("admin-modal"));
      await this.loadAdmins();

      this.showSuccess(`Administrador ${username} agregado correctamente`);
    } catch (error) {
      console.error("Error al guardar administrador:", error);
      this.showError("Error al guardar el administrador");
    }
  }

  async deleteAdmin(adminName) {
    if (
      !confirm(
        `¿Estás seguro de que quieres eliminar al administrador "${adminName}"?`
      )
    ) {
      return;
    }

    try {
      if (
        this.permisosData._admin_roles &&
        this.permisosData._admin_roles.admins
      ) {
        const index = this.permisosData._admin_roles.admins.indexOf(adminName);
        if (index > -1) {
          this.permisosData._admin_roles.admins.splice(index, 1);
        }
      }

      await this.savePermisosData();
      await this.loadAdmins();

      this.showSuccess(`Administrador ${adminName} eliminado correctamente`);
    } catch (error) {
      console.error("Error al eliminar administrador:", error);
      this.showError("Error al eliminar el administrador");
    }
  }

  // Métodos de persistencia
  async savePermisosData() {
    try {
      const result = await window.api.savePermisos(this.permisosData);

      if (!result || !result.success) {
        throw new Error(
          result.message || "Error al guardar archivo de permisos"
        );
      }

      console.log("Permisos guardados:", result.results);

      // Recargar permisos en el servicio global
      if (window.permisosService) {
        await window.permisosService.init();
      }
    } catch (error) {
      console.error("Error al guardar permisos:", error);
      throw error;
    }
  }

  async saveSolicitudesData() {
    try {
      const permisosDir = await window.api.getPermisosDir();
      const solicitudesPath = permisosDir + "solicitudes_permisos.json";

      const result = await window.api.saveJson(
        solicitudesPath,
        this.solicitudesData
      );

      if (!result || !result.success) {
        throw new Error("Error al guardar archivo de solicitudes");
      }
    } catch (error) {
      console.error("Error al guardar solicitudes:", error);
      throw error;
    }
  }

  // Métodos de filtrado
  filterUsers(searchTerm) {
    const cards = document.querySelectorAll(".user-card");
    const term = searchTerm.toLowerCase();

    cards.forEach((card) => {
      const username = card.getAttribute("data-username").toLowerCase();
      const visible = username.includes(term);
      card.style.display = visible ? "block" : "none";
    });
  }

  filterUsersByApp(appName) {
    const cards = document.querySelectorAll(".user-card");

    cards.forEach((card) => {
      if (!appName) {
        card.style.display = "block";
        return;
      }

      const displayName = this.getAppDisplayName(appName);
      const tags = card.querySelectorAll(".permission-tag");
      let hasApp = false;

      tags.forEach((tag) => {
        if (tag.textContent.includes(displayName)) {
          hasApp = true;
        }
      });

      card.style.display = hasApp ? "block" : "none";
    });
  }

  filterSolicitudes(status) {
    const cards = document.querySelectorAll(".request-card");

    cards.forEach((card) => {
      if (!status) {
        card.style.display = "block";
        return;
      }

      const visible = card.classList.contains(status);
      card.style.display = visible ? "block" : "none";
    });
  }

  // Métodos de notificación
  showSuccess(message) {
    if (window.showToast) {
      window.showToast(message, "success");
    } else {
      alert(message);
    }
  }

  showError(message) {
    if (window.showToast) {
      window.showToast(message, "error");
    } else {
      alert(message);
    }
  }
}

// Función de inicialización para ser llamada por el router
window.initAdminPanel = function () {
  console.log("Inicializando Admin Panel...");

  // Verificar que el usuario tenga permisos de administrador
  if (window.permisosService && !window.permisosService.esAdmin()) {
    const appContainer =
      document.getElementById("app-container") || document.body;
    appContainer.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center; padding: 2rem;">
        <div style="background: var(--sidebar_bg_ch, #f8f9fa); padding: 2rem; border-radius: 8px; border: 1px solid var(--Limit-Sidebar, #ddd);">
          <h2 style="color: var(--text-color-three, #333); margin-bottom: 1rem;">Acceso Denegado</h2>
          <p style="color: var(--text-color-one, #666);">No tienes permisos para acceder al panel de administración.</p>
        </div>
      </div>
    `;
    return false;
  }

  new AdminPanel();
  return true;
};

// Auto-inicialización cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      window.initAdminPanel();
    }, 100);
  });
} else {
  // DOM ya está listo
  setTimeout(() => {
    window.initAdminPanel();
  }, 100);
}

// También escuchar eventos del router
window.addEventListener("app:ready", (event) => {
  if (event.detail && event.detail.app === "admin-panel") {
    setTimeout(() => {
      window.initAdminPanel();
    }, 100);
  }
});

export { AdminPanel };
