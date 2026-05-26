export async function POST() {
  return Response.json({ error: "TTS not available" }, { status: 410 });
}
