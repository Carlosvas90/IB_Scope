# Setup para Pruebas de Updates desde Casa

## 📋 Configuración de Pruebas Locales

Ya tienes configuradas múltiples rutas en `config/update-config.json`:

```json
{
  "updatePaths": [
    "\\\\ant\\dept-eu\\VLC1\\Public\\Apps_Tools\\chuecc\\IB_Scope\\updates\\",
    "C:\\Users\\carlo\\Downloads\\0-Proyecto_IB_Scope\\Analisis\\updates\\"
  ]
}
```

## 🔧 Para Probar desde Casa:

### 1. Crear la carpeta local:

```bash
mkdir "C:\Users\carlo\Downloads\0-Proyecto_IB_Scope\Analisis\updates"
```

### 2. Crear `version.json` de prueba:

Archivo: `C:\Users\carlo\Downloads\0-Proyecto_IB_Scope\Analisis\updates\version.json`

```json
{
  "version": "1.0.1",
  "filename": "test-update.exe",
  "changelog": "Versión de prueba del sistema de actualizaciones automáticas desde casa"
}
```

### 3. Crear un archivo ejecutable de prueba:

- Copia cualquier `.exe` pequeño (como notepad.exe)
- Renómbralo a `test-update.exe`
- Ponlo en la misma carpeta

### 4. Estructura final:

```
C:\Users\carlo\Downloads\0-Proyecto_IB_Scope\Analisis\updates\
├── version.json
└── test-update.exe
```

## 🧪 Cómo Probar:

1. **Asegúrate** que `currentVersion` en config sea `"1.0.0"`
2. **Inicia la app** - debería detectar la versión `1.0.1`
3. **Verifica logs** en la consola:
   ```
   [UpdateService] Verificando updates en rutas: [...]
   [UpdateService] Probando ruta: \\ant\dept-eu\...
   [UpdateService] Ruta no accesible: \\ant\dept-eu\...
   [UpdateService] Probando ruta: C:\Users\carlo\Downloads\...
   [UpdateService] ¡Update disponible en: C:\Users\carlo\Downloads\...!
   ```

## 🎯 Comportamiento Esperado:

✅ **En casa**: Usa la ruta local (segunda)  
✅ **En empresa**: Usa la ruta de red (primera)  
✅ **Fallback automático**: Si una falla, prueba la siguiente

## 🔄 Lógica del Sistema:

1. Prueba primera ruta: `\\ant\dept-eu\...`
   - Si no existe → continúa
2. Prueba segunda ruta: `C:\Users\carlo\...`
   - Si existe y tiene version.json → ¡usa esta!
3. Si ninguna funciona → "No hay updates"

## 🚀 Para Publicar Updates Reales:

**En la empresa:**

1. Compila nueva versión de la app
2. Sube a `\\ant\dept-eu\VLC1\Public\Apps_Tools\chuecc\IB_Scope\updates\`
3. Actualiza `version.json` con nueva versión
4. **¡Listo!** - Todos los usuarios lo recibirán al iniciar

## 🛠️ Scripts de PowerShell para Setup:

```powershell
# Crear carpeta
New-Item -ItemType Directory -Force -Path "C:\Users\carlo\Downloads\0-Proyecto_IB_Scope\Analisis\updates"

# Crear version.json
@"
{
  "version": "1.0.1",
  "filename": "test-update.exe",
  "changelog": "Versión de prueba del sistema de actualizaciones automáticas desde casa"
}
"@ | Out-File -FilePath "C:\Users\carlo\Downloads\0-Proyecto_IB_Scope\Analisis\updates\version.json" -Encoding UTF8

# Copiar notepad como ejecutable de prueba
Copy-Item "C:\Windows\System32\notepad.exe" "C:\Users\carlo\Downloads\0-Proyecto_IB_Scope\Analisis\updates\test-update.exe"

Write-Host "✅ Setup de pruebas completado!"
```
