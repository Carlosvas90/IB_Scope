#!/usr/bin/env node

/**
 * Script para verificar y corregir problemas de case-sensitivity en rutas
 * Ejecutar con: node fix-case-sensitivity.js
 */

const fs = require("fs");
const path = require("path");

// Rutas que deben estar estandarizadas
const STANDARD_PATHS = {
  "estadisticas.html": "Estadisticas.html",
  "estadisticas.css": "estadisticas.css",
  "estadisticas.js": "estadisticas.js",
};

// Archivos donde buscar referencias
const SEARCH_FILES = [
  "src/renderer/js/router.js",
  "src/renderer/js/app-loader.js",
  "src/renderer/views/Sidebar.html",
  "src/renderer/apps/feedback-tracker/estadisticas/README.md",
  "src/renderer/README-CONTEXTS-AND-PATHS.md",
];

function fixCaseSensitivity() {
  console.log("🔍 Verificando problemas de case-sensitivity...\n");

  let totalFixes = 0;

  SEARCH_FILES.forEach((filePath) => {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Archivo no encontrado: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, "utf8");
    let originalContent = content;
    let fileFixes = 0;

    // Buscar y reemplazar rutas incorrectas
    Object.entries(STANDARD_PATHS).forEach(([incorrect, correct]) => {
      const regex = new RegExp(incorrect.replace(".", "\\."), "gi");
      const matches = content.match(regex);

      if (matches) {
        content = content.replace(regex, correct);
        fileFixes += matches.length;
        console.log(
          `✅ ${filePath}: Corregido "${incorrect}" → "${correct}" (${matches.length} ocurrencias)`
        );
      }
    });

    // Escribir archivo si hubo cambios
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, "utf8");
      totalFixes += fileFixes;
    }
  });

  console.log(`\n🎯 Total de correcciones: ${totalFixes}`);

  if (totalFixes === 0) {
    console.log("✅ No se encontraron problemas de case-sensitivity");
  } else {
    console.log("✅ Problemas de case-sensitivity corregidos");
  }
}

// Verificar que los archivos estándar existan
function verifyStandardFiles() {
  console.log("🔍 Verificando archivos estándar...\n");

  const standardFiles = [
    "src/renderer/apps/feedback-tracker/estadisticas/views/Estadisticas.html",
    "src/renderer/apps/feedback-tracker/estadisticas/css/estadisticas.css",
    "src/renderer/apps/feedback-tracker/estadisticas/js/estadisticas.js",
  ];

  standardFiles.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${filePath}`);
    } else {
      console.log(`❌ ${filePath} - ARCHIVO NO ENCONTRADO`);
    }
  });
}

// Ejecutar verificaciones
console.log("🚀 Iniciando verificación de case-sensitivity...\n");
verifyStandardFiles();
console.log("");
fixCaseSensitivity();
console.log("\n🎉 Verificación completada");
