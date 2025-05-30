const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { execSync, spawn } = require("child_process");

let mainWindow;
let updateConfig = {};

// Parsear argumentos
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error("Uso: updater.exe <exe-actual> <exe-nuevo> <exe-temporal>");
  app.quit();
}

const [targetExe, newExe, tempExe] = args;
const logFile = path.join(path.dirname(tempExe), "updater.log");

// Función para escribir logs
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(logFile, logMessage);

  // Enviar al renderer si existe
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("log", message);
  }
}

// Función para actualizar progreso
function updateProgress(percent, status) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("progress", { percent, status });
  }
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
  try {
    updateProgress(0, "Iniciando actualización...");
    await sleep(1000);

    // Paso 1: Verificar archivos
    updateProgress(10, "Verificando archivos...");

    if (!fs.existsSync(newExe)) {
      throw new Error(`No se encontró el archivo de actualización: ${newExe}`);
    }

    if (!fs.existsSync(targetExe)) {
      throw new Error(`No se encontró el ejecutable actual: ${targetExe}`);
    }

    log("✓ Archivos verificados correctamente");
    await sleep(500);

    // Paso 2: Cerrar Inbound Scope
    updateProgress(20, "Cerrando Inbound Scope...");
    const processName = path.basename(targetExe);

    let attempts = 0;
    while (isProcessRunning(processName) && attempts < 10) {
      updateProgress(
        20 + attempts * 3,
        `Cerrando Inbound Scope (intento ${attempts + 1})...`
      );
      killProcess(processName);
      await sleep(2000);
      attempts++;
    }

    if (isProcessRunning(processName)) {
      throw new Error("No se pudo cerrar Inbound Scope");
    }

    log("✓ Inbound Scope cerrado");
    updateProgress(50, "Inbound Scope cerrado");
    await sleep(500);

    // Paso 3: Crear backup
    updateProgress(60, "Creando backup de seguridad...");
    const backupPath = `${targetExe}.backup`;

    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }

    fs.copyFileSync(targetExe, backupPath);
    log(`✓ Backup creado: ${backupPath}`);
    await sleep(500);

    // Paso 4: Eliminar ejecutable actual
    updateProgress(70, "Eliminando versión anterior...");

    try {
      fs.unlinkSync(targetExe);
      await sleep(1000);
    } catch (error) {
      await sleep(2000);
      fs.unlinkSync(targetExe);
    }

    log("✓ Versión anterior eliminada");

    // Paso 5: Copiar nueva versión
    updateProgress(80, "Instalando nueva versión...");
    fs.copyFileSync(newExe, targetExe);

    // Verificar
    if (!fs.existsSync(targetExe)) {
      throw new Error("La nueva versión no se instaló correctamente");
    }

    log("✓ Nueva versión instalada");
    await sleep(500);

    // Paso 6: Limpiar
    updateProgress(90, "Limpiando archivos temporales...");

    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }

    if (fs.existsSync(newExe)) {
      fs.unlinkSync(newExe);
    }

    updateProgress(100, "¡Actualización completada!");
    log("✓ Actualización completada exitosamente");

    // Marcar como exitoso
    fs.writeFileSync(
      path.join(path.dirname(tempExe), "update-success.flag"),
      "success"
    );

    // Esperar antes de reiniciar
    await sleep(2000);

    // Reiniciar Inbound Scope
    const child = spawn(targetExe, [], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    // Cerrar updater
    setTimeout(() => {
      app.quit();
    }, 1000);
  } catch (error) {
    log(`ERROR: ${error.message}`);
    updateProgress(0, `Error: ${error.message}`);

    // Intentar restaurar backup
    const backupPath = `${targetExe}.backup`;
    if (fs.existsSync(backupPath)) {
      try {
        if (fs.existsSync(targetExe)) {
          fs.unlinkSync(targetExe);
        }
        fs.copyFileSync(backupPath, targetExe);
        fs.unlinkSync(backupPath);
        log("✓ Backup restaurado");

        // Reiniciar con versión anterior
        const child = spawn(targetExe, [], {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
      } catch (restoreError) {
        log(`Error al restaurar: ${restoreError.message}`);
      }
    }

    // Marcar como error
    fs.writeFileSync(
      path.join(path.dirname(tempExe), "update-error.flag"),
      error.message
    );

    // Cerrar después de mostrar error
    setTimeout(() => {
      app.quit();
    }, 5000);
  }
}

// Crear ventana principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 350,
    frame: false,
    resizable: false,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Cargar HTML inline
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Actualizador - Inbound Scope</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            height: 100vh;
            display: flex;
            flex-direction: column;
            user-select: none;
        }
        
        .header {
            padding: 20px;
            text-align: center;
            background: rgba(0, 0, 0, 0.2);
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: 300;
            margin-bottom: 5px;
        }
        
        .header p {
            font-size: 14px;
            opacity: 0.8;
        }
        
        .content {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 40px;
        }
        
        .progress-container {
            width: 100%;
            max-width: 400px;
            margin-bottom: 30px;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: white;
            border-radius: 4px;
            transition: width 0.3s ease;
            width: 0%;
        }
        
        .status {
            text-align: center;
            font-size: 16px;
            margin-bottom: 20px;
        }
        
        .log-container {
            width: 100%;
            max-width: 400px;
            height: 100px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            padding: 10px;
            overflow-y: auto;
            font-family: 'Consolas', monospace;
            font-size: 12px;
            line-height: 1.4;
        }
        
        .log-entry {
            margin-bottom: 4px;
            opacity: 0.8;
        }
        
        .success {
            color: #4ade80;
        }
        
        .error {
            color: #f87171;
        }
        
        .warning {
            color: #fbbf24;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Actualizando Inbound Scope</h1>
        <p>Por favor, no cierre esta ventana</p>
    </div>
    
    <div class="content">
        <div class="progress-container">
            <div class="progress-bar">
                <div class="progress-fill" id="progress"></div>
            </div>
        </div>
        
        <div class="status" id="status">Preparando actualización...</div>
        
        <div class="log-container" id="log"></div>
    </div>
    
    <script>
        const { ipcRenderer } = require('electron');
        
        const progressBar = document.getElementById('progress');
        const statusText = document.getElementById('status');
        const logContainer = document.getElementById('log');
        
        ipcRenderer.on('progress', (event, data) => {
            progressBar.style.width = data.percent + '%';
            statusText.textContent = data.status;
        });
        
        ipcRenderer.on('log', (event, message) => {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            
            if (message.includes('✓')) {
                entry.classList.add('success');
            } else if (message.includes('ERROR') || message.includes('✗')) {
                entry.classList.add('error');
            } else if (message.includes('⚠')) {
                entry.classList.add('warning');
            }
            
            entry.textContent = message;
            logContainer.appendChild(entry);
            logContainer.scrollTop = logContainer.scrollHeight;
        });
    </script>
</body>
</html>
    `;

  mainWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
  );

  // Iniciar actualización cuando la ventana esté lista
  mainWindow.webContents.on("did-finish-load", () => {
    setTimeout(() => {
      performUpdate();
    }, 1000);
  });
}

// Eventos de Electron
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
