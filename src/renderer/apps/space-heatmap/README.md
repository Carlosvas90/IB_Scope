# Space Heatmap - Descarga de StowMap

## 📋 Descripción

Esta aplicación descarga datos de StowMap de Amazon para los pisos 1-5 del centro de distribución VLC1.

## 🎨 Diseño

La interfaz está diseñada siguiendo el patrón de `user-activity.html` con:
- **Header card** con gradiente morado que contiene el título, estado del archivo y botón de descarga
- **Indicador de estado** en tiempo real que muestra la antigüedad de los datos
- **Animación de descarga** en el botón durante el proceso
- **Banner de mensajes** que aparece solo durante descarga o errores
- **Card informativa** con detalles sobre el proceso

## 🔧 Funcionamiento

### Flujo de Ejecución

```
1. Al abrir la app, verifica automáticamente el estado del archivo CSV
   ↓
2. Muestra indicador visual del estado:
   - 🟢 Verde: Datos actualizados (menos de 1 hora)
   - 🔴 Rojo: Datos desactualizados (más de 1 hora) - Pulsa para llamar atención
   - 🟠 Naranja: No hay datos descargados
   ↓
3. Usuario hace clic en "Descargar StowMap Data"
   ↓
4. Frontend obtiene la ruta de userData de Electron
   ↓
5. Se ejecuta el script Python con la ruta como argumento
   ↓
6. Script detecta si necesita autenticación Midway
   ↓
7. [Si es necesario] Se abre ventana CMD para ingresar PIN
   ↓
8. Script descarga datos de pisos 1-5
   ↓
9. Guarda CSV en la ubicación apropiada (desarrollo o build)
   ↓
10. Actualiza automáticamente el indicador de estado
   ↓
11. Muestra confirmación al usuario
```

### Indicadores de Estado de Datos

La aplicación verifica automáticamente la antigüedad de los datos y muestra:

- **✅ Datos actualizados** (verde): El archivo tiene menos de 1 hora de antigüedad
- **🕐 Datos desactualizados** (rojo pulsante): El archivo tiene más de 1 hora y se recomienda actualizar
- **⚠️ No hay datos** (naranja): No se han descargado datos todavía

El indicador se actualiza automáticamente al cargar la página y después de cada descarga exitosa.

### Autenticación

- El script requiere autenticación con **Midway** (sistema de seguridad de Amazon)
- Se abrirá una **ventana CMD externa** automáticamente para que ingreses tu PIN
- La autenticación es válida por 20 horas
- No requieres interactuar con la aplicación, solo con la ventana CMD

### Ubicación de los Datos

Los archivos descargados se guardan en diferentes ubicaciones según el modo:

**Modo Desarrollo:**
```
<root_del_proyecto>/data/space-heatmap/Stowmap_data.csv
```

**Modo Build (Producción):**
```
%APPDATA%/IB_Scope/data/space-heatmap/Stowmap_data.csv
```
Windows: `C:\Users\<TuUsuario>\AppData\Roaming\IB_Scope\data\space-heatmap\Stowmap_data.csv`

Esta carpeta está excluida del control de versiones (`.gitignore`) para proteger datos sensibles.

## 📁 Estructura

```
space-heatmap/
├── css/                    # Estilos de la interfaz
├── js/                     # Lógica frontend
├── py/                     # Scripts Python
│   ├── amazon_utils.py     # Utilidades de autenticación Amazon
│   └── Descarga_StowMap.py # Script principal de descarga
├── views/                  # Vistas HTML
└── README.md              # Este archivo
```

## ⚠️ Notas Importantes

1. **Seguridad**: Los datos descargados contienen información interna de Amazon y no deben ser compartidos
2. **Autenticación**: Si ves el error "GetConsoleMode failed", es normal - se resuelve automáticamente abriendo una ventana CMD separada
3. **Dependencias Python**: Requiere `pandas`, `requests`, `requests-kerberos`, `beautifulsoup4`

## 🐛 Solución de Problemas

- **Error de autenticación**: Asegúrate de tener `mwinit` instalado y configurado
- **Cookie expirada**: La aplicación te solicitará re-autenticarte automáticamente
- **Errores Unicode**: Los mensajes usan solo ASCII para compatibilidad con Windows cp1252

