import pandas as pd
import json
import os
import sys
import platform
from datetime import datetime

# ============================================
# CONFIGURACIÓN: GUARDAR CSV CORREGIDO
# ============================================
# Cambiar a True para sobrescribir el CSV original con las correcciones aplicadas
# Cambiar a False para solo corregir en memoria (más rápido, no guarda cambios en el archivo)
GUARDAR_CSV_CORREGIDO = True

def corregir_csv(df):
    """
    Corrige el DataFrame del CSV antes de procesarlo.
    
    Correcciones:
    1. Elimina filas completamente vacías (entre cambios de piso)
    2. Convierte Utilization % de valores enteros (48.00) a decimales (0.48) - se mantiene como dato original
    3. Crea columna Fullness: Utilization % en decimales CON corrección de PALLET-SINGLE (si > 0 → 1.0)
       NOTA: Fullness es la columna PRINCIPAL que se usa en todos los cálculos automáticos
       Utilization % solo se mantiene como dato original y se usa solo cuando se indique explícitamente
    4. Crea columna storage_area basada en MOD (A=High Rack, F=Pallet Land, B/C=Pick Tower)
    
    Args:
        df: DataFrame de pandas con los datos del CSV
        
    Returns:
        DataFrame corregido
    """
    print("[Correccion] Aplicando correcciones al CSV...")
    
    # 0. Eliminar filas completamente vacías (entre cambios de piso)
    initial_count = len(df)
    # Eliminar filas donde todas las columnas son NaN/vacías
    df = df.dropna(how='all')
    removed_count = initial_count - len(df)
    if removed_count > 0:
        print(f"[OK] Eliminadas {removed_count} filas completamente vacías")
    else:
        print("[OK] No se encontraron filas completamente vacías")
    
    # Verificar que existe la columna Utilization %
    if 'Utilization %' not in df.columns:
        print("[ERROR] No se encontro la columna 'Utilization %'")
        return df
    
    # 1. Corregir Utilization %: convertir de enteros (48.00) a decimales (0.48)
    # Si los valores son > 1, significa que están como porcentajes enteros
    # NOTA: Utilization % se mantiene como dato original, NO se usa en cálculos automáticos
    # NO aplicar corrección de PALLET-SINGLE aquí (mantener dato original)
    max_util = df['Utilization %'].max()
    if not pd.isna(max_util) and max_util > 1:
        print(f"[Correccion] Convirtiendo Utilization % de enteros a decimales (max encontrado: {max_util})...")
        df.loc[:, 'Utilization %'] = df['Utilization %'] / 100.0
        print("[OK] Utilization % convertido a decimales (0-1) - se mantiene como dato original")
    else:
        print("[OK] Utilization % ya está en formato decimal (se mantiene como dato original)")
    
    # 2. Crear columna Fullness: copia de Utilization % en decimales
    # Fullness es la columna PRINCIPAL que se usa en TODOS los cálculos automáticos
    # AQUÍ sí aplicar corrección de PALLET-SINGLE (si > 0 → 1.0)
    df['Fullness'] = df['Utilization %'].copy()
    
    if 'Bin Type' in df.columns:
        pallet_single_mask = df['Bin Type'] == 'PALLET-SINGLE'
        pallet_single_count = pallet_single_mask.sum()
        
        if pallet_single_count > 0:
            # Para PALLET-SINGLE, si Fullness > 0, cambiar a 1.0
            # Mantener 0 si ya es 0
            pallet_single_with_util = pallet_single_mask & (df['Fullness'] > 0)
            corrected_count = pallet_single_with_util.sum()
            
            if corrected_count > 0:
                df.loc[pallet_single_with_util, 'Fullness'] = 1.0
                print(f"[OK] Corregidos {corrected_count} registros PALLET-SINGLE en Fullness (cambiados a 1.0)")
            else:
                print(f"[OK] {pallet_single_count} registros PALLET-SINGLE encontrados, todos con Fullness = 0")
        else:
            print("[OK] No se encontraron registros PALLET-SINGLE")
    else:
        print("[ADVERTENCIA] No se encontro la columna 'Bin Type'")
    
    # 3. Crear columna storage_area basada en MOD
    def get_storage_area(mod):
        if pd.isna(mod):
            return None
        mod_str = str(mod).upper()
        if mod_str == 'A':
            return 'High Rack'
        elif mod_str == 'F':
            return 'Pallet Land'
        elif mod_str in ['B', 'C']:
            return 'Pick Tower'
        return None
    
    df['storage_area'] = df['Mod'].apply(get_storage_area)
    storage_area_count = df['storage_area'].notna().sum()
    print(f"[OK] Columna storage_area creada ({storage_area_count} registros con área asignada)")
    
    print("[OK] Correcciones aplicadas correctamente")
    return df


