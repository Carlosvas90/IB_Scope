/**
 * User History Controller
 * Maneja la lógica de análisis histórico de usuarios
 */

class UserHistoryController {
  constructor() {
    this.data = {
      users: [],
      summary: {
        period: "Últimos 30 días",
        analyzedUsers: 0,
        totalStows: 0,
        dailyAverage: 0,
      },
      charts: {
        performanceTrends: null,
        dailyActivity: null,
        efficiencyDistribution: null,
      },
      pagination: {
        currentPage: 1,
        totalPages: 1,
        itemsPerPage: 10,
      },
    };

    this.init();
  }

  /**
   * Inicializa el controlador
   */
  init() {
    console.log("🚀 Inicializando UserHistoryController...");
    this.setupEventListeners();
    this.loadData();
  }

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    // Botón de actualizar historial
    const refreshBtn = document.getElementById("refresh-history");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.refreshData());
    }

    // Botón de exportar
    const exportBtn = document.getElementById("export-history");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportData());
    }

    // Botón de aplicar filtros
    const applyFiltersBtn = document.getElementById("apply-filters");
    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener("click", () => this.applyFilters());
    }

    // Paginación
    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => this.previousPage());
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => this.nextPage());
    }

    // Modal
    const closeModalBtn = document.getElementById("close-modal");
    if (closeModalBtn) {
      closeModalBtn.addEventListener("click", () => this.closeModal());
    }
  }

  /**
   * Carga los datos iniciales
   */
  async loadData() {
    console.log("📊 Cargando datos de User History...");

    try {
      // Simular carga de datos
      await this.simulateDataLoad();
      this.updateUI();
      console.log("✅ Datos cargados correctamente");
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
    }
  }

  /**
   * Simula la carga de datos (placeholder)
   */
  async simulateDataLoad() {
    // Simular delay de red
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Datos simulados
    this.data.summary = {
      period: "Últimos 30 días",
      analyzedUsers: 45,
      totalStows: 28450,
      dailyAverage: 948,
    };

    this.data.users = [
      {
        id: 1,
        name: "Juan Pérez",
        login: "jperez",
        shift: "day",
        stows: 1250,
        rate: 15.2,
        efficiency: 92,
        hours: 8.2,
        date: "2024-01-15",
      },
      {
        id: 2,
        name: "María García",
        login: "mgarcia",
        shift: "night",
        stows: 1180,
        rate: 14.1,
        efficiency: 88,
        hours: 8.4,
        date: "2024-01-15",
      },
      {
        id: 3,
        name: "Carlos López",
        login: "clopez",
        shift: "day",
        stows: 1350,
        rate: 16.8,
        efficiency: 95,
        hours: 8.0,
        date: "2024-01-15",
      },
      {
        id: 4,
        name: "Ana Martínez",
        login: "amartinez",
        shift: "night",
        stows: 980,
        rate: 12.3,
        efficiency: 85,
        hours: 8.0,
        date: "2024-01-14",
      },
      {
        id: 5,
        name: "Luis Rodríguez",
        login: "lrodriguez",
        shift: "day",
        stows: 1420,
        rate: 17.8,
        efficiency: 97,
        hours: 8.0,
        date: "2024-01-14",
      },
    ];
  }

  /**
   * Actualiza la interfaz de usuario
   */
  updateUI() {
    this.updateSummary();
    this.updateCharts();
    this.updateTable();
    this.updatePagination();
  }

  /**
   * Actualiza el resumen del período
   */
  updateSummary() {
    const { period, analyzedUsers, totalStows, dailyAverage } =
      this.data.summary;

    const periodEl = document.getElementById("selected-period");
    const usersEl = document.getElementById("analyzed-users");
    const stowsEl = document.getElementById("total-period-stows");
    const averageEl = document.getElementById("daily-average");

    if (periodEl) periodEl.textContent = period;
    if (usersEl) usersEl.textContent = analyzedUsers;
    if (stowsEl) stowsEl.textContent = totalStows.toLocaleString();
    if (averageEl) averageEl.textContent = dailyAverage.toLocaleString();
  }

  /**
   * Actualiza los gráficos
   */
  updateCharts() {
    // Placeholder para gráficos
    console.log("📈 Actualizando gráficos de historial...");
  }

  /**
   * Actualiza la tabla de historial
   */
  updateTable() {
    const tbody = document.querySelector("#history-table tbody");
    const tableInfo = document.getElementById("table-info");

    if (!tbody) return;

    tbody.innerHTML = "";

    this.data.users.forEach((user) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${user.date}</td>
        <td>${user.name}</td>
        <td>${user.login}</td>
        <td><span class="badge badge-${user.shift}">${
        user.shift === "day" ? "Día" : "Noche"
      }</span></td>
        <td>${user.stows}</td>
        <td>${user.rate}</td>
        <td><span class="efficiency ${this.getEfficiencyClass(
          user.efficiency
        )}">${user.efficiency}%</span></td>
        <td>${user.hours}h</td>
        <td>
          <button class="user-history-btn user-history-btn-secondary" onclick="userHistoryController.showUserDetails(${
            user.id
          })">
            Ver Detalles
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });

    if (tableInfo) {
      tableInfo.textContent = `Mostrando ${this.data.users.length} registros`;
    }
  }

  /**
   * Actualiza la paginación
   */
  updatePagination() {
    const pageInfo = document.getElementById("page-info");
    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");

    if (pageInfo) {
      pageInfo.textContent = `Página ${this.data.pagination.currentPage} de ${this.data.pagination.totalPages}`;
    }

    if (prevBtn) {
      prevBtn.disabled = this.data.pagination.currentPage === 1;
    }

    if (nextBtn) {
      nextBtn.disabled =
        this.data.pagination.currentPage === this.data.pagination.totalPages;
    }
  }

  /**
   * Obtiene la clase CSS para la eficiencia
   */
  getEfficiencyClass(efficiency) {
    if (efficiency >= 90) return "high";
    if (efficiency >= 70) return "medium";
    return "low";
  }

  /**
   * Aplica los filtros
   */
  applyFilters() {
    console.log("🔍 Aplicando filtros de historial...");
    // Lógica de filtrado aquí
  }

  /**
   * Página anterior
   */
  previousPage() {
    if (this.data.pagination.currentPage > 1) {
      this.data.pagination.currentPage--;
      this.loadData();
    }
  }

  /**
   * Página siguiente
   */
  nextPage() {
    if (this.data.pagination.currentPage < this.data.pagination.totalPages) {
      this.data.pagination.currentPage++;
      this.loadData();
    }
  }

  /**
   * Muestra los detalles de un usuario
   */
  showUserDetails(userId) {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) return;

    const modal = document.getElementById("user-detail-modal");
    const userName = document.getElementById("modal-user-name");
    const userContent = document.getElementById("user-detail-content");

    if (userName) userName.textContent = `Detalles de ${user.name}`;
    if (userContent) {
      userContent.innerHTML = `
        <div class="user-details">
          <h4>Información del Usuario</h4>
          <p><strong>Login:</strong> ${user.login}</p>
          <p><strong>Turno:</strong> ${
            user.shift === "day" ? "Día" : "Noche"
          }</p>
          <p><strong>Fecha:</strong> ${user.date}</p>
          <p><strong>Stows:</strong> ${user.stows}</p>
          <p><strong>Rate/Hora:</strong> ${user.rate}</p>
          <p><strong>Eficiencia:</strong> ${user.efficiency}%</p>
          <p><strong>Horas Trabajadas:</strong> ${user.hours}h</p>
        </div>
      `;
    }

    if (modal) modal.style.display = "flex";
  }

  /**
   * Cierra el modal
   */
  closeModal() {
    const modal = document.getElementById("user-detail-modal");
    if (modal) modal.style.display = "none";
  }

  /**
   * Refresca los datos
   */
  async refreshData() {
    console.log("🔄 Refrescando datos de historial...");
    await this.loadData();
  }

  /**
   * Exporta los datos
   */
  exportData() {
    console.log("📊 Exportando datos de historial...");
    // Lógica de exportación aquí
  }
}

// Variable global para acceso desde HTML
let userHistoryController;

// Inicializar cuando se carga la página
document.addEventListener("DOMContentLoaded", () => {
  userHistoryController = new UserHistoryController();
});
