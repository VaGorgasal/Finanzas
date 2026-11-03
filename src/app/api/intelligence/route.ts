import { NextResponse } from "next/server";
import {
  requireAccess,
  serviceFailure,
  ServiceError,
} from "../../../lib/server-access.ts";
import { intelligenceQuery } from "../../../lib/intelligence/query.ts";
import { SourceError } from "../../../lib/intelligence/http.ts";
import { loadIntelligence } from "../../../lib/intelligence/server.ts";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    if (new URL(request.url).search)
      throw new ServiceError(
        "Esta consulta no admite símbolos, URLs ni carteras del cliente.",
        400,
      );
    const data = await intelligenceQuery({
      enabled: process.env.ENABLE_PUBLIC_INTELLIGENCE === "true",
      authorize: () => requireAccess(request, "market"),
      load: loadIntelligence,
    });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    if (e instanceof SourceError)
      return serviceFailure(new ServiceError(e.message, 503));
    console.warn("intelligence_request_failed", {
      code: e instanceof ServiceError ? e.status : 502,
    });
    return serviceFailure(e);
  }
}
