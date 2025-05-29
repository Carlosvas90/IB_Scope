/**
 * Update Manager - Sistema de actualizaciones automáticas
 * Maneja las notificaciones y el proceso de actualización de la aplicación
 */

class UpdateManager {
  constructor() {
    this.notification = null;
    this.updateInfo = null;
    this.isDownloading = false;
    this.init();
  }

  init() {
    console.log("[UpdateManager] Inicializando sistema de actualizaciones...");

    // Escuchar notificaciones de actualizaciones disponibles
    if (window.api && window.api.onUpdateAvailable) {
      window.api.onUpdateAvailable((updateInfo) => {
        console.log("[UpdateManager] Actualización disponible:", updateInfo);
        this.showUpdateNotification(updateInfo);
      });
    }

    // Verificar updates al cargar la página (para testing)
    setTimeout(() => {
      console.log("[UpdateManager] Verificando actualizaciones manualmente...");
      this.checkForUpdatesManually();
    }, 3000);
  }

  showUpdateNotification(updateInfo) {
    this.updateInfo = updateInfo;
    const isMandatory = updateInfo.mandatory === true;

    // Crear el HTML de la notificación
    const notificationHTML = `
      <div class="update-notification ${
        isMandatory ? "mandatory" : ""
      }" id="updateNotification">
        <div class="update-notification-header">
          <div class="update-notification-icon">
            <svg viewBox="0 0 24 24">
              <path d="${
                isMandatory
                  ? "M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.11,7 14,7.9 14,9C14,10.11 13.11,11 12,11C10.9,11 10,10.11 10,9C10,7.9 10.9,7 12,7M15,21H9V19H15V21Z"
                  : "M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"
              }" />
            </svg>
          </div>
          <div class="update-notification-title">
            <h3>${
              isMandatory
                ? "⚠️ Actualización Obligatoria"
                : "¡Nueva versión disponible!"
            }</h3>
            <p>Versión ${updateInfo.version} ${
      isMandatory ? "debe instalarse" : "está lista para instalar"
    }</p>
          </div>
          ${
            !isMandatory
              ? `
          <button class="update-notification-close" onclick="updateManager.hideNotification()">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
          </button>
          `
              : ""
          }
        </div>
        
        <div class="update-notification-body">
          <div class="update-changelog">
            ${
              updateInfo.changelog ||
              (isMandatory
                ? "Actualización crítica que debe instalarse."
                : "Nueva versión con mejoras y correcciones de errores.")
            }
          </div>
          
          <div class="update-progress" id="updateProgress" ${
            isMandatory ? 'style="display: block;"' : ""
          }>
            <div class="update-progress-bar">
              <div class="update-progress-fill" id="progressFill"></div>
            </div>
            <div class="update-progress-text" id="progressText">${
              isMandatory
                ? "Iniciando descarga obligatoria..."
                : "Preparando descarga..."
            }</div>
          </div>
        </div>
        
        <div class="update-notification-actions">
          ${
            !isMandatory
              ? `
          <button class="update-btn update-btn-secondary" onclick="updateManager.hideNotification()">
            Más tarde
          </button>
          `
              : ""
          }
          <button class="update-btn update-btn-primary" id="updateButton" onclick="updateManager.startUpdate()" ${
            isMandatory ? 'style="width: 100%;"' : ""
          }>
            ${isMandatory ? "Instalando..." : "Actualizar ahora"}
          </button>
        </div>
      </div>
    `;

    // Insertar la notificación en el DOM
    document.body.insertAdjacentHTML("beforeend", notificationHTML);

    // Mostrar con animación
    setTimeout(() => {
      document.getElementById("updateNotification").classList.add("show");

      // Si es obligatorio, iniciar descarga automáticamente
      if (isMandatory) {
        setTimeout(() => {
          this.startUpdate();
        }, 1000);
      }
    }, 100);
  }

