import os
import pickle
import re
import smtplib
import tempfile
from contextlib import asynccontextmanager as _acm
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import aiosqlite
import cv2
import numpy as np
from groq import Groq

from dotenv import load_dotenv, dotenv_values
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from pydantic import BaseModel, EmailStr

load_dotenv(override=True)

# ── SQLite configuration ──────────────────────────────────────────────────────
DB_PATH = os.getenv("DB_PATH", str(Path(__file__).parent / "guardplus.db"))

app = FastAPI(title="GuardPlus API", version="2.0.0")

# Allow all origins so the phone on the local network can reach the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── SQLite helpers ────────────────────────────────────────────────────────────
@_acm
async def get_db():
    """Async context manager that opens and closes a per-request SQLite connection."""
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        yield conn


def row_to_dict(row: aiosqlite.Row) -> dict:
    return dict(row)


@app.on_event("startup")
async def startup():
    """Create the visitors table if it doesn't exist, then pre-warm face embeddings."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS visitors (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                phone       TEXT NOT NULL,
                email       TEXT DEFAULT '',
                purpose     TEXT NOT NULL,
                personToMeet TEXT NOT NULL,
                department  TEXT NOT NULL,
                visitorPhoto TEXT,
                guardPhoto  TEXT,
                entryTime   TEXT NOT NULL,
                entryDate   TEXT,
                exitTime    TEXT,
                status      TEXT DEFAULT 'active',
                guard       TEXT DEFAULT 'Guard on Duty'
            )
        """)
        await db.commit()

    # Pre-warm DeepFace model and build embeddings cache
    image_files = [
        f for f in DATASET_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS
    ] if DATASET_DIR.exists() else []
    if image_files:
        try:
            _build_embeddings_cache()
        except Exception as warmup_err:
            print(f"[Startup] Embeddings pre-warm failed (non-fatal): {warmup_err}")


@app.on_event("shutdown")
async def shutdown():
    pass  # aiosqlite connections are closed per-request

# ── Pydantic models ───────────────────────────────────────────────────────────
class VisitorIn(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str] = ""
    purpose: str
    personToMeet: str
    department: str
    visitorPhoto: Optional[str] = None
    guardPhoto: Optional[str] = None
    entryTime: str
    entryDate: Optional[str] = None   # YYYY-MM-DD in local timezone
    exitTime: Optional[str] = None
    status: str = "active"
    guard: str = "Guard on Duty"

class CheckoutRequest(BaseModel):
    exitTime: Optional[str] = None

class EmailPassRequest(BaseModel):
    visitor_email: EmailStr
    visitor_name: str
    pass_id: str
    purpose: Optional[str] = ""
    department: Optional[str] = ""
    person_to_meet: Optional[str] = ""
    entry_time: Optional[str] = ""
    guard: Optional[str] = "Guard on Duty"

# ── Helpers ───────────────────────────────────────────────────────────────────
# Cache the mail config once so we don't re-read .env on every email send.
_MAIL_CONF: Optional[ConnectionConfig] = None

def get_mail_conf() -> ConnectionConfig:
    """Return a cached ConnectionConfig, building it once from .env."""
    global _MAIL_CONF
    if _MAIL_CONF is None:
        env = dotenv_values(os.path.join(os.path.dirname(__file__), ".env"))
        _MAIL_CONF = ConnectionConfig(
            MAIL_USERNAME=env.get("MAIL_USERNAME"),
            MAIL_PASSWORD=env.get("MAIL_PASSWORD"),
            MAIL_FROM=env.get("MAIL_FROM"),
            MAIL_PORT=int(env.get("MAIL_PORT", "587")),
            MAIL_SERVER=env.get("MAIL_SERVER", "smtp.gmail.com"),
            MAIL_FROM_NAME="GuardPlus Visitor System",
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=False,
        )
    return _MAIL_CONF

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    env = dotenv_values(os.path.join(os.path.dirname(__file__), ".env"))
    return {
        "status": "GuardPlus API is running",
        "mail_user": env.get("MAIL_USERNAME", "NOT SET"),
        "mail_server": env.get("MAIL_SERVER", "NOT SET"),
    }

