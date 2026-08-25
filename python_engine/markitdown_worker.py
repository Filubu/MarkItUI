import sys
import os
import json
import argparse
import datetime
import re
from pathlib import Path

# Force UTF-8 encoding on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def format_title_from_stem(stem: str) -> str:
    # Replace underscores and hyphens with spaces
    clean = stem.replace("_", " ").replace("-", " ")
    # Clean multiple spaces
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean or stem


def check_environment() -> dict:
    """Diagnoses Python environment, modules, and availability of converter engines."""
    required_packages = [
        "markitdown",
        "pdfplumber",
        "pypdfium2",
        "mammoth",
        "pptx",
        "openpyxl",
        "bs4",
        "markdown",
        "pygments"
    ]
    
    package_map = {
        "markitdown": "markitdown",
        "pdfplumber": "pdfplumber",
        "pypdfium2": "pypdfium2",
        "mammoth": "mammoth",
        "pptx": "python-pptx",
        "openpyxl": "openpyxl",
        "bs4": "beautifulsoup4",
        "markdown": "markdown",
        "pygments": "pygments"
    }

    installed = {}
    missing = []

    for mod, pkg_name in package_map.items():
        try:
            __import__(mod)
            installed[pkg_name] = True
        except ImportError:
            installed[pkg_name] = False
            missing.append(pkg_name)

    return {
        "ready": len(missing) == 0 or installed.get("markitdown", False),
        "python_version": sys.version.split()[0],
        "python_executable": sys.executable,
        "platform": sys.platform,
        "installed_packages": [pkg for pkg, ok in installed.items() if ok],
        "missing_packages": missing,
        "has_markitdown": installed.get("markitdown", False),
        "has_pdfplumber": installed.get("pdfplumber", False),
        "has_mammoth": installed.get("mammoth", False),
        "has_pptx": installed.get("python-pptx", False),
        "has_openpyxl": installed.get("openpyxl", False)
    }


def read_text_file_safe(path: Path) -> str:
    """Reads a text file trying multiple common encodings."""
    encodings = ["utf-8", "utf-8-sig", "cp1252", "latin-1", "iso-8859-1", "utf-16"]
    raw_bytes = path.read_bytes()
    for enc in encodings:
        try:
            return raw_bytes.decode(enc)
        except (UnicodeDecodeError, LookupError):
            continue
    return raw_bytes.decode("utf-8", errors="replace")


# -------------------------------------------------------------
# Dedicated Fallback Converters
# -------------------------------------------------------------

def convert_pdf_fallback(path: Path) -> str:
    """Extracts text and tables from PDF using pdfplumber, pypdfium2, or pdfminer."""
    # 1. Try pdfplumber
    try:
        import pdfplumber
        pages_text = []
        with pdfplumber.open(str(path)) as pdf:
            for idx, page in enumerate(pdf.pages, 1):
                # Try table extraction first
                tables = page.extract_tables()
                text = page.extract_text() or ""
                
                page_content = []
                if len(pdf.pages) > 1:
                    page_content.append(f"### Seite {idx}\n")
                
                if text.strip():
                    page_content.append(text.strip())
                
                # Format tables as Markdown if available
                if tables:
                    for table in tables:
                        if not table or not any(table):
                            continue
                        clean_rows = []
                        for row in table:
                            clean_row = [str(cell or "").replace("\n", " ").strip() for cell in row]
                            clean_rows.append(clean_row)
                        
                        if clean_rows:
                            header = clean_rows[0]
                            page_content.append("\n| " + " | ".join(header) + " |")
                            page_content.append("| " + " | ".join(["---"] * len(header)) + " |")
                            for r in clean_rows[1:]:
                                # Pad or trim columns to match header
                                while len(r) < len(header):
                                    r.append("")
                                page_content.append("| " + " | ".join(r[:len(header)]) + " |")
                            page_content.append("\n")

                if page_content:
                    pages_text.append("\n\n".join(page_content))
                    
        if pages_text:
            return "\n\n---\n\n".join(pages_text)
    except Exception:
        pass

    # 2. Try pypdfium2
    try:
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument(str(path))
        pages_text = []
        for idx in range(len(pdf)):
            page = pdf[idx]
            textpage = page.get_textpage()
            text = textpage.get_text_range()
            if text and text.strip():
                if len(pdf) > 1:
                    pages_text.append(f"### Seite {idx + 1}\n\n{text.strip()}")
                else:
                    pages_text.append(text.strip())
        if pages_text:
            return "\n\n---\n\n".join(pages_text)
    except Exception:
        pass

    # 3. Try pdfminer
    try:
        from pdfminer.high_level import extract_text
        text = extract_text(str(path))
        if text and text.strip():
            return text.strip()
    except Exception:
        pass

    raise RuntimeError("Kein PDF-Konverter (pdfplumber / pypdfium2 / pdfminer) konnte Text extrahieren.")


