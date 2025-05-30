#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");

// Configuración del updater desde argumentos de línea de comandos
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error("Uso: updater.exe <exe-actual> <exe-nuevo> <exe-temporal>");
  process.exit(1);
}

const [targetExe, newExe, tempExe] = args;
const logFile = path.join(path.dirname(tempExe), "updater.log");

// Función para escribir logs
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(logFile, logMessage);
}

// Función para verificar si un proceso está ejecutándose
function isProcessRunning(processName) {
  try {
    const result = execSync(
      `tasklist /FI "IMAGENAME eq ${processName}" 2>NUL | find /I /N "${processName}"`,
      {
        encoding: "utf8",
        stdio: "pipe",
      }
    );
    return result.includes(processName);
  } catch (error) {
    return false;
  }
}

// Función para cerrar un proceso
function killProcess(processName) {
  try {
    execSync(`taskkill /F /IM "${processName}"`, { stdio: "pipe" });
    return true;
  } catch (error) {
    return false;
  }
}

// Función para esperar
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Función principal de actualización
async function performUpdate() {
  log("===========================================");
  log("INICIANDO PROCESO DE ACTUALIZACIÓN");
  log("===========================================");
  log(`Ejecutable objetivo: ${targetExe}`);
  log(`Nueva versión: ${newExe}`);
  log(`Ejecutable temporal: ${tempExe}`);

  try {
    // Paso 1: Verificar archivos
    log("\n[1/6] Verificando archivos...");

    if (!fs.existsSync(newExe)) {
      throw new Error(`No se encontró el archivo de actualización: ${newExe}`);
    }

    if (!fs.existsSync(targetExe)) {
      throw new Error(`No se encontró el ejecutable actual: ${targetExe}`);
    }

    log("✓ Archivos verificados correctamente");

    // Paso 2: Cerrar Inbound Scope si está ejecutándose
    log("\n[2/6] Cerrando Inbound Scope...");
    const processName = path.basename(targetExe);

    let attempts = 0;
    while (isProcessRunning(processName) && attempts < 10) {
      log(`Intento ${attempts + 1}: Cerrando ${processName}...`);
      killProcess(processName);
      await sleep(2000);
      attempts++;
    }

    if (isProcessRunning(processName)) {
      throw new Error("No se pudo cerrar Inbound Scope después de 10 intentos");
    }

    log("✓ Inbound Scope cerrado correctamente");

    // Paso 3: Crear backup
    log("\n[3/6] Creando backup...");
    const backupPath = `${targetExe}.backup`;

    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }

    fs.copyFileSync(targetExe, backupPath);
    log(`✓ Backup creado: ${backupPath}`);

    // Paso 4: Eliminar ejecutable actual
    log("\n[4/6] Eliminando versión anterior...");

    try {
      fs.unlinkSync(targetExe);
      await sleep(1000); // Dar tiempo al sistema
    } catch (error) {
      log(`⚠ Advertencia al eliminar: ${error.message}`);
      // Intentar de nuevo
      await sleep(2000);
      try {
        fs.unlinkSync(targetExe);
      } catch (retryError) {
        throw new Error(
          `No se pudo eliminar el ejecutable: ${retryError.message}`
        );
      }
    }

    log("✓ Versión anterior eliminada");

    // Paso 5: Copiar nueva versión
    log("\n[5/6] Instalando nueva versión...");
    fs.copyFileSync(newExe, targetExe);

    // Verificar que se copió correctamente
    if (!fs.existsSync(targetExe)) {
      throw new Error("La nueva versión no se instaló correctamente");
    }

    const originalSize = fs.statSync(newExe).size;
    const copiedSize = fs.statSync(targetExe).size;

    if (originalSize !== copiedSize) {
      throw new Error("El tamaño del archivo copiado no coincide");
    }

    log("✓ Nueva versión instalada correctamente");

    // Paso 6: Limpiar archivos temporales
    log("\n[6/6] Limpiando archivos temporales...");

    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
      log("✓ Backup eliminado");
    }

    if (fs.existsSync(newExe)) {
      fs.unlinkSync(newExe);
      log("✓ Archivo temporal eliminado");
    }

    log("\n===========================================");
    log("ACTUALIZACIÓN COMPLETADA EXITOSAMENTE");
    log("===========================================");

    // Reiniciar Inbound Scope
    log("\nReiniciando Inbound Scope...");
    const child = spawn(targetExe, [], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    log("✓ Inbound Scope reiniciado");

    // Marcar como exitoso para que Inbound Scope sepa que debe cerrar el updater
    fs.writeFileSync(
      path.join(path.dirname(tempExe), "update-success.flag"),
      "success"
    );

    // Esperar un poco antes de cerrar
    await sleep(3000);

    process.exit(0);
  } catch (error) {
    log("\n===========================================");
    log("ERROR EN LA ACTUALIZACIÓN");
    log("===========================================");
    log(`Error: ${error.message}`);

    // Intentar restaurar el backup
    const backupPath = `${targetExe}.backup`;
    if (fs.existsSync(backupPath)) {
      log("\nIntentando restaurar desde backup...");
      try {
        if (fs.existsSync(targetExe)) {
          fs.unlinkSync(targetExe);
        }
        fs.copyFileSync(backupPath, targetExe);
        fs.unlinkSync(backupPath);
        log("✓ Backup restaurado correctamente");

        // Reiniciar con la versión anterior
        const child = spawn(targetExe, [], {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
      } catch (restoreError) {
        log(`✗ Error al restaurar backup: ${restoreError.message}`);
      }
    }

    // Marcar como error
    fs.writeFileSync(
      path.join(path.dirname(tempExe), "update-error.flag"),
      error.message
    );

    await sleep(5000);
    process.exit(1);
  }
}

// Iniciar actualización
performUpdate();
