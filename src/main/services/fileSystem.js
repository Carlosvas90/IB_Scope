const fs = require("fs");
const path = require("path");
const { dialog, app } = require("electron");

class FileSystemService {
  readJson(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf-8");
        return { success: true, data: JSON.parse(data) };
      } else {
        return { success: false, error: "Archivo no encontrado" };
      }
    } catch (error) {
      console.error("Error al leer el archivo:", error);
      return { success: false, error: error.message };
    }
  }

  saveJson(filePath, data) {
    try {
      // Asegurar que el directorio existe
      const directory = path.dirname(filePath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      const jsonString = JSON.stringify(data, null, 2);
      fs.writeFileSync(filePath, jsonString, "utf-8");
      return { success: true };
    } catch (error) {
      console.error("Error al guardar el archivo:", error);
      return { success: false, error: error.message };
    }
  }

  async exportToCsv(data) {
    try {
      // Mostrar diálogo para guardar archivo
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: "Exportar a CSV",
        defaultPath: `errores_${new Date()
          .toISOString()
          .replace(/:/g, "-")}.csv`,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });

      if (canceled) {
        return { success: false, error: "Operación cancelada por el usuario" };
      }

      // Guardar archivo
      fs.writeFileSync(filePath, data, "utf-8");
      return { success: true, filePath };
    } catch (error) {
      console.error("Error al exportar a CSV:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new FileSystemService();
