@echo off
chcp 65001 >nul
echo ========================================================
echo   MarkItDown to Obsidian - Installation der Requirements
echo ========================================================
echo.

set "PY_CMD="

:: 1. Prüfe spezifischen Python-Installationspfad in LocalAppData
if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
    "%LOCALAPPDATA%\Python\bin\python.exe" --version >nul 2>nul
    if %ERRORLEVEL% equ 0 set "PY_CMD=%LOCALAPPDATA%\Python\bin\python.exe"
)

:: 2. Prüfe Standard Python-Installationsordner
if not defined PY_CMD (
    for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python*") do (
        if exist "%%D\python.exe" (
            "%%D\python.exe" --version >nul 2>nul
            if %ERRORLEVEL% equ 0 set "PY_CMD=%%D\python.exe"
        )
    )
)

:: 3. Prüfe 'py' Launcher
if not defined PY_CMD (
    py -3 --version >nul 2>nul
    if %ERRORLEVEL% equ 0 set "PY_CMD=py -3"
)

:: 4. Prüfe 'python' im PATH (stellt sicher, dass es kein WindowsApps-Stub ist)
if not defined PY_CMD (
    python --version >nul 2>nul
    if %ERRORLEVEL% equ 0 set "PY_CMD=python"
)

:: Fehler falls gar kein funktionierendes Python gefunden wird
if not defined PY_CMD (
    echo [FEHLER] Kein funktionierendes Python gefunden!
    echo Bitte installiere Python von https://www.python.org/downloads/
    echo und stelle sicher, dass 'Add Python to PATH' ausgewaehlt ist.
    echo.
    echo Falls der Windows Store angezeigt wird, deaktiviere die App-Ausfuehrungsaliase:
    echo Windows Einstellungen -^> Apps -^> Erweiterte App-Einstellungen -^> App-Ausfuehrungsaliase -^> 'Python' deaktivieren.
    pause
    exit /b 1
)

echo Verwende Python: %PY_CMD%
%PY_CMD% --version
echo.

echo ========================================================
echo 1. Aktualisiere pip...
echo ========================================================
%PY_CMD% -m pip install --upgrade pip

echo.
echo ========================================================
echo 2. Installiere alle Pakete (markitdown, pyqt6 etc.)...
echo ========================================================
%PY_CMD% -m pip install -r "%~dp0requirements.txt"

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo   [ERFOLG] Alle Requirements erfolgreich installiert!
    echo ========================================================
    echo Du kannst die App jetzt mit 'Start_MarkItDown_Obsidian.bat' starten.
) else (
    echo.
    echo [FEHLER] Bei der Installation ist ein Fehler aufgetreten.
)

pause