def convert_docx_fallback(path: Path) -> str:
    """Extracts markdown from DOCX using mammoth or python-docx."""
    # 1. Try mammoth
    try:
        import mammoth
        with open(str(path), "rb") as docx_file:
            result = mammoth.convert_to_markdown(docx_file)
            if result.value and result.value.strip():
                return result.value.strip()
    except Exception:
        pass

    # 2. Try python-docx
    try:
        import docx
        doc = docx.Document(str(path))
        content = []
        for p in doc.paragraphs:
            txt = p.text.strip()
            if not txt:
                continue
            if p.style and p.style.name.startswith("Heading 1"):
                content.append(f"# {txt}")
            elif p.style and p.style.name.startswith("Heading 2"):
                content.append(f"## {txt}")
            elif p.style and p.style.name.startswith("Heading 3"):
                content.append(f"### {txt}")
            elif p.style and "List" in p.style.name:
                content.append(f"- {txt}")
            else:
                content.append(txt)

        # Extract docx tables
        for table in doc.tables:
            table_rows = []
            for row in table.rows:
                row_cells = [cell.text.replace("\n", " ").strip() for cell in row.cells]
                table_rows.append(row_cells)
            if table_rows:
                header = table_rows[0]
                content.append("\n| " + " | ".join(header) + " |")
                content.append("| " + " | ".join(["---"] * len(header)) + " |")
                for r in table_rows[1:]:
                    while len(r) < len(header):
                        r.append("")
                    content.append("| " + " | ".join(r[:len(header)]) + " |")
                content.append("\n")

        if content:
            return "\n\n".join(content)
    except Exception:
        pass

    raise RuntimeError("DOCX-Dokument konnte weder mit mammoth noch mit python-docx gelesen werden.")


def convert_pptx_fallback(path: Path) -> str:
    """Extracts slides, headings, bullet points, and speaker notes from PPTX."""
    try:
        from pptx import Presentation
        prs = Presentation(str(path))
        slides_md = []

        for idx, slide in enumerate(prs.slides, 1):
            slide_lines = []
            slide_title = f"Folie {idx}"

            # Look for slide title shape
            if slide.shapes.title and slide.shapes.title.text.strip():
                slide_title = slide.shapes.title.text.strip()

            slide_lines.append(f"## Folie {idx}: {slide_title}\n")

            # Extract body shapes
            for shape in slide.shapes:
                if shape == slide.shapes.title:
                    continue
                if shape.has_text_frame:
                    for paragraph in shape.text_frame.paragraphs:
                        text = paragraph.text.strip()
                        if text:
                            level = paragraph.level or 0
                            indent = "  " * level
                            slide_lines.append(f"{indent}- {text}")
                elif shape.has_table:
                    table = shape.table
                    rows_data = []
                    for row in table.rows:
                        rows_data.append([cell.text.replace("\n", " ").strip() for cell in row.cells])
                    if rows_data:
                        header = rows_data[0]
                        slide_lines.append("\n| " + " | ".join(header) + " |")
                        slide_lines.append("| " + " | ".join(["---"] * len(header)) + " |")
                        for r in rows_data[1:]:
                            while len(r) < len(header):
                                r.append("")
                            slide_lines.append("| " + " | ".join(r[:len(header)]) + " |")
                        slide_lines.append("")

            # Extract speaker notes if available
            if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
                notes = slide.notes_slide.notes_text_frame.text.strip()
                if notes:
                    slide_lines.append(f"\n> **Notizen:** {notes}\n")

            slides_md.append("\n".join(slide_lines).strip())

        if slides_md:
            return "\n\n---\n\n".join(slides_md)
    except Exception as e:
        raise RuntimeError(f"PPTX-Konvertierung fehlgeschlagen: {e}")

    raise RuntimeError("PPTX-Präsentation enthält keine lesbaren Folien.")


