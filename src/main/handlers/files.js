const { ipcMain } = require("electron");
const fileSystemService = require("../services/fileSystem");

class FilesHandler {
  constructor() {
    console.log("[FilesHandler] Inicializando FilesHandler...");
    this.setupHandlers();
    console.log("[FilesHandler] FilesHandler inicializado correctamente");
  }

  setupHandlers() {
    ipcMain.handle("read-json", async (event, filePath) => {
      return fileSystemService.readJson(filePath);
    });

    ipcMain.handle("save-json", async (event, filePath, data) => {
      return fileSystemService.saveJson(filePath, data);
    });

    ipcMain.handle("export-to-csv", async (event, data) => {
      return await fileSystemService.exportToCsv(data);
    });

    ipcMain.handle("export-to-xlsx", async (event, opts) => {
      return fileSystemService.exportToXlsx(opts);
    });

    ipcMain.handle("read-xlsx", async (event, filePath) => {
      return fileSystemService.readXlsx(filePath);
    });

    // Handler específico para leer archivos desde userData (rutas absolutas)
    ipcMain.handle("read-file-absolute", async (event, filePath) => {
      console.log("[FilesHandler] read-file-absolute llamado con:", filePath);
      return fileSystemService.readFileAbsolute(filePath);
    });
    
    console.log("[FilesHandler] ✅ Handlers registrados correctamente, incluyendo read-file-absolute");
  }
}

module.exports = new FilesHandler();
