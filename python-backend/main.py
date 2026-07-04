import os
from dotenv import load_dotenv

# Load .env — Railway injects env vars natively; .env fallback for local dev
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    # Try parent directory (Next.js project root)
    parent_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env.local')
    if os.path.exists(parent_env):
        load_dotenv(parent_env)

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI
import subprocess, json, httpx, re, time, shutil
import boto3
from integration_example import reframe_clip
from botocore.client import Config

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

openai_client = OpenAI(
    api_key=os.getenv('CHENZK_API_KEY'),
    base_url="https://chenzk.top/v1"
)

# ── QUALITY PRESETS ──────────────────────────────────────
QUALITY_PRESETS = {
    '720p':  {'target_height': 720,  'crf': 23, 'preset': 'veryfast'},
    '1080p': {'target_height': 1080, 'crf': 20, 'preset': 'veryfast'},
    '4k':    {'target_height': 2160, 'crf': 18, 'preset': 'veryfast'},
}

class ProcessRequest(BaseModel):
    projectId: str
    youtubeUrl: str
    clipCount: int = 5
    quality: str = '720p'

# ── R2 FUNCTIONS ──────────────────────────────────────────
def get_r2_client():
    return boto3.client(
        's3',
        endpoint_url=f"https://{os.getenv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com",
        aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'),
        config=Config(signature_version='s3v4'),
        region_name='auto'
    )

def upload_clip_to_r2(local_path: str, project_id: str, filename: str) -> str:
    bucket = os.getenv('R2_BUCKET_NAME', 'clipai-videos')
    if not os.getenv('R2_ACCOUNT_ID') or not os.getenv('R2_ACCESS_KEY_ID'):
        print(f"⚠️ R2 not configured, saving clip locally: {local_path}")
        return f"/clips/{project_id}/{filename}"
    r2_key = f"clips/{project_id}/{filename}"
    client = get_r2_client()
    with open(local_path, 'rb') as f:
        client.upload_fileobj(f, bucket, r2_key, ExtraArgs={'ContentType': 'video/mp4'})
    public_url = os.getenv('R2_PUBLIC_URL', '').rstrip('/')
    if public_url:
        return f"{public_url}/{r2_key}"
    return client.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket, 'Key': r2_key},
        ExpiresIn=604800
    )

# ── HEALTH ────────────────────────────────────────────────
def update_progress(project_id: str, progress_value: int):
    try:
        with httpx.Client() as client:
            client.post(
                "http://localhost:3000/api/clips/progress",
                json={"projectId": project_id, "progress": progress_value},
                timeout=5.0
            )
        print(f"✅ Progress updated: {progress_value}%")
    except Exception as e:
        print(f"⚠️ Gagal update progress ke Next.js: {e}")

@app.get("/health")
def health():
    return {"status": "ok"}

# ── BACKGROUND WORKER ─────────────────────────────────────
import asyncio, threading

