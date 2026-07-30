import { redirect } from "next/navigation";
import { Flame, LogOut, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this route; this is a defensive fallback.
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", user.id)
    .single();

  const displayName = profile?.name ?? user.email?.split("@")[0] ?? "there";

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <Flame className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Habitual</span>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </header>

      <section className="mt-12 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Hey {displayName} 👋
        </h1>
        <p className="text-muted-foreground text-pretty">
          This is your dashboard. Your challenges will live here.
        </p>
      </section>

      <section className="mt-8">
        <Card className="border-border/60 border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-xl">
              <Target className="size-6" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-medium">No challenges yet</p>
              <p className="text-muted-foreground text-sm text-pretty">
                Creating challenges lands in the next wave. For now, you&apos;re
                signed in — the accountability loop starts soon.
              </p>
            </div>
            <Button className="mt-2" disabled>
              Start a challenge
            </Button>
          </CardContent>
        </Card>
      </section>

      <footer className="text-muted-foreground mt-auto pt-16 text-center text-xs">
        Signed in as {user.email} · Wave 1 — data layer &amp; auth
      </footer>
    </main>
  );
}
