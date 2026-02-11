const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const os = require("os");
const { dialog, app } = require("electron");
const XLSX = require("xlsx");

class FileSystemService {
  readJson(filePath) {
    try {
      // Verificar si existe el archivo .gz primero (versión comprimida)
      const gzPath = filePath.endsWith('.gz') ? filePath : `${filePath}.gz`;
      const regularPath = filePath.endsWith('.gz') ? filePath.replace('.gz', '') : filePath;
      
      // Intentar cargar versión comprimida primero (más eficiente)
      if (fs.existsSync(gzPath)) {
        const compressedData = fs.readFileSync(gzPath);
        const decompressedData = zlib.gunzipSync(compressedData);
        const jsonData = JSON.parse(decompressedData.toString("utf-8"));
        return { success: true, data: jsonData, compressed: true };
      }
      // Si no existe .gz, cargar JSON normal
      else if (fs.existsSync(regularPath)) {
        const data = fs.readFileSync(regularPath, "utf-8");
        return { success: true, data: JSON.parse(data), compressed: false };
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

  /**
   * Lee un archivo xlsx y devuelve las hojas con sus datos (array de filas).
   * @param {string} filePath - Ruta absoluta del archivo
   * @returns { { success: boolean, sheets?: { name: string, data: string[][] }[], error?: string } }
   */
  readXlsx(filePath) {
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        return { success: false, error: "Archivo no encontrado." };
      }
      const wb = XLSX.readFile(filePath);
      const sheets = [];
      wb.SheetNames.forEach((name) => {
        const ws = wb.Sheets[name];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        sheets.push({ name, data: data || [] });
      });
      return { success: true, sheets };
    } catch (error) {
      console.error("Error al leer XLSX:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Exporta un libro Excel con varias hojas.
   * @param {Object} opts - { filePath: string, sheets: [ { name: string, data: string[][] } ] }
   */
  exportToXlsx(opts) {
    try {
      const { filePath, sheets } = opts || {};
      if (!filePath || !Array.isArray(sheets) || sheets.length === 0) {
        return { success: false, error: "filePath y sheets (array con name y data) son requeridos." };
      }
      const wb = XLSX.utils.book_new();
      sheets.forEach((sh) => {
        const name = (sh.name || "Hoja").toString().slice(0, 31);
        const ws = XLSX.utils.aoa_to_sheet(sh.data || []);
        XLSX.utils.book_append_sheet(wb, ws, name);
      });
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      XLSX.writeFile(wb, filePath);
      return { success: true, filePath };
    } catch (error) {
      console.error("Error al exportar a XLSX:", error);
      return { success: false, error: error.message };
    }
  }

  readFileAbsolute(filePath) {
    try {
      // Normalizar la ruta para manejar correctamente los separadores
      const normalizedPath = path.normalize(filePath);
      
      // Verificar que la ruta es absoluta
      if (!path.isAbsolute(normalizedPath)) {
        return { success: false, error: `La ruta debe ser absoluta: ${filePath}` };
      }

      // Verificar que el archivo existe
      if (!fs.existsSync(normalizedPath)) {
        return { success: false, error: `Archivo no encontrado: ${normalizedPath}` };
      }

      // Leer el archivo
      const content = fs.readFileSync(normalizedPath, "utf-8");
      return { success: true, content };
    } catch (error) {
      console.error("Error al leer el archivo absoluto:", error);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // FUNCIONES PARA MANEJO DE COOKIES DE MIDWAY
  // ============================================

  /**
   * Obtiene la ruta local de la cookie de Midway
   * @returns {string} Ruta al archivo cookie de Midway
   */
  getLocalMidwayCookiePath() {
    return path.join(os.homedir(), ".midway", "cookie");
  }

  /**
   * Lee y parsea la cookie de Midway para obtener información de expiración
   * @param {string} cookiePath - Ruta al archivo de cookie
   * @returns {object} { success, exists, expired, expiresAt, hoursUntilExpiry, error }
   */
  parseMidwayCookie(cookiePath) {
    try {
      const normalizedPath = path.normalize(cookiePath);
      
      if (!fs.existsSync(normalizedPath)) {
        return { 
          success: true, 
          exists: false, 
          expired: true,
          message: "Cookie no encontrada"
        };
      }

      const cookieContent = fs.readFileSync(normalizedPath, "utf-8");
      const lines = cookieContent.split("\n");
      
      // La cookie de Midway tiene el timestamp de expiración en la línea 4+ 
      // Formato: domain\tflag\tpath\tsecure\texpiration\tname\tvalue
      // 
      // Tokens importantes:
      // - tpm_metrics: Token principal de Midway (~20h)
      // - session / __Host-session: Token de sesión (~20h)
      // - amazon_enterprise_access: Token de corta duración (~2h) - NO USAR
      // - user_name: Token de muy larga duración (~1 año) - NO USAR
      //
      // Usamos el token de sesión (session o tpm_metrics) para determinar validez
      
      const now = Math.floor(Date.now() / 1000); // Timestamp actual en segundos
      let sessionExpiration = null;
      let tpmExpiration = null;
      let fallbackExpiration = null;

      // Tokens a buscar por prioridad
      const priorityTokens = ['session', '__host-session', 'tpm_metrics'];
      const skipTokens = ['amazon_enterprise_access', 'user_name']; // Tokens a ignorar

      for (let i = 4; i < lines.length; i++) {
        const parts = lines[i].split("\t");
        if (parts.length >= 6) {
          const expiration = parseInt(parts[4], 10);
          const tokenName = (parts[5] || '').toLowerCase();
          
          if (isNaN(expiration) || expiration <= 0) continue;
          
          // Buscar tokens prioritarios
          if (tokenName === 'session' || tokenName === '__host-session') {
            sessionExpiration = expiration;
          } else if (tokenName === 'tpm_metrics') {
            tpmExpiration = expiration;
          } else if (!skipTokens.includes(tokenName)) {
            // Guardar como fallback si no es un token a ignorar
            if (!fallbackExpiration || expiration > fallbackExpiration) {
              fallbackExpiration = expiration;
            }
          }
        }
      }

      // Usar en orden de prioridad: session > tpm_metrics > fallback
      const relevantExpiration = sessionExpiration || tpmExpiration || fallbackExpiration;

      if (!relevantExpiration) {
        return { 
          success: true, 
          exists: true, 
          expired: true,
          message: "No se encontró token de sesión válido en la cookie"
        };
      }

      const expiresAt = new Date(relevantExpiration * 1000);
      const hoursUntilExpiry = (relevantExpiration - now) / 3600;

      console.log(`[FileSystem] Cookie parseada: sesión expira en ${hoursUntilExpiry.toFixed(2)}h (${expiresAt.toISOString()})`);

      return {
        success: true,
        exists: true,
        expired: hoursUntilExpiry <= 0,
        expiresAt: expiresAt.toISOString(),
        hoursUntilExpiry: Math.max(0, hoursUntilExpiry),
        timestamp: relevantExpiration,
        tokenUsed: sessionExpiration ? 'session' : (tpmExpiration ? 'tpm_metrics' : 'fallback')
      };
    } catch (error) {
      console.error("[FileSystem] Error parseando cookie de Midway:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Valida si la cookie de Midway en una ruta específica es válida
   * @param {string} cookiePath - Ruta al archivo de cookie
   * @param {number} minHoursValid - Horas mínimas que debe quedar válida (default: 10)
   * @returns {object} { valid, needsRefresh, hoursRemaining, message }
   */
  validateMidwayCookie(cookiePath, minHoursValid = 10) {
    const parsed = this.parseMidwayCookie(cookiePath);
    
    if (!parsed.success) {
      return { valid: false, needsRefresh: true, message: parsed.error };
    }

    if (!parsed.exists) {
      return { valid: false, needsRefresh: true, message: "Cookie no existe" };
    }

    if (parsed.expired) {
      return { valid: false, needsRefresh: true, message: "Cookie expirada" };
    }

    if (parsed.hoursUntilExpiry < minHoursValid) {
      return { 
        valid: false, 
        needsRefresh: true, 
        hoursRemaining: parsed.hoursUntilExpiry,
        message: `Cookie expira en ${parsed.hoursUntilExpiry.toFixed(1)} horas (mínimo ${minHoursValid}h requeridas)`
      };
    }

    return { 
      valid: true, 
      needsRefresh: false, 
      hoursRemaining: parsed.hoursUntilExpiry,
      expiresAt: parsed.expiresAt,
      message: `Cookie válida por ${parsed.hoursUntilExpiry.toFixed(1)} horas más`
    };
  }

  /**
   * Copia un archivo de una ruta a otra
   * @param {string} sourcePath - Ruta del archivo origen
   * @param {string} destPath - Ruta del archivo destino
   * @returns {object} { success, error }
   */
  copyFile(sourcePath, destPath) {
    try {
      const normalizedSource = path.normalize(sourcePath);
      const normalizedDest = path.normalize(destPath);

      if (!fs.existsSync(normalizedSource)) {
        return { success: false, error: `Archivo origen no encontrado: ${normalizedSource}` };
      }

      // Crear directorio destino si no existe
      const destDir = path.dirname(normalizedDest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Copiar el archivo
      fs.copyFileSync(normalizedSource, normalizedDest);
      console.log(`[FileSystem] Cookie copiada de ${normalizedSource} a ${normalizedDest}`);
      
      return { success: true, message: "Archivo copiado correctamente" };
    } catch (error) {
      console.error("[FileSystem] Error copiando archivo:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Copia la cookie local de Midway a una ubicación remota
   * @param {string} destPath - Ruta destino para la cookie
   * @returns {object} { success, error }
   */
  copyMidwayCookieToRemote(destPath) {
    const localCookiePath = this.getLocalMidwayCookiePath();
    
    // Primero validar que la cookie local existe y es válida
    const localValidation = this.validateMidwayCookie(localCookiePath, 0);
    
    if (!localValidation.valid && !localValidation.hoursRemaining) {
      return { 
        success: false, 
        error: "No hay cookie local válida para copiar. Ejecuta mwinit primero." 
      };
    }

    return this.copyFile(localCookiePath, destPath);
  }
}

module.exports = new FileSystemService();
