import { createClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { Database } from "@/lib/supabase/types";
import type { AllowanceMode } from "@/lib/challenges";
import type { ReactionItem } from "@/components/reactions-feed";

/** Shape returned by the `challenge_by_invite` RPC (jsonb). */
export type InviteView = {
  id: string;
  title: string;
  cadence: string;
  cadence_weekday: number | null;
  daily_target: number;
  total_target: number | null;
  target_unit: string | null;
  start_date: string;
  end_date: string | null;
  allowance_mode: AllowanceMode | null;
  allowance_value: number | null;
  max_misses_in_row: number | null;
  stake_text: string | null;
  owner_name: string | null;
  invite_status: string;
  buddy_claimed: boolean;
  viewer_is_owner: boolean | null;
  viewer_is_buddy: boolean | null;
  check_ins: { date: string; value: number; note: string | null }[];
  reactions: ReactionItem[];
};

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Read an invite WITHOUT a session, for the share-preview surfaces: the OG
 * image and `generateMetadata`.
 *
 * A chat unfurler (WhatsApp, iMessage, Slack) sends no cookies, so there is no
 * session to read and nothing to gain from the cookie-bound client — reaching
 * for `cookies()` here would only opt these routes into request scope for no
 * reason. The `challenge_by_invite` RPC is `SECURITY DEFINER` and gated on the
 * token, so anon is exactly the right level of access.
 *
 * The page itself still uses the cookie-bound client: it needs
 * `viewer_is_owner` / `viewer_is_buddy`, which only exist relative to a session.
 *
 * `cache()` dedupes within a single request; separate requests (the page vs.
 * the image) can't share, which is fine — the image is fetched once per unfurl.
 */
export const fetchInviteCard = cache(
  async (token: string): Promise<InviteView | null> => {
    if (!UUID_RE.test(token)) return null;

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data } = await supabase.rpc("challenge_by_invite", {
      p_token: token,
    });
    return (data as InviteView | null) ?? null;
  },
);
