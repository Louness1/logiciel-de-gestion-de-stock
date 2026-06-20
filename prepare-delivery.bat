@echo off
chcp 65001 >nul
title MoniaGauf - Preparation livraison
color 0E

echo.
echo ====================================================
echo    MoniaGauf - Preparation pour livraison usine
echo ====================================================
echo.

cd /d "%~dp0"

REM ---- Confirmation ----
echo [INFO] Ce script va preparer une copie propre du projet.
echo        Les dossiers node_modules + dist + dev.db (test data)
echo        seront supprimes de la copie de livraison.
echo.
echo        Le projet ORIGINAL ne sera PAS touche.
echo.
set /p confirm="Continuer ? (O/N): "
if /i not "%confirm%"=="O" exit /b 0

REM ---- Variables ----
set DESTNAME=MoniaGauf-livraison
set DEST=%USERPROFILE%\Desktop\%DESTNAME%
set ZIP=%USERPROFILE%\Desktop\%DESTNAME%.zip

REM ---- Nettoyage ancien ----
if exist "%DEST%" (
    echo Suppression ancien dossier: %DEST%
    rmdir /s /q "%DEST%"
)
if exist "%ZIP%" (
    echo Suppression ancien zip: %ZIP%
    del /f /q "%ZIP%"
)

echo.
echo [1/4] Copie du projet vers le bureau...
xcopy /E /I /H /Y /Q "%~dp0" "%DEST%" >nul
if errorlevel 1 ( color 0C & echo Erreur copie & pause & exit /b 1 )

echo.
echo [2/4] Suppression node_modules + dist + dev.db...
if exist "%DEST%\backend\node_modules"     rmdir /s /q "%DEST%\backend\node_modules"
if exist "%DEST%\frontend\node_modules"    rmdir /s /q "%DEST%\frontend\node_modules"
if exist "%DEST%\frontend\dist"            rmdir /s /q "%DEST%\frontend\dist"
if exist "%DEST%\backend\prisma\dev.db"    del /f /q "%DEST%\backend\prisma\dev.db"
if exist "%DEST%\backend\prisma\dev.db-journal" del /f /q "%DEST%\backend\prisma\dev.db-journal"
if exist "%DEST%\.git"                     rmdir /s /q "%DEST%\.git"
if exist "%DEST%\prepare-delivery.bat"     del /f /q "%DEST%\prepare-delivery.bat"

echo.
echo [3/4] Creation du fichier README rapide...
(
    echo ===========================================
    echo   MoniaGauf — Installation rapide
    echo ===========================================
    echo.
    echo 1. Installer Node.js LTS depuis https://nodejs.org/
    echo 2. Copier ce dossier dans C:\MoniaGauf\
    echo 3. Double-cliquer sur setup.bat
    echo 4. Attendre la fin de l'installation
    echo 5. Double-cliquer sur l'icone MoniaGauf cree sur le Bureau
    echo.
    echo Login:
    echo   Email     : messoudigauf@moniagauf.com
    echo   Mot passe : hafid2026
    echo.
    echo Voir USER_GUIDE.md pour le manuel complet.
    echo.
) > "%DEST%\LIRE_MOI.txt"

echo.
echo [4/4] Compression en ZIP...
powershell -ExecutionPolicy Bypass -Command "Compress-Archive -Path '%DEST%\*' -DestinationPath '%ZIP%' -Force"
if errorlevel 1 ( color 0C & echo Erreur ZIP & pause & exit /b 1 )

REM Supprimer le dossier non-zippe pour ne garder que le ZIP
rmdir /s /q "%DEST%"

color 0A
echo.
echo ====================================================
echo    LIVRAISON PRETE !
echo ====================================================
echo.
echo Fichier ZIP: %ZIP%
echo.
for %%I in ("%ZIP%") do echo Taille: %%~zI octets

echo.
echo Etapes suivantes:
echo  1. Copier %DESTNAME%.zip sur USB
echo  2. Sur PC usine: extraire dans C:\MoniaGauf\
echo  3. Double-clic sur setup.bat
echo.
pause
