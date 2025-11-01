import pandas as pd
import json
import os
import sys
from datetime import datetime

# ============================================
# CONFIGURACIÓN: MODO DESARROLLO
# ============================================
# Cambiar a True para usar archivos de ejemplo desde Ejemplos/data/space-heatmap/
# Cambiar a False para usar rutas normales (userData o proyecto)
MODO_DEV = True

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
    2. Convierte Utilization % de valores enteros (48.00) a decimales (0.48)
    3. Para Bin Type = PALLET-SINGLE: si Utilization % > 0, cambiar a 1.0 (100%)
    
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
    max_util = df['Utilization %'].max()
    if not pd.isna(max_util) and max_util > 1:
        print(f"[Correccion] Convirtiendo Utilization % de enteros a decimales (max encontrado: {max_util})...")
        df.loc[:, 'Utilization %'] = df['Utilization %'] / 100.0
        print("[OK] Utilization % convertido a decimales (0-1)")
    else:
        print("[OK] Utilization % ya está en formato decimal")
    
    # 2. Corregir PALLET-SINGLE: si Utilization % > 0, cambiar a 1.0
    if 'Bin Type' in df.columns:
        pallet_single_mask = df['Bin Type'] == 'PALLET-SINGLE'
        pallet_single_count = pallet_single_mask.sum()
        
        if pallet_single_count > 0:
            # Para PALLET-SINGLE, si Utilization % > 0, cambiar a 1.0
            # Mantener 0 si ya es 0
            pallet_single_with_util = pallet_single_mask & (df['Utilization %'] > 0)
            corrected_count = pallet_single_with_util.sum()
            
            if corrected_count > 0:
                df.loc[pallet_single_with_util, 'Utilization %'] = 1.0
                print(f"[OK] Corregidos {corrected_count} registros PALLET-SINGLE con Utilization % > 0 (cambiados a 1.0)")
            else:
                print(f"[OK] {pallet_single_count} registros PALLET-SINGLE encontrados, todos con Utilization % = 0")
        else:
            print("[OK] No se encontraron registros PALLET-SINGLE")
    else:
        print("[ADVERTENCIA] No se encontro la columna 'Bin Type'")
    
    print("[OK] Correcciones aplicadas correctamente")
    return df


