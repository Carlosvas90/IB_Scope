import pandas as pd
import json
import os
import sys
from datetime import datetime

def procesar_stowmap(csv_path, output_dir):
    """
    Procesa el CSV de StowMap y genera archivos JSON con métricas calculadas.
    
    Args:
        csv_path: Ruta al archivo CSV de StowMap
        output_dir: Directorio donde guardar los JSONs procesados
    """
    print(f"[Procesamiento] Leyendo CSV desde: {csv_path}")
    
    # Leer el CSV
    df = pd.read_csv(csv_path, low_memory=False)
    print(f"[Procesamiento] Total de registros: {len(df)}")
    
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
    # Determinar rutas según si se ejecuta desde Electron o directamente
    if len(sys.argv) > 1:
        # Ejecutado desde Electron con userData path
        user_data_path = sys.argv[1]
        csv_path = os.path.join(user_data_path, "data", "space-heatmap", "Stowmap_data.csv")
        output_dir = os.path.join(user_data_path, "data", "space-heatmap", "processed")
        print(f"[MODO BUILD] Procesando desde userData")
    else:
        # Ejecutado directamente - usar carpeta del proyecto
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

