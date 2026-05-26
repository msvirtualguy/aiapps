import { NextRequest } from "next/server";

const BACKEND = process.env.AGENT_BACKEND_URL ?? "http://localhost:8000";

export async function GET(_req: NextRequest) {
  try {
    const upstream = await fetch(`${BACKEND}/api/pipeline/status`, {
      next: { revalidate: 0 },
    });
    const data = await upstream.json();
    return Response.json(data);
  } catch {
    return Response.json(
      { error: "Agent backend unreachable" },
      { status: 502 },
    );
  }
}
