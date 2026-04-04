import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import Script from "next/script";
import { AppThemeProvider } from "@/components/app-theme-provider";
import { AppThemeToggle } from "@/components/app-theme-toggle";
import { APP_THEME_STORAGE_KEY } from "@/lib/app-theme";
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
  const themeInitScript = `
    (function () {
      try {
        var stored = window.localStorage.getItem(${JSON.stringify(APP_THEME_STORAGE_KEY)});
        var resolved = stored === "light" || stored === "dark"
          ? stored
          : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        document.documentElement.dataset.uiTheme = resolved;
        document.documentElement.dataset.uiThemeSource = stored === "light" || stored === "dark" ? stored : "system";
        document.documentElement.style.colorScheme = resolved;
      } catch (error) {
        document.documentElement.dataset.uiTheme = "dark";
        document.documentElement.dataset.uiThemeSource = "system";
        document.documentElement.style.colorScheme = "dark";
      }
    })();
  `;

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${jetBrainsMono.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body>
        <Script
          id="repo2site-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        {plausibleDomain ? (
          <Script
            defer
            data-domain={plausibleDomain}
            src={plausibleScriptUrl}
            strategy="afterInteractive"
          />
        ) : null}
        <AppThemeProvider>
          <div className="pointer-events-none fixed right-4 top-4 z-[80] sm:right-5 sm:top-5" style={{ top: "max(1rem, env(safe-area-inset-top))", right: "max(1rem, env(safe-area-inset-right))" }}>
            <div className="pointer-events-auto">
              <AppThemeToggle />
            </div>
          </div>
          {children}
        </AppThemeProvider>
      </body>
    </html>
  );
}
