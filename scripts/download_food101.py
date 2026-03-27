"""
Fast Dataset Downloader: Food-101 (101 Classes)

This script cleanly downloads the standard Food-101 dataset (~4.5 GB),
displaying a reliable progress bar directly within the terminal!

It then structures the 101,000 images seamlessly into `train` and `test`
folders perfectly formatted for our standard ViT ImageFolder pipeline. 
"""

import json
import logging
import shutil
from pathlib import Path

# Important: torchvision is required for the elegant downloader logic 
from torchvision.datasets import Food101

logging.basicConfig(level=logging.INFO, format="%(asctime)s │ %(levelname)-7s │ %(message)s")
logger = logging.getLogger("Food101_Downloader")

def organize_food101():
    root_dir = Path("data")
    food101_dir = root_dir / "food-101"
    
    logger.info("Initializing native torchvision downloader for Food-101 dataset...")
    # This automatically downloads, verifies, and extracts the 4.5 GB dataset with a GUI progress bar!
    _ = Food101(root=str(root_dir), download=True)
    
    logger.info("Download complete. Organizing images into ImageFolder structures...")
    
    meta_dir = food101_dir / "meta"
    images_dir = food101_dir / "images"
    
    target_train = food101_dir / "train"
    target_test = food101_dir / "test"
    target_train.mkdir(exist_ok=True)
    target_test.mkdir(exist_ok=True)
    
    # Read the split definitions provided natively by Food101
    with open(meta_dir / "train.json", "r") as f:
        train_meta = json.load(f)
        
    with open(meta_dir / "test.json", "r") as f:
        test_meta = json.load(f)
        
    def move_images(meta_dict, target_split_dir):
        for class_name, file_paths in meta_dict.items():
            class_target = target_split_dir / class_name
            class_target.mkdir(exist_ok=True)
            
            for path in file_paths:
                # Food101 file paths look like "class_name/image_id"
                src_img = images_dir / f"{path}.jpg"
                dst_img = class_target / f"{path.split('/')[-1]}.jpg"
                
                if src_img.exists() and not dst_img.exists():
                    shutil.move(str(src_img), str(dst_img))
                    
    logger.info("Moving 75,750 training representations...")
    move_images(train_meta, target_train)
    
    logger.info("Moving 25,250 validation representations...")
    move_images(test_meta, target_test)

    logger.info("Cleaning up original unorganized imagery...")
    if images_dir.exists() and not any(images_dir.iterdir()):
        images_dir.rmdir()
        
    logger.info("🎉 Dataset perfectly prepared!")
    logger.info(f"Target Train Dir: {target_train}")
    logger.info(f"Target Test Dir:  {target_test}")
    
if __name__ == "__main__":
    organize_food101()
