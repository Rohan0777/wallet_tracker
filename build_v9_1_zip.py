"""
Production Build & Release Packaging Script (v9.1 Final Production Release)

Generates clean crypto_discover_v9.1.zip containing:
- server.py (v9.1)
- address_utils.py (v9.1)
- multichain_tracker.py (v9.1)
- static/ (app.js v9.1, index.html v9.1)
- test_suite_v9_1.py
- build_v9_1_zip.py
- Dockerfile, .dockerignore, Procfile, requirements.txt, requirements-dev.txt, .env.example, ads.txt, start.bat, render.yaml, railway.json, setup_rpi.sh
- Release documents: Wakeup Crypto V9 0 Security Patch.md, Wakeup Crypto V9 1 Pre-Deploy Patch.md
- Excludes: data_cache/, archive_*/, __pycache__/, .git/, *.zip, *.bak, *.rej, *.orig, *.gdoc, *.docx
"""

import os
import zipfile

VERSION = "9.1"
ZIP_NAME = f"crypto_discover_v{VERSION}.zip"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

INCLUDE_FILES = [
    "server.py",
    "address_utils.py",
    "multichain_tracker.py",
    "test_suite_v9_1.py",
    "build_v9_1_zip.py",
    "Dockerfile",
    ".dockerignore",
    "Procfile",
    "render.yaml",
    "railway.json",
    "setup_rpi.sh",
    "requirements.txt",
    "requirements-dev.txt",
    ".env.example",
    "ads.txt",
    "start.bat",
    "Wakeup Crypto V9 0 Security Patch.md",
    "Wakeup Crypto V9 1 Pre-Deploy Patch.md",
]

INCLUDE_DIRS = [
    "static",
]

EXCLUDE_PATTERNS = [
    "__pycache__",
    ".pyc",
    ".tmp",
    ".bak",
    ".rej",
    ".orig",
    "archive_",
    "_v1_backup",
    "data_cache",
    ".git",
    ".env",
    ".gdoc",
    ".docx",
]


def should_exclude(rel_path: str) -> bool:
    norm = rel_path.replace("\\", "/")
    for p in EXCLUDE_PATTERNS:
        if p in norm:
            return True
    return False


def _add_root_files(zf: zipfile.ZipFile) -> int:
    added = 0
    missing_required = []
    for fname in INCLUDE_FILES:
        fpath = os.path.join(BASE_DIR, fname)
        if os.path.exists(fpath):
            zf.write(fpath, fname)
            added += 1
            print(f"  + {fname}")
        else:
            missing_required.append(fname)

    if missing_required:
        raise FileNotFoundError(
            f"Release build aborted! Critical files missing from root directory: {missing_required}"
        )
    return added


def _add_directory_files(zf: zipfile.ZipFile) -> int:
    added = 0
    for dname in INCLUDE_DIRS:
        dpath = os.path.join(BASE_DIR, dname)
        if os.path.exists(dpath):
            for root, _, files in os.walk(dpath):
                for f in files:
                    full_p = os.path.join(root, f)
                    rel_p = os.path.relpath(full_p, BASE_DIR)
                    if not should_exclude(rel_p):
                        zf.write(full_p, rel_p)
                        added += 1
                        print(f"  + {rel_p}")
    return added


def build_zip():
    target_zip = os.path.join(BASE_DIR, ZIP_NAME)
    print(f"Building {ZIP_NAME}...")

    total_files = 0
    with zipfile.ZipFile(target_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        total_files += _add_root_files(zf)
        total_files += _add_directory_files(zf)

    zip_size_kb = os.path.getsize(target_zip) / 1024
    print(f"[SUCCESS] Packaged {total_files} files into {ZIP_NAME} ({zip_size_kb:.1f} KB)")


if __name__ == "__main__":
    build_zip()
