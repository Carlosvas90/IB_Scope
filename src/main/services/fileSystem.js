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
      // Generar fecha en formato YYYY-MM-DD
      const today = new Date();
      const dateString =
        today.getFullYear() +
        "-" +
        String(today.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(today.getDate()).padStart(2, "0");

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: "Exportar a CSV",
        defaultPath: `Inventory_Health_${dateString}.csv`,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });

      if (canceled) {
        return { success: false, error: "Operación cancelada por el usuario" };
      }

      // Guardar archivo con BOM UTF-8 para compatibilidad con Excel y caracteres especiales
      // El BOM (\ufeff) asegura que Excel interprete correctamente los acentos y ñ
      const bomUtf8 = "\ufeff";
      const csvWithBom = bomUtf8 + data;

      fs.writeFileSync(filePath, csvWithBom, "utf-8");
      console.log(`CSV guardado con codificación UTF-8 + BOM en: ${filePath}`);
      return { success: true, filePath };
    } catch (error) {
      console.error("Error al exportar a CSV:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new FileSystemService();
