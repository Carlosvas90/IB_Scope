#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para verificar si los ASINs son Sortable o Unsortable
Lee ASINs desde Asins_lista.csv y actualiza Sortable_Results.csv
Solo procesa ASINs nuevos o permite forzar actualización de existentes
"""

import os
import csv
import json
import base64
import requests
from requests_kerberos import OPTIONAL, HTTPKerberosAuth
import urllib3
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# Deshabilitar advertencias de SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Número inicial de workers para procesamiento paralelo
INITIAL_WORKERS = 5
# Número máximo de workers permitido
MAX_WORKERS_LIMIT = 50
# Tamaño del lote para evaluar rendimiento
BATCH_SIZE = 20
# Umbral de tasa de errores para aumentar workers (si < 5% errores, aumentar)
ERROR_THRESHOLD_LOW = 0.05
# Umbral de tasa de errores para reducir workers (si > 10% errores, reducir)
ERROR_THRESHOLD_HIGH = 0.10

# Lock para escritura thread-safe
write_lock = threading.Lock()

def mw_cookie():
    """
    Retorna manualmente la cookie de sesión si mwinit no funciona.
    """
    return {"session": "valor_de_la_cookie_session"}

class AmazonRequest:
    def __init__(self):
        """
        An object of this instance can send kerberos authenticated requests to Amazon Internal sites.
        """
        urllib3.disable_warnings()
        self.req = requests.Session()
        self.req.auth = HTTPKerberosAuth(mutual_authentication=OPTIONAL)
        self.req.verify = False
        self.cookie = mw_cookie()

    def send_req(self, url, method="GET", **options):
        """
        Envía una solicitud HTTP a la URL proporcionada.
        """
        response = getattr(self.req, method.lower())(
            url, cookies=self.cookie, **options)
        return response

def decode_base64_field(encoded_str):
    """
    Recibe una cadena codificada en Base64 y la decodifica.
    """
    try:
        decoded_bytes = base64.b64decode(encoded_str)
        decoded_str = decoded_bytes.decode('utf-8', errors='replace')
        try:
            return json.loads(decoded_str)
        except json.JSONDecodeError:
            return decoded_str
    except Exception:
        return encoded_str

def recursively_decode(obj):
    """
    Recorre recursivamente el objeto (dict o list) y decodifica cada cadena en Base64.
    """
    if isinstance(obj, dict):
        new_obj = {}
        for key, value in obj.items():
            if isinstance(value, str):
                new_obj[key] = decode_base64_field(value)
            elif isinstance(value, (dict, list)):
                new_obj[key] = recursively_decode(value)
            else:
                new_obj[key] = value
        return new_obj
    elif isinstance(obj, list):
        return [recursively_decode(item) for item in obj]
    else:
        return obj

def process_asin(request, asin, fc="VLC1"):
    """
    Descarga y extrae el estado de sortable para un ASIN dado.
    """
    url = f"https://dr-sku-dub.amazon.com/api/attributes/{fc}/{asin}"
    try:
        response = request.send_req(url)
        if response.status_code == 200:
            json_data = response.json()
            cleaned_json = recursively_decode(json_data)
            return asin, extract_sortable_data(asin, cleaned_json)
        else:
            return asin, None
    except Exception as e:
        return asin, None

def extract_sortable_data(asin, product):
    """
    Extrae los datos de sortable y otros campos relevantes del producto.
    """
    try:
        attr = product.get('attributes')
        if not attr:
            return None

        # Extraer is_sortable
        sortable_info = attr.get('is_sortable', {})
        is_sortable = sortable_info.get('value', None) if isinstance(sortable_info, dict) else None
        
        # Extraer campos adicionales útiles
        conveyable_info = attr.get('is_conveyable', {})
        is_conveyable = conveyable_info.get('value', None) if isinstance(conveyable_info, dict) else None
        
        hazmat_info = attr.get('is_hazmat', {})
        is_hazmat = hazmat_info.get('value', None) if isinstance(hazmat_info, dict) else None
        
        # Extraer dimensiones
        dimensions = attr.get('item_dimensions', {})
        height_info = dimensions.get('height', {}) if dimensions else {}
        length_info = dimensions.get('length', {}) if dimensions else {}
        width_info = dimensions.get('width', {}) if dimensions else {}
        
        h_val = height_info.get('value', 0) if isinstance(height_info, dict) else 0
        l_val = length_info.get('value', 0) if isinstance(length_info, dict) else 0
        w_val = width_info.get('value', 0) if isinstance(width_info, dict) else 0
        
        # Extraer peso
        weight_data = attr.get('item_weight', {})
        item_weight = 0
        if weight_data and isinstance(weight_data, dict):
            weight_value = weight_data.get('value', {})
            if isinstance(weight_value, dict):
                item_weight = weight_value.get('value', 0)
            else:
                item_weight = weight_value
        
        # Extraer nombre del producto
        item_name_data = attr.get('item_name', {})
        item_name = item_name_data.get('value', '') if isinstance(item_name_data, dict) else ''
        
        # Extraer categoría
        gl_product_group = attr.get('gl_product_group_localized_name', {})
        category = gl_product_group.get('value', '') if isinstance(gl_product_group, dict) else ''
        
        result = {
            'asin': asin,
            'is_sortable': is_sortable,
            'is_conveyable': is_conveyable,
            'is_hazmat': is_hazmat,
            'height_cm': round(h_val, 2) if h_val else 0,
            'length_cm': round(l_val, 2) if l_val else 0,
            'width_cm': round(w_val, 2) if w_val else 0,
            'weight_kg': round(item_weight, 2) if item_weight else 0,
            'item_name': item_name,
            'category': category,
            'query_date': datetime.now().strftime('%d/%m/%Y %H:%M:%S')
        }
        
        return result
    except Exception as e:
        return None

def read_asins_list(csv_path):
    """
    Lee los ASINs desde Asins_lista.csv y retorna un dict con ASIN y última actualización.
    """
    asins_dict = {}
    encodings = ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']
    
    if not os.path.exists(csv_path):
        return asins_dict
    
    for encoding in encodings:
        try:
            with open(csv_path, 'r', encoding=encoding) as csvfile:
                first_line = csvfile.readline()
                csvfile.seek(0)
                delimiter = ',' if ',' in first_line else ';'
                
                reader = csv.DictReader(csvfile, delimiter=delimiter)
                headers = reader.fieldnames
                
                if not headers:
                    return asins_dict
                
                # Buscar columna con ASINs
                asin_column = None
                for header in headers:
                    if 'asin' in header.lower() or 'fcsku' in header.lower():
                        asin_column = header
                        break
                
                if not asin_column and headers:
                    asin_column = headers[0]
                
                # Buscar columna de última actualización
                update_column = None
                for header in headers:
                    if 'actualizacion' in header.lower() or 'update' in header.lower() or 'fecha' in header.lower():
                        update_column = header
                        break
                
                csvfile.seek(0)
                reader = csv.DictReader(csvfile, delimiter=delimiter)
                
                for row in reader:
                    asin = row.get(asin_column, '').strip()
                    if asin and len(asin) == 10:
                        ultima_actualizacion = row.get(update_column, '') if update_column else ''
                        asins_dict[asin] = ultima_actualizacion
                
                return asins_dict
                
        except Exception as e:
            if encoding == encodings[-1]:
                print(f"Advertencia: Error al leer Asins_lista.csv: {e}")
                return asins_dict
            continue
    
    return asins_dict

def read_existing_results(csv_path):
    """
    Lee los ASINs ya procesados desde Sortable_Results.csv.
    Retorna un set con los ASINs ya procesados.
    """
    processed_asins = set()
    
    if not os.path.exists(csv_path):
        return processed_asins
    
    encodings = ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']
    
    for encoding in encodings:
        try:
            with open(csv_path, 'r', encoding=encoding) as csvfile:
                first_line = csvfile.readline()
                csvfile.seek(0)
                delimiter = ',' if ',' in first_line else ';'
                
                reader = csv.DictReader(csvfile, delimiter=delimiter)
                
                for row in reader:
                    asin = row.get('asin', '').strip()
                    if asin and len(asin) == 10:
                        processed_asins.add(asin)
                
                return processed_asins
                
        except Exception as e:
            if encoding == encodings[-1]:
                print(f"Advertencia: Error al leer Sortable_Results.csv: {e}")
                return processed_asins
            continue
    
    return processed_asins

def load_existing_results_data(csv_path):
    """
    Carga todos los datos existentes de Sortable_Results.csv.
    Retorna un dict con asin como clave y dict con asin e is_sortable como valor.
    """
    results_data = {}
    
    if not os.path.exists(csv_path):
        return results_data
    
    encodings = ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']
    
    for encoding in encodings:
        try:
            with open(csv_path, 'r', encoding=encoding) as csvfile:
                first_line = csvfile.readline()
                csvfile.seek(0)
                delimiter = ',' if ',' in first_line else ';'
                
                reader = csv.DictReader(csvfile, delimiter=delimiter)
                
                for row in reader:
                    asin = row.get('asin', '').strip()
                    if asin and len(asin) == 10:
                        # Solo guardar asin e is_sortable
                        is_sortable = row.get('is_sortable', '')
                        # Convertir string a bool si es necesario
                        if isinstance(is_sortable, str):
                            if is_sortable.lower() == 'true':
                                is_sortable = True
                            elif is_sortable.lower() == 'false':
                                is_sortable = False
                            elif is_sortable == '':
                                is_sortable = None
                        results_data[asin] = {
                            'asin': asin,
                            'is_sortable': is_sortable
                        }
                
                return results_data
                
        except Exception as e:
            if encoding == encodings[-1]:
                print(f"Advertencia: Error al leer Sortable_Results.csv: {e}")
                return results_data
            continue
    
    return results_data

def update_asins_list(csv_path, asins_dict):
    """
    Actualiza Asins_lista.csv con las fechas de última actualización.
    """
    if not os.path.exists(csv_path):
        # Crear archivo nuevo con encabezados correctos
        with open(csv_path, 'w', newline='', encoding='utf-8-sig') as csvfile:
            writer = csv.writer(csvfile, delimiter=',')
            writer.writerow(['ASIN', 'ultima_actualizacion'])
            for asin, fecha in sorted(asins_dict.items()):
                writer.writerow([asin, fecha])
        return
    
    # Leer archivo existente y actualizar
    encodings = ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']
    rows_data = []
    
    for encoding in encodings:
        try:
            with open(csv_path, 'r', encoding=encoding) as csvfile:
                first_line = csvfile.readline()
                csvfile.seek(0)
                delimiter = ',' if ',' in first_line else ';'
                
                reader = csv.DictReader(csvfile, delimiter=delimiter)
                headers = reader.fieldnames
                
                if not headers:
                    break
                
                # Normalizar encabezados - asegurar que sean 'ASIN' y 'ultima_actualizacion'
                asin_column = None
                for header in headers:
                    if 'asin' in header.lower() or 'fcsku' in header.lower():
                        asin_column = header
                        break
                
                if not asin_column and headers:
                    asin_column = headers[0]
                
                # Buscar o crear columna de actualización
                update_column = None
                for header in headers:
                    if 'actualizacion' in header.lower() or 'update' in header.lower() or 'fecha' in header.lower():
                        update_column = header
                        break
                
                if not update_column:
                    update_column = 'ultima_actualizacion'
                
                # Crear encabezados normalizados
                normalized_headers = ['ASIN', 'ultima_actualizacion']
                
                # Leer todas las filas
                for row in reader:
                    asin = row.get(asin_column, '').strip()
                    # Validar que no sea un encabezado (si tiene 'ultima_actualizacion' como valor, es un encabezado mal interpretado)
                    if asin and len(asin) == 10 and asin.upper() != 'ULTIMA_ACTUALIZACION' and 'ultima' not in asin.lower():
                        fecha = row.get(update_column, '').strip() if update_column in row else ''
                        # Si la fecha es un ASIN (10 caracteres), es un error de lectura
                        if fecha and len(fecha) == 10 and fecha.upper().startswith('B'):
                            # Intercambiar valores
                            fecha, asin = asin, fecha
                        
                        # Actualizar fecha solo si está en el dict Y tiene un valor no vacío
                        if asin in asins_dict and asins_dict[asin]:
                            fecha = asins_dict[asin]
                        
                        rows_data.append({
                            'ASIN': asin,
                            'ultima_actualizacion': fecha
                        })
                
                # Escribir archivo actualizado con encabezados correctos
                with open(csv_path, 'w', newline='', encoding='utf-8-sig') as outfile:
                    writer = csv.DictWriter(outfile, fieldnames=normalized_headers, delimiter=',')
                    writer.writeheader()
                    # Ordenar por ASIN
                    rows_data_sorted = sorted(rows_data, key=lambda x: x['ASIN'])
                    writer.writerows(rows_data_sorted)
                
                return
                
        except Exception as e:
            if encoding == encodings[-1]:
                print(f"Advertencia: Error al actualizar Asins_lista.csv: {e}")
            continue

def process_asin_wrapper(request, asin):
    """
    Wrapper para procesar ASIN con manejo de errores.
    """
    try:
        return process_asin(request, asin)
    except Exception as e:
        return asin, None

def clean_and_add_asins(csv_path, new_asins_list):
    """
    Limpia duplicados y agrega nuevos ASINs a Asins_lista.csv.
    new_asins_list puede ser una lista de ASINs o un string con ASINs separados por comas/saltos de línea.
    """
    # Normalizar lista de nuevos ASINs
    if isinstance(new_asins_list, str):
        # Separar por comas, punto y coma, o saltos de línea
        new_asins = []
        for line in new_asins_list.replace(',', '\n').replace(';', '\n').split('\n'):
            asin = line.strip().upper()
            if asin and len(asin) == 10:
                new_asins.append(asin)
    else:
        new_asins = [asin.strip().upper() for asin in new_asins_list if asin and len(str(asin).strip()) == 10]
    
    if not new_asins:
        print("No se encontraron ASINs válidos para agregar.")
        return
    
    print(f"ASINs a agregar: {len(new_asins)}")
    
    # Leer ASINs existentes
    existing_asins = {}
    encodings = ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']
    
    if os.path.exists(csv_path):
        for encoding in encodings:
            try:
                with open(csv_path, 'r', encoding=encoding) as csvfile:
                    first_line = csvfile.readline()
                    csvfile.seek(0)
                    delimiter = ',' if ',' in first_line else ';'
                    
                    reader = csv.DictReader(csvfile, delimiter=delimiter)
                    headers = reader.fieldnames
                    
                    if not headers:
                        break
                    
                    # Buscar columna ASIN
                    asin_column = None
                    for header in headers:
                        if 'asin' in header.lower() or 'fcsku' in header.lower():
                            asin_column = header
                            break
                    
                    if not asin_column and headers:
                        asin_column = headers[0]
                    
                    # Buscar columna de actualización
                    update_column = None
                    for header in headers:
                        if 'actualizacion' in header.lower() or 'update' in header.lower() or 'fecha' in header.lower():
                            update_column = header
                            break
                    
                    if not update_column:
                        update_column = 'ultima_actualizacion'
                    
                    # Leer ASINs existentes (eliminando duplicados automáticamente)
                    duplicates_found = 0
                    total_read = 0
                    for row in reader:
                        asin = row.get(asin_column, '').strip().upper()
                        if asin and len(asin) == 10 and asin != 'ASIN' and 'ultima' not in asin.lower():
                            total_read += 1
                            fecha = row.get(update_column, '').strip() if update_column in row else ''
                            # Si la fecha es un ASIN, intercambiar
                            if fecha and len(fecha) == 10 and fecha.upper().startswith('B'):
                                fecha, asin = asin, fecha
                            
                            # Si el ASIN ya existe, mantener el que tenga fecha más reciente
                            if asin in existing_asins:
                                duplicates_found += 1
                                existing_fecha = existing_asins[asin]
                                # Si el nuevo tiene fecha y el existente no, o si el nuevo es más reciente
                                if fecha and (not existing_fecha or fecha > existing_fecha):
                                    existing_asins[asin] = fecha
                            else:
                                existing_asins[asin] = fecha
                    
                    if duplicates_found > 0:
                        print(f"Duplicados encontrados en archivo existente: {duplicates_found}")
                        print(f"ASINs únicos en archivo: {len(existing_asins)} (de {total_read} leídos)")
                    
                    break
                    
            except Exception as e:
                if encoding == encodings[-1]:
                    print(f"Advertencia: Error al leer archivo existente: {e}")
                continue
    
    # Contar duplicados en la lista nueva antes de agregar
    new_asins_unique = list(set(new_asins))  # Eliminar duplicados dentro de la lista nueva
    duplicates_in_new = len(new_asins) - len(new_asins_unique)
    
    # Agregar nuevos ASINs (sin duplicados con los existentes)
    added_count = 0
    skipped_duplicates = 0
    for asin in new_asins_unique:
        if asin not in existing_asins:
            existing_asins[asin] = ''
            added_count += 1
        else:
            skipped_duplicates += 1
    
    print(f"\nResumen:")
    if duplicates_in_new > 0:
        print(f"  - Duplicados dentro de la lista nueva: {duplicates_in_new}")
    print(f"  - ASINs nuevos agregados: {added_count}")
    print(f"  - ASINs duplicados ignorados (ya existían): {skipped_duplicates}")
    print(f"  - Total de ASINs únicos en lista: {len(existing_asins)}")
    
    # Escribir archivo actualizado
    with open(csv_path, 'w', newline='', encoding='utf-8-sig') as csvfile:
        writer = csv.writer(csvfile, delimiter=',')
        writer.writerow(['ASIN', 'ultima_actualizacion'])
        # Ordenar por ASIN
        for asin in sorted(existing_asins.keys()):
            writer.writerow([asin, existing_asins[asin]])
    
    print(f"Archivo actualizado: {csv_path}")
    return added_count

def main():
    import sys
    
    # Verificar si se quiere forzar actualización desde línea de comandos
    force_update = '--update-all' in sys.argv or '-u' in sys.argv
    skip_menu = '--no-menu' in sys.argv or '--skip-menu' in sys.argv
    
    # Verificar si se quiere limpiar y agregar ASINs
    if '--add-asins' in sys.argv or '-a' in sys.argv:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        input_csv = os.path.join(script_dir, "Asins_lista.csv")
        
        print("=" * 60)
        print("AGREGAR ASINs A LA LISTA")
        print("=" * 60)
        print("\nPega la lista de ASINs (pueden estar separados por comas, punto y coma o saltos de línea):")
        print("Presiona Enter dos veces cuando termines, o Ctrl+C para cancelar\n")
        
        try:
            lines = []
            while True:
                try:
                    line = input()
                    if not line:
                        if lines:  # Si ya hay líneas y se presiona Enter vacío, terminar
                            break
                    else:
                        lines.append(line)
                except EOFError:
                    break
            
            if lines:
                new_asins_text = '\n'.join(lines)
                clean_and_add_asins(input_csv, new_asins_text)
            else:
                print("No se ingresaron ASINs.")
        except KeyboardInterrupt:
            print("\nOperación cancelada.")
        return
    
    # Si no hay argumentos y no se salta el menú, mostrar menú interactivo
    if len(sys.argv) == 1 and not skip_menu:
        print("=" * 60)
        print("VERIFICADOR DE SORTABLE PARA ASINs")
        print("=" * 60)
        print("\nOpciones disponibles:")
        print("  1. Procesar solo ASINs nuevos y con error (por defecto)")
        print("  2. Actualizar TODOS los ASINs (forzar reprocesamiento)")
        print("  3. Agregar nuevos ASINs a la lista (elimina duplicados)")
        print("  4. Salir")
        print()
        
        while True:
            try:
                opcion = input("Selecciona una opción (1-4) [1]: ").strip()
                if not opcion:
                    opcion = "1"
                
                if opcion == "1":
                    force_update = False
                    break
                elif opcion == "2":
                    force_update = True
                    break
                elif opcion == "3":
                    # Agregar ASINs
                    script_dir = os.path.dirname(os.path.abspath(__file__))
                    input_csv = os.path.join(script_dir, "Asins_lista.csv")
                    
                    print("\n" + "=" * 60)
                    print("AGREGAR ASINs A LA LISTA")
                    print("=" * 60)
                    print("\nPega la lista de ASINs (pueden estar separados por comas, punto y coma o saltos de línea):")
                    print("Presiona Enter dos veces cuando termines\n")
                    
                    try:
                        lines = []
                        while True:
                            try:
                                line = input()
                                if not line:
                                    if lines:
                                        break
                                else:
                                    lines.append(line)
                            except EOFError:
                                break
                        
                        if lines:
                            new_asins_text = '\n'.join(lines)
                            clean_and_add_asins(input_csv, new_asins_text)
                        else:
                            print("No se ingresaron ASINs.")
                    except KeyboardInterrupt:
                        print("\nOperación cancelada.")
                    return
                elif opcion == "4":
                    print("Saliendo...")
                    return
                else:
                    print("Opción inválida. Por favor selecciona 1, 2, 3 o 4.")
            except (KeyboardInterrupt, EOFError):
                print("\nSaliendo...")
                return
    
    print("=" * 60)
    print("VERIFICADOR DE SORTABLE PARA ASINs")
    print("=" * 60)
    if force_update:
        print("MODO: Actualización forzada de todos los ASINs")
    else:
        print("MODO: Solo procesar ASINs nuevos y con error")
    print("=" * 60)
    
    # Rutas de archivos
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_csv = os.path.join(script_dir, "Asins_lista.csv")
    output_csv = os.path.join(script_dir, "Sortable_Results.csv")
    
    # Leer ASINs de la lista
    asins_list = read_asins_list(input_csv)
    
    if not asins_list:
        print(f"Error: No se encontraron ASINs en '{input_csv}'")
        print("   El archivo debe tener al menos una columna 'asin'")
        return
    
    print(f"\nASINs en lista: {len(asins_list)}")
    
    # Leer resultados existentes
    existing_results = load_existing_results_data(output_csv)
    
    # Separar ASINs exitosos de los que tienen error (is_sortable = None)
    existing_asins_success = {asin for asin, data in existing_results.items() 
                              if data.get('is_sortable') is not None}
    existing_asins_errors = {asin for asin, data in existing_results.items() 
                             if data.get('is_sortable') is None}
    
    print(f"ASINs ya procesados exitosamente: {len(existing_asins_success)}")
    if existing_asins_errors:
        print(f"ASINs con error (se reintentarán): {len(existing_asins_errors)}")
    
    # Determinar qué ASINs procesar
    if force_update:
        asins_to_process = list(asins_list.keys())
        print(f"Procesando todos los ASINs: {len(asins_to_process)}")
    else:
        # Procesar ASINs nuevos Y los que tienen error
        asins_to_process = [asin for asin in asins_list.keys() 
                           if asin not in existing_asins_success]
        print(f"ASINs a procesar (nuevos + con error): {len(asins_to_process)}")
    
    if not asins_to_process:
        print("\nNo hay ASINs nuevos para procesar.")
        if not force_update:
            print("Ejecuta el script nuevamente y selecciona la opción 2 para actualizar todos los ASINs.")
            print("O usa: python Verificar_Sortable.py --update-all")
        return
    
    print(f"\nProcesando {len(asins_to_process)} ASINs...")
    print("=" * 60)
    
    # Crear objeto de AmazonRequest para autenticación
    request = AmazonRequest()
    
    # Preparar datos de resultados (empezar con los existentes)
    results_data = existing_results.copy()
    
    # Contadores
    processed = 0
    sortable_count = 0
    unsortable_count = 0
    errors = 0
    
    # Actualizar fechas de actualización
    current_time = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    asins_update_dict = asins_list.copy()
    
    # Sistema adaptativo de workers
    current_workers = INITIAL_WORKERS
    remaining_asins = asins_to_process.copy()
    
    print(f"Iniciando con {current_workers} workers (máximo: {MAX_WORKERS_LIMIT})")
    print("El sistema ajustará automáticamente el número de workers según el rendimiento\n")
    
    # Procesar en lotes para poder ajustar dinámicamente
    while remaining_asins:
        # Tomar un lote de ASINs
        batch = remaining_asins[:BATCH_SIZE]
        remaining_asins = remaining_asins[BATCH_SIZE:]
        
        batch_processed = 0
        batch_errors = 0
        
        # Procesar el lote con el número actual de workers
        with ThreadPoolExecutor(max_workers=current_workers) as executor:
            future_to_asin = {executor.submit(process_asin_wrapper, request, asin): asin 
                              for asin in batch}
            
            # Procesar resultados conforme se completan
            for future in as_completed(future_to_asin):
                asin = future_to_asin[future]
                try:
                    asin_result, data = future.result()
                    
                    if data:
                        # Solo guardar asin e is_sortable
                        result_row = {
                            'asin': asin_result,
                            'is_sortable': data['is_sortable']
                        }
                        
                        # Actualizar resultados
                        results_data[asin_result] = result_row
                        # Solo actualizar fecha si fue exitoso
                        asins_update_dict[asin_result] = current_time
                        processed += 1
                        batch_processed += 1
                        
                        # Contar para estadísticas
                        if data['is_sortable'] is True:
                            sortable_count += 1
                            status = 'SORTABLE'
                        else:
                            unsortable_count += 1
                            status = 'NO'
                        
                        print(f"[{processed}/{len(asins_to_process)}] {asin_result}: {status} [Workers: {current_workers}]")
                    else:
                        # Error al procesar - NO actualizar fecha para que se reintente
                        error_row = {
                            'asin': asin_result,
                            'is_sortable': None
                        }
                        results_data[asin_result] = error_row
                        # NO actualizar fecha de actualización si hay error
                        # así se reintentará en la próxima ejecución
                        errors += 1
                        batch_errors += 1
                        print(f"[{processed + errors}/{len(asins_to_process)}] {asin_result}: ERROR (se reintentará) [Workers: {current_workers}]")
                        
                except Exception as e:
                    # Error al procesar - NO actualizar fecha para que se reintente
                    error_row = {
                        'asin': asin,
                        'is_sortable': None
                    }
                    results_data[asin] = error_row
                    # NO actualizar fecha de actualización si hay error
                    # así se reintentará en la próxima ejecución
                    errors += 1
                    batch_errors += 1
                    print(f"[{processed + errors}/{len(asins_to_process)}] {asin}: EXCEPCIÓN - {str(e)} (se reintentará) [Workers: {current_workers}]")
        
        # Calcular tasa de errores del lote
        batch_total = batch_processed + batch_errors
        if batch_total > 0:
            error_rate = batch_errors / batch_total
            
            # Ajustar número de workers según tasa de errores
            if error_rate < ERROR_THRESHOLD_LOW and current_workers < MAX_WORKERS_LIMIT:
                # Pocos errores: aumentar workers
                old_workers = current_workers
                current_workers = min(current_workers + 1, MAX_WORKERS_LIMIT)
                if current_workers > old_workers:
                    print(f"\n✓ Tasa de errores baja ({error_rate*100:.1f}%). Aumentando workers: {old_workers} → {current_workers}\n")
            elif error_rate > ERROR_THRESHOLD_HIGH and current_workers > 1:
                # Muchos errores: reducir workers
                old_workers = current_workers
                current_workers = max(current_workers - 1, 1)
                if current_workers < old_workers:
                    print(f"\n⚠ Tasa de errores alta ({error_rate*100:.1f}%). Reduciendo workers: {old_workers} → {current_workers}\n")
            elif batch_total >= BATCH_SIZE:
                # Mostrar estado si el lote fue completo
                print(f"  → Lote completado: {batch_processed} exitosos, {batch_errors} errores (tasa: {error_rate*100:.1f}%) - Workers: {current_workers}\n")
    
    # Escribir resultados actualizados
    fieldnames = ['asin', 'is_sortable']
    
    print("\nGuardando resultados...")
    with open(output_csv, 'w', newline='', encoding='utf-8-sig') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames, delimiter=',')
        writer.writeheader()
        # Escribir todos los resultados ordenados por ASIN
        for asin in sorted(results_data.keys()):
            writer.writerow(results_data[asin])
    
    # Actualizar lista de ASINs con fechas
    update_asins_list(input_csv, asins_update_dict)
    
    # Resumen final
    print()
    print("=" * 60)
    print("PROCESAMIENTO COMPLETADO")
    print("=" * 60)
    print(f"Total de ASINs procesados: {processed}")
    print(f"  Sortable: {sortable_count}")
    print(f"  No Sortable: {unsortable_count}")
    print(f"  Errores: {errors}")
    print(f"\nTotal de ASINs en resultados: {len(results_data)}")
    print(f"Resultados guardados en: {output_csv}")
    print(f"Lista actualizada en: {input_csv}")
    print("=" * 60)

if __name__ == "__main__":
    main()
