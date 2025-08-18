import torch
from sentence_transformers import SentenceTransformer

EMBEDDING_MODEL_PATH = "models/all-MiniLM-L6-v2"


def load_models():
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    embedding_model = SentenceTransformer(EMBEDDING_MODEL_PATH, device=device)
    return embedding_model
