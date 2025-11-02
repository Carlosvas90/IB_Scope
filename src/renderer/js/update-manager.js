/**
 * Update Manager - Sistema de actualizaciones automáticas
 * Maneja las notificaciones y el proceso de actualización de la aplicación
 */

console.log("[UpdateManager] Cargando módulo update-manager.js");

class UpdateManager {
  constructor() {
    console.log("[UpdateManager] Creando instancia de UpdateManager");
    this.notification = null;
    this.updateInfo = null;
    this.isDownloading = false;
    this.isInstalling = false;
    this.init();
  }

  init() {
    console.log("[UpdateManager] Inicializando sistema de actualizaciones...");

    // Escuchar notificaciones de actualizaciones
    if (window.api && window.api.onUpdateAvailable) {
      window.api.onUpdateAvailable((updateInfo) => {
        console.log("[UpdateManager] Update disponible:", updateInfo);
        this.showUpdateNotification(updateInfo);
      });
    }

    // Escuchar progreso de descarga
    if (window.api && window.api.onUpdateDownloadProgress) {
      window.api.onUpdateDownloadProgress((progress) => {
        const progressFill = document.getElementById("progressFill");
        const progressText = document.getElementById("progressText");

        if (progressFill && progressText) {
          progressFill.style.width = `${progress}%`;
          progressText.textContent = `Descargando actualización... ${progress}%`;
        }
      });
    }

    // Verificar updates manualmente (opcional)
    // this.checkForUpdates(); // COMENTADO - este método no existe
  }

  showUpdateNotification(updateInfo) {
    this.updateInfo = updateInfo;
    const isMandatory = updateInfo.mandatory === true;

    // Crear el HTML de la notificación (mismo estilo visual para ambos)
    const notificationHTML = `
      <div class="update-notification ${
        isMandatory ? "mandatory" : ""
      }" id="updateNotification">
        <div class="update-notification-header">
          <div class="update-notification-icon">
            <svg viewBox="0 0 24 24">
              <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
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
          <button class="update-notification-close" id="closeUpdateBtn">
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
          
          <div class="update-progress ${isMandatory ? "show" : ""}" id="updateProgress">
            <div class="update-progress-bar">
              <div class="update-progress-fill" id="progressFill"></div>
            </div>
            <div class="update-progress-text" id="progressText">${
              isMandatory
                ? "Iniciando descarga automática..."
                : "Preparando descarga..."
            }</div>
          </div>

          <div class="update-restart-info" id="updateRestartInfo" style="display: none;">
            <div style="background: rgba(102, 126, 234, 0.1); border: 1px solid rgba(102, 126, 234, 0.3); border-radius: 8px; padding: 15px; margin-top: 15px;">
              <p style="margin: 0 0 10px 0; font-weight: 600; color: #667eea;">
                ⚠️ Información importante:
              </p>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                <li>La aplicación se cerrará automáticamente</li>
                <li>Se reiniciará con la nueva versión en unos segundos</li>
                <li>Por favor, guarde su trabajo antes de continuar</li>
                <li><strong>No cierre la aplicación manualmente durante el proceso</strong></li>
              </ul>
            </div>
          </div>
        </div>
        
        ${!isMandatory ? `
        <div class="update-notification-actions">
          <button class="update-btn update-btn-secondary" id="laterUpdateBtn">
            Más tarde
          </button>
          <button class="update-btn update-btn-primary" id="updateButton">
            Actualizar ahora
          </button>
        </div>
        ` : ""}
      </div>
    `;

    // Insertar la notificación en el DOM
    document.body.insertAdjacentHTML("beforeend", notificationHTML);

    // Mostrar con animación
    setTimeout(() => {
      document.getElementById("updateNotification").classList.add("show");

      // Agregar event listeners después de insertar el HTML
      if (!isMandatory) {
        this.attachEventListeners();
      }

      // Si es obligatorio, iniciar descarga automáticamente
      if (isMandatory) {
        // Mostrar información de reinicio inmediatamente
        const restartInfo = document.getElementById("updateRestartInfo");
        if (restartInfo) {
          restartInfo.style.display = "block";
        }
        
        setTimeout(() => {
          this.startUpdate();
        }, 1000);
      }
    }, 100);
  }

