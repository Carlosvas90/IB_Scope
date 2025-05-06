/**
 * UserImageService.js
 * Servicio para mostrar popups de imágenes de usuario
 * Ruta: /src/renderer/apps/feedback-tracker/js/controllers/services/UserImageService.js
 */

export class UserImageService {
  constructor() {
    this.activePopup = null;
  }

  /**
   * Configura los eventos para los popups de imagen
   * @param {HTMLElement} tableElement - Elemento de la tabla
   */
  setupPopupEvents(tableElement) {
    if (!tableElement) return;

    // Manejar evento mouseover para los logins
    tableElement.addEventListener("mouseover", (e) => {
      const loginCell = e.target.closest(".login-cell");
      if (loginCell) {
        this.showUserImagePopup(loginCell);
      }
    });

    // Manejar mouseout
    tableElement.addEventListener("mouseout", (e) => {
      const loginCell = e.target.closest(".login-cell");
      const popup = e.target.closest(".user-image-popup");

      if (!popup && loginCell) {
        const relatedPopup = document.querySelector(
          `.user-image-popup[data-login="${loginCell.textContent.trim()}"]`
        );

        setTimeout(() => {
          if (
            relatedPopup &&
            !relatedPopup.matches(":hover") &&
            !loginCell.matches(":hover")
          ) {
            relatedPopup.classList.remove("visible");
          }
        }, 100);
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
   * Muestra el popup con la imagen del usuario
   * @param {HTMLElement} loginCell - Celda con el login
   */
  showUserImagePopup(loginCell) {
    const login = loginCell.textContent.trim();
    if (!login) return;

    // Ocultar todos los popups activos
    this.hideAllPopups();

    // Comprobar si ya existe un popup para este login
    let popup = document.querySelector(
      `.user-image-popup[data-login="${login}"]`
    );

    // Si no existe, crear uno nuevo
    if (!popup) {
      popup = this.createImagePopup(login);
    }

    // Posicionar el popup
    this.positionPopup(popup, loginCell);

    // Hacer visible el popup
    setTimeout(() => {
      popup.classList.add("visible");
    }, 50);

    this.activePopup = popup;
  }

  /**
   * Crea un popup de imagen para un usuario
   * @param {string} login - Login del usuario
   * @returns {HTMLElement} - Elemento DOM del popup
   */
  createImagePopup(login) {
    const popup = document.createElement("div");
    popup.className = "user-image-popup";
    popup.dataset.login = login;

    // Añadir flecha
    const arrow = document.createElement("div");
    arrow.className = "popup-arrow";
    popup.appendChild(arrow);

    // Añadir contenedor de imagen
    const imageContainer = document.createElement("div");
    imageContainer.className = "user-image-container";

    // Añadir imagen
    const image = document.createElement("img");
    image.className = "user-image";
    image.src = `https://internal-cdn.amazon.com/badgephotos.amazon.com/?uid=${login}`;
    image.alt = `Foto de ${login}`;

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
   * Posiciona un popup en relación a una celda
   * @param {HTMLElement} popup - Elemento del popup
   * @param {HTMLElement} loginCell - Celda de login
   */
  positionPopup(popup, loginCell) {
    const cellRect = loginCell.getBoundingClientRect();

    // Posicionar horizontalmente centrado bajo la celda
    popup.style.left = `${cellRect.left + cellRect.width / 2}px`;

    // Posicionar verticalmente bajo la celda
    popup.style.top = `${cellRect.bottom + window.scrollY + 10}px`;

    // Comprobar si el popup se sale de la ventana
    setTimeout(() => {
      const popupRect = popup.getBoundingClientRect();

      // Ajustar si se sale por la derecha
      if (popupRect.right > window.innerWidth) {
        popup.style.left = `${window.innerWidth - popupRect.width - 10}px`;
      }

      // Ajustar si se sale por la izquierda
      if (popupRect.left < 0) {
        popup.style.left = "10px";
      }
    }, 0);
  }

  /**
   * Oculta todos los popups de imágenes de usuario
   */
  hideAllPopups() {
    const popups = document.querySelectorAll(".user-image-popup");
    popups.forEach((popup) => {
      popup.classList.remove("visible");
    });
    this.activePopup = null;
  }
}
