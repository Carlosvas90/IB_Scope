import pandas as pd
import json
import os
import sys
import platform
from datetime import datetime

# ============================================
# CONFIGURACIÓN: MODO DESARROLLO
# ============================================
# Cambiar a True para usar archivos de ejemplo desde Ejemplos/data/space-heatmap/
# Cambiar a False para usar rutas normales (userData o proyecto)
MODO_DEV = False

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
    Procesa el CSV de StowMap: limpia los datos y genera fullness por bintype.
    
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
        df.to_csv(csv_path, index=False)
        print(f"[OK] CSV corregido sobrescrito en: {csv_path}")
    
    # Crear directorio de salida si no existe
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"[Procesamiento] Directorio creado: {output_dir}")
    
    # ============================================
    # FULLNESS POR BINTYPE (por Floor y Storage Area)
    # ============================================
    print("[Procesamiento] Calculando fullness por bintype (Floor + Storage Area)...")
    
    # Crear columna auxiliar para Storage Area
    # A = High Rack, F = Pallet Land, B/C = Pick Tower (combinados)
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
    
    df['Storage_Area'] = df['Mod'].apply(get_storage_area)
    
    # Ajustar Utilization % para bins bloqueadas: IsLocked = True → 100%
    # Crear columna de utilization ajustada
    df['Utilization_Adjusted'] = df['Utilization %'].copy()
    locked_mask = df['IsLocked'] == True
    df.loc[locked_mask, 'Utilization_Adjusted'] = 1.0
    print(f"[Info] Ajustadas {locked_mask.sum()} bins bloqueadas a 100% de utilización")
    
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
                
                # Calcular fullness promedio usando Utilization_Adjusted
                avg_fullness = bintype_data['Utilization_Adjusted'].mean()
                
                # Contar bins bloqueadas
                locked_bins = int(bintype_data['IsLocked'].sum())
                
                # Estadísticas adicionales
                occupied_bins = len(bintype_data[bintype_data['Utilization_Adjusted'] > 0])
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
    with open(os.path.join(output_dir, 'fullness_by_bintype.json'), 'w') as f:
        json.dump(fullness_by_bintype, f, indent=2)
    print("[OK] fullness_by_bintype.json generado")
    
    # ============================================
    # SUMMARY KPIs (Métricas generales calculadas)
    # ============================================
    print("[Procesamiento] Calculando KPIs generales...")
    
    # Calcular fullness total: promedio directo de todas las bins
    # Usar Utilization_Adjusted que ya tiene bins bloqueadas ajustadas a 100%
    avg_fullness_all_bins = df['Utilization_Adjusted'].mean()
    fullness_total = float(avg_fullness_all_bins * 100) if not pd.isna(avg_fullness_all_bins) else 0.0
    
    # Calcular totales desde el DataFrame completo
    total_bins = len(df)
    total_occupied_bins = len(df[df['Utilization_Adjusted'] > 0])
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
    with open(os.path.join(output_dir, 'summary_kpis.json'), 'w') as f:
        json.dump(summary_kpis, f, indent=2)
    print("[OK] summary_kpis.json generado")
    
    print("\n[EXITO] Procesamiento completado!")
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
        # Ejecutado directamente - usar userData (roaming)
        # En Windows: C:\Users\{username}\AppData\Roaming\inbound-scope
        if platform.system() == 'Windows':
            appdata_roaming = os.getenv('APPDATA')
            if appdata_roaming:
                user_data_path = os.path.join(appdata_roaming, "inbound-scope")
                csv_path = os.path.join(user_data_path, "data", "space-heatmap", "Stowmap_data.csv")
                output_dir = os.path.join(user_data_path, "data", "space-heatmap", "processed")
                print(f"[MODO BUILD] Procesando desde userData (roaming): {user_data_path}")
            else:
                # Fallback: usar carpeta del proyecto
                project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
                csv_path = os.path.join(project_root, "data", "space-heatmap", "Stowmap_data.csv")
                output_dir = os.path.join(project_root, "data", "space-heatmap", "processed")
                print(f"[MODO DESARROLLO] APPDATA no encontrado, usando proyecto")
        else:
            # Linux/Mac: usar ~/.config/inbound-scope
            home = os.path.expanduser("~")
            user_data_path = os.path.join(home, ".config", "inbound-scope")
            csv_path = os.path.join(user_data_path, "data", "space-heatmap", "Stowmap_data.csv")
            output_dir = os.path.join(user_data_path, "data", "space-heatmap", "processed")
            print(f"[MODO BUILD] Procesando desde userData: {user_data_path}")
    
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

