@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
echo ========================================================
echo   MarkItUI - Automatisches Python ^& Paket-Setup
echo ========================================================
echo.

set "PY_CMD="
set "FAILED="

:: ============================================================
:: 1. Python suchen (alle ueblichen Installationsorte)
:: ============================================================
for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python*") do (
    if exist "%%D\python.exe" (
        "%%D\python.exe" -c "import sys; sys.exit(0 if sys.version_info>=(3,9) else 1)" >nul 2>nul
        if !ERRORLEVEL! equ 0 set "PY_CMD=%%D\python.exe"
    )
)

if not defined PY_CMD (
    for /d %%D in ("%LOCALAPPDATA%\Python\pythoncore-*") do (
        if exist "%%D\python.exe" (
            "%%D\python.exe" -c "import sys; sys.exit(0 if sys.version_info>=(3,9) else 1)" >nul 2>nul
            if !ERRORLEVEL! equ 0 set "PY_CMD=%%D\python.exe"
        )
    )
)

if not defined PY_CMD (
    if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
        "%LOCALAPPDATA%\Python\bin\python.exe" -c "import sys" >nul 2>nul
        if !ERRORLEVEL! equ 0 set "PY_CMD=%LOCALAPPDATA%\Python\bin\python.exe"
    )
)

if not defined PY_CMD (
    for /d %%D in ("%ProgramFiles%\Python*") do (
        if exist "%%D\python.exe" (
            "%%D\python.exe" -c "import sys" >nul 2>nul
            if !ERRORLEVEL! equ 0 set "PY_CMD=%%D\python.exe"
        )
    )
)

if not defined PY_CMD (
    py -3 -c "import sys" >nul 2>nul
    if !ERRORLEVEL! equ 0 set "PY_CMD=py -3"
)

if not defined PY_CMD (
    python -c "import sys" >nul 2>nul
    if !ERRORLEVEL! equ 0 set "PY_CMD=python"
)

:: ============================================================
:: 2. Kein Python? Automatisch installieren (ohne Adminrechte)
:: ============================================================
if not defined PY_CMD (
    echo [INFO] Kein Python gefunden. Pruefe Windows Package Manager (winget)...
    winget --version >nul 2>nul
    if !ERRORLEVEL! equ 0 (
        echo [INFO] Installiere Python 3.12 via winget im Benutzerkonto...
        winget install --id Python.Python.3.12 -e --scope user --accept-source-agreements --accept-package-agreements
        echo.
        echo Aktualisiere Pfade...
        for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python*") do (
            if exist "%%D\python.exe" set "PY_CMD=%%D\python.exe"
        )
        if not defined PY_CMD (
            py -3 -c "import sys" >nul 2>nul
            if !ERRORLEVEL! equ 0 set "PY_CMD=py -3"
        )
    ) else (
        echo [INFO] winget ist nicht verfuegbar.
    )
)

if not defined PY_CMD (
    echo.
    echo ========================================================
    echo [FEHLER] Kein funktionierendes Python gefunden!
    echo ========================================================
    echo Bitte installiere Python 3.12 von https://www.python.org/downloads/
    echo und aktiviere im Installer "Add python.exe to PATH".
    echo.
    echo Falls stattdessen der Microsoft Store aufgeht, deaktiviere die App-Ausfuehrungsaliase:
    echo Windows Einstellungen -^> Apps -^> Erweiterte App-Einstellungen -^> App-Ausfuehrungsaliase -^> "Python" aus.
    echo.
    pause
    exit /b 1
)

echo [OK] Verwende Python: %PY_CMD%
%PY_CMD% --version
echo.

:: ============================================================
:: 3. pip sicherstellen und aktualisieren
:: ============================================================
echo ========================================================
echo 1. Pruefe pip...
echo ========================================================
%PY_CMD% -m pip --version >nul 2>nul
if !ERRORLEVEL! neq 0 (
    echo [INFO] pip fehlt - richte pip ein...
    %PY_CMD% -m ensurepip --upgrade
)
%PY_CMD% -m pip install --disable-pip-version-check --upgrade pip

:: ============================================================
:: 4. Pakete gruppenweise installieren (ein Fehler stoppt nicht alles)
:: ============================================================
echo.
echo ========================================================
echo 2. Installiere Konverter-Pakete...
echo ========================================================

call :install_group "Basis-Konverter" pdfplumber pypdfium2 pdfminer.six mammoth python-docx python-pptx openpyxl xlrd
call :install_group "Text-Werkzeuge" beautifulsoup4 markdown pygments puremagic
call :install_group "MarkItDown-Engine" "markitdown[docx,pdf,pptx,xlsx,xls]"

if defined FAILED (
    echo.
    echo [WARNUNG] Diese Pakete konnten nicht installiert werden:!FAILED!
    echo MarkItUI funktioniert trotzdem, solange die Basis-Konverter vorhanden sind.
)

:: ============================================================
:: 5. Diagnose
:: ============================================================
echo.
echo ========================================================
echo 3. Systemdiagnose...
echo ========================================================
if exist "%~dp0python_engine\markitdown_worker.py" (
    %PY_CMD% "%~dp0python_engine\markitdown_worker.py" --doctor
) else (
    if exist "%~dp0markitdown_worker.py" %PY_CMD% "%~dp0markitdown_worker.py" --doctor
)

echo.
echo ========================================================
echo   [FERTIG] Du kannst MarkItUI jetzt starten.
echo ========================================================
echo.
pause
exit /b 0

:: ------------------------------------------------------------
:: Installiert eine Paketgruppe, bei Rechteproblemen mit --user
:: ------------------------------------------------------------
:install_group
set "GROUP_NAME=%~1"
shift
set "PKGS="
:collect
if "%~1"=="" goto do_install
set "PKGS=!PKGS! "%~1""
shift
goto collect

:do_install
echo.
echo --- !GROUP_NAME! ---
%PY_CMD% -m pip install --disable-pip-version-check --upgrade !PKGS!
if !ERRORLEVEL! neq 0 (
    echo [INFO] Wiederhole Installation im Benutzerkonto ^(--user^)...
    %PY_CMD% -m pip install --disable-pip-version-check --user --upgrade !PKGS!
    if !ERRORLEVEL! neq 0 set "FAILED=!FAILED! !GROUP_NAME!"
)
exit /b 0
