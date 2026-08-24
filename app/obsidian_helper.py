import os
import re
import urllib.parse
from pathlib import Path
from typing import List, Tuple, Optional


class ObsidianHelper:
    IGNORED_DIRS = {".obsidian", ".trash", ".git", ".idea", ".vscode", "node_modules", "$RECYCLE.BIN", "System Volume Information"}

    @staticmethod
    def is_valid_vault(path_str: str) -> bool:
        if not path_str:
            return False
        p = Path(path_str)
        if not p.exists() or not p.is_dir():
            return False
        # Optional: prüft ob .obsidian existiert, aber jeder gültige Ordner ist als Vault nutzbar
        return True

    @staticmethod
    def get_vault_name(vault_path: str) -> str:
        p = Path(vault_path)
        return p.name if p.name else str(p)

    @classmethod
    def get_subfolders(cls, vault_path: str, max_depth: int = 4) -> List[str]:
        """
        Gibt eine sortierte Liste aller Unterordner im Vault zurück (z.B. für Fächer/Kategorien).
        """
        if not vault_path or not Path(vault_path).exists():
            return []

        base = Path(vault_path)
        subfolders = ["/ (Hauptverzeichnis)"]

        try:
            for root, dirs, _ in os.walk(base):
                # Ignorierte Ordner ausfiltern
                dirs[:] = [d for d in dirs if d not in cls.IGNORED_DIRS and not d.startswith(".")]

                rel_path = Path(root).relative_to(base)
                if rel_path.parts:
                    # Maximale Tiefe beschränken
                    if len(rel_path.parts) <= max_depth:
                        subfolders.append(str(rel_path).replace("\\", "/"))

            # Sortieren, aber Hauptverzeichnis oben behalten
            sorted_folders = ["/ (Hauptverzeichnis)"] + sorted(subfolders[1:], key=lambda s: s.lower())
            return sorted_folders
        except Exception as e:
            print(f"[ObsidianHelper] Fehler beim Scannen der Unterordner: {e}")
            return ["/ (Hauptverzeichnis)"]

    @staticmethod
    def sanitize_filename(name: str) -> str:
        """
        Entfernt für Windows & Obsidian ungültige Zeichen aus dem Dateinamen.
        """
        # Ungültige Zeichen entfernen: \ / : * ? " < > | # ^ [ ]
        clean = re.sub(r'[\\/:*?"<>|#\^\[\]]', '_', name)
        clean = clean.strip('. ')
        if not clean:
            clean = "Unbenannte_Notiz"
        if not clean.lower().endswith(".md"):
            clean += ".md"
        return clean

    @classmethod
    def save_markdown_note(
        cls,
        vault_path: str,
        subfolder: str,
        filename: str,
        content: str,
        overwrite: bool = True
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Speichert eine Markdown-Datei im Vault.
        Gibt (gespeicherter_absoluter_pfad, fehlertext) zurück.
        """
        if not vault_path:
            return None, "Kein Obsidian-Vault-Pfad konfiguriert."

        base_dir = Path(vault_path)
        if not base_dir.exists():
            return None, f"Der angegebene Vault-Pfad existiert nicht:\n{vault_path}"

        # Subfolder verarbeiten
        clean_subfolder = subfolder.strip()
        if clean_subfolder in ["", "/", "/ (Hauptverzeichnis)"]:
            target_dir = base_dir
            rel_folder = ""
        else:
            rel_folder = clean_subfolder.lstrip("/")
            target_dir = base_dir / rel_folder

        try:
            target_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            return None, f"Zielordner konnte nicht erstellt werden: {target_dir}\n{e}"

        clean_filename = cls.sanitize_filename(filename)
        target_file = target_dir / clean_filename

        if not overwrite and target_file.exists():
            stem = target_file.stem
            counter = 1
            while target_file.exists():
                target_file = target_dir / f"{stem}_{counter}.md"
                counter += 1

        try:
            with open(target_file, "w", encoding="utf-8") as f:
                f.write(content)
            return str(target_file), None
        except Exception as e:
            return None, f"Fehler beim Schreiben der Datei:\n{e}"

    @classmethod
    def open_note(cls, file_path: str, vault_path: Optional[str] = None) -> bool:
        """
        Öffnet die Notiz in Obsidian über URI oder System-Standard.
        """
        p = Path(file_path)
        if not p.exists():
            return False

        if vault_path and Path(vault_path).exists():
            try:
                vault_name = Path(vault_path).name
                rel_path = p.relative_to(Path(vault_path))
                # Obsidian URI erstellen
                vault_encoded = urllib.parse.quote(vault_name)
                file_encoded = urllib.parse.quote(str(rel_path).replace("\\", "/"))
                obsidian_uri = f"obsidian://open?vault={vault_encoded}&file={file_encoded}"
                
                os.startfile(obsidian_uri)
                return True
            except Exception as e:
                print(f"[ObsidianHelper] Konnte Obsidian URI nicht aufrufen: {e}")

        # Fallback: Datei direkt öffnen
        try:
            os.startfile(str(p))
            return True
        except Exception as e:
            print(f"[ObsidianHelper] Konnte Datei nicht öffnen: {e}")
            return False
