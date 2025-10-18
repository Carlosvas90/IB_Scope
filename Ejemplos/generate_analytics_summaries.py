import sqlite3
import json
import os
import sys
from datetime import datetime, timedelta
from collections import Counter

# Configurar codificación UTF-8 para la salida en Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except:
        pass

def read_config():
    """Lee el archivo config.json o usa configuración local"""
    # Intentar leer config.json primero
    config_paths = [
        "D:\\Users\\chuecc\\Downloads\\PPR_Scope\\config.json",
        "C:\\Users\\carlo\\Downloads\\0-IB-Scope\\IB_Scope\\config\\config.json",
        os.path.join(os.path.dirname(__file__), "..", "config", "config.json")
    ]
    
    for config_path in config_paths:
        if os.path.exists(config_path):
            try:
                with open(config_path, "r") as f:
                    config = json.load(f)
                print(f"✅ Configuración cargada desde: {config_path}")
                return config
            except Exception as e:
                print(f"⚠️ Error al leer {config_path}: {e}")
                continue
    
    # Si no se encuentra config.json, usar configuración hardcoded para testing local
    print("⚠️ No se encontró config.json, usando configuración local hardcoded")
    return {
        "DB_Local": "C:\\Users\\carlo\\Downloads\\0-Proyecto_IB_Scope\\Analisis\\Data\\DB",
        "DB_Network": "",
        "UnificarRuta_Network": "C:\\Users\\carlo\\Downloads\\0-Proyecto_IB_Scope\\Analisis\\Data"
    }

def get_db_path(config):
    """Obtiene la ruta de la base de datos (prioriza local para analytics)"""
    # Soportar tanto formato antiguo (DB_Local) como nuevo (db_paths array)
    db_paths = []
    
    # Formato nuevo (array)
    if "db_paths" in config:
        db_paths = config.get("db_paths", [])
    # Formato antiguo (strings individuales)
    else:
        db_local = config.get("DB_Local", "")
        db_network = config.get("DB_Network", "")
        if db_local:
            db_paths.append(db_local)
        if db_network:
            db_paths.append(db_network)
    
    # Intentar cada ruta en orden (prioridad: local primero)
    for i, db_dir in enumerate(db_paths):
        if not db_dir:
            continue
        db_path = os.path.join(db_dir, "Inventory_Health.db")
        if os.path.exists(db_path):
            location = "LOCAL" if i == len(db_paths) - 1 else f"RED-{i+1}"
            return db_path, location
    
    # Si no se encuentra, retornar la primera ruta (fallback)
    if db_paths:
        return os.path.join(db_paths[-1], "Inventory_Health.db"), "LOCAL"
    
    return "Inventory_Health.db", "LOCAL"

def get_date_range(days):
    """
    Calcula el rango de fechas desde hace N días hasta AYER (no incluye hoy).
    
    Args:
        days (int): Número de días hacia atrás
    
    Returns:
        tuple: (fecha_inicio, fecha_fin) en formato YYYY-MM-DD
    """
    # Hasta ayer (no incluir hoy)
    end_date = datetime.now() - timedelta(days=1)
    # Desde hace N días
    start_date = end_date - timedelta(days=days-1)
    
    return start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d")

def calculate_kpis(errors):
    """Calcula los KPIs principales"""
    if not errors:
        return {
            "total_incidents": 0,
            "daily_average": 0,
            "pending": 0,
            "resolved": 0,
            "resolution_rate": 0
        }
    
    # Sumar quantities (cada error puede tener múltiples ocurrencias)
    total = sum(e.get('quantity', 1) for e in errors)
    pending = sum(e.get('quantity', 1) for e in errors if e['feedback_status'] == 'pending')
    resolved = total - pending
    
    # Calcular días únicos para el promedio
    unique_dates = set(e['error_date'] for e in errors)
    days_count = len(unique_dates) if unique_dates else 1
    daily_avg = round(total / days_count, 1)
    
    resolution_rate = round((resolved / total) * 100, 1) if total > 0 else 0
    
    return {
        "total_incidents": total,
        "daily_average": daily_avg,
        "pending": pending,
        "resolved": resolved,
        "resolution_rate": resolution_rate
    }

def calculate_trends_by_day(errors):
    """Calcula tendencias por día con desglose por estado"""
    if not errors:
        return []
    
    # Sumar quantities por día y estado
    day_data = {}
    for e in errors:
        date = e['error_date']
        quantity = e.get('quantity', 1)
        status = e['feedback_status']
        
        if date not in day_data:
            day_data[date] = {'total': 0, 'pending': 0, 'resolved': 0}
        
        day_data[date]['total'] += quantity
        if status == 'pending':
            day_data[date]['pending'] += quantity
        else:
            day_data[date]['resolved'] += quantity
    
    # Ordenar por fecha
    sorted_days = sorted(day_data.items())
    
    return [
        {
            "date": date,
            "total": data['total'],
            "pending": data['pending'],
            "resolved": data['resolved']
        }
        for date, data in sorted_days
    ]

