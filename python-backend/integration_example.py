# integration_example.py
# Contoh integrasi ke pipeline main.py yang sudah ada.
# Ganti step "crop center" kamu dengan blok ini.

from face_tracker import get_crop_track, TrackConfig
from reframe import render_reframed_video


def reframe_clip(clip_input_path: str, clip_output_path: str, target_height: int = 1920, crf: int = 20, preset: str = "veryfast"):
    """
    Dipanggil di step RENDERING, per-clip, setelah FFmpeg trim
    start/end tapi sebelum upload ke R2.
    """
    config = TrackConfig(
        sample_fps=2.0,       # cukup 2 fps, interpolasi bikin mulus
        ema_alpha=0.15,       # naikkan dikit (0.2-0.3) kalau pan kerasa lambat/lag
        dead_zone_px=8,
    )

    crop_w, crop_h, fps, total_frames, track = get_crop_track(
        clip_input_path,
        target_aspect=9 / 16,   # sesuaikan kalau platform butuh rasio lain
        config=config,
    )

    render_reframed_video(
        clip_input_path,
        clip_output_path,
        crop_w, crop_h, fps, total_frames, track,
        target_height=target_height,
        crf=crf,
        preset=preset,
    )

    return clip_output_path
