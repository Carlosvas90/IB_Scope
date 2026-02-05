/**
 * Stow Guide - Consultar ASIN y buscar Bin más cercana
 * Usa drSku API para datos del ASIN y stow_guide.json para bins disponibles
 */

let RULES_CONFIG = null;
let BINS_DATA = null;

// Dimensiones de bins en cm (largo x ancho x alto)
const BIN_DIMENSIONS = {
  "HALF-VERTICAL": { l: 78, w: 70, h: 135, cuft: 26.03 },
  "LIBRARY-DEEP": { l: 76, w: 49, h: 70, cuft: 9.21 },      // Shelf B y C
  "LIBRARY-SHALLOW": { l: 56, w: 39, h: 70, cuft: 5.40 },   // Shelf A y D
  "BARREL": { l: 70, w: 15, h: 15, cuft: 0.56 },
  "BAT-BIN": { l: 15, w: 15, h: 140, cuft: 1.11 },          // Items muy largos (90-140cm)
  "CASE": { l: 60, w: 40, h: 40, cuft: 3.39 },
  "FLOOR-PALLET": { l: 120, w: 100, h: 150, cuft: 63.57 },
};

// Mapeo de bin type de clasificación a tipos en el JSON
const BIN_TYPE_MAP = {
  "Half Vertical": "HALF-VERTICAL",
  "Half Vertical TL": "HALF-VERTICAL",
  "Library Deep": "LIBRARY-DEEP",
  "Library Deep TL": "LIBRARY-DEEP",
  "Barrel": "BARREL",
  "Barrel TL": "BARREL",
  "Bat-Bin": "BAT-BIN",
  "Bat-Bin TL": "BAT-BIN",
  "Case": "CASE",
  "Floor-Pallet": "FLOOR-PALLET",
  "POUT": null,  // No aplica
};

// Mapeo de tipo de artículo a dropzone requerida
// Si no está en la lista o es null, no requiere dropzone especial
const DROPZONE_MAP = {
  "Half Vertical TL": "dz-P-TeamLift",
  "Library Deep TL": "dz-P-TeamLift",
  "Barrel TL": "dz-P-TeamLift",
  "Bat-Bin TL": "dz-P-TeamLift",
  // Pet Food (detectado por nombre del producto)
  "PetFood TL": "dz-P-PETFOOD_TeamLift",
  "PetFood": "dz-P-PETFOOD",
  // Bins normales (no TL) no requieren dropzone especial
  "Half Vertical": null,
  "Library Deep": null,
  "Barrel": null,
  "Bat-Bin": null,
  "Case": null,
  "Floor-Pallet": null,
};

// ==================== DETECCIÓN DE PET FOOD ====================

// Marcas conocidas de comida para mascotas
const PET_FOOD_BRANDS = [
  "royal canin", "eukanuba", "iams", "applaws", "pedigree", "whiskas",
  "purina", "friskies", "felix", "advance", "acana", "orijen", "hills",
  "hill's", "science diet", "pro plan", "one", "ultima", "criadores",
  "true instinct", "nutro", "natural balance", "blue buffalo", "taste of the wild",
  "canidae", "wellness", "merrick", "nature's variety", "instinct"
];

// Palabras clave que indican comida para mascotas
const PET_FOOD_KEYWORDS = {
  // Animales
  animals: ["perro", "perros", "dog", "dogs", "gato", "gatos", "cat", "cats", 
            "mascota", "mascotas", "pet", "pets", "canino", "felino", "cachorro", 
            "puppy", "kitten", "gatito", "adulto adult", "senior", "junior"],
  // Tipo de producto alimenticio
  foodType: ["alimento", "comida", "food", "pienso", "croquetas", "kibble",
             "seco", "húmedo", "wet", "dry", "lata", "pouch", "sobres"],
  // Indicadores de tamaño de raza (común en pet food)
  breedSize: ["raza grande", "raza mediana", "raza pequeña", "large breed", 
              "medium breed", "small breed", "razas grandes", "razas medianas"]
};

/**
 * Detecta si un producto es comida para mascotas basándose en el nombre
 * @param {string} productName - Nombre del producto
 * @returns {boolean} true si es pet food
 */
function isPetFood(productName) {
  if (!productName) return false;
  
  const nameLower = productName.toLowerCase();
  
  // Verificar marcas conocidas
  for (const brand of PET_FOOD_BRANDS) {
    if (nameLower.includes(brand)) {
      // La marca está presente, verificar que sea comida (no juguete)
      const hasAnimalRef = PET_FOOD_KEYWORDS.animals.some(k => nameLower.includes(k));
      const hasFoodRef = PET_FOOD_KEYWORDS.foodType.some(k => nameLower.includes(k));
      const hasBreedSize = PET_FOOD_KEYWORDS.breedSize.some(k => nameLower.includes(k));
      
      // Si tiene marca + (referencia a comida O tamaño de raza), es pet food
      if (hasFoodRef || hasBreedSize) {
        return true;
      }
    }
  }
  
  // Sin marca conocida: buscar combinación de animal + tipo de comida
  const hasAnimalRef = PET_FOOD_KEYWORDS.animals.some(k => nameLower.includes(k));
  const hasFoodRef = PET_FOOD_KEYWORDS.foodType.some(k => nameLower.includes(k));
  
  // Debe tener referencia a animal Y tipo de comida
  if (hasAnimalRef && hasFoodRef) {
    // Excluir juguetes, accesorios, etc.
    const excludeWords = ["juguete", "toy", "collar", "correa", "leash", "cama", "bed", 
                          "transportin", "carrier", "comedero", "bowl", "rascador", "scratching"];
    const isExcluded = excludeWords.some(w => nameLower.includes(w));
    return !isExcluded;
  }
  
  return false;
}

