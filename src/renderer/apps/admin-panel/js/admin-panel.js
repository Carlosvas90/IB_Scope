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
    this.virtualGroups = null;
    this.useVirtualGroups = true;

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

      // Cargar configuración de grupos virtuales
      await this.loadVirtualGroupsConfig();
    } catch (error) {
      console.error("Error al cargar permisos:", error);
      throw error;
    }
  }

  async loadVirtualGroupsConfig() {
    try {
      const configPath = "config/permission-groups.json";
      const result = await window.api.readJson(configPath);

      if (result && result.success) {
        this.virtualGroups = result.data;
        console.log(
          "Configuración de grupos virtuales cargada:",
          this.virtualGroups
        );
      } else {
        console.warn(
          "No se pudo cargar la configuración de grupos virtuales, usando vista tradicional"
        );
        this.virtualGroups = null;
        this.useVirtualGroups = false;
      }
    } catch (error) {
      console.warn("Error al cargar grupos virtuales:", error);
      this.virtualGroups = null;
      this.useVirtualGroups = false;
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
      this.loadGroups(),
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
    const groupSelect = document.getElementById("user-group-select");

    this.isEditing = username !== null;
    this.editingUser = username;

    // Llenar select de grupos
    this.populateUserGroupSelect();

    if (this.isEditing) {
      title.textContent = "Editar Usuario";
      usernameInput.value = username;
      usernameInput.disabled = true;
      this.populateUserPermissions(username);

      // Preseleccionar grupo del usuario
      const userGroup = this.getUserGroup(username);
      if (groupSelect && userGroup) {
        groupSelect.value = userGroup;
      }
    } else {
      title.textContent = "Agregar Usuario";
      usernameInput.value = "";
      usernameInput.disabled = false;
      this.populateUserPermissions();

      // Limpiar selección de grupo
      if (groupSelect) {
        groupSelect.value = "";
      }
    }

    this.showModal(modal);
  }

  populateUserPermissions(username = null) {
    const container = document.getElementById("app-permissions");
    if (!container) return;

    if (this.useVirtualGroups && this.virtualGroups) {
      this.populateVirtualGroupPermissions(username);
    } else {
      this.populateTraditionalPermissions(username);
    }
  }

  populateVirtualGroupPermissions(username = null) {
    const container = document.getElementById("app-permissions");
    const userPermissions = username ? this.getUserPermissions(username) : {};

    // Agregar botón para cambiar a vista tradicional
    const headerHtml = `
      <div class="permissions-header">
        <div class="permissions-title">
          <h3>Permisos por Categorías</h3>
        </div>
        <button type="button" class="btn btn-small btn-secondary" onclick="adminPanel.togglePermissionView()">
          Vista Tradicional
        </button>
      </div>
    `;

    const groupsHtml = Object.entries(this.virtualGroups.virtualGroups)
      .map(([groupId, group]) => {
        const groupPermissions = this.getUserVirtualGroupPermissions(
          userPermissions,
          group
        );
        const allSelected = groupPermissions.allSelected;
        const partialSelected = groupPermissions.partialSelected;

        const groupHeaderClass = allSelected
          ? "group-header selected"
          : partialSelected
          ? "group-header partial"
          : "group-header";

        const bulkActionsHtml = Object.entries(group.bulkActions || {})
          .map(([actionId, action]) => {
            const actionSelected = this.isBulkActionSelected(
              userPermissions,
              action
            );
            return `
                <div class="permission-checkbox">
                  <input type="checkbox" 
                         id="bulk_${groupId}_${actionId}" 
                         name="bulkActions" 
                         value="${groupId}:${actionId}" 
                         ${actionSelected ? "checked" : ""}
                         onchange="adminPanel.handleBulkActionChange('${groupId}', '${actionId}', this.checked)">
                  <label for="bulk_${groupId}_${actionId}">
                    ${action.name}
                  </label>
                </div>
              `;
          })
          .join("");

        const permissionsHtml = group.permissions
          .map((permission) => {
            const appPermisos = this.permisosData[permission.app];
            const userHasApp = userPermissions[permission.app] || {};

            if (permission.views.includes("*") || Array.isArray(appPermisos)) {
              // Permiso completo para la app
              const checked = userHasApp.type === "full" ? "checked" : "";
              return `
                <div class="permission-item">
                  <div class="permission-app">${permission.displayName}</div>
                  <div class="permission-checkbox">
                    <input type="checkbox" 
                           id="vapp_${permission.app}" 
                           name="apps" 
                           value="${permission.app}" 
                           ${checked}>
                    <label for="vapp_${permission.app}">Acceso completo</label>
                  </div>
                </div>
              `;
            } else {
              // Permisos específicos por vista
              const viewsHtml = permission.views
                .map((viewName) => {
                  const checked =
                    userHasApp.views && userHasApp.views.includes(viewName)
                      ? "checked"
                      : "";
                  return `
                    <div class="permission-checkbox">
                      <input type="checkbox" 
                             id="vview_${permission.app}_${viewName}" 
                             name="views" 
                             value="${permission.app}:${viewName}" 
                             ${checked}>
                      <label for="vview_${permission.app}_${viewName}">${viewName}</label>
                    </div>
                  `;
                })
                .join("");

              return `
                <div class="permission-item">
                  <div class="permission-app">${permission.displayName}</div>
                  ${viewsHtml}
                </div>
              `;
            }
          })
          .join("");

        return `
          <div class="group-section">
            <h4 class="group-title">${group.name}</h4>
            ${
              bulkActionsHtml
                ? `<div class="bulk-action-row">${bulkActionsHtml}</div>`
                : ""
            }
            <div class="permissions-grid">
              ${permissionsHtml}
            </div>
          </div>
        `;
      })
      .join("");

    container.innerHTML = headerHtml + groupsHtml;
  }

  populateTraditionalPermissions(username = null) {
    const container = document.getElementById("app-permissions");
    const userPermissions = username ? this.getUserPermissions(username) : {};
    const apps = Object.keys(this.permisosData).filter(
      (key) => !key.startsWith("_")
    );

    // Agregar botón para cambiar a vista por grupos (si están disponibles)
    const headerHtml = this.virtualGroups
      ? `
      <div class="permissions-header">
        <div class="permissions-title">
          <h3>Permisos Tradicionales</h3>
        </div>
        <button type="button" class="btn btn-small btn-secondary" onclick="adminPanel.togglePermissionView()">
          Vista por Categorías
        </button>
      </div>
    `
      : '<div class="permissions-header"><h3>Permisos de Aplicación</h3></div>';

    const appsHtml = apps
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

    container.innerHTML = headerHtml + appsHtml;
  }

  getUserPermissions(username) {
    const users = this.extractUsersFromPermisos();
    const user = users.find((u) => u.name === username);
    return user ? user.permissions : {};
  }

  // Funciones auxiliares para grupos virtuales
  togglePermissionView() {
    this.useVirtualGroups = !this.useVirtualGroups;
    this.populateUserPermissions(this.editingUser);
  }

  getUserVirtualGroupPermissions(userPermissions, group) {
    let totalPermissions = 0;
    let userHasPermissions = 0;

    group.permissions.forEach((permission) => {
      const userHasApp = userPermissions[permission.app] || {};

      if (permission.views.includes("*")) {
        totalPermissions += 1;
        if (userHasApp.type === "full") {
          userHasPermissions += 1;
        }
      } else {
        permission.views.forEach((view) => {
          totalPermissions += 1;
          if (userHasApp.views && userHasApp.views.includes(view)) {
            userHasPermissions += 1;
          }
        });
      }
    });

    return {
      allSelected:
        userHasPermissions === totalPermissions && totalPermissions > 0,
      partialSelected:
        userHasPermissions > 0 && userHasPermissions < totalPermissions,
      userHasPermissions,
      totalPermissions,
    };
  }

  isBulkActionSelected(userPermissions, action) {
    return action.grants.every((grant) => {
      const [app, view] = grant.split(":");
      const userHasApp = userPermissions[app] || {};

      if (view === "*") {
        return userHasApp.type === "full";
      } else {
        return userHasApp.views && userHasApp.views.includes(view);
      }
    });
  }

  handleBulkActionChange(groupId, actionId, isChecked) {
    const group = this.virtualGroups.virtualGroups[groupId];
    const action = group.bulkActions[actionId];

    if (isChecked) {
      // Seleccionar todos los permisos de la acción
      action.grants.forEach((grant) => {
        const [app, view] = grant.split(":");

        if (view === "*") {
          // Marcar checkbox de app completa
          const checkbox = document.getElementById(`vapp_${app}`);
          if (checkbox) checkbox.checked = true;
        } else {
          // Marcar checkbox de vista específica
          const checkbox = document.getElementById(`vview_${app}_${view}`);
          if (checkbox) checkbox.checked = true;
        }
      });
    } else {
      // Deseleccionar todos los permisos de la acción
      action.grants.forEach((grant) => {
        const [app, view] = grant.split(":");

        if (view === "*") {
          // Desmarcar checkbox de app completa
          const checkbox = document.getElementById(`vapp_${app}`);
          if (checkbox) checkbox.checked = false;
        } else {
          // Desmarcar checkbox de vista específica
          const checkbox = document.getElementById(`vview_${app}_${view}`);
          if (checkbox) checkbox.checked = false;
        }
      });
    }
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
      const selectedGroup = document.getElementById("user-group-select").value;

      if (!username) {
        this.showError("El nombre de usuario es requerido");
        return;
      }

      // Obtener permisos seleccionados (tanto de vista tradicional como virtual)
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

      // Asignar usuario a grupo
      await this.assignUserToGroup(username, selectedGroup);

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

  // ===== GESTIÓN DE GRUPOS =====

  initializeGroups() {
    // Inicializar estructura de grupos si no existe
    if (!this.permisosData._user_groups) {
      this.permisosData._user_groups = {
        groups: {},
        assignments: {},
      };
    }

    this.isGroupedView = false;
    this.selectedGroup = null;
  }

  async loadGroups() {
    this.initializeGroups();

    // Llenar filtro de grupos
    this.populateGroupFilter();

    // Configurar eventos de grupos
    this.setupGroupEvents();
  }

  populateGroupFilter() {
    const select = document.getElementById("group-filter");
    if (!select) return;

    const groups = this.permisosData._user_groups.groups || {};

    select.innerHTML =
      '<option value="">Todos los grupos</option>' +
      Object.entries(groups)
        .map(
          ([groupId, group]) =>
            `<option value="${groupId}">${group.name}</option>`
        )
        .join("");
  }

  setupGroupEvents() {
    // Eventos ya configurados en setupEvents(), agregamos específicos de grupos

    // Botón gestionar grupos
    document
      .getElementById("manage-groups-btn")
      ?.addEventListener("click", () => {
        this.showGroupsModal();
      });

    // Botón toggle agrupación
    document
      .getElementById("toggle-groups-btn")
      ?.addEventListener("click", () => {
        this.toggleGroupedView();
      });

    // Filtro por grupo
    document.getElementById("group-filter")?.addEventListener("change", (e) => {
      this.filterUsersByGroup(e.target.value);
    });

    // Eventos del modal de grupos
    document
      .getElementById("create-group-btn")
      ?.addEventListener("click", () => {
        this.showGroupModal();
      });

    document
      .getElementById("close-groups-btn")
      ?.addEventListener("click", () => {
        this.closeModal(document.getElementById("groups-modal"));
      });

    // Eventos del modal de crear/editar grupo
    document
      .getElementById("cancel-group-btn")
      ?.addEventListener("click", () => {
        this.closeModal(document.getElementById("group-modal"));
      });

    document.getElementById("group-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveGroup();
    });
  }

  toggleGroupedView() {
    this.isGroupedView = !this.isGroupedView;
    const btn = document.getElementById("toggle-groups-btn");
    const usersGrid = document.getElementById("users-grid");

    if (this.isGroupedView) {
      btn.textContent = "Vista Normal";
      usersGrid.classList.add("grouped");
      this.renderUsersGrouped();
    } else {
      btn.textContent = "Agrupar por Categorías";
      usersGrid.classList.remove("grouped");
      this.loadUsers(); // Volver a vista normal
    }
  }

  async renderUsersGrouped() {
    const container = document.getElementById("users-grid");
    if (!container) return;

    try {
      const users = this.extractUsersFromPermisos();
      const groups = this.permisosData._user_groups.groups || {};
      const assignments = this.permisosData._user_groups.assignments || {};

      // Agrupar usuarios
      const groupedUsers = {
        ...Object.keys(groups).reduce((acc, groupId) => {
          acc[groupId] = [];
          return acc;
        }, {}),
        unassigned: [],
      };

      users.forEach((user) => {
        const userGroup = assignments[user.name];
        if (userGroup && groups[userGroup]) {
          groupedUsers[userGroup].push(user);
        } else {
          groupedUsers.unassigned.push(user);
        }
      });

      // Renderizar grupos
      const groupSections = Object.entries(groupedUsers)
        .map(([groupId, groupUsers]) => {
          if (groupUsers.length === 0 && groupId !== "unassigned") return "";

          const group = groups[groupId];
          const isUnassigned = groupId === "unassigned";

          const groupName = isUnassigned ? "Sin Grupo Asignado" : group.name;
          const groupColor = isUnassigned ? "#6B7280" : group.color;
          const groupDescription = isUnassigned
            ? "Usuarios que no pertenecen a ningún grupo"
            : group.description;

          return `
          <div class="group-section" data-group-id="${groupId}">
            <div class="group-header clickable" onclick="this.parentElement.classList.toggle('collapsed')">
              <div class="group-title">
                <div class="group-color-indicator" style="background-color: ${groupColor};"></div>
                <div>
                  <h3>${groupName}</h3>
                  ${
                    groupDescription
                      ? `<p class="group-description">${groupDescription}</p>`
                      : ""
                  }
                </div>
                <svg class="group-collapse-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
              <div class="group-count">${groupUsers.length}</div>
            </div>
            <div class="group-users">
              ${groupUsers.map((user) => this.renderUserCard(user)).join("")}
            </div>
          </div>
        `;
        })
        .filter((section) => section !== "")
        .join("");

      container.innerHTML =
        groupSections ||
        '<div class="empty-state"><p>No hay usuarios para mostrar</p></div>';

      // Reconfigurar eventos de las tarjetas
      this.setupUserCardEvents();
    } catch (error) {
      console.error("Error al renderizar usuarios agrupados:", error);
      container.innerHTML =
        '<div class="empty-state"><p>Error al cargar vista agrupada</p></div>';
    }
  }

  filterUsersByGroup(groupId) {
    if (!this.isGroupedView) {
      // En vista normal, filtrar tarjetas individuales
      const cards = document.querySelectorAll(".user-card");
      const assignments = this.permisosData._user_groups.assignments || {};

      cards.forEach((card) => {
        if (!groupId) {
          card.style.display = "block";
          return;
        }

        const username = card.getAttribute("data-username");
        const userGroup = assignments[username];
        const visible =
          userGroup === groupId || (groupId === "unassigned" && !userGroup);
        card.style.display = visible ? "block" : "none";
      });
    } else {
      // En vista agrupada, mostrar/ocultar secciones de grupo
      const groupSections = document.querySelectorAll(".group-section");

      groupSections.forEach((section) => {
        if (!groupId) {
          section.style.display = "block";
          return;
        }

        const sectionGroupId = section.getAttribute("data-group-id");
        const visible = sectionGroupId === groupId;
        section.style.display = visible ? "block" : "none";
      });
    }
  }

  showGroupsModal() {
    const modal = document.getElementById("groups-modal");
    this.renderGroupsList();
    this.showModal(modal);
  }

  renderGroupsList() {
    const container = document.getElementById("groups-list");
    if (!container) return;

    const groups = this.permisosData._user_groups.groups || {};
    const assignments = this.permisosData._user_groups.assignments || {};

    // Contar usuarios por grupo
    const groupCounts = Object.keys(groups).reduce((acc, groupId) => {
      acc[groupId] = Object.values(assignments).filter(
        (assignedGroup) => assignedGroup === groupId
      ).length;
      return acc;
    }, {});

    if (Object.keys(groups).length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: var(--text-color-one); font-style: italic;">No hay grupos creados</p>';
      return;
    }

    container.innerHTML = Object.entries(groups)
      .map(
        ([groupId, group]) => `
      <div class="group-item" data-group-id="${groupId}" onclick="adminPanel.selectGroup('${groupId}')">
        <div class="group-item-color" style="background-color: ${
          group.color
        };"></div>
        <div class="group-item-info">
          <p class="group-item-name">${group.name}</p>
          <p class="group-item-count">${groupCounts[groupId] || 0} usuarios</p>
        </div>
      </div>
    `
      )
      .join("");
  }

  selectGroup(groupId) {
    // Actualizar selección visual
    document.querySelectorAll(".group-item").forEach((item) => {
      item.classList.remove("selected");
    });
    document
      .querySelector(`[data-group-id="${groupId}"]`)
      ?.classList.add("selected");

    this.selectedGroup = groupId;
    this.renderGroupDetails(groupId);
  }

  renderGroupDetails(groupId) {
    const container = document.getElementById("group-details");
    if (!container) return;

    const group = this.permisosData._user_groups.groups[groupId];
    const assignments = this.permisosData._user_groups.assignments || {};

    // Obtener usuarios del grupo
    const groupUsers = Object.entries(assignments)
      .filter(([username, assignedGroup]) => assignedGroup === groupId)
      .map(([username]) => {
        const users = this.extractUsersFromPermisos();
        return users.find((u) => u.name === username);
      })
      .filter(Boolean);

    container.innerHTML = `
      <div class="group-detail-header">
        <div class="group-detail-info">
          <div class="group-detail-title">
            <div class="group-color-indicator" style="background-color: ${
              group.color
            };"></div>
            ${group.name}
          </div>
          ${
            group.description
              ? `<p class="group-detail-description">${group.description}</p>`
              : ""
          }
        </div>
        <div class="group-detail-actions">
          <button class="btn btn-small btn-secondary" onclick="adminPanel.editGroup('${groupId}')">
            Editar
          </button>
          <button class="btn btn-small btn-danger" onclick="adminPanel.deleteGroup('${groupId}')">
            Eliminar
          </button>
        </div>
      </div>
      
      <div class="group-users-section">
        <div class="group-users-header">
          <h4>Usuarios del Grupo (${groupUsers.length})</h4>
        </div>
        <div class="group-users-list">
          ${groupUsers
            .map(
              (user) => `
            <div class="group-user-item">
              <div class="group-user-info">
                <div class="group-user-name">${user.name}</div>
                <div class="group-user-permissions">
                  ${Object.keys(user.permissions)
                    .slice(0, 3)
                    .map(
                      (app) =>
                        `<span class="group-user-tag">${this.getAppDisplayName(
                          app
                        )}</span>`
                    )
                    .join("")}
                  ${
                    Object.keys(user.permissions).length > 3
                      ? `<span class="group-user-tag">+${
                          Object.keys(user.permissions).length - 3
                        }</span>`
                      : ""
                  }
                </div>
              </div>
              <button class="btn btn-small btn-secondary" onclick="adminPanel.removeUserFromGroup('${
                user.name
              }')">
                Remover
              </button>
            </div>
          `
            )
            .join("")}
          ${
            groupUsers.length === 0
              ? '<p style="text-align: center; color: var(--text-color-one); font-style: italic;">No hay usuarios en este grupo</p>'
              : ""
          }
        </div>
      </div>
    `;
  }

  showGroupModal(groupId = null) {
    const modal = document.getElementById("group-modal");
    const title = document.getElementById("group-modal-title");
    const nameInput = document.getElementById("group-name-input");
    const descriptionInput = document.getElementById("group-description-input");
    const colorInput = document.getElementById("group-color-input");

    this.editingGroup = groupId;

    if (groupId) {
      const group = this.permisosData._user_groups.groups[groupId];
      title.textContent = "Editar Grupo";
      nameInput.value = group.name;
      descriptionInput.value = group.description || "";
      colorInput.value = group.color;
    } else {
      title.textContent = "Crear Grupo";
      nameInput.value = "";
      descriptionInput.value = "";
      colorInput.value = "#3B82F6";
    }

    this.showModal(modal);
  }

  async saveGroup() {
    try {
      const name = document.getElementById("group-name-input").value.trim();
      const description = document
        .getElementById("group-description-input")
        .value.trim();
      const color = document.getElementById("group-color-input").value;

      if (!name) {
        this.showError("El nombre del grupo es requerido");
        return;
      }

      const groupId = this.editingGroup || Date.now().toString();

      if (!this.permisosData._user_groups.groups) {
        this.permisosData._user_groups.groups = {};
      }

      this.permisosData._user_groups.groups[groupId] = {
        name,
        description,
        color,
        created: this.editingGroup
          ? this.permisosData._user_groups.groups[groupId].created
          : new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      await this.savePermisosData();

      this.closeModal(document.getElementById("group-modal"));
      this.renderGroupsList();
      this.populateGroupFilter();
      this.populateUserGroupSelect();

      this.showSuccess(
        `Grupo ${this.editingGroup ? "actualizado" : "creado"} correctamente`
      );
      this.editingGroup = null;
    } catch (error) {
      console.error("Error al guardar grupo:", error);
      this.showError("Error al guardar el grupo");
    }
  }

  editGroup(groupId) {
    this.showGroupModal(groupId);
  }

  async deleteGroup(groupId) {
    const group = this.permisosData._user_groups.groups[groupId];
    const assignments = this.permisosData._user_groups.assignments || {};

    // Contar usuarios asignados
    const assignedUsers = Object.entries(assignments).filter(
      ([, assignedGroup]) => assignedGroup === groupId
    );

    let confirmMessage = `¿Estás seguro de que quieres eliminar el grupo "${group.name}"?`;
    if (assignedUsers.length > 0) {
      confirmMessage += `\n\nEsto afectará a ${assignedUsers.length} usuario(s) que serán movidos a "Sin Grupo".`;
    }

    if (!confirm(confirmMessage)) return;

    try {
      // Remover grupo
      delete this.permisosData._user_groups.groups[groupId];

      // Remover asignaciones
      Object.keys(assignments).forEach((username) => {
        if (assignments[username] === groupId) {
          delete assignments[username];
        }
      });

      await this.savePermisosData();

      this.renderGroupsList();
      this.populateGroupFilter();
      this.populateUserGroupSelect();

      // Limpiar detalles si era el grupo seleccionado
      if (this.selectedGroup === groupId) {
        document.getElementById("group-details").innerHTML = `
          <div class="empty-group-state">
            <h4>Selecciona un grupo para editar</h4>
            <p>Elige un grupo de la lista para ver y modificar sus usuarios.</p>
          </div>
        `;
        this.selectedGroup = null;
      }

      this.showSuccess("Grupo eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar grupo:", error);
      this.showError("Error al eliminar el grupo");
    }
  }

  async removeUserFromGroup(username) {
    if (!confirm(`¿Remover a ${username} del grupo?`)) return;

    try {
      if (this.permisosData._user_groups.assignments) {
        delete this.permisosData._user_groups.assignments[username];
      }

      await this.savePermisosData();

      if (this.selectedGroup) {
        this.renderGroupDetails(this.selectedGroup);
      }
      this.renderGroupsList();

      this.showSuccess(`Usuario ${username} removido del grupo`);
    } catch (error) {
      console.error("Error al remover usuario del grupo:", error);
      this.showError("Error al remover usuario del grupo");
    }
  }

  populateUserGroupSelect() {
    const select = document.getElementById("user-group-select");
    if (!select) return;

    const groups = this.permisosData._user_groups.groups || {};

    select.innerHTML =
      '<option value="">Sin grupo asignado</option>' +
      Object.entries(groups)
        .map(
          ([groupId, group]) =>
            `<option value="${groupId}">${group.name}</option>`
        )
        .join("");
  }

  getUserGroup(username) {
    const assignments = this.permisosData._user_groups.assignments || {};
    return assignments[username] || null;
  }

  async assignUserToGroup(username, groupId) {
    try {
      if (!this.permisosData._user_groups.assignments) {
        this.permisosData._user_groups.assignments = {};
      }

      if (groupId) {
        this.permisosData._user_groups.assignments[username] = groupId;
      } else {
        delete this.permisosData._user_groups.assignments[username];
      }

      await this.savePermisosData();
    } catch (error) {
      console.error("Error al asignar usuario a grupo:", error);
      throw error;
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

  // Crear instancia global para acceso desde eventos onclick
  window.adminPanel = new AdminPanel();
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
