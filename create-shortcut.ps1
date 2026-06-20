# Crée un raccourci "MoniaGauf" sur le Bureau pointant vers start.bat

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$StartBat    = Join-Path $ProjectRoot "start.bat"
$Desktop     = [Environment]::GetFolderPath("Desktop")
$LinkPath    = Join-Path $Desktop "MoniaGauf.lnk"

if (-not (Test-Path $StartBat)) {
    Write-Host "[ERREUR] start.bat introuvable: $StartBat" -ForegroundColor Red
    exit 1
}

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($LinkPath)
$Shortcut.TargetPath       = $StartBat
$Shortcut.WorkingDirectory = $ProjectRoot
$Shortcut.Description      = "MoniaGauf - Systeme de gestion de stock"
$Shortcut.IconLocation     = "$env:WINDIR\System32\shell32.dll,21"  # icone usine/dossier
$Shortcut.WindowStyle      = 1   # normal window
$Shortcut.Save()

Write-Host "[OK] Raccourci cree: $LinkPath" -ForegroundColor Green
