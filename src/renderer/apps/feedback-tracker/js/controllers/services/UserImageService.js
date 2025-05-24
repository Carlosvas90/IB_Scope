/**
 * UserImageService.js
 * Servicio para mostrar popups de imágenes de usuario
 * Ruta: /src/renderer/apps/feedback-tracker/js/controllers/services/UserImageService.js
 */

import { getUserPhotoUrl } from "../../../../../core/utils/linkUtils.js";

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

    // Detectar cuando el mouse entra y sale de las celdas de login específicamente
    tableElement.addEventListener("mouseenter", (e) => {
      if (e.target.closest(".login-cell")) {
        this.isHoveringTable = true;
      }
    });

    tableElement.addEventListener("mouseleave", (e) => {
      // Solo considerar salida si realmente salimos de una celda de login
      if (!e.relatedTarget || !e.relatedTarget.closest(".login-cell")) {
        this.isHoveringTable = false;
        this.scheduleHidePopup(200); // Dar tiempo para volver
      }
    });

    // Manejar evento mouseover para los logins con debounce
    tableElement.addEventListener("mouseover", (e) => {
      const loginCell = e.target.closest(".login-cell");
      if (loginCell) {
        this.isHoveringTable = true;
        const login = loginCell.textContent.trim();
        // Siempre mostrar popup si es una celda diferente, aunque el login sea igual
        if (login !== this.currentLogin || loginCell !== this.currentCell) {
          this.cancelHidePopup();
          this.showUserImagePopup(loginCell);
        }
      }
    });

    // Manejar mouseout con timing mejorado - solo para celdas de login
    tableElement.addEventListener("mouseout", (e) => {
      const loginCell = e.target.closest(".login-cell");
      if (loginCell) {
        const login = loginCell.textContent.trim();
        // Solo programar ocultar si salimos del login actual y no hay otro login en hover
        const nextTarget = e.relatedTarget;
        const nextLoginCell = nextTarget?.closest?.(".login-cell");

        if (!nextLoginCell) {
          this.isHoveringTable = false;
          this.scheduleHidePopup(150);
        }
      }
    });

    // Manejar eventos de los popups
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(".user-image-popup")) {
        this.cancelHidePopup();
      }
    });

    document.addEventListener("mouseout", (e) => {
      const popup = e.target.closest(".user-image-popup");
      if (popup && !e.relatedTarget?.closest?.(".user-image-popup")) {
        this.scheduleHidePopup(100);
      }
    });

    // Cerrar popups cuando se hace scroll en la tabla
    const tableContainer = document.querySelector(".table-container");
    if (tableContainer) {
      tableContainer.addEventListener("scroll", () => {
        this.hideAllPopups();
      });
    }

    // Cerrar popups cuando se hace clic fuera
    document.addEventListener("click", (e) => {
      if (
        !e.target.closest(".login-cell") &&
        !e.target.closest(".user-image-popup")
      ) {
        this.hideAllPopups();
      }
    });
  }

  /**
   * Programa ocultar el popup con delay
   * @param {number} delay - Delay en milisegundos
   */
  scheduleHidePopup(delay = 150) {
    this.cancelHidePopup();
    this.hideTimeout = setTimeout(() => {
      if (!this.isHoveringTable) {
        this.hideAllPopups();
      }
    }, delay);
  }

  /**
   * Cancela el timeout de ocultar popup
   */
  cancelHidePopup() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  /**
   * Cancela el timeout de mostrar popup
   */
  cancelShowPopup() {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
  }

  /**
   * Muestra el popup con la imagen del usuario
   * @param {HTMLElement} loginCell - Celda con el login
   */
  showUserImagePopup(loginCell) {
    const login = loginCell.textContent.trim();
    if (!login) return;

    this.cancelShowPopup();
    this.currentLogin = login;
    this.currentCell = loginCell; // Guardar referencia a la celda actual

    // Solo ocultar popups de otros usuarios, no todos
    this.hideOtherPopups(login);

    // Siempre crear un nuevo popup o reusar existente y reposicionar
    let popup = document.querySelector(
      `.user-image-popup[data-login="${login}"]`
    );

    // Si no existe, crear uno nuevo
    if (!popup) {
      popup = this.createImagePopup(login);
    }

    // Siempre reposicionar el popup para la celda actual
    this.positionPopup(popup, loginCell);

    // Hacer visible el popup con una transición suave
    this.showTimeout = setTimeout(() => {
      popup.classList.add("visible");
    }, 10); // Delay más corto para respuesta inmediata

    this.activePopup = popup;
  }

  /**
   * Oculta popups de otros usuarios manteniendo el actual
   * @param {string} currentLogin - Login del usuario actual
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
   * Crea un popup de imagen para un usuario (sin flecha para simplicidad)
   * @param {string} login - Login del usuario
   * @returns {HTMLElement} - Elemento DOM del popup
   */
  createImagePopup(login) {
    const popup = document.createElement("div");
    popup.className = "user-image-popup";
    popup.dataset.login = login;
    // Tamaño del popup más compacto
    popup.style.width = "120px";
    popup.style.height = "160px";
    popup.style.padding = "2px";
    popup.style.margin = "0";
    popup.style.backgroundColor = "white";
    popup.style.border = "1px solid #ddd";
    popup.style.borderRadius = "8px";
    popup.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    popup.style.position = "absolute";
    popup.style.zIndex = "1000";

    // Añadir contenedor de imagen
    const imageContainer = document.createElement("div");
    imageContainer.className = "user-image-container";
    imageContainer.style.width = "100%";
    imageContainer.style.height = "100%";
    imageContainer.style.padding = "0";
    imageContainer.style.margin = "0";

    // Añadir imagen
    const image = document.createElement("img");
    image.className = "user-image";
    image.src = getUserPhotoUrl(login);
    image.alt = `Foto de ${login}`;
    image.style.width = "100%";
    image.style.height = "100%";
    image.style.objectFit = "cover";
    image.style.borderRadius = "6px";
    image.style.display = "block";

    // Manejar error de carga de imagen
    image.onerror = () => {
      image.src = "../../../assets/icons/user.svg";
      image.alt = "Usuario sin foto";
    };

    imageContainer.appendChild(image);
    popup.appendChild(imageContainer);

    // Añadir al DOM
    document.body.appendChild(popup);

    return popup;
  }

  /**
   * Posiciona un popup más cerca del login (sin flecha)
   * @param {HTMLElement} popup - Elemento del popup
   * @param {HTMLElement} loginCell - Celda de login
   */
  positionPopup(popup, loginCell) {
    const cellRect = loginCell.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Temporalmente hacemos el popup visible pero oculto para medir sus dimensiones
    popup.style.opacity = "0";
    popup.style.display = "block";
    popup.style.visibility = "hidden";
    popup.style.left = "0";
    const popupWidth = popup.offsetWidth;
    const popupHeight = popup.offsetHeight;

    // Calcular espacio disponible a la izquierda y derecha
    const spaceLeft = cellRect.left;
    const spaceRight = windowWidth - cellRect.right;

    // Posicionar verticalmente centrado con la celda
    const cellCenterY = cellRect.top + cellRect.height / 2;
    popup.style.top = `${cellCenterY - popupHeight / 2 + window.scrollY}px`;

    // Decidir si el popup va a la izquierda o derecha (más cerca)
    if (spaceLeft >= popupWidth || spaceLeft >= spaceRight) {
      // Posicionar a la izquierda (más cerca)
      popup.style.left = `${cellRect.left - popupWidth - 5}px`;
      popup.style.right = "auto";
    } else {
      // Posicionar a la derecha (más cerca)
      popup.style.left = `${cellRect.right + 5}px`;
      popup.style.right = "auto";
    }

    // Restaurar visibilidad
    popup.style.opacity = "";
    popup.style.display = "";
    popup.style.visibility = "";

    // Ajustar si se sale de los bordes
    setTimeout(() => {
      const popupRect = popup.getBoundingClientRect();

      // Ajustar si se sale por la derecha
      if (popupRect.right > windowWidth) {
        popup.style.left = `${windowWidth - popupRect.width - 10}px`;
      }

      // Ajustar si se sale por la izquierda
      if (popupRect.left < 0) {
        popup.style.left = "10px";
      }

      // Ajustar si se sale por arriba
      if (popupRect.top < 0) {
        popup.style.top = `${10 + window.scrollY}px`;
      }

      // Ajustar si se sale por abajo
      if (popupRect.bottom > windowHeight) {
        popup.style.top = `${
          windowHeight - popupRect.height - 10 + window.scrollY
        }px`;
      }
    }, 0);
  }

  /**
   * Oculta todos los popups de imágenes de usuario
   */
  hideAllPopups() {
    this.cancelHidePopup();
    this.cancelShowPopup();
    const popups = document.querySelectorAll(".user-image-popup");
    popups.forEach((popup) => {
      popup.classList.remove("visible");
    });
    this.activePopup = null;
    this.currentLogin = null;
    this.currentCell = null; // Limpiar referencia de celda
  }
}