def aplicar_filtros_avanzados(df, filtros, zonas_reglas_dict=None):
    """
    Aplica filtros avanzados al DataFrame.
    Soporta ambos formatos: simple (con 'filtros' nested) y avanzado (filtros directos).
    
    Args:
        df: DataFrame a filtrar
        filtros: Diccionario con los filtros a aplicar
        zonas_reglas_dict: Diccionario con las reglas de Zonas_reglas.json para resolver referencias 'zone'
        
    Returns:
        DataFrame filtrado
    """
    df_filtrado = df.copy()
    
    # Si los filtros están dentro de una clave 'filtros', extraerlos
    if 'filtros' in filtros:
        filtros = filtros['filtros']
    
    # Si hay un filtro 'zone', resolverlo usando zonas_reglas_dict
    if 'zone' in filtros and zonas_reglas_dict:
        zones = filtros['zone']
        if isinstance(zones, str):
            zones = [zones]
        
        # Crear un nuevo diccionario de filtros combinando los filtros de las zonas referenciadas
        filtros_combinados = {}
        for zone_name in zones:
            if zone_name in zonas_reglas_dict:
                # Obtener los filtros de la zona referenciada
                zone_filters = zonas_reglas_dict[zone_name]
                # Combinar los filtros (los filtros de la zona tienen prioridad)
                for key, value in zone_filters.items():
                    if key not in filtros_combinados:
                        filtros_combinados[key] = value
                    # Si ya existe, combinar listas o usar el valor más específico
                    elif isinstance(filtros_combinados[key], list) and isinstance(value, list):
                        filtros_combinados[key] = list(set(filtros_combinados[key] + value))
                    else:
                        filtros_combinados[key] = value
        
        # Reemplazar el filtro 'zone' con los filtros combinados
        filtros = {k: v for k, v in filtros.items() if k != 'zone'}
        filtros.update(filtros_combinados)
    
    # Filtrar por storage_area (puede ser string o lista)
    if 'storage_area' in filtros:
        areas = filtros['storage_area']
        if isinstance(areas, str):
            areas = [areas]
        if 'Storage_Area' in df_filtrado.columns:
            df_filtrado = df_filtrado[df_filtrado['Storage_Area'].isin(areas)]
        elif 'storage_area' in df_filtrado.columns:
            df_filtrado = df_filtrado[df_filtrado['storage_area'].isin(areas)]
    
    # Filtrar por bin_type (puede ser string o lista)
    if 'bin_type' in filtros:
        tipos = filtros['bin_type']
        if isinstance(tipos, str):
            tipos = [tipos]
        if 'Bin Type' in df_filtrado.columns:
            df_filtrado = df_filtrado[df_filtrado['Bin Type'].isin(tipos)]
    
    # Filtrar por floor (puede ser int, string, o lista)
    if 'floor' in filtros:
        pisos = filtros['floor']
        if isinstance(pisos, (int, str)):
            pisos = [int(pisos)]
        else:
            pisos = [int(p) for p in pisos]
        if 'Floor' in df_filtrado.columns:
            df_filtrado = df_filtrado[df_filtrado['Floor'].isin(pisos)]
    
    # Filtrar por aisle_range [min, max]
    if 'aisle_range' in filtros:
        aisle_range = filtros['aisle_range']
        if isinstance(aisle_range, list) and len(aisle_range) == 2:
            min_aisle, max_aisle = aisle_range
            if 'Aisle' in df_filtrado.columns:
                df_filtrado = df_filtrado[(df_filtrado['Aisle'] >= min_aisle) & (df_filtrado['Aisle'] <= max_aisle)]
    
    # Excluir rango de aisle
    if 'aisle_exclude_range' in filtros:
        aisle_exclude = filtros['aisle_exclude_range']
        if isinstance(aisle_exclude, list) and len(aisle_exclude) == 2:
            min_aisle, max_aisle = aisle_exclude
            if 'Aisle' in df_filtrado.columns:
                df_filtrado = df_filtrado[~((df_filtrado['Aisle'] >= min_aisle) & (df_filtrado['Aisle'] <= max_aisle))]
    
    # Filtrar por aisle específico (puede ser int o lista)
    if 'aisle' in filtros:
        aisles = filtros['aisle']
        if isinstance(aisles, (int, float)):
            aisles = [int(aisles)]
        elif isinstance(aisles, list):
            aisles = [int(a) for a in aisles]
        if 'Aisle' in df_filtrado.columns:
            df_filtrado = df_filtrado[df_filtrado['Aisle'].isin(aisles)]
    
    # Filtrar por drop_zone (puede ser string o lista)
    if 'drop_zone' in filtros:
        drop_zones = filtros['drop_zone']
        if isinstance(drop_zones, str):
            drop_zones = [drop_zones]
        if 'Dropzone' in df_filtrado.columns:
            df_filtrado = df_filtrado[df_filtrado['Dropzone'].isin(drop_zones)]
    
    # Excluir drop_zone
    if 'drop_zone_exclude' in filtros:
        drop_zones_exclude = filtros['drop_zone_exclude']
        if isinstance(drop_zones_exclude, str):
            drop_zones_exclude = [drop_zones_exclude]
        if 'Dropzone' in df_filtrado.columns:
            df_filtrado = df_filtrado[~df_filtrado['Dropzone'].isin(drop_zones_exclude)]
    
    # Filtrar por shelf
    if 'shelf' in filtros:
        shelf = filtros['shelf']
        if isinstance(shelf, str):
            shelf = [shelf]
        if 'Shelf' in df_filtrado.columns:
            df_filtrado = df_filtrado[df_filtrado['Shelf'].isin(shelf)]
    
    # Filtrar por warehouse_id (si existe la columna)
    if 'warehouse_id' in filtros:
        warehouse = filtros['warehouse_id']
        # Buscar columna que pueda contener warehouse_id
        # Puede ser 'Warehouse Id', 'Warehouse_ID', 'Warehouse', etc.
        warehouse_cols = [col for col in df_filtrado.columns if 'warehouse' in col.lower() or 'fc' in col.lower()]
        if warehouse_cols:
            df_filtrado = df_filtrado[df_filtrado[warehouse_cols[0]] == warehouse]
    
    # Filtrar por bin_id_endswith_ranges (rangos de finales de bin_id)
    if 'bin_id_endswith_ranges' in filtros:
        ranges = filtros['bin_id_endswith_ranges']
        if 'Bin Id' in df_filtrado.columns:
            mask = pd.Series([False] * len(df_filtrado), index=df_filtrado.index)
            for range_pair in ranges:
                if isinstance(range_pair, list) and len(range_pair) == 2:
                    min_val, max_val = range_pair
                    # Extraer los últimos dígitos del Bin Id y verificar si están en el rango
                    bin_id_str = df_filtrado['Bin Id'].astype(str)
                    # Intentar extraer los últimos 3 dígitos
                    last_digits = bin_id_str.str.extract(r'(\d{3})$')[0].astype(float)
                    mask |= ((last_digits >= min_val) & (last_digits <= max_val))
            df_filtrado = df_filtrado[mask]
    
    # Filtrar por bin_id_exclude_patterns (patrones complejos de exclusión)
    if 'bin_id_exclude_patterns' in filtros:
        patterns = filtros['bin_id_exclude_patterns']
        if 'Bin Id' in df_filtrado.columns:
            indices_a_excluir = set()
            for pattern in patterns:
                pattern_df = df_filtrado.copy()
                
                # Aplicar filtros del patrón
                if 'aisle' in pattern:
                    aisles = pattern['aisle']
                    if isinstance(aisles, (int, float)):
                        aisles = [int(aisles)]
                    elif isinstance(aisles, list):
                        aisles = [int(a) for a in aisles]
                    if 'Aisle' in pattern_df.columns:
                        pattern_df = pattern_df[pattern_df['Aisle'].isin(aisles)]
                
                if 'bin_type' in pattern:
                    tipos = pattern['bin_type']
                    if isinstance(tipos, str):
                        tipos = [tipos]
                    if 'Bin Type' in pattern_df.columns:
                        pattern_df = pattern_df[pattern_df['Bin Type'].isin(tipos)]
                
                # Aplicar endswith_range
                if 'endswith_range' in pattern:
                    ranges = pattern['endswith_range']
                    pattern_mask = pd.Series([False] * len(pattern_df), index=pattern_df.index)
                    for range_pair in ranges:
                        if isinstance(range_pair, list) and len(range_pair) == 2:
                            min_val, max_val = range_pair
                            bin_id_str = pattern_df['Bin Id'].astype(str)
                            last_digits = bin_id_str.str.extract(r'(\d{3})$')[0].astype(float)
                            pattern_mask |= ((last_digits >= min_val) & (last_digits <= max_val))
                    pattern_df = pattern_df[pattern_mask]
                
                # Agregar índices a excluir
                indices_a_excluir.update(pattern_df.index.tolist())
            
            # Excluir estos registros
            if indices_a_excluir:
                df_filtrado = df_filtrado[~df_filtrado.index.isin(indices_a_excluir)]
    
    # Filtrar por exclude_categories (excluir zonas/categorías específicas)
    # Esto requiere una columna 'Zona' o similar en el CSV
    if 'exclude_categories' in filtros:
        categories_exclude = filtros['exclude_categories']
        if isinstance(categories_exclude, str):
            categories_exclude = [categories_exclude]
        # Buscar columna que pueda contener categorías/zonas
        # Puede ser 'Zona', 'Category', 'Categoria', etc.
        category_cols = [col for col in df_filtrado.columns if 'zona' in col.lower() or 'categor' in col.lower()]
        if category_cols:
            df_filtrado = df_filtrado[~df_filtrado[category_cols[0]].isin(categories_exclude)]
    
    # total_site: si es true, no filtrar (incluir todo)
    if filtros.get('total_site') == True:
        # Ya no aplicar más filtros, solo los que ya se aplicaron (warehouse_id, etc.)
        pass
    
    return df_filtrado


