@echo off
chcp 65001 >nul
echo Starte MarkItUI...

set "PY_CMD="

if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
    "%LOCALAPPDATA%\Python\bin\python.exe" --version >nul 2>nul
    if %ERRORLEVEL% equ 0 set "PY_CMD=%LOCALAPPDATA%\Python\bin\python.exe"
)

if not defined PY_CMD (
    for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python*") do (
        if exist "%%D\python.exe" (
            "%%D\python.exe" --version >nul 2>nul
            if %ERRORLEVEL% equ 0 set "PY_CMD=%%D\python.exe"
        )
    )
)

if not defined PY_CMD (
    py -3 --version >nul 2>nul
    if %ERRORLEVEL% equ 0 set "PY_CMD=py -3"
)

if not defined PY_CMD (
    python --version >nul 2>nul
    if %ERRORLEVEL% equ 0 set "PY_CMD=python"
)

if not defined PY_CMD (
    echo [FEHLER] Kein funktionierendes Python gefunden!
    pause
    exit /b 1
)

%PY_CMD% "%~dp0app\main.py" %*
if %ERRORLEVEL% neq 0 (
    echo.
    echo Fehler beim Ausfuehren der App.
    pause
)