def convert_xlsx_fallback(path: Path) -> str:
    """Extracts Excel sheets into clean Markdown tables."""
    try:
        import openpyxl
        wb = openpyxl.load_workbook(str(path), data_only=True, read_only=True)
        sheets_md = []

        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            rows = list(ws.iter_rows(values_only=True))
            if not rows:
                continue

            # Filter completely empty rows
            non_empty_rows = [r for r in rows if any(cell is not None and str(cell).strip() != "" for cell in r)]
            if not non_empty_rows:
                continue

            sheet_lines = [f"### Tabelle: {sheet_name}\n"]
            header = [str(c if c is not None else "").replace("\n", " ").strip() for c in non_empty_rows[0]]
            # Fill empty header names
            header = [h if h else f"Spalte {i+1}" for i, h in enumerate(header)]

            sheet_lines.append("| " + " | ".join(header) + " |")
            sheet_lines.append("| " + " | ".join(["---"] * len(header)) + " |")

            for row in non_empty_rows[1:]:
                clean_cells = [str(c if c is not None else "").replace("\n", " ").strip() for c in row]
                while len(clean_cells) < len(header):
                    clean_cells.append("")
                sheet_lines.append("| " + " | ".join(clean_cells[:len(header)]) + " |")

            sheets_md.append("\n".join(sheet_lines))

        wb.close()
        if sheets_md:
            return "\n\n---\n\n".join(sheets_md)
    except Exception as e:
        raise RuntimeError(f"Excel-Konvertierung fehlgeschlagen: {e}")

    raise RuntimeError("Excel-Datei enthält keine lesbaren Daten.")


def convert_csv_fallback(path: Path) -> str:
    """Converts CSV/TSV files to clean Markdown tables."""
    import csv
    text = read_text_file_safe(path)
    lines = text.strip().splitlines()
    if not lines:
        return ""

    # Detect delimiter
    sample = "\n".join(lines[:10])
    delimiter = ","
    for d in [";", "\t", ","]:
        if d in sample:
            delimiter = d
            break

    reader = csv.reader(lines, delimiter=delimiter)
    rows = list(reader)
    if not rows:
        return text

    md_lines = []
    header = [c.strip() for c in rows[0]]
    md_lines.append("| " + " | ".join(header) + " |")
    md_lines.append("| " + " | ".join(["---"] * len(header)) + " |")

    for r in rows[1:]:
        clean_r = [c.strip() for c in r]
        while len(clean_r) < len(header):
            clean_r.append("")
        md_lines.append("| " + " | ".join(clean_r[:len(header)]) + " |")

    return "\n".join(md_lines)


# -------------------------------------------------------------
# Primary Multi-Engine Orchestrator
# -------------------------------------------------------------

