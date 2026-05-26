export async function POST() {
  return Response.json({ error: "ASR not available" }, { status: 410 });
}
