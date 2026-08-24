import sys
import os
import json
import argparse
import datetime
from pathlib import Path

# Force UTF-8 on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

def format_title_from_stem(stem: str) -> str:
    import re
    # Replace underscores and hyphens with spaces
    clean = stem.replace("_", " ").replace("-", " ")
    # Clean multiple spaces
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean or stem


def convert_document(file_path: str, add_frontmatter: bool = True, tags: list = None, subject: str = "", title: str = "") -> dict:
    path = Path(file_path)
    if not path.exists():
        return {
            "success": False,
            "markdown": "",
            "error": f"Datei existiert nicht: {file_path}",
            "file_name": path.name
        }

    try:
        from markitdown import MarkItDown
        md = MarkItDown()
        result = md.convert(str(path))
        raw_text = result.text_content if hasattr(result, "text_content") else str(result)
        cleaned_text = raw_text.strip()

        # Format clean human-readable title
        doc_title = title.strip() if title and title.strip() else format_title_from_stem(path.stem)

        # Clean MarkItDown artifacts in text (e.g. Title: ..., # Title: ...)
        import re
        lines = cleaned_text.splitlines()
        clean_lines = []
        found_first_heading = False

        for line in lines:
            stripped = line.strip()
            if not found_first_heading and stripped:
                match = re.match(r'^(#{1,3}\s*)?[Tt]itle:\s*(.+)$', stripped)
                if match:
                    extracted_title = match.group(2).strip()
                    clean_lines.append(f"# {extracted_title}")
                    found_first_heading = True
                    continue
                elif stripped.startswith("#"):
                    found_first_heading = True
            clean_lines.append(line)

        cleaned_text = "\n".join(clean_lines).strip()

        # Ensure document starts with a clean top-level heading if none exists
        if not cleaned_text.startswith("#"):
            cleaned_text = f"# {doc_title}\n\n{cleaned_text}"

        if add_frontmatter:
            now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
            date_only = datetime.datetime.now().strftime("%Y-%m-%d")
            tag_list = list(tags) if tags else ["schule", "itslearning"]
            if subject and subject.strip() and subject.strip().lower() not in [t.lower() for t in tag_list]:
                tag_list.append(subject.strip().lower())

            yaml_lines = [
                "---",
                f"title: \"{doc_title}\"",
                f"date: {date_only}",
                f"created: {now}",
                f"source_file: \"{path.name}\"",
                f"source_type: \"{path.suffix.lstrip('.')}\"",
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
            final_text = "\n".join(yaml_lines) + "\n\n" + cleaned_text + "\n"
        else:
            final_text = cleaned_text + "\n"

        return {
            "success": True,
            "markdown": final_text,
            "error": None,
            "file_name": path.name,
            "char_count": len(final_text)
        }

    except Exception as e:
        import traceback
        return {
            "success": False,
            "markdown": "",
            "error": f"Konvertierungsfehler: {str(e)}",
            "file_name": path.name,
            "traceback": traceback.format_exc()
        }


def main():
    parser = argparse.ArgumentParser(description="MarkItDown CLI Worker for Electron App")
    parser.add_argument("--file", type=str, help="Pfad zur Quelldatei")
    parser.add_argument("--frontmatter", action="store_true", default=True, help="YAML Frontmatter generieren")
    parser.add_argument("--no-frontmatter", action="store_false", dest="frontmatter")
    parser.add_argument("--tags", type=str, default="schule,itslearning", help="Komma-getrennte Liste von Tags")
    parser.add_argument("--subject", type=str, default="", help="Fach oder Kategorie")
    parser.add_argument("--title", type=str, default="", help="Notiz-Titel")
    parser.add_argument("--json-input", action="store_true", help="Eingabe als JSON über stdin lesen")

    args = parser.parse_args()

    if args.json_input:
        try:
            input_data = json.loads(sys.stdin.read())
            file_path = input_data.get("file_path", "")
            add_frontmatter = input_data.get("add_frontmatter", True)
            tags = input_data.get("tags", ["schule", "itslearning"])
            subject = input_data.get("subject", "")
            title = input_data.get("title", "")
            result = convert_document(file_path, add_frontmatter, tags, subject, title)
            print(json.dumps(result, ensure_ascii=False))
        except Exception as e:
            print(json.dumps({"success": False, "error": f"JSON Input Error: {e}"}, ensure_ascii=False))
    elif args.file:
        tags = [t.strip() for t in args.tags.split(",") if t.strip()]
        result = convert_document(args.file, args.frontmatter, tags, args.subject, args.title)
        print(json.dumps(result, ensure_ascii=False))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
