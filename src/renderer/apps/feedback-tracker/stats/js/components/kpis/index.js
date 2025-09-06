/**
 * index.js
 * Punto de entrada para todos los componentes KPI
 * Facilita la importación de múltiples componentes
 */

// Exportar todos los componentes KPI
export { TotalErrorsKPI } from "./TotalErrorsKPI.js";
export { PendingErrorsKPI } from "./PendingErrorsKPI.js";
export { ResolvedErrorsKPI } from "./ResolvedErrorsKPI.js";
export { KPIManager } from "./KPIManager.js";

// Exportación por defecto del gestor principal
import { KPIManager } from "./KPIManager.js";
export default KPIManager;
