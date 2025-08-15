from sentence_transformers import util

# def generate_follow_on_features(top_chunks, summarizer, persona, task):
#     results = []
#     for chunk in top_chunks:
#         content = chunk['content']
#         prompt = f"""
#         As a {persona} trying to {task}, analyze the following content and give:
#         1. Key insights
#         2. “Did you know?” facts
#         3. Contradictions or counterpoints (if any)
#         4. Inspirations or connections across documents
#         5. A narrated summary (as if speaking to a user for 2 minutes) using natural voice

#         Content:
#         {content}
#         """

#         summary = summarizer(prompt)
#         summary_text = summary[0]['summary_text'] if isinstance(summary, list) and 'summary_text' in summary[0] else str(summary)

#         results.append({
#             "document": chunk["doc_name"],
#             "section_title": chunk["title"],
#             "page_number": chunk["page_num"],
#             "follow_on_summary": summary_text.strip()
#         })
#     return results


from sentence_transformers import util

import faiss
import numpy as np

def rank_sections(query: str, chunks: list, model) -> list:
    if not chunks:
        return []

    # Encode and normalize query
    query_embedding = model.encode(query, convert_to_numpy=True)
    chunk_contents = [chunk['content'] for chunk in chunks]
    chunk_embeddings = model.encode(chunk_contents, convert_to_numpy=True)

    # Convert to float32 for FAISS
    query_embedding = np.array([query_embedding], dtype=np.float32)
    chunk_embeddings = np.array(chunk_embeddings, dtype=np.float32)

    # Normalize L2 for cosine similarity via inner product
    faiss.normalize_L2(query_embedding)
    faiss.normalize_L2(chunk_embeddings)

    # Build FAISS index (CPU)
    d = chunk_embeddings.shape[1]
    index = faiss.IndexFlatIP(d)  # Inner product = cosine after normalization
    index.add(chunk_embeddings)

    # Always get top 10 (or fewer if less than 10 chunks)
    k = min(10, len(chunks))
    D, I = index.search(query_embedding, k)

    ranked_chunks = []
    for rank, idx in enumerate(I[0]):
        score = float(D[0][rank])
        chunk = chunks[idx].copy()
        chunk["score"] = score
        chunk["importance_rank"] = rank + 1
        ranked_chunks.append(chunk)

    return ranked_chunks

def generate_refined_text(chunks: list, summarizer, persona: str, job: str, max_sections=5):
    analyzed_chunks = []
    MAX_INPUT_TOKENS = 500

    for chunk in chunks[:max_sections]:
        prompt = f"Summarize the following text for a '{persona}' who needs to '{job}':\n\n{chunk['content']}"
        prompt_words = prompt.split()
        if len(prompt_words) > MAX_INPUT_TOKENS:
            prompt = ' '.join(prompt_words[:MAX_INPUT_TOKENS])

        summary = summarizer(prompt, max_length=150, min_length=30, do_sample=False)[0]['summary_text']
        chunk['refined_text'] = summary
        analyzed_chunks.append(chunk)

    return analyzed_chunks


