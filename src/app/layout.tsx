import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/theme-script";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const title = "Habitual — build habits with a buddy watching";
const description =
  "Set a daily challenge, put something on the line, and invite a buddy to hold you to it. Habits stick when someone's watching.";

export const metadata: Metadata = {
  // Makes every relative OG/canonical URL in the app resolve absolutely.
  metadataBase: new URL(siteUrl),
  title: { default: title, template: "%s · Habitual" },
  description,
  applicationName: "Habitual",
  keywords: [
    "habit tracker",
    "accountability partner",
    "streak tracker",
    "daily challenge",
    "habit buddy",
  ],
  alternates: { canonical: "/" },
  // The whole growth loop is people sharing an invite link, so every share
  // surface needs a real preview card.
  openGraph: {
    type: "website",
    siteName: "Habitual",
    url: "/",
    title,
    description,
    // The image comes from the `opengraph-image` file convention, which Next
    // injects here (and into every nested route) automatically.
  },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#101014" },
  ],
  width: "device-width",
  initialScale: 1,
  // No `maximumScale` / `userScalable` — capping zoom breaks WCAG 1.4.4.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="bg-background text-foreground flex min-h-full flex-col">
        {/* First tab stop: lets keyboard users jump the nav on every page. */}
        <a
          href="#main"
          className="bg-primary text-primary-foreground focus-visible:ring-ring sr-only rounded-lg px-4 py-2 text-sm font-medium focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-100"
        >
          Skip to content
        </a>
        {/* Pages own their own max-width: marketing goes full-bleed, app views
            use a readable column that widens on desktop. */}
        {children}
      </body>
    </html>
  );
}
