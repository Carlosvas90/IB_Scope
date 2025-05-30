# Script de prueba para verificar el sistema de actualización
Write-Host "=========================================="
Write-Host "PRUEBA DE ACTUALIZACIÓN CON POWERSHELL"
Write-Host "=========================================="
Write-Host ""

# Verificar permisos de ejecución
Write-Host "Política de ejecución actual: $(Get-ExecutionPolicy)"
Write-Host ""

# Crear log de prueba
$testLog = "$env:TEMP\app-updates\test-powershell.log"
$testDir = Split-Path $testLog -Parent

# Crear directorio si no existe
if (!(Test-Path $testDir)) {
    New-Item -ItemType Directory -Path $testDir -Force | Out-Null
    Write-Host "Directorio creado: $testDir"
}

# Escribir al log
"===========================================" | Out-File -FilePath $testLog -Encoding UTF8
"PRUEBA DE POWERSHELL - $(Get-Date)" | Out-File -FilePath $testLog -Append -Encoding UTF8
"===========================================" | Out-File -FilePath $testLog -Append -Encoding UTF8
"" | Out-File -FilePath $testLog -Append -Encoding UTF8
"Si puedes ver este archivo, PowerShell funciona correctamente" | Out-File -FilePath $testLog -Append -Encoding UTF8
"" | Out-File -FilePath $testLog -Append -Encoding UTF8
"Versión de PowerShell: $($PSVersionTable.PSVersion)" | Out-File -FilePath $testLog -Append -Encoding UTF8
"Usuario: $env:USERNAME" | Out-File -FilePath $testLog -Append -Encoding UTF8
"Directorio actual: $(Get-Location)" | Out-File -FilePath $testLog -Append -Encoding UTF8

Write-Host "Log creado en: $testLog"
Write-Host ""

# Probar comandos que usará el script de actualización
Write-Host "Probando comandos de actualización..."

# Simular verificación de proceso
$processName = "notepad"
Write-Host "Buscando proceso: $processName"
$process = Get-Process -Name $processName -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "Proceso encontrado"
} else {
    Write-Host "Proceso no encontrado (esto es normal)"
}

Write-Host ""
Write-Host "Prueba completada. Revisa el log en:"
Write-Host $testLog
Write-Host ""
Write-Host "Presiona Enter para abrir la carpeta de logs..."
Read-Host

# Abrir explorador
Start-Process explorer.exe -ArgumentList "$env:TEMP\app-updates" 