  hideNotification() {
    // No permitir cerrar si es actualización obligatoria
    if (this.updateInfo && this.updateInfo.mandatory === true) {
      console.log(
        "[UpdateManager] No se puede cerrar actualización obligatoria"
      );
      return;
    }

    const notification = document.getElementById("updateNotification");
    if (notification) {
      notification.classList.remove("show");
      setTimeout(() => {
        notification.remove();
      }, 300);
    }
  }

  async startUpdate() {
    if (this.isDownloading || !this.updateInfo) return;

    this.isDownloading = true;

    // Cambiar botón a estado de descarga
    const updateButton = document.getElementById("updateButton");
    const progressDiv = document.getElementById("updateProgress");
    const progressFill = document.getElementById("progressFill");
    const progressText = document.getElementById("progressText");

    updateButton.textContent = "Descargando...";
    updateButton.disabled = true;
    progressDiv.classList.add("show");

    try {
      // Simular progreso mientras descarga
      let progress = 0;
      const progressInterval = setInterval(() => {
        if (progress < 90) {
          progress += Math.random() * 15;
          progress = Math.min(progress, 90);
          progressFill.style.width = `${progress}%`;
          progressText.textContent = `Descargando... ${Math.round(progress)}%`;
        }
      }, 500);

      // Descargar actualización
      console.log("[UpdateManager] Iniciando descarga...");
      const result = await window.api.downloadUpdate(this.updateInfo);

      clearInterval(progressInterval);

      if (result.success) {
        progressFill.style.width = "100%";
        progressText.textContent = "Descarga completa";
        updateButton.textContent = "Instalar y reiniciar";
        updateButton.disabled = false;
        updateButton.onclick = () => this.installUpdate(result.localPath);
      } else {
        throw new Error(result.error || "Error en la descarga");
      }
    } catch (error) {
      console.error("[UpdateManager] Error descargando:", error);
      this.showError(
        "Error al descargar la actualización. Por favor, intenta más tarde."
      );
      updateButton.textContent = "Reintentar";
      updateButton.disabled = false;
      this.isDownloading = false;
    }
  }

  async installUpdate(localPath) {
    const updateButton = document.getElementById("updateButton");
    const progressText = document.getElementById("progressText");

    updateButton.textContent = "Instalando...";
    updateButton.disabled = true;
    progressText.textContent = "Instalando actualización...";

    try {
      console.log("[UpdateManager] Instalando actualización...");
      const result = await window.api.installUpdate(localPath);

      if (result.success) {
        progressText.textContent = "Instalación completa. Reiniciando...";

        // Mostrar mensaje de despedida
        setTimeout(() => {
          this.showSuccess(
            "La aplicación se reiniciará para completar la actualización."
          );
        }, 1000);
      } else {
        throw new Error(result.error || "Error en la instalación");
      }
    } catch (error) {
      console.error("[UpdateManager] Error instalando:", error);
      this.showError(
        "Error al instalar la actualización. Por favor, intenta más tarde."
      );
      updateButton.textContent = "Reintentar";
      updateButton.disabled = false;
    }
  }

  showError(message) {
    if (window.showToast) {
      window.showToast(message, "error");
    } else {
      alert(message);
    }
  }

  showSuccess(message) {
    if (window.showToast) {
      window.showToast(message, "success");
    } else {
      alert(message);
    }
  }

  // Método para verificación manual
  async checkForUpdatesManually() {
    if (window.api && window.api.checkForUpdates) {
      try {
        console.log(
          "[UpdateManager] Solicitando verificación manual de updates..."
        );
        const result = await window.api.checkForUpdates();
        console.log(
          "[UpdateManager] Resultado de verificación manual:",
          result
        );

        if (result.success && result.data && result.data.available) {
          this.showUpdateNotification(result.data);
        } else if (result.success && result.data && !result.data.available) {
          console.log("[UpdateManager] No hay actualizaciones disponibles");
        } else {
          console.log(
            "[UpdateManager] No se pudo verificar actualizaciones:",
            result
          );
        }
      } catch (error) {
        console.error(
          "[UpdateManager] Error verificando updates manualmente:",
          error
        );
      }
    }
  }
}

// Crear instancia global
window.updateManager = new UpdateManager();

// Exportar para módulos
export default UpdateManager;
