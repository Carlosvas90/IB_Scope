// scripts/download-python.js
// Script para descargar Python portable durante el build

const https = require("https");
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const { execSync } = require("child_process");

const PYTHON_VERSION = "3.11.9";
const PYTHON_URL = `https://www.python.org/ftp/python/${PYTHON_VERSION}/python-${PYTHON_VERSION}-embed-amd64.zip`;
const GET_PIP_URL = "https://bootstrap.pypa.io/get-pip.py";

const RESOURCES_DIR = path.join(__dirname, "..", "resources");
const PYTHON_DIR = path.join(RESOURCES_DIR, "python-portable");
const PYTHON_ZIP = path.join(PYTHON_DIR, "python.zip");
const PYTHON_EXE = path.join(PYTHON_DIR, "python.exe");

/**
 * Descarga un archivo con barra de progreso
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Descargando: ${url}`);
    
    const file = fs.createWriteStream(destPath);
    
    https.get(url, (response) => {
      const totalSize = parseInt(response.headers["content-length"], 10);
      let downloadedSize = 0;
      
      response.on("data", (chunk) => {
        downloadedSize += chunk.length;
        const progress = ((downloadedSize / totalSize) * 100).toFixed(1);
        process.stdout.write(`\r   Progreso: ${progress}% (${(downloadedSize / 1024 / 1024).toFixed(1)} MB / ${(totalSize / 1024 / 1024).toFixed(1)} MB)`);
      });
      
      response.pipe(file);
      
      file.on("finish", () => {
        file.close();
        console.log("\n✅ Descarga completada");
        resolve();
      });
    }).on("error", (err) => {
      fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

/**
 * Instala un paquete de Python usando pip
 */
function installPackage(packageName) {
  console.log(`📦 Instalando ${packageName}...`);
  try {
    execSync(`"${PYTHON_EXE}" -m pip install ${packageName} --no-warn-script-location`, {
      stdio: "inherit",
    });
    console.log(`✅ ${packageName} instalado`);
  } catch (error) {
    console.error(`❌ Error instalando ${packageName}:`, error.message);
    throw error;
  }
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log("🐍 Preparando Python Portable para IB_Scope\n");
    
    // Crear directorio si no existe
    if (!fs.existsSync(PYTHON_DIR)) {
      console.log("📁 Creando directorio resources/python-portable...");
      fs.mkdirSync(PYTHON_DIR, { recursive: true });
    }

    // Verificar si Python ya existe
    if (fs.existsSync(PYTHON_EXE)) {
      console.log("✅ Python portable ya está instalado");
      console.log("   Para reinstalar, elimina la carpeta resources/python-portable\n");
      return;
    }

    // Paso 1: Descargar Python embeddable
    console.log("\n1️⃣ Descargando Python embeddable...");
    await downloadFile(PYTHON_URL, PYTHON_ZIP);

    // Paso 2: Extraer ZIP
    console.log("\n2️⃣ Extrayendo Python...");
    const zip = new AdmZip(PYTHON_ZIP);
    zip.extractAllTo(PYTHON_DIR, true);
    fs.unlinkSync(PYTHON_ZIP);
    console.log("✅ Python extraído");

    // Paso 3: Configurar _pth para habilitar site-packages
    console.log("\n3️⃣ Configurando Python...");
    const pthFile = path.join(PYTHON_DIR, "python311._pth");
    if (fs.existsSync(pthFile)) {
      let pthContent = fs.readFileSync(pthFile, "utf8");
      if (!pthContent.includes("Lib\\site-packages")) {
        pthContent += "\nLib\\site-packages\n";
        fs.writeFileSync(pthFile, pthContent);
        console.log("✅ Configuración actualizada para soportar site-packages");
      }
    }

    // Paso 4: Descargar e instalar pip
    console.log("\n4️⃣ Instalando pip...");
    const getPipPath = path.join(PYTHON_DIR, "get-pip.py");
    await downloadFile(GET_PIP_URL, getPipPath);
    
    execSync(`"${PYTHON_EXE}" "${getPipPath}" --no-warn-script-location`, {
      stdio: "inherit",
    });
    fs.unlinkSync(getPipPath);
    console.log("✅ pip instalado");

    // Paso 5: Instalar dependencias
    console.log("\n5️⃣ Instalando dependencias de Python...");
    const dependencies = [
      "pandas>=2.0.0",
      "beautifulsoup4>=4.12.0",
      "requests>=2.31.0",
      "requests-kerberos>=0.14.0",
      "lxml>=4.9.0",
    ];

    for (const dep of dependencies) {
      installPackage(dep);
    }

    // Paso 6: Crear archivo requirements.txt para referencia
    console.log("\n6️⃣ Creando requirements.txt...");
    const requirementsPath = path.join(PYTHON_DIR, "requirements.txt");
    fs.writeFileSync(requirementsPath, dependencies.join("\n"));
    console.log("✅ requirements.txt creado");

    // Paso 7: Verificar instalación
    console.log("\n7️⃣ Verificando instalación...");
    console.log("   Verificando pandas...");
    execSync(`"${PYTHON_EXE}" -c "import pandas; print('pandas', pandas.__version__)"`, { stdio: "inherit" });
    
    console.log("   Verificando beautifulsoup4...");
    execSync(`"${PYTHON_EXE}" -c "import bs4; print('beautifulsoup4', bs4.__version__)"`, { stdio: "inherit" });
    
    console.log("   Verificando requests...");
    execSync(`"${PYTHON_EXE}" -c "import requests; print('requests', requests.__version__)"`, { stdio: "inherit" });

    // Resumen final
    const stats = getDirSize(PYTHON_DIR);
    console.log("\n" + "=".repeat(60));
    console.log("✅ Python Portable instalado correctamente!");
    console.log("=".repeat(60));
    console.log(`📍 Ubicación: ${PYTHON_DIR}`);
    console.log(`📊 Tamaño total: ${(stats / 1024 / 1024).toFixed(1)} MB`);
    console.log(`🐍 Versión: Python ${PYTHON_VERSION}`);
    console.log("📦 Dependencias instaladas:");
    dependencies.forEach(dep => console.log(`   - ${dep}`));
    console.log("=".repeat(60));

  } catch (error) {
    console.error("\n❌ Error durante la instalación:", error.message);
    process.exit(1);
  }
}

/**
 * Calcula el tamaño de un directorio
 */
function getDirSize(dirPath) {
  let size = 0;
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      size += getDirSize(filePath);
    } else {
      size += stats.size;
    }
  });
  
  return size;
}

// Ejecutar
main();

