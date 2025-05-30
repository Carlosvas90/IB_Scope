// Script de prueba para el sistema de actualización
console.log("[TestUpdate] Script de prueba cargado");

// Simular una notificación de actualización después de 2 segundos
setTimeout(() => {
  console.log("[TestUpdate] Simulando notificación de actualización...");

  if (window.updateManager) {
    console.log(
      "[TestUpdate] UpdateManager encontrado, mostrando notificación"
    );

    // Simular info de actualización con ruta real
    const fakeUpdateInfo = {
      available: true,
      version: "1.0.7",
      filename: "Inbound Scope v1.0.7.exe",
      changelog:
        "✨ Versión de prueba:\n• Corregido sistema de actualización\n• Mejorados los event listeners\n• Agregados más logs de depuración",
      // Usar una de las rutas reales configuradas
      downloadPath:
        "C:\\Users\\carlo\\Downloads\\0-Proyecto_IB_Scope\\Analisis\\updates\\Inbound Scope v1.0.7.exe",
      sourcePath:
        "C:\\Users\\carlo\\Downloads\\0-Proyecto_IB_Scope\\Analisis\\updates\\",
      mandatory: false,
    };

    // Sobrescribir temporalmente el método startUpdate para evitar descarga real
    const originalStartUpdate = window.updateManager.startUpdate;
    window.updateManager.startUpdate = function () {
      console.log("[TestUpdate] Simulando proceso de actualización...");
      console.log(
        "[TestUpdate] En un caso real, aquí se descargaría e instalaría la actualización"
      );

      // Simular UI de progreso
      const updateButton = document.getElementById("updateButton");
      const progressElement = document.getElementById("updateProgress");
      const progressFill = document.getElementById("progressFill");
      const progressText = document.getElementById("progressText");
      const restartInfo = document.getElementById("updateRestartInfo");

      if (updateButton) {
        updateButton.disabled = true;
        updateButton.textContent = "Descargando...";
      }

      if (progressElement) {
        progressElement.classList.add("show");
        restartInfo.style.display = "block";
      }

      // Simular progreso
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressText)
          progressText.textContent = `Descargando actualización... ${progress}%`;

        if (progress >= 100) {
          clearInterval(interval);
          if (progressText)
            progressText.textContent = "Descarga completa (simulada)";
          if (updateButton) updateButton.textContent = "Instalación simulada";
          console.log(
            "[TestUpdate] Simulación completada. En producción, la app se cerraría y reiniciaría."
          );
        }
      }, 200);
    };

    window.updateManager.showUpdateNotification(fakeUpdateInfo);
  } else {
    console.error("[TestUpdate] UpdateManager NO encontrado");
  }
}, 2000);
