from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
PDF_PATH = ROOT / "2025昭昭实践技能操作核心考点背诵版" / "2025昭昭实践技能操作核心考点背诵版_74-89.pdf"


def main() -> None:
    reader = PdfReader(str(PDF_PATH))
    for index, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").replace("\x00", " ")
        text = " ".join(text.split())
        print(f"PAGE {index}")
        print(text)
        print("-" * 40)


if __name__ == "__main__":
    main()
