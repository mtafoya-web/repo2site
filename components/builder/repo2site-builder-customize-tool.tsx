"use client";

import type { ReactNode } from "react";
import type { CSSProperties } from "react";

export function Repo2SiteBuilderCustomizeTool({
  isOpen,
  appThemeStyles,
  launcherStyle,
  onToggle,
  children,
}: {
  isOpen: boolean;
  appThemeStyles: {
    surface: CSSProperties;
    strongSurface: CSSProperties;
    mutedText: CSSProperties;
    ghostButton: CSSProperties;
  };
  launcherStyle: CSSProperties;
  onToggle: (nextOpen?: boolean) => void;
  children: ReactNode;
}) {
  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="Close customize panel"
          onClick={() => onToggle(false)}
          className="fixed inset-0 z-[58] bg-slate-950/28 backdrop-blur-[2px] transition-opacity duration-200"
        />
      ) : null}
      <div
        data-tour-id="tour-customize-button"
        className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 sm:bottom-5 sm:right-5"
      >
        <button
          type="button"
          onClick={() => onToggle()}
          aria-label="Customize your site"
          title="Customize your site"
          className="group flex h-14 w-14 items-center justify-center rounded-full border text-xl font-semibold shadow-[0_22px_50px_-26px_rgba(15,23,42,0.72)] transition duration-200 hover:-translate-y-1"
          style={launcherStyle}
        >
          <span aria-hidden="true">≡</span>
        </button>
      </div>
      <aside
        data-tour-id="tour-customize-panel"
        className={`fixed right-0 top-0 z-[59] h-screen w-full max-w-[28rem] transform border-l shadow-[0_28px_80px_-34px_rgba(15,23,42,0.72)] transition duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        style={appThemeStyles.strongSurface}
        aria-hidden={!isOpen}
      >
        <div className="flex h-full flex-col">
          <div
            className="flex items-start justify-between gap-4 border-b px-5 py-5"
            style={{ borderColor: appThemeStyles.surface.borderColor }}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={appThemeStyles.mutedText}>
                Customize Tool
              </p>
              <p className="mt-1 text-sm font-semibold">Theme, style, and palette</p>
              <p className="mt-1 text-xs leading-5" style={appThemeStyles.mutedText}>
                Adjust the look of the site without leaving the builder.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggle(false)}
              className="rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={appThemeStyles.ghostButton}
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        </div>
      </aside>
    </>
  );
}
