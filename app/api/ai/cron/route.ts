import { NextRequest, NextResponse } from "next/server";
import { processAbandonedCarts } from "@/lib/ai/abandoned-cart-agent";
import { generateDailyReport } from "@/lib/ai/business-analyst";

/**
 * External cron endpoint (Vercel Cron / cron-job.org).
 * Protect with CRON_SECRET header: Authorization: Bearer <CRON_SECRET>
 * Query: ?job=abandoned_carts | daily_report | all
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization") || "";
  // Fail closed: never allow unauthenticated cron when secret is missing.
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = req.nextUrl.searchParams.get("job") || "all";
  const result: Record<string, unknown> = {};

  try {
    if (job === "abandoned_carts" || job === "all") {
      result.abandoned_carts = await processAbandonedCarts();
    }
    if (job === "daily_report" || job === "all") {
      result.daily_report = await generateDailyReport();
    }
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
