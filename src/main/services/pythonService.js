// src/main/services/pythonService.js
// Servicio para gestionar Python portable en la aplicación

const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const { spawn, execSync } = require("child_process");
const AdmZip = require("adm-zip");

class PythonService {
  constructor() {
    this.pythonDir = null;
    this.pythonExecutable = null;
    this.pipExecutable = null;
  }

  /**
   * Inicializa las rutas de Python
   */
  initialize() {
    if (app.isPackaged) {
      // En producción, Python está en resources/python-portable
      this.pythonDir = path.join(process.resourcesPath, "python-portable");
    } else {
      // En desarrollo, Python está en resources/python-portable
      this.pythonDir = path.join(app.getAppPath(), "resources", "python-portable");
    }

    this.pythonExecutable = path.join(this.pythonDir, "python.exe");
    this.pipExecutable = path.join(this.pythonDir, "Scripts", "pip.exe");

    console.log("[PythonService] Rutas inicializadas:");
    console.log(`  Python dir: ${this.pythonDir}`);
    console.log(`  Python exe: ${this.pythonExecutable}`);
    console.log(`  Pip exe: ${this.pipExecutable}`);
  }

  /**
   * Obtiene el ejecutable de Python a usar
   * @returns {Promise<string>} Ruta al ejecutable de Python
   */
  async getPythonExecutable() {
    if (!this.pythonDir) {
      this.initialize();
    }

    // Verificar si existe Python portable
    if (fs.existsSync(this.pythonExecutable)) {
      console.log("[PythonService] Usando Python portable");
      return this.pythonExecutable;
    }

    // Fallback: intentar usar Python del sistema
    try {
      execSync("python --version", { stdio: "ignore" });
      console.log("[PythonService] Usando Python del sistema");
      return "python";
    } catch (error) {
      // Intentar python3
      try {
        execSync("python3 --version", { stdio: "ignore" });
        console.log("[PythonService] Usando python3 del sistema");
        return "python3";
      } catch (error2) {
        console.error("[PythonService] No se encontró Python");
        throw new Error("PYTHON_NOT_FOUND");
      }
    }
  }

  /**
   * Verifica si Python está disponible
   * @returns {Promise<Object>} Estado de Python
   */
  async checkPythonAvailable() {
    try {
      const pythonExe = await this.getPythonExecutable();
      
      // Verificar que puede ejecutarse
      return new Promise((resolve) => {
        const process = spawn(pythonExe, ["--version"]);
        
        let output = "";
        process.stdout.on("data", (data) => {
          output += data.toString();
        });
        
        process.stderr.on("data", (data) => {
          output += data.toString();
        });
        
        process.on("close", (code) => {
          if (code === 0) {
            resolve({
              available: true,
              portable: pythonExe === this.pythonExecutable,
              version: output.trim(),
              executable: pythonExe,
            });
          } else {
            resolve({
              available: false,
              error: "No se pudo ejecutar Python",
            });
          }
        });
        
        process.on("error", () => {
          resolve({
            available: false,
            error: "Python no encontrado",
          });
        });
      });
    } catch (error) {
      return {
        available: false,
        error: error.message,
        needsInstall: error.message === "PYTHON_NOT_FOUND",
      };
    }
  }

