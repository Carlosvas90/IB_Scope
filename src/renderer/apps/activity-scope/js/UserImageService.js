/**
 * UserImageService.js
 * Servicio para mostrar popups de imágenes de usuario en Activity Scope
 */

import { getUserPhotoUrl } from "../../../core/utils/linkUtils.js";

export class UserImageService {
  constructor() {
    this.activePopup = null;
    this.currentLogin = null;
    this.hideTimeout = null;
    this.showTimeout = null;
    this.isHoveringTable = false;
    this.currentCell = null;
  }

  /**
   * Configura los eventos para los popups de imagen
   * @param {HTMLElement} tableElement - Elemento de la tabla
   */
  setupPopupEvents(tableElement) {
    if (!tableElement) return;

    console.log(
      "✅ UserImageService: Configurando eventos para popups de imagen"
    );

    // Detectar cuando el mouse entra y sale de las celdas de login
    tableElement.addEventListener("mouseenter", (e) => {
      if (e.target.closest(".cell-login")) {
        this.isHoveringTable = true;
      }
    });

    tableElement.addEventListener("mouseleave", (e) => {
      if (!e.relatedTarget || !e.relatedTarget.closest(".cell-login")) {
        this.isHoveringTable = false;
        this.hideAllPopups();
      }
    });

    // Manejar evento mouseover para los logins
    tableElement.addEventListener("mouseover", (e) => {
      const loginCell = e.target.closest(".cell-login");
      if (loginCell) {
        this.isHoveringTable = true;
        const login = loginCell.textContent.trim();
        if (login !== this.currentLogin || loginCell !== this.currentCell) {
          this.cancelHidePopup();
          this.showUserImagePopup(loginCell);
        }
      }
    });

    // Manejar evento mouseout para los logins
    tableElement.addEventListener("mouseout", (e) => {
      const loginCell = e.target.closest(".cell-login");
      if (loginCell) {
        const nextTarget = e.relatedTarget;
        const nextLoginCell = nextTarget?.closest?.(".cell-login");

        if (!nextLoginCell) {
          this.isHoveringTable = false;
          this.hideAllPopups();
        }
      }
    });

    // Evento global para detectar clics fuera del popup
    document.addEventListener("click", (e) => {
      if (
        !e.target.closest(".cell-login") &&
        !e.target.closest(".user-image-popup")
      ) {
        this.hideAllPopups();
      }
    });
  }

  /**
   * Cancela el timeout de ocultación
   */
  cancelHidePopup() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  /**
   * Cancela el timeout de mostrar
   */
  cancelShowPopup() {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
  }

  /**
   * Muestra el popup de imagen de usuario
   * @param {HTMLElement} loginCell - Celda de login donde se hizo hover
   */
  showUserImagePopup(loginCell) {
    const login = loginCell.textContent.trim();

    if (!login) {
      console.warn("⚠️ No se encontró login en la celda");
      return;
    }

    this.currentLogin = login;
    this.currentCell = loginCell;

    // Cancelar timeout anterior
    this.cancelShowPopup();

    // Crear o mostrar popup con un pequeño delay
    this.showTimeout = setTimeout(() => {
      this.displayPopup(loginCell, login);
    }, 200); // 200ms de delay
  }

  /**
   * Muestra el popup en la posición correcta
   */
  displayPopup(loginCell, login) {
    // Buscar si ya existe un popup para este login
    let popup = document.querySelector(
      `.user-image-popup[data-login="${login}"]`
    );

    // Si no existe, crear uno nuevo
    if (!popup) {
      popup = this.createImagePopup(login);
      document.body.appendChild(popup);
    }

    // Posicionar el popup
    this.positionPopup(popup, loginCell);

    // Ocultar otros popups
    this.hideOtherPopups(login);

    // Mostrar el popup actual
    popup.classList.add("visible");
    this.activePopup = popup;
  }

  /**
   * Oculta todos los popups excepto el actual
   */
  hideOtherPopups(currentLogin) {
    const popups = document.querySelectorAll(".user-image-popup");
    popups.forEach((popup) => {
      const popupLogin = popup.dataset.login;
      if (popupLogin !== currentLogin) {
        popup.classList.remove("visible");
      }
    });
  }

  /**
   * Crea el elemento HTML del popup de imagen
   */
  createImagePopup(login) {
    const popup = document.createElement("div");
    popup.className = "user-image-popup";
    popup.dataset.login = login;
    popup.style.width = "120px";
    popup.style.height = "160px";
    popup.style.padding = "2px";

    const imageContainer = document.createElement("div");
    imageContainer.className = "user-image-container";
    imageContainer.style.width = "100%";
    imageContainer.style.height = "100%";
    imageContainer.style.padding = "0";
    imageContainer.style.margin = "0";

    // Crear elemento de imagen
    const image = document.createElement("img");
    image.className = "user-image";
    image.src = getUserPhotoUrl(login);
    image.alt = `Foto de ${login}`;
    image.style.width = "100%";
    image.style.height = "100%";
    image.style.objectFit = "cover";

    // Manejar error de carga de imagen
    image.onerror = () => {
      console.warn(`⚠️ No se pudo cargar la imagen para ${login}`);
      imageContainer.innerHTML = `
        <div style="
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 2rem;
          font-weight: bold;
        ">
          ${login.substring(0, 2).toUpperCase()}
        </div>
      `;
    };

    imageContainer.appendChild(image);
    popup.appendChild(imageContainer);

    return popup;
  }

  /**
   * Posiciona el popup cerca de la celda
   */
  positionPopup(popup, loginCell) {
    const rect = loginCell.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;

    const popupWidth = 120;
    const popupHeight = 160;
    const offset = 10;

    // Por defecto, mostrar a la derecha de la celda
    let left = rect.right + offset + scrollLeft;
    let top = rect.top + scrollTop;

    // Si no cabe a la derecha, mostrar a la izquierda
    if (left + popupWidth > window.innerWidth + scrollLeft) {
      left = rect.left - popupWidth - offset + scrollLeft;
    }

    // Ajustar verticalmente si se sale de la ventana
    if (top + popupHeight > window.innerHeight + scrollTop) {
      top = window.innerHeight + scrollTop - popupHeight - offset;
    }

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  /**
   * Oculta todos los popups
   */
  hideAllPopups() {
    const popups = document.querySelectorAll(".user-image-popup");
    popups.forEach((popup) => {
      popup.classList.remove("visible");
    });
    this.activePopup = null;
    this.currentLogin = null;
    this.currentCell = null;
  }

  /**
   * Limpia todos los popups del DOM
   */
  cleanup() {
    const popups = document.querySelectorAll(".user-image-popup");
    popups.forEach((popup) => popup.remove());
    this.cancelHidePopup();
    this.cancelShowPopup();
    this.activePopup = null;
    this.currentLogin = null;
    this.currentCell = null;
  }
}