def calculate_trends_by_hour(errors):
    """Calcula tendencias por hora del día"""
    if not errors:
        return []
    
    # Sumar quantities por hora
    hour_counts = {}
    for error in errors:
        try:
            # Extraer hora del campo error_time (formato: HH:MM:SS)
            hour = error['error_time'].split(':')[0]
            hour_key = f"{hour}:00"
            quantity = error.get('quantity', 1)
            hour_counts[hour_key] = hour_counts.get(hour_key, 0) + quantity
        except:
            continue
    
    # Asegurar que todas las horas estén presentes (00:00 a 23:00)
    all_hours = [f"{h:02d}:00" for h in range(24)]
    
    return [
        {
            "hour": hour,
            "count": hour_counts.get(hour, 0)
        }
        for hour in all_hours
    ]

def calculate_distribution_by_status(errors):
    """Calcula distribución por estado"""
    if not errors:
        return []
    
    # Sumar quantities por estado
    status_counts = {}
    for e in errors:
        status = e['feedback_status']
        quantity = e.get('quantity', 1)
        status_counts[status] = status_counts.get(status, 0) + quantity
    
    total = sum(status_counts.values())
    
    return [
        {
            "status": status,
            "count": count,
            "percentage": round((count / total) * 100, 1)
        }
        for status, count in sorted(status_counts.items(), key=lambda x: x[1], reverse=True)
    ]

def calculate_top_asins(errors, limit=10):
    """Calcula top ASINs con más errores"""
    if not errors:
        return []
    
    # Agrupar por ASIN
    asin_data = {}
    total_errors = 0
    for error in errors:
        asin = error['asin']
        quantity = error.get('quantity', 1)
        total_errors += quantity
        
        if asin not in asin_data:
            asin_data[asin] = {
                'violations': [],
                'motives': [],
                'count': 0
            }
        asin_data[asin]['count'] += quantity
        # Agregar violación quantity veces para el most_common
        asin_data[asin]['violations'].extend([error['violation']] * quantity)
        if error['feedback_motive']:
            asin_data[asin]['motives'].extend([error['feedback_motive']] * quantity)
    
    # Calcular top ASINs
    top_asins = []
    for asin, data in sorted(asin_data.items(), key=lambda x: x[1]['count'], reverse=True)[:limit]:
        most_common_error = Counter(data['violations']).most_common(1)[0][0] if data['violations'] else ""
        most_common_motive = Counter(data['motives']).most_common(1)[0][0] if data['motives'] else "Sin motivo"
        
        top_asins.append({
            "asin": asin,
            "total_errors": data['count'],
            "most_common_error": most_common_error,
            "most_common_motive": most_common_motive,
            "frequency": round((data['count'] / total_errors) * 100, 1) if total_errors > 0 else 0
        })
    
    return top_asins