/**
 * Determina la dropzone especial basándose en el producto
 * @param {Object} data - Datos del producto (peso, nombre, etc.)
 * @param {string} binType - Tipo de bin determinado
 * @returns {string|null} Dropzone requerida o null
 */
function getSpecialDropzone(data, binType) {
  const productName = data?.item_name || data?.name || "";
  
  // Verificar si es Pet Food
  if (isPetFood(productName)) {
    // Pet Food >= 15kg va a TeamLift
    if (data.weight_kg >= 15) {
      console.log(`[Stow Guide] 🐕 Detectado PET FOOD (TL): ${productName.substring(0, 50)}...`);
      return "dz-P-PETFOOD_TeamLift";
    } else {
      console.log(`[Stow Guide] 🐕 Detectado PET FOOD: ${productName.substring(0, 50)}...`);
      return "dz-P-PETFOOD";
    }
  }
  
  // Si no es pet food, usar dropzone del tipo de bin (TL normal, etc.)
  return DROPZONE_MAP[binType] || null;
}

// ==================== DETECCIÓN DE TIPO DE CÓDIGO ====================

/**
 * Detecta si un código es ASIN, EAN u otro tipo
 * @returns { type: 'asin' | 'ean' | 'other', code: string }
 */
function detectCodeType(code) {
  if (!code) return { type: 'unknown', code };
  
  const upper = code.toUpperCase();
  
  // ASIN: empieza con B0, X0, ZZ (y tiene 10 caracteres)
  if (/^(B0|X0|ZZ)[A-Z0-9]{8}$/i.test(upper)) {
    return { type: 'asin', code: upper };
  }
  
  // EAN/UPC: solo números, 8-14 dígitos
  if (/^\d{8,14}$/.test(code)) {
    return { type: 'ean', code };
  }
  
  // Otros códigos (tsJCART, FcSku, LPN, etc.)
  return { type: 'other', code: upper };
}

/**
 * Extrae el ASIN del HTML de fcresearch
 * Busca en la sección data-section-type="inventory" dentro del tbody
 */
function extractAsinFromFcResearch(html) {
  if (!html) return null;
  
  console.log("[Stow Guide] Analizando HTML de fcresearch...");
  
  // Buscar la sección de inventario
  const hasInventory = html.includes('data-section-type="inventory"');
  console.log("[Stow Guide] Sección inventario encontrada:", hasInventory);
  
  // Buscar ASINs en el formato: <a href="/VLC1/results?s=B0XXXXXX">B0XXXXXX</a>
  // Los ASINs empiezan con B0, B07, B08, B09, B0B, B0C, B0D, B0F, X0, etc.
  const allAsins = [];
  
  // Regex mejorado para capturar ASINs (10 caracteres alfanuméricos que empiezan con B o X)
  const asinRegex = /results\?s=([BX][0-9A-Z]{9})">([BX][0-9A-Z]{9})<\/a>/gi;
  let match;
  
  while ((match = asinRegex.exec(html)) !== null) {
    const asin = match[1].toUpperCase();
    // Verificar que es un ASIN válido (empieza con B0, B07-B09, X0, etc.)
    if (/^[BX][0-9][A-Z0-9]{8}$/.test(asin) && !allAsins.includes(asin)) {
      allAsins.push(asin);
    }
  }
  
  if (allAsins.length > 0) {
    console.log("[Stow Guide] ASINs encontrados en fcresearch:", allAsins);
    // Si hay múltiples ASINs (contenedor), devolver el primero
    // En el futuro podríamos mostrar una lista para elegir
    return allAsins[0];
  }
  
  // Alternativa más amplia: buscar cualquier código de 10 caracteres que parezca ASIN
  const altMatches = html.match(/>([BX][0-9][A-Z0-9]{8})<\/a>/gi);
  if (altMatches && altMatches.length > 0) {
    for (const m of altMatches) {
      const asin = m.replace(/[><\/a]/g, '').toUpperCase();
      if (/^[BX][0-9][A-Z0-9]{8}$/.test(asin)) {
        console.log("[Stow Guide] ASIN extraído (método alternativo):", asin);
        return asin;
      }
    }
  }
  
  console.log("[Stow Guide] No se encontraron ASINs en el HTML de fcresearch");
  console.log("[Stow Guide] HTML preview:", html.substring(0, 500));
  return null;
}

// ==================== FUNCIONES DE drSku ====================

function decodeBase64Field(encodedStr) {
  try {
    const decodedBytes = atob(encodedStr);
    try {
      return JSON.parse(decodedBytes);
    } catch {
      return decodedBytes;
    }
  } catch {
    return encodedStr;
  }
}

function recursivelyDecode(obj) {
  if (typeof obj === "object" && obj !== null) {
    if (Array.isArray(obj)) {
      return obj.map((item) => recursivelyDecode(item));
    }
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        newObj[key] = decodeBase64Field(value);
      } else if (typeof value === "object") {
        newObj[key] = recursivelyDecode(value);
      } else {
        newObj[key] = value;
      }
    }
    return newObj;
  }
  return obj;
}

