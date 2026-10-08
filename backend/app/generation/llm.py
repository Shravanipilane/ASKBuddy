import time
from google import genai
from google.genai import types, errors
from app.utils import config

TEMPORARY = (429, 500, 502, 503, 504)


def generate(prompt: str, retries_per_model: int = 3) -> str:
    client = genai.Client(
        api_key=config.GEMINI_API_KEY,
        http_options=types.HttpOptions(timeout=30_000),  # milliseconds
    )
    models = [config.GEMINI_MODEL]
    fb = config.GEMINI_FALLBACK_MODEL
    if fb and fb != config.GEMINI_MODEL:
        models.append(fb)

    last = None
    for model in models:
        for attempt in range(1, retries_per_model + 1):
            try:
                resp = client.models.generate_content(model=model, contents=prompt)
                return resp.text or "(The model returned an empty response.)"
            except errors.APIError as e:
                last = e
                if e.code not in TEMPORARY:
                    raise                      # wrong model name, bad key, etc.
                print(f"[{model} busy ({e.code}), retry {attempt}/{retries_per_model}]")
            except Exception as e:             # network drops, timeouts
                last = e
                print(f"[{model}: {type(e).__name__}, retry {attempt}/{retries_per_model}]")
            time.sleep(2 * attempt)
        if model != models[-1]:
            print(f"[switching to fallback model {models[-1]}]")
    raise RuntimeError(f"All Gemini attempts failed: {last}")