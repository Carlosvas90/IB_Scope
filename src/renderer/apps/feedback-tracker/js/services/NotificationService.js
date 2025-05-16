export class NotificationService {
  constructor() {
    this.listeners = [];
    console.log("NotificationService: Instancia creada.");
  }

  subscribe(callback) {
    if (typeof callback === "function" && !this.listeners.includes(callback)) {
      this.listeners.push(callback);
      console.log(
        "NotificationService: Nuevo listener suscrito.",
        callback.name || "anónimo"
      );
    } else if (this.listeners.includes(callback)) {
      console.warn("NotificationService: El listener ya está suscrito.");
    } else {
      console.error(
        "NotificationService: Se intentó suscribir un callback no válido."
      );
    }
  }

  unsubscribe(callback) {
    const index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
      console.log(
        "NotificationService: Listener dado de baja.",
        callback.name || "anónimo"
      );
    } else {
      console.warn(
        "NotificationService: Se intentó dar de baja un listener no registrado."
      );
    }
  }

  /**
   * Notifica a los listeners locales y envía un mensaje IPC.
   * @param {object} eventData - Datos del evento a notificar.
   * Espera un objeto con propiedades como: count, timestamp, fromCache, etc.
   * El formato exacto dependerá de lo que DataService envíe.
   */
  notify(eventData) {
    if (!eventData) {
      console.warn(
        "NotificationService.notify: Se intentó notificar sin eventData."
      );
      return;
    }

    console.log("NotificationService.notify: Notificando evento...", eventData);

    // Notificar a través de ipcRenderer si está disponible
    if (window.ipcRenderer) {
      // Asumimos un nombre de canal genérico, o podríamos hacerlo configurable.
      // Por ahora, usamos el mismo que DataService usaba.
      window.ipcRenderer.send("data:updated", eventData);
      console.log(
        "NotificationService: Evento enviado vía ipcRenderer ('data:updated')."
      );
    } else {
      console.warn(
        "NotificationService: window.ipcRenderer no disponible. No se envió evento IPC."
      );
    }

    // Notificar a los listeners locales registrados
    // DataService pasaba (this.errors, this.lastUpdateTime) a los callbacks.
    // Para mantener la compatibilidad sin cambiar las firmas de los listeners existentes en la UI,
    // necesitamos asegurar que pasamos los argumentos esperados.
    // eventData debería contener 'errors' y 'lastUpdateTime' si queremos mantener esa firma.
    // O bien, los listeners deberían adaptarse para recibir el objeto eventData completo.
    // Por ahora, asumimos que eventData contiene lo necesario o que los listeners se adaptarán.
    // DataService.notifyDataUpdated pasaba (this.errors, this.lastUpdateTime) a los callbacks internos.
    // Y para IPC, pasaba { count, timestamp, fromCache }.
    // Vamos a hacer que notify espere los mismos argumentos que los callbacks internos esperan
    // y construya el objeto para IPC a partir de ellos.

    const { errors, timestamp, fromCache } = eventData; // Desestructuramos lo que DataService usará

    if (typeof errors === "undefined" || typeof timestamp === "undefined") {
      console.warn(
        "NotificationService.notify: 'errors' o 'timestamp' no definidos en eventData. Los listeners locales pueden no funcionar como se espera."
      );
    }

    this.listeners.forEach((callback) => {
      try {
        // Los listeners originales esperaban (errors, lastUpdateTime)
        // `timestamp` aquí es `lastUpdateTime`
        callback(errors, timestamp);
      } catch (error) {
        console.warn(
          "NotificationService: Error en listener de actualización:",
          error,
          callback.name || "anónimo"
        );
      }
    });
    console.log(
      `NotificationService: Notificado a ${this.listeners.length} listeners locales.`
    );
  }

  dispose() {
    this.listeners = [];
    console.log("NotificationService: Listeners limpiados (dispose).");
  }
}
