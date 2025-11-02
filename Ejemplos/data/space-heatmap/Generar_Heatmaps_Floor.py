#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para generar Heatmaps por Floor desde SVGs con datos del CSV Bay_Aisle_Fullness.csv
Genera PNGs separados para cada piso y tipo de fullness
"""

import pandas as pd
from bs4 import BeautifulSoup
import cairosvg
import os
import json
import sys
import time
import getpass  # Para obtener el usuario actual
from datetime import datetime, timedelta

def cargar_configuracion():
    """
    Carga la configuración desde config.json detectando automáticamente el usuario
    """
    try:
        config_path = os.path.join(os.path.dirname(__file__), 'config.json')
        with open(config_path, 'r', encoding='utf-8') as f:
            config_completo = json.load(f)
        
        # Detectar usuario actual del sistema
        usuario_actual = getpass.getuser().lower()
        print(f"🔍 Usuario detectado: {usuario_actual}")
        
        # Buscar configuración para el usuario actual
        if 'users' in config_completo and usuario_actual in config_completo['users']:
            config_usuario = config_completo['users'][usuario_actual]
            print(f"✅ Configuración encontrada para usuario: {usuario_actual}")
        elif 'users' in config_completo and 'default_user' in config_completo:
            # Usar usuario por defecto si no se encuentra el usuario actual
            usuario_default = config_completo['default_user']
            if usuario_default in config_completo['users']:
                config_usuario = config_completo['users'][usuario_default]
                print(f"⚠️ Usuario {usuario_actual} no encontrado, usando configuración por defecto: {usuario_default}")
            else:
                raise ValueError(f"Usuario por defecto '{usuario_default}' no existe en configuración")
        else:
            raise ValueError("Configuración de usuarios no encontrada o malformada")
        
        # Usar rutas absolutas directamente (necesario para rutas de red como \\amazon\eu\chuecc)
        return config_usuario
        
    except FileNotFoundError:
        print(f"❌ ERROR: No se encontró el archivo config.json en {os.path.dirname(__file__)}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ ERROR: JSON malformado en config.json: {e}")
        sys.exit(1)
    except ValueError as e:
        print(f"❌ ERROR: {e}")
        sys.exit(1)

# Cargar configuración global
CONFIG = cargar_configuracion()

# Extraer rutas de la configuración
PATH_CSV = CONFIG.get('PATH_CSV', '../csv')
PATH_SVG = CONFIG.get('PATH_SVG', '../svg')
PATH_PNG = CONFIG.get('PATH_PNG', '..')
PATH_FULLNESS = CONFIG.get('PATH_FULLNESS', '..')

# 🔧 Configuración de SVGs a procesar (Booleanos individuales)
SVG_CONFIG = {
    # Pisos principales
    'P1': True,                   # Genera P1_Bay.png (o el tipo de fullness seleccionado)
    'P2': True,                   # Genera P2_Bay.png
    'P3': True,                   # Genera P3_Bay.png
    'P4': True,                   # Genera P4_Bay.png  
    'P5': True,                   # Genera P5_Bay.png
    
    # Zonas específicas de P3
    'P3Z1': True,                # Genera P3Z1_Bay.png
    'P3Z2': True,                # Genera P3Z2_Bay.png
    
    # Zonas específicas de P4  
    'P4Z1': False,                # Genera P4Z1_Bay.png
    'P4Z2': False,                # Genera P4Z2_Bay.png
    
    # Zonas específicas de P5
    'P5Z1': False,                # Genera P5Z1_Bay.png
    'P5Z2': False,                # Genera P5Z2_Bay.png
}

# 🔧 Configuración de tipo de fullness (Solo uno activo a la vez)
OPCIONES_FULLNESS = {
    'aisle_fullness': False,      # Usa Aisle_Fullness
    'mod_fullness': False,        # Usa Aisle_MOD_Fullness  
    'zona_fullness': False,       # Usa Zona_Fullness
    'bay_fullness': True          # Usa Bay_Fullness
}

# 🔒 Configuración para bins bloqueadas
USAR_BINS_LOCKED = True  # True: aplicar lógica de bins bloqueadas, False: ignorar bins bloqueadas

# 🔧 Función para leer CSV con manejo de codificación
def leer_csv_con_codificacion(archivo):
    codificaciones = ['utf-8', 'latin1', 'cp1252', 'iso-8859-1']
    
    for codificacion in codificaciones:
        try:
            return pd.read_csv(archivo, encoding=codificacion)
        except UnicodeDecodeError:
            continue
    
    # Si ninguna codificación funciona, intentar con error handling
    try:
        return pd.read_csv(archivo, encoding='utf-8', errors='replace')
    except Exception as e:
        print(f"❌ Error al leer {archivo}: {e}")
        return None

def obtener_color_fullness(nivel):
    """
    Calcula el color RGB basado en el nivel de fullness (0.0 a 1.0)
    Transición de 5 colores: verde pino → verde manzana → amarillo canario → amarillo mango → rojo carmesí
    """
    nivel = max(0, min(1, float(nivel)))  # asegurar que esté entre 0 y 1
    
    # Umbrales de color
    umbral_verde_manzana = 0.60  # Verde pino a verde manzana
    umbral_amarillo_canario = 0.70  # Verde manzana a amarillo canario
    umbral_amarillo_mango = 0.85  # Amarillo canario a amarillo mango
    umbral_rojo_carmesi = 1.0  # Amarillo mango a rojo carmesí

    if nivel <= umbral_verde_manzana:
        # Verde pino (34,139,34) a Verde manzana (0,128,0)
        porcentaje = nivel / umbral_verde_manzana
        r = int(34 + (0 - 34) * porcentaje)
        g = int(139 + (128 - 139) * porcentaje)
        b = 34
    elif nivel <= umbral_amarillo_canario:
        # Verde manzana (0,128,0) a Amarillo canario (255,255,0)
        porcentaje = (nivel - umbral_verde_manzana) / (umbral_amarillo_canario - umbral_verde_manzana)
        r = int(0 + (255 - 0) * porcentaje)
        g = int(128 + (255 - 128) * porcentaje)
        b = 0
    elif nivel <= umbral_amarillo_mango:
        # Amarillo canario (255,255,0) a Amarillo mango (255,165,0)
        porcentaje = (nivel - umbral_amarillo_canario) / (umbral_amarillo_mango - umbral_amarillo_canario)
        r = 255
        g = int(255 + (165 - 255) * porcentaje)
        b = 0
    else:
        # Amarillo mango (255,165,0) a Rojo carmesí (220,20,60)
        porcentaje = (nivel - umbral_amarillo_mango) / (umbral_rojo_carmesi - umbral_amarillo_mango)
        r = int(255 + (220 - 255) * porcentaje)
        g = int(165 + (20 - 165) * porcentaje)
        b = int(0 + (60 - 0) * porcentaje)

    r, g, b = max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b))
    return f"rgb({r},{g},{b})"

def generar_bay_id_from_bin_pick_tower(bin_id):
    """
    Genera el P-Bay-ID desde un bin_id individual para Pick Tower
    Misma lógica que en Calcular_Bay_Aisle_Fullness.py
    """
    try:
        # Extraer floor del bin_id (posición 1: P-3-B201A200 -> floor=3)
        floor = bin_id[2]
        # Extraer posición 6-8: pasillo (3 dígitos)
        pasillo = bin_id[5:8]
        # Extraer posición 10-11: altura (2 dígitos)
        altura = bin_id[9:11]
        # Formato: P{floor}-{pasillo}A{altura}0 para Pick Tower
        return f'P{floor}-{pasillo}A{altura}0'
    except:
        return None

def cargar_datos_locked():
    """
    Carga y procesa los datos de bins bloqueadas desde archivo Locked para Pick Tower
    """
    if not USAR_BINS_LOCKED:
        print("🔒 Funcionalidad de bins bloqueadas DESACTIVADA por configuración")
        return {}
    
    # Calcular la fecha de ayer (misma lógica que Calcular_Bay_Aisle_Fullness.py)
    ayer = datetime.now() - timedelta(days=1)
    fecha_archivo = ayer.strftime('%Y%m%d')
    
    # Construir ruta del archivo Locked
    nombre_archivo_locked = os.path.join(PATH_FULLNESS, f"Locked_VLC1_HES1{fecha_archivo}.txt")
    
    print(f"📁 Buscando archivo de bins bloqueadas: {nombre_archivo_locked}")
    
    # Verificar que existe el archivo
    if not os.path.exists(nombre_archivo_locked):
        print(f"✅ No se encontró archivo de bins bloqueadas - esto significa que NO HAY bins bloqueadas")
        print("   Continuando con generación normal de heatmaps...")
        return {}
    
    try:
        # Leer archivo de bins bloqueadas
        df_locked = pd.read_csv(nombre_archivo_locked, sep='\t')
        
        # Filtrar solo Pick Tower y bins que están bloqueadas (is_locked = 'Y')
        df_locked_pt = df_locked[
            (df_locked['storage_area'] == 'Pick Tower') & 
            (df_locked['is_locked'] == 'Y')
        ]
        
        print(f"✅ Archivo Locked leído: {len(df_locked)} registros totales")
        print(f"✅ Bins bloqueadas en Pick Tower: {len(df_locked_pt)} registros")
        
        if len(df_locked_pt) == 0:
            print("   No hay bins bloqueadas en Pick Tower")
            return {}
        
        # Generar P-Bay-ID para cada bin bloqueada
        bins_bloqueadas_por_bay = {}
        
        for _, row in df_locked_pt.iterrows():
            bin_id = row['bin_id']
            p_bay_id = generar_bay_id_from_bin_pick_tower(bin_id)
            
            if p_bay_id:
                if p_bay_id not in bins_bloqueadas_por_bay:
                    bins_bloqueadas_por_bay[p_bay_id] = []
                bins_bloqueadas_por_bay[p_bay_id].append(bin_id)
        
        print(f"📊 Bays con bins bloqueadas: {len(bins_bloqueadas_por_bay)}")
        
        # Mostrar algunos ejemplos
        if bins_bloqueadas_por_bay:
            print("🔍 Ejemplos de bins bloqueadas por Bay:")
            for p_bay_id, bins in list(bins_bloqueadas_por_bay.items())[:3]:
                print(f"   {p_bay_id}: {len(bins)} bins bloqueadas")
        
        return bins_bloqueadas_por_bay
        
    except Exception as e:
        print(f"❌ Error al leer archivo de bins bloqueadas: {e}")
        print("   Se continuará sin datos de bins bloqueadas")
        return {}

def calcular_total_bins_por_bay():
    """
    Calcula el total de bins por Bay (P-Bay-ID) leyendo el archivo FULLNESS original
    Solo es necesario si USAR_BINS_LOCKED está activado
    """
    if not USAR_BINS_LOCKED:
        print("📊 Omitiendo conteo de bins por Bay (funcionalidad de bins bloqueadas desactivada)")
        return {}
    
    # Calcular la fecha de ayer (misma lógica que cargar_datos_locked)
    ayer = datetime.now() - timedelta(days=1)
    fecha_archivo = ayer.strftime('%Y%m%d')
    
    # Construir ruta del archivo FULLNESS
    nombre_archivo_fullness = os.path.join(PATH_FULLNESS, f"FULLNESS_VLC1_HES1{fecha_archivo}.txt")
    
    print(f"📁 Leyendo archivo FULLNESS para conteo de bins: {nombre_archivo_fullness}")
    
    if not os.path.exists(nombre_archivo_fullness):
        print(f"⚠️ ADVERTENCIA: No se encontró archivo FULLNESS: {nombre_archivo_fullness}")
        print("   No se podrá verificar bins completamente bloqueadas")
        return {}
    
    try:
        # Leer archivo FULLNESS
        df_fullness = pd.read_csv(nombre_archivo_fullness, sep='\t')
        
        # Filtrar solo Pick Tower
        df_fullness_pt = df_fullness[df_fullness['storage_area'] == 'Pick Tower']
        
        print(f"✅ Archivo FULLNESS leído: {len(df_fullness)} registros totales")
        print(f"✅ Registros Pick Tower: {len(df_fullness_pt)} bins")
        
        if len(df_fullness_pt) == 0:
            print("   No hay bins de Pick Tower en el archivo FULLNESS")
            return {}
        
        # Generar P-Bay-ID para cada bin y contar por Bay
        total_bins_por_bay = {}
        
        for _, row in df_fullness_pt.iterrows():
            bin_id = row['bin_id']
            p_bay_id = generar_bay_id_from_bin_pick_tower(bin_id)
            
            if p_bay_id:
                if p_bay_id not in total_bins_por_bay:
                    total_bins_por_bay[p_bay_id] = 0
                total_bins_por_bay[p_bay_id] += 1
        
        print(f"📊 Bays procesadas: {len(total_bins_por_bay)}")
        
        # Mostrar algunos ejemplos
        if total_bins_por_bay:
            print("🔍 Ejemplos de conteo de bins por Bay:")
            for p_bay_id, total_bins in list(total_bins_por_bay.items())[:3]:
                print(f"   {p_bay_id}: {total_bins} bins totales")
        
        return total_bins_por_bay
        
    except Exception as e:
        print(f"❌ Error al leer archivo FULLNESS: {e}")
        print("   No se podrá verificar bins completamente bloqueadas")
        return {}

def verificar_bay_completamente_bloqueada(p_bay_id, bins_bloqueadas_por_bay, total_bins_por_bay):
    """
    Verifica si una Bay (P-Bay-ID) está completamente bloqueada
    Compara total de bins en la Bay vs bins bloqueadas
    """
    if not USAR_BINS_LOCKED:
        return False  # Funcionalidad desactivada
    
    if not bins_bloqueadas_por_bay or p_bay_id not in bins_bloqueadas_por_bay:
        return False  # No hay bins bloqueadas en esta Bay
    
    # Obtener total de bins en esta Bay
    total_bins_en_bay = total_bins_por_bay.get(p_bay_id, 0)
    
    # Contar bins bloqueadas en esta Bay
    bins_bloqueadas_en_bay = len(bins_bloqueadas_por_bay[p_bay_id])
    
    # Verificar si están todas bloqueadas
    completamente_bloqueada = (total_bins_en_bay > 0 and 
                               bins_bloqueadas_en_bay >= total_bins_en_bay)
    
    return completamente_bloqueada

def procesar_heatmap(svg_name, tipo_fullness, columna_fullness, df_bay_data, textos_dict, visibilidad_dict, bins_bloqueadas_por_bay, total_bins_por_bay):
    """
    Procesa un heatmap para un SVG específico y tipo de fullness
    Incluye lógica para colorear Bays completamente bloqueadas en gris
    """
    # 📁 Rutas de archivos
    svg_input = os.path.join(PATH_SVG, f"{svg_name}.svg")
    png_output = os.path.join(PATH_PNG, f"{svg_name}_{tipo_fullness.capitalize()}.png")
    
    # Verificar que existe el SVG
    if not os.path.exists(svg_input):
        return False
    
    # Filtrar datos según el tipo de SVG
    if 'Z' in svg_name:
        # Para SVGs de zonas específicas (P3Z1, P4Z2, etc.)
        # Extraer piso y zona del nombre (P3Z1 → piso=3, zona=Z1)
        piso_num = svg_name[1]  # P3Z1 → '3'
        zona = svg_name[2:]     # P3Z1 → 'Z1'
        
        # Filtrar por piso y zona específica usando P-Bay-ID 
        patron_zona = f'P{piso_num}-'
        df_filtrado = df_bay_data[df_bay_data['P-Bay-ID'].str.startswith(patron_zona)].copy()
        
        # Aquí podrías agregar lógica adicional para filtrar por zona específica si está en los datos
        # Por ahora usamos todos los datos del piso
    else:
        # Para SVGs de pisos completos (P1, P2, P3, etc.)
        piso_num = svg_name[1:]  # P3 → '3'
        patron_piso = f'P{piso_num}-'
        df_filtrado = df_bay_data[df_bay_data['P-Bay-ID'].str.startswith(patron_piso)].copy()
    
    if df_filtrado.empty:
        return False
    
    # Crear diccionario con P-Bay-ID (OPTIMIZADO)
    fullness_dict_p_bay = dict(zip(df_filtrado['P-Bay-ID'], df_filtrado[columna_fullness]))
    
    # 🧾 Leer SVG base
    try:
        with open(svg_input, "r", encoding="utf-8") as file:
            soup = BeautifulSoup(file.read(), "xml")
    except Exception as e:
        print(f"❌ Error al leer SVG {svg_input}: {e}")
        return False
    
    # 🔍 Pre-indexar todos los elementos con ID para optimización
    elementos_por_id = {elem.get('id'): elem for elem in soup.find_all(id=True) if elem.get('id')}
    
    # 🎨 Aplicar colores basados en fullness
    elementos_coloreados = 0
    bays_bloqueadas_coloreadas = 0
    elementos_no_encontrados = []
    
    # Aplicar colores a elementos P-Bay-ID (OPTIMIZADO)
    for p_bay_id, nivel in fullness_dict_p_bay.items():
        if pd.isna(nivel):  # Saltar valores NaN
            continue
        
        # Verificar si la Bay está completamente bloqueada
        bay_completamente_bloqueada = verificar_bay_completamente_bloqueada(p_bay_id, bins_bloqueadas_por_bay, total_bins_por_bay)
        
        if bay_completamente_bloqueada:
            # Bay completamente bloqueada -> color gris RGB(186,186,186)
            color = "rgb(186,186,186)"
            bays_bloqueadas_coloreadas += 1
        else:
            # Bay no completamente bloqueada -> color normal según fullness
            color = obtener_color_fullness(nivel)
        
        # Buscar elemento usando índice pre-construido (OPTIMIZADO)
        elemento = elementos_por_id.get(str(p_bay_id))
        if elemento:
            # Eliminar fill existente
            if "fill" in elemento.attrs:
                del elemento["fill"]

            # Aplicar nuevo color via style
            estilo = elemento.get("style", "")
            partes = [p.strip() for p in estilo.split(";") if p.strip() and not p.strip().startswith("fill:")]
            partes.append(f"fill:{color}")
            elemento["style"] = "; ".join(partes)
            elementos_coloreados += 1
    

    

    
    # ✏️ Modificar texto existente y aplicar visibilidad (OPTIMIZADO)
    elementos_texto = 0
    for texto_id, nuevo_texto in textos_dict.items():
        # Buscar elemento usando índice pre-construido (OPTIMIZADO)
        texto = elementos_por_id.get(texto_id)
        if texto:
            # Actualizar el texto
            texto.string = nuevo_texto
            
            # Aplicar visibilidad basada en la columna Visible
            visible = visibilidad_dict.get(texto_id, 1)  # Por defecto visible si no está en el CSV
            
            if visible == 0:
                # Ocultar el elemento usando opacity
                estilo = texto.get("style", "")
                partes = [p.strip() for p in estilo.split(";") if p.strip() and not p.strip().startswith("opacity:")]
                partes.append("opacity:0")
                texto["style"] = "; ".join(partes)
            elif visible == 1:
                # Asegurar que esté visible
                estilo = texto.get("style", "")
                partes = [p.strip() for p in estilo.split(";") if p.strip() and not p.strip().startswith("opacity:")]
                partes.append("opacity:1")
                texto["style"] = "; ".join(partes)
                
            elementos_texto += 1
    

    
    # 💾 Guardar SVG temporal para conversión
    svg_temp = os.path.join(os.path.dirname(__file__), f"temp_{svg_name}_{tipo_fullness}.svg")
    try:
        with open(svg_temp, "w", encoding="utf-8") as f:
            f.write(str(soup))
        
        # 🖼️ Exportar a PNG en resolución específica
        cairosvg.svg2png(url=svg_temp, write_to=png_output, output_width=2905, output_height=1502)
        
        # 🧹 Limpiar archivo temporal
        os.remove(svg_temp)
        
        # 📊 Log de estadísticas de coloreado
        print(f"✅ {png_output} generado exitosamente")
        print(f"   🎨 Elementos coloreados: {elementos_coloreados}")
        print(f"   🔒 Bays completamente bloqueadas (gris): {bays_bloqueadas_coloreadas}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error al generar PNG para {svg_name}_{tipo_fullness}: {e}")
        # Limpiar archivo temporal si existe
        if os.path.exists(svg_temp):
            os.remove(svg_temp)
        return False

def main():
    """
    Función principal que procesa todos los heatmaps
    """
    # ⏰ Iniciar contador de tiempo
    tiempo_inicio = time.time()
    print("🚀 Iniciando generación de Heatmaps por Floor...")
    
    # 📊 Leer CSV de datos Bay_Aisle_Fullness
    tiempo_lectura_inicio = time.time()
    csv_bay_data = os.path.join(PATH_CSV, "Bay_Aisle_Fullness.csv")
    csv_textos = os.path.join(PATH_CSV, "Texto_Dashboard1.csv")
    
    df_bay_data = leer_csv_con_codificacion(csv_bay_data)
    
    if df_bay_data is None:
        print("❌ No se pudo leer el archivo Bay_Aisle_Fullness.csv")
        return
    
    print(f"📂 Leyendo textos de: {csv_textos}")
    df_textos = leer_csv_con_codificacion(csv_textos)
    
    if df_textos is None:
        print("❌ No se pudo leer el archivo Texto_Dashboard1.csv")
        return
    
    # Convertir valores a string y manejar NaN para textos
    df_textos['Fullness'] = df_textos['Fullness'].fillna('').astype(str)
    df_textos['Visible'] = df_textos['Visible'].fillna(0).astype(int)
    
    # Crear diccionarios de textos y visibilidad
    textos_dict = dict(zip(df_textos['id_Texto'], df_textos['Fullness']))
    visibilidad_dict = dict(zip(df_textos['id_Texto'], df_textos['Visible']))
    
    # 🔒 Cargar datos de bins bloqueadas
    print(f"\n🔒 FUNCIONALIDAD BINS BLOQUEADAS: {'ACTIVADA' if USAR_BINS_LOCKED else 'DESACTIVADA'}")
    if USAR_BINS_LOCKED:
        print("🔍 Cargando datos de bins bloqueadas...")
        bins_bloqueadas_por_bay = cargar_datos_locked()
        
        print("📊 Calculando total de bins por Bay desde archivo FULLNESS...")
        total_bins_por_bay = calcular_total_bins_por_bay()
    else:
        print("⏩ Omitiendo procesamiento de bins bloqueadas")
        bins_bloqueadas_por_bay = {}
        total_bins_por_bay = {}
    
    # Verificar que existe la columna P-Bay-ID (debe ser generada por Calcular_Bay_Aisle_Fullness.py)
    if 'P-Bay-ID' not in df_bay_data.columns:
        print("⚠️ Columna P-Bay-ID no encontrada. Ejecuta primero Calcular_Bay_Aisle_Fullness.py")
        print("🔄 Generando P-Bay-ID temporalmente...")
        df_bay_data['P-Bay-ID'] = 'P' + df_bay_data['Floor'].astype(str) + '-' + df_bay_data['Bay-ID'].astype(str).str.replace('Bay-', '', regex=False)
    
    tiempo_lectura_fin = time.time()
    
    # Mapear opciones a columnas
    mapeo_columnas = {
        'aisle': 'Aisle_Fullness',
        'mod': 'Aisle_MOD_Fullness', 
        'zona': 'Zona_Fullness',
        'bay': 'Bay_Fullness'
    }
    
    # 🔄 Procesar cada SVG configurado
    tiempo_procesamiento_inicio = time.time()
    resultados = []
    
    # Verificar qué SVGs están disponibles y habilitados
    svgs_a_procesar = []
    for svg_name, habilitado in SVG_CONFIG.items():
        if not habilitado:
            continue
            
        svg_path = os.path.join(PATH_SVG, f"{svg_name}.svg")
        if os.path.exists(svg_path):
            svgs_a_procesar.append(svg_name)
        else:
            print(f"⚠️ SVG no encontrado: {svg_name}.svg - omitiendo")
    
    print(f"📋 SVGs a procesar: {svgs_a_procesar}")
    
    # Determinar qué tipo de fullness usar (solo uno debe estar activo)
    tipo_fullness_activo = None
    for tipo_opcion, activo in OPCIONES_FULLNESS.items():
        if activo:
            tipo_fullness_activo = tipo_opcion
            break
    
    if not tipo_fullness_activo:
        print("❌ ERROR: Ningún tipo de fullness está activo en OPCIONES_FULLNESS")
        return
    
    # Extraer tipo real (aisle_fullness → aisle)
    tipo_real = tipo_fullness_activo.replace('_fullness', '')
    columna = mapeo_columnas.get(tipo_real)
    
    if columna not in df_bay_data.columns:
        print(f"❌ ERROR: Columna {columna} no encontrada en CSV")
        return
    
    print(f"🎯 Usando tipo de fullness: {tipo_real} (columna: {columna})")
    
    # Procesar cada SVG habilitado
    for svg_name in svgs_a_procesar:
        resultado = procesar_heatmap(svg_name, tipo_real, columna, df_bay_data, textos_dict, visibilidad_dict, bins_bloqueadas_por_bay, total_bins_por_bay)
        resultados.append((f"{svg_name}_{tipo_real.capitalize()}", resultado))
    
    tiempo_procesamiento_fin = time.time()
    tiempo_total = tiempo_procesamiento_fin - tiempo_inicio
    
    # 📋 Resumen final con tiempos
    exitosos = sum(1 for _, exito in resultados if exito)
    total = len(resultados)
    
    print(f"\n✅ Heatmaps generados exitosamente: {exitosos}/{total}")
    print(f"📄 Archivos creados en: {PATH_PNG}")
    
    # 🔒 RESUMEN DE BINS BLOQUEADAS
    if not USAR_BINS_LOCKED:
        print(f"\n🔒 Funcionalidad de bins bloqueadas DESACTIVADA - Todos los colores según fullness normal")
    elif bins_bloqueadas_por_bay:
        total_bays_con_bins_bloqueadas = len(bins_bloqueadas_por_bay)
        total_bins_bloqueadas = sum(len(bins) for bins in bins_bloqueadas_por_bay.values())
        
        # Calcular cuántas Bays están completamente bloqueadas
        bays_completamente_bloqueadas = 0
        for p_bay_id in bins_bloqueadas_por_bay.keys():
            if verificar_bay_completamente_bloqueada(p_bay_id, bins_bloqueadas_por_bay, total_bins_por_bay):
                bays_completamente_bloqueadas += 1
        
        print(f"\n🔒 RESUMEN DE BINS BLOQUEADAS:")
        print(f"   📊 Bays con bins bloqueadas: {total_bays_con_bins_bloqueadas}")
        print(f"   📊 Total bins bloqueadas: {total_bins_bloqueadas}")
        print(f"   🔒 Bays completamente bloqueadas (coloreadas en gris): {bays_completamente_bloqueadas}")
    else:
        print(f"\n🔒 No hay bins bloqueadas - Todos los colores según fullness normal")
    
    # ⏱️ RESUMEN DE TIEMPOS (ESENCIAL)
    print(f"\n⏱️ TIEMPOS:")
    print(f"   📂 CSVs: {tiempo_lectura_fin - tiempo_lectura_inicio:.2f}s")
    print(f"   🎨 Procesamiento: {tiempo_procesamiento_fin - tiempo_procesamiento_inicio:.2f}s")
    print(f"   🚀 TOTAL: {tiempo_total:.2f}s")
    
    if exitosos < total:
        print(f"\n📊 Detalle:")
        for nombre, exito in resultados:
            estado = "✅ OK" if exito else "❌ FALLO"
            print(f"   {nombre}.png: {estado}")

if __name__ == "__main__":
    main()