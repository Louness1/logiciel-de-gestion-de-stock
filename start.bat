@echo off
chcp 65001 >nul
title MoniaGauf - Systeme de Gestion de Stock
color 0B

echo.
echo ====================================================
echo    MoniaGauf - Demarrage
echo ====================================================
echo.

cd /d "%~dp0\backend"

REM Verifier que le frontend est build
if not exist "..\frontend\dist\index.html" (
    color 0C
    echo [ERREUR] Le frontend n'a pas ete construit.
    echo Lancez d'abord setup.bat puis reessayez.
    echo.
    pause
    exit /b 1
)

set NODE_ENV=production

REM Ouvrir le navigateur apres 3 secondes (le temps que le serveur demarre)
start "" /B cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:4000"

echo Le navigateur va s'ouvrir automatiquement dans 3 secondes...
echo Pour arreter l'application: fermez cette fenetre ou appuyez Ctrl+C
echo.
echo ----------------------------------------------------

node src/server.js