function extractProductData(asin, product) {
  try {
    const attr = product?.attributes;
    if (!attr) return null;

    const dimensions = attr.item_dimensions || {};
    const height = parseFloat(dimensions.height?.value || 0);
    const length = parseFloat(dimensions.length?.value || 0);
    const width = parseFloat(dimensions.width?.value || 0);

    const weightData = attr.item_weight || {};
    let itemWeight = 0;
    if (weightData.value) {
      itemWeight =
        typeof weightData.value === "object"
          ? parseFloat(weightData.value?.value || 0)
          : parseFloat(weightData.value);
    }

    // Extraer nombre del producto (puede estar en varios campos)
    const itemName = attr.item_name?.value || 
                     attr.item_name || 
                     attr.product_description?.value ||
                     attr.product_description ||
                     product?.item_name ||
                     "";

    return {
      asin,
      height_cm: height,
      length_cm: length,
      width_cm: width,
      weight_kg: itemWeight,
      item_name: typeof itemName === "string" ? itemName : String(itemName || ""),
    };
  } catch (e) {
    return null;
  }
}

// ==================== FUNCIONES DE CLASIFICACIÓN ====================

function shouldGoPOUT(data, rules) {
  if (!rules) return { pout: false, reason: null };
  if (data.height_cm > rules.height_max) {
    return { pout: true, reason: `Altura ${data.height_cm}cm > ${rules.height_max}cm` };
  }
  if (data.weight_kg >= rules.weight_max) {
    return { pout: true, reason: `Peso ${data.weight_kg}kg >= ${rules.weight_max}kg` };
  }
  const combo = rules.height_weight_combo;
  if (combo && data.height_cm > combo.height && data.weight_kg >= combo.weight) {
    return { pout: true, reason: `Altura + Peso exceden límites` };
  }
  return { pout: false, reason: null };
}

function determineBinType(data, rulesConfig) {
  if (!rulesConfig?.bins) {
    return { binType: "Sin clasificar", reason: "Reglas no cargadas" };
  }

  const poutCheck = shouldGoPOUT(data, rulesConfig.pout);
  if (poutCheck.pout) {
    return { binType: "POUT", reason: poutCheck.reason };
  }

  const dimensiones = [data.length_cm, data.width_cm, data.height_cm].sort((a, b) => b - a);
  const mayorDimension = dimensiones[0];
  const segundaMayorDimension = dimensiones[1];

  const sortedBins = [...rulesConfig.bins].sort((a, b) => (a.priority || 0) - (b.priority || 0));

  for (const bin of sortedBins) {
    let meetsAllConditions = true;

    if (bin.custom_check === "floor_pallet") {
      if (data.weight_kg >= 23) continue;
      const condition1 = mayorDimension >= 138 && mayorDimension <= 175.9;
      const condition2 = segundaMayorDimension > 76;
      const condition3 = mayorDimension > 70 && segundaMayorDimension > 70;
      if (condition1 || condition2 || condition3) {
        return { binType: bin.name, reason: `Artículo grande` };
      }
      continue;
    }

    const conditions = bin.conditions || {};
    for (const [key, value] of Object.entries(conditions)) {
      const [comparison, field] = key.split("_");
      let fieldValue;
      if (field === "length") fieldValue = data.length_cm;
      else if (field === "height") fieldValue = data.height_cm;
      else if (field === "width") fieldValue = data.width_cm;
      else if (field === "weight") fieldValue = data.weight_kg;
      else continue;

      if (comparison === "min") {
        if (fieldValue < value) meetsAllConditions = false;
      } else if (comparison === "max") {
        if (fieldValue > value) meetsAllConditions = false;
      }
    }

    if (meetsAllConditions) {
      return { binType: bin.name, reason: "Cumple condiciones" };
    }
  }

  return { binType: "Sin clasificar", reason: "No cumple ninguna condición" };
}

// ==================== FUNCIONES DE PARSING DE BIN ====================

/**
 * Parsea un bin ID para extraer sus componentes
 * Formato: P-{piso}-{mod}{pasillo}{shelf}{slot}
 * Ejemplo: P-1-B293B212 -> { piso: 1, mod: "B", pasillo: 293, shelf: "B", slot: 212 }
 * Shelves pueden ser A-G (o más)
 */
function parseBinId(binId) {
  if (!binId || typeof binId !== "string") return null;
  
  // Regex para formato P-{piso}-{mod}{pasillo}{shelf}{slot}
  // Slot puede ser 2 o 3 dígitos (ej: A21, A211)
  const match = binId.match(/^P-(\d+)-([BC])(\d{3})([A-Z])(\d{2,3})$/i);
  if (!match) return null;
  
  return {
    piso: parseInt(match[1], 10),
    mod: match[2].toUpperCase(),
    pasillo: parseInt(match[3], 10),
    shelf: match[4].toUpperCase(),
    slot: parseInt(match[5], 10),
    original: binId.toUpperCase()
  };
}

