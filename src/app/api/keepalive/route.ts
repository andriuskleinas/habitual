import { createClient } from "@/lib/supabase/server";

/**
 * Keep-alive for the free-tier Supabase project, hit once a day by Vercel Cron
 * (see `vercel.json`). It's the second, independent pinger next to the GitHub
 * Action, so neither scheduler failing on its own can let the project pause.
 *
 * A route handler rather than a Server Action because a cron job can only make
 * a plain GET. It must never be cached or prerendered: a cached response would
 * look healthy without ever touching the database.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Vercel sends `Authorization: Bearer $CRON_SECRET` when that env var is set.
  // Without it the endpoint stays open, which is harmless: all it can do is
  // bump one timestamp through an RPC the public key can already call.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("keepalive", { p_source: "vercel" });

  if (error) {
    // A non-2xx shows up as a failed invocation in Vercel's cron logs.
    return Response.json({ ok: false, error: error.message }, { status: 502 });
  }
  return Response.json({ ok: true, pinged_at: data });
}
