import os
import datetime
from pathlib import Path
from typing import Tuple, Optional, List
from markitdown import MarkItDown


class DocumentConverter:
    SUPPORTED_EXTENSIONS = {
        ".docx", ".doc", ".pdf", ".pptx", ".ppt",
        ".xlsx", ".xls", ".csv", ".tsv",
        ".html", ".htm", ".xml", ".json",
        ".txt", ".rtf", ".md",
        ".jpg", ".jpeg", ".png",
        ".mp3", ".wav"
    }

    def __init__(self):
        try:
            self.md_engine = MarkItDown()
        except Exception as e:
            print(f"[DocumentConverter] Warnung bei Init von MarkItDown: {e}")
            self.md_engine = None

    def is_supported(self, file_path: str) -> bool:
        ext = Path(file_path).suffix.lower()
        return ext in self.SUPPORTED_EXTENSIONS

    def convert(
        self,
        file_path: str,
        add_frontmatter: bool = True,
        tags: Optional[List[str]] = None,
        subject: Optional[str] = None,
        custom_title: Optional[str] = None
    ) -> Tuple[str, Optional[str]]:
        """
        Konvertiert eine Datei mit MarkItDown in Markdown.
        Gibt ein Tuple (markdown_text, error_message) zurück.
        """
        path = Path(file_path)
        if not path.exists():
            return "", f"Datei existiert nicht: {file_path}"

        if not self.is_supported(file_path):
            return "", f"Dateityp '{path.suffix}' wird nicht direkt unterstützt."

        try:
            if self.md_engine is None:
                self.md_engine = MarkItDown()

            # MarkItDown Konvertierung
            result = self.md_engine.convert(str(path))
            raw_text = result.text_content if hasattr(result, "text_content") else str(result)
            
            # Text bereinigen
            cleaned_text = raw_text.strip()

            # Optional: Frontmatter hinzufügen
            if add_frontmatter:
                frontmatter = self._build_frontmatter(
                    source_path=path,
                    tags=tags,
                    subject=subject,
                    title=custom_title
                )
                final_text = f"{frontmatter}\n\n{cleaned_text}\n"
            else:
                final_text = cleaned_text + "\n"

            return final_text, None

        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"[DocumentConverter] Fehler bei {file_path}: {error_details}")
            return "", f"Fehler bei der Konvertierung von '{path.name}':\n{str(e)}"

    def _build_frontmatter(
        self,
        source_path: Path,
        tags: Optional[List[str]] = None,
        subject: Optional[str] = None,
        title: Optional[str] = None
    ) -> str:
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        doc_title = title or source_path.stem

        tag_list = list(tags) if tags else ["schule", "itslearning"]
        if subject and subject.strip() and subject.strip() not in tag_list:
            tag_list.append(subject.strip().lower())

        yaml_lines = [
            "---",
            f"title: \"{doc_title}\"",
            f"created: {now}",
            f"source_file: \"{source_path.name}\"",
            f"source_type: \"{source_path.suffix.lstrip('.')}\"",
        ]

        if subject:
            yaml_lines.append(f"subject: \"{subject}\"")

        if tag_list:
            yaml_lines.append("tags:")
            for t in tag_list:
                cleaned_t = t.strip().lstrip("#")
                if cleaned_t:
                    yaml_lines.append(f"  - {cleaned_t}")

        yaml_lines.append("---")
        return "\n".join(yaml_lines)


converter = DocumentConverter()
