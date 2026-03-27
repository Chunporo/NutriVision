"""
NutriVision — Dataset Downloader Assistant

Google Drive restricts anonymous CLI downloads (like 'gdown') to folders with fewer than 50 files.
Because the FoodX-251 dataset contains over 120,000 images, standard CLI downloaders will fail.

This script assists you by automatically opening the precise Google Drive download 
links in your default web browser so you can download them securely and massively.
"""

import webbrowser
from textwrap import dedent

# Google Drive folder IDs
GDRIVE_FOLDERS = {
    "Train Set": "https://drive.google.com/drive/folders/1Dm1VfX1pr43-ldvmIUj4Ljj2X1mMIwjx",
    "Validation Set": "https://drive.google.com/drive/folders/1yyZv8HUMa0-S9EAp_nOOgOTMnGq0ZFU5",
    "Test Set": "https://drive.google.com/drive/folders/1-OYdq02m8SycM6-Hazk6vUj_2wNDzrOi"
}

def main():
    print(dedent("""\
        =========================================================
        🥗 NutriVision Dataset Assistant
        =========================================================
        Because the dataset contains over 120,000 images, Google 
        Drive blocks anonymous terminal downloaders like 'gdown'.
        
        To proceed, you must download the folders through your 
        browser. We are opening the 3 required tabs for you now!
        
        INSTRUCTIONS:
        1. In each tab, click the "Download" button at the top.
        2. Google Drive will zip the folders and download them.
        3. Extract the contents directly into: 
           `data/FoodX-251/<folder_name>`
        
        *Note: If you see "Sandbox: CanCreateUserNamespace()" 
        or "Failed to load module 'xapp-gtk3-module'" below, 
        these are harmless system logs from your web browser!*
        
        If the browser fails to open, simply CTRL+Click the links.
        =========================================================
    """))

    for name, url in GDRIVE_FOLDERS.items():
        print(f"Opening {name} link: {url}")
        webbrowser.open_new_tab(url)
        
    print("\nOnce extracted, you can begin training natively:")
    print("uv run nutri-train --train-dir data/FoodX-251/organized_train_set --val-dir data/FoodX-251/organized_val_set")

if __name__ == "__main__":
    main()
