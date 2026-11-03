import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { cronAuthorized } from "../../../../lib/intelligence/cron.ts";
import {
  INTELLIGENCE_TAG,
  loadIntelligence,
} from "../../../../lib/intelligence/server.ts";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (
    !cronAuthorized(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  )
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (process.env.ENABLE_PUBLIC_INTELLIGENCE !== "true")
    return NextResponse.json(
      { error: "Conectores no activados." },
      { status: 503 },
    );
  try {
    revalidateTag(INTELLIGENCE_TAG, "max");
    const data = await loadIntelligence(),
      statuses = {
        ecbRate: data.ecbRate.status,
        ecbFx: data.ecbFx.status,
        cot: data.cot.status,
        sec: data.sec.status,
      };
    console.info("intelligence_scheduled_revalidation_requested", statuses);
    const failed = Object.values(statuses).some(
      (x) => x === "unavailable" || x === "stale",
    );
    return NextResponse.json(
      {
        mode: "revalidation_requested",
        checkedAt: data.generatedAt,
        sources: statuses,
      },
      { status: failed ? 502 : 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("intelligence_scheduled_refresh_failed");
    return NextResponse.json(
      { error: "No se pudo completar la actualización." },
      { status: 502 },
    );
  }
}
