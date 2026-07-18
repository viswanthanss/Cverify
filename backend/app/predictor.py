from __future__ import annotations

from pathlib import Path

import joblib


class ModelBundle:
    def __init__(self, base_dir: Path) -> None:
        models_dir = base_dir / "models"
        self.classifier = self._load_model(models_dir / "classifier_hire.pkl")
        self.regressor = self._load_model(models_dir / "salary_predictor.pkl")
        self.kmeans = self._try_load_model(models_dir / "kmeans_clusters.pkl")

    @staticmethod
    def _load_model(path: Path):
        if not path.exists():
            raise FileNotFoundError(
                f"Missing model at {path}. Export the model from the notebook."
            )
        return joblib.load(path)

    @staticmethod
    def _try_load_model(path: Path):
        if not path.exists():
            return None
        return joblib.load(path)
