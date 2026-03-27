# NutriVision: Food Recognition and Calorie Estimation

**Product Owner**: aoi
**Maintained by**: aoi

![Project Image](assets/report_poster.png)

## About the Project

NutriVision is an end-to-end AI system that identifies food items, estimates portion sizes, and calculates caloric content from a single photo. It ships as three integrated layers: a Python inference library, a FastAPI backend, and an Expo/React Native mobile app.

Two inference approaches are supported:

| Approach | Model | Speed | Output |
|---|---|---|---|
| **ViT + Mask R-CNN** | ViT-Base-Patch16-224 + ResNet-50 FPN | 10–60 s | Pixel-level segmentation + calorie DB lookup |
| **Qwen3-VL 2B + LoRA** | Qwen3-VL-2B-Instruct fine-tuned | 5–30 s | Direct JSON nutritional breakdown |

![About](assets/about.png)

---

## Quick Start — One Command

```bash
./start.sh            # backend + Expo dev server (scan QR with Expo Go)
./start.sh --android  # backend + open Android emulator
./start.sh --web      # backend + open browser preview
./start.sh --backend  # backend only
./start.sh --stop     # stop all running services
```

`start.sh` handles virtualenv detection, dependency checks, port cleanup, backend health polling, npm install, and graceful shutdown automatically.

---

## Manual Setup

### Python Environment

```bash
# Option A: uv (recommended — faster)
uv venv && source .venv/bin/activate
uv pip install -r requirements.txt

# Option B: standard venv
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### Detectron2 (required for ViT + Mask R-CNN pipeline mode)

```bash
uv pip install 'git+https://github.com/facebookresearch/detectron2.git' --no-build-isolation
# or with pip:
# pip install 'git+https://github.com/facebookresearch/detectron2.git' --no-build-isolation
```

---

## Running the Backend API (FastAPI)

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

API docs auto-generated at `http://localhost:8000/docs`

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Model status, device, CUDA availability, uptime |
| `POST` | `/analyze/quick` | VL-only analysis — primary mobile endpoint |
| `POST` | `/analyze` | Full analysis with `?mode=vl\|pipeline\|both` |

Image limits: 20 MB max, 8192 px max dimension, JPEG/PNG/WEBP only.

---

## Running the Mobile App (Expo)

```bash
cd mobile
npm install
npm run start     # QR code — scan with Expo Go on your phone
npm run android   # Android emulator
npm run web       # Browser preview
```

**API URL configuration** (open Settings screen in the app):

| Target | URL |
|---|---|
| Android emulator | `http://10.0.2.2:8000` |
| iOS simulator | `http://localhost:8000` |
| Physical device | `http://<your-local-ip>:8000` |

---

## Running the Gradio Web Interface

```bash
source .venv/bin/activate
python app.py          # local
python app.py --share  # public Gradio link
```

Default: `http://localhost:7860`

---

## Dataset

```bash
# Download FoodX-251 (opens browser to Google Drive folder)
uv run python scripts/download_dataset.py
```

Extract into `data/FoodX-251/`.

| Split | Images |
|---|---|
| Train | 120,216 |
| Validation | 12,170 |
| Test | 28,399 |

---

## Training

```bash
uv run nutri-train \
  --train-dir data/FoodX-251/1Dm1VfX1pr43-ldvmIUj4Ljj2X1mMIwjx \
  --val-dir   data/FoodX-251/1yyZv8HUMa0-S9EAp_nOOgOTMnGq0ZFU5 \
  --epochs 10 --batch-size 64 --lr 2e-5
```

Outputs written to `checkpoints/`:

| File | Description |
|---|---|
| `best_model/` | Best-accuracy model weights |
| `training_curves.png` | Loss + accuracy plots per epoch |
| `TRAINING_REPORT.md` | Auto-generated diagnostic report |

---

## Testing

```bash
# Backend (pytest)
cd backend
python -m pytest test_main.py -v   # 22 tests, all ML inference mocked

# Mobile (Jest)
cd mobile
npm test                            # ~28 unit tests for utility functions
npm run typecheck                   # TypeScript type check
```

---

## Project Structure

