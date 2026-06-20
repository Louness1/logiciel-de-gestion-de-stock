@echo off
chcp 65001 >nul
title MoniaGauf - Installation
color 0B

echo.
echo ====================================================
echo    MoniaGauf - Installation initiale
echo ====================================================
echo.

cd /d "%~dp0"

REM ---- Verifier Node.js ----
where node >nul 2>nul
if errorlevel 1 (
    color 0C
    echo [ERREUR] Node.js n'est pas installe.
    echo.
    echo Telechargez et installez Node.js LTS depuis:
    echo    https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Node.js detecte: %NODE_VER%
echo.

REM ---- Backend ----
echo [1/4] Installation des dependances backend...
cd backend
call npm install
if errorlevel 1 ( color 0C & echo Erreur npm install backend & pause & exit /b 1 )

echo.
echo [2/4] Configuration de la base de donnees...
call npx prisma migrate deploy
call npm run db:reset-users
call npm run db:reseed-materials
call npm run db:reseed-products

cd ..

REM ---- Frontend ----
echo.
echo [3/4] Installation des dependances frontend...
cd frontend
call npm install
if errorlevel 1 ( color 0C & echo Erreur npm install frontend & pause & exit /b 1 )

echo.
echo [4/4] Construction du frontend (production)...
call npm run build
if errorlevel 1 ( color 0C & echo Erreur build frontend & pause & exit /b 1 )

cd ..

REM ---- Creer raccourci bureau ----
echo.
echo Creation du raccourci sur le Bureau...
powershell -ExecutionPolicy Bypass -File "%~dp0create-shortcut.ps1"

color 0A
echo.
echo ====================================================
echo    INSTALLATION TERMINEE !
echo ====================================================
echo.
echo Raccourci "MoniaGauf" cree sur le Bureau.
echo Double-cliquez dessus pour lancer l'application.
echo.
echo Login:
echo    Email     : xxxxxxxxxxf@moniagauf.com
echo    Mot passe : xxxxxxxx
echo.
pause
