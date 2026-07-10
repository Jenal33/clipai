import os
import threading
from dotenv import load_dotenv
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
if os.path.exists(dotenv_path): load_dotenv(dotenv_path)
else:
    parent_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env.local')
    if os.path.exists(parent_env): load_dotenv(parent_env)

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI
import subprocess, json, httpx, re, time, shutil, traceback
import boto3
from integration_example import reframe_clip
from botocore.client import Config

app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware,
    allow_origins=os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(','),
    allow_methods=["*"], allow_headers=["*"], allow_credentials=True)

openai_client = OpenAI(api_key=os.getenv('CHENZK_API_KEY'), base_url="https://chenzk.top/v1")

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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLIPS_DIR = os.path.join(BASE_DIR, '..', 'public', 'clips')
os.makedirs(CLIPS_DIR, exist_ok=True)

def get_r2_client():
    return boto3.client('s3',
        endpoint_url=f"https://{os.getenv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com",
        aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'),
        config=Config(signature_version='s3v4'), region_name='auto')

def upload_clip_to_r2(local_path: str, project_id: str, filename: str) -> str:
    bucket = os.getenv('R2_BUCKET_NAME', 'clipai-videos')
    if not os.getenv('R2_ACCOUNT_ID') or not os.getenv('R2_ACCESS_KEY_ID'):
        print(f"R2 not configured, saving locally: {local_path}")
        return f"/clips/{project_id}/{filename}"
    r2_key = f"clips/{project_id}/{filename}"
    client = get_r2_client()
    with open(local_path, 'rb') as f:
        client.upload_fileobj(f, bucket, r2_key, ExtraArgs={'ContentType': 'video/mp4'})
    public_url = os.getenv('R2_PUBLIC_URL', '').rstrip('/')
    return f"{public_url}/{r2_key}" if public_url else \
        client.generate_presigned_url('get_object', Params={'Bucket': bucket, 'Key': r2_key}, ExpiresIn=604800)

def update_progress(project_id: str, progress_value: int):
    try:
        with httpx.Client() as client:
            client.post("http://localhost:3000/api/clips/progress",
                json={"projectId": project_id, "progress": progress_value}, timeout=5.0)
        print(f"Progress: {progress_value}%")
    except Exception as e:
        print(f"Gagal update progress: {e}")

@app.get("/health")
def health(): return {"status": "ok"}

