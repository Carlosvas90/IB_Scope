/**
 * Activity Scope - Test de Bases de Datos
 * Versión simplificada para demostrar lectura de bases de datos
 */

console.log("🚀 Activity Scope - Test de BD iniciado");

// Función de inicialización global requerida por app-loader.js
window.initActivityScope = function() {
    console.log("✅ Activity Scope inicializado");
    return true;
};

// Exportar para uso global
window.ActivityScope = {
    init: window.initActivityScope
};

console.log("✅ Activity Scope cargado correctamente");
