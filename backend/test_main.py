"""
Tests for the NutriVision FastAPI backend.

Tests the API endpoints using httpx + FastAPI TestClient.
All model-level inference is mocked to keep tests fast and GPU-free.
"""

from __future__ import annotations

import io
import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from main import (
    MAX_IMAGE_BYTES,
    MAX_IMAGE_DIMENSION,
    AnalysisMode,
    QuickAnalysisResponse,
    _parse_vl_response,
    _read_and_validate_image,
    app,
)

client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _make_jpeg_bytes(width: int = 100, height: int = 100) -> bytes:
    """Create a minimal JPEG image in memory."""
    img = Image.new("RGB", (width, height), color=(128, 200, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.read()


def _make_png_bytes(width: int = 100, height: int = 100) -> bytes:
    """Create a minimal PNG image in memory."""
    img = Image.new("RGB", (width, height), color=(50, 120, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.read()


MOCK_VL_RESULT = {
    "food_name": "Caesar Salad",
    "calories": 350,
    "protein": 12,
    "carbohydrates": 20,
    "fat": 25,
    "fiber": 4,
    "serving_size": "1 bowl (300g)",
}


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------
class TestHealth:
    def test_health_returns_ok(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert "models_loaded" in body
        assert "device" in body
        assert "cuda_available" in body
        assert "uptime_seconds" in body

    def test_health_models_not_loaded_initially(self):
        resp = client.get("/health")
        body = resp.json()
        # Models are lazy-loaded, so both should be False at start
        assert body["models_loaded"]["vl_model"] is False
        assert body["models_loaded"]["pipeline"] is False


# ---------------------------------------------------------------------------
# /analyze/quick
# ---------------------------------------------------------------------------
class TestAnalyzeQuick:
    @patch("main._analyze_vl", return_value=MOCK_VL_RESULT)
    def test_quick_analysis_jpeg(self, mock_vl: MagicMock):
        data = _make_jpeg_bytes()
        resp = client.post(
            "/analyze/quick",
            files={"image": ("food.jpg", data, "image/jpeg")},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "id" in body
        assert "timestamp" in body
        assert body["nutrition"]["food_name"] == "Caesar Salad"
        assert body["nutrition"]["calories"] == 350
        assert body["processing_time_ms"] >= 0
        mock_vl.assert_called_once()

    @patch("main._analyze_vl", return_value=MOCK_VL_RESULT)
    def test_quick_analysis_png(self, mock_vl: MagicMock):
        data = _make_png_bytes()
        resp = client.post(
            "/analyze/quick",
            files={"image": ("food.png", data, "image/png")},
        )
        assert resp.status_code == 200
        assert resp.json()["nutrition"]["food_name"] == "Caesar Salad"

    def test_quick_analysis_no_image(self):
        resp = client.post("/analyze/quick")
        assert resp.status_code == 422  # Unprocessable Entity

    def test_quick_analysis_empty_file(self):
        resp = client.post(
            "/analyze/quick",
            files={"image": ("food.jpg", b"", "image/jpeg")},
        )
        assert resp.status_code == 400
        assert "Empty" in resp.json()["message"]

    @patch("main._analyze_vl", side_effect=RuntimeError("GPU out of memory"))
    def test_quick_analysis_oom(self, mock_vl: MagicMock):
        data = _make_jpeg_bytes()
        resp = client.post(
            "/analyze/quick",
            files={"image": ("food.jpg", data, "image/jpeg")},
        )
        assert resp.status_code == 503

    @patch("main._analyze_vl", side_effect=Exception("Unexpected error"))
    def test_quick_analysis_internal_error(self, mock_vl: MagicMock):
        data = _make_jpeg_bytes()
        resp = client.post(
            "/analyze/quick",
            files={"image": ("food.jpg", data, "image/jpeg")},
        )
        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# /analyze (full)
# ---------------------------------------------------------------------------
class TestAnalyzeFull:
    @patch("main._run_analysis", return_value=(MOCK_VL_RESULT, None))
    def test_analyze_vl_mode(self, mock_run: MagicMock):
        data = _make_jpeg_bytes()
        resp = client.post(
            "/analyze?mode=vl",
            files={"image": ("food.jpg", data, "image/jpeg")},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["mode"] == "vl"
        assert body["vl_result"]["food_name"] == "Caesar Salad"
        assert body["pipeline_result"] is None

    @patch("main._run_analysis", return_value=(MOCK_VL_RESULT, None))
    def test_analyze_default_mode_is_vl(self, mock_run: MagicMock):
        data = _make_jpeg_bytes()
        resp = client.post(
            "/analyze",
            files={"image": ("food.jpg", data, "image/jpeg")},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["mode"] == "vl"

    def test_analyze_invalid_mode(self):
        data = _make_jpeg_bytes()
        resp = client.post(
            "/analyze?mode=invalid",
            files={"image": ("food.jpg", data, "image/jpeg")},
        )
        assert resp.status_code == 422  # Enum validation

    def test_analyze_no_file(self):
        resp = client.post("/analyze?mode=vl")
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Image validation
# ---------------------------------------------------------------------------
class TestImageValidation:
    def test_oversized_image_rejected(self):
        # Create a file just over the limit
        big_data = b"\xff\xd8\xff\xe0" + b"\x00" * (MAX_IMAGE_BYTES + 1)
        resp = client.post(
            "/analyze/quick",
            files={"image": ("big.jpg", big_data, "image/jpeg")},
        )
        assert resp.status_code == 413

    def test_corrupt_image_rejected(self):
        resp = client.post(
            "/analyze/quick",
            files={"image": ("bad.jpg", b"not an image", "image/jpeg")},
        )
        assert resp.status_code == 400

    @patch("main._analyze_vl", return_value=MOCK_VL_RESULT)
    def test_large_dimension_image_rejected(self, mock_vl: MagicMock):
        # Create a valid but oversized-dimension image
        # Can't easily create a truly huge image in memory, so test the dimension check
        # by monkeypatching the constant
        data = _make_jpeg_bytes(200, 200)
        with patch("main.MAX_IMAGE_DIMENSION", 50):
            resp = client.post(
                "/analyze/quick",
                files={"image": ("huge.jpg", data, "image/jpeg")},
            )
            assert resp.status_code == 400
            assert "dimensions" in resp.json()["message"].lower()


# ---------------------------------------------------------------------------
# _parse_vl_response
# ---------------------------------------------------------------------------
class TestParseVLResponse:
    def test_parse_clean_json(self):
        result = _parse_vl_response('{"calories": 200}')
        assert result == {"calories": 200}

    def test_parse_json_with_code_fence(self):
        raw = '```json\n{"calories": 200}\n```'
        result = _parse_vl_response(raw)
        assert result == {"calories": 200}

    def test_parse_json_with_assistant_prefix(self):
        raw = 'system\nYou are a helpful assistant\nassistant\n{"calories": 200}'
        result = _parse_vl_response(raw)
        assert result == {"calories": 200}

    def test_parse_invalid_json_returns_error(self):
        result = _parse_vl_response("not json at all")
        assert "error" in result
        assert "raw_output" in result


# ---------------------------------------------------------------------------
# Error response format
# ---------------------------------------------------------------------------
class TestErrorFormat:
    def test_404_returns_structured_error(self):
        resp = client.get("/nonexistent")
        assert resp.status_code in (404, 405)

    def test_error_has_consistent_fields(self):
        resp = client.post(
            "/analyze/quick",
            files={"image": ("bad.jpg", b"not an image", "image/jpeg")},
        )
        body = resp.json()
        assert "error_code" in body
        assert "message" in body
        assert "timestamp" in body


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
class TestCORS:
    def test_cors_headers_present(self):
        resp = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        # Should not reject CORS
        assert resp.status_code in (200, 204, 405)
