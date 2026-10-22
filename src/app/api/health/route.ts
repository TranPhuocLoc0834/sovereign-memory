import { tideHealth } from "@/lib/tide-health";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(await tideHealth(), { headers: { "Cache-Control": "no-store" } });
}