def procesar_zonas(df, reglas_path, output_dir=None, metricas_default=None, guardar_archivo=False, zonas_reglas_dict=None):
    """
    Procesa las zonas según las reglas definidas en el JSON.
    Soporta dos formatos:
    1. Formato simple (fullness_vlc1.json): con 'nombre', 'filtros', 'metricas'
    2. Formato avanzado (Zonas_reglas.json): filtros directos, sin 'nombre' ni 'metricas'
    
    Args:
        df: DataFrame con los datos procesados
        reglas_path: Ruta al archivo JSON con las reglas de zonas
        output_dir: Directorio donde guardar el JSON (opcional, solo si guardar_archivo=True)
        metricas_default: Lista de métricas por defecto si no se especifican (default: ['fullness'])
        guardar_archivo: Si True, guarda el archivo JSON (default: False)
        zonas_reglas_dict: Diccionario con las reglas de Zonas_reglas.json para resolver referencias 'zone'
    
    Returns:
        Diccionario con las zonas procesadas
    """
    print("[Zonas] Procesando zonas según reglas...")
    
    # Leer reglas de zonas
    if not os.path.exists(reglas_path):
        print(f"[ADVERTENCIA] No se encontro el archivo de reglas: {reglas_path}")
        return None
    
    with open(reglas_path, 'r', encoding='utf-8-sig') as f:
        reglas = json.load(f)
    
    print(f"[Zonas] Cargadas {len(reglas)} zonas desde {reglas_path}")
    
    # Asegurar que Fullness_Adjusted existe
    if 'Fullness_Adjusted' not in df.columns:
        df['Fullness_Adjusted'] = df['Fullness'].copy()
        locked_mask = df['IsLocked'] == True
        df.loc[locked_mask, 'Fullness_Adjusted'] = 1.0
    
    zonas_procesadas = {}
    
    if metricas_default is None:
        metricas_default = ['fullness']
    
    # Procesar cada zona
    for zona_id, zona_config in reglas.items():
        # Detectar formato: simple (tiene 'nombre' y 'filtros') o avanzado (filtros directos)
        if 'nombre' in zona_config:
            # Formato simple
            nombre = zona_config.get('nombre', zona_id)
            filtros = zona_config.get('filtros', {})
            metricas = zona_config.get('metricas', metricas_default)
        else:
            # Formato avanzado: usar zona_id como nombre, filtros son directos
            nombre = zona_id
            filtros = zona_config
            metricas = metricas_default  # Por defecto solo fullness
        
        print(f"[Zonas] Procesando zona: {nombre}")
        
        # Aplicar filtros (soporta ambos formatos)
        # Pasar zonas_reglas_dict para resolver referencias 'zone'
        df_filtrado = aplicar_filtros_avanzados(df, filtros, zonas_reglas_dict)
        
        if len(df_filtrado) == 0:
            print(f"[Zonas] [ADVERTENCIA] Zona {nombre}: No hay datos que coincidan con los filtros")
            zonas_procesadas[zona_id] = {
                'nombre': nombre,
                'datos': {}
            }
            continue
        
        # Calcular métricas solicitadas
        datos_zona = {}
        
        # Si no hay métricas especificadas, usar las por defecto
        if len(metricas) == 0:
            metricas = metricas_default
        
        if 'fullness' in metricas:
            avg_fullness = df_filtrado['Fullness_Adjusted'].mean()
            datos_zona['fullness'] = round(float(avg_fullness), 4) if not pd.isna(avg_fullness) else 0.0
        
        if 'total_bins' in metricas:
            datos_zona['total_bins'] = int(len(df_filtrado))
        
        if 'occupied_bins' in metricas:
            occupied = len(df_filtrado[df_filtrado['Fullness_Adjusted'] > 0])
            datos_zona['occupied_bins'] = int(occupied)
        
        if 'empty_bins' in metricas:
            empty = len(df_filtrado[df_filtrado['Fullness_Adjusted'] == 0])
            datos_zona['empty_bins'] = int(empty)
        
        if 'locked_bins' in metricas:
            locked = int(df_filtrado['IsLocked'].sum())
            datos_zona['locked_bins'] = locked
        
        if 'total_units' in metricas:
            total_units = int(df_filtrado['Total Units'].sum())
            datos_zona['total_units'] = total_units
        
        zonas_procesadas[zona_id] = {
            'nombre': nombre,
            'datos': datos_zona
        }
        
        print(f"[Zonas] [OK] {nombre}: {len(df_filtrado)} registros, {len(datos_zona)} metricas calculadas")
    
    # Guardar JSON de zonas procesadas solo si se solicita
    if guardar_archivo and output_dir:
        try:
            output_file = os.path.join(output_dir, 'Data_Fullness.json')
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(zonas_procesadas, f, indent=2, ensure_ascii=False)
            print(f"[OK] Data_Fullness.json generado: {output_file}")
        except Exception as e:
            print(f"[ERROR] No se pudo guardar Data_Fullness.json en procesar_zonas: {str(e)}")
            raise
    
    return zonas_procesadas