def procesar_stowmap(csv_path, output_dir):
    """
    Procesa el CSV de StowMap y genera archivos JSON con métricas calculadas.
    
    Args:
        csv_path: Ruta al archivo CSV de StowMap
        output_dir: Directorio donde guardar los JSONs procesados
    """
    print(f"[Procesamiento] Leyendo CSV desde: {csv_path}")
    
    # Leer CSV original
    df = pd.read_csv(csv_path, low_memory=False)
    print(f"[Procesamiento] Total de registros: {len(df)}")
    
    # Corregir el CSV antes de procesarlo
    df = corregir_csv(df)
    
    # Sobrescribir CSV original si está habilitado
    if GUARDAR_CSV_CORREGIDO:
        df.to_csv(csv_path, index=False)
        print(f"[OK] CSV corregido sobrescrito en: {csv_path}")
    
    # Crear directorio de salida si no existe
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"[Procesamiento] Directorio creado: {output_dir}")
    
    # ============================================
    # 1. FULLNESS POR FLOOR
    # ============================================
    print("[Procesamiento] Calculando fullness por floor...")
    fullness_by_floor = {}
    
    for floor in sorted(df['Floor'].unique()):
        # Saltar valores NaN
        if pd.isna(floor):
            continue
            
        floor_data = df[df['Floor'] == floor]
        total_bins = len(floor_data)
        
        # Saltar si no hay bins en este piso
        if total_bins == 0:
            continue
            
        occupied_bins = len(floor_data[floor_data['Total Units'] > 0])
        empty_bins = total_bins - occupied_bins
        avg_utilization = floor_data['Utilization %'].mean()
        total_units = floor_data['Total Units'].sum()
        
        fullness_by_floor[int(floor)] = {
            'total_bins': int(total_bins),
            'occupied_bins': int(occupied_bins),
            'empty_bins': int(empty_bins),
            'occupancy_rate': round(float((occupied_bins / total_bins) * 100), 2) if total_bins > 0 else 0.0,
            'avg_utilization': round(float(avg_utilization), 2) if not pd.isna(avg_utilization) else 0.0,
            'total_units': int(total_units)
        }
    
    # Guardar JSON
    with open(os.path.join(output_dir, 'fullness_by_floor.json'), 'w') as f:
        json.dump(fullness_by_floor, f, indent=2)
    print("[OK] fullness_by_floor.json generado")
    
    # ============================================
    # 2. FULLNESS POR BINTYPE
    # ============================================
    print("[Procesamiento] Calculando fullness por bintype...")
    fullness_by_bintype = {}
    
    for bintype in df['Bin Type'].unique():
        if pd.isna(bintype):
            continue
        bintype_data = df[df['Bin Type'] == bintype]
        total_bins = len(bintype_data)
        
        if total_bins == 0:
            continue
            
        occupied_bins = len(bintype_data[bintype_data['Total Units'] > 0])
        empty_bins = total_bins - occupied_bins
        avg_utilization = bintype_data['Utilization %'].mean()
        total_units = bintype_data['Total Units'].sum()
        
        fullness_by_bintype[str(bintype)] = {
            'total_bins': int(total_bins),
            'occupied_bins': int(occupied_bins),
            'empty_bins': int(empty_bins),
            'occupancy_rate': round(float((occupied_bins / total_bins) * 100), 2) if total_bins > 0 else 0.0,
            'avg_utilization': round(float(avg_utilization), 2) if not pd.isna(avg_utilization) else 0.0,
            'total_units': int(total_units)
        }
    
    # Ordenar por total_bins descendente
    fullness_by_bintype = dict(sorted(
        fullness_by_bintype.items(), 
        key=lambda x: x[1]['total_bins'], 
        reverse=True
    ))
    
    # Guardar JSON
    with open(os.path.join(output_dir, 'fullness_by_bintype.json'), 'w') as f:
        json.dump(fullness_by_bintype, f, indent=2)
    print("[OK] fullness_by_bintype.json generado")
    
    # ============================================
    # 3. ESTADÍSTICAS GENERALES
    # ============================================
    print("[Procesamiento] Calculando estadisticas generales...")
    total_bins = len(df)
    occupied_bins = len(df[df['Total Units'] > 0])
    empty_bins = total_bins - occupied_bins
    in_use_bins = len(df[df['InUse'] == True])
    locked_bins = len(df[df['IsLocked'] == True])
    total_units = df['Total Units'].sum()
    avg_utilization = df['Utilization %'].mean()
    
    summary_stats = {
        'total_bins': int(total_bins),
        'occupied_bins': int(occupied_bins),
        'empty_bins': int(empty_bins),
        'in_use_bins': int(in_use_bins),
        'locked_bins': int(locked_bins),
        'total_units': int(total_units),
        'occupancy_rate': round(float((occupied_bins / total_bins) * 100), 2),
        'avg_utilization': round(float(avg_utilization), 2),
        'floors': int(df['Floor'].nunique()),
        'bin_types': int(df['Bin Type'].nunique()),
        'processed_at': datetime.now().isoformat()
    }
    
    # Guardar JSON
    with open(os.path.join(output_dir, 'summary_stats.json'), 'w') as f:
        json.dump(summary_stats, f, indent=2)
    print("[OK] summary_stats.json generado")
    
    # ============================================
    # 4. FULLNESS POR MOD
    # ============================================
    print("[Procesamiento] Calculando fullness por mod...")
    fullness_by_mod = {}
    
    # Filtrar NaN y convertir a string para ordenar correctamente
    mods = df['Mod'].dropna().unique()
    # Convertir todos a string para permitir ordenamiento
    mods_str = [str(mod) for mod in mods]
    mods_sorted = sorted(mods_str)
    
    for mod_str in mods_sorted:
        # Filtrar datos usando comparación de string
        mod_data = df[df['Mod'].astype(str) == mod_str]
        total_bins = len(mod_data)
        
        if total_bins == 0:
            continue
            
        occupied_bins = len(mod_data[mod_data['Total Units'] > 0])
        avg_utilization = mod_data['Utilization %'].mean()
        
        fullness_by_mod[mod_str] = {
            'total_bins': int(total_bins),
            'occupied_bins': int(occupied_bins),
            'empty_bins': int(total_bins - occupied_bins),
            'occupancy_rate': round(float((occupied_bins / total_bins) * 100), 2) if total_bins > 0 else 0.0,
            'avg_utilization': round(float(avg_utilization), 2) if not pd.isna(avg_utilization) else 0.0
        }
    
    # Guardar JSON
    with open(os.path.join(output_dir, 'fullness_by_mod.json'), 'w') as f:
        json.dump(fullness_by_mod, f, indent=2)
    print("[OK] fullness_by_mod.json generado")
    
    # ============================================
    # 5. FULLNESS POR SHELF
    # ============================================
    print("[Procesamiento] Calculando fullness por shelf...")
    fullness_by_shelf = {}
    
    for shelf in sorted(df['Shelf'].unique()):
        if pd.isna(shelf):
            continue
        shelf_data = df[df['Shelf'] == shelf]
        total_bins = len(shelf_data)
        
        if total_bins == 0:
            continue
            
        occupied_bins = len(shelf_data[shelf_data['Total Units'] > 0])
        avg_utilization = shelf_data['Utilization %'].mean()
        
        fullness_by_shelf[str(shelf)] = {
            'total_bins': int(total_bins),
            'occupied_bins': int(occupied_bins),
            'empty_bins': int(total_bins - occupied_bins),
            'occupancy_rate': round(float((occupied_bins / total_bins) * 100), 2) if total_bins > 0 else 0.0,
            'avg_utilization': round(float(avg_utilization), 2) if not pd.isna(avg_utilization) else 0.0
        }
    
    # Guardar JSON
    with open(os.path.join(output_dir, 'fullness_by_shelf.json'), 'w') as f:
        json.dump(fullness_by_shelf, f, indent=2)
    print("[OK] fullness_by_shelf.json generado")
    
    # ============================================
    # 6. HEATMAP ZONES (Floor + Mod combinado)
    # ============================================
    print("[Procesamiento] Calculando heatmap zones...")
    heatmap_zones = {}
    
    for floor in sorted(df['Floor'].unique()):
        if pd.isna(floor):
            continue
            
        floor_data = df[df['Floor'] == floor]
        heatmap_zones[int(floor)] = {}
        
        for mod in sorted(floor_data['Mod'].unique()):
            if pd.isna(mod):
                continue
            zone_data = floor_data[floor_data['Mod'] == mod]
            total_bins = len(zone_data)
            
            if total_bins == 0:
                continue
                
            occupied_bins = len(zone_data[zone_data['Total Units'] > 0])
            avg_utilization = zone_data['Utilization %'].mean()
            
            # Asegurarse de que avg_utilization no sea NaN
            if pd.isna(avg_utilization):
                avg_utilization = 0.0
            
            heatmap_zones[int(floor)][str(mod)] = {
                'total_bins': int(total_bins),
                'occupied_bins': int(occupied_bins),
                'occupancy_rate': round(float((occupied_bins / total_bins) * 100), 2) if total_bins > 0 else 0.0,
                'avg_utilization': round(float(avg_utilization), 2),
                'intensity': 'high' if avg_utilization > 70 else 'medium' if avg_utilization > 40 else 'low'
            }
    
    # Guardar JSON
    with open(os.path.join(output_dir, 'heatmap_zones.json'), 'w') as f:
        json.dump(heatmap_zones, f, indent=2)
    print("[OK] heatmap_zones.json generado")
    
    # ============================================
    # 7. TOP BINS (Más utilizados y más vacíos)
    # ============================================
    print("[Procesamiento] Calculando top bins...")
    
    # Top 20 bins más utilizados
    top_utilized = df.nlargest(20, 'Utilization %')[['Bin Id', 'Bin Type', 'Floor', 'Mod', 'Utilization %', 'Total Units']].to_dict('records')
    
    # Top 20 bins con más unidades
    top_units = df.nlargest(20, 'Total Units')[['Bin Id', 'Bin Type', 'Floor', 'Mod', 'Utilization %', 'Total Units']].to_dict('records')
    
    # Bins vacíos por tipo
    empty_bins_by_type = {}
    for bintype in df['Bin Type'].unique():
        if pd.isna(bintype):
            continue
        empty_count = len(df[(df['Bin Type'] == bintype) & (df['Total Units'] == 0)])
        empty_bins_by_type[str(bintype)] = int(empty_count)
    
    top_bins = {
        'top_utilized': top_utilized,
        'top_units': top_units,
        'empty_bins_by_type': empty_bins_by_type
    }
    
    # Guardar JSON
    with open(os.path.join(output_dir, 'top_bins.json'), 'w') as f:
        json.dump(top_bins, f, indent=2)
    print("[OK] top_bins.json generado")
    
    print("\n[EXITO] Todos los archivos JSON generados correctamente!")
    print(f"[EXITO] Ubicacion: {output_dir}")
    return True