/**
 * Calcula la distancia real entre dos bins considerando:
 * - Slot (posición horizontal en el pasillo, ~200-750): es lo principal
 * - Pasillos pares están frente a impares menores (218 <-> 217)
 * - Cambiar de pasillo tiene un costo adicional
 * 
 * Retorna un valor numérico donde menor = más cerca
 */
function calculateDistance(bin1, bin2) {
  if (!bin1 || !bin2) return Infinity;
  
  // Distancia de slot (posición horizontal en el pasillo) - LO MÁS IMPORTANTE
  const slotDistance = Math.abs(bin1.slot - bin2.slot);
  
  // Calcular distancia de pasillo considerando que pares están frente a impares
  // Ej: 218 (par) está frente a 217 (impar menor)
  // Para calcular el "pasillo efectivo", agrupamos par con su impar menor
  const getAisleGroup = (pasillo) => {
    // Si es par, el grupo es el número. Si es impar, es el siguiente par
    return pasillo % 2 === 0 ? pasillo : pasillo + 1;
  };
  
  const group1 = getAisleGroup(bin1.pasillo);
  const group2 = getAisleGroup(bin2.pasillo);
  
  // Distancia entre grupos de pasillos (cada grupo = 2 pasillos reales)
  const aisleGroupDistance = Math.abs(group1 - group2) / 2;
  
  // Si están en el mismo grupo (ej: 217 y 218), la distancia de pasillo es mínima
  // pero hay que cruzar al otro lado (pequeño costo)
  let aisleDistance = aisleGroupDistance;
  if (group1 === group2 && bin1.pasillo !== bin2.pasillo) {
    // Mismo grupo pero diferente pasillo = cruzar al frente (costo muy bajo)
    aisleDistance = 0.1;
  }
  
  // Fórmula de distancia total:
  // - Slot es lo principal (cada unidad de slot = 1 unidad de distancia)
  // - Cada grupo de pasillo de diferencia = 100 unidades (caminar al siguiente pasillo)
  const totalDistance = slotDistance + (aisleDistance * 100);
  
  return totalDistance;
}

/**
 * Obtiene las dimensiones de un bin según su tipo y shelf
 */
function getBinDimensions(binType, shelf) {
  // Si es Library, ajustar según shelf (A/D = shallow, B/C = deep)
  if (binType === "LIBRARY-DEEP" || binType === "LIBRARY-SHALLOW") {
    if (shelf === "A" || shelf === "D") {
      return BIN_DIMENSIONS["LIBRARY-SHALLOW"];
    }
    return BIN_DIMENSIONS["LIBRARY-DEEP"];
  }
  return BIN_DIMENSIONS[binType] || BIN_DIMENSIONS["HALF-VERTICAL"];
}

/**
 * Calcula el espacio libre en una bin
 */
function calculateFreeSpace(binType, shelf, utilizationPct) {
  const dims = getBinDimensions(binType, shelf);
  const totalCuft = dims.cuft;
  const freePercent = (100 - utilizationPct) / 100;
  return {
    totalCuft,
    freeCuft: totalCuft * freePercent,
    freePercent: 100 - utilizationPct
  };
}

// ==================== CARGA DE DATOS ====================

async function loadBinTypeRules() {
  if (RULES_CONFIG) return RULES_CONFIG;
  if (!window.api?.getAppPath || !window.api?.readJson) {
    console.warn("[Stow Guide] API no disponible para cargar reglas");
    return null;
  }
  try {
    const appPath = await window.api.getAppPath();
    const sep = appPath.includes("\\") ? "\\" : "/";
    const rulesPath = `${appPath}${sep}src${sep}renderer${sep}apps${sep}space-heatmap${sep}Reglas${sep}bin-type-rules.json`;
    const result = await window.api.readJson(rulesPath);
    if (result?.success && result?.data) {
      RULES_CONFIG = result.data;
      return RULES_CONFIG;
    }
  } catch (e) {
    console.error("[Stow Guide] Error cargando reglas:", e);
  }
  return null;
}

async function loadBinsData() {
  if (BINS_DATA) return BINS_DATA;
  
  try {
    // Obtener config para la ruta de Space
    const config = await window.api.getConfig();
    const spacePaths = config?.Space_paths;
    
    if (!spacePaths || !Array.isArray(spacePaths) || spacePaths.length === 0) {
      console.warn("[Stow Guide] No hay rutas de Space configuradas");
      return null;
    }
    
    // Buscar stow_guide.json en las rutas de Space
    for (const basePath of spacePaths) {
      const jsonPath = `${basePath}\\stow_guide.json`;
      console.log("[Stow Guide] Buscando:", jsonPath);
      
      const result = await window.api.readJson(jsonPath);
      if (result?.success && result?.data) {
        BINS_DATA = result.data;
        console.log(`[Stow Guide] Datos cargados: ${BINS_DATA.b?.length || 0} bins`);
        return BINS_DATA;
      }
    }
    
    console.warn("[Stow Guide] No se encontró stow_guide.json");
    return null;
  } catch (e) {
    console.error("[Stow Guide] Error cargando bins:", e);
    return null;
  }
}

// ==================== BÚSQUEDA DE BINS ====================

