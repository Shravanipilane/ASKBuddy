import logging

from fastapi import APIRouter

from backend.app.api.catalog import list_chapters

log = logging.getLogger("askbuddy.catalog")
router = APIRouter(tags=["catalog"])


@router.get("/chapters")
def chapters():
    """Chapters that are loaded in the database, for the subject / class / chapter dropdowns."""
    try:
        return {"chapters": list_chapters()}
    except Exception:
        log.exception("Could not list chapters")
        return {"chapters": []}