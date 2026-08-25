@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
echo ========================================================
echo   MarkItUI - Automatische Python & Requirements Setup
echo ========================================================
echo.

set "PY_CMD="

:: 1. Prüfe Python-Installationen in LocalAppData (neuere & ältere Installer)
for /d %%D in ("%LOCALAPPDATA%\Python\pythoncore-*") do (
    if exist "%%D\python.exe" (
        "%%D\python.exe" -c "import sys" >nul 2>nul
        if !ERRORLEVEL! equ 0 set "PY_CMD=%%D\python.exe"
    )
)

if not defined PY_CMD (
    if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
        "%LOCALAPPDATA%\Python\bin\python.exe" -c "import sys" >nul 2>nul
        if !ERRORLEVEL! equ 0 set "PY_CMD=%LOCALAPPDATA%\Python\bin\python.exe"
    )
)

if not defined PY_CMD (
    for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python*") do (
        if exist "%%D\python.exe" (
            "%%D\python.exe" -c "import sys" >nul 2>nul
            if !ERRORLEVEL! equ 0 set "PY_CMD=%%D\python.exe"
        )
    )
)

:: 2. Prüfe 'Program Files'
if not defined PY_CMD (
    for /d %%D in ("%ProgramFiles%\Python*") do (
        if exist "%%D\python.exe" (
            "%%D\python.exe" -c "import sys" >nul 2>nul
            if !ERRORLEVEL! equ 0 set "PY_CMD=%%D\python.exe"
        )
    )
)

:: 3. Prüfe 'py' Launcher (Windows Python Launcher)
if not defined PY_CMD (
    py -3 -c "import sys" >nul 2>nul
    if !ERRORLEVEL! equ 0 set "PY_CMD=py -3"
)

:: 4. Prüfe 'python' im PATH (stellt sicher, dass es kein WindowsApps-Stub ist)
if not defined PY_CMD (
    python -c "import sys" >nul 2>nul
    if !ERRORLEVEL! equ 0 set "PY_CMD=python"
)

:: 5. Falls kein Python gefunden wurde: Versuche automatische Installation via Winget
if not defined PY_CMD (
    echo [INFO] Kein Python gefunden. Pruefe Windows Package Manager (winget)...
    winget --version >nul 2>nul
    if !ERRORLEVEL! equ 0 (
        echo [INFO] Installiere Python 3.12 via winget...
        winget install Python.Python.3.12 -e --accept-source-agreements --accept-package-agreements
        echo.
        echo Aktualisiere Pfade...
        for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python*") do (
            if exist "%%D\python.exe" set "PY_CMD=%%D\python.exe"
        )
        if not defined PY_CMD (
            py -3 -c "import sys" >nul 2>nul
            if !ERRORLEVEL! equ 0 set "PY_CMD=py -3"
        )
    )
)

:: Fehler falls gar kein funktionierendes Python gefunden werden konnte
if not defined PY_CMD (
    echo.
    echo ========================================================
    echo [FEHLER] Kein funktionierendes Python gefunden!
    echo ========================================================
    echo Bitte installiere Python von https://www.python.org/downloads/
    echo und stelle sicher, dass 'Add Python to PATH' ausgewaehlt ist.
    echo.
    echo Falls der Windows Store angezeigt wird, deaktiviere die App-Ausfuehrungsaliase:
    echo Windows Einstellungen -^> Apps -^> Erweiterte App-Einstellungen -^> App-Ausfuehrungsaliase -^> 'Python' deaktivieren.
    echo.
    pause
    exit /b 1
)

echo [OK] Verwende Python: %PY_CMD%
%PY_CMD% --version
echo.

echo ========================================================
echo 1. Aktualisiere pip...
echo ========================================================
%PY_CMD% -m pip install --upgrade pip

echo.
echo ========================================================
echo 2. Installiere alle Konverter-Pakete...
echo ========================================================
if exist "%~dp0requirements.txt" (
    %PY_CMD% -m pip install -r "%~dp0requirements.txt"
) else (
    %PY_CMD% -m pip install markitdown pdfplumber pypdfium2 pdfminer.six mammoth python-pptx openpyxl beautifulsoup4 puremagic markdown pygments
)

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo 3. Pruefe Systemdiagnose (Doctor)...
    echo ========================================================
    if exist "%~dp0markitdown_worker.py" (
        %PY_CMD% "%~dp0markitdown_worker.py" --doctor
    ) else if exist "%~dp0python_engine\markitdown_worker.py" (
        %PY_CMD% "%~dp0python_engine\markitdown_worker.py" --doctor
    )
    echo.
    echo ========================================================
    echo   [ERFOLG] Alle Voraussetzungen erfolgreich eingerichtet!
    echo ========================================================
    echo Du kannst MarkItUI jetzt direkt starten.
) else (
    echo.
    echo [FEHLER] Bei der Installation einzelner Pakete ist ein Fehler aufgetreten.
)

echo.
pause
