const { ipcMain } = require("electron");
const fileSystemService = require("../services/fileSystem");

class FilesHandler {
  constructor() {
    this.setupHandlers();
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
  }
}

module.exports = new FilesHandler();
