"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  APP_THEME_STORAGE_KEY,
  type AppThemeChoice,
  type ResolvedAppTheme,
  readStoredAppTheme,
  resolveAppTheme,
  resolveSystemAppTheme,
} from "@/lib/app-theme";

type AppThemeContextValue = {
  themeChoice: AppThemeChoice;
  resolvedTheme: ResolvedAppTheme;
  setThemeChoice: (theme: AppThemeChoice) => void;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function applyThemeToDocument(themeChoice: AppThemeChoice, resolvedTheme: ResolvedAppTheme) {
  const root = document.documentElement;
  root.dataset.uiTheme = resolvedTheme;
  root.dataset.uiThemeSource = themeChoice;
  root.style.colorScheme = resolvedTheme;
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeChoice, setThemeChoiceState] = useState<AppThemeChoice>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedAppTheme>("dark");

  useEffect(() => {
    const storedTheme = readStoredAppTheme(window.localStorage);
    const nextResolvedTheme = resolveAppTheme(storedTheme);
    setThemeChoiceState(storedTheme);
    setResolvedTheme(nextResolvedTheme);
    applyThemeToDocument(storedTheme, nextResolvedTheme);
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
      toggleTheme: () => {
        const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
        const nextResolvedTheme = resolveAppTheme(nextTheme);
        setThemeChoiceState(nextTheme);
        setResolvedTheme(nextResolvedTheme);
        window.localStorage.setItem(APP_THEME_STORAGE_KEY, nextTheme);
        applyThemeToDocument(nextTheme, nextResolvedTheme);
      },
    }),
    [resolvedTheme, themeChoice],
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
