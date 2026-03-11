from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import HTMLResponse
import httpx
import os
import tempfile
import subprocess
import uuid

NAI_BASE = os.environ["NAI_BASE_URL"]
NAI_KEY = os.environ["NAI_API_KEY"]
NAI_MODEL = os.environ.get("NAI_MODEL", "cosmos-reason1-7b")

app = FastAPI()

HTML_PAGE = """
<html>
  <body>
    <h2>Video Search & Summarization (Cosmos‑Reason1‑7B on NAI)</h2>
    <form action="/analyze" method="post" enctype="multipart/form-data">
      <label>Question about this video:</label><br/>
      <input type="text" name="question" size="80"
             value="Summarize this video and highlight the key moments."/><br/><br/>
      <label>Upload MP4 video:</label><br/>
      <input type="file" name="video"/><br/><br/>
      <input type="submit" value="Analyze"/>
    </form>
  </body>
</html>
"""

@app.get("/", response_class=HTMLResponse)
async def index():
    return HTML_PAGE

def extract_audio_to_wav(video_path: str, wav_path: str):
    cmd = ["ffmpeg", "-y", "-i", video_path, "-vn", "-ac", "1", "-ar", "16000", wav_path]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def transcribe_audio(wav_path: str) -> str:
    # TODO: replace with your preferred STT; this is a placeholder.
    # For now, just return a stub so you can verify the NAI call path.
    return "This is a placeholder transcript for demo purposes."

async def call_cosmos(transcript: str, question: str) -> str:
    system_prompt = (
        "You are an AI assistant that summarizes and analyzes video content. "
        "You are given a transcript of a video and a user question. "
        "First, summarize the video. Then answer the question precisely."
    )

    user_prompt = f"""
Video transcript:
\"\"\"
{transcript}
\"\"\"

User question: {question}
"""

    payload = {
        "model": NAI_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 1024,
    }

    headers = {
        "Authorization": f"Bearer {NAI_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=300) as client:
        r = await client.post(f"{NAI_BASE}/chat/completions",
                              headers=headers, json=payload)
        r.raise_for_status()
        data = r.json()
    return data["choices"][0]["message"]["content"]

@app.post("/analyze", response_class=HTMLResponse)
async def analyze_video(
    question: str = Form(...),
    video: UploadFile = File(...)
):
    with tempfile.TemporaryDirectory() as tmpdir:
        video_id = str(uuid.uuid4())
        video_path = os.path.join(tmpdir, f"{video_id}.mp4")
        wav_path = os.path.join(tmpdir, f"{video_id}.wav")

        with open(video_path, "wb") as f:
            f.write(await video.read())

        extract_audio_to_wav(video_path, wav_path)
        transcript = transcribe_audio(wav_path)

        answer = await call_cosmos(transcript, question)

    return f"""
    <html>
      <body>
        <h2>Question</h2>
        <p>{question}</p>
        <h2>Answer (Summary + Q&A)</h2>
        <pre>{answer}</pre>
        <a href="/">Analyze another video</a>
      </body>
    </html>
    """
