@echo off
chcp 65001 >nul
echo Starte MarkItDown for Obsidian...

if exist "%~dp0release\win-unpacked\MarkItDown for Obsidian.exe" (
    start "" "%~dp0release\win-unpacked\MarkItDown for Obsidian.exe" %*
) else (
    echo [HINWEIS] Die kompilierte EXE wurde nicht gefunden. Starte stattdessen ueber Node/Electron...
    call npm start
)
