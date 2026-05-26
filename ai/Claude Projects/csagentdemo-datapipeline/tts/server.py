"""
Kokoro TTS server — wraps hexgrad/Kokoro-82M (MIT license, 82M params).
Exposes OpenAI-compatible POST /v1/audio/speech → audio/wav.
Model weights (~330MB) cached at HF_HOME via PVC on first startup.
"""

import io
import logging
import os

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

DEFAULT_VOICE = os.environ.get("TTS_VOICE", "af_heart")  # American English, natural
SAMPLE_RATE = 24000  # Kokoro output rate

app = FastAPI(title="Kokoro TTS")

_pipeline = None


@app.on_event("startup")
async def load_model():
    global _pipeline
    log.info("Loading Kokoro TTS (hexgrad/Kokoro-82M)...")
    try:
        from kokoro import KPipeline
        _pipeline = KPipeline(lang_code="a", device="cpu")  # standard PyTorch wheels lack SM 12.1 (GB10 Blackwell)
        log.info("Kokoro loaded successfully.")
    except Exception as e:
        log.error("Failed to load Kokoro: %s", e)


class TTSRequest(BaseModel):
    model: str = "kokoro"
    input: str
    voice: str = DEFAULT_VOICE
    response_format: str = "wav"
    speed: float = 1.0


@app.get("/v1/health/ready")
async def health_ready():
    if _pipeline is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {"status": "ready"}


@app.get("/v1/health/live")
async def health_live():
    return {"status": "live"}


@app.post("/v1/audio/speech")
async def synthesize(req: TTSRequest):
    if _pipeline is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    if not req.input.strip():
        raise HTTPException(status_code=400, detail="Input text is empty")
    try:
        wav_bytes = _generate_wav(req.input, req.voice or DEFAULT_VOICE)
    except Exception as e:
        log.error("TTS generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {e}")
    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={"Content-Length": str(len(wav_bytes))},
    )


def _generate_wav(text: str, voice: str) -> bytes:
    chunks = []
    for _, _, audio in _pipeline(text, voice=voice):
        if audio is not None:
            chunks.append(audio.numpy())
    if not chunks:
        raise RuntimeError("No audio generated")
    waveform = np.concatenate(chunks)
    return _numpy_to_wav(waveform, SAMPLE_RATE)


def _numpy_to_wav(samples: np.ndarray, sample_rate: int) -> bytes:
    import wave
    samples = np.clip(samples, -1.0, 1.0)
    pcm = (samples * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm.tobytes())
    return buf.getvalue()
