import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import Script from "next/script";
import { assertProductionAppRuntimeEnv } from "@/lib/runtime-env";
import "./globals.css";

assertProductionAppRuntimeEnv();

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Repo2Site",
  description: "Generate a simple website preview from a public GitHub repository.",
  icons: {
    icon: "/icon",
    shortcut: "/icon",
    apple: "/icon",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim();
  const plausibleScriptUrl =
    process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL?.trim() || "https://plausible.io/js/script.js";

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${jetBrainsMono.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        {plausibleDomain ? (
          <Script
            defer
            data-domain={plausibleDomain}
            src={plausibleScriptUrl}
            strategy="afterInteractive"
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
