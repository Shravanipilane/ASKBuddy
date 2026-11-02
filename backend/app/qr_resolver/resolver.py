"""Turns whatever a QR code contains into {subject, std, chapter}.

The registry file (data/qr_registry.json) maps a key to a chapter. A key can be
the full link, its last path segment, or any query value inside the link, so it
works with whatever format the real NCERT QR codes turn out to use.
"""
import json
import re
from urllib.parse import parse_qs, urlparse

from app.utils import config

_cache = {"mtime": None, "data": {}, "books": {}}

# Simple code format for testing, e.g. "bio11-ch1". Edit here if you want another format.
SUBJECT_PREFIX = {"bio": "Biology", "phy": "Physics", "chem": "Chemistry", "math": "Mathematics"}
_PATTERN = re.compile(r"^(?P<p>[a-z]+)(?P<std>\d{2})-ch(?P<ch>\d{1,2})$")

# NCERT ePathshala chapter codes, e.g. http://epathshala.nic.in/QR/?id=11080CH01
#   11080 = the book (listed in "_books" in data/qr_registry.json),  CH01 = chapter 1
NCERT_CODE = re.compile(r"^(?P<book>\d{5})ch(?P<ch>\d{1,2})$")


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


def _load() -> None:
    path = config.QR_REGISTRY_PATH
    if not path.exists():
        _cache.update(mtime=None, data={}, books={})
        return
    mtime = path.stat().st_mtime
    if _cache["mtime"] != mtime:
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)
        _cache["data"] = {_norm(k): v for k, v in raw.items() if not k.startswith("_")}
        _cache["books"] = {_norm(k): v for k, v in raw.get("_books", {}).items()}
        _cache["mtime"] = mtime


def _registry() -> dict:
    _load()
    return _cache["data"]


def _books() -> dict:
    _load()
    return _cache["books"]


def _record(code: str, rec: dict) -> dict:
    return {
        "code": code,
        "subject": rec["subject"],
        "std": int(rec["std"]),
        "part": int(rec.get("part", 0) or 0),
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
    books = _books()
    for key in keys:                                  # ePathshala code: book table + chapter from the code
        m = NCERT_CODE.match(key)
        if m and m["book"] in books:
            b = books[m["book"]]
            rec = {"subject": b["subject"], "std": b["std"], "part": b.get("part", 0),
                   "chapter": int(m["ch"]), "title": b.get("title")}
            return _record(key, rec)
    for key in keys:
        m = _PATTERN.match(key)
        if m and m["p"] in SUBJECT_PREFIX:
            rec = {"subject": SUBJECT_PREFIX[m["p"]], "std": m["std"], "chapter": m["ch"]}
            return _record(key, rec)
    return None