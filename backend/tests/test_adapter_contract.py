"""Fails loudly if the RAG code changes something the chat brain depends on.

Run after every `git pull`:   python -m pytest tests/test_adapter_contract.py -q
If it fails, fix app/chat/rag_adapter.py (and tell your partner).
"""
import inspect


def _params(fn):
    return list(inspect.signature(fn).parameters)


def test_retrieve_still_takes_a_where_filter():
    from app.retrieval.retriever import retrieve

    assert "where" in _params(retrieve)          # called as retrieve(query, where=...)


def test_generate_still_takes_a_prompt():
    from app.generation.llm import generate

    assert len(_params(generate)) >= 1           # called as generate(prompt)


def test_shared_config_names_exist():
    from app.utils import config

    assert config.CHROMA_DIR and config.COLLECTION_NAME and isinstance(config.MIN_SCORE, float)