  /**
   * Descarga un archivo con progreso
   * @param {string} url - URL del archivo
   * @param {string} destPath - Ruta de destino
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<void>}
   */
  downloadFile(url, destPath, onProgress) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      
      https.get(url, (response) => {
        const totalSize = parseInt(response.headers["content-length"], 10);
        let downloadedSize = 0;
        
        response.on("data", (chunk) => {
          downloadedSize += chunk.length;
          if (onProgress) {
            const progress = (downloadedSize / totalSize) * 100;
            onProgress(progress, downloadedSize, totalSize);
          }
        });
        
        response.pipe(file);
        
        file.on("finish", () => {
          file.close();
          resolve();
        });
      }).on("error", (err) => {
        fs.unlinkSync(destPath);
        reject(err);
      });
    });
  }

  /**
   * Instala Python portable
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado de la instalación
   */
  async installPortablePython(onProgress) {
    try {
      if (!this.pythonDir) {
        this.initialize();
      }

      console.log("[PythonService] Iniciando instalación de Python portable");
      
      // Crear directorio si no existe
      if (!fs.existsSync(this.pythonDir)) {
        fs.mkdirSync(this.pythonDir, { recursive: true });
      }

      // URL de Python embeddable
      const pythonVersion = "3.11.9";
      const pythonUrl = `https://www.python.org/ftp/python/${pythonVersion}/python-${pythonVersion}-embed-amd64.zip`;
      const zipPath = path.join(this.pythonDir, "python.zip");

      // Descargar Python
      onProgress && onProgress({ stage: "downloading", progress: 0, message: "Descargando Python..." });
      await this.downloadFile(pythonUrl, zipPath, (progress) => {
        onProgress && onProgress({
          stage: "downloading",
          progress: progress,
          message: `Descargando Python... ${Math.round(progress)}%`,
        });
      });

      // Extraer ZIP
      onProgress && onProgress({ stage: "extracting", progress: 0, message: "Extrayendo archivos..." });
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(this.pythonDir, true);
      fs.unlinkSync(zipPath);

      // Configurar pth para habilitar site-packages
      const pthFile = path.join(this.pythonDir, `python311._pth`);
      if (fs.existsSync(pthFile)) {
        let pthContent = fs.readFileSync(pthFile, "utf8");
        if (!pthContent.includes("Lib\\site-packages")) {
          pthContent += "\nLib\\site-packages\n";
          fs.writeFileSync(pthFile, pthContent);
        }
      }

      // Descargar get-pip.py
      onProgress && onProgress({ stage: "pip", progress: 50, message: "Instalando pip..." });
      const getPipUrl = "https://bootstrap.pypa.io/get-pip.py";
      const getPipPath = path.join(this.pythonDir, "get-pip.py");
      await this.downloadFile(getPipUrl, getPipPath);

      // Instalar pip
      await new Promise((resolve, reject) => {
        const process = spawn(this.pythonExecutable, [getPipPath, "--no-warn-script-location"]);
        
        process.on("close", (code) => {
          if (code === 0) {
            fs.unlinkSync(getPipPath);
            resolve();
          } else {
            reject(new Error("Error instalando pip"));
          }
        });
        
        process.on("error", reject);
      });

      // Instalar dependencias
      onProgress && onProgress({ stage: "dependencies", progress: 75, message: "Instalando dependencias..." });
      await this.installDependencies(onProgress);

      onProgress && onProgress({ stage: "complete", progress: 100, message: "¡Instalación completada!" });

      return {
        success: true,
        message: "Python portable instalado correctamente",
        path: this.pythonDir,
      };
    } catch (error) {
      console.error("[PythonService] Error instalando Python:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Instala las dependencias de Python
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<void>}
   */
  async installDependencies(onProgress) {
    const dependencies = [
      "pandas>=2.0.0",
      "beautifulsoup4>=4.12.0",
      "requests>=2.31.0",
      "requests-kerberos>=0.14.0",
      "lxml>=4.9.0",
    ];

    const totalDeps = dependencies.length;
    
    for (let i = 0; i < dependencies.length; i++) {
      const dep = dependencies[i];
      const progress = 75 + ((i + 1) / totalDeps) * 20; // 75-95%
      
      onProgress && onProgress({
        stage: "dependencies",
        progress: progress,
        message: `Instalando ${dep.split(">=")[0]}...`,
      });

      await new Promise((resolve, reject) => {
        const process = spawn(this.pythonExecutable, [
          "-m",
          "pip",
          "install",
          dep,
          "--no-warn-script-location",
        ]);
        
        process.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Error instalando ${dep}`));
          }
        });
        
        process.on("error", reject);
      });
    }
  }

  /**
   * Verifica si las dependencias están instaladas
   * @returns {Promise<Object>} Estado de las dependencias
   */
  async checkDependencies() {
    try {
      const pythonExe = await this.getPythonExecutable();
      const deps = ["pandas", "bs4", "requests", "requests_kerberos", "lxml"];
      const missing = [];

      for (const dep of deps) {
        const checkCode = `import ${dep}`;
        try {
          execSync(`"${pythonExe}" -c "${checkCode}"`, { stdio: "ignore" });
        } catch {
          missing.push(dep);
        }
      }

      return {
        installed: missing.length === 0,
        missing: missing,
      };
    } catch (error) {
      return {
        installed: false,
        error: error.message,
      };
    }
  }
}

// Exportar instancia única
const pythonService = new PythonService();
module.exports = pythonService;

