/**
 * Constantes de Eventos para Pizarra
 * Define todos los eventos que puede emitir/escuchar la aplicación
 */

export const PIZARRA_EVENTS = {
  // Eventos de Asignaciones
  ASIGNACION_CREADA: "pizarra:asignacion:creada",
  ASIGNACION_REMOVIDA: "pizarra:asignacion:removida",
  ASIGNACION_ACTUALIZADA: "pizarra:asignacion:actualizada",
  
  // Eventos de Puestos
  PUESTO_SELECCIONADO: "pizarra:puesto:seleccionado",
  PUESTO_CREADO: "pizarra:puesto:creado",
  PUESTO_ACTUALIZADO: "pizarra:puesto:actualizado",
  
  // Eventos de Usuarios
  USUARIO_ESCANEADO: "pizarra:usuario:escaneado",
  USUARIO_DUPLICADO: "pizarra:usuario:duplicado",
  USUARIO_CAMBIO_PUESTO: "pizarra:usuario:cambio_puesto",
  
  // Eventos de Skill Matrix
  SKILL_VERIFICADO: "pizarra:skill:verificado",
  SKILL_ACTUALIZADO: "pizarra:skill:actualizado",
  SKILL_ALERTA: "pizarra:skill:alerta",
  
  // Eventos de Pizarra (Estado General)
  PIZARRA_ACTUALIZADA: "pizarra:actualizada",
  PIZARRA_CARGADA: "pizarra:cargada",
  PIZARRA_RESETEADA: "pizarra:reseteada",
  
  // Eventos de UI
  DASHBOARD_ACTUALIZADO: "pizarra:dashboard:actualizado",
  MODAL_ABIERTO: "pizarra:modal:abierto",
  MODAL_CERRADO: "pizarra:modal:cerrado",
  TOAST_MOSTRADO: "pizarra:toast:mostrado",
  
  // Eventos de Datos
  DATOS_CARGADOS: "pizarra:datos:cargados",
  DATOS_GUARDADOS: "pizarra:datos:guardados",
  DATOS_ERROR: "pizarra:datos:error",
  
  // Eventos de Roster
  ROSTER_DESCARGANDO: "pizarra:roster:descargando",
  ROSTER_DESCARGADO: "pizarra:roster:descargado",
  ROSTER_ERROR: "pizarra:roster:error",
  
  // Eventos de Sincronización (para WebSocket futuro)
  SINCRONIZACION_REQUERIDA: "pizarra:sincronizacion:requerida",
  SINCRONIZACION_COMPLETA: "pizarra:sincronizacion:completa",
  CONFLICTO_DETECTADO: "pizarra:conflicto:detectado",
};

/**
 * Tipos de payload para cada evento
 * Ayuda a documentar qué datos se esperan en cada evento
 */
export const EVENT_PAYLOADS = {
  [PIZARRA_EVENTS.ASIGNACION_CREADA]: {
    asignacion: "object", // { usuario_login, puesto_id, puesto_nombre, ... }
    timestamp: "string",
  },
  [PIZARRA_EVENTS.ASIGNACION_REMOVIDA]: {
    usuario_login: "string",
    puesto_id: "string",
    timestamp: "string",
  },
  [PIZARRA_EVENTS.PUESTO_SELECCIONADO]: {
    puesto: "object", // { id, nombre, departamento_principal, ... }
  },
  [PIZARRA_EVENTS.PUESTO_CREADO]: {
    puesto: "object",
    timestamp: "string",
  },
  [PIZARRA_EVENTS.USUARIO_ESCANEADO]: {
    login: "string",
    puesto_id: "string",
  },
  [PIZARRA_EVENTS.SKILL_VERIFICADO]: {
    usuario_login: "string",
    puesto_id: "string",
    tiene_formacion: "boolean",
  },
  [PIZARRA_EVENTS.PIZARRA_ACTUALIZADA]: {
    asignaciones: "array",
    total: "number",
    timestamp: "string",
  },
};

