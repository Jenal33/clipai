"""
reframe.py — apply crop track hasil face_tracker.py ke video, hasilkan
output vertical (atau aspect ratio apapun) dengan audio tetap utuh.

Pendekatan: baca video frame-by-frame pakai OpenCV, crop tiap frame sesuai
posisi wajah yang sudah di-interpolasi, lalu pipe raw frame ke FFmpeg buat
di-encode bareng audio dari file asli. Ini dipilih ketimbang FFmpeg
`sendcmd` filter karena jauh lebih predictable dan gampang di-debug.

Usage:
    from face_tracker import get_crop_track, TrackConfig
    from reframe import render_reframed_video

    crop_w, crop_h, fps, total_frames, track = get_crop_track("input.mp4")
    render_reframed_video(
        "input.mp4", "output_vertical.mp4",
        crop_w, crop_h, fps, total_frames, track,
    )
"""

import subprocess
import bisect
import cv2
import numpy as np


def _interp_x_at_frame(track, frame_idx, fps):
    """Interpolasi linear crop_x untuk frame index tertentu dari sampled track."""
    t = frame_idx / fps
    times = [pt[0] for pt in track]
    idx = bisect.bisect_left(times, t)

    if idx == 0:
        return track[0][1]
    if idx >= len(track):
        return track[-1][1]

    t0, x0 = track[idx - 1]
    t1, x1 = track[idx]
    if t1 == t0:
        return x1
    ratio = (t - t0) / (t1 - t0)
    return x0 + (x1 - x0) * ratio


def render_reframed_video(
    input_path: str,
    output_path: str,
    crop_w: int,
    crop_h: int,
    fps: float,
    total_frames: int,
    track,
    crf: int = 20,
    preset: str = "veryfast",
    target_height: int = 1920,      # tinggi output (auto-scale width 9:16)
):
    """
    Baca input_path frame-by-frame, crop tiap frame sesuai face track
    (interpolasi), lalu pipe hasilnya ke ffmpeg bareng audio asli.
    """
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise RuntimeError(f"Tidak bisa buka video: {input_path}")

    frame_h_src = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_w_src = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))

    target_w = int(round(target_height * 9 / 16))
    target_h = target_height
    if target_w % 2: target_w += 1
    if target_h % 2: target_h += 1

    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo", "-pix_fmt", "bgr24",
        "-s", f"{crop_w}x{crop_h}",
        "-r", str(fps),
        "-i", "pipe:0",
        "-i", input_path,
        "-filter_complex", f"[0:v]scale={target_w}:{target_h}:flags=lanczos[v]",
        "-map", "[v]",
        "-map", "1:a?",          # '?' = tetap jalan kalau source gak punya audio
        "-c:v", "libx264", "-preset", preset, "-crf", str(crf),
        "-threads", "0",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k",
        "-shortest",
        output_path,
    ]

    proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE)

    frame_idx = 0
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break

            x = _interp_x_at_frame(track, frame_idx, fps)
            x = int(round(np.clip(x, 0, max(frame_w_src - crop_w, 0))))
            y = max((frame_h_src - crop_h) // 2, 0)  # vertikal tetap full-height/center

            cropped = frame[y:y + crop_h, x:x + crop_w]

            # jaga-jaga kalau ada mismatch ukuran di edge case
            if cropped.shape[0] != crop_h or cropped.shape[1] != crop_w:
                cropped = cv2.resize(cropped, (crop_w, crop_h))

            proc.stdin.write(cropped.tobytes())
            frame_idx += 1
    finally:
        cap.release()
        proc.stdin.close()
        proc.wait()

    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg gagal render reframe, exit code {proc.returncode}")

    return output_path
