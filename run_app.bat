@echo off
chcp 65001 >nul
echo Starte MarkItUI...

:: Kompilierte App bevorzugen, sonst ueber Node/Electron starten
if exist "%~dp0release\win-unpacked\MarkItUI.exe" (
    start "" "%~dp0release\win-unpacked\MarkItUI.exe" %*
    exit /b 0
)

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [FEHLER] Node.js/npm wurde nicht gefunden.
    echo Installiere Node.js von https://nodejs.org/ oder nutze das fertige Setup aus den Releases.
    pause
    exit /b 1
)

if not exist "%~dp0node_modules" (
    echo [INFO] Installiere Node-Abhaengigkeiten...
    call npm install
)

call npm start %*
if %ERRORLEVEL% neq 0 (
    echo.
    echo Fehler beim Starten der App.
    pause
)
