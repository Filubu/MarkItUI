!macro customInstall
  ; Context menu entry for individual files (*.pdf, *.docx, etc.)
  WriteRegStr HKCU "Software\Classes\*\shell\MarkItUI" "" "Mit MarkItUI konvertieren"
  WriteRegStr HKCU "Software\Classes\*\shell\MarkItUI" "Icon" "$INSTDIR\MarkItUI.exe,0"
  WriteRegStr HKCU "Software\Classes\*\shell\MarkItUI\command" "" '"$INSTDIR\MarkItUI.exe" "%1"'

  ; Context menu entry for folders / directories
  WriteRegStr HKCU "Software\Classes\Directory\shell\MarkItUI" "" "Ordner mit MarkItUI umwandeln"
  WriteRegStr HKCU "Software\Classes\Directory\shell\MarkItUI" "Icon" "$INSTDIR\MarkItUI.exe,0"
  WriteRegStr HKCU "Software\Classes\Directory\shell\MarkItUI\command" "" '"$INSTDIR\MarkItUI.exe" "%1"'

  ; Context menu entry for folder background
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\MarkItUI" "" "Ordner mit MarkItUI umwandeln"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\MarkItUI" "Icon" "$INSTDIR\MarkItUI.exe,0"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\MarkItUI\command" "" '"$INSTDIR\MarkItUI.exe" "%V"'
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\*\shell\MarkItUI"
  DeleteRegKey HKCU "Software\Classes\Directory\shell\MarkItUI"
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\MarkItUI"
!macroend