```
nutri_vision/
├── start.sh                    ← One-command end-to-end launcher
├── app.py                      ← Gradio dual-mode web interface
├── inference.py                ← Standalone Qwen3-VL inference script
├── nutri_vision/               ← Core Python package
│   ├── config.py               ← Constants, paths, dataclass configs
│   ├── vl.py                   ← Qwen3-VL model loading + inference
│   ├── pipeline.py             ← ViT + Mask R-CNN end-to-end pipeline
│   ├── classifier.py           ← ViT food classifier wrapper
│   ├── segmentor.py            ← Mask R-CNN segmentation wrapper
│   ├── calorie_db.py           ← Fuzzy-matching calorie CSV lookup
│   └── utils.py                ← Visualisation & IO helpers
├── backend/
│   ├── main.py                 ← FastAPI REST API (mobile backend)
│   ├── test_main.py            ← pytest test suite (22 tests)
│   └── requirements.txt        ← Backend-specific dependencies
├── mobile/                     ← Expo React Native app
│   ├── app/                    ← expo-router screens
│   │   ├── (tabs)/index.tsx    ← Home screen
│   │   ├── (tabs)/history.tsx  ← Meal history
│   │   ├── camera.tsx          ← Camera / gallery capture
│   │   ├── results.tsx         ← Analysis results
│   │   ├── details.tsx         ← Full nutrition breakdown
│   │   └── settings.tsx        ← API URL + calorie goal settings
│   ├── src/services/api.ts     ← API client (fetch + timeout)
│   ├── src/services/storage.ts ← AsyncStorage meal history
│   └── __tests__/              ← Jest unit tests
├── scripts/
│   ├── train.py                ← PyTorch training loop
│   ├── predict.py              ← CLI prediction utility
│   └── download_dataset.py     ← FoodX-251 dataset downloader
├── data/
│   ├── classes.txt             ← 251 food class names
│   ├── food_calories.csv       ← Calorie density database
│   └── FoodX-251/              ← Dataset (download separately)
├── docs/
│   └── USER_GUIDE.md           ← Full setup and usage guide
├── pyproject.toml              ← Python package config + CLI entry points
└── requirements.txt            ← Python dependencies
```

---

## Results

| Metric | Value |
|---|---|
| Top-3 Classification Accuracy | **88%** |
| Segmentation IoU | > 75% (most classes) |
| End-to-end latency | ~2–3 s |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Mobile | React Native 0.83.2 · Expo 55 · TypeScript 5.9 |
| Backend | FastAPI · Uvicorn · Pydantic v2 · Python 3.10+ |
| Web UI | Gradio 4.0+ |
| Classification | PyTorch 2.1+ · HuggingFace Transformers · ViT-Base-Patch16-224 |
| Segmentation | Detectron2 · Mask R-CNN (ResNet-50 + FPN) |
| VLM | Qwen3-VL-2B-Instruct · PEFT LoRA |
| Package manager | uv (Python) · npm (Node) |

---

## Comparison

| App | Strengths | Limitations |
|---|---|---|
| Lose It! | Weight-loss goal tracking | No image-based prediction |
| Calorie Mama | Automatic food classification | Requires manual weight input |
| MyFitnessPal | Detailed nutrition breakdown | No food recognition from images |
| **NutriVision** | **Fully automatic — photo in, kcal out** | Pixel-to-gram calibration is approximate |

---

## Troubleshooting

**`ModuleNotFoundError: No module named 'app'` when starting backend**
Run from repository root: `uvicorn backend.main:app ...`
Or from `backend/`: `uvicorn main:app ...`

**Mobile app cannot reach the backend**
Verify the backend is running on port `8000`. Open the app Settings screen and set the correct API URL for your target (emulator vs physical device).

**Backend test suite `ImportError`**
Ensure you're running `python -m pytest` from `backend/` using an environment that has both `fastapi` and the root `nutri_vision` package on `sys.path`.

**Detectron2 build failure**
Always pass `--no-build-isolation` when installing Detectron2 with `uv` or `pip`. Your local CUDA toolkit version must match the PyTorch CUDA version.

---

## Contributing

Pull requests and issues are welcome.

## Attribution

Built and maintained by aoi. Based on prior open-source work in food recognition and nutrition estimation.
Please keep the original license notice in [LICENSE](LICENSE) for redistribution.

---

<sub><sup>Built and maintained by aoi</sup></sub>
