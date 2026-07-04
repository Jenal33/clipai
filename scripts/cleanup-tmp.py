#!/usr/bin/env python3
"""
Deletes files in tmp/ older than 24 hours.
Intended to run as a cron job, e.g.:
  0 * * * * /usr/bin/python3 /home/je3393/clipai/scripts/cleanup-tmp.py >> /home/je3393/clipai/logs/cleanup.log 2>&1
"""
import os
import sys
import time

MAX_AGE_HOURS = 24
TMP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tmp")


def cleanup(tmp_dir: str, max_age_hours: int) -> None:
    if not os.path.isdir(tmp_dir):
        print(f"[cleanup-tmp] tmp dir not found: {tmp_dir}")
        return

    cutoff = time.time() - max_age_hours * 3600
    deleted, skipped, freed_bytes = 0, 0, 0

    for root, dirs, files in os.walk(tmp_dir, topdown=False):
        for fname in files:
            fpath = os.path.join(root, fname)
            try:
                stat = os.stat(fpath)
            except FileNotFoundError:
                continue

            if stat.st_mtime < cutoff:
                try:
                    freed_bytes += stat.st_size
                    os.remove(fpath)
                    deleted += 1
                except OSError as e:
                    print(f"[cleanup-tmp] failed to delete {fpath}: {e}")
            else:
                skipped += 1

        # Remove now-empty directories (but never the tmp root itself)
        if root != tmp_dir and not os.listdir(root):
            try:
                os.rmdir(root)
            except OSError:
                pass

    print(
        f"[cleanup-tmp] done. deleted={deleted} skipped={skipped} "
        f"freed={freed_bytes / 1024 / 1024:.2f}MB at {time.strftime('%Y-%m-%d %H:%M:%S')}"
    )


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else TMP_DIR
    cleanup(target, MAX_AGE_HOURS)
