"use client";

import { useAppTheme } from "@/components/app-theme-provider";
import { buildAppThemeStyles } from "@/lib/app-theme";

export function AppThemeToggle() {
  const { resolvedTheme, themeChoice, setThemeChoice } = useAppTheme();
  const styles = buildAppThemeStyles(resolvedTheme);
  const options = [
    { id: "system", label: "System", icon: "◌" },
    { id: "light", label: "Light", icon: "☀" },
    { id: "dark", label: "Dark", icon: "◐" },
  ] as const;

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border p-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
      style={styles.navSurface}
      aria-label="Theme selector"
      role="group"
    >
      {options.map((option) => {
        const isActive = themeChoice === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setThemeChoice(option.id)}
            aria-pressed={isActive}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 transition hover:-translate-y-0.5"
            style={isActive ? styles.accentButton : styles.ghostButton}
          >
            <span aria-hidden="true" className="text-sm leading-none">
              {option.icon}
            </span>
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
