"""
Fast Dataset Downloader: Pizza, Steak, Sushi (Mini Food Dataset)

This script downloads a tiny (~20MB) pre-organized dataset containing 3 classes:
- Pizza
- Steak
- Sushi

It is perfect for instantly testing the training pipeline without waiting hours!
"""

import os
import urllib.request
import zipfile
from pathlib import Path

DATASET_URL = "https://github.com/mrdbourke/pytorch-deep-learning/raw/main/data/pizza_steak_sushi.zip"
TARGET_DIR = Path("data/pizza_steak_sushi")
ZIP_PATH = Path("data/pizza_steak_sushi.zip")

def main():
    print(f"⬇️  Downloading tiny dataset from {DATASET_URL}...")
    
    # Ensure data directory exists
    TARGET_DIR.parent.mkdir(parents=True, exist_ok=True)
    
    # Download the zip file
    if not ZIP_PATH.exists():
        urllib.request.urlretrieve(DATASET_URL, ZIP_PATH)
        print("✅ Download complete!")
    else:
        print("✅ Zip file already exists.")

    print("📦 Extracting files into standard ImageFolder format...")
    # Extract
    with zipfile.ZipFile(ZIP_PATH, 'r') as zip_ref:
        zip_ref.extractall(TARGET_DIR)
    
    # Cleanup zip
    ZIP_PATH.unlink()
    
    print("\n🎉 Extraction complete! Structure:")
    for split in ["train", "test"]:
        split_dir = TARGET_DIR / split
        print(f"  📁 {split_dir}")
        for class_dir in sorted(split_dir.iterdir()):
            if class_dir.is_dir():
                print(f"      - {class_dir.name} ({len(list(class_dir.glob('*.jpg')))} images)")

    print("\n🚀 Try running the training pipeline right now:")
    print("uv run nutri-train --train-dir data/pizza_steak_sushi/train --val-dir data/pizza_steak_sushi/test --epochs 5")

if __name__ == "__main__":
    main()
