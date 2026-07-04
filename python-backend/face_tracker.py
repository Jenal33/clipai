"""
face_tracker.py — OpenCV YuNet (FaceDetectorYN) untuk smart vertical reframe.

Menganalisis video landscape, mendeteksi posisi wajah utama sepanjang waktu,
lalu menghasilkan crop track horizontal yang sudah di-smooth.

Dependencies (sudah terinstall di Hermes Python):
    opencv-python (>= 5.0)
    numpy
"""

import cv2
import numpy as np
import os
from dataclasses import dataclass, field


MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")


@dataclass
class TrackConfig:
    sample_fps: float = 4.0          # berapa kali deteksi wajah per detik video
    min_detection_confidence: float = 0.7  # minimum confidence YuNet (0.0-1.0)
    ema_alpha: float = 0.15          # makin kecil makin halus/lambat pan, makin besar makin gesit
    dead_zone_px: int = 8            # abaikan jitter kecil di bawah nilai ini
    max_pan_speed_px_per_sec: float = 400.0  # batas kecepatan crop bergeser (anti whip-pan)
    hold_last_on_miss: bool = True   # kalau wajah hilang sesaat, tahan posisi terakhir (bukan snap ke tengah)
    model_path: str = ""             # path ke YuNet ONNX model. Kosong = cari otomatis


class _FaceDetector:
    """Singleton face detector (YuNet) — cached setelah dibuat pertama."""
    _detector = None
    _last_frame_size = None

    @classmethod
    def get(cls, model_path: str = "", input_size=(320, 320), score_threshold: float = 0.7):
        if cls._detector is None:
            # Cari model
            mp = model_path
            if not mp or not os.path.exists(mp):
                # Coba path default
                candidates = [
                    os.path.join(MODEL_DIR, "face_detection_yunet_2023mar.onnx"),
                    os.path.join(os.path.dirname(__file__), "yunet.onnx"),
                    os.path.join(os.getcwd(), "yunet.onnx"),
                ]
                for c in candidates:
                    if os.path.exists(c):
                        mp = c
                        break
            if not mp or not os.path.exists(mp):
                raise RuntimeError(
                    "YuNet ONNX model tidak ditemukan. "
                    "Download dari: https://github.com/opencv/opencv_zoo/blob/main/models/"
                    "face_detection_yunet/face_detection_yunet_2023mar.onnx"
                )
            cls._detector = cv2.FaceDetectorYN.create(
                model=mp,
                config="",
                input_size=input_size,
                score_threshold=score_threshold,
                nms_threshold=0.3,
                top_k=10,
            )
        # Update threshold every call (bisa beda tiap config)
        cls._detector.setScoreThreshold(score_threshold)
        return cls._detector

    @classmethod
    def reset(cls):
        cls._detector = None


def _largest_face_center(faces, frame_w, frame_h):
    """
    Dari hasil YuNet FaceDetectorYN (array nx14),
    ambil (cx, cy) piksel wajah terbesar, atau None kalau kosong.
    Format YuNet per baris: [x, y, w, h, x_re, y_re, x_le, y_le,
                              x_nose, y_nose, x_rm, y_rm, x_lm, y_lm, score?]
    (x, y, w, h) adalah bounding box dalam piksel.
    """
    if faces is None or len(faces) == 0:
        return None
    best = None
    best_area = -1
    for face in faces:
        x, y, w, h = face[:4].astype(float)
        area = w * h
        if area > best_area:
            best_area = area
            best = (x + w / 2, y + h / 2)  # center
    return best


def analyze_face_track(video_path: str, config: TrackConfig = TrackConfig()):
    """
    Sample video dan return raw track (belum di-smooth):
    list of (timestamp_sec, center_x_px_atau_None)
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Tidak bisa buka video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    sample_every_n = max(1, round(fps / config.sample_fps))

    # Buat detector dengan input size sesuai frame
    detector = _FaceDetector.get(
        model_path=config.model_path,
        input_size=(frame_w, frame_h),
        score_threshold=config.min_detection_confidence,
    )
    detector.setInputSize((frame_w, frame_h))

    raw_track = []

    frame_idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if frame_idx % sample_every_n == 0:
            _, faces = detector.detect(frame)
            center = _largest_face_center(faces, frame_w, frame_h)
            t = frame_idx / fps
            cx = center[0] if center else None
            raw_track.append((t, cx))
        frame_idx += 1

    cap.release()
    return raw_track, frame_w, frame_h, fps, total_frames


def smooth_track(raw_track, frame_w, config: TrackConfig = TrackConfig()):
    """
    Isi gap deteksi yang kosong, lalu EMA smoothing + dead zone + clamp kecepatan pan.
    Return list of (timestamp_sec, smoothed_center_x_px).
    """
    default_center = frame_w / 2

    # 1. Isi deteksi yang miss
    filled = []
    last_known = None
    for t, cx in raw_track:
        if cx is None:
            cx = last_known if (config.hold_last_on_miss and last_known is not None) else default_center
        else:
            last_known = cx
        filled.append((t, cx))

    if not filled:
        return []

    # 2. EMA smoothing + dead zone
    smoothed = []
    ema = filled[0][1]
    prev_t = filled[0][0]
    for t, cx in filled:
        if abs(cx - ema) < config.dead_zone_px:
            cx = ema  # jitter kecil, abaikan

        new_ema = config.ema_alpha * cx + (1 - config.ema_alpha) * ema

        # 3. Clamp kecepatan pan biar gak whip-pan pas wajah loncat posisi
        dt = max(t - prev_t, 1e-6)
        max_delta = config.max_pan_speed_px_per_sec * dt
        delta = float(np.clip(new_ema - ema, -max_delta, max_delta))
        ema = ema + delta

        smoothed.append((t, ema))
        prev_t = t

    return smoothed


def get_crop_track(video_path: str, target_aspect: float = 9 / 16, config=None):
    """
    Entry point utama. Return:
      crop_w, crop_h, fps, total_frames, track

    track = list of (timestamp_sec, crop_x_px) — crop_x adalah tepi kiri
    jendela crop (sudah di-clamp ke batas video), siap dipakai reframe.py.
    """
    if config is None:
        config = TrackConfig()

    raw_track, frame_w, frame_h, fps, total_frames = analyze_face_track(video_path, config)
    smoothed = smooth_track(raw_track, frame_w, config)

    crop_h = frame_h
    crop_w = int(round(crop_h * target_aspect))
    if crop_w > frame_w:
        # sumber sudah kesempitan buat target aspect — fallback full width
        crop_w = frame_w
        crop_h = int(round(crop_w / target_aspect))

    max_x = max(frame_w - crop_w, 0)

    track = []
    for t, cx in smoothed:
        x = cx - crop_w / 2
        x = float(np.clip(x, 0, max_x))
        track.append((t, x))

    return crop_w, crop_h, fps, total_frames, track
