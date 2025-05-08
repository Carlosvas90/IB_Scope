// Utilidad para mostrar notificaciones tipo toast

/**
 * Muestra un toast en la interfaz.
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de mensaje: 'info', 'success', 'error', etc.
 */
export function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.className = "toast";
  toast.classList.add(`toast-${type}`);
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
