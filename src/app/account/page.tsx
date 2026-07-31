import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, KeyRound, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { displayName, fullName, initials } from "@/lib/profile";
import { AppHeader } from "@/components/app-header";
import { ProfileForm } from "@/components/profile-form";
import { ChangeEmailForm } from "@/components/change-email-form";
import { ThemePicker } from "@/components/theme-picker";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const { data: profile } = await supabase
    .from("users")
    .select("name, surname, nickname, email, password_set_at")
    .eq("id", user.id)
    .maybeSingle();

  // `public.users` is a mirror; auth is the source of truth for the address.
  const email = user.email ?? profile?.email ?? "";
  const names = {
    name: profile?.name ?? null,
    surname: profile?.surname ?? null,
    nickname: profile?.nickname ?? null,
    email,
  };
  const hasPassword = !!profile?.password_set_at;
  const formal = fullName(names);

  return (
    <>
      <AppHeader profile={names} current="account" />

      <main
        id="main"
        className="mx-auto w-full max-w-2xl flex-1 px-5 py-6 sm:px-8 sm:py-10"
      >
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-sm text-sm transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Dashboard
        </Link>

        <header className="mt-6 flex items-center gap-4">
          <span className="from-brand-from to-brand-to text-primary-foreground flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl font-semibold shadow-sm">
            {initials(names)}
          </span>
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
              {displayName(names)}
            </h1>
            <p className="text-muted-foreground truncate text-sm">
              {formal && formal !== displayName(names) ? `${formal} · ` : ""}
              {email}
            </p>
          </div>
        </header>

        <div className="mt-10 flex flex-col gap-10">
          <Section
            title="Your details"
            description="Your buddies see this name on the challenges they're watching."
          >
            <ProfileForm
              profile={{
                name: names.name,
                surname: names.surname,
                nickname: names.nickname,
              }}
            />
          </Section>

          <Section
            title="Appearance"
            description="Habitual follows your device by default. Pin it either way if you'd rather."
          >
            <ThemePicker />
          </Section>

          <Section
            title="Email"
            description="Changing this changes where your sign-in links arrive."
          >
            <ChangeEmailForm current={email} />
          </Section>

          <Section
            title="Password"
            description={
              hasPassword
                ? "You can sign in with a password or an emailed link — both keep working."
                : "You're signing in with emailed links. A password gets you in instantly."
            }
          >
            <Button variant="outline" size="lg" asChild>
              <Link href="/account/password?next=/account">
                <KeyRound className="size-4" aria-hidden />
                {hasPassword ? "Change password" : "Set a password"}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </Section>

          <section className="border-t pt-8">
            <form action={signOut}>
              <Button type="submit" variant="destructive" size="lg">
                <LogOut className="size-4" aria-hidden />
                Sign out
              </Button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground text-sm text-pretty">
          {description}
        </p>
      </div>
      <div className="bg-card ring-foreground/10 rounded-2xl p-5 ring-1 sm:p-6">
        {children}
      </div>
    </section>
  );
}
