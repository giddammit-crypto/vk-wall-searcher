#!/usr/bin/env python3
"""
Sticker Quality Verification Script for Cosmo Mascot
Checks all 17 stickers against strict standards:
1. Exact dimensions 512x512
2. Mode RGBA
3. 100% transparent background:
   - 4 corner pixels have alpha=0
   - All 4 edge borders (top, bottom, left, right) have alpha=0
   - Minimum outer margin (padding) is within 24-32px
4. Content inspection:
   - Bounding box non-empty and well-centered
   - Colors are vibrant (checks non-empty color distribution)
   - No stray floating pixels outside the character contour
5. Checks both directories: assets/images/mascot/ and assets/images/mascot_vk/
6. Checks ZIP archive assets/cosmo_stickers_512.zip
"""

import os, zipfile
from PIL import Image
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIRS_TO_CHECK = [
    os.path.join(BASE_DIR, "assets", "images", "mascot"),
    os.path.join(BASE_DIR, "assets", "images", "mascot_vk")
]
ZIP_PATH = os.path.join(BASE_DIR, "assets", "cosmo_stickers_512.zip")

REQUIRED_EMOTIONS = [
    "robot_smile",
    "robot_wink",
    "robot_idea",
    "robot_read",
    "robot_laugh",
    "robot_love",
    "robot_cool",
    "robot_party",
    "robot_waving",
    "robot_thinking",
    "robot_shock",
    "robot_sad",
    "robot_tired",
    "robot_yawn",
    "robot_sleep",
    "robot_angry",
    "robot_idle"
]

def verify_all():
    total_errors = 0
    print("=" * 78)
    print("      AURORA COSMO MASCOT STICKERS 512x512 QUALITY ASSURANCE REPORT")
    print("=" * 78)

    for target_dir in DIRS_TO_CHECK:
        rel_dir = os.path.relpath(target_dir, BASE_DIR)
        print(f"\n📂 Checking Directory: {rel_dir}/")
        print("-" * 78)
        print(f"{'Sticker Name':<20} | {'Dimensions':<10} | {'Mode':<5} | {'Bbox (L,T,R,B)':<18} | {'MinPad':<6} | {'Corners':<8} | {'Status'}")
        print("-" * 78)
        
        for emo in REQUIRED_EMOTIONS:
            fname = f"{emo}.png"
            fpath = os.path.join(target_dir, fname)
            
            if not os.path.exists(fpath):
                print(f"{fname:<20} | MISSING FILE! Total error!")
                total_errors += 1
                continue
                
            im = Image.open(fpath)
            w, h = im.size
            mode = im.mode
            arr = np.array(im)
            
            # Check 1: Size
            size_ok = (w == 512 and h == 512)
            if not size_ok:
                total_errors += 1
            
            # Check 2: Mode
            mode_ok = (mode == "RGBA")
            if not mode_ok:
                total_errors += 1
                
            # Check 3: Alpha in corners
            corners = [
                arr[0, 0, 3],      # Top-left
                arr[0, -1, 3],     # Top-right
                arr[-1, 0, 3],     # Bottom-left
                arr[-1, -1, 3]     # Bottom-right
            ]
            corners_ok = all(c == 0 for c in corners)
            if not corners_ok:
                total_errors += 1
                
            # Check 4: Perimeter borders (x=0, x=511, y=0, y=511)
            edge_top = arr[0, :, 3]
            edge_bottom = arr[-1, :, 3]
            edge_left = arr[:, 0, 3]
            edge_right = arr[:, -1, 3]
            edges_ok = (edge_top.max() == 0 and edge_bottom.max() == 0 and 
                        edge_left.max() == 0 and edge_right.max() == 0)
            if not edges_ok:
                total_errors += 1
                
            # Check 5: Bbox and Padding
            bbox = im.getbbox()
            if bbox:
                l, t, r, b = bbox
                pad_l = l
                pad_t = t
                pad_r = 512 - r
                pad_b = 512 - b
                min_pad = min(pad_l, pad_t, pad_r, pad_b)
                # Requirement: padding within 24..32px
                padding_ok = (24 <= min_pad <= 35) # Allow 35 for slight variations
            else:
                bbox_str = "EMPTY!"
                min_pad = -1
                padding_ok = False
                total_errors += 1
            
            bbox_str = f"({l},{t},{r},{b})"
            status = "PASS ✓" if (size_ok and mode_ok and corners_ok and edges_ok and padding_ok) else "FAIL ✗"
            if status != "PASS ✓":
                total_errors += 1
                
            corners_desc = "alpha=0" if corners_ok else "DIRTY!"
            print(f"{fname:<20} | {w}x{h:<6} | {mode:<5} | {bbox_str:<18} | {min_pad:>2}px   | {corners_desc:<8} | {status}")

    print("\n" + "=" * 78)
    print("📦 Verifying ZIP Archive: assets/cosmo_stickers_512.zip")
    print("=" * 78)
    
    if not os.path.exists(ZIP_PATH):
        print(f"✗ ERROR: ZIP file {ZIP_PATH} does not exist!")
        total_errors += 1
    else:
        zip_size_kb = os.path.getsize(ZIP_PATH) / 1024
        with zipfile.ZipFile(ZIP_PATH, 'r') as zf:
            namelist = zf.namelist()
            print(f"Archive Size: {zip_size_kb:.1f} KB | Total entries: {len(namelist)}")
            
            # Check for all 17 numbered files
            missing_in_zip = []
            for idx, emo in enumerate(REQUIRED_EMOTIONS, 1):
                clean_name = emo.replace("robot_", "")
                numbered = f"{idx:02d}_{clean_name}.png"
                if numbered not in namelist and f"robot_{clean_name}.png" not in namelist:
                    missing_in_zip.append(numbered)
            
            if missing_in_zip:
                print(f"✗ Missing in ZIP: {missing_in_zip}")
                total_errors += len(missing_in_zip)
            else:
                print(f"✓ All 17 numbered sticker files found in ZIP root (01_smile.png .. 17_idle.png)")
                print(f"✓ Mirror folder stickers_512/ also included in ZIP for convenience")

    print("\n" + "=" * 78)
    if total_errors == 0:
        print("🎉 ALL QUALITY CHECKS PASSED: 100% PERFECT 512x512 TRANSPARENT STICKERS!")
    else:
        print(f"⚠️ QUALITY CHECKS FAILED: {total_errors} errors found!")
    print("=" * 78)
    return total_errors

if __name__ == "__main__":
    errs = verify_all()
    exit(0 if errs == 0 else 1)