def procesar_stowmap(csv_path, output_dir):
    """
    Procesa el CSV de StowMap: limpia los datos y genera fullness por bintype.
    
    NOTA: Todos los cálculos usan la columna Fullness (no Utilization %).
    Utilization % se mantiene como dato original y solo se usa cuando se indique explícitamente.
    
    Args:
        csv_path: Ruta al archivo CSV de StowMap
        output_dir: Directorio donde guardar el JSON procesado
    """
    print(f"[Procesamiento] Leyendo CSV desde: {csv_path}")
    
    # Leer CSV original
    df = pd.read_csv(csv_path, low_memory=False)
    print(f"[Procesamiento] Total de registros: {len(df)}")
    
    # Corregir el CSV antes de procesarlo
    df = corregir_csv(df)
    
    # Sobrescribir CSV original si está habilitado
    if GUARDAR_CSV_CORREGIDO:
        try:
            # Asegurar que el directorio del CSV existe
            csv_dir = os.path.dirname(csv_path)
            if csv_dir and not os.path.exists(csv_dir):
                os.makedirs(csv_dir, exist_ok=True)
                print(f"[Procesamiento] Directorio del CSV creado: {csv_dir}")
            
            # Guardar CSV corregido
            df.to_csv(csv_path, index=False)
            print(f"[OK] CSV corregido sobrescrito en: {csv_path}")
            
            # Verificar que el archivo se guardó correctamente
            if os.path.exists(csv_path):
                file_size = os.path.getsize(csv_path)
                print(f"[OK] Archivo verificado: {file_size} bytes")
            else:
                print(f"[ERROR] El archivo no se guardó correctamente: {csv_path}")
        except PermissionError as e:
            print(f"[ERROR] Sin permisos para escribir en: {csv_path}")
            print(f"[ERROR] Detalle: {str(e)}")
        except Exception as e:
            print(f"[ERROR] Error al guardar CSV corregido: {str(e)}")
            import traceback
            traceback.print_exc()
    
    # Crear directorio de salida si no existe
    try:
        if not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
            print(f"[Procesamiento] Directorio creado: {output_dir}")
        else:
            print(f"[Procesamiento] Directorio de salida existe: {output_dir}")
    except Exception as e:
        print(f"[ERROR] No se pudo crear el directorio de salida: {output_dir}")
        print(f"[ERROR] Detalle: {str(e)}")
        raise
    
    # ============================================
    # FULLNESS POR BINTYPE (por Floor y Storage Area)
    # ============================================
    print("[Procesamiento] Calculando fullness por bintype (Floor + Storage Area)...")
    
    # La columna storage_area ya fue creada en corregir_csv()
    # Crear también Storage_Area (con mayúscula) para compatibilidad con código existente
    df['Storage_Area'] = df['storage_area']
    
    # Ajustar Fullness para bins bloqueadas: IsLocked = True → 100%
    # Crear columna Fullness_Adjusted basada en Fullness (columna principal)
    # NOTA: Se usa Fullness, NO Utilization %
    df['Fullness_Adjusted'] = df['Fullness'].copy()
    locked_mask = df['IsLocked'] == True
    df.loc[locked_mask, 'Fullness_Adjusted'] = 1.0
    print(f"[Info] Ajustadas {locked_mask.sum()} bins bloqueadas a 100% de fullness (usando columna Fullness)")
    
    fullness_by_bintype = {}
    
    # Agrupar por Floor → Storage Area → Bin Type
    for floor in sorted(df['Floor'].dropna().unique()):
        floor_data = df[df['Floor'] == floor]
        floor_int = int(floor)
        fullness_by_bintype[floor_int] = {}
        
        # Agrupar por Storage Area
        for storage_area in ['High Rack', 'Pallet Land', 'Pick Tower']:
            # Para Pick Tower, combinar B y C
            if storage_area == 'Pick Tower':
                area_data = floor_data[floor_data['Storage_Area'] == 'Pick Tower']
            else:
                area_data = floor_data[floor_data['Storage_Area'] == storage_area]
            
            if len(area_data) == 0:
                continue
            
            fullness_by_bintype[floor_int][storage_area] = {}
            
            # Agrupar por Bin Type
            for bintype in sorted(area_data['Bin Type'].dropna().unique()):
                bintype_data = area_data[area_data['Bin Type'] == bintype]
                total_bins = len(bintype_data)
                
                if total_bins == 0:
                    continue
                
                # Calcular fullness promedio usando Fullness_Adjusted
                avg_fullness = bintype_data['Fullness_Adjusted'].mean()
                
                # Contar bins bloqueadas
                locked_bins = int(bintype_data['IsLocked'].sum())
                
                # Estadísticas adicionales
                occupied_bins = len(bintype_data[bintype_data['Fullness_Adjusted'] > 0])
                empty_bins = total_bins - occupied_bins
                total_units = bintype_data['Total Units'].sum()
                
                fullness_by_bintype[floor_int][storage_area][str(bintype)] = {
                    'total_bins': int(total_bins),
                    'avg_fullness': round(float(avg_fullness), 4) if not pd.isna(avg_fullness) else 0.0,
                    'locked_bins': locked_bins,
                    'occupied_bins': int(occupied_bins),
                    'empty_bins': int(empty_bins),
                    'total_units': int(total_units)
                }
    
    # Guardar JSON
    try:
        json_path = os.path.join(output_dir, 'fullness_by_bintype.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(fullness_by_bintype, f, indent=2)
        print(f"[OK] fullness_by_bintype.json generado: {json_path}")
    except Exception as e:
        print(f"[ERROR] No se pudo guardar fullness_by_bintype.json: {str(e)}")
        raise
    
    # ============================================
    # SUMMARY KPIs (Métricas generales calculadas)
    # ============================================
    print("[Procesamiento] Calculando KPIs generales...")
    
    # Calcular fullness total: promedio directo de todas las bins
    # Usar Fullness_Adjusted (basado en Fullness, columna principal) que ya tiene bins bloqueadas ajustadas a 100%
    # NOTA: Se usa Fullness, NO Utilization %
    avg_fullness_all_bins = df['Fullness_Adjusted'].mean()
    fullness_total = float(avg_fullness_all_bins * 100) if not pd.isna(avg_fullness_all_bins) else 0.0
    
    # Calcular totales desde el DataFrame completo
    total_bins = len(df)
    total_occupied_bins = len(df[df['Fullness_Adjusted'] > 0])
    total_locked_bins = int(df['IsLocked'].sum())
    total_units = int(df['Total Units'].sum())
    
    # Calcular occupancy rate (porcentaje de bins ocupadas)
    occupancy_rate = (total_occupied_bins / total_bins * 100) if total_bins > 0 else 0.0
    
    summary_kpis = {
        'fullness_total': round(float(fullness_total), 2),
        'total_units': int(total_units),
        'total_bins': int(total_bins),
        'total_occupied_bins': int(total_occupied_bins),
        'total_locked_bins': int(total_locked_bins),
        'total_empty_bins': int(total_bins - total_occupied_bins),
        'occupancy_rate': round(float(occupancy_rate), 2),
        'processed_at': datetime.now().isoformat()
    }
    
    # Guardar JSON
    try:
        json_path = os.path.join(output_dir, 'summary_kpis.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(summary_kpis, f, indent=2)
        print(f"[OK] summary_kpis.json generado: {json_path}")
    except Exception as e:
        print(f"[ERROR] No se pudo guardar summary_kpis.json: {str(e)}")
        raise
    
    # ============================================
    # PROCESAR ZONAS SEGÚN REGLAS
    # ============================================
    # Determinar rutas de los archivos de reglas
    # Script está en: src/renderer/apps/space-heatmap/py/Procesar_StowMap.py
    # Reglas están en: src/renderer/apps/space-heatmap/js/Reglas/
    script_path = os.path.abspath(__file__)
    # Subir 1 nivel desde py/ a space-heatmap/
    space_heatmap_dir = os.path.dirname(os.path.dirname(script_path))
    reglas_dir = os.path.join(space_heatmap_dir, "js", "Reglas")
    
    # Si no existe, intentar ruta alternativa desde la raíz del proyecto
    if not os.path.exists(reglas_dir):
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(script_path))))))
        reglas_dir = os.path.join(project_root, "src", "renderer", "apps", "space-heatmap", "js", "Reglas")
    
    # Procesar zonas desde fullness_vlc1.json
    # NOTA: Zonas_reglas.json es solo un archivo de referencia para resolver 'zone',
    # NO genera datos en el JSON final. Solo fullness_vlc1.json genera datos.
    todas_las_zonas = {}
    
    # Cargar Zonas_reglas.json primero para resolver referencias 'zone' en fullness_vlc1.json
    # Este archivo es solo de referencia, NO se procesa para generar datos
    zonas_reglas_path = os.path.join(reglas_dir, "Zonas_reglas.json")
    zonas_reglas_dict = None
    if os.path.exists(zonas_reglas_path):
        print(f"[Zonas] Cargando Zonas_reglas.json como referencia para resolver 'zone': {zonas_reglas_path}")
        with open(zonas_reglas_path, 'r', encoding='utf-8-sig') as f:
            zonas_reglas_dict = json.load(f)
        print(f"[Zonas] Cargadas {len(zonas_reglas_dict)} zonas de referencia (solo para resolver 'zone', no se generan datos)")
    else:
        print(f"[ADVERTENCIA] No se encontro Zonas_reglas.json en: {zonas_reglas_path}")
    
    # Procesar SOLO fullness_vlc1.json (este es el único que genera datos en el JSON final)
    # Pasar zonas_reglas_dict para resolver referencias 'zone'
    fullness_path = os.path.join(reglas_dir, "fullness_vlc1.json")
    if os.path.exists(fullness_path):
        print(f"[Zonas] Procesando fullness_vlc1.json (genera datos en JSON final): {fullness_path}")
        resultado_fullness = procesar_zonas(df, fullness_path, output_dir, zonas_reglas_dict=zonas_reglas_dict)
        if resultado_fullness:
            todas_las_zonas.update(resultado_fullness)
    else:
        print(f"[ADVERTENCIA] No se encontro fullness_vlc1.json en: {fullness_path}")
    
    # Guardar todas las zonas combinadas en un solo archivo
    if todas_las_zonas:
        try:
            output_file = os.path.join(output_dir, 'Data_Fullness.json')
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(todas_las_zonas, f, indent=2, ensure_ascii=False)
            print(f"[OK] Total de {len(todas_las_zonas)} zonas guardadas en Data_Fullness.json: {output_file}")
        except Exception as e:
            print(f"[ERROR] No se pudo guardar Data_Fullness.json: {str(e)}")
            raise
    
    print("\n[EXITO] Procesamiento completado!")
    print(f"[EXITO] Ubicacion: {output_dir}")
    return True

