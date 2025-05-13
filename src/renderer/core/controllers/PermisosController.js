// PermisosController.js
// Controlador para bloquear acceso a apps sin permiso y mostrar mensaje

export class PermisosController {
  constructor() {
    this.init();
  }

  init() {
    // Delegación de eventos para el sidebar
    document.addEventListener("click", (e) => {
      const link = e.target.closest(".sidebar-nav a.app-locked");
      if (link) {
        e.preventDefault();
        e.stopPropagation();
        this.mostrarMensajeBloqueado(link);
      }
    });
  }

  mostrarMensajeBloqueado(link) {
    // Puedes personalizar el mensaje o usar un toast global
    if (window.showToast) {
      window.showToast("No tienes acceso a esta app.", "error");
    } else {
      alert("No tienes acceso a esta app.");
    }
  }
}
