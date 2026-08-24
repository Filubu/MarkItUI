import os
import sys
import json
from pathlib import Path
from typing import Dict, Any, List

DEFAULT_CONFIG: Dict[str, Any] = {
    "vault_path": "",
    "default_subfolder": "",
    "add_frontmatter": True,
    "default_tags": ["schule", "itslearning"],
    "auto_open_obsidian": False,
    "auto_convert_on_drop": True,
    "include_source_link": True,
    "last_used_directory": "",
    "recent_subfolders": [],
    "dark_mode": True,
    "window_size": [1150, 780]
}


class ConfigManager:
    def __init__(self):
        self.config_dir = self._get_config_dir()
        self.config_file = self.config_dir / "config.json"
        self._data: Dict[str, Any] = DEFAULT_CONFIG.copy()
        self.load()

    def _get_config_dir(self) -> Path:
        # Check if local portable config exists next to executable / script
        if getattr(sys, "frozen", False):
            base_dir = Path(sys.executable).parent
        else:
            base_dir = Path(__file__).resolve().parent.parent

        portable_file = base_dir / "config.json"
        if portable_file.exists():
            return base_dir

        # Otherwise use AppData
        appdata = os.getenv("APPDATA")
        if appdata:
            path = Path(appdata) / "MarkItDownObsidian"
        else:
            path = Path.home() / ".markitdown_obsidian"
        path.mkdir(parents=True, exist_ok=True)
        return path

    def load(self) -> Dict[str, Any]:
        if self.config_file.exists():
            try:
                with open(self.config_file, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                    self._data = {**DEFAULT_CONFIG, **loaded}
            except Exception as e:
                print(f"[ConfigManager] Fehler beim Laden der Config: {e}")
                self._data = DEFAULT_CONFIG.copy()
        else:
            self._data = DEFAULT_CONFIG.copy()
            self.save()
        return self._data

    def save(self) -> bool:
        try:
            self.config_dir.mkdir(parents=True, exist_ok=True)
            with open(self.config_file, "w", encoding="utf-8") as f:
                json.dump(self._data, f, indent=4, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"[ConfigManager] Fehler beim Speichern der Config: {e}")
            return False

    def get(self, key: str, default: Any = None) -> Any:
        return self._data.get(key, default)

    def set(self, key: str, value: Any, auto_save: bool = True) -> None:
        self._data[key] = value
        if auto_save:
            self.save()

    @property
    def vault_path(self) -> str:
        return self._data.get("vault_path", "")

    @vault_path.setter
    def vault_path(self, val: str):
        self.set("vault_path", val)

    @property
    def default_subfolder(self) -> str:
        return self._data.get("default_subfolder", "")

    @default_subfolder.setter
    def default_subfolder(self, val: str):
        self.set("default_subfolder", val)

    @property
    def add_frontmatter(self) -> bool:
        return self._data.get("add_frontmatter", True)

    @add_frontmatter.setter
    def add_frontmatter(self, val: bool):
        self.set("add_frontmatter", val)

    @property
    def default_tags(self) -> List[str]:
        return self._data.get("default_tags", ["schule", "itslearning"])

    @default_tags.setter
    def default_tags(self, val: List[str]):
        self.set("default_tags", val)

    @property
    def auto_open_obsidian(self) -> bool:
        return self._data.get("auto_open_obsidian", False)

    @auto_open_obsidian.setter
    def auto_open_obsidian(self, val: bool):
        self.set("auto_open_obsidian", val)

    @property
    def auto_convert_on_drop(self) -> bool:
        return self._data.get("auto_convert_on_drop", True)

    @auto_convert_on_drop.setter
    def auto_convert_on_drop(self, val: bool):
        self.set("auto_convert_on_drop", val)


config = ConfigManager()
