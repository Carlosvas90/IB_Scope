#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para generar Heatmaps SVG por Floor desde datos del CSV procesado
Versión adaptada para la aplicación IB_Scope - Genera SVGs con clases CSS
"""

import pandas as pd
import xml.etree.ElementTree as ET
import os
import sys
import re
from datetime import datetime

# ============================================
# CONFIGURACIÓN: MODO DESARROLLO
# ============================================
# Cambiar a True para usar archivos de ejemplo desde Ejemplos/data/space-heatmap/
# Cambiar a False para usar rutas normales (userData o proyecto)
MODO_DEV = False

# ============================================
# CONFIGURACIÓN DE HEATMAPS
# ============================================
# Configuración de SVGs a procesar (pisos disponibles)
SVG_CONFIG = {
    'P1': True,
    'P2': True,
    'P3': True,
    'P4': True,
    'P5': True,
    'HRK': True,  # High Rack
    'PL': True,   # Pallet Land
}

def obtener_color_fullness(nivel):
    """
    Calcula el color RGB basado en el nivel de fullness (0.0 a 1.0)
    Transición de 5 colores: verde pino → verde manzana → amarillo canario → amarillo mango → rojo carmesí
    """
    nivel = max(0, min(1, float(nivel)))  # asegurar que esté entre 0 y 1
    
    # Umbrales de color
    umbral_verde_manzana = 0.60
    umbral_amarillo_canario = 0.70
    umbral_amarillo_mango = 0.85
    umbral_rojo_carmesi = 1.0

    if nivel <= umbral_verde_manzana:
        porcentaje = nivel / umbral_verde_manzana
        r = int(34 + (0 - 34) * porcentaje)
        g = int(139 + (128 - 139) * porcentaje)
        b = 34
    elif nivel <= umbral_amarillo_canario:
        porcentaje = (nivel - umbral_verde_manzana) / (umbral_amarillo_canario - umbral_verde_manzana)
        r = int(0 + (255 - 0) * porcentaje)
        g = int(128 + (255 - 128) * porcentaje)
        b = 0
    elif nivel <= umbral_amarillo_mango:
        porcentaje = (nivel - umbral_amarillo_canario) / (umbral_amarillo_mango - umbral_amarillo_canario)
        r = 255
        g = int(255 + (165 - 255) * porcentaje)
        b = 0
    else:
        porcentaje = (nivel - umbral_amarillo_mango) / (umbral_rojo_carmesi - umbral_amarillo_mango)
        r = int(255 + (220 - 255) * porcentaje)
        g = int(165 + (20 - 165) * porcentaje)
        b = int(0 + (60 - 0) * porcentaje)

    r, g, b = max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b))
    return f"rgb({r},{g},{b})"

def obtener_clase_fullness(nivel):
    """
    Genera una clase CSS basada en el nivel de fullness para fácil estilización
    """
    nivel = max(0, min(1, float(nivel)))
    
    if nivel <= 0.60:
        return "fullness-low"
    elif nivel <= 0.70:
        return "fullness-medium"
    elif nivel <= 0.85:
        return "fullness-high"
    else:
        return "fullness-very-high"

def generar_heatmap_svg(svg_path, csv_path, output_path):
    """
    Genera un heatmap SVG desde un SVG base y datos CSV
    Agrega clases CSS y atributos data-* para fácil manipulación
    """
    print(f"[Heatmap] Procesando: {os.path.basename(svg_path)}")
    
    # Verificar que existe el SVG
    if not os.path.exists(svg_path):
        print(f"[ERROR] SVG no encontrado: {svg_path}")
        return False
    
    # Verificar que existe el CSV
    if not os.path.exists(csv_path):
        print(f"[ERROR] CSV no encontrado: {csv_path}")
        return False
    
    # Leer CSV con datos de fullness
    try:
        df = pd.read_csv(csv_path, low_memory=False)
        print(f"[Heatmap] CSV leído: {len(df)} registros")
    except Exception as e:
        print(f"[ERROR] Error al leer CSV: {e}")
        return False
    
    # Verificar columnas necesarias
    if 'Floor' not in df.columns or 'Mod' not in df.columns or 'Utilization %' not in df.columns:
        print("[ERROR] CSV no tiene las columnas necesarias (Floor, Mod, Utilization %)")
        return False
    
    # Ajustar Utilization % para bins bloqueadas: IsLocked = True → 100%
    if 'IsLocked' in df.columns:
        df['Utilization_Adjusted'] = df['Utilization %'].copy()
        locked_mask = df['IsLocked'] == True
        df.loc[locked_mask, 'Utilization_Adjusted'] = 1.0
        print(f"[Heatmap] Ajustadas {locked_mask.sum()} bins bloqueadas a 100%")
    else:
        df['Utilization_Adjusted'] = df['Utilization %']
    
    # Extraer tipo del nombre del SVG (P1, P2, HRK, PL, etc.)
    svg_name = os.path.basename(svg_path).replace('.svg', '')
    
    # Verificar que existe la columna Bay Id
    if 'Bay Id' not in df.columns:
        print("[ERROR] CSV no tiene la columna 'Bay Id'")
        return False
    
    # Determinar si es un piso (P1-P5) o un área de almacenamiento especial (HRK, PL)
    if svg_name.startswith('P') and len(svg_name) == 2:
        # Es un piso normal (P1, P2, etc.)
        piso_num_str = svg_name[1:]
        piso_num = float(piso_num_str)
        
        # Filtrar datos por piso (Floor es float64: 1.0, 2.0, etc.)
        df_filtrado = df[df['Floor'] == piso_num].copy()
        if df_filtrado.empty:
            print(f"[ADVERTENCIA] No hay datos para el piso {piso_num}")
            return False
        
        # Convertir Bay Id al formato del SVG
        # BAY-P-1-B294A200 → P1-294A200
        # BAY-P-3-C288A460 → P3-288A460
        def convertir_bay_id_a_svg(bay_id):
            """
            Convierte BAY-P-{floor}-{MOD}{numero} a P{floor}-{numero}
            Soporta MOD B y MOD C (la letra del MOD se omite en el SVG)
            Ejemplos:
            - BAY-P-1-B294A200 → P1-294A200
            - BAY-P-3-C288A460 → P3-288A460
            """
            if pd.isna(bay_id):
                return None
            
            bay_id_str = str(bay_id)
            # Patrón: BAY-P-{floor}-{MOD}{numero}
            # MOD puede ser B o C, pero se omite en el formato del SVG
            # Ejemplos:
            # - BAY-P-1-B294A200 (MOD B) → P1-294A200
            # - BAY-P-3-C288A460 (MOD C) → P3-288A460
            match = re.match(r'BAY-P-(\d+)-[BC](.+)', bay_id_str)
            if match:
                floor = match.group(1)
                resto = match.group(2)  # El resto sin la letra del MOD
                return f'P{floor}-{resto}'
            return None
        
        # Agregar columna con ID del SVG
        df_filtrado['SVG_Bay_Id'] = df_filtrado['Bay Id'].apply(convertir_bay_id_a_svg)
        
    elif svg_name == 'HRK':
        # High Rack - filtrar por storage_area
        if 'storage_area' not in df.columns:
            print("[ERROR] CSV no tiene la columna 'storage_area'")
            return False
        
        df_filtrado = df[df['storage_area'] == 'High Rack'].copy()
        if df_filtrado.empty:
            print(f"[ADVERTENCIA] No hay datos para High Rack")
            return False
        
        # Convertir Bay Id al formato del SVG para HRK
        # BAY-P-{floor}-A{numero} → HRK-{numero}
        def convertir_bay_id_a_svg(bay_id):
            """
            Convierte BAY-P-{floor}-A{numero} a HRK-{numero}
            Ejemplo: BAY-P-1-A250A200 → HRK-250A200
            """
            if pd.isna(bay_id):
                return None
            
            bay_id_str = str(bay_id)
            # Patrón: BAY-P-{floor}-A{numero}
            match = re.match(r'BAY-P-\d+-A(.+)', bay_id_str)
            if match:
                resto = match.group(1)
                return f'HRK-{resto}'
            return None
        
        df_filtrado['SVG_Bay_Id'] = df_filtrado['Bay Id'].apply(convertir_bay_id_a_svg)
        
    elif svg_name == 'PL':
        # Pallet Land - filtrar por storage_area
        if 'storage_area' not in df.columns:
            print("[ERROR] CSV no tiene la columna 'storage_area'")
            return False
        
        df_filtrado = df[df['storage_area'] == 'Pallet Land'].copy()
        if df_filtrado.empty:
            print(f"[ADVERTENCIA] No hay datos para Pallet Land")
            return False
        
        # Convertir Bay Id al formato del SVG para Pallet Land
        # BAY-PL-B{numero} → PL-{numero}
        def convertir_bay_id_a_svg(bay_id):
            """
            Convierte BAY-PL-B{numero} a PL-{numero}
            """
            if pd.isna(bay_id):
                return None
            
            bay_id_str = str(bay_id)
            # Patrón: BAY-PL-B{numero}
            match = re.match(r'BAY-PL-B(.+)', bay_id_str)
            if match:
                resto = match.group(1)
                return f'PL-{resto}'
            return None
        
        df_filtrado['SVG_Bay_Id'] = df_filtrado['Bay Id'].apply(convertir_bay_id_a_svg)
    else:
        print(f"[ERROR] Tipo de SVG no reconocido: {svg_name}")
        return False
    
    # Filtrar solo los que tienen ID válido
    df_filtrado = df_filtrado[df_filtrado['SVG_Bay_Id'].notna()].copy()
    
    if df_filtrado.empty:
        print(f"[ADVERTENCIA] No hay Bay Ids válidos para {svg_name}")
        return False
    
    # Agrupar por SVG_Bay_Id y calcular fullness promedio y tipos de bin
    fullness_por_bay = df_filtrado.groupby('SVG_Bay_Id')['Utilization_Adjusted'].mean().to_dict()
    
    # Obtener tipos de bin más comunes por bay (para filtrado)
    bin_types_por_bay = {}
    if 'Bin Type' in df_filtrado.columns:
        for bay_id, group in df_filtrado.groupby('SVG_Bay_Id'):
            bin_types = group['Bin Type'].value_counts()
            if not bin_types.empty:
                # Guardar el tipo más común y todos los tipos únicos
                bin_types_por_bay[bay_id] = {
                    'primary': bin_types.index[0],
                    'all': list(bin_types.index.unique())
                }
    
    print(f"[Heatmap] Fullness calculado para {len(fullness_por_bay)} bays")
    
    # Leer SVG como texto para preservar estructura
    try:
        with open(svg_path, "r", encoding="utf-8") as file:
            svg_content = file.read()
    except Exception as e:
        print(f"[ERROR] Error al leer SVG: {e}")
        return False
    
    # Parsear SVG con ElementTree
    try:
        # Namespace para SVG
        ET.register_namespace('', 'http://www.w3.org/2000/svg')
        root = ET.fromstring(svg_content)
        
        # Namespace dictionary para búsquedas
        ns = {'svg': 'http://www.w3.org/2000/svg'}
    except Exception as e:
        print(f"[ERROR] Error al parsear SVG: {e}")
        return False
    
    # Buscar todos los elementos con ID
    elementos_coloreados = 0
    elementos_bloqueados = 0
    
    # Recorrer todos los elementos
    for elem in root.iter():
        elem_id = elem.get('id')
        if not elem_id:
            continue
        
        # Buscar fullness para este elemento por ID del SVG
        # Los IDs en el SVG son del formato: P1-294A200
        fullness = None
        bay_id_svg = None
        
        # Buscar directamente en el diccionario
        if elem_id in fullness_por_bay:
            fullness = fullness_por_bay[elem_id]
            bay_id_svg = elem_id
        else:
            # Si no coincide exactamente, continuar (no hay datos para este elemento)
            continue
        
        if pd.isna(fullness):
            continue
        
        # Calcular color y clase
        color = obtener_color_fullness(fullness)
        clase = obtener_clase_fullness(fullness)
        
        # Verificar si está bloqueado
        es_bloqueado = False
        if 'IsLocked' in df.columns:
            bay_data = df_filtrado[df_filtrado['SVG_Bay_Id'] == bay_id_svg]
            if not bay_data.empty and bay_data['IsLocked'].any():
                es_bloqueado = True
        
        # Agregar clases CSS
        clases_existentes = elem.get('class', '').split()
        if clase not in clases_existentes:
            clases_existentes.append(clase)
        if es_bloqueado and 'locked' not in clases_existentes:
            clases_existentes.append('locked')
        elem.set('class', ' '.join(clases_existentes))
        
        # Agregar atributos data-* para fácil acceso desde JavaScript/CSS
        elem.set('data-fullness', str(round(fullness, 4)))
        elem.set('data-bay-id', str(bay_id_svg))
        
        # Agregar información de tipos de bin si está disponible
        if bay_id_svg in bin_types_por_bay:
            bin_info = bin_types_por_bay[bay_id_svg]
            elem.set('data-bin-type-primary', bin_info['primary'])
            elem.set('data-bin-types', ','.join(bin_info['all']))
        
        if es_bloqueado:
            elem.set('data-locked', 'true')
            color = "rgb(186,186,186)"  # Gris para bloqueadas
            elementos_bloqueados += 1
        else:
            elem.set('data-locked', 'false')
        
        # Aplicar color via style (como fallback si CSS no se carga)
        estilo = elem.get('style', '')
        # Remover fill existente del estilo
        partes_estilo = [p.strip() for p in estilo.split(';') if p.strip() and not p.strip().startswith('fill:')]
        partes_estilo.append(f'fill:{color}')
        elem.set('style', '; '.join(partes_estilo))
        
        # También agregar fill como atributo directo (para compatibilidad)
        elem.set('fill', color)
        
        elementos_coloreados += 1
    
    print(f"[Heatmap] Elementos coloreados: {elementos_coloreados}")
    if elementos_bloqueados > 0:
        print(f"[Heatmap] Elementos bloqueados (gris): {elementos_bloqueados}")
    
    # Buscar el elemento <defs> o agregar uno nuevo
    # Buscar con namespace
    defs = root.find('.//{http://www.w3.org/2000/svg}defs')
    if defs is None:
        # Crear elemento defs con namespace
        defs = ET.Element('{http://www.w3.org/2000/svg}defs')
        # Insertar después del primer elemento (normalmente <svg>)
        if len(root) > 0:
            root.insert(0, defs)
        else:
            root.append(defs)
    
    # Agregar estilos CSS inline al SVG (opcional, para preview)
    # Los estilos se pueden sobrescribir desde la app
    styles_elem = ET.Element('{http://www.w3.org/2000/svg}style')
    styles_elem.text = """
    .fullness-low { opacity: 0.8; }
    .fullness-medium { opacity: 0.9; }
    .fullness-high { opacity: 1.0; }
    .fullness-very-high { opacity: 1.0; }
    .locked { fill: rgb(186,186,186) !important; }
    .heatmap-element:hover { opacity: 0.7; cursor: pointer; }
    """
    defs.append(styles_elem)
    
    # Guardar SVG
    try:
        # Convertir a string preservando formato
        # ET.indent solo disponible en Python 3.9+, usar alternativa
        try:
            ET.indent(root, space="  ")
        except AttributeError:
            # Python < 3.9, no hay indent disponible, continuar sin él
            pass
        svg_str = ET.tostring(root, encoding='utf-8', method='xml').decode('utf-8')
        
        # Asegurar que tenga el header XML correcto
        if not svg_str.startswith('<?xml'):
            svg_str = '<?xml version="1.0" encoding="UTF-8"?>\n' + svg_str
        
        # Guardar
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(svg_str)
        
        print(f"[OK] Heatmap SVG generado: {output_path}")
        return True
        
    except Exception as e:
        print(f"[ERROR] Error al guardar SVG: {e}")
        return False

def main():
    """
    Función principal
    """
    print("[Heatmap] Iniciando generacion de Heatmaps SVG...")
    
    # Obtener root del proyecto (siempre)
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))))
    
    # SVG dir SIEMPRE desde assets (son los templates base de la aplicación)
    svg_dir = os.path.join(project_root, "assets", "svg", "Space_Heatmaps")
    
    # Determinar rutas según configuración
    if MODO_DEV:
        data_dir = os.path.join(project_root, "Ejemplos", "data", "space-heatmap")
        output_dir = os.path.join(data_dir, "heatmaps")
        csv_path = os.path.join(data_dir, "Stowmap_data.csv")
        print(f"[MODO DEV] Procesando desde Ejemplos/data/space-heatmap/")
    elif len(sys.argv) > 1:
        user_data_path = sys.argv[1]
        data_dir = os.path.join(user_data_path, "data", "space-heatmap")
        output_dir = os.path.join(data_dir, "heatmaps")
        csv_path = os.path.join(data_dir, "Stowmap_data.csv")
        print(f"[MODO BUILD] Procesando desde userData")
    else:
        data_dir = os.path.join(project_root, "data", "space-heatmap")
        output_dir = os.path.join(data_dir, "heatmaps")
        csv_path = os.path.join(data_dir, "Stowmap_data.csv")
        print(f"[MODO DESARROLLO] Procesando desde proyecto")
    
    print(f"[Heatmap] CSV input: {csv_path}")
    print(f"[Heatmap] SVG templates: {svg_dir}")
    print(f"[Heatmap] Output dir: {output_dir}")
    
    # Crear directorio de salida
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"[Heatmap] Directorio creado: {output_dir}")
    
    # Verificar que exista el directorio de SVGs
    if not os.path.exists(svg_dir):
        print(f"[ADVERTENCIA] ADVERTENCIA: Directorio de SVGs no encontrado: {svg_dir}")
        print(f"   Crea el directorio y coloca los SVGs (P1.svg, P2.svg, etc.) allí")
        return
    
    # Procesar cada SVG habilitado
    resultados = []
    svgs_encontrados = False
    
    for svg_name, habilitado in SVG_CONFIG.items():
        if not habilitado:
            continue
        
        svg_path = os.path.join(svg_dir, f"{svg_name}.svg")
        if not os.path.exists(svg_path):
            print(f"[ADVERTENCIA] SVG no encontrado: {svg_path} - omitiendo")
            continue
        
        svgs_encontrados = True
        output_path = os.path.join(output_dir, f"{svg_name}_heatmap.svg")
        
        resultado = generar_heatmap_svg(svg_path, csv_path, output_path)
        resultados.append((svg_name, resultado))
    
    if not svgs_encontrados:
        print(f"\n⚠️ No se encontraron SVGs para procesar en: {svg_dir}")
        print(f"   Asegúrate de tener los archivos SVG (P1.svg, P2.svg, etc.) en ese directorio")
        return
    
    # Resumen
    exitosos = sum(1 for _, exito in resultados if exito)
    total = len(resultados)
    
    print(f"\n[OK] Heatmaps SVG generados: {exitosos}/{total}")
    print(f"[INFO] Archivos creados en: {output_dir}")
    print(f"\n[INFO] Los SVGs generados incluyen:")
    print(f"   - Clases CSS (fullness-low, fullness-medium, fullness-high, fullness-very-high)")
    print(f"   - Atributos data-fullness, data-bay-id, data-locked para facil manipulacion")
    print(f"   - Puedes modificar estilos con CSS dentro de la app")
    
    if exitosos < total:
        print(f"\n[INFO] Detalle:")
        for nombre, exito in resultados:
            estado = "OK" if exito else "FALLO"
            print(f"   {nombre}_heatmap.svg: {estado}")

if __name__ == "__main__":
    main()
