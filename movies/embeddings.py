"""
Simple embedding utility for sentence-transformers + cosine similarity search.
Loads precomputed embeddings from .npz file (created by build_movie_embeddings command).
"""
import os
import numpy as np
from typing import Tuple

# Path to embeddings file (created by management command)
EMBEDDINGS_PATH = os.path.join(os.path.dirname(__file__), '..', 'movie_embeddings.npz')


def load_embeddings(path: str = None) -> Tuple[np.ndarray, np.ndarray]:
    """
    Load precomputed embeddings from .npz file.
    Returns (ids: np.ndarray[int64], embeddings: np.ndarray[float32])
    If file doesn't exist, returns empty arrays.
    """
    p = path or EMBEDDINGS_PATH
    if not os.path.exists(p):
        return np.array([], dtype=np.int64), np.array([], dtype=np.float32).reshape(0, 384)
    
    try:
        data = np.load(p)
        ids = data['ids'].astype(np.int64)
        embeddings = data['embeddings'].astype(np.float32)
        return ids, embeddings
    except Exception as e:
        print(f"Error loading embeddings from {p}: {e}")
        return np.array([], dtype=np.int64), np.array([], dtype=np.float32).reshape(0, 384)


def cosine_similarity(query_vec: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    """
    Compute cosine similarity between query vector and matrix of vectors.
    query_vec: (dim,) or (1, dim)
    matrix: (N, dim)
    Returns: (N,) array of cosine similarities
    """
    q = query_vec.reshape(1, -1) if query_vec.ndim == 1 else query_vec
    q_norm = q / (np.linalg.norm(q, axis=1, keepdims=True) + 1e-12)
    m_norm = matrix / (np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-12)
    sims = np.dot(m_norm, q_norm.T).squeeze()
    return sims if sims.ndim > 0 else sims.reshape(-1)


def get_top_k(query_vec: np.ndarray, k: int = 5, path: str = None):
    """
    Retrieve top-k most similar embeddings.
    Returns (tmdb_ids, similarities)
    """
    ids, embeddings = load_embeddings(path)
    if ids.size == 0 or embeddings.size == 0:
        return np.array([], dtype=np.int64), np.array([])
    
    sims = cosine_similarity(query_vec, embeddings)
    top_idx = np.argsort(-sims)[:k]
    return ids[top_idx], sims[top_idx]
