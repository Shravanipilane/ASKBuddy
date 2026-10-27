from app.db.vector_store import get_collection

metas = get_collection().get(include=["metadatas"])["metadatas"]
first = {}
for m in metas:
    key = (m.get("book") or m["subject"], m["chapter"])
    pdf, printed = m["page"], m.get("book_page", 0)
    if key not in first or pdf < first[key][0]:
        first[key] = (pdf, printed)

for (book, ch), (pdf, printed) in sorted(first.items()):
    status = f"book page {printed}" if printed else "NOT DETECTED (using PDF page)"
    print(f"{book} ch{ch:>2}: PDF page {pdf} -> {status}")