def process_in_background(req: ProcessRequest):
    """Jalan di background thread — return HTTP dulu, baru proses berat."""
    try:
        video_path = f"/tmp/{req.projectId}.mp4"
        audio_path = f"/tmp/{req.projectId}.mp3"
        clips_dir  = f"/home/je3393/clipai/public/clips/{req.projectId}"
        os.makedirs(clips_dir, exist_ok=True)

        # — 1. DOWNLOAD —
        update_progress(req.projectId, 15)
        print(f"Downloading: {req.youtubeUrl}")
        subprocess.run([
            "yt-dlp", "-f", "best[ext=mp4]/best",
            "--max-filesize", "500m",
            "--js-runtimes", "node",
            "-o", video_path, req.youtubeUrl
        ], check=True)

        # — 2. EXTRACT AUDIO (Optimasi Kompresi) —
        update_progress(req.projectId, 30)
        print("Extracting and compressing audio...")
        # Kita matikan video (-vn), set ke mono (-ac 1), 16kHz (-ar 16000), dan bitrate kecil (-b:a 32k)
        subprocess.run([
            "ffmpeg", "-i", video_path,
            "-vn", "-ar", "16000", "-ac", "1", "-b:a", "32k",
            audio_path, "-y"
        ], check=True)
        # — 3. TRANSKRIPSI (AssemblyAI) —
        update_progress(req.projectId, 40)
        print("Transcribing with AssemblyAI...")
        assembly_headers = {"authorization": "fee8cff6037748b78fda2bb7a707f025"}
        
        # Step A: Upload file audio yang udah di-compress
        with open(audio_path, 'rb') as f:
            upload_res = httpx.post(
                "https://api.assemblyai.com/v2/upload", 
                headers=assembly_headers, 
                content=f.read(), 
                timeout=120.0
            )
        upload_res.raise_for_status()
        audio_url = upload_res.json()["upload_url"]

        # Step B: Request transkripsi dengan bahasa Indonesia
        req_res = httpx.post(
            "https://api.assemblyai.com/v2/transcript", 
            headers=assembly_headers, 
            json={"audio_url": audio_url, "language_code": "id"}, 
            timeout=60.0
        )
        req_res.raise_for_status()
        transcript_id = req_res.json()["id"]

        # Step C: Polling nungguin AI selesai dengerin audio
        polling_endpoint = f"https://api.assemblyai.com/v2/transcript/{transcript_id}"
        while True:
            update_progress(req.projectId, 50)
            poll_res = httpx.get(polling_endpoint, headers=assembly_headers, timeout=60.0).json()
            if poll_res["status"] == "completed":
                transcript_text = poll_res["text"]
                break
            elif poll_res["status"] == "error":
                raise ValueError(f"AssemblyAI Error: {poll_res['error']}")
            
            print(f"AssemblyAI: Processing... (ID: {transcript_id})")
            time.sleep(5)
        
        print(f"Transcript: {len(transcript_text)} chars")

        # — 4. ANALISIS GPT —
        update_progress(req.projectId, 70)
        print("Analyzing with GPT...")
        message = openai_client.chat.completions.create(
            model="gpt-5.4-mini",
            max_tokens=2000,
            messages=[{"role": "user", "content": f"""Analisis transkripsi video berikut dan temukan {req.clipCount} momen terbaik untuk dijadikan klip viral TikTok/Shorts.
Transkripsi:
{transcript_text}
Berikan response dalam format JSON array seperti ini:
[
  {{
    "startSec": 10.5,
    "endSec": 45.2,
    "viralityScore": 92,
    "reason": "Hook kuat di awal",
    "tags": ["hook", "emotional"]
  }}
]
Hanya berikan JSON array saja, tanpa penjelasan tambahan."""}]
        )
        clips_raw = message.choices[0].message.content.strip()
        json_match = re.search(r'\[.*\]', clips_raw, re.DOTALL)
        if json_match:
            clips = json.loads(json_match.group())
        else:
            raise ValueError(f"No JSON array: {clips_raw[:200]}")

        # — 5. POTONG VIDEO (FFmpeg) —
        update_progress(req.projectId, 85)
        print(f"Cutting {len(clips)} clips...")
        for i, clip in enumerate(clips):
            start    = clip.get("startSec", 0)
            end      = clip.get("endSec", 0)
            duration = end - start
            if duration <= 0:
                print(f"Clip {i+1} skipped: invalid duration")
                clip["clipPath"] = None
                continue

            trimmed_path = f"{clips_dir}/clip_{i+1}_trimmed.mp4"
            out_path = f"{clips_dir}/clip_{i+1}.mp4"
            print(f"  Clip {i+1}: {start}s → {end}s ({duration:.1f}s)")

            # Step 1: Trim dulu (copies stream, gak re-encode — cepet)
            subprocess.run([
                "ffmpeg",
                "-ss", str(start),
                "-i", video_path,
                "-t", str(duration),
                "-c", "copy",           # stream copy — gak re-encode
                "-map", "0:v",
                "-map", "0:a?",
                trimmed_path, "-y"
            ], check=True, capture_output=True)

            # Step 2: Face-aware reframe (ganti crop center static)
            try:
                q = req.quality.lower().replace(' ', '')
                if q not in QUALITY_PRESETS:
                    q = '720p'
                q_cfg = QUALITY_PRESETS[q]
                print(f"  🎯 Quality: {req.quality} → {q_cfg['target_height']}p, CRF {q_cfg['crf']}, preset {q_cfg['preset']}")
                reframe_clip(
                    trimmed_path, out_path,
                    target_height=q_cfg['target_height'],
                    crf=q_cfg['crf'],
                    preset=q_cfg['preset'],
                )
            except Exception as reframe_err:
                print(f"  ⚠️ MediaPipe reframe gagal: {reframe_err}, fallback ke crop center")
                # Fallback: crop center biasa
                # Hitung width 9:16, dibulatkan ke genap
                w = q_cfg['target_height'] * 9 // 16 // 2 * 2
                h = q_cfg['target_height']
                subprocess.run([
                    "ffmpeg",
                    "-i", trimmed_path,
                    "-vf", f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:black",
                    "-c:v", "libx264",
                    "-c:a", "aac",
                    "-preset", q_cfg['preset'],
                    "-crf", str(q_cfg['crf']),
                    out_path, "-y"
                ], check=True)

            # Bersihin file trimmed
            if os.path.exists(trimmed_path):
                os.remove(trimmed_path)

            clip["clipPath"] = out_path
            print(f"  ✅ Clip {i+1} saved: {out_path}")
        # — 6. UPLOAD KE R2 —
        update_progress(req.projectId, 95)
        print("Uploading clips to R2...")
        r2_urls = []
        for i, clip in enumerate(clips):
            if clip.get("clipPath") and os.path.exists(clip["clipPath"]):
                filename = f"clip_{i+1}.mp4"
                storage_url = upload_clip_to_r2(clip["clipPath"], req.projectId, filename)
                clip["storageUrl"] = storage_url
                r2_urls.append(storage_url)
                print(f"  ✅ Uploaded clip {i+1}: {storage_url[:80]}...")
            else:
                clip["storageUrl"] = None
                r2_urls.append(None)

        # — 7. CLEANUP —
        if os.path.exists(audio_path):
            os.remove(audio_path)

        # — 8. CALLBACK ke Next.js dengan hasil data klip —
        print("📞 Mengirim callback ke Next.js...")
        try:
            with httpx.Client() as client:
                client.post(
                    "http://localhost:3000/api/clips/callback",
                    json={
                        "projectId": req.projectId,
                        "transcript": transcript_text,
                        "clips": clips,
                        "r2Urls": r2_urls
                    },
                    timeout=10.0
                )
            print("✅ Callback sukses!")
        except Exception as cb_err:
            print(f"❌ Callback gagal: {cb_err}")

    except Exception as e:
        print(f"Error: {e}")
        # Notify Next.js about failure via callback
        try:
            with httpx.Client() as client:
                client.post(
                    "http://localhost:3000/api/clips/callback",
                    json={"projectId": req.projectId, "error": str(e)},
                    timeout=5.0
                )
        except:
            pass


@app.post("/process")
async def process_video(req: ProcessRequest):
    """Langsung return 202 Accepted, proses di background thread."""
    thread = threading.Thread(target=process_in_background, args=(req,))
    thread.start()
    return {
        "status": "accepted",
        "projectId": req.projectId,
        "message": "Processing started in background"
    }
