"""Shared Qwen3-VL utilities for NutriVision apps."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

import torch
from PIL import Image

logger = logging.getLogger(__name__)

VL_BASE_MODEL = "Qwen/Qwen3-VL-2B-Instruct"
VL_LORA_ADAPTER = "Ateeqq/food-analysis"
VL_SYSTEM_PROMPT = (
    "As a food-analyzer AI, analyze the image and return a single JSON object "
    "containing nutritional information.\n\nRespond with JSON only. No extra text."
)

_vl_model = None
_vl_processor = None


def vl_model_loaded() -> bool:
    """Return True when the VL model has been initialized in this process."""
    return _vl_model is not None


def load_vl_model() -> tuple[Any, Any]:
    """Load the Qwen3-VL model + LoRA adapter on first use."""
    global _vl_model, _vl_processor

    if _vl_model is not None:
        return _vl_model, _vl_processor

    from peft import PeftModel
    from transformers import AutoProcessor, Qwen3VLForConditionalGeneration

    logger.info("Loading Qwen3-VL base model: %s", VL_BASE_MODEL)
    base = Qwen3VLForConditionalGeneration.from_pretrained(
        VL_BASE_MODEL,
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True,
        low_cpu_mem_usage=True,
        attn_implementation="sdpa",
    )

    processor = AutoProcessor.from_pretrained(VL_BASE_MODEL, trust_remote_code=True)

    logger.info("Loading LoRA adapter: %s", VL_LORA_ADAPTER)
    model = PeftModel.from_pretrained(base, VL_LORA_ADAPTER)
    model.eval()

    _vl_model = model
    _vl_processor = processor
    logger.info("VL model ready")
    return model, processor


def parse_vl_response(raw: str) -> dict:
    """Extract JSON from model text and return a structured dict."""
    if "assistant\n" in raw:
        raw = raw.split("assistant\n")[-1].strip()

    raw = re.sub(r"^```(?:json)?", "", raw).strip()
    raw = re.sub(r"```$", "", raw).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Failed to parse VL JSON output: %.200s", raw)
        return {"error": "Failed to parse nutritional JSON", "raw_output": raw}


def analyze_vl_image(image: Image.Image, max_size: int = 1024) -> dict:
    """Run Qwen3-VL analysis and return parsed nutrition JSON."""
    model, processor = load_vl_model()

    img = image.copy()
    img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": img},
                {"type": "text", "text": VL_SYSTEM_PROMPT},
            ],
        }
    ]

    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = processor(text=[text], images=[img], return_tensors="pt", padding=True).to(
        model.device
    )

    with torch.inference_mode():
        outputs = model.generate(
            **inputs,
            max_new_tokens=512,
            temperature=0.1,
            do_sample=True,
            use_cache=True,
            num_beams=1,
            pad_token_id=processor.tokenizer.pad_token_id,
            eos_token_id=processor.tokenizer.eos_token_id,
        )

    decoded = processor.decode(outputs[0], skip_special_tokens=True)
    return parse_vl_response(decoded)