# ── Visitor CRUD ──────────────────────────────────────────────────────────────
@app.post("/api/visitors", status_code=201)
async def create_visitor(visitor: VisitorIn):
    doc = visitor.dict()
    async with get_db() as db:
        await db.execute("""
            INSERT INTO visitors
              (id, name, phone, email, purpose, personToMeet, department,
               visitorPhoto, guardPhoto, entryTime, entryDate, exitTime, status, guard)
            VALUES
              (:id, :name, :phone, :email, :purpose, :personToMeet, :department,
               :visitorPhoto, :guardPhoto, :entryTime, :entryDate, :exitTime, :status, :guard)
        """, doc)
        await db.commit()
    return doc


@app.get("/api/visitors")
async def list_visitors(date: Optional[str] = None, status: Optional[str] = None):
    """
    List visitors sorted newest-first.
    - date: YYYY-MM-DD  (matches entryDate field OR falls back to entryTime UTC prefix)
    - status: 'active' | 'exited' | omit for all
    """
    conditions = []
    params: list = []

    if date:
        conditions.append("(entryDate = ? OR entryTime LIKE ?)")
        params.extend([date, f"{date}%"])
    if status and status != "all":
        conditions.append("status = ?")
        params.append(status)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    sql = f"SELECT * FROM visitors {where} ORDER BY entryTime DESC"

    async with get_db() as db:
        async with db.execute(sql, params) as cursor:
            rows = await cursor.fetchall()

    return [row_to_dict(r) for r in rows]


@app.get("/api/visitors/{visitor_id}")
async def get_visitor(visitor_id: str):
    async with get_db() as db:
        async with db.execute("SELECT * FROM visitors WHERE id = ?", [visitor_id]) as cursor:
            row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Visitor not found")
    return row_to_dict(row)


@app.post("/api/visitors/{visitor_id}/checkout")
async def checkout_visitor(visitor_id: str, req: CheckoutRequest = None):
    exit_time = (
        req.exitTime if (req and req.exitTime) else None
    ) or datetime.now(timezone.utc).isoformat()

    async with get_db() as db:
        result = await db.execute(
            "UPDATE visitors SET status = 'exited', exitTime = ? WHERE id = ?",
            [exit_time, visitor_id],
        )
        await db.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Visitor not found")

        async with db.execute("SELECT * FROM visitors WHERE id = ?", [visitor_id]) as cursor:
            row = await cursor.fetchone()

    return row_to_dict(row)


@app.post("/api/scan-qr")
async def scan_qr(image: UploadFile = File(...)):
    """
    Accept an uploaded QR code image, decode it server-side using OpenCV,
    extract the visitor ID, look up the visitor, and auto-checkout if active.
    """
    contents = await image.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    # Decode image bytes into OpenCV format
    np_arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not read the uploaded image.")

    # Try OpenCV's built-in QR detector
    detector = cv2.QRCodeDetector()
    data, points, _ = detector.detectAndDecode(img)

    # If OpenCV fails, try with preprocessing (grayscale, threshold, resize)
    if not data:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        data, points, _ = detector.detectAndDecode(gray)

    if not data:
        # Try with adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 51, 11
        )
        data, points, _ = detector.detectAndDecode(thresh)

    if not data:
        # Try scaling up small images
        h, w = img.shape[:2]
        if max(h, w) < 500:
            scale = 500 / max(h, w)
            resized = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
            data, points, _ = detector.detectAndDecode(resized)

    if not data:
        raise HTTPException(
            status_code=400,
            detail="Could not decode QR code from the image. Please upload a clearer image.",
        )

    # Extract visitor ID from QR data (JSON or plain string)
    visitor_id = data.strip()
    try:
        import json
        parsed = json.loads(data)
        if isinstance(parsed, dict) and parsed.get("id"):
            visitor_id = parsed["id"]
    except (json.JSONDecodeError, ValueError):
        pass  # plain ID string

    async with get_db() as db:
        # Look up visitor
        async with db.execute("SELECT * FROM visitors WHERE id = ?", [visitor_id]) as cursor:
            row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Visitor '{visitor_id}' not found in database.")

        doc = row_to_dict(row)

        # Auto-checkout if active
        if doc.get("status") == "active":
            exit_time = datetime.now(timezone.utc).isoformat()
            await db.execute(
                "UPDATE visitors SET status = 'exited', exitTime = ? WHERE id = ?",
                [exit_time, visitor_id],
            )
            await db.commit()
            async with db.execute("SELECT * FROM visitors WHERE id = ?", [visitor_id]) as cursor:
                row = await cursor.fetchone()
            doc = row_to_dict(row)

    return doc


