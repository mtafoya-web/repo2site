"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  APP_THEME_STORAGE_KEY,
  APP_THEME_RESOLVED_COOKIE,
  APP_THEME_SOURCE_COOKIE,
  type AppThemeChoice,
  type ResolvedAppTheme,
  readStoredAppTheme,
  resolveAppTheme,
  resolveSystemAppTheme,
} from "@/lib/app-theme";

type AppThemeContextValue = {
  themeChoice: AppThemeChoice;
  resolvedTheme: ResolvedAppTheme;
  renderTheme: ResolvedAppTheme;
  isHydrated: boolean;
  setThemeChoice: (theme: AppThemeChoice) => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function readThemeStateFromDocument(): {
  themeChoice: AppThemeChoice;
  resolvedTheme: ResolvedAppTheme;
} {
  if (typeof document === "undefined") {
    return {
      themeChoice: "system" as AppThemeChoice,
      resolvedTheme: "dark" as ResolvedAppTheme,
    };
  }

  const root = document.documentElement;
  const themeChoice =
    root.dataset.uiThemeSource === "light" || root.dataset.uiThemeSource === "dark"
      ? root.dataset.uiThemeSource
      : "system";
  const resolvedTheme =
    root.dataset.uiTheme === "light" || root.dataset.uiTheme === "dark"
      ? root.dataset.uiTheme
      : "dark";

  return {
    themeChoice,
    resolvedTheme,
  };
}

function applyThemeToDocument(themeChoice: AppThemeChoice, resolvedTheme: ResolvedAppTheme) {
  const root = document.documentElement;
  root.dataset.uiTheme = resolvedTheme;
  root.dataset.uiThemeSource = themeChoice;
  root.style.colorScheme = resolvedTheme;
  document.cookie = `${APP_THEME_RESOLVED_COOKIE}=${resolvedTheme}; path=/; max-age=31536000; samesite=lax`;
  document.cookie = `${APP_THEME_SOURCE_COOKIE}=${themeChoice}; path=/; max-age=31536000; samesite=lax`;
}

export function AppThemeProvider({
  children,
  initialThemeChoice = "system",
  initialResolvedTheme = "dark",
}: {
  children: React.ReactNode;
  initialThemeChoice?: AppThemeChoice;
  initialResolvedTheme?: ResolvedAppTheme;
}) {
  const [themeChoice, setThemeChoiceState] = useState<AppThemeChoice>(initialThemeChoice);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedAppTheme>(initialResolvedTheme);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const storedTheme = readStoredAppTheme(window.localStorage);
    const documentTheme = readThemeStateFromDocument();
    const nextThemeChoice = storedTheme;
    const nextResolvedTheme =
      nextThemeChoice === documentTheme.themeChoice ? documentTheme.resolvedTheme : resolveAppTheme(nextThemeChoice);
    setThemeChoiceState(nextThemeChoice);
    setResolvedTheme(nextResolvedTheme);
    applyThemeToDocument(nextThemeChoice, nextResolvedTheme);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (themeChoice !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const nextResolvedTheme = resolveSystemAppTheme();
      setResolvedTheme(nextResolvedTheme);
      applyThemeToDocument("system", nextResolvedTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeChoice]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      themeChoice,
      resolvedTheme,
      renderTheme: resolvedTheme,
      isHydrated,
      setThemeChoice: (nextTheme) => {
        const nextResolvedTheme = resolveAppTheme(nextTheme);
        setThemeChoiceState(nextTheme);
        setResolvedTheme(nextResolvedTheme);

        if (nextTheme === "system") {
          window.localStorage.removeItem(APP_THEME_STORAGE_KEY);
        } else {
          window.localStorage.setItem(APP_THEME_STORAGE_KEY, nextTheme);
        }

        applyThemeToDocument(nextTheme, nextResolvedTheme);
      },
    }),
    [isHydrated, resolvedTheme, themeChoice],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(AppThemeContext);

  if (!value) {
    throw new Error("useAppTheme must be used within AppThemeProvider.");
  }

  return value;
}
