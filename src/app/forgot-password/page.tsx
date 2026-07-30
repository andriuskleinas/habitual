import type { Metadata } from "next";
import { Wordmark } from "@/components/brand";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Wordmark />
        <ThemeToggle />
      </header>

      <main
        id="main"
        className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8"
      >
        <div className="bg-card ring-foreground/10 w-full max-w-sm rounded-2xl p-6 shadow-sm ring-1 sm:p-8">
          <ForgotPasswordForm />
        </div>
      </main>
    </>
  );
}
