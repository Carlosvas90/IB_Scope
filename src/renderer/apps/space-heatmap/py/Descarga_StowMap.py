from io import StringIO
import pandas as pd
from bs4 import BeautifulSoup as bs
import string
import os
import sys
import subprocess
from amazon_utils import AmazonRequest


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

if __name__ == '__main__':
    fc = 'VLC1'
    all_dfs = []
    print("Iniciando el proceso de descarga y combinacion de datos de StowMap.")

    for floor in range(1, 6):  # Pisos 1 al 5
        print(f"Descargando Piso {floor}...")
        df = get_stow_map(fc=fc, floor=floor)
        if df is not None:
            # Añadir información del piso al DataFrame si no está presente
            if 'Floor' not in df.columns:
                df['Floor'] = floor
            all_dfs.append(df)
        else:
            print(f"Fallo al obtener datos para el Piso {floor}.")

    if all_dfs:
        print("Generando Csv...")
        combined_df = pd.concat(all_dfs, ignore_index=True)

        # Eliminar las columnas no deseadas si existen
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

        # Determinar la carpeta de datos según el argumento recibido
        if len(sys.argv) > 1:
            # Si se pasa un argumento (userData path desde Electron), usar esa ubicación
            user_data_path = sys.argv[1]
            data_folder = os.path.join(user_data_path, "data", "space-heatmap")
            print(f"[MODO BUILD] Guardando en userData: {data_folder}")
        else:
            # Si no hay argumento (ejecución directa), usar carpeta del proyecto
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
            data_folder = os.path.join(project_root, "data", "space-heatmap")
            print(f"[MODO DESARROLLO] Guardando en proyecto: {data_folder}")
        
        # Crear la carpeta si no existe
        if not os.path.exists(data_folder):
            os.makedirs(data_folder)
        
        # Nombre del archivo
        filename = "Stowmap_data.csv"
        filepath = os.path.join(data_folder, filename)
        
        # Guardar el DataFrame final en CSV
        combined_df.to_csv(filepath, index=False)
        print(f"[OK] CSV Exportado: {filepath}")
        
        # Ejecutar procesamiento automático de los datos
        print("\n[Procesamiento] Iniciando procesamiento de datos...")
        try:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            procesar_script = os.path.join(script_dir, "Procesar_StowMap.py")
            
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
                print(result.stdout)
            if result.stderr and result.returncode != 0:
                print("[WARNING] Errores durante el procesamiento:")
                print(result.stderr)
            
            if result.returncode == 0:
                print("[OK] Procesamiento completado exitosamente!")
            else:
                print("[WARNING] El procesamiento termino con errores.")
        except Exception as e:
            print(f"[WARNING] Error al ejecutar procesamiento: {str(e)}")
            print("[INFO] Puedes ejecutar manualmente: python Procesar_StowMap.py")
    else:
        print("No se obtuvieron datos para ninguno de los pisos especificados.")

