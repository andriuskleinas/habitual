import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { AuthHeader } from "@/components/auth-header";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeader />

      <main
        id="main"
        className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8"
      >
        <div className="bg-card border-border w-full max-w-sm rounded-3xl border p-6 sm:p-8">
          <ForgotPasswordForm />
        </div>
      </main>
    </>
  );
}
