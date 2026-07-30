import Link from "next/link";
import { Flame, Target, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const pillars = [
  {
    icon: Target,
    title: "Set a daily challenge",
    body: "Pick a habit, a target, and how long you'll go for.",
  },
  {
    icon: Users,
    title: "Invite a buddy",
    body: "One link. They watch your progress live — no account needed.",
  },
  {
    icon: Flame,
    title: "Keep the streak alive",
    body: "Log daily, put a stake on the line, and get cheered on.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <header className="flex items-center gap-2">
        <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
          <Flame className="size-5" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Habitual</span>
      </header>

      <section className="mt-16 flex flex-col items-start gap-5">
        <Badge variant="secondary" className="rounded-full">
          Accountability, gamified
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight text-balance">
          Build habits with a{" "}
          <span className="text-primary">buddy watching.</span>
        </h1>
        <p className="text-muted-foreground text-lg text-pretty">
          Set a daily challenge, put something on the line, and invite a friend
          to hold you to it. Habits stick when someone&apos;s watching.
        </p>
        <div className="mt-2 flex w-full flex-col gap-3">
          <Button size="lg" className="w-full" asChild>
            <Link href="/login">Start a challenge</Link>
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            Sign in with a magic link — no password needed.
          </p>
        </div>
      </section>

      <section className="mt-14 flex flex-col gap-3">
        {pillars.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="border-border/60">
            <CardContent className="flex items-start gap-4">
              <div className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                <Icon className="size-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="font-medium">{title}</p>
                <p className="text-muted-foreground text-sm">{body}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <footer className="text-muted-foreground mt-auto pt-16 text-center text-xs">
        Habitual · Wave 1 — data layer &amp; auth
      </footer>
    </main>
  );
}
