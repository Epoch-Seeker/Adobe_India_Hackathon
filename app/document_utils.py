import fitz
import os
import numpy as np
import re

def parse_documents_structurally(doc_paths: list) -> list:
    all_chunks = []

    for doc_path in doc_paths:
        doc_name = os.path.basename(doc_path)
        try:
            doc = fitz.open(doc_path)
        except Exception as e:
            print(f"Error reading {doc_path}: {e}")
            continue

        for page_num, page in enumerate(doc, 1):
            blocks = page.get_text("dict")["blocks"]
            spans = [span for b in blocks if 'lines' in b for l in b['lines'] for span in l['spans']]
            if not spans:
                continue

            # Pick main heading: largest font size, prefer bold, then top-most (smallest y)
            main_heading_span = sorted(
                spans,
                key=lambda s: (-s['size'], "Bold" not in s.get('font', ''), s['origin'][1])
            )[0]

            main_heading_text = main_heading_span['text'].strip()

            # Collect content excluding the heading
            content_parts = []
            for span in spans:
                text = span['text'].strip()
                if text and text != main_heading_text:
                    content_parts.append(text)

            content = re.sub(r'\s+', ' ', ' '.join(content_parts)).strip()

            all_chunks.append({
                "doc_name": doc_name,
                "page_num": page_num,
                "title": main_heading_text,
                "content": content
            })

    return all_chunks

def merge_chunks_with_empty_titles(chunks):
    """
    Merge chunks that have empty titles into the previous chunk's content.
    """
    merged_chunks = []
    for chunk in chunks:
        if chunk["title"].strip() == "":
            if merged_chunks:  # Append to last chunk if exists
                merged_chunks[-1]["content"] += " " + chunk["content"]
        else:
            merged_chunks.append(chunk)
    return merged_chunks

