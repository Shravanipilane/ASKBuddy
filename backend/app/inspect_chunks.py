import sys
import chromadb
from app.utils import config

col = chromadb.PersistentClient(path=str(config.CHROMA_DIR)).get_collection(config.COLLECTION_NAME)

n = int(sys.argv[1]) if len(sys.argv) > 1 else 5
page = int(sys.argv[2]) if len(sys.argv) > 2 else None

total = col.count()
all_docs = col.get(include=["documents"])["documents"]
lengths = [len(d) for d in all_docs]
print(f"Total chunks: {total}")
print(f"Length (chars): min {min(lengths)}, avg {sum(lengths)//len(lengths)}, max {max(lengths)}")

data = col.get(where={"page": page} if page else None, limit=n, include=["documents", "metadatas"])
for id_, doc, meta in zip(data["ids"], data["documents"], data["metadatas"]):
    print(f"\n=== {id_} | page {meta['page']} | {len(doc)} chars ===")
    print(doc)