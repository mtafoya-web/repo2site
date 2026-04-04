import type { Metadata } from "next";
import { cookies } from "next/headers";
import { JetBrains_Mono, Manrope } from "next/font/google";
import Script from "next/script";
import { AppRouteTransition } from "@/components/app-route-transition";
import { Repo2SiteCompanionProvider } from "@/components/repo2site-companion-dock";
import { AppThemeProvider } from "@/components/app-theme-provider";
import {
  APP_THEME_RESOLVED_COOKIE,
  APP_THEME_SOURCE_COOKIE,
  APP_THEME_STORAGE_KEY,
  type AppThemeChoice,
  type ResolvedAppTheme,
} from "@/lib/app-theme";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieThemeChoice = cookieStore.get(APP_THEME_SOURCE_COOKIE)?.value;
  const cookieResolvedTheme = cookieStore.get(APP_THEME_RESOLVED_COOKIE)?.value;
  const initialThemeChoice: AppThemeChoice =
    cookieThemeChoice === "light" || cookieThemeChoice === "dark" ? cookieThemeChoice : "system";
  const initialResolvedTheme: ResolvedAppTheme =
    cookieResolvedTheme === "light" || cookieResolvedTheme === "dark" ? cookieResolvedTheme : "dark";
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
        document.cookie = ${JSON.stringify(APP_THEME_RESOLVED_COOKIE)} + "=" + resolved + "; path=/; max-age=31536000; samesite=lax";
        document.cookie = ${JSON.stringify(APP_THEME_SOURCE_COOKIE)} + "=" + (stored === "light" || stored === "dark" ? stored : "system") + "; path=/; max-age=31536000; samesite=lax";
      } catch (error) {
        document.documentElement.dataset.uiTheme = "dark";
        document.documentElement.dataset.uiThemeSource = "system";
        document.documentElement.style.colorScheme = "dark";
        document.cookie = ${JSON.stringify(APP_THEME_RESOLVED_COOKIE)} + "=dark; path=/; max-age=31536000; samesite=lax";
        document.cookie = ${JSON.stringify(APP_THEME_SOURCE_COOKIE)} + "=system; path=/; max-age=31536000; samesite=lax";
      }
    })();
  `;

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${jetBrainsMono.variable}`}
      data-scroll-behavior="smooth"
      data-ui-theme={initialResolvedTheme}
      data-ui-theme-source={initialThemeChoice}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {plausibleDomain ? (
          <Script
            defer
            data-domain={plausibleDomain}
            src={plausibleScriptUrl}
            strategy="afterInteractive"
          />
        ) : null}
        <AppThemeProvider
          initialThemeChoice={initialThemeChoice}
          initialResolvedTheme={initialResolvedTheme}
        >
          <Repo2SiteCompanionProvider>
            <AppRouteTransition>
              <div className="min-h-screen">{children}</div>
            </AppRouteTransition>
          </Repo2SiteCompanionProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
