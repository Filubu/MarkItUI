@echo off
chcp 65001 >nul
echo Starte MarkItUI...

if exist "%~dp0release\win-unpacked\MarkItUI.exe" (
    start "" "%~dp0release\win-unpacked\MarkItUI.exe" %*
) else (
    echo [HINWEIS] Die kompilierte EXE wurde nicht gefunden. Starte stattdessen ueber Node/Electron...
    call npm start
)