def convert_document(file_path: str, add_frontmatter: bool = True, tags: list = None, subject: str = "", title: str = "") -> dict:
    path = Path(file_path)
    if not path.exists():
        return {
            "success": False,
            "markdown": "",
            "error": f"Datei existiert nicht: {file_path}",
            "file_name": path.name
        }

    ext = path.suffix.lower()
    raw_text = ""
    used_engine = "markitdown"
    conversion_error_details = []

    # 1. Tier 1: Try MarkItDown
    try:
        from markitdown import MarkItDown
        md = MarkItDown()
        result = md.convert(str(path))
        raw_text = result.text_content if hasattr(result, "text_content") else str(result)
        if not raw_text or not raw_text.strip():
            raise ValueError("MarkItDown hat keinen Text geliefert.")
    except Exception as e:
        conversion_error_details.append(f"MarkItDown-Engine: {e}")
        raw_text = ""

    # 2. Tier 2: Dedicated Format Fallbacks
    if not raw_text or not raw_text.strip():
        try:
            if ext == ".pdf":
                raw_text = convert_pdf_fallback(path)
                used_engine = "pdfplumber/pdfminer"
            elif ext in [".docx", ".doc"]:
                raw_text = convert_docx_fallback(path)
                used_engine = "mammoth/docx"
            elif ext in [".pptx", ".ppt"]:
                raw_text = convert_pptx_fallback(path)
                used_engine = "python-pptx"
            elif ext in [".xlsx", ".xls"]:
                raw_text = convert_xlsx_fallback(path)
                used_engine = "openpyxl"
            elif ext in [".csv", ".tsv"]:
                raw_text = convert_csv_fallback(path)
                used_engine = "csv-parser"
            elif ext in [".txt", ".md", ".log", ".ini", ".yaml", ".yml", ".json", ".xml", ".html", ".htm", ".rtf"]:
                raw_text = read_text_file_safe(path)
                used_engine = "text-decoder"
            elif ext in [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"]:
                raw_text = f"![{path.name}]({path.name})\n\n*Bilddokument: {path.name}*"
                used_engine = "image-embed"
            else:
                # Universal fallback
                raw_text = read_text_file_safe(path)
                used_engine = "raw-fallback"
        except Exception as fallback_err:
            conversion_error_details.append(f"Fallback-Engine ({ext}): {fallback_err}")
            raw_text = ""

    # 3. Tier 3: Universal safe string extraction if still empty
    if not raw_text or not raw_text.strip():
        try:
            raw_text = read_text_file_safe(path)
            used_engine = "safe-bytes-decoder"
        except Exception as safe_err:
            conversion_error_details.append(f"Safe-Decoder: {safe_err}")

    # If still completely empty or failed
    if not raw_text or not raw_text.strip():
        error_msg = f"Dokument konnte nicht umgewandelt werden ({path.name}).\n" + "\n".join(conversion_error_details)
        return {
            "success": False,
            "markdown": "",
            "error": error_msg,
            "file_name": path.name
        }

    # 4. Clean and format Markdown
    cleaned_text = raw_text.strip()
    doc_title = title.strip() if title and title.strip() else format_title_from_stem(path.stem)

    # Clean MarkItDown artifacts in text (e.g. Title: ..., # Title: ...)
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

    # 5. Add YAML Frontmatter if enabled
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
        "char_count": len(final_text),
        "engine_used": used_engine
    }


def main():
    parser = argparse.ArgumentParser(description="MarkItUI Multi-Engine Worker for Electron App")
    parser.add_argument("--file", type=str, help="Pfad zur Quelldatei")
    parser.add_argument("--frontmatter", action="store_true", default=True, help="YAML Frontmatter generieren")
    parser.add_argument("--no-frontmatter", action="store_false", dest="frontmatter")
    parser.add_argument("--tags", type=str, default="schule,itslearning", help="Komma-getrennte Liste von Tags")
    parser.add_argument("--subject", type=str, default="", help="Fach oder Kategorie")
    parser.add_argument("--title", type=str, default="", help="Notiz-Titel")
    parser.add_argument("--json-input", action="store_true", help="Eingabe als JSON über stdin lesen")
    parser.add_argument("--doctor", action="store_true", help="Diagnose des Python-Environments als JSON ausgeben")

    args = parser.parse_args()

    if args.doctor:
        diag = check_environment()
        print(json.dumps(diag, ensure_ascii=False))
        return

    if args.json_input:
        try:
            raw_input = sys.stdin.read()
            if not raw_input.strip():
                print(json.dumps({"success": False, "error": "Leere Eingabe über stdin"}, ensure_ascii=False))
                return
            input_data = json.loads(raw_input)
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
