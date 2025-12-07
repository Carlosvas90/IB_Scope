from io import StringIO
import pandas as pd
from bs4 import BeautifulSoup as bs
import string
import os
import sys
import subprocess
import json
import time
from datetime import datetime
from amazon_utils import AmazonRequest


def _download_dps_portal_data(fc: str, endpoint: str, data_type: str):
    """
    Función helper genérica para descargar datos del DPS Portal.
    
    :param fc: Código del centro de distribución (ej: 'VLC1')
    :param endpoint: Nombre del endpoint (ej: 'downloadAllLockedEmptyBins.do')
    :param data_type: Nombre del tipo de datos para mensajes de error
    :return: DataFrame con los datos o None en caso de error
    """
    req = AmazonRequest()
    req.set_mw_cookie()
    
    BASE_URL = f"https://dpsportal-na.amazon.com/palletstowrecommendation/{endpoint}"
    
    params = {
        'warehouseId': fc
    }
    
    response = req.send_req(url=BASE_URL, params=params)
    if not response.ok:
        req.set_mw_cookie(flags=['-o'], delete_cookie=True)
        response = req.send_req(url=BASE_URL, params=params)
    
    if response.ok:
        try:
            df = pd.read_csv(StringIO(response.text), low_memory=False)
            return df
        except Exception as e:
            print(f"Error al procesar CSV de {data_type}: {str(e)}")
            return None
    else:
        return None


def get_locked_empty_bins(fc: str):
    """
    Obtiene todos los bins vacíos bloqueados desde DPS Portal.
    
    :param fc: Código del centro de distribución (ej: 'VLC1')
    :return: DataFrame con los bins bloqueados vacíos o None en caso de error
    """
    return _download_dps_portal_data(fc, "downloadAllLockedEmptyBins.do", "locked empty bins")


def get_pending_verification_bins(fc: str):
    """
    Obtiene los bins pendientes de verificación desde DPS Portal.
    
    :param fc: Código del centro de distribución (ej: 'VLC1')
    :return: DataFrame con los bins pendientes de verificación o None en caso de error
    """
    return _download_dps_portal_data(fc, "downloadPendingVerificationBins.do", "pending verification bins")


def get_pending_stow_bins(fc: str):
    """
    Obtiene los bins pendientes de stow desde DPS Portal.
    
    :param fc: Código del centro de distribución (ej: 'VLC1')
    :return: DataFrame con los bins pendientes de stow o None en caso de error
    """
    return _download_dps_portal_data(fc, "downloadPendingStowBins.do", "pending stow bins")


def get_stow_map(fc: str, floor: int = None, mod: str = None, aisle: int = None, is_locked: str = None,
                can_hold_high_value: str = None, can_hold_full_case: str = None, can_hold_non_conveyable: str = None,
                can_hold_sortable: str = None, bin_types: list = None, shelves: list = None, bin_usages: list = None):
    """
    Obtiene el mapa de almacenamiento para un piso específico en un centro de distribución de Amazon.
    """
    bin_properties = dict()

    # Configuración de los parámetros por defecto
    if mod is None and aisle is None and floor is None:
        floor = 1
    if mod is None:
        mod = ''
    if aisle is None:
        aisle = ''
    if floor is None:
        floor = ''

    # Configuración de los flags por defecto
    bin_properties["warehouseId"] = fc
    bin_properties["floor"] = floor
    bin_properties["mod"] = mod
    bin_properties["aisle"] = aisle
    bin_properties["isLocked"] = is_locked if is_locked else 'Ignore'
    bin_properties["canHoldHighValue"] = can_hold_high_value if can_hold_high_value else 'Ignore'
    bin_properties["canHoldFullCase"] = can_hold_full_case if can_hold_full_case else 'Ignore'
    bin_properties["canHoldNonConveyable"] = can_hold_non_conveyable if can_hold_non_conveyable else 'Ignore'
    bin_properties["canHoldSortable"] = can_hold_sortable if can_hold_sortable else 'Ignore'

    # Obtención de bin_types y usage dinámicamente desde el sitio web
    req = AmazonRequest()
    req.set_mw_cookie()
    
    # Enviar una solicitud a StowMap
    response = req.send_req("https://stowmap-eu.amazon.com/stowmap/loadFCAreaMap.htm?warehouseId=VLC1")
    if not response.ok:
        req.set_mw_cookie(flags=['-o'], delete_cookie=True)
        response = req.send_req("https://stowmap-eu.amazon.com/stowmap/loadFCAreaMap.htm?warehouseId=VLC1")
    if not response.ok:
        return None

    soup = bs(response.text, "html.parser")

    # Encontrar ul con clase "metric"
    ul = soup.find_all("ul", {"class": "metric"})

    data = {}

    for i in ul:
        metric_head = bs(str(i), "html.parser").find("li", {"class": "metric-head"})
        if metric_head is not None:
            data[metric_head.text.strip()] = []
            metric_content = bs(str(i), "html.parser").find("ul", {"class": "metric-content"})
            if metric_content is not None:
                for j in metric_content.find_all("li"):
                    data[metric_head.text.strip()] += [j.text.strip()]

    # Configuración de bin_types, shelves y bin_usages por defecto
    if not bin_types:
        bin_types = data.get('type', [])

    if not shelves:
        shelves = list(string.ascii_uppercase)

    if not bin_usages:
        bin_usages = data.get('usage', [])

    bin_properties['binTypeList'] = bin_types
    bin_properties['shelfList'] = shelves
    bin_properties['binUsageList'] = bin_usages

    BASE_URL = "https://stowmap-eu.amazon.com/stowmap/getBinStatusReport.do"

    params = {
        'warehouseId': fc,
        'binProperties': str(bin_properties).replace(':', '=')
    }

    response = req.send_req(url=BASE_URL, params=params)
    if response.ok:
        try:
            df = pd.read_csv(StringIO(response.text), low_memory=False)
            return df
        except:
            return None
    else:
        return None  # Retorna None en caso de fallo

