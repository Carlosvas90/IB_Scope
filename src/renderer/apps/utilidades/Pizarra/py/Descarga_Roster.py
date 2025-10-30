from io import StringIO
import pandas as pd
import os
import sys
import json
import time
from datetime import datetime

# Importar amazon_utils desde space-heatmap
# Desde utilidades/Pizarra/py necesitamos subir 3 niveles y luego entrar a space-heatmap/py
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../space-heatmap/py'))
from amazon_utils import AmazonRequest


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


def download_employee_roster(fc: str):
    """
    Descarga el roster de empleados desde el portal FCLM.
    
    :param fc: Código del centro de distribución (ej: 'VLC1')
    :return: DataFrame con los datos del roster o None en caso de error
    """
    req = AmazonRequest()
    req.set_mw_cookie()
    
    BASE_URL = "https://fclm-portal.amazon.com/employee/employeeRoster"
    
    params = {
        'reportFormat': 'CSV',
        'warehouseId': fc,
        'employeeStatusActive': 'true',
        '_employeeStatusActive': 'on',
        '_employeeStatusLeaveOfAbsence': 'on',
        '_employeeStatusExempt': 'on',
        'employeeTypeAmzn': 'true',
        '_employeeTypeAmzn': 'on',
        'employeeTypeTemp': 'true',
        '_employeeTypeTemp': 'on',
        'employeeType3Pty': 'true',
        '_employeeType3Pty': 'on',
        'Employee ID': 'Employee ID',
        'User ID': 'User ID',
        'Employee Name': 'Employee Name',
        'Badge Barcode ID': 'Badge Barcode ID',
        'Department ID': 'Department ID',
        'Employment Start Date': 'Employment Start Date',
        'Employment Type': 'Employment Type',
        'Employee Status': 'Employee Status',
        'Manager Name': 'Manager Name',
        'Temp Agency Code': 'Temp Agency Code',
        'Shift Pattern': 'Shift Pattern',
        'submit': 'true'
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
            print(f"Error al procesar CSV del roster: {str(e)}", flush=True)
            sys.stdout.flush()
            return None
    else:
        return None


if __name__ == '__main__':
    fc = 'VLC1'
    
    # Determinar la carpeta de datos al inicio
    if len(sys.argv) > 1:
        user_data_path = sys.argv[1]
        data_folder = os.path.join(user_data_path, "data", "pizarra")
    else:
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))))
        data_folder = os.path.join(project_root, "data", "pizarra")
    
    # Crear la carpeta si no existe
    if not os.path.exists(data_folder):
        os.makedirs(data_folder)
    
    # Crear archivo de progreso inicial
    write_progress(data_folder, 0, "Preparando descarga del roster de empleados...")
    print("Iniciando descarga del roster de empleados desde FCLM Portal.", flush=True)
    sys.stdout.flush()
    time.sleep(0.5)
    
    # Descargar roster (0-90%)
    write_progress(data_folder, 10, "Descargando roster de empleados...")
    time.sleep(0.3)
    print("Descargando roster de empleados...", flush=True)
    sys.stdout.flush()
    
    df = download_employee_roster(fc=fc)
    
    if df is not None:
        write_progress(data_folder, 80, "Guardando datos del roster...")
        time.sleep(0.3)
        
        # Nombre del archivo
        filename = "employee_roster.csv"
        filepath = os.path.join(data_folder, filename)
        
        # Guardar el DataFrame en CSV
        df.to_csv(filepath, index=False)
        print(f"[OK] Roster CSV Exportado: {filepath}", flush=True)
        print(f"[OK] Total de empleados: {len(df)} registros", flush=True)
        sys.stdout.flush()
        
        # Guardar archivo de última actualización
        write_progress(data_folder, 90, "Guardando metadata...")
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
        
        # 100%: Completado
        write_progress(data_folder, 100, "¡Roster de empleados descargado exitosamente! 🎉")
        print("\n[OK] Proceso de descarga completado!", flush=True)
        sys.stdout.flush()
    else:
        write_progress(data_folder, 0, "Error: No se pudieron obtener los datos del roster")
        print("Error: No se pudieron obtener los datos del roster.", flush=True)
        sys.stdout.flush()
        sys.exit(1)

