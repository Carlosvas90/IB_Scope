# Script para configurar entorno de pruebas de updates
# Ejecutar desde PowerShell como administrador

Write-Host "🚀 Configurando entorno de pruebas para sistema de updates..." -ForegroundColor Cyan

# Ruta de pruebas
$testPath = "C:\Users\carlo\Downloads\0-Proyecto_IB_Scope\Analisis\updates"

# 1. Crear carpeta de pruebas
Write-Host "📁 Creando carpeta de pruebas..." -ForegroundColor Yellow
try {
    New-Item -ItemType Directory -Force -Path $testPath | Out-Null
    Write-Host "✅ Carpeta creada: $testPath" -ForegroundColor Green
} catch {
    Write-Host "❌ Error creando carpeta: $_" -ForegroundColor Red
    exit 1
}

# 2. Crear version.json de prueba
Write-Host "📄 Creando version.json de prueba..." -ForegroundColor Yellow
$versionJson = @"
{
  "version": "1.0.1",
  "filename": "test-update.exe",
  "changelog": "Versión de prueba del sistema de actualizaciones automáticas desde casa"
}
"@

try {
    $versionJson | Out-File -FilePath "$testPath\version.json" -Encoding UTF8
    Write-Host "✅ version.json creado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error creando version.json: $_" -ForegroundColor Red
    exit 1
}

# 3. Copiar ejecutable de prueba
Write-Host "💾 Creando ejecutable de prueba..." -ForegroundColor Yellow
try {
    if (Test-Path "C:\Windows\System32\notepad.exe") {
        Copy-Item "C:\Windows\System32\notepad.exe" "$testPath\test-update.exe"
        Write-Host "✅ Ejecutable de prueba creado (notepad.exe copiado)" -ForegroundColor Green
    } else {
        # Crear un ejecutable dummy si notepad no está disponible
        Write-Host "⚠️ notepad.exe no encontrado, creando archivo dummy..." -ForegroundColor Yellow
        "Dummy executable for testing" | Out-File -FilePath "$testPath\test-update.exe" -Encoding ASCII
        Write-Host "✅ Archivo dummy creado" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error creando ejecutable: $_" -ForegroundColor Red
}

# 4. Verificar estructura
Write-Host "🔍 Verificando estructura..." -ForegroundColor Yellow
$files = Get-ChildItem -Path $testPath
Write-Host "📂 Archivos en ${testPath}:" -ForegroundColor Cyan
foreach ($file in $files) {
    $fileName = $file.Name
    $fileSize = $file.Length
    Write-Host "   - $fileName ($fileSize bytes)" -ForegroundColor White
}

# 5. Mostrar instrucciones
Write-Host ""
Write-Host "🎉 ¡Setup completado!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Para probar el sistema:" -ForegroundColor Cyan
Write-Host "1. Asegúrate que currentVersion en config/update-config.json sea '1.0.0'" -ForegroundColor White
Write-Host "2. Inicia la aplicación Electron" -ForegroundColor White
Write-Host "3. Verifica los logs en la consola para ver la detección del update" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Estructura creada:" -ForegroundColor Cyan
Write-Host "   $testPath" -ForegroundColor White
Write-Host "   ├── version.json (versión 1.0.1)" -ForegroundColor White
Write-Host "   └── test-update.exe (ejecutable de prueba)" -ForegroundColor White
Write-Host ""
Write-Host "⚡ El sistema probará primero la ruta de red corporativa," -ForegroundColor Yellow
Write-Host "   y si no está disponible, usará esta ruta local." -ForegroundColor Yellow 