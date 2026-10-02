from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from rembg import remove, new_session
from PIL import Image
import io
import base64
import os

app = FastAPI(title="Aurora BG Removal API", version="2.0")

# Allow Aurora Design origin & local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once at startup (BiRefNet = best quality)
# Options: 'birefnet-general' | 'birefnet-portrait' | 'u2net' | 'isnet-general-use'
MODEL_NAME = os.getenv("REMBG_MODEL", "birefnet-general")
session = new_session(MODEL_NAME)
print(f"[Aurora API] Model loaded: {MODEL_NAME}")

@app.post("/remove-bg")
async def remove_background(
    file: UploadFile = File(...),
    format: str = Form("PNG"),          # PNG | WEBP
    alpha_matting: bool = Form(False),  # True = better hair/fur edges
    foreground_threshold: int = Form(240),
    background_threshold: int = Form(10),
    erode_size: int = Form(10),
):
    """Remove background from uploaded image. Returns PNG with alpha channel."""
    try:
        # Read image
        image_data = await file.read()
        if len(image_data) > 20 * 1024 * 1024:  # 20MB limit
            raise HTTPException(413, "Image too large. Max 20MB.")

        img = Image.open(io.BytesIO(image_data)).convert("RGBA")

        # Remove background
        result = remove(
            img,
            session=session,
            alpha_matting=alpha_matting,
            alpha_matting_foreground_threshold=foreground_threshold,
            alpha_matting_background_threshold=background_threshold,
            alpha_matting_erode_size=erode_size,
            only_mask=False,
        )

        # Return as PNG bytes
        output_buffer = io.BytesIO()
        result.save(output_buffer, format="PNG", optimize=True)
        output_buffer.seek(0)

        return Response(
            content=output_buffer.read(),
            media_type="image/png",
            headers={"X-Model": MODEL_NAME, "X-Alpha-Matting": str(alpha_matting)},
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Processing error: {str(e)}")

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}
