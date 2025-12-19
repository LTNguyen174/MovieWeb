"""
Management command to build sentence-transformers embeddings for all movies.
Usage: python manage.py build_movie_embeddings --out movie_embeddings.npz
"""
from django.core.management.base import BaseCommand
from movies.models import Movie
from sentence_transformers import SentenceTransformer
import numpy as np
import os
from django.conf import settings

MODEL_NAME = "all-MiniLM-L6-v2"
DEFAULT_OUT = os.path.join(settings.BASE_DIR, "movie_embeddings.npz")


class Command(BaseCommand):
    help = "Build sentence-transformers embeddings for all movies and save to .npz file"

    def add_arguments(self, parser):
        parser.add_argument(
            "--out",
            type=str,
            default=DEFAULT_OUT,
            help="Output .npz file path (default: movie_embeddings.npz in project root)"
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=64,
            help="Batch size for encoding (default: 64)"
        )

    def handle(self, *args, **options):
        out_path = options["out"]
        batch_size = options["batch_size"]

        self.stdout.write(f"Loading model '{MODEL_NAME}' ...")
        model = SentenceTransformer(MODEL_NAME)
        embedding_dim = model.get_sentence_embedding_dimension()

        movies = Movie.objects.all().prefetch_related("categories")
        n = movies.count()
        self.stdout.write(f"Found {n} movies. Computing embeddings in batches of {batch_size} ...")

        if n == 0:
            self.stdout.write(self.style.WARNING("No movies found in database!"))
            return

        ids = []
        texts = []

        # Prepare text for each movie (overview + genres)
        for m in movies:
            genres = ", ".join([c.name for c in m.categories.all()])
            # Combine overview and genres for better context
            text = f"{m.description or ''} | Genres: {genres}"
            texts.append(text)
            ids.append(int(m.tmdb_id))

        # Compute embeddings in batches to save memory
        embs_list = []
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            self.stdout.write(f"  Processing batch {i // batch_size + 1}/{(len(texts) + batch_size - 1) // batch_size}")
            emb_batch = model.encode(batch_texts, show_progress_bar=False, convert_to_numpy=True)
            embs_list.append(emb_batch)

        if embs_list:
            embeddings = np.vstack(embs_list).astype(np.float32)
        else:
            embeddings = np.zeros((0, embedding_dim), dtype=np.float32)

        ids_array = np.array(ids, dtype=np.int64)

        # Save as compressed .npz
        np.savez_compressed(out_path, ids=ids_array, embeddings=embeddings)

        self.stdout.write(
            self.style.SUCCESS(
                f"✓ Embeddings saved to {out_path}\n"
                f"  Movies: {ids_array.shape[0]}\n"
                f"  Dimension: {embeddings.shape[1] if embeddings.size else 0}"
            )
        )
