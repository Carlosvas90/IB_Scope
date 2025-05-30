const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

console.log("Compilando updater...\n");

// Verificar si tenemos pkg instalado
exec("pkg --version", (error) => {
  if (error) {
    console.error(
      "❌ pkg no está instalado. Instálalo con: npm install -g pkg"
    );
    console.log(
      "\nAlternativa: El sistema usará un updater de emergencia en batch."
    );
    return;
  }

  // Compilar el updater simple (sin GUI)
  const updaterPath = path.join(__dirname, "updater.js");
  const outputPath = path.join(__dirname, "updater.exe");

  console.log("📦 Compilando updater.js...");

  const pkgCommand = `pkg "${updaterPath}" --targets node18-win-x64 --output "${outputPath}"`;

  exec(pkgCommand, (error, stdout, stderr) => {
    if (error) {
      console.error("❌ Error compilando:", error.message);
      if (stderr) console.error(stderr);
      return;
    }

    if (stdout) console.log(stdout);

    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`\n✅ Updater compilado exitosamente!`);
      console.log(`📁 Ubicación: ${outputPath}`);
      console.log(`📏 Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      // Copiar a la carpeta resources si existe
      const resourcesPath = path.join(__dirname, "../../resources/updater");
      if (!fs.existsSync(resourcesPath)) {
        fs.mkdirSync(resourcesPath, { recursive: true });
      }

      const destPath = path.join(resourcesPath, "updater.exe");
      fs.copyFileSync(outputPath, destPath);
      console.log(`📋 Copiado a: ${destPath}`);

      console.log(
        "\n🎯 El updater está listo para ser incluido en la aplicación."
      );
    } else {
      console.error("❌ No se generó el archivo updater.exe");
    }
  });
});

// Instrucciones alternativas
console.log("\n📝 Instrucciones para compilar manualmente:");
console.log("1. Instala pkg globalmente: npm install -g pkg");
console.log("2. Ejecuta: node src/updater/build-updater.js");
console.log("\n🔧 Para compilar el updater con GUI (Electron):");
console.log("1. Crea un proyecto Electron separado con updater-gui.js");
console.log("2. Usa electron-builder para empaquetarlo");
console.log(
  "\n💡 El sistema incluye un updater de emergencia en batch si no existe el .exe"
);