def process_in_background(req: ProcessRequest):
    try:
        video_path = f"/tmp/{req.projectId}.mp4"
        audio_path = f"/tmp/{req.projectId}.mp3"
        project_clips_dir = os.path.join(CLIPS_DIR, req.projectId)
        os.makedirs(project_clips_dir, exist_ok=True)

        update_progress(req.projectId, 15)
        print(f"Downloading: {req.youtubeUrl}")
        subprocess.run(["yt-dlp", "-f", "best[ext=mp4]/best", "--max-filesize", "500m",
            "--js-runtimes", "node", "-o", video_path, req.youtubeUrl], check=True)

        update_progress(req.projectId, 30)
        print("Extracting audio...")
        subprocess.run(["ffmpeg", "-i", video_path, "-vn", "-ar", "16000", "-ac", "1",
            "-b:a", "32k", audio_path, "-y"], check=True)

        update_progress(req.projectId, 40)
        print("Transcribing with AssemblyAI...")
        hdrs = {"authorization": "fee8cff6037748b78fda2bb7a707f025"}
        with open(audio_path, 'rb') as f:
            upload_res = httpx.post("https://api.assemblyai.com/v2/upload", headers=hdrs, content=f.read(), timeout=120.0)
        upload_res.raise_for_status()
        audio_url = upload_res.json()["upload_url"]
        req_res = httpx.post("https://api.assemblyai.com/v2/transcript", headers=hdrs,
            json={"audio_url": audio_url, "language_code": "id"}, timeout=60.0)
        req_res.raise_for_status()
        tid = req_res.json()["id"]
        while True:
            update_progress(req.projectId, 50)
            poll = httpx.get(f"https://api.assemblyai.com/v2/transcript/{tid}", headers=hdrs, timeout=60.0).json()
            if poll["status"] == "completed": transcript_text = poll["text"]; break
            elif poll["status"] == "error": raise ValueError(f"AssemblyAI Error: {poll['error']}")
            print(f"AssemblyAI processing... (ID: {tid})")
            time.sleep(5)
        print(f"Transcript: {len(transcript_text)} chars")

        update_progress(req.projectId, 70)
        print("Analyzing with GPT...")
        msg = openai_client.chat.completions.create(
        model="gpt-5.4", 
        max_tokens=2000,
        messages=[
            {
                "role": "system", 
                "content": "Kamu adalah Editor Video Viral & Pakar Algoritma TikTok/Reels. Tugasmu menganalisis transkrip dan mencari momen potensial untuk klip vertikal.\n\nATURAN MUTLAK:\n1. HOOK: Detik pertama HARUS sangat menarik, memancing emosi/penasaran. Dilarang keras memulai klip dengan kata sambung (Jadi, Dan, Uhm, Oke).\n2. AKURASI: Pemotongan (startSec & endSec) HARUS presisi di awal dan akhir kalimat lengkap. Dilarang memotong di tengah kalimat.\n3. TOPIK: Prioritaskan momen kontroversial, cerita emosional, atau fakta mengejutkan.\nKeluarkan hasil HANYA dalam format JSON array of objects."
            },
            {
                "role": "user", 
                "content": f"Analisis transkripsi ini:\n{transcript_text}\n\nBerikan TEPAT {req.clipCount} momen paling viral. Response HANYA berupa JSON array dengan struktur persis seperti ini, tanpa markdown dan tanpa teks lain:\n[{{\"title\": \"Judul klip\", \"startSec\": 10, \"endSec\": 35, \"reason\": \"Alasan kenapa klip ini viral\", \"viralityScore\": 95}}]"
            }
                 ]
        )
        clips_raw = msg.choices[0].message.content.strip()
        json_match = re.search(r'\[.*\]', clips_raw, re.DOTALL)
        if json_match: clips = json.loads(json_match.group())
        else: raise ValueError(f"No JSON: {clips_raw[:200]}")
        clips = clips[:req.clipCount]        
        update_progress(req.projectId, 85)
        print(f"Cutting {len(clips)} clips dengan face tracking...")
        q = req.quality.lower().replace(' ', '')
        if q not in QUALITY_PRESETS: q = '720p'
        q_cfg = QUALITY_PRESETS[q]
        print(f"Quality: {req.quality} -> {q_cfg['target_height']}p")

        for i, clip in enumerate(clips):
            start, end = clip.get("startSec", 0), clip.get("endSec", 0)
            duration = end - start
            if duration <= 0: print(f"Clip {i+1} skip (duration={duration})"); clip["clipPath"] = None; continue
            trimmed = os.path.join(project_clips_dir, f"clip_{i+1}_trimmed.mp4")
            out_path = os.path.join(project_clips_dir, f"clip_{i+1}.mp4")
            r = subprocess.run(["ffmpeg", "-ss", str(start), "-i", video_path, "-t", str(duration),
                "-c", "copy", "-map", "0:v", "-map", "0:a?", trimmed, "-y"], capture_output=True, text=True)
            if r.returncode != 0: print(f"Trim gagal: {r.stderr[:200]}"); clip["clipPath"] = None; continue
            try:
                reframe_clip(trimmed, out_path, target_height=q_cfg['target_height'], crf=q_cfg['crf'], preset=q_cfg['preset'])
                print(f"Clip {i+1}: face-aware reframe OK")
            except Exception as rf_err:
                print(f"Face tracking gagal: {rf_err}, fallback crop center")
                w = q_cfg['target_height'] * 9 // 16 // 2 * 2; h = q_cfg['target_height']
                r2 = subprocess.run(["ffmpeg", "-i", trimmed, "-vf",
                    f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:black",
                    "-c:v", "libx264", "-c:a", "aac", "-preset", q_cfg['preset'], "-crf", str(q_cfg['crf']),
                    out_path, "-y"], capture_output=True, text=True)
                if r2.returncode != 0: print(f"Fallback gagal: {r2.stderr[:200]}"); clip["clipPath"] = None; continue

                # --- MULAI PASANG WATERMARK ---
                wm_path = "watermark.png"
                if os.path.exists(wm_path) and os.path.exists(out_path):
                    print(f"Clip {i+1}: Menempelkan watermark logo...")
                    wm_out = out_path.replace(".mp4", "_wm.mp4")

                # Koordinat: Pojok Kanan Atas (W-w-30:30)
                subprocess.run([
                    "ffmpeg", "-i", out_path, "-i", wm_path,
                    "-filter_complex", "overlay=W-w-30:30",
                    "-c:v", "libx264", "-preset", "fast", "-c:a", "copy", wm_out, "-y"
                ], capture_output=True)

                if os.path.exists(wm_out):
                    os.replace(wm_out, out_path)
                # --- AKHIR PASANG WATERMARK ---

            if os.path.exists(trimmed): os.remove(trimmed)
            clip["clipPath"] = out_path
            clip["title"] = clip.get("title", f"Klip {i+1}")
            clip["transcript"] = clip.get("transcript", transcript_text[:200])
            clip["hook"] = clip.get("hook", ""); clip["tags"] = clip.get("tags", [])
            clip["platform"] = clip.get("platform", ["TikTok", "Reels", "Shorts"])
            update_progress(req.projectId, int(85 + ((i+1)/len(clips))*10))
            print(f"Clip {i+1} selesai: {out_path}")

        update_progress(req.projectId, 95)
        print("Uploading to R2...")
        for i, clip in enumerate(clips):
            if clip.get("clipPath") and os.path.exists(clip["clipPath"]):
                clip["storageUrl"] = upload_clip_to_r2(clip["clipPath"], req.projectId, f"clip_{i+1}.mp4")
            else: clip["storageUrl"] = None

        if os.path.exists(audio_path): os.remove(audio_path)
        print("Callback ke Next.js...")
        with httpx.Client() as c:
            cr = c.post("http://localhost:3000/api/clips/callback",
                json={"projectId": req.projectId, "transcript": transcript_text, "clips": clips}, timeout=10.0)
            print(f"Callback OK: {cr.status_code}")
    except Exception as e:
        print(f"ERROR:\n{traceback.format_exc()}")
        try:
            with httpx.Client() as c:
                c.post("http://localhost:3000/api/clips/callback",
                    json={"projectId": req.projectId, "error": str(e)}, timeout=5.0)
        except: pass

        print("Mulai bersih-bersih folder temporary...")
        output_dir = os.path.join("..", "public", "clips", req.projectId)
        if os.path.exists(output_dir):
           shutil.rmtree(output_dir)
           print(f"🧹 Folder klip {req.projectId} berhasil dihapus permanen!")

        if 'video_path' in locals() and os.path.exists(video_path):
            os.remove(video_path)
            print("🧹 Video mentah berhasil dihapus!")


@app.post("/process")
async def process_video(req: ProcessRequest):
    thread = threading.Thread(target=process_in_background, args=(req,))
    thread.start()
    return {"status": "accepted", "projectId": req.projectId, "message": "Processing in background"}
