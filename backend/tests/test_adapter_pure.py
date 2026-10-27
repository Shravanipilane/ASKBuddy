"""Checks the adapter's own logic with a fake retriever (no models, no database)."""
import sys
import types

from app.chat import rag_adapter


def test_where_filter_building():
    assert rag_adapter._build_where(None) is None
    assert rag_adapter._build_where({"subject": None, "std": None, "chapter": None}) is None
    assert rag_adapter._build_where({"subject": "Biology"}) == {"subject": "Biology"}
    assert rag_adapter._build_where({"subject": "Biology", "std": 11, "chapter": 1}) == {
        "$and": [{"subject": "Biology"}, {"std": 11}, {"chapter": 1}]
    }


def test_hit_shape_changes_are_tolerated():
    a = rag_adapter._normalize_hit({"text": "t", "meta": {"page": 3}, "score": 0.7})
    b = rag_adapter._normalize_hit({"document": "t", "metadata": {"page": 3}, "distance": 0.3})
    assert a == {"text": "t", "meta": {"page": 3}, "score": 0.7}
    assert b["text"] == "t" and b["meta"] == {"page": 3} and abs(b["score"] - 0.7) < 1e-9


def test_search_passes_the_filter_and_normalizes(monkeypatch):
    seen = {}

    def fake_retrieve(query, where=None):
        seen["where"] = where
        return [{"document": "x", "metadata": {"page": 1}, "distance": 0.2}]

    fake = types.ModuleType("app.retrieval.retriever")
    fake.retrieve = fake_retrieve
    monkeypatch.setitem(sys.modules, "app.retrieval.retriever", fake)

    hits = rag_adapter.search("q", {"subject": "Physics", "std": 11})
    assert seen["where"] == {"$and": [{"subject": "Physics"}, {"std": 11}]}
    assert hits[0]["text"] == "x" and abs(hits[0]["score"] - 0.8) < 1e-9