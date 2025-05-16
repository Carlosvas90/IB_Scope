export class FileService {
  constructor() {
    // No se necesita estado en el constructor por ahora.
  }

  buildFilePath(basePath, fileName) {
    if (!basePath || !fileName) {
      const errorMsg =
        "FileService.buildFilePath: basePath y fileName son requeridos.";
      console.error(errorMsg);
      // Devolver null o undefined podría ser una opción, pero lanzar un error es más explícito
      // si se considera una condición que no debería ocurrir.
      // Sin embargo, para mantener consistencia con cómo se usa en DataService (que espera una ruta o nada),
      // podríamos no lanzar error aquí sino dejar que el consumidor maneje un posible undefined/null.
      // Por ahora, mantendremos el log y no lanzaremos error para evitar romper flujos que puedan tolerarlo.
      // No obstante, la lógica original de DataService.buildFilePath siempre devolvía una ruta.
      // Vamos a asegurar que siempre devuelva algo o lance explícitamente si faltan parámetros.
      // Reconsiderando: DataService.buildFilePath siempre tenía un basePath (this.currentDataPath o this.dataPaths[0]).
      // Si estos son undefined, entonces sí habría un problema.
      // El consumidor (DataService) debe asegurar que basePath es válido.
      // Si llega aquí como undefined, es un error de programación en el llamador.
      throw new Error(errorMsg);
    }
    // Asegurar que la ruta termina con barra de directorio correcta para el sistema operativo.
    // Electron se ejecuta en Node, que normaliza rutas. Usar path.join sería ideal si tuviéramos 'path' module.
    // Dado que estamos en el renderer y las rutas son para APIs del main process que probablemente usa Node 'path',
    // una simple concatenación con chequeo de separador debería ser suficiente.
    // window.api podría estar manejando la normalización de rutas también.
    // La implementación original usaba '\\'.
    const separator = "\\"; // Asumiendo Windows, como en el original. Podría ser '/' para más generalidad si el main process lo maneja.
    const normalizedPath = basePath.endsWith(separator)
      ? basePath
      : basePath + separator;
    return normalizedPath + fileName;
  }

  async readJson(filePath) {
    if (!filePath) {
      const errorMsg = "FileService.readJson: filePath es requerido.";
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    console.log(`FileService.readJson: Intentando leer archivo: ${filePath}`);
    try {
      // Asumimos que window.api.readJson devuelve un objeto con { success: boolean, data?: any, error?: string }
      const result = await window.api.readJson(filePath);
      if (result && result.success) {
        console.log(
          `FileService.readJson: Archivo leído con éxito desde ${filePath}.`
        );
      } else {
        console.warn(
          `FileService.readJson: Fallo al leer ${filePath}. Error: ${
            result ? result.error : "Desconocido"
          }`
        );
      }
      return result;
    } catch (error) {
      const errorMsg = `FileService.readJson: Excepción al leer archivo ${filePath}: ${error.message}`;
      console.error(errorMsg, error);
      return { success: false, error: errorMsg };
    }
  }

  async saveJson(filePath, data) {
    if (!filePath || typeof data === "undefined") {
      const errorMsg = "FileService.saveJson: filePath y data son requeridos.";
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    console.log(
      `FileService.saveJson: Intentando guardar archivo: ${filePath}`
    );
    try {
      // Asumimos que window.api.saveJson devuelve { success: boolean, error?: string }
      const result = await window.api.saveJson(filePath, data);
      if (result && result.success) {
        console.log(
          `FileService.saveJson: Archivo guardado con éxito en ${filePath}.`
        );
      } else {
        console.warn(
          `FileService.saveJson: Fallo al guardar ${filePath}. Error: ${
            result ? result.error : "Desconocido"
          }`
        );
      }
      return result;
    } catch (error) {
      const errorMsg = `FileService.saveJson: Excepción al guardar archivo ${filePath}: ${error.message}`;
      console.error(errorMsg, error);
      return { success: false, error: errorMsg };
    }
  }

  async exportToCsv(csvContent) {
    if (typeof csvContent !== "string") {
      const errorMsg =
        "FileService.exportToCsv: csvContent (string) es requerido.";
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    console.log(`FileService.exportToCsv: Intentando exportar contenido CSV.`);
    try {
      // Asumimos que window.api.exportToCsv devuelve { success: boolean, filePath?: string, error?: string }
      const result = await window.api.exportToCsv(csvContent);
      if (result && result.success) {
        console.log(
          `FileService.exportToCsv: CSV exportado con éxito a ${result.filePath}.`
        );
      } else {
        console.warn(
          `FileService.exportToCsv: Fallo al exportar CSV. Error: ${
            result ? result.error : "Desconocido"
          }`
        );
      }
      return result;
    } catch (error) {
      const errorMsg = `FileService.exportToCsv: Excepción al exportar a CSV: ${error.message}`;
      console.error(errorMsg, error);
      return { success: false, error: errorMsg };
    }
  }

  // Nuevos métodos
  async tryReadJsonFromPaths(orderedBasePaths, fileName) {
    if (!orderedBasePaths || !Array.isArray(orderedBasePaths) || !fileName) {
      const errorMsg =
        "FileService.tryReadJsonFromPaths: orderedBasePaths (array) y fileName son requeridos.";
      console.error(errorMsg);
      return { success: false, error: errorMsg, data: null };
    }
    if (orderedBasePaths.length === 0) {
      const errorMsg =
        "FileService.tryReadJsonFromPaths: orderedBasePaths está vacío, no hay rutas para intentar.";
      console.warn(errorMsg);
      return { success: false, error: errorMsg, data: null };
    }

    console.log(
      `FileService.tryReadJsonFromPaths: Intentando leer '${fileName}' desde ${orderedBasePaths.length} ruta(s).`
    );
    for (const basePath of orderedBasePaths) {
      if (!basePath) {
        console.warn(
          "FileService.tryReadJsonFromPaths: Se encontró una ruta base nula o undefined en orderedBasePaths, saltando."
        );
        continue;
      }
      try {
        const filePath = this.buildFilePath(basePath, fileName);
        console.log(
          `FileService.tryReadJsonFromPaths: Intentando ruta: ${filePath}`
        );
        const result = await this.readJson(filePath); // readJson ya maneja su propio try/catch y logging
        if (result && result.success) {
          console.log(
            `FileService.tryReadJsonFromPaths: Éxito al leer '${fileName}' desde ${filePath}.`
          );
          return { success: true, data: result.data, pathUsed: basePath };
        }
      } catch (error) {
        // Aunque readJson/buildFilePath pueden lanzar errores, el flujo principal aquí es manejar el resultado de readJson.
        // Los errores de buildFilePath (como basePath inválido) se propagarían y serían capturados aquí si readJson no los maneja.
        // Sin embargo, buildFilePath ahora lanza si basePath es nulo, lo que se maneja con el 'continue' de arriba.
        console.error(
          `FileService.tryReadJsonFromPaths: Excepción inesperada al procesar la ruta base '${basePath}' para '${fileName}'.`,
          error
        );
        // Continuar con la siguiente ruta
      }
    }

    const finalErrorMsg = `FileService.tryReadJsonFromPaths: No se pudo leer el archivo '${fileName}' desde ninguna de las rutas proporcionadas.`;
    console.warn(finalErrorMsg);
    return { success: false, error: finalErrorMsg, data: null };
  }

  async trySaveJsonToPaths(orderedBasePaths, fileName, dataToSave) {
    if (
      !orderedBasePaths ||
      !Array.isArray(orderedBasePaths) ||
      !fileName ||
      typeof dataToSave === "undefined"
    ) {
      const errorMsg =
        "FileService.trySaveJsonToPaths: orderedBasePaths (array), fileName y dataToSave son requeridos.";
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    if (orderedBasePaths.length === 0) {
      const errorMsg =
        "FileService.trySaveJsonToPaths: orderedBasePaths está vacío, no hay rutas para intentar.";
      console.warn(errorMsg);
      return { success: false, error: errorMsg };
    }

    console.log(
      `FileService.trySaveJsonToPaths: Intentando guardar '${fileName}' en ${orderedBasePaths.length} ruta(s).`
    );
    for (const basePath of orderedBasePaths) {
      if (!basePath) {
        console.warn(
          "FileService.trySaveJsonToPaths: Se encontró una ruta base nula o undefined en orderedBasePaths, saltando."
        );
        continue;
      }
      try {
        const filePath = this.buildFilePath(basePath, fileName);
        console.log(
          `FileService.trySaveJsonToPaths: Intentando ruta: ${filePath}`
        );
        const result = await this.saveJson(filePath, dataToSave); // saveJson ya maneja su propio try/catch y logging
        if (result && result.success) {
          console.log(
            `FileService.trySaveJsonToPaths: Éxito al guardar '${fileName}' en ${filePath}.`
          );
          return { success: true, pathUsed: basePath };
        }
      } catch (error) {
        console.error(
          `FileService.trySaveJsonToPaths: Excepción inesperada al procesar la ruta base '${basePath}' para '${fileName}'.`,
          error
        );
        // Continuar con la siguiente ruta
      }
    }

    const finalErrorMsg = `FileService.trySaveJsonToPaths: No se pudo guardar el archivo '${fileName}' en ninguna de las rutas proporcionadas.`;
    console.warn(finalErrorMsg);
    return { success: false, error: finalErrorMsg };
  }
}
