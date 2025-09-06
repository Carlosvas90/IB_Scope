/**
 * EventTypes.js
 * Constantes para tipos de eventos del sistema
 */

// Eventos de Feedback Tracker
export const FEEDBACK_TRACKER_EVENTS = {
  // Eventos de errores individuales
  ERROR_CREATED: "feedback-tracker.error.created",
  ERROR_UPDATED: "feedback-tracker.error.updated",
  ERROR_DELETED: "feedback-tracker.error.deleted",
  ERROR_STATUS_CHANGED: "feedback-tracker.error.status_changed",

  // Eventos de datos masivos
  DATA_REFRESHED: "feedback-tracker.data.refreshed",
  DATA_LOADED: "feedback-tracker.data.loaded",
  DATA_SAVED: "feedback-tracker.data.saved",
  DATA_ERROR: "feedback-tracker.data.error",

  // Eventos de filtros y UI
  FILTER_CHANGED: "feedback-tracker.filter.changed",
  TABLE_UPDATED: "feedback-tracker.table.updated",

  // Eventos de exportación
  EXPORT_STARTED: "feedback-tracker.export.started",
  EXPORT_COMPLETED: "feedback-tracker.export.completed",
  EXPORT_ERROR: "feedback-tracker.export.error",
};

// Eventos de Inventory Stats
export const INVENTORY_STATS_EVENTS = {
  // Eventos de KPIs
  KPI_UPDATED: "inventory-stats.kpi.updated",
  KPI_ERROR: "inventory-stats.kpi.error",

  // Eventos de sincronización
  SYNC_STARTED: "inventory-stats.sync.started",
  SYNC_COMPLETED: "inventory-stats.sync.completed",
  SYNC_ERROR: "inventory-stats.sync.error",

  // Eventos de datos DPMO
  DPMO_LOADED: "inventory-stats.dpmo.loaded",
  DPMO_ERROR: "inventory-stats.dpmo.error",
};

// Eventos del sistema global
export const SYSTEM_EVENTS = {
  // Eventos de aplicaciones
  APP_LOADED: "system.app.loaded",
  APP_UNLOADED: "system.app.unloaded",
  APP_ERROR: "system.app.error",

  // Eventos de navegación
  NAVIGATION_CHANGED: "system.navigation.changed",

  // Eventos de configuración
  CONFIG_CHANGED: "system.config.changed",
  THEME_CHANGED: "system.theme.changed",
};

// Patrones de eventos para suscripciones
export const EVENT_PATTERNS = {
  // Todos los eventos de feedback-tracker
  ALL_FEEDBACK_TRACKER: "feedback-tracker.*",

  // Todos los eventos de errores
  ALL_ERROR_EVENTS: "feedback-tracker.error.*",

  // Todos los eventos de datos
  ALL_DATA_EVENTS: "feedback-tracker.data.*",

  // Todos los eventos de inventory-stats
  ALL_INVENTORY_STATS: "inventory-stats.*",

  // Todos los eventos del sistema
  ALL_SYSTEM_EVENTS: "system.*",

  // Todos los eventos
  ALL_EVENTS: "*",
};

// Prioridades de eventos
export const EVENT_PRIORITIES = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  CRITICAL: 3,
};

// Estados de errores
export const ERROR_STATES = {
  PENDING: "pending",
  DONE: "done",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

// Tipos de cambios de datos
export const DATA_CHANGE_TYPES = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  BULK_UPDATE: "bulk_update",
  REFRESH: "refresh",
};

export default {
  FEEDBACK_TRACKER_EVENTS,
  INVENTORY_STATS_EVENTS,
  SYSTEM_EVENTS,
  EVENT_PATTERNS,
  EVENT_PRIORITIES,
  ERROR_STATES,
  DATA_CHANGE_TYPES,
};