if __name__ == '__main__':
    # Determinar rutas según configuración
    if MODO_DEV:
        # MODO DEV: Usar archivos de ejemplo desde Ejemplos/
        # Subir 6 niveles: py -> space-heatmap -> apps -> renderer -> src -> raíz
        script_path = os.path.abspath(__file__)
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(script_path))))))
        csv_path = os.path.join(project_root, "Ejemplos", "data", "space-heatmap", "Stowmap_data.csv")
        output_dir = os.path.join(project_root, "Ejemplos", "data", "space-heatmap", "processed")
        print(f"[MODO DEV] Procesando desde Ejemplos/data/space-heatmap/")
    elif len(sys.argv) > 1:
        # Ejecutado desde Electron con userData path (MODO BUILD)
        user_data_path = sys.argv[1]
        csv_path = os.path.join(user_data_path, "data", "space-heatmap", "Stowmap_data.csv")
        output_dir = os.path.join(user_data_path, "data", "space-heatmap", "processed")
        print(f"[MODO BUILD] Procesando desde userData")
    else:
        # Ejecutado directamente - usar carpeta del proyecto (MODO DESARROLLO NORMAL)
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
        csv_path = os.path.join(project_root, "data", "space-heatmap", "Stowmap_data.csv")
        output_dir = os.path.join(project_root, "data", "space-heatmap", "processed")
        print(f"[MODO DESARROLLO] Procesando desde proyecto")
    
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

