"""Turns whatever a QR code contains into {subject, std, chapter}.

The registry file (data/qr_registry.json) maps a key to a chapter. A key can be
the full link, its last path segment, or any query value inside the link, so it
works with whatever format the real NCERT QR codes turn out to use.
"""
import json
import re
from urllib.parse import parse_qs, urlparse

from app.utils import config

_cache = {"mtime": None, "data": {}}

# Simple code format for testing, e.g. "bio11-ch1". Edit here if you want another format.
SUBJECT_PREFIX = {"bio": "Biology", "phy": "Physics", "chem": "Chemistry", "math": "Mathematics"}
_PATTERN = re.compile(r"^(?P<p>[a-z]+)(?P<std>\d{2})-ch(?P<ch>\d{1,2})$")


def _norm(value: str) -> str:
    v = value.strip().lower()
    v = re.sub(r"^https?://(www\.)?", "", v)
    return v.rstrip("/")


def _candidate_keys(raw: str) -> list[str]:
    raw = raw.strip()
    keys = [_norm(raw)]
    if raw.lower().startswith(("http://", "https://")):
        url = urlparse(raw)
        segments = [s for s in url.path.split("/") if s]
        if segments:
            keys.append(segments[-1].lower().rsplit(".", 1)[0])
        for name, values in parse_qs(url.query).items():
            keys.append(f"{name}={values[0]}".lower())
            for v in values:
                keys.append(v.strip().lower())
    return [k for k in keys if k]


def _registry() -> dict:
    path = config.QR_REGISTRY_PATH
    if not path.exists():
        return {}
    mtime = path.stat().st_mtime
    if _cache["mtime"] != mtime:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        _cache["data"] = {_norm(k): v for k, v in data.items() if not k.startswith("_")}
        _cache["mtime"] = mtime
    return _cache["data"]


def _record(code: str, rec: dict) -> dict:
    return {
        "code": code,
        "subject": rec["subject"],
        "std": int(rec["std"]),
        "chapter": int(rec["chapter"]),
        "title": rec.get("title"),
    }


def resolve(raw: str) -> dict | None:
    """Returns the chapter record, or None if this code is not known."""
    if not raw or not raw.strip():
        return None
    registry = _registry()
    keys = _candidate_keys(raw)
    for key in keys:
        if key in registry:
            return _record(key, registry[key])
    for key in keys:
        m = _PATTERN.match(key)
        if m and m["p"] in SUBJECT_PREFIX:
            rec = {"subject": SUBJECT_PREFIX[m["p"]], "std": m["std"], "chapter": m["ch"]}
            return _record(key, rec)
    return None