/**
 * Busca las bins más cercanas del tipo correcto con espacio disponible
 * @param {Object} referenceBin - Bin de referencia parseada
 * @param {string} targetBinType - Tipo de bin (ej: "Half Vertical TL")
 * @param {number} itemVolumeCuft - Volumen del artículo en cuft
 * @param {Object} binsData - Datos de stow_guide.json
 * @param {Object} options - Opciones adicionales
 * @param {number} options.maxResults - Máximo de resultados a retornar (default: 5)
 * @param {boolean} options.allowOtherFloors - Si buscar en otros pisos
 * @param {string|null} options.requiredDropzone - Dropzone específica requerida (ej: pet food)
 */
function findNearestBins(referenceBin, targetBinType, itemVolumeCuft, binsData, options = {}) {
  const { maxResults = 5, allowOtherFloors = false, requiredDropzone: customDropzone = null } = options;
  
  if (!binsData?.b || !binsData?.t || !binsData?.d) {
    return { found: false, error: "Datos de bins no disponibles" };
  }
  
  const types = binsData.t;
  const dropzones = binsData.d;
  const bins = binsData.b;
  
  // Mapear el tipo de bin de clasificación al tipo en el JSON
  const jsonBinType = BIN_TYPE_MAP[targetBinType];
  if (!jsonBinType) {
    return { found: false, error: `Tipo de bin "${targetBinType}" no soportado para búsqueda` };
  }
  
  // Usar dropzone custom (pet food, etc.) o la del tipo de bin (TL)
  const requiredDropzone = customDropzone || DROPZONE_MAP[targetBinType] || null;
  
  console.log(`[Stow Guide] Buscando bins tipo: ${jsonBinType}, dropzone requerida: ${requiredDropzone || "ninguna"}`);
  console.log(`[Stow Guide] Dropzones disponibles en JSON:`, dropzones);
  console.log(`[Stow Guide] Piso de referencia: ${referenceBin.piso}, allowOtherFloors: ${allowOtherFloors}`);
  
  // Encontrar el índice del tipo en el JSON
  const typeIndex = types.findIndex(t => t.toUpperCase() === jsonBinType.toUpperCase());
  if (typeIndex === -1) {
    const partialIndex = types.findIndex(t => t.toUpperCase().includes(jsonBinType.split("-")[0]));
    if (partialIndex === -1) {
      return { found: false, error: `Tipo "${jsonBinType}" no encontrado en datos` };
    }
  }
  
  const candidates = [];
  const MAX_UNIQUE_ASINS = 5;
  
  for (const row of bins) {
    const binId = row[0];
    const binTypeIdx = row[1];
    const utilization = row[2];
    const dropzoneIdx = row[3];
    const uniqueAsinCount = row[5] || 0;
    const binTypeStr = types[binTypeIdx] || "";
    const binDropzone = dropzones[dropzoneIdx] || "";
    
    // Verificar si el tipo coincide
    const isMatchingType = binTypeStr.toUpperCase().includes(jsonBinType.split("-")[0]);
    if (!isMatchingType) continue;
    
    // FILTRO DE DROPZONE: Si requiere dropzone específica, verificar (case-insensitive + contiene)
    if (requiredDropzone) {
      const dzBin = (binDropzone || "").toLowerCase();
      const dzReq = requiredDropzone.toLowerCase();
      const exactMatch = dzBin === dzReq;
      // Fallback: si la dropzone del bin contiene las partes clave (ej. petfood_teamlift)
      const keyParts = dzReq.replace(/^dz-p-/, "").split(/[-_]/).filter(Boolean);
      const containsMatch = keyParts.length > 0 && keyParts.every(part => dzBin.includes(part));
      if (!exactMatch && !containsMatch) continue;
    }
    
    // Filtrar bins con demasiados ASINs únicos
    if (uniqueAsinCount >= MAX_UNIQUE_ASINS + 1) continue;
    
    // Parsear el bin
    const parsed = parseBinId(binId);
    if (!parsed) continue;
    
    // Filtrar por piso (a menos que permitamos otros pisos)
    if (!allowOtherFloors && parsed.piso !== referenceBin.piso) continue;
    
    // Calcular espacio libre
    const space = calculateFreeSpace(jsonBinType, parsed.shelf, utilization);
    
    // Verificar si el artículo cabe (con margen del 10%)
    if (space.freeCuft < itemVolumeCuft * 1.1) continue;
    
    // Calcular distancia (agregar penalización por cambio de piso)
    let distance = calculateDistance(referenceBin, parsed);
    if (parsed.piso !== referenceBin.piso) {
      // Penalización grande por cambiar de piso (subir/bajar escaleras)
      const pisosDiff = Math.abs(parsed.piso - referenceBin.piso);
      distance += pisosDiff * 1000; // 1000 unidades por cada piso de diferencia
    }
    
    candidates.push({
      binId,
      parsed,
      utilization,
      uniqueAsinCount,
      distance,
      space,
      binType: binTypeStr,
      dropzone: binDropzone,
      otherFloor: parsed.piso !== referenceBin.piso
    });
  }
  
  // Si no hay candidatos y requiere dropzone especial, buscar en otros pisos
  if (candidates.length === 0 && requiredDropzone && !allowOtherFloors) {
    console.log(`[Stow Guide] No hay bins ${targetBinType} (${requiredDropzone}) en Piso ${referenceBin.piso}, buscando en otros pisos...`);
    return findNearestBins(referenceBin, targetBinType, itemVolumeCuft, binsData, { 
      maxResults, 
      allowOtherFloors: true, 
      requiredDropzone: requiredDropzone  // Pasar la dropzone calculada
    });
  }
  
  if (candidates.length === 0) {
    return { found: false, error: `No se encontraron bins ${targetBinType}${requiredDropzone ? ` (${requiredDropzone})` : ""} disponibles` };
  }
  
  // Ordenar por distancia (menor primero), luego por utilización (menor primero)
  candidates.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    return a.utilization - b.utilization;
  });
  
  // Debug: mostrar top 10 candidatos
  console.log(`[Stow Guide] Referencia: piso=${referenceBin.piso}, pasillo=${referenceBin.pasillo}, slot=${referenceBin.slot}`);
  console.log(`[Stow Guide] ${candidates.length} candidatos encontrados. Top 10:`);
  candidates.slice(0, 10).forEach((c, i) => {
    const floorNote = c.otherFloor ? ` [OTRO PISO: ${c.parsed.piso}]` : "";
    console.log(`  ${i+1}. ${c.binId} - dist=${c.distance.toFixed(1)} (pasillo=${c.parsed.pasillo}, slot=${c.parsed.slot})${floorNote}, util=${c.utilization}%`);
  });
  
  return {
    found: true,
    best: candidates[0],
    alternatives: candidates.slice(1, maxResults),
    totalFound: candidates.length,
    reference: referenceBin,
    searchedOtherFloors: allowOtherFloors && candidates.some(c => c.otherFloor)
  };
}