def write_progress(data_folder, percentage, message):
    """
    Escribe el progreso en un archivo JSON para que el frontend lo lea.
    
    :param data_folder: Carpeta donde guardar el archivo de progreso
    :param percentage: Porcentaje de progreso (0-100)
    :param message: Mensaje descriptivo del paso actual
    """
    try:
        progress_file = os.path.join(data_folder, "progress.json")
        progress_data = {
            "percentage": percentage,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        # Escribir y asegurar que se guarde inmediatamente
        with open(progress_file, 'w', encoding='utf-8') as f:
            json.dump(progress_data, f)
            f.flush()  # Forzar escritura inmediata al disco
            os.fsync(f.fileno())  # Sincronizar con el sistema de archivos
        # También forzar flush de stdout para que los prints se vean
        sys.stdout.flush()
    except Exception as e:
        # No fallar si no se puede escribir el progreso
        print(f"[DEBUG] Error escribiendo progreso: {e}")
        sys.stdout.flush()


if __name__ == '__main__':
    fc = 'VLC1'
    all_dfs = []
    
    # Determinar la carpeta de datos al inicio
    if len(sys.argv) > 1:
        user_data_path = sys.argv[1]
        data_folder = os.path.join(user_data_path, "data", "space-heatmap")
    else:
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
        data_folder = os.path.join(project_root, "data", "space-heatmap")
    
    # Crear la carpeta si no existe
    if not os.path.exists(data_folder):
        os.makedirs(data_folder)
    
    # Crear archivo de progreso inicial ANTES de cualquier otra operación
    write_progress(data_folder, 0, "Iniciando descarga")
    print("Iniciando el proceso de descarga y combinacion de datos de StowMap.", flush=True)
    sys.stdout.flush()
    # Pausa para que se vea el mensaje inicial
    time.sleep(0.5)

    # Descargar pisos 1-5 (60% del progreso total, 12% por piso)
    total_floors = 5
    
    for floor in range(1, total_floors + 1):
        progress_pct = int((floor - 1) * 12)  # 0, 12, 24, 36, 48
        write_progress(data_folder, progress_pct, f"Descargando P{floor}")
        # Pausa para que se vea el mensaje antes de empezar la descarga
        time.sleep(0.3)
        print(f"Descargando Piso {floor}...", flush=True)
        sys.stdout.flush()
        
        df = get_stow_map(fc=fc, floor=floor)
        if df is not None:
            # Añadir información del piso al DataFrame si no está presente
            if 'Floor' not in df.columns:
                df['Floor'] = floor
            all_dfs.append(df)
            progress_pct_complete = int(floor * 12)  # 12, 24, 36, 48, 60
            write_progress(data_folder, progress_pct_complete, f"P{floor} completado")
            # Pausa para que se vea el mensaje de completado
            time.sleep(0.3)
            print(f"[OK] Piso {floor} descargado", flush=True)
            sys.stdout.flush()
        else:
            print(f"Fallo al obtener datos para el Piso {floor}.", flush=True)
            sys.stdout.flush()
            write_progress(data_folder, progress_pct, f"Error descargando P{floor}")

    if all_dfs:
        # 60-67%: Combinando y procesando datos
        write_progress(data_folder, 60, "Combinando datos")
        time.sleep(0.3)
        print("Generando Csv...", flush=True)
        sys.stdout.flush()
        combined_df = pd.concat(all_dfs, ignore_index=True)

        # Eliminar las columnas no deseadas si existen
        write_progress(data_folder, 62, "Limpiando datos")
        time.sleep(0.3)
        columnas_a_eliminar = [
            'Bin Size',
            'Available Bin Volume',
            'Bin Usage',
            'Can Hold High Value Asins',
            'Can Hold Full Case Asins',
            'Can Hold Non Conveyable Asins',
            'Can Hold Sortable',
            'Max Unique Asin Count'
        ]
        columnas_presentes = [col for col in columnas_a_eliminar if col in combined_df.columns]
        combined_df.drop(columns=columnas_presentes, inplace=True)
        
        # 64%: Guardando datos
        write_progress(data_folder, 64, "Guardando CSV")
        time.sleep(0.3)
        sys.stdout.flush()
        
        # Nombre del archivo
        filename = "Stowmap_data.csv"
        filepath = os.path.join(data_folder, filename)
        
        # Guardar el DataFrame final en CSV
        combined_df.to_csv(filepath, index=False)
        print(f"[OK] CSV Exportado: {filepath}", flush=True)
        sys.stdout.flush()
        
        # 67%: Guardando metadata
        write_progress(data_folder, 67, "Guardando metadata")
        time.sleep(0.3)
        
        # Guardar archivo de última actualización (JSON simple y rápido de leer)
        update_info = {
            "last_update": datetime.now().isoformat(),
            "timestamp": datetime.now().timestamp()
        }
        update_file = os.path.join(data_folder, "last_update.json")
        with open(update_file, 'w', encoding='utf-8') as f:
            json.dump(update_info, f, indent=2)
            f.flush()
            os.fsync(f.fileno())
        print(f"[OK] Archivo de actualización guardado: {update_file}", flush=True)
        sys.stdout.flush()
        
        # 70-90%: Procesamiento de datos
        write_progress(data_folder, 70, "Procesando datos")
        time.sleep(0.3)
        print("\n[Procesamiento] Iniciando procesamiento de datos...", flush=True)
        sys.stdout.flush()
        try:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            procesar_script = os.path.join(script_dir, "Procesar_StowMap.py")
            
            write_progress(data_folder, 72, "Calculando estadísticas")
            time.sleep(0.3)
            
            # Ejecutar script de procesamiento con el mismo userData path si existe
            if len(sys.argv) > 1:
                result = subprocess.run(
                    [sys.executable, procesar_script, sys.argv[1]],
                    capture_output=True,
                    text=True
                )
            else:
                result = subprocess.run(
                    [sys.executable, procesar_script],
                    capture_output=True,
                    text=True
                )
            
            # Mostrar output del procesamiento
            if result.stdout:
                print(result.stdout, flush=True)
            if result.stderr and result.returncode != 0:
                print("[WARNING] Errores durante el procesamiento:", flush=True)
                print(result.stderr, flush=True)
            
            if result.returncode == 0:
                print("[OK] Procesamiento completado exitosamente!", flush=True)
                sys.stdout.flush()
                write_progress(data_folder, 90, "Procesamiento completado")
                time.sleep(0.3)
            else:
                print("[WARNING] El procesamiento termino con errores.", flush=True)
                sys.stdout.flush()
                write_progress(data_folder, 85, "Procesamiento con advertencias")
                time.sleep(0.3)
        except Exception as e:
            print(f"[WARNING] Error al ejecutar procesamiento: {str(e)}", flush=True)
            print("[INFO] Puedes ejecutar manualmente: python Procesar_StowMap.py", flush=True)
            sys.stdout.flush()
            write_progress(data_folder, 85, "Error en procesamiento")
            time.sleep(0.3)
    else:
        print("No se obtuvieron datos para ninguno de los pisos especificados.")
        write_progress(data_folder, 0, "Error: No se obtuvieron datos")
        sys.exit(1)
    
    # 90-100%: Descargar datos adicionales del DPS Portal
    write_progress(data_folder, 90, "Descargando datos adicionales")
    time.sleep(0.3)
    print("\n" + "="*50, flush=True)
    print("Iniciando descarga de datos adicionales del DPS Portal...", flush=True)
    print("="*50, flush=True)
    sys.stdout.flush()
    
    # Lista de funciones de descarga con sus nombres de archivo
    downloads = [
        (get_locked_empty_bins, "LockedEmptyBins_data.csv", "Locked Empty Bins"),
        (get_pending_verification_bins, "PendingVerificationBins_data.csv", "Pending Verification Bins"),
        (get_pending_stow_bins, "PendingStowBins_data.csv", "Pending Stow Bins")
    ]
    
    for idx, (download_func, filename, data_name) in enumerate(downloads, 1):
        progress_pct = 90 + int((idx - 1) * 3.33)  # 90, 93, 96 aproximadamente
        write_progress(data_folder, progress_pct, f"Descargando {data_name}")
        time.sleep(0.3)
        print(f"\nDescargando {data_name}...", flush=True)
        sys.stdout.flush()
        
        df = download_func(fc=fc)
        
        if df is not None:
            print(f"[OK] {data_name} descargados: {len(df)} registros", flush=True)
            sys.stdout.flush()
            filepath = os.path.join(data_folder, filename)
            df.to_csv(filepath, index=False)
            progress_pct_saved = 90 + int(idx * 3.33)  # 93, 96, 99 aproximadamente
            time.sleep(0.2)
            print(f"[OK] {data_name} CSV Exportado: {filepath}", flush=True)
            sys.stdout.flush()
        else:
            print(f"[WARNING] No se pudieron obtener los datos de {data_name}.", flush=True)
            sys.stdout.flush()
    
    # 100%: Completado
    write_progress(data_folder, 100, "Descarga completada")
    print("\n[OK] Proceso de descarga completado!", flush=True)
    sys.stdout.flush()

