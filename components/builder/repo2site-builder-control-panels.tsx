"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { Repo2SiteThemeStyleMap } from "@/lib/repo2site-builder-theme";
import type { WalkthroughMode, WalkthroughStatus } from "@/lib/repo2site-walkthrough";

type AppThemeStyles = {
  strongSurface: CSSProperties;
  surface: CSSProperties;
  mutedText: CSSProperties;
  ghostButton: CSSProperties;
  chip: CSSProperties;
  inputSurface: CSSProperties;
  infoText: CSSProperties;
};

type AuthSummary = {
  provider: "github";
  username: string;
  displayName: string;
  avatarUrl: string;
  profileUrl: string;
} | null;

type WalkthroughPanelApi = {
  status: WalkthroughStatus;
  openWalkthrough: (mode: WalkthroughMode, restart?: boolean) => void;
  showLauncher: () => void;
};

export function Repo2SiteBuilderControlPanels({
  appThemeStyles,
  themeStyles,
  themeChoice,
  walkthrough,
  getTourHighlightProps,
  authSession,
  profileUrl,
  githubImportAutofillNotice,
  isGitHubSignInHelpOpen,
  isLoading,
  isEnhancing,
  isExporting,
  previewReady,
  modeToggleLabel,
  pendingAiSuggestionCount,
  hasOverrides,
  isQuickStartExpanded,
  featureBadges,
  onCycleAppTheme,
  onProfileUrlChange,
  onUseSamplePortfolio,
  onGeneratePortfolio,
  onResumeUploadChange,
  onToggleGitHubHelp,
  onSignOut,
  onEnhance,
  onAcceptAllAiSuggestions,
  onToggleEditMode,
  onToggleSharePanel,
  onToggleTemplatePanel,
  onExportZip,
  onResetOverrides,
  onToggleQuickStart,
  sharePanelContent,
  templatePanelContent,
  completenessPanelContent,
  enhanceError,
}: {
  appThemeStyles: AppThemeStyles;
  themeStyles: Repo2SiteThemeStyleMap;
  themeChoice: "system" | "light" | "dark";
  walkthrough: WalkthroughPanelApi;
  getTourHighlightProps: (targetId: string) => Record<string, string>;
  authSession: AuthSummary;
  profileUrl: string;
  githubImportAutofillNotice: string | null;
  isGitHubSignInHelpOpen: boolean;
  isLoading: boolean;
  isEnhancing: boolean;
  isExporting: boolean;
  previewReady: boolean;
  modeToggleLabel: string;
  pendingAiSuggestionCount: number;
  hasOverrides: boolean;
  isQuickStartExpanded: boolean;
  featureBadges: string[];
  onCycleAppTheme: () => void;
  onProfileUrlChange: (nextValue: string) => void;
  onUseSamplePortfolio: () => void;
  onGeneratePortfolio: () => void;
  onResumeUploadChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleGitHubHelp: () => void;
  onSignOut: () => void | Promise<void>;
  onEnhance: () => void | Promise<void>;
  onAcceptAllAiSuggestions: () => void;
  onToggleEditMode: () => void;
  onToggleSharePanel: () => void;
  onToggleTemplatePanel: () => void;
  onExportZip: () => void | Promise<void>;
  onResetOverrides: () => void;
  onToggleQuickStart: () => void;
  sharePanelContent: ReactNode;
  templatePanelContent: ReactNode;
  completenessPanelContent: ReactNode;
  enhanceError: string | null;
}) {
  return (
    <div {...getTourHighlightProps("tour-github-import")}>
      <div
        className="rounded-[1.45rem] border px-4 py-4 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.58)]"
        style={appThemeStyles.strongSurface}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={appThemeStyles.mutedText}>
              Build From GitHub
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[2rem]">
              Turn repositories, README context, and career materials into a portfolio draft.
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6" style={appThemeStyles.mutedText}>
              Start with GitHub, optionally add a resume, then review the draft in the live preview before exporting the final site.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                walkthrough.status === "in_progress"
                  ? walkthrough.openWalkthrough("quick")
                  : walkthrough.showLauncher()
              }
              className="rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition hover:-translate-y-0.5"
              style={appThemeStyles.ghostButton}
            >
              {walkthrough.status === "in_progress" ? "Resume Walkthrough" : "Walkthrough"}
            </button>
            <button
              type="button"
              onClick={onCycleAppTheme}
              className="rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition hover:-translate-y-0.5"
              style={appThemeStyles.ghostButton}
            >
              Theme: {themeChoice === "system" ? "System" : themeChoice === "light" ? "Light" : "Dark"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.9fr)]">
          <div className="rounded-[1.15rem] border p-4 sm:p-5" style={appThemeStyles.surface}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                  Primary Flow
                </p>
                <p className="mt-1 text-base font-semibold">Load a public GitHub profile to generate your draft.</p>
                <p className="mt-1 text-sm leading-6" style={appThemeStyles.mutedText}>
                  Paste a profile URL, create the first version, then refine it with editing, AI, and themes.
                </p>
              </div>
              <span
                className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={themeStyles.githubBadge}
              >
                Draft first
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                id="profile-url"
                type="url"
                aria-label="GitHub profile URL"
                required
                value={profileUrl}
                onChange={(event) => onProfileUrlChange(event.target.value)}
                placeholder="https://github.com/username"
                className="h-11 min-w-0 flex-1 rounded-full border px-4 text-sm outline-none transition"
                style={appThemeStyles.inputSurface}
                {...getTourHighlightProps("tour-github-input")}
              />
              <button
                type="button"
                onClick={onGeneratePortfolio}
                disabled={isLoading || isEnhancing}
                className="h-11 shrink-0 whitespace-nowrap rounded-full px-5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
                style={themeStyles.accentButton}
                {...getTourHighlightProps("tour-generate-portfolio")}
              >
                {isLoading ? "Generating..." : "Generate Portfolio"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onUseSamplePortfolio}
                className="rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                style={themeStyles.ghostButton}
                {...getTourHighlightProps("tour-sample-start")}
              >
                Use Sample Portfolio
              </button>
            </div>
            {githubImportAutofillNotice ? (
              <p className="mt-2 text-xs leading-5" style={appThemeStyles.infoText}>
                Signed in as @{githubImportAutofillNotice}. Profile link ready to import.
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] leading-5" style={appThemeStyles.mutedText}>
              <p>Entering a GitHub URL only stores it. Generation starts when you click Generate Portfolio.</p>
              <p>Upload a resume for stronger personalization and better grounding.</p>
            </div>
          </div>

          <div className="grid gap-3">
            <div {...getTourHighlightProps("tour-resume-upload")}>
              <div className="rounded-[1.1rem] border p-4" style={appThemeStyles.surface}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                  Optional Context
                </p>
                <p className="mt-1 text-sm font-medium">Add your resume before or after import.</p>
                <p className="mt-1 text-xs leading-5" style={appThemeStyles.mutedText}>
                  Resume details help Repo2Site shape stronger positioning and project summaries.
                </p>
                <label
                  className="mt-3 inline-flex rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                  style={themeStyles.ghostButton}
                >
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    onChange={onResumeUploadChange}
                    className="sr-only"
                  />
                  Upload Resume
                </label>
              </div>
            </div>

            <div className="rounded-[1.1rem] border p-4" style={appThemeStyles.surface}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                    Account Features
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {authSession ? `Signed in as @${authSession.username}.` : "Sign in stays optional."}
                  </p>
                  <p className="mt-1 text-xs leading-5" style={appThemeStyles.mutedText}>
                    Sign in to publish, share, and use account-backed features.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onToggleGitHubHelp}
                  aria-expanded={isGitHubSignInHelpOpen}
                  className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition hover:-translate-y-0.5"
                  style={appThemeStyles.ghostButton}
                >
                  Why sign in?
                </button>
              </div>
              {authSession ? (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="mt-3 inline-flex rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                  style={appThemeStyles.ghostButton}
                >
                  Sign Out @{authSession.username}
                </button>
              ) : (
                <a
                  href="/api/auth/github?returnTo=/builder"
                  className="mt-3 inline-flex rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                  style={appThemeStyles.ghostButton}
                >
                  Sign In with GitHub
                </a>
              )}
              {isGitHubSignInHelpOpen ? (
                <p className="mt-3 text-xs leading-5" style={appThemeStyles.mutedText}>
                  GitHub import still uses a public profile URL. Sign-in only connects publishing, sharing, and template activity to your account.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[1.1rem] border p-4" style={appThemeStyles.surface}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                Next Actions
              </p>
              <p className="mt-1 text-sm font-medium">Once the draft is loaded, refine, publish, and export from here.</p>
              <p className="mt-1 text-xs leading-5" style={appThemeStyles.mutedText}>
                AI suggestions stay pending until accepted. Export downloads only the finished portfolio site.
              </p>
            </div>
            <span
              className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={appThemeStyles.chip}
            >
              Secondary actions
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div {...getTourHighlightProps("tour-ai")}>
              <button
                type="button"
                onClick={onEnhance}
                disabled={!previewReady || isLoading || isEnhancing}
                className="rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                style={themeStyles.ghostButton}
              >
                {isEnhancing ? "Enhancing..." : "Enhance with AI"}
              </button>
            </div>
            {pendingAiSuggestionCount > 0 ? (
              <button
                type="button"
                onClick={onAcceptAllAiSuggestions}
                className="rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                style={themeStyles.ghostButton}
              >
                Accept All AI ({pendingAiSuggestionCount})
              </button>
            ) : null}
                  <div {...getTourHighlightProps("tour-open-editor")}>
                    <button
                      type="button"
                      onClick={onToggleEditMode}
                      className="rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                      style={themeStyles.ghostButton}
                      {...getTourHighlightProps("tour-preview-toggle")}
                    >
                      {modeToggleLabel}
                    </button>
                  </div>
            <div {...getTourHighlightProps("tour-browse-templates")}>
              <Link
                href="/templates"
                className="rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                style={themeStyles.ghostButton}
              >
                Browse Templates
              </Link>
            </div>
            <button
              type="button"
              onClick={onToggleSharePanel}
              disabled={!previewReady || isLoading}
              className="rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
              style={themeStyles.ghostButton}
            >
              Share Portfolio
            </button>
            <button
              type="button"
              onClick={onToggleTemplatePanel}
              disabled={!previewReady || isLoading}
              className="rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
              style={themeStyles.ghostButton}
            >
              Publish Template
            </button>
                  <div {...getTourHighlightProps("tour-export")}>
                    <button
                      type="button"
                      onClick={onExportZip}
                      disabled={!previewReady || isLoading || isEnhancing || isExporting}
                      className="rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                      style={themeStyles.ghostButton}
                      {...getTourHighlightProps("tour-publish-options")}
                    >
                      {isExporting ? "Exporting..." : "Download Portfolio ZIP"}
                    </button>
                  </div>
            <button
              type="button"
              onClick={onResetOverrides}
              disabled={!hasOverrides}
              className="rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
              style={themeStyles.accentButton}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-[1rem] border" style={appThemeStyles.surface}>
          <button
            type="button"
            onClick={onToggleQuickStart}
            className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                How This Works
              </p>
              <p className="mt-1 text-sm font-medium">New here? See the quick setup steps.</p>
              <p className="mt-1 text-xs leading-5" style={appThemeStyles.mutedText}>
                GitHub creates the draft, your edits shape it, and AI suggestions stay pending until accepted.
              </p>
            </div>
            <span
              className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
              style={appThemeStyles.ghostButton}
            >
              {isQuickStartExpanded ? "Hide" : "Show"}
            </span>
          </button>
          {isQuickStartExpanded ? (
            <div className="grid gap-3 border-t px-4 py-4" style={{ borderColor: appThemeStyles.surface.borderColor }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium">Follow this path if you are new to the builder.</p>
                <button
                  type="button"
                  onClick={() => walkthrough.openWalkthrough("quick", true)}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                  style={appThemeStyles.ghostButton}
                >
                  Restart Walkthrough
                </button>
              </div>
              <div className="grid gap-2 text-sm" style={appThemeStyles.mutedText}>
                <p><span className="font-semibold" style={{ color: appThemeStyles.surface.color }}>1.</span> Upload a resume if you want extra context for the builder.</p>
                <p><span className="font-semibold" style={{ color: appThemeStyles.surface.color }}>2.</span> Paste a public GitHub profile and click <span className="font-semibold" style={{ color: appThemeStyles.surface.color }}>Generate Portfolio</span>.</p>
                <p><span className="font-semibold" style={{ color: appThemeStyles.surface.color }}>3.</span> Use AI when you want help improving wording, structure, and presentation.</p>
                <p><span className="font-semibold" style={{ color: appThemeStyles.surface.color }}>4.</span> Open Edit to adjust content and section details directly.</p>
                <p><span className="font-semibold" style={{ color: appThemeStyles.surface.color }}>5.</span> Open Customize to change themes and colors.</p>
                <p><span className="font-semibold" style={{ color: appThemeStyles.surface.color }}>6.</span> Rearrange sections and projects to put the strongest work first.</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {featureBadges.map((badge) => (
            <span key={badge} className="rounded-full border px-3 py-1 text-xs font-medium" style={themeStyles.chip}>
              {badge}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm leading-6" style={themeStyles.mutedText}>
          Resume upload is the fastest way to improve personalization. Adding a resume gives AI stronger grounding for summaries, profile content, and portfolio copy.
        </p>
        <p className="mt-2 text-xs leading-5" style={themeStyles.mutedText}>
          New here? GitHub creates the first draft, your edits shape the final version, and AI suggestions stay pending until you approve them.
        </p>
        {sharePanelContent}
        {templatePanelContent}
        {completenessPanelContent}
        {enhanceError ? (
          <div className="mt-3 rounded-[1rem] border px-4 py-3 text-sm" style={themeStyles.accentBlock}>
            {enhanceError}
          </div>
        ) : null}
      </div>
    </div>
  );
}
