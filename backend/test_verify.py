from pathlib import Path
from deepface import DeepFace

THRESHOLD = 0.80
dataset = Path("dataset")
files = [f for f in dataset.iterdir() if f.suffix.lower() in {".jpg", ".jpeg", ".png"}]
print("Files in dataset:", [f.name for f in files])

# Simulate the new verify logic: each file as "query", loop verify() against all
for query in files:
    best_dist = float("inf")
    best_name = None
    for ref in files:
        result = DeepFace.verify(
            img1_path=str(query),
            img2_path=str(ref),
            model_name="Facenet512",
            detector_backend="opencv",
            distance_metric="cosine",
            enforce_detection=False,
        )
        dist = float(result["distance"])
        print(f"  {query.name}  vs  {ref.name}:  distance={dist:.4f}")
        if dist < best_dist:
            best_dist = dist
            best_name = ref.name
    verdict = "VERIFIED" if best_dist <= THRESHOLD else "FAILED"
    print(f"  --> Best: {best_name}  dist={best_dist:.4f}  {verdict}\n")
