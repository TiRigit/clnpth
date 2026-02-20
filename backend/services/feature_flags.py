from fastapi import HTTPException

from config import settings

FEATURE_PREFIX = "feature_"


def get_active_features() -> dict[str, bool]:
    """Return all feature flags and their current state."""
    return {
        name.removeprefix(FEATURE_PREFIX): getattr(settings, name)
        for name in dir(settings)
        if name.startswith(FEATURE_PREFIX)
    }


def require_feature(name: str):
    """FastAPI dependency that raises 404 if a feature is disabled."""
    def dependency():
        attr = f"{FEATURE_PREFIX}{name}"
        if not getattr(settings, attr, False):
            raise HTTPException(status_code=404, detail=f"Feature '{name}' is disabled")
    return dependency
