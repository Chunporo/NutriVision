"""
NutriVision FastAPI Backend — REST API for the mobile app.

Wraps the existing nutri_vision inference pipelines and exposes them as
JSON endpoints. Supports both the Qwen3-VL model and the ViT+Mask R-CNN
pipeline.

Launch:
    cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

from __future__ import annotations

import asyncio
import io
import json
import logging
import sys
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path

import torch
from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Ensure the parent project is importable
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from nutri_vision.vl import analyze_vl_image, parse_vl_response as _parse_vl_response, vl_model_loaded

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-28s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MAX_IMAGE_BYTES = 20 * 1024 * 1024  # 20 MB
MAX_IMAGE_DIMENSION = 8192  # pixels
INFERENCE_TIMEOUT_SECONDS = 180  # 3 minutes


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class AnalysisMode(str, Enum):
    """Supported analysis modes."""
    VL = "vl"
    PIPELINE = "pipeline"
    BOTH = "both"


class ErrorResponse(BaseModel):
    """Structured error returned by all error paths."""
    error_code: str
    message: str
    detail: str | None = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PredictionItem(BaseModel):
    class_name: str
    confidence: float


class PortionItem(BaseModel):
    portion_index: int
    weight_grams: float
    calories_kcal: float
    bbox: list[float]


class PipelineAnalysisResult(BaseModel):
    """Response from the ViT + Mask R-CNN pipeline."""
    food_name: str
    food_index: int
    classification_confidence: float
    top_predictions: list[PredictionItem]
    portions: list[PortionItem]
    total_weight_grams: float
    total_calories_kcal: float
    calories_per_gram: float


class AnalysisResponse(BaseModel):
    """Unified response combining both analysis modes."""
    id: str = Field(description="Unique analysis ID")
    timestamp: str = Field(description="ISO 8601 timestamp")
    mode: str = Field(description="Analysis mode used")
    vl_result: dict | None = Field(default=None, description="Qwen3-VL nutritional JSON")
    pipeline_result: PipelineAnalysisResult | None = Field(
        default=None, description="ViT + Mask R-CNN result"
    )
    processing_time_ms: float = Field(description="Inference time in milliseconds")


class QuickAnalysisResponse(BaseModel):
    """Response from the quick VL-only endpoint."""
    id: str
    timestamp: str
    nutrition: dict
    processing_time_ms: float


class HealthResponse(BaseModel):
    status: str
    models_loaded: dict[str, bool]
    device: str
    cuda_available: bool
    uptime_seconds: float


# ---------------------------------------------------------------------------
# Model state (lazy-loaded singletons) + GPU lock
# ---------------------------------------------------------------------------
_pipeline = None
_start_time: float = 0.0
_gpu_lock = asyncio.Lock()


def _load_pipeline():
    """Load the ViT + Mask R-CNN pipeline (lazy, first use)."""
    global _pipeline

    if _pipeline is not None:
        return _pipeline

    try:
        from nutri_vision.config import PredictConfig
        from nutri_vision.pipeline import NutriVisionPipeline

        logger.info("Loading ViT + Mask R-CNN pipeline...")
        _pipeline = NutriVisionPipeline(config=PredictConfig())
        logger.info("Pipeline ready")
        return _pipeline
    except Exception:
        logger.exception("Failed to load pipeline")
        raise


# ---------------------------------------------------------------------------
# Image validation helper
# ---------------------------------------------------------------------------
async def _read_and_validate_image(upload: UploadFile) -> Image.Image:
    """Read, validate size/dimensions, and return a PIL RGB image."""
    contents = await upload.read()

    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Image too large ({len(contents) // (1024 * 1024)} MB). Max {MAX_IMAGE_BYTES // (1024 * 1024)} MB.",
        )

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    try:
        pil_image = Image.open(io.BytesIO(contents))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Cannot decode image: {exc}")

    # Validate format
    if pil_image.format and pil_image.format.upper() not in ("JPEG", "JPG", "PNG", "WEBP"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{pil_image.format}'. Use JPEG, PNG, or WEBP.",
        )

    # Validate dimensions
    w, h = pil_image.size
    if w > MAX_IMAGE_DIMENSION or h > MAX_IMAGE_DIMENSION:
        raise HTTPException(
            status_code=400,
            detail=f"Image dimensions {w}x{h} exceed max {MAX_IMAGE_DIMENSION}px.",
        )

    return pil_image.convert("RGB")


# ---------------------------------------------------------------------------
# Analysis functions (synchronous — run in thread pool)
# ---------------------------------------------------------------------------
def _analyze_vl(image: Image.Image) -> dict:
    """Run the Qwen3-VL + LoRA analysis."""
    try:
        return analyze_vl_image(image)
    except torch.cuda.OutOfMemoryError:
        torch.cuda.empty_cache()
        raise RuntimeError("GPU out of memory — try again shortly")
    except RuntimeError as e:
        if "out of memory" in str(e).lower():
            torch.cuda.empty_cache()
            raise RuntimeError("GPU out of memory — try again shortly")
        raise


def _analyze_pipeline(image: Image.Image) -> PipelineAnalysisResult:
    """Run the ViT + Mask R-CNN pipeline analysis."""
    pipeline = _load_pipeline()

    # Let the pipeline handle BGR conversion internally
    try:
        result = pipeline.analyse_image(image, None)
    except torch.cuda.OutOfMemoryError:
        torch.cuda.empty_cache()
        raise RuntimeError("GPU out of memory — try again shortly")
    except RuntimeError as e:
        if "out of memory" in str(e).lower():
            torch.cuda.empty_cache()
            raise RuntimeError("GPU out of memory — try again shortly")
        raise

    return PipelineAnalysisResult(
        food_name=result.food_name,
        food_index=result.food_index,
        classification_confidence=result.classification_confidence,
        top_predictions=[
            PredictionItem(class_name=p.class_name, confidence=p.confidence)
            for p in result.top_k_predictions
        ],
        portions=[
            PortionItem(
                portion_index=p.portion_index,
                weight_grams=p.weight_grams,
                calories_kcal=p.calories_kcal,
                bbox=list(p.bbox),
            )
            for p in result.portions
        ],
        total_weight_grams=result.total_weight_grams,
        total_calories_kcal=result.total_calories_kcal,
        calories_per_gram=result.calories_per_gram,
    )


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _start_time
    _start_time = time.time()
    logger.info("NutriVision API starting up...")
    yield
    logger.info("NutriVision API shutting down...")


app = FastAPI(
    title="NutriVision API",
    description="REST API for food recognition and nutritional analysis",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Open for mobile dev; restrict in production
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Accept"],
)


# ---------------------------------------------------------------------------
# Global error handler — consistent JSON errors
# ---------------------------------------------------------------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error_code=f"HTTP_{exc.status_code}",
            message=str(exc.detail),
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error_code="INTERNAL_ERROR",
            message="An unexpected error occurred.",
            detail=str(exc),
        ).model_dump(),
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health", response_model=HealthResponse, tags=["status"])
async def health_check():
    """Check API and model status."""
    return HealthResponse(
        status="ok",
        models_loaded={
            "vl_model": vl_model_loaded(),
            "pipeline": _pipeline is not None,
        },
        device="cuda" if torch.cuda.is_available() else "cpu",
        cuda_available=torch.cuda.is_available(),
        uptime_seconds=round(time.time() - _start_time, 1),
    )


@app.post(
    "/analyze",
    response_model=AnalysisResponse,
    tags=["analysis"],
    responses={
        400: {"model": ErrorResponse, "description": "Invalid image or parameters"},
        413: {"model": ErrorResponse, "description": "Image too large"},
        503: {"model": ErrorResponse, "description": "GPU out of memory"},
        504: {"model": ErrorResponse, "description": "Analysis timeout"},
    },
)
async def analyze_food(
    image: UploadFile = File(..., description="Food image (JPEG/PNG/WEBP, max 20 MB)"),
    mode: AnalysisMode = Query(
        default=AnalysisMode.VL,
        description="Analysis mode: 'vl' (Qwen3-VL), 'pipeline' (ViT+MaskRCNN), or 'both'",
    ),
):
    """Analyze a food image and return nutritional information.

    Upload a food photo and receive:
    - **vl mode** (~5-30s): Detailed nutritional JSON from Qwen3-VL model
    - **pipeline mode** (~10-60s): Classification + segmentation + calorie estimation
    - **both mode** (~15-90s): Results from both models
    """
    pil_image = await _read_and_validate_image(image)

    analysis_id = str(uuid.uuid4())
    start = time.time()
    vl_result = None
    pipeline_result = None

    try:
        async with _gpu_lock:
            result_future = asyncio.get_event_loop().run_in_executor(
                None, _run_analysis, pil_image, mode
            )
            vl_result, pipeline_result = await asyncio.wait_for(
                result_future, timeout=INFERENCE_TIMEOUT_SECONDS
            )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Analysis timed out. Please try a smaller image.")
    except RuntimeError as exc:
        if "out of memory" in str(exc).lower():
            raise HTTPException(status_code=503, detail=str(exc))
        logger.exception("Analysis failed")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Analysis failed")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")

    elapsed_ms = round((time.time() - start) * 1000, 1)

    return AnalysisResponse(
        id=analysis_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
        mode=mode.value,
        vl_result=vl_result,
        pipeline_result=pipeline_result,
        processing_time_ms=elapsed_ms,
    )


@app.post(
    "/analyze/quick",
    response_model=QuickAnalysisResponse,
    tags=["analysis"],
    responses={
        400: {"model": ErrorResponse, "description": "Invalid image"},
        413: {"model": ErrorResponse, "description": "Image too large"},
        503: {"model": ErrorResponse, "description": "GPU out of memory"},
        504: {"model": ErrorResponse, "description": "Analysis timeout"},
    },
)
async def analyze_quick(
    image: UploadFile = File(..., description="Food image (JPEG/PNG/WEBP, max 20 MB)"),
):
    """Quick analysis using VL model only — optimised for mobile.

    Fastest endpoint. Returns nutritional JSON from Qwen3-VL in ~5-30s.
    """
    pil_image = await _read_and_validate_image(image)
    start = time.time()

    try:
        async with _gpu_lock:
            result_future = asyncio.get_event_loop().run_in_executor(
                None, _analyze_vl, pil_image
            )
            result = await asyncio.wait_for(
                result_future, timeout=INFERENCE_TIMEOUT_SECONDS
            )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Analysis timed out.")
    except RuntimeError as exc:
        if "out of memory" in str(exc).lower():
            raise HTTPException(status_code=503, detail=str(exc))
        logger.exception("Quick analysis failed")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Quick analysis failed")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")

    elapsed_ms = round((time.time() - start) * 1000, 1)
    logger.info(
        "Quick analysis complete (%.0f ms) — VL output: %s",
        elapsed_ms,
        json.dumps(result, ensure_ascii=False)[:500],  # log up to 500 chars
    )

    return QuickAnalysisResponse(
        id=str(uuid.uuid4()),
        timestamp=datetime.now(timezone.utc).isoformat(),
        nutrition=result,
        processing_time_ms=elapsed_ms,
    )


def _run_analysis(
    image: Image.Image, mode: AnalysisMode
) -> tuple[dict | None, PipelineAnalysisResult | None]:
    """Run analysis synchronously (called from thread pool)."""
    vl_result = None
    pipeline_result = None

    if mode in (AnalysisMode.VL, AnalysisMode.BOTH):
        vl_result = _analyze_vl(image)

    if mode in (AnalysisMode.PIPELINE, AnalysisMode.BOTH):
        pipeline_result = _analyze_pipeline(image)

    return vl_result, pipeline_result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
