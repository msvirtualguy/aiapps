"use client";

export async function startRecording(): Promise<MediaRecorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
  return recorder;
}

export function stopRecording(recorder: MediaRecorder): Promise<Blob> {
  return new Promise((resolve) => {
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: "audio/webm" }));
      recorder.stream.getTracks().forEach((t) => t.stop());
    };
    recorder.stop();
  });
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "recording.webm");

  const resp = await fetch("/api/asr", { method: "POST", body: form });
  if (!resp.ok) throw new Error(`ASR failed: ${resp.status}`);
  const data = await resp.json();
  return data.transcript ?? "";
}

export async function speakText(text: string): Promise<void> {
  const resp = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice: "af_heart" }),
  });
  if (!resp.ok) throw new Error(`TTS failed: ${resp.status}`);

  const audioBuffer = await resp.arrayBuffer();
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(audioBuffer);
  const source = ctx.createBufferSource();
  source.buffer = decoded;
  source.connect(ctx.destination);

  return new Promise((resolve) => {
    source.onended = () => {
      ctx.close();
      resolve();
    };
    source.start();
  });
}
