# NutriVision: Complete User Guide

This guide walks through every way to set up, run, and use NutriVision — from a first-time clone to running the mobile app against a live backend.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Installation](#2-installation)
3. [Running Everything — One Command](#3-running-everything--one-command)
4. [Running Services Manually](#4-running-services-manually)
5. [Mobile App Usage](#5-mobile-app-usage)
6. [Backend API Reference](#6-backend-api-reference)
7. [Gradio Web Interface](#7-gradio-web-interface)
8. [Dataset Download](#8-dataset-download)
9. [Training a Model](#9-training-a-model)
10. [Running Tests](#10-running-tests)
11. [Python Library Usage](#11-python-library-usage)
12. [Project Structure](#12-project-structure)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Git | any | For cloning and Detectron2 install |
| Python | 3.10+ | |
| Node.js | 18+ | For the mobile app |
| npm | 9+ | Bundled with Node.js |
| uv *(recommended)* | latest | Fast Python package manager |
| NVIDIA GPU + CUDA | optional | Strongly recommended for inference |

Install `uv`:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Install Node.js (if not present): https://nodejs.org

---

## 2. Installation

### Clone the repository

```bash
git clone https://github.com/your-username/NutriVision.git
cd nutri_vision
```

### Python environment

```bash
# Option A: uv (faster)
uv venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
uv pip install -r requirements.txt

# Option B: standard venv
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Detectron2 — required for ViT + Mask R-CNN pipeline mode

```bash
uv pip install 'git+https://github.com/facebookresearch/detectron2.git' --no-build-isolation
# or with pip:
# pip install 'git+https://github.com/facebookresearch/detectron2.git' --no-build-isolation
```

> **Note:** Skip Detectron2 if you only plan to use `vl` mode (Qwen3-VL). The `pipeline` and `both` modes require it.

### Mobile dependencies

```bash
cd mobile
npm install
cd ..
```

---

## 3. Running Everything — One Command

`start.sh` at the repository root starts both the FastAPI backend and the Expo mobile dev server in a single command.

```bash
./start.sh              # backend + QR code (scan with Expo Go)
./start.sh --android    # backend + open Android emulator
./start.sh --web        # backend + open browser preview
./start.sh --backend    # backend only, no mobile
./start.sh --stop       # stop all running NutriVision processes
./start.sh --help       # show usage
```

### What the script does

1. Detects your Python virtualenv (`.venv/`, `venv/`, or `backend/.venv/`)
2. Checks for required backend packages; installs from `requirements.txt` if missing
3. Frees port `8000` if already occupied
4. Starts `uvicorn` in the background and polls `/health` until it responds (up to 30 s)
5. Prints the correct API URL for emulator, physical device, and browser
6. Checks Node.js and npm; runs `npm install` on first run
7. Launches Expo with the chosen target
8. On `Ctrl+C`, gracefully stops backend and Expo

Backend logs are written to `/tmp/nutrivision_backend.log`.

---

## 4. Running Services Manually

### Backend (FastAPI)

```bash
# From repository root
source .venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

```bash
# From backend/ directory
cd backend
source ../.venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API docs: `http://localhost:8000/docs`

### Mobile (Expo)

```bash
cd mobile

npm run start     # Expo dev server — scan QR with Expo Go
npm run android   # Open in Android emulator
npm run ios       # Open in iOS simulator (requires macOS + Xcode)
npm run web       # Open in browser
```

### Gradio web interface

```bash
source .venv/bin/activate
python app.py
```

Open `http://localhost:7860`.

---

## 5. Mobile App Usage

### First launch

1. Start the backend (via `./start.sh` or manually).
2. Open the app. Tap **Settings** (gear icon, bottom tab or top-right).
3. Set the **API URL** for your target:

| Target | URL |
|---|---|
| Android emulator | `http://10.0.2.2:8000` |
| iOS simulator | `http://localhost:8000` |
| Physical device (same Wi-Fi) | `http://<your-machine-ip>:8000` |

4. Tap **Test Connection** to verify the backend is reachable.
5. Optionally set your **daily calorie goal**.

### Analysing a meal

1. From the **Home** screen, tap **Analyze Food**.
2. Choose **Camera** to capture a new photo, or **Gallery** to pick an existing image.
3. Tap **Analyze**. The app uploads the image to `/analyze/quick` and shows a progress indicator.
4. The **Results** screen displays detected foods, confidence scores, and calorie estimates.
5. Tap any item for the full **Details** screen (macros, weight, all nutrition fields).

### Meal history

- The **History** tab shows all past analyses, grouped by date.
- Tap any entry to view its full details.
- Swipe or long-press to delete a single entry.
- History is stored locally (AsyncStorage); up to 200 meals are kept (oldest pruned automatically).

### Settings

| Setting | Description |
|---|---|
| API URL | Backend server address (saved across restarts) |
| Daily calorie goal | Target kcal shown on the History summary |

---

## 6. Backend API Reference

Base URL: `http://localhost:8000` (default)

### `GET /health`

Returns the current status of the server.

**Response**
```json
{
  "status": "ok",
  "vl_model_loaded": false,
  "pipeline_loaded": false,
  "device": "cuda",
  "cuda_available": true,
  "uptime_seconds": 42.1
}
```

---

### `POST /analyze/quick`

Primary mobile endpoint. Runs Qwen3-VL inference only (fastest).

**Request** — `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `image` | file | JPEG, PNG, or WEBP. Max 20 MB, 8192 px. |

**Response**
```json
{
  "id": "uuid",
  "timestamp": "2026-03-25T10:00:00Z",
  "nutrition": {
    "calories": 450,
    "protein": 22,
    "carbohydrates": 60,
    "fat": 12,
    "items": [
      { "name": "rice", "calories": 200, "weight_grams": 150 }
    ]
  },
  "processing_time_ms": 4200
}
```

---

### `POST /analyze`

Full analysis with configurable mode.

**Query parameter**

| Param | Values | Default |
|---|---|---|
| `mode` | `vl` \| `pipeline` \| `both` | `vl` |

**Request** — `multipart/form-data` (same as quick)

**Response** (mode = `both`)
```json
{
  "id": "uuid",
  "timestamp": "2026-03-25T10:00:00Z",
  "mode": "both",
  "vl_result": { ... },
  "pipeline_result": {
    "food_name": "fried rice",
    "confidence": 0.91,
    "top_predictions": [...],
    "portions": [...],
    "total_weight_grams": 320,
    "total_calories_kcal": 510
  },
  "processing_time_ms": 18500
}
```

---

### Error responses

All errors return a consistent shape:

```json
{
  "error_code": "IMAGE_TOO_LARGE",
  "message": "Image exceeds the 20 MB size limit.",
  "detail": null,
  "timestamp": "2026-03-25T10:00:00Z"
}
```

| HTTP Status | Scenario |
|---|---|
| `400` | Empty or corrupt image |
| `413` | Image exceeds 20 MB |
| `422` | Missing required field / invalid mode |
| `503` | GPU out of memory — retry after a moment |
| `500` | Unexpected server error |

---

### Inference timing guide

| Mode | Typical latency | Notes |
|---|---|---|
| `vl` | 5–30 s | Default; fastest; no Detectron2 needed |
| `pipeline` | 10–60 s | ViT + Mask R-CNN; requires Detectron2 |
| `both` | 15–90 s | Runs both; useful for comparison |

All requests are serialised through a GPU mutex — only one inference runs at a time.

---

## 7. Gradio Web Interface

```bash
python app.py           # local only
python app.py --share   # generates a public share URL (Gradio tunnel)
```

Opens at `http://localhost:7860`.

The Gradio UI provides a side-by-side comparison of both inference modes. Upload a food photo and see VL output (JSON) and ViT/Mask R-CNN output (segmentation overlay + calorie breakdown) at the same time.

---

## 8. Dataset Download

NutriVision trains on **FoodX-251** (161K images across 251 food categories).

```bash
uv run python scripts/download_dataset.py
```

The script opens your browser to the Google Drive folder links (bypasses anonymous API rate limits). Download each folder and extract the contents into:

```
data/
└── FoodX-251/
    ├── 1Dm1VfX1pr43-ldvmIUj4Ljj2X1mMIwjx/   ← train split
    └── 1yyZv8HUMa0-S9EAp_nOOgOTMnGq0ZFU5/   ← val split
```

| Split | Images |
|---|---|
| Train | 120,216 |
| Validation | 12,170 |
| Test | 28,399 |

---

## 9. Training a Model

### Fine-tune ViT on FoodX-251

```bash
uv run nutri-train \
  --train-dir data/FoodX-251/1Dm1VfX1pr43-ldvmIUj4Ljj2X1mMIwjx \
  --val-dir   data/FoodX-251/1yyZv8HUMa0-S9EAp_nOOgOTMnGq0ZFU5 \
  --epochs 10 \
  --batch-size 64 \
  --lr 2e-5
```

All arguments are optional; reasonable defaults are applied from `nutri_vision/config.py`.

### Training outputs

All outputs go to `checkpoints/`:

| File | Description |
|---|---|
| `best_model/` | Saved model weights at best validation accuracy |
| `training_curves.png` | Loss and accuracy plotted per epoch |
| `TRAINING_REPORT.md` | Auto-generated report: convergence, metrics, recommendations |

### CLI predict

```bash
uv run nutri-predict --image path/to/food.jpg --model checkpoints/best_model
```

---

## 10. Running Tests

### Backend — pytest (22 tests)

```bash
cd backend
python -m pytest test_main.py -v
```

All ML inference is mocked so no GPU is required. Tests cover:

- `GET /health` response shape
- `POST /analyze/quick` — JPEG, PNG, missing file, empty file, GPU OOM, internal error
- `POST /analyze` — mode selection, invalid mode, missing file
- Image validation — oversize bytes, corrupt image, oversize dimensions
- `_parse_vl_response` — clean JSON, code fence, assistant prefix, invalid JSON
- Error response structure consistency
- CORS headers

### Mobile — Jest (~28 tests)

```bash
cd mobile
npm test            # run all tests
npm run typecheck   # TypeScript type check (no emit)
```

Tests cover formatting utilities: `formatCalories`, `formatGrams`, `formatConfidence`, `formatTime`, `formatDate`, `getTodayDate`, and `extractCalories` (handles all nutrition field name variants).

---

## 11. Python Library Usage

Import `nutri_vision` directly from any Python script (after activating the venv):

### Qwen3-VL inference

```python
from PIL import Image
from nutri_vision.vl import analyze_vl_image

image = Image.open("meal.jpg")
nutrition = analyze_vl_image(image)
print(nutrition)
# {"calories": 480, "protein": 24, "carbohydrates": 62, "fat": 14, ...}
```

### ViT + Mask R-CNN pipeline

```python
from nutri_vision.pipeline import NutriVisionPipeline

pipe = NutriVisionPipeline()
result = pipe.analyse("meal.jpg")

print(f"Food: {result.food_name}")
print(f"Weight: {result.total_weight_grams} g")
print(f"Calories: {result.total_calories_kcal} kcal")
# result.portions → list of segmented regions with per-item breakdowns
```

### Calorie database lookup

```python
from nutri_vision.calorie_db import CalorieDB

db = CalorieDB()
kcal_per_100g = db.lookup("spaghetti bolognese")
```

---

## 12. Project Structure

```
nutri_vision/
├── start.sh                    ← End-to-end launcher (backend + mobile)
├── app.py                      ← Gradio dual-mode web interface
├── inference.py                ← Standalone Qwen3-VL inference script
│
├── nutri_vision/               ← Core Python package
│   ├── config.py               ← Constants, paths, TrainConfig, PredictConfig
│   ├── vl.py                   ← Qwen3-VL model loading, inference, JSON parsing
│   ├── pipeline.py             ← ViT + Mask R-CNN end-to-end pipeline
│   ├── classifier.py           ← ViT food classifier wrapper
│   ├── segmentor.py            ← Mask R-CNN segmentation wrapper
│   ├── calorie_db.py           ← Fuzzy-match calorie CSV lookup
│   └── utils.py                ← Visualisation & IO helpers
│
├── backend/
│   ├── main.py                 ← FastAPI app (3 endpoints, GPU mutex, image validation)
│   ├── test_main.py            ← pytest suite (22 tests, all inference mocked)
│   └── requirements.txt        ← Extends root requirements.txt
│
├── mobile/
│   ├── app/                    ← expo-router file-based screens
│   │   ├── _layout.tsx         ← Root layout / app shell
│   │   ├── (tabs)/
│   │   │   ├── index.tsx       ← Home screen
│   │   │   └── history.tsx     ← Meal history
│   │   ├── camera.tsx          ← Camera / gallery capture + upload
│   │   ├── results.tsx         ← Analysis results display
│   │   ├── details.tsx         ← Full nutrition breakdown
│   │   └── settings.tsx        ← API URL + daily goal configuration
│   ├── src/
│   │   ├── services/api.ts     ← API client (fetch, AbortController timeouts)
│   │   ├── services/storage.ts ← AsyncStorage meal history (200-meal cap)
│   │   ├── utils/helpers.ts    ← Formatting utilities (calories, dates, etc.)
│   │   └── utils/theme.ts      ← Colour, spacing, typography tokens
│   └── __tests__/
│       └── helpers.test.ts     ← Jest unit tests
│
├── scripts/
│   ├── train.py                ← Training loop + report generation
│   ├── predict.py              ← CLI prediction utility
│   ├── download_dataset.py     ← FoodX-251 downloader
│   └── download_food101.py     ← Food-101 downloader
│
├── data/
│   ├── classes.txt             ← 251 class names
│   ├── food_calories.csv       ← Calorie density database
│   └── FoodX-251/              ← Dataset images (download separately)
│
├── docs/
│   └── USER_GUIDE.md           ← This file
│
├── assets/                     ← Images for README and documentation
├── checkpoints/                ← Trained model weights (gitignored)
├── pyproject.toml              ← Package metadata, CLI entry points, tool config
├── requirements.txt            ← Root Python dependencies
└── uv.lock                     ← Locked dependency versions (uv)
```

---

## 13. Troubleshooting

### Backend won't start

**`ModuleNotFoundError: No module named 'app'`**
You're running `uvicorn app:...` from the wrong directory. From the repository root use `uvicorn backend.main:app`; from `backend/` use `uvicorn main:app`.

**Port 8000 already in use**
`start.sh --stop` frees the port automatically. Or manually: `lsof -ti :8000 | xargs kill -9`

**Backend test `ImportError` on `_parse_vl_response`**
Fixed — the import alias was added to `backend/main.py`. Make sure you have the latest `main.py`.

---

### Mobile can't reach the backend

1. Confirm the backend is running: `curl http://localhost:8000/health`
2. Check the API URL in **Settings**:
   - Android emulator → `http://10.0.2.2:8000`
   - iOS simulator → `http://localhost:8000`
   - Physical device → `http://<your-machine-local-ip>:8000`
3. If on a physical device, ensure your phone and machine are on the same Wi-Fi network.
4. Check firewall rules are not blocking port `8000`.

---

### Inference is very slow

- The first request after backend start loads the model into memory — subsequent requests are faster.
- `vl` mode (5–30 s) is faster than `pipeline` mode (10–60 s).
- Without a GPU, inference will be significantly slower. The backend still works on CPU.
- Only one inference runs at a time (GPU mutex). Concurrent requests queue automatically.

---

### GPU / CUDA errors

**`RuntimeError: CUDA out of memory`**
The backend returns HTTP `503`. Wait a moment and retry. If persistent, reduce image resolution before uploading or restart the backend to flush GPU memory.

**Model loads on CPU instead of GPU**
Verify CUDA is available: `python -c "import torch; print(torch.cuda.is_available())"`. Check your CUDA toolkit and PyTorch versions match.

---

### Detectron2 install fails

Always pass `--no-build-isolation`:
```bash
uv pip install 'git+https://github.com/facebookresearch/detectron2.git' --no-build-isolation
```
Your local CUDA version must match your PyTorch CUDA version. Check with `nvcc --version` and `python -c "import torch; print(torch.version.cuda)"`.

---

### Mobile TypeScript errors

```bash
cd mobile && npm run typecheck
```

If type errors appear in `node_modules`, try deleting and reinstalling:
```bash
rm -rf mobile/node_modules && npm install --prefix mobile
```

---

*Built and maintained by aoi.*
