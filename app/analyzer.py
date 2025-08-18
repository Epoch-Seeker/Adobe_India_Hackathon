import os
import numpy as np
import faiss
from nltk.tokenize import sent_tokenize
 

def build_faiss_index(chunks , model):
    """
    Split chunks into sentences, embed them, and build a FAISS index.
    """
    all_sentences = []
    sentence_meta = []  # store metadata to map back to document

    for chunk in chunks:
        sentences = sent_tokenize(chunk["content"])
        for sent in sentences:
            if sent.strip():
                all_sentences.append(sent)
                sentence_meta.append({
                    "doc_name": chunk["doc_name"],
                    "page_num": chunk["page_num"],
                    "title": chunk["title"]
                })

    embeddings = model.encode(all_sentences, convert_to_numpy=True)
    embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)  # normalize

    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)  # cosine similarity (inner product of normalized vectors)
    index.add(embeddings)

    return index, all_sentences, sentence_meta

def semantic_search(model , query, index, all_sentences, sentence_meta, top_k=5, threshold=0.7):
    """
    Return the top_k most relevant sentences for the query.
    """
    query_emb = model.encode([query], convert_to_numpy=True)
    query_emb = query_emb / np.linalg.norm(query_emb, axis=1, keepdims=True)

    D, I = index.search(query_emb, top_k)
    results = []

    for score, idx in zip(D[0], I[0]):
        if score >= threshold:
            results.append({
                "document": sentence_meta[idx]["doc_name"],
                "page_number": sentence_meta[idx]["page_num"],
                "section_title": sentence_meta[idx]["title"],
                "refined_text": all_sentences[idx],
                "score": float(score)
            })

    return results[1:]