# ── SMTP test ─────────────────────────────────────────────────────────────────
@app.get("/api/test-smtp")
async def test_smtp():
    env  = dotenv_values(os.path.join(os.path.dirname(__file__), ".env"))
    host = env.get("MAIL_SERVER", "smtp.gmail.com")
    port = int(env.get("MAIL_PORT", "587"))
    user = env.get("MAIL_USERNAME", "")
    pwd  = env.get("MAIL_PASSWORD", "")
    try:
        with smtplib.SMTP(host, port, timeout=10) as s:
            s.ehlo(); s.starttls(); s.ehlo()
            s.login(user, pwd)
        return {"success": True, "message": f"SMTP login OK for {user}"}
    except smtplib.SMTPAuthenticationError as e:
        raise HTTPException(status_code=401, detail=f"Auth failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Email ─────────────────────────────────────────────────────────────────────
async def _send_pass_email_task(
    visitor_email: str,
    visitor_name: str,
    pass_id: str,
    purpose: str = "",
    department: str = "",
    person_to_meet: str = "",
    entry_time: str = "",
    guard: str = "Guard on Duty",
) -> None:
    """
    Sends a beautiful HTML visitor pass directly in the email body.
    No PDF attachment — runs as a FastAPI BackgroundTask.
    """
    try:
        # Format the entry time nicely if it's an ISO string
        display_time = entry_time
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(entry_time.replace("Z", "+00:00"))
            display_time = dt.strftime("%d %b %Y, %I:%M %p")
        except Exception:
            pass

        html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px 0;background:#f0fdf4;font-family:'Segoe UI',Arial,sans-serif;">

  <div style="max-width:520px;margin:0 auto;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);
                border-radius:16px 16px 0 0;padding:32px 28px;text-align:center;">
      <div style="display:inline-flex;align-items:center;gap:10px;">
        <div style="width:38px;height:38px;background:rgba(255,255,255,0.2);
                    border-radius:10px;display:flex;align-items:center;justify-content:center;
                    font-size:20px;">&#128737;</div>
        <span style="color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">GuardPlus</span>
      </div>
      <p style="color:rgba(255,255,255,0.75);margin:8px 0 0;font-size:11px;
                letter-spacing:3px;text-transform:uppercase;">Visitor Management System</p>
    </div>

    <!-- Pass Card -->
    <div style="background:#fff;border-radius:0 0 16px 16px;
                box-shadow:0 8px 32px rgba(22,163,74,0.12);padding:32px 28px;">

      <!-- Greeting -->
      <h2 style="margin:0 0 6px;color:#111827;font-size:22px;font-weight:700;">Hello, {visitor_name}!</h2>
      <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.6;">
        Your visitor pass has been issued. Please keep the <strong style="color:#111827;">Pass ID</strong> handy when at the exit gate.
      </p>

      <!-- Pass ID Banner -->
      <div style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);
                  border:1.5px solid #86efac;border-radius:12px;
                  padding:18px 22px;margin-bottom:24px;text-align:center;">
        <p style="margin:0 0 4px;color:#15803d;font-size:11px;letter-spacing:2px;
                  text-transform:uppercase;font-weight:600;">Pass ID</p>
        <p style="margin:0;color:#14532d;font-size:26px;font-weight:800;
                  letter-spacing:1px;font-family:monospace;">{pass_id}</p>
      </div>

      <!-- Info Grid -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="width:50%;padding:0 8px 14px 0;vertical-align:top;">
            <p style="margin:0 0 3px;color:#9ca3af;font-size:11px;letter-spacing:1px;
                      text-transform:uppercase;font-weight:600;">Purpose</p>
            <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">{purpose or '—'}</p>
          </td>
          <td style="width:50%;padding:0 0 14px 8px;vertical-align:top;">
            <p style="margin:0 0 3px;color:#9ca3af;font-size:11px;letter-spacing:1px;
                      text-transform:uppercase;font-weight:600;">Department</p>
            <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">{department or '—'}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 8px 0 0;vertical-align:top;">
            <p style="margin:0 0 3px;color:#9ca3af;font-size:11px;letter-spacing:1px;
                      text-transform:uppercase;font-weight:600;">Meeting</p>
            <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">{person_to_meet or '—'}</p>
          </td>
          <td style="padding:0 0 0 8px;vertical-align:top;">
            <p style="margin:0 0 3px;color:#9ca3af;font-size:11px;letter-spacing:1px;
                      text-transform:uppercase;font-weight:600;">Entry Time</p>
            <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">{display_time}</p>
          </td>
        </tr>
      </table>

      <!-- Divider -->
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px;">

      <!-- Status Badge -->
      <div style="display:inline-flex;align-items:center;gap:8px;
                  background:#f0fdf4;border:1px solid #bbf7d0;
                  border-radius:999px;padding:7px 16px;margin-bottom:20px;">
        <span style="width:8px;height:8px;background:#22c55e;border-radius:50%;display:inline-block;"></span>
        <span style="color:#15803d;font-size:13px;font-weight:600;">Active Pass</span>
      </div>

      <!-- Authorized by -->
      <p style="margin:0 0 28px;color:#9ca3af;font-size:13px;">
        Authorized by: <strong style="color:#4b5563;">{guard}</strong>
      </p>

      <!-- CTA Box -->
      <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;
                  padding:16px 18px;">
        <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
          &#9432;&nbsp; Please <strong style="color:#111827;">show your Pass ID</strong> at the
          exit gate when leaving the premises.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <p style="text-align:center;color:#9ca3af;font-size:11px;margin:20px 0 0;
              letter-spacing:0.5px;">
      GuardPlus &bull; Campus Visitor Management &bull; Automated System<br>
      This is an automated message — please do not reply.
    </p>

  </div>