  attachEventListeners() {
    // Botón de cerrar
    const closeBtn = document.getElementById("closeUpdateBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        console.log("[UpdateManager] Click en botón cerrar");
        this.hideNotification();
      });
    }

    // Botón de más tarde
    const laterBtn = document.getElementById("laterUpdateBtn");
    if (laterBtn) {
      laterBtn.addEventListener("click", () => {
        console.log("[UpdateManager] Click en botón más tarde");
        this.hideNotification();
      });
    }

    // Botón de actualizar
    const updateBtn = document.getElementById("updateButton");
    if (updateBtn) {
      updateBtn.addEventListener("click", () => {
        console.log("[UpdateManager] Click en botón actualizar");
        this.startUpdate();
      });
    }
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
    if (this.isDownloading || this.isInstalling) return;

    const updateButton = document.getElementById("updateButton");
    const isMandatory = this.updateInfo && this.updateInfo.mandatory === true;

    if (updateButton) {
      updateButton.disabled = true;
      updateButton.textContent = "Descargando...";
    }

    const progressElement = document.getElementById("updateProgress");
    const progressFill = document.getElementById("progressFill");
    const progressText = document.getElementById("progressText");
    const restartInfo = document.getElementById("updateRestartInfo");

    if (progressElement) {
      progressElement.classList.add("show");
    }

    try {
      this.isDownloading = true;

      // Mostrar información de reinicio
      if (restartInfo) restartInfo.style.display = "block";

      // Descargar update con callback de progreso
      if (progressText) progressText.textContent = "Descargando actualización...";
      if (progressFill) progressFill.style.width = "0%";

      const result = await window.api.downloadUpdate(this.updateInfo);

      if (result.success) {
        if (progressFill) progressFill.style.width = "100%";
        if (progressText) {
          progressText.textContent =
            "Descarga completa. Preparando instalación...";
        }

        if (updateButton) {
          updateButton.textContent = "Instalando...";
          updateButton.onclick = null;
        }

        // Esperar un momento para que el usuario vea el mensaje
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Cambiar el mensaje para la instalación
        if (progressText) {
          progressText.textContent =
            "Instalando actualización. La aplicación se reiniciará automáticamente...";
        }

        // Agregar un mensaje más prominente
        const notificationBody = document.querySelector(".update-notification-body");
        if (notificationBody) {
          const warningDiv = document.createElement("div");
          warningDiv.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
            text-align: center;
            font-weight: 600;
            animation: pulse 1.5s infinite;
          `;
          warningDiv.innerHTML = `
            <p style="margin: 0;">⏳ NO CIERRE LA APLICACIÓN</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Se reiniciará automáticamente en unos segundos...</p>
          `;
          notificationBody.appendChild(warningDiv);
        }

        // Instalar update
        await this.installUpdate(result.localPath);
      } else {
        throw new Error(result.error || "Error al descargar");
      }
    } catch (error) {
      console.error("[UpdateManager] Error en actualización:", error);
      this.showError("Error al actualizar: " + error.message);

      if (updateButton) {
        updateButton.disabled = false;
        updateButton.textContent = "Reintentar";
      }
      if (progressText) progressText.textContent = "Error en la actualización";
      if (progressFill) progressFill.style.width = "0%";
    } finally {
      this.isDownloading = false;
    }
  }

  async installUpdate(localPath) {
    try {
      this.isInstalling = true;
      console.log("[UpdateManager] Instalando actualización desde:", localPath);

      const result = await window.api.installUpdate(localPath);

      if (result.success) {
        console.log("[UpdateManager] Instalación iniciada exitosamente");
        // La aplicación se cerrará automáticamente
      } else {
        throw new Error(result.error || "Error al instalar");
      }
    } catch (error) {
      console.error("[UpdateManager] Error instalando:", error);
      throw error;
    } finally {
      this.isInstalling = false;
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
console.log("[UpdateManager] Creando instancia global window.updateManager");
window.updateManager = new UpdateManager();
console.log("[UpdateManager] Instancia creada:", window.updateManager);

// Exportar para módulos - COMENTADO porque ya se crea instancia global
// export default UpdateManager;
