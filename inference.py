#   ! pip install -U bitsandbytes accelerate
# ! pip install -U transformers==4.57.0
# ! pip install peft pillow requests
# ! pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

from transformers import Qwen3VLForConditionalGeneration, AutoProcessor
from peft import PeftModel
import torch
from PIL import Image
import requests
from io import BytesIO
# import gc

# torch.cuda.empty_cache()
# gc.collect()

base_model_name = "Qwen/Qwen3-VL-2B-Instruct"
print("Loading base models...")

model = Qwen3VLForConditionalGeneration.from_pretrained(
    base_model_name,
    torch_dtype=torch.float16,
    device_map="auto",
    trust_remote_code=True,
    low_cpu_mem_usage=True,
    attn_implementation="sdpa",  # Use "flash_attention_2" if available
)

processor = AutoProcessor.from_pretrained(
    base_model_name,
    trust_remote_code=True
)


print("Loading the saved LoRA adapter...")
model = PeftModel.from_pretrained(
    model,
    "Ateeqq/food-analysis",
)
print("LoRA adapter loaded successfully!")

model.eval()

user_prompt = """As a food-analyzer AI, analyze the image and return a single JSON object containing nutritional information.

Respond with JSON only. No extra text.
"""

image_url = "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg"
response = requests.get(image_url)
image = Image.open(BytesIO(response.content)).convert("RGB")

# Resize image to reduce memory usage (optional but helpful)
max_size = 1024
image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

print("\nRunning inference on a new image...")

# Format messages
messages = [
    {
        "role": "user",
        "content": [
            {"type": "image", "image": image},
            {"type": "text", "text": user_prompt}
        ]
    }
]

# Process inputs
text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
inputs = processor(
    text=[text],
    images=[image],
    return_tensors="pt",
    padding=True
).to(model.device)

# # Clear cache before generation
# torch.cuda.empty_cache()

# Generate output with memory optimizations
with torch.no_grad():
    outputs = model.generate(
        **inputs,
        max_new_tokens=512,
        temperature=0.1,
        do_sample=True,
        use_cache=True,  # Enable KV cache
        num_beams=1,  # Use greedy decoding to save memory
        # Add these memory-saving options:
        pad_token_id=processor.tokenizer.pad_token_id,
        eos_token_id=processor.tokenizer.eos_token_id,
    )

# Decode output
decoded_output = processor.decode(outputs[0], skip_special_tokens=True)

print("\n\nFinetuned model's response:")
print(decoded_output)