</body>
</html>
        """

        message = MessageSchema(
            subject=f"GuardPlus — Your Visitor Pass ({pass_id})",
            recipients=[visitor_email],
            body=html_body,
            subtype=MessageType.html,
        )

        fm = FastMail(get_mail_conf())
        await fm.send_message(message)
        print(f"[Email] Pass sent to {visitor_email}")

    except Exception as e:
        print(f"[Email] Failed to send to {visitor_email}: {e}")


@app.post("/api/send-pass-email", status_code=202)
async def send_pass_email(req: EmailPassRequest, background_tasks: BackgroundTasks):
    """
    Accepts the email request and returns 202 Accepted immediately.
    The actual SMTP send happens in the background so the UI is never blocked.
    """
    background_tasks.add_task(
        _send_pass_email_task,
        req.visitor_email,
        req.visitor_name,
        req.pass_id,
        req.purpose,
        req.department,
        req.person_to_meet,
        req.entry_time,
        req.guard,
    )
    return {"success": True, "message": f"Email queued for {req.visitor_email}"}



# ── Guard Face Recognition ────────────────────────────────────────────────────
# Dataset folder lives at: backend/dataset/
DATASET_DIR = Path(__file__).parent / "dataset"
DATASET_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Persistent embeddings cache – rebuilt only when the dataset changes.
EMBEDDINGS_CACHE_FILE = DATASET_DIR / "guard_embeddings.pkl"

# ── Verification settings (tune these if recognition is too strict/loose) ───
# Facenet512 is much more robust for real-world webcam captures than VGG-Face.
# Cosine distance: same person ~0.0-0.45, different person >0.6
# 0.50 is a safe balance — lenient enough for webcam vs reference photo,
# strict enough to reject background/non-face images.
VERIFY_MODEL     = "Facenet512"
VERIFY_THRESHOLD = 0.60   # cosine distance; raised from 0.50 to handle cross-device captures
VERIFY_DETECTOR  = "opencv"  # fast; use "retinaface" for better accuracy


def _sanitize_name(name: str) -> str:
    """Convert 'John Doe' → 'John_Doe', strip special chars."""
    name = name.strip()
    name = re.sub(r"[^\w\s-]", "", name)
    name = re.sub(r"\s+", "_", name)
    return name


def _guard_display_name(filename: str) -> str:
    """Convert 'John_Doe.jpg' → 'John Doe'."""
    stem = Path(filename).stem
    return stem.replace("_", " ")


def _find_guard_file(guard_name: str) -> Optional[Path]:
    """Find the dataset file for a given sanitized guard name (any extension)."""
    for ext in ALLOWED_EXTENSIONS:
        p = DATASET_DIR / f"{guard_name}{ext}"
        if p.exists():
            return p
    return None


def _prepare_image_for_groq(image_bytes: bytes, max_side: int = 1280) -> bytes:
    """
    Decode image_bytes (any format: JPEG, PNG, WebP, HEIC…) using Pillow,
    resize so the longest side ≤ max_side, and re-encode as JPEG.
    This keeps the Groq payload well under its ~4 MB base64 limit and
    ensures the MIME type label always matches the actual bytes.
    """
    from PIL import Image as PilImage
    import io

    pil_img = PilImage.open(io.BytesIO(image_bytes))
    pil_img = pil_img.convert("RGB")  # drop alpha / handle HEIC colour spaces

    w, h = pil_img.size
    if max(w, h) > max_side:
        scale = max_side / max(w, h)
        pil_img = pil_img.resize((int(w * scale), int(h * scale)), PilImage.LANCZOS)

    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def _is_spoofed(image_bytes: bytes) -> bool:
    """
    Ask the Groq vision LLM whether the captured image is a spoofing attempt
    (printed photo, screen replay, photo-of-a-photo, mask, etc.).
    Returns True if the image is judged to be spoofed, False otherwise.
    Treats any API/decode error as non-spoofed so the flow degrades gracefully.
    """
    if not GROQ_API_KEY:
        print("[Spoof Check] GROQ_API_KEY not set – skipping spoof detection.")
        return False

    try:
        # Normalize to a small JPEG so the payload always has the right MIME type
        # and stays well within Groq's ~4 MB base64 image limit.
        jpeg_bytes = _prepare_image_for_groq(image_bytes)
        b64 = base64.b64encode(jpeg_bytes).decode("utf-8")
        data_url = f"data:image/jpeg;base64,{b64}"

        client = Groq(api_key=GROQ_API_KEY)
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "You are a face anti-spoofing security system for an access-control gate. "
                                "The image was captured directly from a camera (webcam or mobile camera) "
                                "pointed at someone standing at the gate. "
                                "Determine whether the image shows a LIVE human being physically present "
                                "in front of the camera, or a SPOOFED presentation attack such as: "
                                "a printed photograph being held up, a digital screen (TV, tablet, laptop, "
                                "or monitor) displaying a face, a 3-D mask, or any other non-live artefact. "
                                "A real person standing in front of any camera — including a mobile camera "
                                "or webcam — is LIVE. "
                                "Reply with EXACTLY one word: LIVE or SPOOFED. No other text."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": data_url},
                        },
                    ],
                }
            ],
            temperature=0,
            max_completion_tokens=5,
            top_p=1,
            stream=False,
        )
        answer = response.choices[0].message.content.strip().upper()
        print(f"[Spoof Check] LLM response: '{answer}'")
        return "SPOOF" in answer  # catches 'SPOOFED'
    except Exception as e:
        print(f"[Spoof Check] API error (non-fatal, assuming live): {e}")
        return False


def _cosine_distance(a: list, b: list) -> float:
    """Cosine distance between two embedding vectors (0 = identical)."""
    va, vb = np.array(a, dtype=np.float32), np.array(b, dtype=np.float32)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    if denom == 0:
        return 1.0
    return float(1.0 - np.dot(va, vb) / denom)


def _build_embeddings_cache() -> dict:
    """
    Compute DeepFace embeddings for every registered guard image and persist
    them to EMBEDDINGS_CACHE_FILE.  Returns the newly built cache dict.
    """
    from deepface import DeepFace  # lazy import

    image_files = [
        f for f in DATASET_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS
    ]

    cache: dict = {}
    for img_path in image_files:
        try:
            results = DeepFace.represent(
                img_path=str(img_path),
                model_name=VERIFY_MODEL,
                detector_backend=VERIFY_DETECTOR,
                enforce_detection=False,
            )
            if results:
                cache[img_path.name] = results[0]["embedding"]
                print(f"[Embeddings] Cached {img_path.name}")
        except Exception as e:
            print(f"[Embeddings] Skipping {img_path.name}: {e}")

    with open(EMBEDDINGS_CACHE_FILE, "wb") as fh:
        pickle.dump(cache, fh)
    print(f"[Embeddings] Saved {len(cache)} embeddings → {EMBEDDINGS_CACHE_FILE.name}")
    return cache


def _load_embeddings_cache() -> dict:
    """
    Return the cached embeddings dict, rebuilding it if the cache is missing
    or the dataset has changed since it was last written.
    """
    # Work out which guard images are on disk right now
    current_images = {
        f.name for f in DATASET_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS
    }

    if EMBEDDINGS_CACHE_FILE.exists():
        with open(EMBEDDINGS_CACHE_FILE, "rb") as fh:
            cache: dict = pickle.load(fh)
        if set(cache.keys()) == current_images:
            return cache  # cache is valid and up-to-date

    # Cache missing or stale – rebuild
    return _build_embeddings_cache()


GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


@app.post("/api/guards/register", status_code=201)
async def register_guard(
    name: str = Form(...),
    image: UploadFile = File(...),
):
    """
    Register a security guard by saving their face image to the dataset folder.
    The image file will be named after the guard (e.g. John_Doe.jpg).
    """
    if not name.strip():
        raise HTTPException(status_code=400, detail="Guard name cannot be empty.")

    ext = Path(image.filename).suffix.lower() if image.filename else ".jpg"
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".jpg"

    sanitized = _sanitize_name(name)
    save_path = DATASET_DIR / f"{sanitized}{ext}"

    try:
        contents = await image.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded image is empty.")
        with open(save_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {e}")

    # Rebuild the embeddings cache to include the new guard
    try:
        _build_embeddings_cache()
    except Exception as cache_err:
        print(f"[Register Guard] Cache rebuild failed (non-fatal): {cache_err}")

    return {
        "success": True,
        "guard": sanitized,
        "display_name": name.strip(),
        "file": str(save_path.name),
    }



@app.post("/api/guards/verify")
async def verify_guard(image: UploadFile = File(...)):
    """
    Verify whether the uploaded face matches any registered guard.
    Uses pre-computed cached embeddings so the DeepFace model is NOT
    retrained or re-run on every guard image on each request.
    """
    from deepface import DeepFace  # lazy import — heavy library

    # Load cached guard embeddings (rebuilt only when dataset changes)
    embeddings = _load_embeddings_cache()
    if not embeddings:
        raise HTTPException(
            status_code=404,
            detail="No guards registered yet. Please register guards first.",
        )

    ext = Path(image.filename).suffix.lower() if image.filename else ".jpg"
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".jpg"

    tmp_path = None
    try:
        contents = await image.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded image is empty.")

        # ── Spoof detection (Vision LLM) ──────────────────────────────────────
        if _is_spoofed(contents):
            raise HTTPException(
                status_code=400,
                detail="Spoofing detected: the image does not appear to be a live face. "
                        "Please capture a live photo directly from the camera.",
            )

        # Write probe image to a temp file for DeepFace
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        # Fix EXIF rotation (phone cameras embed orientation in metadata;
        # DeepFace does not read EXIF so the image can appear sideways)
        try:
            from PIL import Image as PilImage, ExifTags
            pil_img = PilImage.open(tmp_path)
            exif = pil_img.getexif()
            orientation_key = next(
                (k for k, v in ExifTags.TAGS.items() if v == "Orientation"), None
            )
            if orientation_key and orientation_key in exif:
                orientation = exif[orientation_key]
                rotation_map = {3: 180, 6: 270, 8: 90}
                if orientation in rotation_map:
                    pil_img = pil_img.rotate(rotation_map[orientation], expand=True)
            pil_img = pil_img.convert("RGB")
            pil_img.save(tmp_path, "JPEG", quality=95)
        except Exception as exif_err:
            print(f"[Guard Verify] EXIF fix skipped: {exif_err}")
        try:
            probe_results = DeepFace.represent(
                img_path=tmp_path,
                model_name=VERIFY_MODEL,
                detector_backend=VERIFY_DETECTOR,
                enforce_detection=False,
            )
        except Exception as rep_err:
            err_str = str(rep_err)
            print(f"[Guard Verify] represent() failed: {err_str}")
            raise HTTPException(status_code=500, detail=err_str)

        if not probe_results:
            raise HTTPException(
                status_code=400,
                detail="No face detected in the photo. Please take a clear, front-facing photo.",
            )

        probe_embedding = probe_results[0]["embedding"]

        # Compare probe against every cached guard embedding
        best_distance = float("inf")
        best_name = None

        for guard_filename, guard_embedding in embeddings.items():
            dist = _cosine_distance(probe_embedding, guard_embedding)
            print(f"[Guard Verify] vs {guard_filename}: distance={dist:.4f}")
            if dist < best_distance:
                best_distance = dist
                best_name = guard_filename

        print(f"[Guard Verify] Best: {best_name}  distance={best_distance:.4f}  threshold={VERIFY_THRESHOLD}")

        if best_name and best_distance <= VERIFY_THRESHOLD:
            return {
                "verified": True,
                "guard": _guard_display_name(best_name),
                "distance": round(best_distance, 4),
                "threshold": VERIFY_THRESHOLD,
            }

        return {
            "verified": False,
            "guard": None,
            "distance": round(best_distance, 4) if best_name else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"[Guard Verify] Exception: {error_msg}")
        if "Face could not be detected" in error_msg or "No item found" in error_msg:
            raise HTTPException(
                status_code=400,
                detail="No face detected in the provided image. Please use a clear, front-facing photo.",
            )
        raise HTTPException(status_code=500, detail=error_msg)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.get("/api/guards")
async def list_guards():
    """Return all registered guards (files in the dataset folder)."""
    guards = []
    for f in sorted(DATASET_DIR.iterdir()):
        if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS:
            guards.append({
                "filename": f.name,
                "name": _guard_display_name(f.name),
                "registered_at": datetime.fromtimestamp(
                    f.stat().st_mtime, tz=timezone.utc
                ).isoformat(),
            })
    return guards



@app.delete("/api/guards/{guard_name}")
async def delete_guard(guard_name: str):
    """
    Remove a registered guard from the dataset.
    guard_name should be the sanitized filename stem (e.g. 'John_Doe').
    """
    target = _find_guard_file(guard_name)
    if not target:
        raise HTTPException(
            status_code=404, detail=f"Guard '{guard_name}' not found in dataset."
        )

    target.unlink()

    # Rebuild the embeddings cache without the deleted guard
    try:
        _build_embeddings_cache()
    except Exception as cache_err:
        print(f"[Delete Guard] Cache rebuild failed (non-fatal): {cache_err}")

    return {"success": True, "deleted": guard_name}


# ── Entrypoint ───────────────────────────────────────────────────────────────
# Running `python main.py` starts uvicorn bound to 0.0.0.0 so any device
# on the same LAN (including phones) can reach the API at http://<laptop-ip>:8000
if __name__ == "__main__":
    import uvicorn
    import socket
    try:
        local_ip = socket.gethostbyname(socket.gethostname())
    except Exception:
        local_ip = "<your-laptop-ip>"
    print(f"\n  GuardPlus API starting — accessible on the network at:")
    print(f"    http://{local_ip}:8000\n")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
