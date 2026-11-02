"""
Checks data/qr_registry.json against the RUNNING backend.

Run (server must be running on port 8000):
    python -m app.qr_resolver.check_registry

It tells you:
  1. QR codes that point to a chapter that is NOT ingested (typo, or book not loaded yet)
  2. Ingested chapters that have NO QR code (a code is missing from your list)
  3. Codes that the real /qr/resolve endpoint answers differently from the registry
This is a dev tool. You can delete it later.
"""
import json
import urllib.request
from pathlib import Path

API = "http://127.0.0.1:8000"
REGISTRY = Path(__file__).resolve().parents[3] / "data" / "qr_registry.json"


def post_json(path, body):
    req = urllib.request.Request(
        API + path, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, None


def main():
    reg = json.loads(REGISTRY.read_text(encoding="utf-8"))
    codes = {k: v for k, v in reg.items() if not k.startswith("_") and not k.startswith("http")}

    with urllib.request.urlopen(API + "/chapters", timeout=30) as r:
        chapters = json.loads(r.read())["chapters"]
    db = {(c["subject"].lower(), int(c["std"]), int(c.get("part") or 0), int(c["chapter"])) for c in chapters}

    def key(v):
        return (v["subject"].lower(), v["std"], v["part"], v["chapter"])

    # 1. codes pointing to chapters that are not ingested
    missing_in_db = sorted((c, v) for c, v in codes.items() if key(v) not in db)
    print(f"\n1) {len(missing_in_db)} QR codes point to a chapter that is NOT in the database:")
    for c, v in missing_in_db:
        print(f"   {c}  ->  {v['subject']} class {v['std']} part {v['part']} chapter {v['chapter']}")

    # 2. ingested chapters without any QR code
    covered = {key(v) for v in codes.values()}
    no_code = sorted(db - covered)
    print(f"\n2) {len(no_code)} ingested chapters have NO QR code:")
    for s, std, part, ch in no_code:
        print(f"   {s} class {std} part {part} chapter {ch}")

    # 3. ask the real endpoint for every code
    bad = 0
    for c, v in codes.items():
        status, data = post_json("/qr/resolve", {"code": c})
        if status != 200 or int(data.get("chapter", -1)) != v["chapter"] or int(data.get("part") or 0) != v["part"]:
            bad += 1
            print(f"   /qr/resolve problem for {c}: status {status}, got {data}")
    print(f"\n3) /qr/resolve checked for {len(codes)} codes, {bad} problems.")


if __name__ == "__main__":
    main()