// ==================== UI ====================

function showLoading(show) {
  const el = document.getElementById("stow-guide-loading");
  if (el) el.style.display = show ? "block" : "none";
}

function showError(msg, isHtml = false) {
  const el = document.getElementById("stow-guide-error");
  const result = document.getElementById("stow-guide-result");
  if (el) {
    if (isHtml || (msg && msg.includes("<a "))) {
      el.innerHTML = msg || "";
    } else {
      el.textContent = msg || "";
    }
    el.style.display = msg ? "block" : "none";
  }
  if (result) result.style.display = "none";
}

function showResult(data, binInfo, teamLiftLabel, searchResult) {
  const result = document.getElementById("stow-guide-result");
  const err = document.getElementById("stow-guide-error");
  if (err) err.style.display = "none";
  if (!result) return;

  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text ?? "—";
  };

  // Datos del artículo
  const asinDisplay = data?.originalCode 
    ? `${data.originalCode} → ${data.asin}` 
    : data?.asin;
  set("result-asin", asinDisplay);
  set("result-weight", data?.weight_kg != null ? data.weight_kg.toFixed(2) : "—");
  
  // Dimensiones compactas
  const dims = `${data?.length_cm?.toFixed(1) || "—"} × ${data?.width_cm?.toFixed(1) || "—"} × ${data?.height_cm?.toFixed(1) || "—"}`;
  set("result-dimensions", dims);
  
  // Volumen en cuft
  const volumeCm3 = (data?.length_cm || 0) * (data?.width_cm || 0) * (data?.height_cm || 0);
  const volumeCuft = volumeCm3 / 28316.846592;
  set("result-volume", volumeCuft > 0 ? volumeCuft.toFixed(2) : "—");
  
  set("result-teamlift", teamLiftLabel);
  
  // Mostrar tipo de bin con indicador de Pet Food si aplica
  const binTypeEl = document.getElementById("result-bin-type");
  if (binTypeEl) {
    const baseBinType = binInfo?.binType ?? "—";
    if (searchResult?.specialDropzone?.includes("PETFOOD")) {
      const petLabel = searchResult.specialDropzone.includes("TeamLift") ? "🐕 Pet Food TL" : "🐕 Pet Food";
      binTypeEl.innerHTML = `${baseBinType} <span style="background:#f59e0b;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.75em;margin-left:4px;">${petLabel}</span>`;
    } else {
      binTypeEl.textContent = baseBinType;
    }
  }

  // Bin recomendada
  const recommendedEl = document.getElementById("result-recommended-bin");
  const distanceEl = document.getElementById("result-distance");
  const utilizationEl = document.getElementById("result-utilization");
  const asinCountEl = document.getElementById("result-asin-count");
  const freeSpaceEl = document.getElementById("result-free-space");
  const alternativesDiv = document.getElementById("result-alternatives");
  const alternativesList = document.getElementById("result-alternatives-list");
  
  if (searchResult?.found && searchResult.best) {
    const best = searchResult.best;
    if (recommendedEl) {
      // Si está en otro piso, indicarlo claramente
      if (best.otherFloor) {
        recommendedEl.innerHTML = `${best.binId} <span style="background:#dc2626;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.75em;margin-left:4px;">PISO ${best.parsed.piso}</span>`;
        recommendedEl.style.color = "#dc2626";
      } else {
        recommendedEl.textContent = best.binId;
        recommendedEl.style.color = "#166534";
      }
    }
    if (distanceEl) {
      // Mostrar descripción más útil de la distancia
      const slotDiff = Math.abs(best.parsed.slot - searchResult.reference.slot);
      const pasilloDiff = Math.abs(best.parsed.pasillo - searchResult.reference.pasillo);
      
      if (best.otherFloor) {
        // Si está en otro piso, mostrar también el piso
        const pisoDiff = Math.abs(best.parsed.piso - searchResult.reference.piso);
        distanceEl.textContent = `↕ ${pisoDiff} piso(s), ${pasilloDiff}p, ${slotDiff}sl`;
      } else if (pasilloDiff === 0) {
        distanceEl.textContent = slotDiff === 0 ? "Mismo slot" : `${slotDiff} slots`;
      } else if (pasilloDiff === 1) {
        distanceEl.textContent = `Pasillo frente (${slotDiff} slots)`;
      } else {
        distanceEl.textContent = `${pasilloDiff} pasillos, ${slotDiff} slots`;
      }
    }
    if (utilizationEl) {
      utilizationEl.textContent = `${best.utilization}%`;
    }
    if (asinCountEl) {
      asinCountEl.textContent = `${best.uniqueAsinCount || 0}/5`;
    }
    if (freeSpaceEl) {
      freeSpaceEl.textContent = `${best.space.freeCuft.toFixed(2)} cuft (${best.space.freePercent}%)`;
    }
    
    // Alternativas
    if (alternativesDiv && alternativesList && searchResult.alternatives?.length > 0) {
      alternativesList.innerHTML = searchResult.alternatives.map(alt => {
        const slotDiff = Math.abs(alt.parsed.slot - searchResult.reference.slot);
        const pasilloDiff = Math.abs(alt.parsed.pasillo - searchResult.reference.pasillo);
        
        let distLabel;
        if (alt.otherFloor) {
          const pisoDiff = Math.abs(alt.parsed.piso - searchResult.reference.piso);
          distLabel = `<span style="color:#dc2626">P${alt.parsed.piso}</span> ${pasilloDiff}p+${slotDiff}sl`;
        } else if (pasilloDiff === 0) {
          distLabel = `${slotDiff}sl`;
        } else if (pasilloDiff === 1) {
          distLabel = `frente+${slotDiff}sl`;
        } else {
          distLabel = `${pasilloDiff}p+${slotDiff}sl`;
        }
        return `<li><span class="stow-guide-bin-id">${alt.binId}</span> <span>${distLabel} · ${alt.utilization}% · ${alt.uniqueAsinCount || 0}/5</span></li>`;
      }).join("");
      alternativesDiv.style.display = "block";
    } else if (alternativesDiv) {
      alternativesDiv.style.display = "none";
    }
  } else {
    if (recommendedEl) {
      recommendedEl.textContent = searchResult?.error || "No encontrada";
      recommendedEl.style.color = "#991b1b";
    }
    if (distanceEl) distanceEl.textContent = "—";
    if (utilizationEl) utilizationEl.textContent = "—";
    if (asinCountEl) asinCountEl.textContent = "—";
    if (freeSpaceEl) freeSpaceEl.textContent = "—";
    if (alternativesDiv) alternativesDiv.style.display = "none";
  }

  result.style.display = "block";
}

