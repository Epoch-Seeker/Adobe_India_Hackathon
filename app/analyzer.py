import numpy as np

def rank_sections(query: str, chunks: list, model, threshold: float = 0.3) -> list:
    if not chunks:
        return []

    # Encode query and chunks
    query_embedding = model.encode(query, convert_to_numpy=True)
    chunk_contents = [chunk['content'] for chunk in chunks]
    chunk_embeddings = model.encode(chunk_contents, convert_to_numpy=True)

    # Normalize vectors for cosine similarity
    query_norm = query_embedding / np.linalg.norm(query_embedding)
    chunk_norms = chunk_embeddings / np.linalg.norm(chunk_embeddings, axis=1, keepdims=True)

    # Compute cosine similarity (dot product since normalized)
    scores = np.dot(chunk_norms, query_norm)

    # Get sorted indices by similarity
    sorted_indices = np.argsort(-scores)  # descending order

    ranked_chunks = []
    for rank, idx in enumerate(sorted_indices):
        score = scores[idx]
        if score >= threshold:  # filter by threshold
            chunk = chunks[idx].copy()
            chunk["score"] = float(score)
            chunk["importance_rank"] = rank + 1
            ranked_chunks.append(chunk)

    return ranked_chunks


