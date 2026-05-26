"""
Personaplex TTS server — wraps nvidia/personaplex-7b-v1 from HuggingFace.
Exposes OpenAI-compatible POST /v1/audio/speech → audio/wav.

Loaded model is cached at HF_HOME (/opt/personaplex/cache) via PVC so
weights survive pod restarts without re-downloading (17GB+ checkpoint).
"""

import io
import logging
import os

import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

MODEL_ID = os.environ.get("PERSONAPLEX_MODEL_ID", "nvidia/personaplex-7b-v1")
HF_TOKEN = os.environ.get("HF_TOKEN") or None  # empty string → None (avoids illegal Bearer header)
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
SAMPLE_RATE = 22050  # typical TTS output rate; Personaplex may differ

app = FastAPI(title="Personaplex TTS")

# Global model/processor (loaded at startup)
_model = None
_processor = None


@app.on_event("startup")
async def load_model():
    global _model, _processor
    log.info("Loading %s on %s...", MODEL_ID, DEVICE)
    try:
        from transformers import AutoProcessor, AutoModel
        _processor = AutoProcessor.from_pretrained(
            MODEL_ID, token=HF_TOKEN, trust_remote_code=True
        )
        _model = AutoModel.from_pretrained(
            MODEL_ID,
            token=HF_TOKEN,
            torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32,
            device_map=DEVICE,
            trust_remote_code=True,
        )
        _model.eval()
        log.info("Personaplex loaded successfully.")
    except Exception as e:
        log.error("Failed to load model: %s", e)
        log.error("Ensure nvidia/personaplex-7b-v1 is accessible and HF_TOKEN is set if required.")
        # Don't exit — let health endpoint report not-ready


class TTSRequest(BaseModel):
    model: str = "personaplex"
    input: str
    voice: str = "conversational"
    response_format: str = "wav"
    speed: float = 1.0


@app.get("/v1/health/ready")
async def health_ready():
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {"status": "ready"}


@app.get("/v1/health/live")
async def health_live():
    return {"status": "live"}


@app.post("/v1/audio/speech")
async def synthesize(req: TTSRequest):
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    if not req.input.strip():
        raise HTTPException(status_code=400, detail="Input text is empty")

    try:
        wav_bytes = _generate_wav(req.input, req.voice)
    except Exception as e:
        log.error("TTS generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {e}")

    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={"Content-Length": str(len(wav_bytes))},
    )


def _generate_wav(text: str, voice: str) -> bytes:
    """Generate WAV bytes from text using the loaded Personaplex model."""
    with torch.inference_mode():
        inputs = _processor(text=text, return_tensors="pt").to(DEVICE)

        # Pass voice/persona if the model supports it
        generate_kwargs: dict = {}
        if voice and voice != "conversational":
            generate_kwargs["speaker_embeddings"] = _get_speaker_embedding(voice)

        outputs = _model.generate_speech(**inputs, **generate_kwargs)

    # outputs is a tensor of waveform samples
    waveform = outputs.cpu().float().numpy()
    if waveform.ndim == 1:
        waveform = waveform[np.newaxis, :]  # (1, samples)

    return _numpy_to_wav(waveform[0], SAMPLE_RATE)


def _get_speaker_embedding(voice_name: str):
    """Return a speaker embedding for the given voice name if supported."""
    # Personaplex may ship with named persona embeddings.
    # Fall back to None (default voice) if not available.
    try:
        return _processor.get_speaker_embedding(voice_name)
    except AttributeError:
        return None


def _numpy_to_wav(samples: np.ndarray, sample_rate: int) -> bytes:
    """Convert float32 waveform samples to WAV bytes."""
    import struct
    import wave

    # Clamp and convert to int16
    samples = np.clip(samples, -1.0, 1.0)
    pcm = (samples * 32767).astype(np.int16)

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(pcm.tobytes())
    return buf.getvalue()