// ==================== ANÁLISIS PRINCIPAL ====================

async function analyzeAsin() {
  const binInput = document.getElementById("stow-guide-bin-input");
  const asinInput = document.getElementById("stow-guide-asin-input");
  
  const refBinId = binInput?.value?.trim()?.toUpperCase();
  const asin = asinInput?.value?.trim()?.toUpperCase();
  
  // Validar bin de referencia
  if (!refBinId) {
    showError("Escanea primero tu ubicación (Bin de referencia).");
    binInput?.focus();
    return;
  }
  
  const referenceBin = parseBinId(refBinId);
  if (!referenceBin) {
    showError(`Formato de bin inválido: "${refBinId}". Ejemplo: P-1-B293B212`);
    binInput?.focus();
    return;
  }
  
  console.log(`[Stow Guide] Bin de referencia parseada:`, referenceBin);
  
  // Validar código
  if (!asin) {
    showError("Escribe o escanea un ASIN/EAN/Código.");
    asinInput?.focus();
    return;
  }
  
  // Mínimo 4 caracteres para cualquier código
  if (asin.length < 4) {
    showError("El código es demasiado corto.");
    asinInput?.focus();
    return;
  }

  showError("");
  showLoading(true);

  try {
    // Cargar reglas y datos de bins en paralelo
    const [rules, binsData] = await Promise.all([
      loadBinTypeRules(),
      loadBinsData()
    ]);
    
    const fc = rules?.fc_code || "VLC1";
    
    // Detectar tipo de código
    const codeInfo = detectCodeType(asin);
    let realAsin = asin;
    
    console.log(`[Stow Guide] Código detectado: ${codeInfo.type} -> "${codeInfo.code}"`);
    
    // Si no es ASIN, buscar en fcresearch primero
    if (codeInfo.type !== 'asin') {
      console.log("[Stow Guide] Consultando fcresearch para obtener ASIN...");
      
      const fcResponse = await window.api.fetchFcResearch(fc, codeInfo.code);
      
      if (!fcResponse?.success) {
        showLoading(false);
        // Si es error de autenticación, ofrecer abrir fcresearch manualmente
        if (fcResponse?.error?.includes("Autenticación")) {
          showError(`${fcResponse.error}. <a href="#" onclick="window.api.openExternalLink('https://fcresearch-eu.aka.amazon.com/${fc}/results'); return false;" style="color: var(--accent-primary);">Abre fcresearch aquí</a> para autenticarte y luego intenta de nuevo.`);
        } else {
          showError(fcResponse?.error || "Error al consultar fcresearch.");
        }
        return;
      }
      
      // Extraer ASIN del HTML
      const extractedAsin = extractAsinFromFcResearch(fcResponse.html);
      
      if (!extractedAsin) {
        showLoading(false);
        showError(`No se encontró ASIN para "${codeInfo.code}" en fcresearch.`);
        return;
      }
      
      realAsin = extractedAsin;
      console.log(`[Stow Guide] ASIN obtenido de fcresearch: ${realAsin}`);
    }

    // Consultar drSku con el ASIN real
    const response = await window.api.fetchDrSku(fc, realAsin);
    showLoading(false);

    if (!response?.success) {
      showError(response?.error || "Error al consultar drSku.");
      return;
    }

    let product;
    try {
      product = JSON.parse(response.raw);
    } catch {
      showError("Respuesta de la API no válida.");
      return;
    }

    const cleaned = recursivelyDecode(product);
    
    // DEBUG: Mostrar TODOS los datos de la API en consola
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`[drSku API] Datos completos para ASIN: ${realAsin}`);
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("[drSku API] Objeto completo (decoded):", cleaned);
    
    // Mostrar atributos específicos si existen
    const attr = cleaned?.attributes;
    if (attr) {
      console.log("───────────────────────────────────────────────────────────────");
      console.log("[drSku API] ATRIBUTOS DISPONIBLES:");
      console.log("───────────────────────────────────────────────────────────────");
      Object.keys(attr).forEach(key => {
        const val = attr[key];
        if (typeof val === "object") {
          console.log(`  📦 ${key}:`, JSON.stringify(val, null, 2));
        } else {
          console.log(`  📦 ${key}: ${val}`);
        }
      });
    }
    
    // Mostrar otros campos del objeto raíz
    console.log("───────────────────────────────────────────────────────────────");
    console.log("[drSku API] OTROS CAMPOS:");
    console.log("───────────────────────────────────────────────────────────────");
    Object.keys(cleaned).filter(k => k !== "attributes").forEach(key => {
      const val = cleaned[key];
      if (typeof val === "object" && val !== null) {
        console.log(`  🔹 ${key}:`, JSON.stringify(val, null, 2));
      } else {
        console.log(`  🔹 ${key}: ${val}`);
      }
    });
    console.log("═══════════════════════════════════════════════════════════════");
    
    const data = extractProductData(realAsin, cleaned);
    if (!data) {
      showError("No se pudieron extraer atributos del ASIN.");
      return;
    }
    
    // Si el código original era diferente al ASIN, guardarlo para mostrar
    if (asin !== realAsin) {
      data.originalCode = asin;
    }

    // Determinar tipo de bin
    const binInfo = determineBinType(data, rules);
    const teamLiftWeight = rules?.team_lift_weight ?? 15;
    const teamLiftLabel = data.weight_kg >= teamLiftWeight ? "Sí" : "No";
    
    // Calcular volumen del artículo
    const volumeCm3 = data.length_cm * data.width_cm * data.height_cm;
    const volumeCuft = volumeCm3 / 28316.846592;
    
    // Detectar dropzone especial (Pet Food, etc.)
    const specialDropzone = getSpecialDropzone(data, binInfo.binType);
    
    // Buscar bin más cercana
    let searchResult = { found: false, error: "Datos de bins no cargados" };
    if (binsData && binInfo.binType !== "POUT" && binInfo.binType !== "Sin clasificar") {
      searchResult = findNearestBins(referenceBin, binInfo.binType, volumeCuft, binsData, {
        maxResults: 5,
        requiredDropzone: specialDropzone
      });
    } else if (binInfo.binType === "POUT") {
      searchResult = { found: false, error: "Artículo va a POUT, no Pick Tower" };
    }

    // Agregar info de dropzone especial al resultado para mostrar en UI
    if (specialDropzone) {
      searchResult.specialDropzone = specialDropzone;
    }

    showResult(data, binInfo, teamLiftLabel, searchResult);
    
    // Limpiar ASIN para siguiente escaneo
    asinInput.value = "";
    asinInput.focus();
    
  } catch (e) {
    showLoading(false);
    showError(e?.message || "Error inesperado.");
  }
}

// ==================== INICIALIZACIÓN ====================

function initStowGuide() {
  console.log("[Stow Guide] Inicializando Stow Guide");

  const btn = document.getElementById("stow-guide-analyze-btn");
  const binInput = document.getElementById("stow-guide-bin-input");
  const asinInput = document.getElementById("stow-guide-asin-input");

  if (btn) {
    btn.addEventListener("click", () => analyzeAsin());
  }
  
  // Enter en bin input -> ir a ASIN input
  if (binInput) {
    binInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        asinInput?.focus();
      }
    });
  }
  
  // Enter en ASIN input -> analizar
  if (asinInput) {
    asinInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") analyzeAsin();
    });
  }
  
  // Focus inicial en bin input
  binInput?.focus();
  
  // Pre-cargar datos de bins
  loadBinsData().then(data => {
    if (data) {
      console.log(`[Stow Guide] Pre-carga completada: ${data.b?.length || 0} bins`);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStowGuide);
} else {
  initStowGuide();
}

document.addEventListener("view:loaded", (e) => {
  if (e.detail?.app === "space-heatmap" && e.detail?.view === "stow-guide") {
    initStowGuide();
  }
});