def calculate_top_violations(errors, limit=10):
    """Calcula top violaciones más comunes"""
    if not errors:
        return []
    
    # Sumar quantities por violación
    violation_counts = {}
    for e in errors:
        violation = e['violation']
        quantity = e.get('quantity', 1)
        violation_counts[violation] = violation_counts.get(violation, 0) + quantity
    
    total = sum(violation_counts.values())
    
    # Ordenar por count y tomar top N
    sorted_violations = sorted(violation_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    
    return [
        {
            "violation": violation,
            "count": count,
            "percentage": round((count / total) * 100, 1)
        }
        for violation, count in sorted_violations
    ]

def calculate_top_motives(errors, limit=10):
    """Calcula top motivos más comunes (incluye 'Sin motivo' si aplica)"""
    if not errors:
        return []
    
    # Sumar quantities por motivo
    motive_counts = {}
    for e in errors:
        quantity = e.get('quantity', 1)
        
        # Si tiene motivo, contarlo
        if e['feedback_motive'] and e['feedback_motive'].strip():
            motive = e['feedback_motive'].strip()
            motive_counts[motive] = motive_counts.get(motive, 0) + quantity
        else:
            # Contar "Sin motivo" para visibilidad
            motive_counts['Sin motivo'] = motive_counts.get('Sin motivo', 0) + quantity
    
    if not motive_counts:
        return []
    
    total = sum(motive_counts.values())
    
    # Ordenar por count y tomar top N
    sorted_motives = sorted(motive_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    
    return [
        {
            "motive": motive,
            "count": count,
            "percentage": round((count / total) * 100, 1)
        }
        for motive, count in sorted_motives
    ]

def calculate_top_offenders(errors, limit=10):
    """Calcula top usuarios con más errores"""
    if not errors:
        return []
    
    # Agrupar por usuario
    user_data = {}
    total_errors = 0
    for error in errors:
        user = error['user_id']
        quantity = error.get('quantity', 1)
        total_errors += quantity
        
        if user not in user_data:
            user_data[user] = {
                'violations': [],
                'motives': [],
                'count': 0
            }
        user_data[user]['count'] += quantity
        # Agregar violación quantity veces para el most_common
        user_data[user]['violations'].extend([error['violation']] * quantity)
        if error['feedback_motive']:
            user_data[user]['motives'].extend([error['feedback_motive']] * quantity)
    
    # Calcular top offenders
    top_offenders = []
    for user, data in sorted(user_data.items(), key=lambda x: x[1]['count'], reverse=True)[:limit]:
        most_common_error = Counter(data['violations']).most_common(1)[0][0] if data['violations'] else ""
        most_common_motive = Counter(data['motives']).most_common(1)[0][0] if data['motives'] else "Sin motivo"
        
        top_offenders.append({
            "login": user,
            "total_errors": data['count'],
            "most_common_error": most_common_error,
            "most_common_motive": most_common_motive,
            "error_rate": round((data['count'] / total_errors) * 100, 1) if total_errors > 0 else 0
        })
    
    return top_offenders

def calculate_insights(errors, trends_by_day, trends_by_hour):
    """
    Genera insights automáticos basados en los datos.
    
    Args:
        errors (list): Lista de errores
        trends_by_day (list): Tendencias por día
        trends_by_hour (list): Tendencias por hora
    
    Returns:
        dict: Insights con análisis automático
    """
    if not errors or not trends_by_day or not trends_by_hour:
        return {
            "peak_hour": None,
            "worst_day": None,
            "best_day": None,
            "trend": "unknown",
            "suggestions": []
        }
    
    # Encontrar hora pico
    max_hour = max(trends_by_hour, key=lambda x: x['count'])
    peak_hour = {
        "hour": max_hour['hour'],
        "count": max_hour['count']
    }
    
    # Calcular porcentaje de la hora pico respecto al total
    total_errors = sum(h['count'] for h in trends_by_hour)
    if total_errors > 0:
        peak_hour["percentage"] = round((max_hour['count'] / total_errors) * 100, 1)
    else:
        peak_hour["percentage"] = 0
    
    # Encontrar peor y mejor día
    max_day = max(trends_by_day, key=lambda x: x['total'])
    min_day = min(trends_by_day, key=lambda x: x['total'])
    
    worst_day = {
        "date": max_day['date'],
        "count": max_day['total']
    }
    
    best_day = {
        "date": min_day['date'],
        "count": min_day['total']
    }
    
    # Calcular tendencia (comparar primera mitad vs segunda mitad del periodo)
    mid_point = len(trends_by_day) // 2
    if mid_point > 0:
        first_half_avg = sum(d['total'] for d in trends_by_day[:mid_point]) / mid_point
        second_half_avg = sum(d['total'] for d in trends_by_day[mid_point:]) / (len(trends_by_day) - mid_point)
        
        # Calcular diferencia porcentual
        if first_half_avg > 0:
            change_pct = ((second_half_avg - first_half_avg) / first_half_avg) * 100
            
            if change_pct > 15:
                trend = "increasing"
                trend_description = f"Tendencia creciente ({change_pct:.1f}% más errores)"
            elif change_pct < -15:
                trend = "decreasing"
                trend_description = f"Tendencia decreciente ({abs(change_pct):.1f}% menos errores)"
            else:
                trend = "stable"
                trend_description = "Tendencia estable"
        else:
            trend = "stable"
            trend_description = "Tendencia estable"
    else:
        trend = "unknown"
        trend_description = "Datos insuficientes para determinar tendencia"
    
    # Generar sugerencias automáticas
    suggestions = []
    
    # Sugerencia por hora pico
    if peak_hour['percentage'] > 10:
        suggestions.append(
            f"🔥 El pico de errores ocurre a las {peak_hour['hour']} ({peak_hour['count']} errores, "
            f"{peak_hour['percentage']}% del total). Considerar refuerzo en ese horario."
        )
    
    # Sugerencia por tendencia
    if trend == "increasing":
        suggestions.append(
            f"📈 {trend_description}. Se recomienda analizar las causas del incremento."
        )
    elif trend == "decreasing":
        suggestions.append(
            f"📉 {trend_description}. ¡Buen trabajo! Mantener las medidas actuales."
        )
    
    # Sugerencia por variabilidad entre días
    if len(trends_by_day) > 1:
        day_variance = worst_day['count'] / best_day['count'] if best_day['count'] > 0 else 0
        if day_variance > 2:
            suggestions.append(
                f"⚠️ Alta variabilidad entre días: el peor día tuvo {day_variance:.1f}x más errores "
                f"que el mejor día. Investigar factores que causan estas variaciones."
            )
    
    # Sugerencia por volumen total
    daily_avg = total_errors / len(trends_by_day) if len(trends_by_day) > 0 else 0
    if daily_avg > 500:
        suggestions.append(
            f"⚠️ Promedio diario alto ({daily_avg:.0f} errores/día). "
            f"Se recomienda revisión de procesos y capacitación."
        )
    
    return {
        "peak_hour": peak_hour,
        "worst_day": worst_day,
        "best_day": best_day,
        "trend": trend,
        "trend_description": trend_description,
        "suggestions": suggestions
    }

def calculate_asin_offenders(errors, limit=10):
    """Calcula ASINs offenders (igual a top_asins pero con estructura diferente)"""
    # Es la misma lógica que top_asins, mantener por compatibilidad
    return calculate_top_asins(errors, limit)

def generate_summary(conn, period_name, days):
    """
    Genera un resumen completo para un periodo específico.
    
    Args:
        conn: Conexión a la base de datos
        period_name (str): Nombre del periodo (ej: "last_week")
        days (int): Número de días del periodo
    
    Returns:
        dict: Resumen completo con todos los datos
    """
    print(f"\n📊 Generando resumen para: {period_name} ({days} días)")
    
    # Obtener rango de fechas (hasta ayer)
    start_date, end_date = get_date_range(days)
    
    print(f"📅 Rango: {start_date} a {end_date}")
    
    # Consultar errores del periodo
    query = """
    SELECT 
        error_id, user_id, error_date, error_time, asin,
        old_container, new_container, process, job_action, violation,
        feedback_status, feedback_motive, quantity
    FROM error_tracking
    WHERE error_date BETWEEN ? AND ?
    ORDER BY error_date, error_time
    """
    
    cursor = conn.cursor()
    cursor.execute(query, (start_date, end_date))
    rows = cursor.fetchall()
    
    # Convertir a lista de diccionarios
    errors = []
    for row in rows:
        errors.append({
            'error_id': row[0],
            'user_id': row[1],
            'error_date': row[2],
            'error_time': row[3],
            'asin': row[4],
            'old_container': row[5],
            'new_container': row[6],
            'process': row[7],
            'job_action': row[8],
            'violation': row[9],
            'feedback_status': row[10],
            'feedback_motive': row[11],
            'quantity': row[12]
        })
    
    print(f"✅ Errores encontrados: {len(errors)}")
    
    # Calcular tendencias (necesarios para insights)
    trends_by_day = calculate_trends_by_day(errors)
    trends_by_hour = calculate_trends_by_hour(errors)
    
    # Calcular todos los datos
    summary = {
        "metadata": {
            "period": period_name,
            "start_date": start_date,
            "end_date": end_date,
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_days": days,
            "total_records": len(errors),
            "excludes_today": True
        },
        "kpis": calculate_kpis(errors),
        "trends": {
            "by_day": trends_by_day,
            "by_hour": trends_by_hour
        },
        "distribution": {
            "by_status": calculate_distribution_by_status(errors)
        },
        "top_asins": calculate_top_asins(errors),
        "top_violations": calculate_top_violations(errors),
        "top_motives": calculate_top_motives(errors),
        "top_offenders": calculate_top_offenders(errors),
        "asin_offenders": calculate_asin_offenders(errors),
        "insights": calculate_insights(errors, trends_by_day, trends_by_hour)
    }
    
    return summary

def save_summary(summary, filename, output_dir):
    """Guarda el resumen en un archivo JSON"""
    filepath = os.path.join(output_dir, filename)
    
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        # Calcular tamaño del archivo
        file_size_kb = round(os.path.getsize(filepath) / 1024, 1)
        print(f"✅ Guardado: {filename} ({file_size_kb} KB)")
        
        return file_size_kb
    except Exception as e:
        print(f"❌ Error guardando {filename}: {e}")
        return 0

def generate_metadata(summaries_info, output_dir):
    """Genera el archivo metadata.json con información de todos los periodos"""
    today = datetime.now().strftime("%d%m%Y")
    
    metadata = {
        "files": summaries_info,
        "last_update_check": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "today_file": f"error_tracker_{today}.json",
        "note": "Todos los archivos excluyen el día actual (hoy). Combinar con today_file para datos completos."
    }
    
    filepath = os.path.join(output_dir, "metadata.json")
    
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        print(f"✅ Metadata guardado: metadata.json")
    except Exception as e:
        print(f"❌ Error guardando metadata: {e}")

def main():
    print("\n=== Generador de Resúmenes Analytics ===")
    print(f"Inicio: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Leer configuración
    config = read_config()
    if not config:
        print("❌ No se pudo cargar la configuración")
        return
    
    # Obtener ruta de la base de datos
    db_path, db_location = get_db_path(config)
    print(f"📊 Base de datos: {db_location}")
    print(f"📂 DB Path: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"❌ No se encontró la base de datos: {db_path}")
        return
    
    # Conectar a la base de datos
    try:
        conn = sqlite3.connect(db_path)
        print(f"✅ Conectado a la base de datos\n")
    except Exception as e:
        print(f"❌ Error conectando a la base de datos: {e}")
        return
    
    # Obtener directorio de salida
    # Intentar primero analytics_paths, luego data_paths, luego UnificarRuta_Network
    analytics_dir = None
    
    if "analytics_paths" in config:
        # Formato nuevo: analytics_paths ya apunta directo a Analytics/
        analytics_paths = config.get("analytics_paths", [])
        for path in reversed(analytics_paths):  # Priorizar local (último)
            if path and os.path.exists(os.path.dirname(path)):
                analytics_dir = path.rstrip("\\").rstrip("/")
                break
    
    if not analytics_dir and "data_paths" in config:
        # Formato nuevo: data_paths + Analytics/
        data_paths = config.get("data_paths", [])
        for path in reversed(data_paths):  # Priorizar local (último)
            if path:
                potential_dir = os.path.join(path, "Analytics")
                if os.path.exists(os.path.dirname(potential_dir)):
                    analytics_dir = potential_dir
                    break
    
    if not analytics_dir:
        # Formato antiguo: UnificarRuta_Network
        output_dir = config.get("UnificarRuta_Network", "")
        if output_dir:
            analytics_dir = os.path.join(output_dir, "Analytics")
        else:
            print("❌ No se encontró ruta de salida en config.json")
            conn.close()
            return
    
    # Crear directorio Analytics si no existe
    if not os.path.exists(analytics_dir):
        try:
            os.makedirs(analytics_dir)
            print(f"✅ Directorio creado: {analytics_dir}")
        except Exception as e:
            print(f"❌ Error creando directorio: {e}")
            conn.close()
            return
    
    print(f"📂 Directorio de salida: {analytics_dir}\n")
    
    # Definir periodos a generar
    periods = [
        ("last_6_months", 180, "summary_last_6_months.json"),
        ("last_3_months", 90, "summary_last_3_months.json"),
        ("last_month", 30, "summary_last_month.json"),
        ("last_week", 7, "summary_last_week.json"),
        ("last_3_days", 3, "summary_last_3_days.json")
    ]
    
    # Generar resúmenes
    summaries_info = []
    
    for period_name, days, filename in periods:
        try:
            summary = generate_summary(conn, period_name, days)
            file_size_kb = save_summary(summary, filename, analytics_dir)
            
            # Guardar info para metadata
            summaries_info.append({
                "period": period_name,
                "file": filename,
                "start_date": summary['metadata']['start_date'],
                "end_date": summary['metadata']['end_date'],
                "size_kb": file_size_kb,
                "last_generated": summary['metadata']['generated_at'],
                "records": summary['metadata']['total_records']
            })
            
        except Exception as e:
            print(f"❌ Error generando {period_name}: {e}")
            import traceback
            traceback.print_exc()
    
    # Generar metadata
    generate_metadata(summaries_info, analytics_dir)
    
    # Cerrar conexión
    conn.close()
    
    # Resumen final
    print(f"\n{'='*50}")
    print(f"✅ Proceso completado")
    print(f"{'='*50}")
    print(f"\n📊 Resumen:")
    print(f"   Archivos generados: {len(summaries_info) + 1}")
    print(f"   Ubicación: {analytics_dir}")
    
    total_size = sum(info['size_kb'] for info in summaries_info)
    print(f"   Tamaño total: {total_size:.1f} KB")
    
    print(f"\n📁 Archivos creados:")
    for info in summaries_info:
        print(f"   ✅ {info['file']} ({info['size_kb']} KB) - {info['records']} registros")
    print(f"   ✅ metadata.json")
    
    print(f"\nFin: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()