if __name__ == '__main__':
    # Siempre usar userData (roaming) - ya no hay modo DEV
    if len(sys.argv) > 1:
        # Ejecutado desde Electron con userData path
        user_data_path = sys.argv[1]
        csv_path = os.path.join(user_data_path, "data", "space-heatmap", "Stowmap_data.csv")
        output_dir = os.path.join(user_data_path, "data", "space-heatmap", "processed")
        print(f"[Procesamiento] Ejecutado desde Electron - userData: {user_data_path}")
    else:
        # Ejecutado directamente - usar userData (roaming)
        # En Windows: C:\Users\{username}\AppData\Roaming\inbound-scope
        if platform.system() == 'Windows':
            appdata_roaming = os.getenv('APPDATA')
            if appdata_roaming:
                user_data_path = os.path.join(appdata_roaming, "inbound-scope")
                csv_path = os.path.join(user_data_path, "data", "space-heatmap", "Stowmap_data.csv")
                output_dir = os.path.join(user_data_path, "data", "space-heatmap", "processed")
                print(f"[Procesamiento] Usando userData (roaming): {user_data_path}")
            else:
                print("[ERROR] No se pudo encontrar APPDATA. No se puede determinar la ruta de userData.")
                sys.exit(1)
        else:
            # Linux/Mac: usar ~/.config/inbound-scope
            home = os.path.expanduser("~")
            user_data_path = os.path.join(home, ".config", "inbound-scope")
            csv_path = os.path.join(user_data_path, "data", "space-heatmap", "Stowmap_data.csv")
            output_dir = os.path.join(user_data_path, "data", "space-heatmap", "processed")
            print(f"[Procesamiento] Usando userData: {user_data_path}")
    
    print(f"[Procesamiento] CSV input: {csv_path}")
    print(f"[Procesamiento] JSON output: {output_dir}")
    
    # Verificar que existe el CSV
    if not os.path.exists(csv_path):
        print(f"[ERROR] No se encontro el archivo CSV: {csv_path}")
        print("[ERROR] Por favor, descarga los datos de StowMap primero.")
        sys.exit(1)
    
    # Procesar
    try:
        procesar_stowmap(csv_path, output_dir)
    except Exception as e:
        print(f"[ERROR] Error al procesar: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

