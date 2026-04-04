"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type {
  ChangeEvent,
  CSSProperties,
  DragEvent,
  FormEvent,
  MouseEvent,
  PointerEvent,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { useEffect, useRef, useState } from "react";
import { useAppTheme } from "@/components/app-theme-provider";
import {
  ActionLink,
  AutoResizeTextarea,
  CompactActionMenu,
  InlineActionButton,
  PaletteFieldControl,
  PreviewCanvasItemFrame,
  SourceBadge,
  TechBadge,
} from "@/components/builder/repo2site-builder-primitives";
import { Repo2SiteBuilderCanvas } from "@/components/builder/repo2site-builder-canvas";
import { Repo2SiteBuilderControlPanels } from "@/components/builder/repo2site-builder-control-panels";
import { Repo2SiteBuilderCustomizeTool } from "@/components/builder/repo2site-builder-customize-tool";
import { Repo2SiteBuilderWorkspacePanel } from "@/components/builder/repo2site-builder-workspace-panel";
import { useRepo2SiteCompanion } from "@/components/repo2site-companion-dock";
import {
  Repo2SiteGuidedTour,
  Repo2SiteWalkthroughLauncher,
} from "@/components/repo2site-guided-tour";
import { useRepo2SiteBuilderUiState, type BuilderInspectorTab } from "@/hooks/use-repo2site-builder-ui-state";
import { useRepo2SiteWalkthrough } from "@/hooks/use-repo2site-walkthrough";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { buildAppThemeStyles } from "@/lib/app-theme";
import { reportClientError } from "@/lib/monitoring";
import { buildRepo2SiteSectionModels } from "@/lib/repo2site-section-models";
import {
  buildShareSlug,
  createCustomSectionBlockId,
  createCustomProjectId,
  createCustomSectionId,
  createLayoutRowId,
  createLinkId,
  FALLBACK_ABOUT,
  FALLBACK_CONTACT,
  FALLBACK_HERO,
  FALLBACK_LINKS,
  FALLBACK_LINKS_SECTION,
  FALLBACK_REPOSITORIES,
  FALLBACK_TECH_STACK,
  FALLBACK_THEME,
  getInitialPortfolioColorMode,
  PALETTE_FIELD_LABELS,
  SECTION_CONTENT_HINTS,
} from "@/lib/repo2site-builder-constants";
import {
  buildRepo2SiteThemeStyles,
  type Repo2SiteThemeStyleMap,
} from "@/lib/repo2site-builder-theme";
import { REPO2SITE_LAYOUT_PRESETS } from "@/lib/repo2site-layout-presets";
import {
  buildPortfolioLayoutForMode,
  moveSectionPlacement,
  moveSectionRow,
  resolvePortfolioSectionRows,
} from "@/lib/repo2site-layout";
import {
  SECTION_MIN_WIDTH_RATIO,
  DEFAULT_CARD_LABELS,
  DEFAULT_SECTION_ORDER,
  applyEnhancementToOverrides,
  buildFinalPortfolio,
  buildLayoutComponents,
  canSectionShareRow,
  canSectionsShareRow,
  createEmptyOverrides,
  getCanvasSectionWidthRatio,
  getAllowedRowWidthRatios,
  getHiddenSectionsFromComponents,
  getSectionOrderFromComponents,
  normalizeExternalUrl,
  normalizeLayoutComponents,
  orderCanvasChildIds,
  snapRowWidthRatio,
} from "@/lib/portfolio";
import type { ContentSource, ResolvedPreviewRepository } from "@/lib/portfolio";
import { applyTemplateRecord, buildTemplatePreset } from "@/lib/template-presets";
import { PORTFOLIO_THEMES } from "@/lib/themes";
import { WALKTHROUGH_TARGET_ATTRIBUTE, type WalkthroughActionKind } from "@/lib/repo2site-walkthrough";
import type {
  EnrichmentSourceResult,
  EnrichmentSuggestion,
  GeneratePreviewResponse,
  PortfolioCanvasComponent,
  PortfolioCustomSectionBlock,
  PortfolioCustomProject,
  PortfolioEnhancement,
  PortfolioOverrides,
  PortfolioSectionId,
  PortfolioSectionType,
  PreviewTheme,
} from "@/lib/types";

type AuthSummary = {
  provider: "github";
  username: string;
  displayName: string;
  avatarUrl: string;
  profileUrl: string;
} | null;

const SAMPLE_URL = "https://github.com/vercel";
const SECTION_LAYOUT_DRAG_TYPE = "application/x-repo2site-section-layout";

function toCanvasKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

type ThemeStyleMap = Repo2SiteThemeStyleMap;

function isBuiltInSectionType(type: PortfolioSectionType): type is PortfolioSectionId {
  return ["hero", "about", "professional", "projects", "contact", "links"].includes(type);
}

function ProjectImagePreview({
  repository,
  themeStyles,
  compact = false,
  prominent = false,
}: {
  repository: ResolvedPreviewRepository;
  themeStyles: ThemeStyleMap;
  compact?: boolean;
  prominent?: boolean;
}) {
  if (!repository.resolvedImage) {
    return null;
  }

  return (
    <div
      className={`relative overflow-hidden rounded-[1.4rem] border ${
        compact ? "h-32" : prominent ? "h-64 xl:h-72" : "h-52"
      }`}
      style={themeStyles.strongSurface}
    >
      <img
        src={repository.resolvedImage.url}
        alt={repository.resolvedImage.alt}
        className="h-full w-full object-cover"
      />
      <div className="absolute left-3 top-3">
        <SourceBadge source={repository.resolvedImage.source} themeStyles={themeStyles} />
      </div>
    </div>
  );
}

function InlineEditableField({
  label,
  value,
  onChange,
  generatedValue,
  suggestedValue = "",
  activeSource = "github",
  placeholder,
  themeStyles,
  onReset,
  onApplySuggestion,
  onDismissSuggestion,
  editing,
  multiline = false,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  generatedValue: string;
  suggestedValue?: string;
  activeSource?: Exclude<ContentSource, "readme">;
  placeholder: string;
  themeStyles: ThemeStyleMap;
  onReset: () => void;
  onApplySuggestion?: () => void;
  onDismissSuggestion?: () => void;
  editing: boolean;
  multiline?: boolean;
  compact?: boolean;
}) {
  const source = value.trim() ? activeSource : "github";
  const generatedPreview = generatedValue.trim();
  const aiPreview = suggestedValue.trim();
  const hasManualValue = value.trim().length > 0;
  const hasGeneratedPreview = generatedPreview.length > 0;

  if (!editing) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2.5 rounded-[1rem] border border-transparent p-1">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
        <span style={themeStyles.mutedText}>{label}</span>
        <div className="flex items-center gap-2">
          <SourceBadge source={source} themeStyles={themeStyles} />
        </div>
      </div>
      {multiline ? (
        <AutoResizeTextarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={compact ? 2 : 4}
          placeholder={placeholder}
          className={`rounded-[0.95rem] border px-3 py-3 text-sm leading-7 outline-none transition ${compact ? "min-h-[72px]" : "min-h-[108px]"}`}
          style={themeStyles.strongSurface}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 rounded-[0.95rem] border px-3 text-sm outline-none transition"
          style={themeStyles.strongSurface}
        />
      )}
      {hasGeneratedPreview || hasManualValue ? (
        <div className="flex flex-wrap items-start justify-between gap-3 text-xs leading-5" style={themeStyles.mutedText}>
          <span className="min-w-0 flex-1 break-words">
            {hasManualValue
              ? "Manual edit active"
              : hasGeneratedPreview
                ? `Using GitHub copy: ${generatedPreview}`
                : ""}
          </span>
          {hasManualValue ? (
            <button type="button" onClick={onReset} className="shrink-0 font-semibold" style={{ color: themeStyles.githubBadge.color }}>
              Revert
            </button>
          ) : null}
        </div>
      ) : null}
      {aiPreview ? (
        <div className="rounded-[0.95rem] border px-3 py-3 text-xs leading-6" style={themeStyles.surface}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SourceBadge source="ai" themeStyles={themeStyles} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                Suggested revision
              </span>
            </div>
            <div className="flex items-center gap-3">
              {onApplySuggestion ? (
                <button
                  type="button"
                  onClick={onApplySuggestion}
                  className="font-semibold"
                  style={{ color: themeStyles.aiBadge.color }}
                >
                  Apply
                </button>
              ) : null}
              {onDismissSuggestion ? (
                <button
                  type="button"
                  onClick={onDismissSuggestion}
                  className="font-semibold"
                  style={{ color: themeStyles.githubBadge.color }}
                >
                  Hide
                </button>
              ) : null}
            </div>
          </div>
          <p className="mt-2 break-words">{aiPreview}</p>
        </div>
      ) : null}
    </div>
  );
}

function formatEnrichmentFieldLabel(field: EnrichmentSuggestion["field"]) {
  switch (field) {
    case "hero.headline":
      return "Hero headline";
    case "hero.subheadline":
      return "Hero intro";
    case "about.description":
      return "About copy";
    case "professional.summary":
      return "Professional summary";
    case "professional.company":
      return "Company";
    case "professional.location":
      return "Location";
    case "professional.availability":
      return "Availability";
    case "contact.email":
      return "Email";
    case "contact.phone":
      return "Phone";
    case "linksSection.resumeUrl":
      return "Resume link";
    case "linksSection.coverLetterUrl":
      return "Cover letter link";
    case "linksSection.linkedIn":
      return "LinkedIn link";
    case "linksSection.handshakeUrl":
      return "Handshake link";
    case "linksSection.portfolioUrl":
      return "Website link";
    case "linksSection.customLink":
      return "Custom link";
    default:
      return "Imported field";
  }
}

function applySectionLayoutMode(
  components: PortfolioCanvasComponent[],
  nextLayout: PortfolioOverrides["appearance"]["sectionLayout"],
) {
  return buildPortfolioLayoutForMode(components, nextLayout).map((component) =>
    component.widthRatio !== 1 && component.rowId?.includes("-")
      ? { ...component, rowId: createLayoutRowId() }
      : component,
  );
}

function getSectionContentLayout(component: PortfolioCanvasComponent) {
  const widthRatio = getCanvasSectionWidthRatio(component);
  const isSharedColumn = widthRatio < 0.999;
  const isNarrow = widthRatio <= 0.45;
  const isBalanced = widthRatio > 0.45 && widthRatio < 0.8;
  const isWide = widthRatio >= 0.8;
  const prefersSingleColumnCards = isNarrow || widthRatio < 0.55;
  const supportsDualContentColumns = widthRatio >= 0.82;

  return {
    widthRatio,
    isSharedColumn,
    isNarrow,
    isBalanced,
    isWide,
    prefersSingleColumnCards,
    supportsDualContentColumns,
  };
}

function buildProjectOrderBase(
  current: PortfolioOverrides,
  preview: GeneratePreviewResponse | null,
) {
  const seen = new Set<string>();
  const orderedNames: string[] = [];
  const baseRepositories = preview?.featuredRepositories ?? FALLBACK_REPOSITORIES;

  for (const repository of baseRepositories) {
    const name = repository.name.trim();

    if (!name || seen.has(name)) {
      continue;
    }

    seen.add(name);
    orderedNames.push(name);
  }

  for (const project of current.customProjects) {
    const name = project.name.trim();

    if (!name || seen.has(name)) {
      continue;
    }

    seen.add(name);
    orderedNames.push(name);
  }

  return current.layout.projectOrder.length > 0
    ? [
        ...current.layout.projectOrder.filter((name) => seen.has(name)),
        ...orderedNames.filter((name) => !current.layout.projectOrder.includes(name)),
      ]
    : orderedNames;
}

function getUniqueProjectName(
  desiredName: string,
  current: PortfolioOverrides,
  preview: GeneratePreviewResponse | null,
  excludeName?: string,
) {
  const normalizedBase = desiredName.trim() || "Custom Project";
  const existing = new Set(
    [
      ...(preview?.featuredRepositories ?? FALLBACK_REPOSITORIES).map((repository) => repository.name),
      ...current.customProjects.map((project) => project.name),
    ].filter((name) => name !== excludeName),
  );

  if (!existing.has(normalizedBase)) {
    return normalizedBase;
  }

  let suffix = 2;

  while (existing.has(`${normalizedBase} ${suffix}`)) {
    suffix += 1;
  }

  return `${normalizedBase} ${suffix}`;
}

function buildDefaultCustomSectionBlocks(): PortfolioCustomSectionBlock[] {
  return [
    {
      id: createCustomSectionBlockId(),
      type: "text",
      width: "full",
      label: "Overview",
      title: "Start here",
      text: "Add a custom story, achievement, testimonial, case study, or anything else you want this section to highlight.",
      imageUrl: "",
    },
  ];
}

function mergeEnrichmentResults(
  current: EnrichmentSourceResult[],
  incoming: EnrichmentSourceResult[],
) {
  const merged = new Map(current.map((source) => [source.sourceUrl, source]));

  for (const source of incoming) {
    merged.set(source.sourceUrl, source);
  }

  return Array.from(merged.values());
}

export function Repo2SiteShell() {
  const { renderTheme, themeChoice, setThemeChoice, isHydrated } = useAppTheme();
  const searchParams = useSearchParams();
  const initialPortfolioColorModeRef = useRef<PortfolioOverrides["appearance"]["colorMode"]>(
    getInitialPortfolioColorMode(),
  );
  const buildEmptyOverrides = () =>
    createEmptyOverrides({ colorMode: initialPortfolioColorModeRef.current });
  const [profileUrl, setProfileUrl] = useState(SAMPLE_URL);
  const [preview, setPreview] = useState<GeneratePreviewResponse | null>(null);
  const [overrides, setOverrides] = useState<PortfolioOverrides>(() => buildEmptyOverrides());
  const [error, setError] = useState<string | null>(null);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const builderUi = useRepo2SiteBuilderUiState();
  const {
    activeInspectorTab,
    cancelSectionRemoval,
    clearSectionRemoval,
    focusSection,
    isCustomizeOpen,
    isEditMode,
    isGitHubSignInHelpOpen,
    isQuickStartExpanded,
    isShareOpen,
    isWorkspaceExpanded,
    isTemplateOpen,
    pendingSectionRemovalId,
    requestSectionRemoval,
    selectedSectionId,
    setActiveInspectorTab,
    setHoveredSectionId,
    setSelectedSectionId,
    toggleCustomizePanel,
    toggleEditMode: toggleBuilderEditMode,
    toggleGitHubHelp,
    toggleQuickStart,
    toggleSharePanel,
    toggleTemplatePanel,
    toggleWorkspace,
    hoveredSectionId,
  } = builderUi;
  const [enrichmentInput, setEnrichmentInput] = useState("");
  const [uploadedResumeFiles, setUploadedResumeFiles] = useState<File[]>([]);
  const [enrichmentResults, setEnrichmentResults] = useState<EnrichmentSourceResult[]>([]);
  const [openProjectImports, setOpenProjectImports] = useState<Record<string, boolean>>({});
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dropTargetSectionId, setDropTargetSectionId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | "left" | "right" | null>(null);
  const [draggedChildComponentId, setDraggedChildComponentId] = useState<string | null>(null);
  const [dropTargetChildComponentId, setDropTargetChildComponentId] = useState<string | null>(null);
  const [draggedProjectName, setDraggedProjectName] = useState<string | null>(null);
  const [projectDropTargetName, setProjectDropTargetName] = useState<string | null>(null);
  const [resizingSectionIds, setResizingSectionIds] = useState<string[]>([]);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateCategory, setTemplateCategory] = useState("general");
  const [templateTags, setTemplateTags] = useState("");
  const [isPublishingTemplate, setIsPublishingTemplate] = useState(false);
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [shareSlug, setShareSlug] = useState("");
  const [sharedPortfolioUrl, setSharedPortfolioUrl] = useState("");
  const [shareImageUrl, setShareImageUrl] = useState("");
  const [shareCaption, setShareCaption] = useState("");
  const [sharePublishedAt, setSharePublishedAt] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);
  const [isPublishingShare, setIsPublishingShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareCaptionCopied, setShareCaptionCopied] = useState(false);
  const [shareAvailability, setShareAvailability] = useState<{
    available: boolean;
    reason: "available" | "owned" | "taken" | "invalid";
    normalizedSlug: string;
    suggestedSlug?: string;
  } | null>(null);
  const [isCheckingShareSlug, setIsCheckingShareSlug] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSummary>(null);
  const [githubImportAutofillNotice, setGitHubImportAutofillNotice] = useState<string | null>(null);
  const { triggerSpriteReaction } = useRepo2SiteCompanion();
  const resumeUploadInputRef = useRef<HTMLInputElement | null>(null);
  const heroImageInputRef = useRef<HTMLInputElement | null>(null);
  const shareSlugCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appliedTemplateSlugRef = useRef<string | null>(null);
  const aiAcceptedCountRef = useRef<number | null>(null);
  const lastGitHubAutofillUsernameRef = useRef<string | null>(null);
  const sectionResizeRef = useRef<{
    leftSectionId: string;
    rightSectionId: string;
    rowId: string;
    startX: number;
    rowWidth: number;
    leftStart: number;
    rightStart: number;
  } | null>(null);
  const hasResumeContext =
    uploadedResumeFiles.length > 0 ||
    Boolean(overrides.documents.resumeAssetUrl) ||
    Boolean(overrides.documents.coverLetterAssetUrl);
  const pendingAiSuggestionCount = countPendingAiSuggestions(overrides);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    setOverrides((current) => {
      if (current.appearance.colorMode !== initialPortfolioColorModeRef.current) {
        return current;
      }

      if (current.appearance.colorMode === renderTheme) {
        return current;
      }

      return {
        ...current,
        appearance: {
          ...current.appearance,
          colorMode: renderTheme,
        },
      };
    });
  }, [isHydrated, renderTheme]);

  useEffect(() => {
    let isCancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const result = (await response.json()) as { session: AuthSummary };

        if (!isCancelled) {
          setAuthSession(result.session);
        }
      } catch {
        if (!isCancelled) {
          setAuthSession(null);
        }
      }
    }

    void loadSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authSession?.username) {
      setGitHubImportAutofillNotice(null);
      return;
    }

    if (lastGitHubAutofillUsernameRef.current === authSession.username) {
      return;
    }

    if (profileUrl.trim()) {
      return;
    }

    const suggestedProfileUrl =
      authSession.profileUrl?.trim() || `https://github.com/${authSession.username}`;

    setProfileUrl(suggestedProfileUrl);
    setGitHubImportAutofillNotice(authSession.username);
    lastGitHubAutofillUsernameRef.current = authSession.username;
  }, [authSession, profileUrl]);

  useEffect(() => {
  if (!preview) {
      setShareSlug("");
      setSharedPortfolioUrl("");
      setShareImageUrl("");
      setShareCaption("");
      setSharePublishedAt("");
      setShareCopied(false);
      setShareCaptionCopied(false);
      setShareAvailability(null);
      return;
    }

    setShareSlug((current) => {
      if (current.trim()) {
        return current;
      }

      return buildShareSlug(preview.profile.username || preview.profile.name || "portfolio");
    });

    setTemplateTitle((current) => current || `${preview.profile.name || preview.profile.username} ${portfolio.theme.name} Template`);
    setTemplateDescription((current) =>
      current ||
      "A reusable Repo2Site layout preset that keeps your own GitHub content while applying this design system.",
    );
  }, [preview]);

  useEffect(() => {
    const templateSlug = searchParams.get("template");

    if (!templateSlug || appliedTemplateSlugRef.current === templateSlug) {
      return;
    }

    async function applyTemplateFromQuery() {
      try {
        const response = await fetch(`/api/templates/${templateSlug}`, {
          cache: "no-store",
        });
        const result = (await response.json()) as
          | {
              template: {
                slug: string;
                title: string;
                preset: ReturnType<typeof buildTemplatePreset>;
                exampleContent?: {
                  hero?: { headline: string; subheadline: string };
                  about?: { title: string; description: string };
                  professional?: { title: string; summary: string; availability: string };
                  contact?: { title: string; description: string; customText: string };
                  linksSection?: { title: string; description: string };
                };
              };
            }
          | { error: string };

        if (!response.ok || "error" in result) {
          return;
        }

        updateOverrides((current) => applyTemplateRecord(current, result.template));
        appliedTemplateSlugRef.current = templateSlug;
        setTemplateMessage(`Applied template: ${result.template.title}`);
        setTemplateError(null);
        trackAnalyticsEvent("Template Applied", {
          slug: result.template.slug,
          source: "query",
        });
        void fetch(`/api/templates/${templateSlug}/remix`, {
          method: "POST",
        });
        window.history.replaceState({}, "", "/builder");
      } catch {
        // ignore silent query failures so the builder still loads normally
      }
    }

    void applyTemplateFromQuery();
  }, [searchParams]);

  useEffect(() => {
    const authError = searchParams.get("authError");

    if (!authError) {
      return;
    }

    if (authError === "github_not_configured") {
      setError(
        "GitHub sign-in is not configured yet. Add GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and REPO2SITE_AUTH_SECRET to enable account-backed publishing.",
      );
      return;
    }

    if (authError === "invalid_state") {
      setError("GitHub sign-in could not be completed safely. Please try again.");
      return;
    }

    if (authError === "github_sign_in_failed") {
      setError("GitHub sign-in failed. Please try again in a moment.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isShareOpen || !preview || !shareSlug.trim()) {
      setIsCheckingShareSlug(false);
      return;
    }

    if (shareSlugCheckTimeoutRef.current) {
      clearTimeout(shareSlugCheckTimeoutRef.current);
    }

    setIsCheckingShareSlug(true);

    shareSlugCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/share?slug=${encodeURIComponent(shareSlug)}`);
        const result = (await response.json()) as
          | {
              available: boolean;
              reason: "available" | "owned" | "taken" | "invalid";
              normalizedSlug: string;
              suggestedSlug?: string;
            }
          | { error: string };

        if (!response.ok || "error" in result) {
          setShareAvailability(null);
          return;
        }

        setShareAvailability(result);
      } catch {
        setShareAvailability(null);
      } finally {
        setIsCheckingShareSlug(false);
      }
    }, 280);

    return () => {
      if (shareSlugCheckTimeoutRef.current) {
        clearTimeout(shareSlugCheckTimeoutRef.current);
      }
    };
  }, [isShareOpen, preview, shareSlug]);

  useEffect(() => {
    function handlePointerMove(event: globalThis.PointerEvent) {
      const resizeState = sectionResizeRef.current;

      if (!resizeState) {
        return;
      }

      const deltaRatio = (event.clientX - resizeState.startX) / resizeState.rowWidth;

      updateLayoutComponents((components) => {
        const leftComponent = components.find((component) => component.id === resizeState.leftSectionId);
        const rightComponent = components.find((component) => component.id === resizeState.rightSectionId);

        if (!leftComponent || !rightComponent) {
          return components;
        }

        if (
          !leftComponent.visible ||
          !rightComponent.visible ||
          !canSectionsShareRow(leftComponent, rightComponent) ||
          (leftComponent.rowId || leftComponent.id) !== resizeState.rowId ||
          (rightComponent.rowId || rightComponent.id) !== resizeState.rowId
        ) {
          return components;
        }

        const pairTotal = resizeState.leftStart + resizeState.rightStart;
        const rawLeft = Math.min(
          pairTotal - SECTION_MIN_WIDTH_RATIO,
          Math.max(SECTION_MIN_WIDTH_RATIO, resizeState.leftStart + deltaRatio),
        );
        const normalizedLeft = snapRowWidthRatio(rawLeft, leftComponent, rightComponent);
        const nextRight = 1 - normalizedLeft;

        return components.map((component) => {
          if ((component.rowId || component.id) !== resizeState.rowId || !canSectionShareRow(component)) {
            return component;
          }

          if (component.id === resizeState.leftSectionId) {
            return {
              ...component,
              widthRatio: normalizedLeft,
              width: undefined,
            };
          }

          if (component.id === resizeState.rightSectionId) {
            return {
              ...component,
              widthRatio: nextRight,
              width: undefined,
            };
          }

          return component;
        });
      });
    }

    function handlePointerUp() {
      stopSectionResize();
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [updateLayoutComponents]);

  useEffect(() => {
    function handleWindowError(event: ErrorEvent) {
      void reportClientError({
        message: event.message || "Unhandled browser error",
        stack: event.error instanceof Error ? event.error.stack : undefined,
        name: event.error instanceof Error ? event.error.name : "WindowError",
        pathname: window.location.pathname,
        metadata: {
          source: "window.error",
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
        },
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const reason =
        event.reason instanceof Error
          ? event.reason
          : new Error(typeof event.reason === "string" ? event.reason : "Unhandled promise rejection");

      void reportClientError({
        message: reason.message,
        stack: reason.stack,
        name: reason.name,
        pathname: window.location.pathname,
        metadata: {
          source: "window.unhandledrejection",
        },
      });
    }

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    const acceptedCount =
      Number(overrides.aiAccepted.heroHeadline) +
      Number(overrides.aiAccepted.heroSubheadline) +
      Number(overrides.aiAccepted.aboutDescription) +
      Number(overrides.aiAccepted.contactDescription) +
      Number(overrides.aiAccepted.professionalTitle) +
      Number(overrides.aiAccepted.professionalSummary) +
      Number(overrides.aiAccepted.linksDescription) +
      Object.values(overrides.aiAccepted.projectDescriptions).filter(Boolean).length;

    if (aiAcceptedCountRef.current !== null && acceptedCount > aiAcceptedCountRef.current) {
      triggerSpriteReaction("ai-accepted");
    }

    aiAcceptedCountRef.current = acceptedCount;
  }, [overrides.aiAccepted]);

  function revealInspector(nextTab?: BuilderInspectorTab) {
    if (nextTab) {
      setActiveInspectorTab(nextTab);
    }

    if (!isCustomizeOpen) {
      trackAnalyticsEvent("Customize Panel Opened");
    }

    toggleCustomizePanel(true);
  }

  function toggleEditMode(nextOpen?: boolean) {
    const willOpen = typeof nextOpen === "boolean" ? nextOpen : !isEditMode;

    if (willOpen && !isEditMode) {
      triggerSpriteReaction("editor-open");
    }

    toggleBuilderEditMode(nextOpen);
  }

  function stopSectionResize() {
    sectionResizeRef.current = null;
    setResizingSectionIds([]);
  }

  function startSectionResize(
    rowId: string,
    leftSectionId: string,
    rightSectionId: string,
    event: PointerEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (overrides.appearance.sectionLayout === "stacked") {
      return;
    }

    const leftComponent = overrides.layout.components.find((item) => item.id === leftSectionId);
    const rightComponent = overrides.layout.components.find((item) => item.id === rightSectionId);

    if (!leftComponent || !rightComponent || !canSectionsShareRow(leftComponent, rightComponent)) {
      return;
    }

    if ((leftComponent.rowId || leftComponent.id) !== rowId || (rightComponent.rowId || rightComponent.id) !== rowId) {
      return;
    }

    const rowElement = event.currentTarget.closest("[data-layout-row-id]");

    if (!(rowElement instanceof HTMLElement)) {
      return;
    }

    sectionResizeRef.current = {
      leftSectionId,
      rightSectionId,
      rowId,
      startX: event.clientX,
      rowWidth: Math.max(rowElement.getBoundingClientRect().width, 1),
      leftStart: getCanvasSectionWidthRatio(leftComponent),
      rightStart: getCanvasSectionWidthRatio(rightComponent),
    };
    setResizingSectionIds([leftSectionId, rightSectionId]);
  }

  function cycleAppTheme() {
    const nextTheme =
      themeChoice === "system" ? "light" : themeChoice === "light" ? "dark" : "system";

    setThemeChoice(nextTheme);
    triggerSpriteReaction("theme-change", nextTheme);
  }

  function handleProfileUrlChange(nextValue: string) {
    setProfileUrl(nextValue);

    if (githubImportAutofillNotice) {
      const signedInProfileUrl =
        authSession?.profileUrl?.trim() ||
        (authSession?.username ? `https://github.com/${authSession.username}` : "");

      if (nextValue.trim() !== signedInProfileUrl.trim()) {
        setGitHubImportAutofillNotice(null);
      }
    }
  }

  function getTourHighlightProps(targetId: string) {
    return {
      [WALKTHROUGH_TARGET_ATTRIBUTE]: targetId,
    };
  }

  function countPendingAiSuggestions(current: PortfolioOverrides) {
    let count = 0;

    if (current.hero.headlineSuggestion.trim()) count += 1;
    if (current.hero.subheadlineSuggestion.trim()) count += 1;
    if (current.aboutSuggestion.trim()) count += 1;
    if (current.contact.descriptionSuggestion.trim()) count += 1;
    if (current.professional.titleSuggestion.trim()) count += 1;
    if (current.professional.summarySuggestion.trim()) count += 1;
    if (current.linksSection.descriptionSuggestion.trim()) count += 1;

    for (const project of Object.values(current.projectOverrides)) {
      if (project.descriptionSuggestion.trim()) {
        count += 1;
      }
    }

    return count;
  }

  function acceptAllAiSuggestions() {
    updateOverrides((current) => {
      const nextProjectOverrides = { ...current.projectOverrides };

      for (const [name, project] of Object.entries(nextProjectOverrides)) {
        if (!project.descriptionSuggestion.trim()) {
          continue;
        }

        nextProjectOverrides[name] = {
          ...project,
          description: project.descriptionSuggestion,
          descriptionSuggestion: "",
          acceptedAi: true,
        };
      }

      return {
        ...current,
        hero: {
          ...current.hero,
          headline: current.hero.headlineSuggestion.trim() || current.hero.headline,
          headlineSuggestion: "",
          subheadline: current.hero.subheadlineSuggestion.trim() || current.hero.subheadline,
          subheadlineSuggestion: "",
        },
        about: {
          ...current.about,
          description: current.aboutSuggestion.trim() || current.about.description,
        },
        aboutSuggestion: "",
        contact: {
          ...current.contact,
          description: current.contact.descriptionSuggestion.trim() || current.contact.description,
          descriptionSuggestion: "",
        },
        professional: {
          ...current.professional,
          title: current.professional.titleSuggestion.trim() || current.professional.title,
          titleSuggestion: "",
          summary: current.professional.summarySuggestion.trim() || current.professional.summary,
          summarySuggestion: "",
        },
        projectOverrides: nextProjectOverrides,
        linksSection: {
          ...current.linksSection,
          description: current.linksSection.descriptionSuggestion.trim() || current.linksSection.description,
          descriptionSuggestion: "",
        },
        aiAccepted: {
          ...current.aiAccepted,
          heroHeadline: Boolean(current.hero.headlineSuggestion.trim() || current.aiAccepted.heroHeadline),
          heroSubheadline: Boolean(current.hero.subheadlineSuggestion.trim() || current.aiAccepted.heroSubheadline),
          aboutDescription: Boolean(current.aboutSuggestion.trim() || current.aiAccepted.aboutDescription),
          contactDescription: Boolean(current.contact.descriptionSuggestion.trim() || current.aiAccepted.contactDescription),
          professionalTitle: Boolean(current.professional.titleSuggestion.trim() || current.aiAccepted.professionalTitle),
          professionalSummary: Boolean(current.professional.summarySuggestion.trim() || current.aiAccepted.professionalSummary),
          linksDescription: Boolean(current.linksSection.descriptionSuggestion.trim() || current.aiAccepted.linksDescription),
          projectDescriptions: Object.fromEntries(
            Object.entries(nextProjectOverrides).map(([name, project]) => [
              name,
              project.acceptedAi || false,
            ]),
          ),
        },
      };
    });
  }

  async function loadPortfolioDraft(nextProfileUrl: string) {
    setIsLoading(true);
    setError(null);
    setEnhanceError(null);
    setEnrichError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profileUrl: nextProfileUrl }),
      });

      const result = (await response.json()) as
        | GeneratePreviewResponse
        | { error: string };

      if (!response.ok) {
        setPreview(null);
        setOverrides(buildEmptyOverrides());
        setError("error" in result ? result.error : "Something went wrong.");
        trackAnalyticsEvent("GitHub Import Failed", {
          stage: "response",
        });
        return;
      }

      if ("error" in result) {
        setPreview(null);
        setOverrides(buildEmptyOverrides());
        setError(result.error);
        trackAnalyticsEvent("GitHub Import Failed", {
          stage: "payload",
        });
        return;
      }

      setPreview(result);
      setOverrides((current) => {
        const reset = buildEmptyOverrides();

        return {
          ...reset,
          layout: {
            ...current.layout,
            projectOrder: [],
            hiddenProjectNames: [],
          },
          appearance: current.appearance,
          linksSection: {
            ...reset.linksSection,
            resumeUrl: current.linksSection.resumeUrl,
            coverLetterUrl: current.linksSection.coverLetterUrl,
          },
          documents: current.documents,
        };
      });
      toggleEditMode(false);
      trackAnalyticsEvent("GitHub Import Completed", {
        repositoryCount: result.featuredRepositories.length,
        techCount: result.techStack.length,
      });
    } catch {
      setPreview(null);
      setOverrides(buildEmptyOverrides());
      setError("Something went wrong while creating the preview.");
      trackAnalyticsEvent("GitHub Import Failed", {
        stage: "network",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGeneratePortfolio() {
    await loadPortfolioDraft(profileUrl);
  }

  async function handleUseSamplePortfolio() {
    setProfileUrl(SAMPLE_URL);
    await loadPortfolioDraft(SAMPLE_URL);
  }

  function updateOverrides(updater: (current: PortfolioOverrides) => PortfolioOverrides) {
    setOverrides((current) => updater(current));
  }

  async function handleEnhance() {
    if (!preview) {
      return;
    }

    setIsEnhancing(true);
    setEnhanceError(null);

    try {
      const response = await fetch("/api/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ draft: preview, overrides, enrichmentResults }),
      });

      const result = (await response.json()) as
        | { enhancement: PortfolioEnhancement; model: string }
        | { error: string };

      if (!response.ok || "error" in result) {
        setEnhanceError("error" in result ? result.error : "AI enhancement failed.");
        trackAnalyticsEvent("AI Enhance Failed");
        return;
      }

      setOverrides((current) =>
        applyEnhancementToOverrides(current, result.enhancement, preview.featuredRepositories),
      );
      trackAnalyticsEvent("AI Enhance Completed", {
        projectCount: preview.featuredRepositories.length,
      });
    } catch {
      setEnhanceError("Something went wrong while requesting AI suggestions.");
      trackAnalyticsEvent("AI Enhance Failed");
    } finally {
      setIsEnhancing(false);
    }
  }

  async function handleExportZip() {
    if (!preview) {
      return;
    }

    setIsExporting(true);

    try {
      const iframeName = "repo2site-export-download-frame";
      let iframe = document.querySelector(`iframe[name="${iframeName}"]`) as HTMLIFrameElement | null;

      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.name = iframeName;
        iframe.style.display = "none";
        document.body.appendChild(iframe);
      }

      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/export";
      form.target = iframeName;
      form.style.display = "none";

      const previewInput = document.createElement("input");
      previewInput.type = "hidden";
      previewInput.name = "preview";
      previewInput.value = JSON.stringify(preview);

      const overridesInput = document.createElement("input");
      overridesInput.type = "hidden";
      overridesInput.name = "overrides";
      overridesInput.value = JSON.stringify(overrides);

      form.appendChild(previewInput);
      form.appendChild(overridesInput);
      document.body.appendChild(form);
      form.submit();
      form.remove();
      triggerSpriteReaction("export");
      trackAnalyticsEvent("Portfolio Exported");
    } catch {
      setError("Something went wrong while exporting the portfolio ZIP.");
      trackAnalyticsEvent("Portfolio Export Failed");
    } finally {
      setIsExporting(false);
    }
  }

  async function handlePublishShareLink() {
    if (!preview) {
      return;
    }

    if (!authSession) {
      setShareError("Sign in with GitHub before publishing a public portfolio link.");
      return;
    }

    setIsPublishingShare(true);
    setShareError(null);

    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preview,
          overrides,
          slug: shareSlug.trim(),
        }),
      });

      const result = (await response.json()) as
        | {
            id: string;
            slug: string;
            path: string;
            updatedAt: string;
            publishedAt: string;
            metadata: {
              imageUrl: string;
              shareText: string;
            };
          }
        | { error: string };

      if (!response.ok || "error" in result) {
        setShareError("error" in result ? result.error : "Something went wrong while creating the public link.");
        trackAnalyticsEvent("Portfolio Share Failed");
        return;
      }

      const absoluteUrl = `${window.location.origin}${result.path}`;
      setShareSlug(result.slug);
      setSharedPortfolioUrl(absoluteUrl);
      setShareImageUrl(result.metadata.imageUrl);
      setShareCaption(result.metadata.shareText);
      setSharePublishedAt(result.publishedAt);
      setShareCopied(false);
      setShareCaptionCopied(false);
      trackAnalyticsEvent("Portfolio Shared", {
        slug: result.slug,
      });
    } catch {
      setShareError("Something went wrong while creating the public link.");
      trackAnalyticsEvent("Portfolio Share Failed");
    } finally {
      setIsPublishingShare(false);
    }
  }

  async function handleCopyShareLink() {
    if (!sharedPortfolioUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(sharedPortfolioUrl);
      setShareCopied(true);
      trackAnalyticsEvent("Portfolio Share Link Copied");
    } catch {
      setShareError("Copy did not work in this browser. You can still use the public link directly.");
    }
  }

  async function handleCopyShareCaption() {
    if (!shareCaption) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareCaption);
      setShareCaptionCopied(true);
      trackAnalyticsEvent("Portfolio Share Caption Copied");
    } catch {
      setShareError("Copy did not work in this browser. You can still select the share text manually.");
    }
  }

  async function handlePublishTemplate() {
    if (!preview) {
      return;
    }

    if (!authSession) {
      setTemplateError("Sign in with GitHub before publishing a community template.");
      setTemplateMessage(null);
      return;
    }

    setIsPublishingTemplate(true);
    setTemplateError(null);
    setTemplateMessage(null);

    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preview,
          overrides,
          title: templateTitle,
          description: templateDescription,
          category: templateCategory,
          tags: templateTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      const result = (await response.json()) as
        | {
            template: {
              title: string;
              slug: string;
            };
          }
        | { error: string };

      if (!response.ok || "error" in result) {
        setTemplateError("error" in result ? result.error : "Something went wrong while publishing the template.");
        return;
      }

      setTemplateMessage(`Published template: ${result.template.title}`);
      trackAnalyticsEvent("Template Published", {
        slug: result.template.slug,
      });
    } catch {
      setTemplateError("Something went wrong while publishing the template.");
    } finally {
      setIsPublishingTemplate(false);
    }
  }

  async function handleShareAnywhere() {
    if (!sharedPortfolioUrl || typeof navigator === "undefined" || !("share" in navigator)) {
      return;
    }

    try {
      await navigator.share({
        title: `${portfolio.hero.name} | Portfolio`,
        text: shareCaption || `Take a look at ${portfolio.hero.name}'s portfolio`,
        url: sharedPortfolioUrl,
      });
      trackAnalyticsEvent("Portfolio Shared Anywhere");
    } catch {
      // Ignore cancel/error because the panel still offers explicit fallback actions.
    }
  }

  function openPlatformFallback(url: string, analyticsEvent: string) {
    window.open(url, "_blank", "noopener,noreferrer");
    trackAnalyticsEvent(analyticsEvent);
  }

  async function handleEnrich() {
    const urls = enrichmentInput
      .split(/\r?\n|,/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (urls.length === 0 && uploadedResumeFiles.length === 0) {
      setEnrichError("Paste at least one public URL or upload at least one PDF resume or cover letter to import suggestions.");
      return;
    }

    setIsEnriching(true);
    setEnrichError(null);

    try {
      const hasFiles = uploadedResumeFiles.length > 0;
      const response = await fetch(
        "/api/enrich",
        hasFiles
          ? {
              method: "POST",
              body: (() => {
                const formData = new FormData();
                formData.set("urls", urls.join("\n"));
                for (const file of uploadedResumeFiles) {
                  formData.append("files", file);
                }
                return formData;
              })(),
            }
          : {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ urls }),
            },
      );

      const result = (await response.json()) as
        | { sources: EnrichmentSourceResult[] }
        | { error: string };

      if (!response.ok || "error" in result) {
        setEnrichError("error" in result ? result.error : "Import failed.");
        trackAnalyticsEvent("Profile Import Failed", {
          sourceCount: urls.length + uploadedResumeFiles.length,
        });
        return;
      }

      setEnrichmentResults((current) => mergeEnrichmentResults(current, result.sources));
      trackAnalyticsEvent("Profile Import Completed", {
        sourceCount: result.sources.length,
      });
    } catch {
      setEnrichError("Something went wrong while importing external profile data.");
      trackAnalyticsEvent("Profile Import Failed", {
        sourceCount: urls.length + uploadedResumeFiles.length,
      });
    } finally {
      setIsEnriching(false);
    }
  }

  async function importResumeFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }

    trackAnalyticsEvent("Resume Upload Started", {
      fileCount: files.length,
    });

    setUploadedResumeFiles(files);
    setIsEnriching(true);
    setEnrichError(null);

    try {
      const dataUrlEntries = await Promise.all(
        files.map(async (file) => ({
          file,
          dataUrl: await readFileAsDataUrl(file),
        })),
      );
      const resumeEntry = dataUrlEntries.find(({ file }) => !/cover[-_\s]?letter/i.test(file.name));
      const coverLetterEntry = dataUrlEntries.find(({ file }) => /cover[-_\s]?letter/i.test(file.name));

      updateOverrides((current) => ({
        ...current,
        documents: {
          ...current.documents,
          resumeAssetUrl: resumeEntry?.dataUrl ?? current.documents.resumeAssetUrl,
          resumeFileName: resumeEntry?.file.name ?? current.documents.resumeFileName,
          coverLetterAssetUrl:
            coverLetterEntry?.dataUrl ?? current.documents.coverLetterAssetUrl,
          coverLetterFileName:
            coverLetterEntry?.file.name ?? current.documents.coverLetterFileName,
        },
      }));

      const formData = new FormData();
      formData.set("urls", enrichmentInput.trim());

      for (const file of files) {
        formData.append("files", file);
      }

      const response = await fetch("/api/enrich", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as
        | { sources: EnrichmentSourceResult[] }
        | { error: string };

      if (!response.ok || "error" in result) {
        setEnrichError("error" in result ? result.error : "Import failed.");
        trackAnalyticsEvent("Resume Upload Failed", {
          fileCount: files.length,
        });
        return;
      }

      setEnrichmentResults((current) => mergeEnrichmentResults(current, result.sources));
      trackAnalyticsEvent("Resume Upload Completed", {
        fileCount: files.length,
      });
    } catch {
      setEnrichError("Something went wrong while importing external profile data.");
      trackAnalyticsEvent("Resume Upload Failed", {
        fileCount: files.length,
      });
    } finally {
      setIsEnriching(false);
    }
  }

  function handleResumeUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf"),
    );

    if ((event.target.files?.length ?? 0) > files.length) {
      setEnrichError("Only PDF resumes and cover letters are supported right now.");
    } else {
      setEnrichError(null);
    }

    if (files.length > 0) {
      void importResumeFiles(files);
    }

    event.target.value = "";
  }

  function removeUploadedResume(name: string) {
    setUploadedResumeFiles((current) => current.filter((file) => file.name !== name));
    setEnrichmentResults((current) =>
      current.filter((source) => source.sourceUrl !== `upload://${name}`),
    );
    updateOverrides((current) => {
      const isResume = current.documents.resumeFileName === name;
      const isCoverLetter = current.documents.coverLetterFileName === name;

      if (!isResume && !isCoverLetter) {
        return current;
      }

      return {
        ...current,
        documents: {
          ...current.documents,
          resumeAssetUrl: isResume ? "" : current.documents.resumeAssetUrl,
          resumeFileName: isResume ? "" : current.documents.resumeFileName,
          coverLetterAssetUrl: isCoverLetter ? "" : current.documents.coverLetterAssetUrl,
          coverLetterFileName: isCoverLetter ? "" : current.documents.coverLetterFileName,
        },
      };
    });
  }

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }

        reject(new Error("Unable to read file."));
      };
      reader.onerror = () => reject(reader.error ?? new Error("Unable to read file."));
      reader.readAsDataURL(file);
    });
  }

  function handleProjectImageUpload(repositoryName: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !file.type.startsWith("image/")) {
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";

      if (result) {
        setProjectImageOverride(repositoryName, result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function handleHeroImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !file.type.startsWith("image/")) {
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateOverrides((current) => ({
        ...current,
        hero: {
          ...current.hero,
          imageUrl: dataUrl,
        },
      }));
    } finally {
      event.target.value = "";
    }
  }

  function dismissEnrichmentSuggestion(sourceUrl: string, suggestionId: string) {
    setEnrichmentResults((current) =>
      current
        .map((source) =>
          source.sourceUrl === sourceUrl
            ? {
                ...source,
                suggestions: source.suggestions.filter((suggestion) => suggestion.id !== suggestionId),
              }
            : source,
        )
        .filter(
          (source) =>
            source.status === "failed" ||
            source.suggestions.length > 0 ||
            source.notes.length > 0 ||
            source.images.length > 0,
        ),
    );
  }

  function applyEnrichmentSuggestion(suggestion: EnrichmentSuggestion) {
    updateOverrides((current) => {
      switch (suggestion.field) {
        case "hero.headline":
          return { ...current, hero: { ...current.hero, headline: suggestion.value } };
        case "hero.subheadline":
          return { ...current, hero: { ...current.hero, subheadline: suggestion.value } };
        case "about.description":
          return { ...current, about: { ...current.about, description: suggestion.value } };
        case "professional.summary":
          return { ...current, professional: { ...current.professional, summary: suggestion.value } };
        case "professional.company":
          return { ...current, professional: { ...current.professional, company: suggestion.value } };
        case "professional.location":
          return { ...current, professional: { ...current.professional, location: suggestion.value } };
        case "professional.availability":
          return { ...current, professional: { ...current.professional, availability: suggestion.value } };
        case "contact.email":
          return { ...current, contact: { ...current.contact, email: suggestion.value } };
        case "contact.phone":
          return { ...current, contact: { ...current.contact, phone: suggestion.value } };
        case "linksSection.resumeUrl":
          return { ...current, linksSection: { ...current.linksSection, resumeUrl: suggestion.value } };
        case "linksSection.coverLetterUrl":
          return { ...current, linksSection: { ...current.linksSection, coverLetterUrl: suggestion.value } };
        case "linksSection.linkedIn":
          return { ...current, linksSection: { ...current.linksSection, linkedIn: suggestion.value } };
        case "linksSection.handshakeUrl":
          return { ...current, linksSection: { ...current.linksSection, handshakeUrl: suggestion.value } };
        case "linksSection.portfolioUrl":
          return { ...current, linksSection: { ...current.linksSection, portfolioUrl: suggestion.value } };
        case "linksSection.customLink": {
          const exists = current.linksSection.customLinks.some((link) => link.href === suggestion.value);

          if (exists) {
            return current;
          }

          return {
            ...current,
            linksSection: {
              ...current.linksSection,
              customLinks: [
                ...current.linksSection.customLinks,
                {
                  id: createLinkId(),
                  label: suggestion.auxiliaryLabel || "Imported Link",
                  href: suggestion.value,
                },
              ],
            },
          };
        }
        default:
          return current;
      }
    });

    dismissEnrichmentSuggestion(suggestion.sourceUrl, suggestion.id);
  }

  function updateCustomLink(linkId: string, key: "label" | "href", value: string) {
    updateOverrides((current) => ({
      ...current,
      linksSection: {
        ...current.linksSection,
        customLinks: current.linksSection.customLinks.map((link) =>
          link.id === linkId ? { ...link, [key]: value } : link,
        ),
      },
    }));
  }

  function addCustomLink() {
    updateOverrides((current) => ({
      ...current,
      linksSection: {
        ...current.linksSection,
        customLinks: [
          ...current.linksSection.customLinks,
          {
            id: createLinkId(),
            label: "",
            href: "",
          },
        ],
      },
    }));
  }

  function removeCustomLink(linkId: string) {
    updateOverrides((current) => ({
      ...current,
      linksSection: {
        ...current.linksSection,
        customLinks: current.linksSection.customLinks.filter((link) => link.id !== linkId),
      },
    }));
  }

  function updateCustomSection(
    sectionId: string,
    key: "title" | "description",
    value: string,
  ) {
    updateOverrides((current) => ({
      ...current,
      customSections: current.customSections.map((section) =>
        section.id === sectionId ? { ...section, [key]: value } : section,
      ),
    }));
  }

  function addCustomSectionBlock(sectionId: string, type: PortfolioCustomSectionBlock["type"]) {
    updateOverrides((current) => ({
      ...current,
      customSections: current.customSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              blocks: [
                ...section.blocks,
                {
                  id: createCustomSectionBlockId(),
                  type,
                  width: type === "image" ? "half" : "full",
                  label: type === "image" ? "Image" : "Text",
                  title: type === "image" ? "Visual" : "Subsection",
                  text: type === "image" ? "" : "Add supporting text here.",
                  imageUrl: "",
                },
              ],
            }
          : section,
      ),
    }));
  }

  function updateCustomSectionBlock(
    sectionId: string,
    blockId: string,
    key: keyof Pick<PortfolioCustomSectionBlock, "label" | "title" | "text" | "imageUrl" | "width">,
    value: string,
  ) {
    updateOverrides((current) => ({
      ...current,
      customSections: current.customSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              blocks: section.blocks.map((block) =>
                block.id === blockId ? { ...block, [key]: value } : block,
              ),
            }
          : section,
      ),
    }));
  }

  function removeCustomSectionBlock(sectionId: string, blockId: string) {
    updateOverrides((current) => ({
      ...current,
      customSections: current.customSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              blocks:
                section.blocks.filter((block) => block.id !== blockId).length > 0
                  ? section.blocks.filter((block) => block.id !== blockId)
                  : buildDefaultCustomSectionBlocks(),
            }
          : section,
      ),
    }));
  }

  function insertProjectIntoOrder(
    current: PortfolioOverrides,
    projectName: string,
    secondaryIndex?: number,
  ) {
    const baseOrder = buildProjectOrderBase(current, preview).filter((name) => name !== projectName);
    const insertionIndex =
      typeof secondaryIndex === "number"
        ? Math.max(1, Math.min(baseOrder.length, secondaryIndex + 1))
        : baseOrder.length;
    const nextOrder = [...baseOrder];
    nextOrder.splice(insertionIndex, 0, projectName);
    return nextOrder;
  }

  function addCustomProject(secondaryIndex?: number) {
    updateOverrides((current) => {
      const name = getUniqueProjectName("Custom Project", current, preview);
      const nextProject: PortfolioCustomProject = {
        id: createCustomProjectId(),
        name,
        description: "Describe what this project does and why it matters.",
        language: "Project",
        href: "",
        imageUrl: "",
      };

      return {
        ...current,
        customProjects: [...current.customProjects, nextProject],
        layout: {
          ...current.layout,
          projectOrder: insertProjectIntoOrder(current, name, secondaryIndex),
          hiddenProjectNames: current.layout.hiddenProjectNames.filter((projectName) => projectName !== name),
        },
      };
    });
  }

  function updateCustomProject(
    projectId: string,
    key: keyof Pick<PortfolioCustomProject, "name" | "description" | "language" | "href" | "imageUrl">,
    value: string,
  ) {
    const currentCustomProjectName = overrides.customProjects.find((entry) => entry.id === projectId)?.name ?? null;

    updateOverrides((current) => {
      const project = current.customProjects.find((entry) => entry.id === projectId);

      if (!project) {
        return current;
      }

      if (key !== "name") {
        return {
          ...current,
          customProjects: current.customProjects.map((entry) =>
            entry.id === projectId ? { ...entry, [key]: value } : entry,
          ),
        };
      }

      const nextName = getUniqueProjectName(value, current, preview, project.name);

      return {
        ...current,
        customProjects: current.customProjects.map((entry) =>
          entry.id === projectId ? { ...entry, name: nextName } : entry,
        ),
        projectOverrides: Object.fromEntries(
          Object.entries(current.projectOverrides).map(([projectName, override]) => [
            projectName === project.name ? nextName : projectName,
            override,
          ]),
        ),
        layout: {
          ...current.layout,
          projectOrder: current.layout.projectOrder.map((projectName) =>
            projectName === project.name ? nextName : projectName,
          ),
          hiddenProjectNames: current.layout.hiddenProjectNames.map((projectName) =>
            projectName === project.name ? nextName : projectName,
          ),
        },
        aiAccepted: {
          ...current.aiAccepted,
          projectDescriptions: Object.fromEntries(
            Object.entries(current.aiAccepted.projectDescriptions).map(([projectName, accepted]) => [
              projectName === project.name ? nextName : projectName,
              accepted,
            ]),
          ),
        },
      };
    });

    if (key === "name" && currentCustomProjectName) {
      setOpenProjectImports((current) => {
        if (!(currentCustomProjectName in current)) {
          return current;
        }

        const next = { ...current };
        delete next[currentCustomProjectName];
        return next;
      });
    }
  }

  function removeProjectFromSelectedWork(projectName: string) {
    const customProject = overrides.customProjects.find((project) => project.name === projectName);

    updateOverrides((current) => {
      const matchingCustomProject = current.customProjects.find((project) => project.name === projectName);

      if (matchingCustomProject) {
        const nextProjectOverrides = { ...current.projectOverrides };
        delete nextProjectOverrides[projectName];

        const nextAcceptedProjectDescriptions = { ...current.aiAccepted.projectDescriptions };
        delete nextAcceptedProjectDescriptions[projectName];

        return {
          ...current,
          customProjects: current.customProjects.filter((project) => project.name !== projectName),
          projectOverrides: nextProjectOverrides,
          layout: {
            ...current.layout,
            projectOrder: current.layout.projectOrder.filter((name) => name !== projectName),
            hiddenProjectNames: current.layout.hiddenProjectNames.filter((name) => name !== projectName),
          },
          aiAccepted: {
            ...current.aiAccepted,
            projectDescriptions: nextAcceptedProjectDescriptions,
          },
        };
      }

      if (current.layout.hiddenProjectNames.includes(projectName)) {
        return current;
      }

      return {
        ...current,
        layout: {
          ...current.layout,
          hiddenProjectNames: [...current.layout.hiddenProjectNames, projectName],
        },
      };
    });

    setOpenProjectImports((current) => {
      if (!(projectName in current)) {
        return current;
      }

      const next = { ...current };
      delete next[projectName];
      return next;
    });

    if (customProject && draggedProjectName === projectName) {
      setDraggedProjectName(null);
      setProjectDropTargetName(null);
    }
  }

  function restoreProjectToSelectedWork(projectName: string, secondaryIndex?: number) {
    updateOverrides((current) => ({
      ...current,
      layout: {
        ...current.layout,
        projectOrder: insertProjectIntoOrder(current, projectName, secondaryIndex),
        hiddenProjectNames: current.layout.hiddenProjectNames.filter((name) => name !== projectName),
      },
    }));
  }

  function setProjectImageOverride(repositoryName: string, imageUrl: string) {
    updateOverrides((current) => {
      const nextProjectOverrides = { ...current.projectOverrides };
      const existingOverride = current.projectOverrides[repositoryName];

      if (imageUrl.trim()) {
        nextProjectOverrides[repositoryName] = {
          imageUrl,
          hideImage: false,
          description: existingOverride?.description ?? "",
          descriptionSuggestion: existingOverride?.descriptionSuggestion ?? "",
          acceptedAi: existingOverride?.acceptedAi ?? false,
        };
      } else if (existingOverride?.description || existingOverride?.descriptionSuggestion) {
        nextProjectOverrides[repositoryName] = {
          imageUrl: "",
          hideImage: existingOverride?.hideImage ?? false,
          description: existingOverride.description,
          descriptionSuggestion: existingOverride.descriptionSuggestion,
          acceptedAi: existingOverride.acceptedAi,
        };
      } else {
        delete nextProjectOverrides[repositoryName];
      }

      return {
        ...current,
        projectOverrides: nextProjectOverrides,
      };
    });
  }

  function removeProjectImage(repositoryName: string) {
    updateOverrides((current) => {
      const nextProjectOverrides = { ...current.projectOverrides };
      const existingOverride = current.projectOverrides[repositoryName];

      const nextOverride = {
        imageUrl: "",
        hideImage: true,
        description: existingOverride?.description ?? "",
        descriptionSuggestion: existingOverride?.descriptionSuggestion ?? "",
        acceptedAi: existingOverride?.acceptedAi ?? false,
      };

      if (!nextOverride.description.trim() && !nextOverride.descriptionSuggestion.trim()) {
        nextProjectOverrides[repositoryName] = nextOverride;
      } else {
        nextProjectOverrides[repositoryName] = nextOverride;
      }

      return {
        ...current,
        projectOverrides: nextProjectOverrides,
      };
    });
  }

  function restoreDefaultProjectImage(repositoryName: string) {
    updateOverrides((current) => {
      const nextProjectOverrides = { ...current.projectOverrides };
      const existingOverride = current.projectOverrides[repositoryName];

      if (!existingOverride) {
        return current;
      }

      const nextOverride = {
        imageUrl: "",
        hideImage: false,
        description: existingOverride.description ?? "",
        descriptionSuggestion: existingOverride.descriptionSuggestion ?? "",
        acceptedAi: existingOverride.acceptedAi ?? false,
      };

      if (!nextOverride.description.trim() && !nextOverride.descriptionSuggestion.trim()) {
        delete nextProjectOverrides[repositoryName];
      } else {
        nextProjectOverrides[repositoryName] = nextOverride;
      }

      return {
        ...current,
        projectOverrides: nextProjectOverrides,
      };
    });
  }

  function setProjectDescriptionOverride(
    repositoryName: string,
    description: string,
    source: "user" | "ai" = "user",
  ) {
    updateOverrides((current) => {
      const nextProjectOverrides = { ...current.projectOverrides };
      const existingOverride = current.projectOverrides[repositoryName];
      const nextOverride = {
        imageUrl: existingOverride?.imageUrl ?? "",
        hideImage: existingOverride?.hideImage ?? false,
        description,
        descriptionSuggestion:
          source === "ai" ? "" : (existingOverride?.descriptionSuggestion ?? ""),
        acceptedAi: source === "ai",
      };

      if (
        !nextOverride.imageUrl.trim() &&
        !nextOverride.hideImage &&
        !nextOverride.description.trim() &&
        !nextOverride.descriptionSuggestion.trim()
      ) {
        delete nextProjectOverrides[repositoryName];
      } else {
        nextProjectOverrides[repositoryName] = nextOverride;
      }

      return {
        ...current,
        projectOverrides: nextProjectOverrides,
        aiAccepted: {
          ...current.aiAccepted,
          projectDescriptions: {
            ...current.aiAccepted.projectDescriptions,
            [repositoryName]: source === "ai",
          },
        },
      };
    });
  }

  function dismissProjectDescriptionSuggestion(repositoryName: string) {
    updateOverrides((current) => {
      const nextProjectOverrides = { ...current.projectOverrides };
      const existingOverride = current.projectOverrides[repositoryName];
      const nextOverride = {
        imageUrl: existingOverride?.imageUrl ?? "",
        hideImage: existingOverride?.hideImage ?? false,
        description: existingOverride?.description ?? "",
        descriptionSuggestion: "",
        acceptedAi: existingOverride?.acceptedAi ?? false,
      };

      if (!nextOverride.imageUrl.trim() && !nextOverride.hideImage && !nextOverride.description.trim()) {
        delete nextProjectOverrides[repositoryName];
      } else {
        nextProjectOverrides[repositoryName] = nextOverride;
      }

      return {
        ...current,
        projectOverrides: nextProjectOverrides,
      };
    });
  }

  function appendEnrichmentSource(nextSource: string) {
    setEnrichmentInput((current) => {
      const trimmed = nextSource.trim();

      if (!trimmed) {
        return current;
      }

      const existing = current
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean);

      if (existing.includes(trimmed)) {
        return current;
      }

      return existing.length > 0 ? `${current.trim()}\n${trimmed}` : trimmed;
    });
  }

  function toggleProjectImportPanel(repositoryName: string) {
    setOpenProjectImports((current) => ({
      ...current,
      [repositoryName]: !current[repositoryName],
    }));
  }

  function reorderProjects(draggedName: string, targetName: string) {
    updateOverrides((current) => {
      const baseOrder = buildProjectOrderBase(current, preview);
      const draggedIndex = baseOrder.indexOf(draggedName);
      const targetIndex = baseOrder.indexOf(targetName);

      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
        return current;
      }

      const nextOrder = [...baseOrder];
      const [draggedProject] = nextOrder.splice(draggedIndex, 1);
      nextOrder.splice(targetIndex, 0, draggedProject);

      return {
        ...current,
        layout: {
          ...current.layout,
          projectOrder: nextOrder,
        },
      };
    });
  }

  function insertProjectAtSecondaryIndex(projectName: string, secondaryIndex: number) {
    updateOverrides((current) => ({
      ...current,
      layout: {
        ...current.layout,
        projectOrder: insertProjectIntoOrder(current, projectName, secondaryIndex),
      },
    }));
  }

  function makeFeaturedProject(repositoryName: string) {
    const currentOrder =
      overrides.layout.projectOrder.length > 0
        ? overrides.layout.projectOrder
        : buildProjectOrderBase(overrides, preview);
    const remaining = currentOrder.filter((name) => name !== repositoryName);

    updateOverrides((current) => ({
      ...current,
      layout: {
        ...current.layout,
        projectOrder: [repositoryName, ...remaining],
      },
    }));
  }

  function handleProjectDragStart(repositoryName: string) {
    setDraggedProjectName(repositoryName);
    setProjectDropTargetName(null);
    triggerSpriteReaction("drag-start", repositoryName);
  }

  function handleProjectDragOver(repositoryName: string) {
    if (!draggedProjectName || draggedProjectName === repositoryName) {
      return;
    }

    setProjectDropTargetName(repositoryName);
  }

  function handleProjectDrop(repositoryName: string) {
    if (!draggedProjectName || draggedProjectName === repositoryName) {
      setDraggedProjectName(null);
      setProjectDropTargetName(null);
      return;
    }

    reorderProjects(draggedProjectName, repositoryName);
    setDraggedProjectName(null);
    setProjectDropTargetName(null);
  }

  function handleProjectDragEnd() {
    setDraggedProjectName(null);
    setProjectDropTargetName(null);
    triggerSpriteReaction("drag-end");
  }

  function updateLayoutComponents(
    updater: (components: PortfolioCanvasComponent[]) => PortfolioCanvasComponent[],
  ) {
    updateOverrides((current) => {
      const nextComponents = normalizeLayoutComponents(
        updater(
          normalizeLayoutComponents(
            current.layout.components,
            current.layout.sectionOrder,
            current.layout.hiddenSections,
          ),
        ),
        current.layout.sectionOrder,
        current.layout.hiddenSections,
      );

      return {
        ...current,
        layout: {
          ...current.layout,
          components: nextComponents,
          sectionOrder: getSectionOrderFromComponents(nextComponents),
          hiddenSections: getHiddenSectionsFromComponents(nextComponents),
          componentOrder: { ...current.layout.componentOrder },
          hiddenComponentIds: [...current.layout.hiddenComponentIds],
        },
      };
    });
  }

  function setSectionLayout(nextLayout: PortfolioOverrides["appearance"]["sectionLayout"]) {
    updateOverrides((current) => ({
      ...current,
      appearance: {
        ...current.appearance,
        sectionLayout: nextLayout,
      },
      layout: {
        ...current.layout,
        components: applySectionLayoutMode(current.layout.components, nextLayout),
      },
    }));
  }

  function updateChildComponentOrder(
    parentId: string,
    defaultIds: string[],
    updater: (ids: string[]) => string[],
  ) {
    updateOverrides((current) => {
      const baseOrder = orderCanvasChildIds(
        defaultIds,
        current.layout.componentOrder[parentId],
      );
      const nextOrder = orderCanvasChildIds(defaultIds, updater(baseOrder));

      return {
        ...current,
        layout: {
          ...current.layout,
          componentOrder: {
            ...current.layout.componentOrder,
            [parentId]: nextOrder,
          },
        },
      };
    });
  }

  function moveChildComponent(
    parentId: string,
    defaultIds: string[],
    componentId: string,
    direction: -1 | 1,
  ) {
    updateChildComponentOrder(parentId, defaultIds, (ids) => {
      const index = ids.indexOf(componentId);

      if (index === -1) {
        return ids;
      }

      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= ids.length) {
        return ids;
      }

      const next = [...ids];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function reorderChildComponent(
    parentId: string,
    defaultIds: string[],
    draggedId: string,
    targetId: string,
  ) {
    updateChildComponentOrder(parentId, defaultIds, (ids) => {
      const draggedIndex = ids.indexOf(draggedId);
      const targetIndex = ids.indexOf(targetId);

      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
        return ids;
      }

      const next = [...ids];
      const [item] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  }

  function setChildComponentVisible(componentId: string, visible: boolean) {
    updateOverrides((current) => {
      const nextHidden = new Set(current.layout.hiddenComponentIds);

      if (visible) {
        nextHidden.delete(componentId);
      } else {
        nextHidden.add(componentId);
      }

      return {
        ...current,
        layout: {
          ...current.layout,
          hiddenComponentIds: Array.from(nextHidden),
        },
      };
    });
  }

  function resetCanvasLayout() {
    updateOverrides((current) => ({
      ...current,
      layout: {
        ...current.layout,
        sectionOrder: [...DEFAULT_SECTION_ORDER],
        hiddenSections: [],
        components: [
          ...buildLayoutComponents(),
          ...current.customSections.map((section) => ({
            id: section.id,
            type: "custom" as const,
            visible: true,
            rowId: section.id,
            width: "full" as const,
            widthRatio: 1,
            title: section.title,
          })),
        ],
        componentOrder: {},
        hiddenComponentIds: [],
      },
    }));
  }

  function updateCustomPalette(
    key: keyof PreviewTheme["palette"],
    value: string,
  ) {
    updateOverrides((current) => ({
      ...current,
      appearance: {
        ...current.appearance,
        customPalette: {
          ...(current.appearance.customPalette ?? {}),
          [key]: value,
        },
      },
    }));
  }

  function resetCustomPaletteField(key: keyof PreviewTheme["palette"]) {
    updateOverrides((current) => {
      const nextPalette = { ...(current.appearance.customPalette ?? {}) };
      delete nextPalette[key];

      return {
        ...current,
        appearance: {
          ...current.appearance,
          customPalette: nextPalette,
        },
      };
    });
  }

  function clearCustomPalette() {
    updateOverrides((current) => ({
      ...current,
      appearance: {
        ...current.appearance,
        customPalette: {},
      },
    }));
  }

  function updateSectionOrder(sectionId: string, direction: -1 | 1) {
    updateLayoutComponents((components) =>
      moveSectionRow(components, overrides.appearance.sectionLayout, sectionId, direction),
    );
  }

  function toggleSectionVisibility(sectionId: string) {
    updateLayoutComponents((components) =>
      components.map((component) =>
        component.id === sectionId ? { ...component, visible: !component.visible } : component,
      ),
    );
  }

  function restoreSection(sectionId: string) {
    updateLayoutComponents((components) =>
      components.map((component) =>
        component.id === sectionId ? { ...component, visible: true } : component,
      ),
    );
  }

  function handleSectionDragStart(sectionId: string, event: DragEvent<HTMLElement>) {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(SECTION_LAYOUT_DRAG_TYPE, sectionId);
    setDraggedSectionId(sectionId);
    setDropTargetSectionId(null);
    setDropPosition(null);
    triggerSpriteReaction("drag-start", sectionId);
  }

  function handleSectionDragOver(event: DragEvent<HTMLElement>, sectionId: string) {
    if (!event.dataTransfer.types.includes(SECTION_LAYOUT_DRAG_TYPE)) {
      return;
    }

    if (!draggedSectionId || draggedSectionId === sectionId) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const targetComponent = overrides.layout.components.find((component) => component.id === sectionId);
    const draggedComponent = overrides.layout.components.find((component) => component.id === draggedSectionId);
    const relativeX = event.clientX - bounds.left;
    const relativeY = event.clientY - bounds.top;
    const horizontalDropAllowed =
      overrides.appearance.sectionLayout !== "stacked" &&
      targetComponent &&
      draggedComponent &&
      canSectionShareRow(targetComponent) &&
      canSectionShareRow(draggedComponent);

    const nextDropPosition =
      horizontalDropAllowed && relativeX <= bounds.width * 0.3
        ? "left"
        : horizontalDropAllowed && relativeX >= bounds.width * 0.7
          ? "right"
          : relativeY >= bounds.height / 2
            ? "after"
            : "before";
    setDropTargetSectionId(sectionId);
    setDropPosition(nextDropPosition);
  }

  function handleSectionDrop(sectionId: string, event: DragEvent<HTMLElement>) {
    if (!event.dataTransfer.types.includes(SECTION_LAYOUT_DRAG_TYPE)) {
      return;
    }

    if (!draggedSectionId || draggedSectionId === sectionId) {
      setDraggedSectionId(null);
      setDropTargetSectionId(null);
      setDropPosition(null);
      return;
    }

    updateLayoutComponents((components) =>
      moveSectionPlacement(
        components,
        overrides.appearance.sectionLayout,
        draggedSectionId,
        sectionId,
        dropPosition ?? "before",
      ),
    );

    setDraggedSectionId(null);
    setDropTargetSectionId(null);
    setDropPosition(null);
  }

  function handleSectionDragEnd() {
    setDraggedSectionId(null);
    setDropTargetSectionId(null);
    setDropPosition(null);
    triggerSpriteReaction("drag-end");
  }

  function stackSection(sectionId: string) {
    updateLayoutComponents((components) => {
      const currentRows = resolvePortfolioSectionRows(
        components.filter((component) => component.visible),
        overrides.appearance.sectionLayout,
      ).rows;
      const currentRow = currentRows.find((row) => row.items.some((component) => component.id === sectionId));

      if (!currentRow || !currentRow.isFlexible) {
        return components;
      }

      const rowSectionIds = new Set(currentRow.items.map((component) => component.id));

      return components.map((component) =>
        rowSectionIds.has(component.id)
          ? {
              ...component,
              rowId: component.id,
              width: "full",
              widthRatio: 1,
            }
          : component,
      );
    });
  }

  function adjustSectionWidth(sectionId: string, direction: "grow" | "shrink") {
    updateLayoutComponents((components) => {
      const visibleRows = resolvePortfolioSectionRows(
        components.filter((component) => component.visible),
        overrides.appearance.sectionLayout,
      ).rows;
      const row = visibleRows.find((candidate) => candidate.items.some((component) => component.id === sectionId));

      if (!row || !row.isFlexible || row.items.length !== 2) {
        return components;
      }

      const leftComponent = row.items[0];
      const rightComponent = row.items[1];
      const targetIsLeft = leftComponent.id === sectionId;
      const currentLeftRatio = getCanvasSectionWidthRatio(leftComponent);
      const targetRatio = targetIsLeft ? currentLeftRatio : 1 - currentLeftRatio;
      const allowedTargetRatios = targetIsLeft
        ? getAllowedRowWidthRatios(leftComponent, rightComponent)
        : getAllowedRowWidthRatios(leftComponent, rightComponent).map((ratio) => 1 - ratio);
      const sortedTargetRatios = [...allowedTargetRatios].sort((a, b) => a - b);
      const nextTargetRatio =
        direction === "grow"
          ? sortedTargetRatios.find((ratio) => ratio > targetRatio)
          : [...sortedTargetRatios].reverse().find((ratio) => ratio < targetRatio);

      if (typeof nextTargetRatio !== "number") {
        return components;
      }

      const nextLeftRatio = targetIsLeft ? nextTargetRatio : 1 - nextTargetRatio;

      return components.map((component) => {
        if ((component.rowId || component.id) !== row.id || !canSectionShareRow(component)) {
          return component;
        }

        if (component.id === leftComponent.id) {
          return {
            ...component,
            width: undefined,
            widthRatio: nextLeftRatio,
          };
        }

        if (component.id === rightComponent.id) {
          return {
            ...component,
            width: undefined,
            widthRatio: 1 - nextLeftRatio,
          };
        }

        return component;
      });
    });
  }

  function setSectionWidthPreset(sectionId: string, targetRatio: number) {
    updateLayoutComponents((components) => {
      const visibleRows = resolvePortfolioSectionRows(
        components.filter((component) => component.visible),
        overrides.appearance.sectionLayout,
      ).rows;
      const row = visibleRows.find((candidate) => candidate.items.some((component) => component.id === sectionId));

      if (!row || !row.isFlexible || row.items.length !== 2) {
        return components;
      }

      const leftComponent = row.items[0];
      const rightComponent = row.items[1];
      const nextLeftRatio = leftComponent.id === sectionId ? targetRatio : 1 - targetRatio;

      return components.map((component) => {
        if ((component.rowId || component.id) !== row.id || !canSectionShareRow(component)) {
          return component;
        }

        if (component.id === leftComponent.id) {
          return {
            ...component,
            width: undefined,
            widthRatio: nextLeftRatio,
          };
        }

        if (component.id === rightComponent.id) {
          return {
            ...component,
            width: undefined,
            widthRatio: 1 - nextLeftRatio,
          };
        }

        return component;
      });
    });
  }

  function placeSectionBeside(sectionId: string, direction: "previous" | "next") {
    if (overrides.appearance.sectionLayout === "stacked") {
      return;
    }

    updateLayoutComponents((components) => {
      const visibleComponents = components.filter((component) => component.visible);
      const rows = resolvePortfolioSectionRows(
        visibleComponents,
        overrides.appearance.sectionLayout,
      ).rows;
      const orderedVisibleIds = rows.flatMap((row) => row.items.map((component) => component.id));
      const currentIndex = orderedVisibleIds.indexOf(sectionId);

      if (currentIndex === -1) {
        return components;
      }

      const targetId =
        direction === "previous" ? orderedVisibleIds[currentIndex - 1] : orderedVisibleIds[currentIndex + 1];

      if (!targetId || targetId === sectionId) {
        return components;
      }
      return moveSectionPlacement(
        components,
        overrides.appearance.sectionLayout,
        sectionId,
        targetId,
        direction === "previous" ? "left" : "right",
      );
    });
  }

  function addBuiltInSection(sectionId: PortfolioSectionId) {
    restoreSection(sectionId);
    focusSection(sectionId);
  }

  function addCustomSection() {
    const sectionId = createCustomSectionId();
    const rowId = createLayoutRowId();

    updateOverrides((current) => ({
      ...current,
      customSections: [
        ...current.customSections,
        {
          id: sectionId,
          title: `Custom Section ${current.customSections.length + 1}`,
          description: "Add your own notes, skills, awards, or anything else you want to feature.",
          blocks: buildDefaultCustomSectionBlocks(),
        },
      ],
      layout: {
        ...current.layout,
        components: normalizeLayoutComponents([
          ...current.layout.components,
          {
            id: sectionId,
            type: "custom",
            visible: true,
            rowId,
            width: "full",
            widthRatio: 1,
            title: `Custom Section ${current.customSections.length + 1}`,
          },
        ]),
      },
    }));

    focusSection(sectionId);
  }

  function duplicateSection(sectionId: string) {
    const sourceSection = overrides.customSections.find((section) => section.id === sectionId);

    if (!sourceSection) {
      return;
    }

    const nextId = createCustomSectionId();
    const sourceLayout = overrides.layout.components.find((component) => component.id === sectionId);

    updateOverrides((current) => ({
      ...current,
      customSections: [
        ...current.customSections,
        {
          id: nextId,
          title: `${sourceSection.title} Copy`,
          description: sourceSection.description,
          blocks: (sourceSection.blocks ?? buildDefaultCustomSectionBlocks()).map((block) => ({
            ...block,
            id: createCustomSectionBlockId(),
          })),
        },
      ],
      layout: {
        ...current.layout,
        components: normalizeLayoutComponents([
          ...current.layout.components,
          {
            id: nextId,
            type: "custom",
            visible: true,
            rowId: createLayoutRowId(),
            width: sourceLayout?.width || "full",
            widthRatio: sourceLayout?.widthRatio || getCanvasSectionWidthRatio(sourceLayout ?? {
              id: nextId,
              type: "custom",
              visible: true,
            }),
            title: `${sourceSection.title} Copy`,
          },
        ]),
      },
    }));

    focusSection(nextId);
  }

  function removeSection(sectionId: string) {
    const component = overrides.layout.components.find((item) => item.id === sectionId);

    if (!component) {
      return;
    }

    if (component.type === "custom") {
      updateOverrides((current) => ({
        ...current,
        customSections: current.customSections.filter((section) => section.id !== sectionId),
        layout: {
          ...current.layout,
          components: current.layout.components.filter((item) => item.id !== sectionId),
        },
      }));

      if (selectedSectionId === sectionId) {
        setSelectedSectionId(null);
      }
      clearSectionRemoval(sectionId);
      return;
    }

    toggleSectionVisibility(sectionId);

    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
    }
    clearSectionRemoval(sectionId);
  }

  function handleChildDragStart(componentId: string) {
    setDraggedChildComponentId(componentId);
    setDropTargetChildComponentId(null);
    triggerSpriteReaction("drag-start", componentId);
  }

  function handleChildDragOver(componentId: string) {
    if (!draggedChildComponentId || draggedChildComponentId === componentId) {
      return;
    }

    setDropTargetChildComponentId(componentId);
  }

  function handleChildDrop(parentId: string, defaultIds: string[], componentId: string) {
    if (!draggedChildComponentId || draggedChildComponentId === componentId) {
      setDraggedChildComponentId(null);
      setDropTargetChildComponentId(null);
      return;
    }

    reorderChildComponent(parentId, defaultIds, draggedChildComponentId, componentId);
    setDraggedChildComponentId(null);
    setDropTargetChildComponentId(null);
  }

  function handleChildDragEnd() {
    setDraggedChildComponentId(null);
    setDropTargetChildComponentId(null);
    triggerSpriteReaction("drag-end");
  }

  const baseHero = preview?.hero ?? FALLBACK_HERO;
  const baseAbout = preview?.about ?? FALLBACK_ABOUT;
  const baseContact = preview?.contact ?? FALLBACK_CONTACT;
  const baseLinksSection = preview?.linksSection ?? FALLBACK_LINKS_SECTION;
  const baseRepositories = preview?.featuredRepositories ?? FALLBACK_REPOSITORIES;
  const portfolio = buildFinalPortfolio(preview, overrides, {
    theme: FALLBACK_THEME,
    hero: FALLBACK_HERO,
    about: FALLBACK_ABOUT,
    contact: FALLBACK_CONTACT,
    linksSection: FALLBACK_LINKS_SECTION,
    repositories: FALLBACK_REPOSITORIES,
    links: FALLBACK_LINKS,
    techStack: FALLBACK_TECH_STACK,
  });
  const theme = portfolio.theme;
  const sharedSectionModels = buildRepo2SiteSectionModels(portfolio);
  const appThemeStyles = buildAppThemeStyles(renderTheme);
  const themeStyles = buildRepo2SiteThemeStyles(
    theme,
    portfolio.appearance.cardStyle,
    portfolio.appearance.colorMode,
  );
  const isPreviewMode = Boolean(preview) && !isEditMode;
  const modeToggleLabel = preview
    ? isEditMode
      ? "Preview Mode"
      : "Editor Mode"
    : isEditMode
      ? "Hide Editor"
      : "Open Editor";
  const activePalette = theme.palette;
  const repositories = portfolio.repositories;
  const hiddenProjectNames = overrides.layout.hiddenProjectNames;
  const hiddenProjectOptions = buildProjectOrderBase(overrides, preview).filter((name) =>
    hiddenProjectNames.includes(name),
  );
  const links = portfolio.linksSection.links;
  const techStack = portfolio.techStack;
  const professional = portfolio.professional;
  const featuredProject = repositories[0];
  const secondaryProjects = repositories.slice(1);
  const featuredProjectHasImage = Boolean(featuredProject?.resolvedImage);
  const customProjectsByName = new Map(overrides.customProjects.map((project) => [project.name, project]));
  const projectLayoutMode = portfolio.appearance.projectsLayout;
  const projectOverflowSize = portfolio.appearance.projectsOverflowSize;
  const heroHeadline = portfolio.hero.headline;
  const heroSubheadline = portfolio.hero.subheadline;
  const aboutTitle = portfolio.about.title;
  const aboutDescription = portfolio.about.description;
  const contactTitle = portfolio.contact.title;
  const contactDescription = portfolio.contact.description;
  const linksTitle = portfolio.linksSection.title;
  const linksDescription = portfolio.linksSection.description;
  const contactEmail = portfolio.contact.email;
  const contactText = portfolio.contact.customText;
  const contactEmailHref = portfolio.contact.emailHref;
  const canUseNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function" && Boolean(sharedPortfolioUrl);
  const shareText =
    shareCaption ||
    [
      `${portfolio.hero.name}'s portfolio`,
      heroHeadline.value,
      featuredProject?.name ? `Featured project: ${featuredProject.name}` : "",
    ]
      .filter(Boolean)
      .join(" — ");
  const shareLinkedInHref = sharedPortfolioUrl
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(sharedPortfolioUrl)}`
    : "";
  const shareTwitterHref = sharedPortfolioUrl
    ? `https://twitter.com/intent/tweet?url=${encodeURIComponent(sharedPortfolioUrl)}&text=${encodeURIComponent(shareText)}`
    : "";
  const shareFacebookHref = sharedPortfolioUrl
    ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sharedPortfolioUrl)}`
    : "";
  const shareWhatsAppHref = sharedPortfolioUrl
    ? `https://wa.me/?text=${encodeURIComponent(`${shareText} ${sharedPortfolioUrl}`)}`
    : "";
  const shareTelegramHref = sharedPortfolioUrl
    ? `https://t.me/share/url?url=${encodeURIComponent(sharedPortfolioUrl)}&text=${encodeURIComponent(shareText)}`
    : "";
  const shareRedditHref = sharedPortfolioUrl
    ? `https://www.reddit.com/submit?url=${encodeURIComponent(sharedPortfolioUrl)}&title=${encodeURIComponent(`${portfolio.hero.name} | Portfolio`)}`
    : "";
  const shareEmailHref = sharedPortfolioUrl
    ? `mailto:?subject=${encodeURIComponent(`${portfolio.hero.name} | Portfolio`)}&body=${encodeURIComponent(`${shareText}\n\n${sharedPortfolioUrl}`)}`
    : "";
  const customizeLauncherStyle = {
    backgroundColor: theme.palette.accent,
    color: "#ffffff",
    borderColor:
      portfolio.appearance.colorMode === "dark"
        ? "rgba(255,255,255,0.9)"
        : "rgba(15,23,42,0.14)",
    boxShadow:
      portfolio.appearance.colorMode === "dark"
        ? `0 26px 60px -28px ${theme.palette.accent}`
        : `0 24px 52px -28px ${theme.palette.accent}`,
  } satisfies CSSProperties;
  const actionPriority = ["resume", "coverLetter", "linkedIn", "handshake", "portfolio", "github"] as const;
  const primaryProfessionalActions = professional.actions
    .filter((action) => action.id !== "email" && action.id !== "phone")
    .sort(
      (left, right) =>
        actionPriority.indexOf(left.id as (typeof actionPriority)[number]) -
        actionPriority.indexOf(right.id as (typeof actionPriority)[number]),
    );
  const heroActions = primaryProfessionalActions.slice(0, 4);
  const contactActionButtons = primaryProfessionalActions.filter((action) =>
    ["resume", "coverLetter", "linkedIn", "handshake"].includes(action.id),
  );
  const heroSummary = sharedSectionModels.hero.summary;
  const heroFocusAreas = techStack.slice(0, 6);
  const heroHighlights = sharedSectionModels.hero.highlightItems;
  const heroIntroText =
    heroSubheadline.value.trim() ||
    professional.summary ||
    preview?.profile.bio ||
    (preview ? portfolio.summary : FALLBACK_HERO.subheadline);
  const contactMethods = sharedSectionModels.contact.methods;
  const hasOverrides = JSON.stringify(overrides) !== JSON.stringify(buildEmptyOverrides());
  const completenessChecks = [
    Boolean(portfolio.hero.headline.value.trim() && heroIntroText.trim()),
    Boolean(aboutDescription.value.trim()),
    Boolean(professional.summary.trim()),
    Boolean(repositories.length >= 2),
    Boolean(primaryProfessionalActions.length > 0),
  ];
  const completenessScore = Math.round(
    (completenessChecks.filter(Boolean).length / completenessChecks.length) * 100,
  );
  const missingGuidance = [
    !aboutDescription.value.trim() ? "Add an About summary" : null,
    !professional.summary.trim() ? "Add career highlights" : null,
    repositories.length < 2 ? "Import more project context" : null,
    primaryProfessionalActions.length === 0 ? "Add professional links or documents" : null,
  ].filter(Boolean) as string[];
  const densityClasses =
    portfolio.appearance.density === "compact"
      ? {
          heroPadding: "px-5 py-6 sm:px-7 sm:py-8",
          sectionPadding: "px-5 py-5 sm:px-7 sm:py-7",
          cardPadding: "p-5 sm:p-6",
          stackGap: "gap-5",
        }
      : {
          heroPadding: "px-5 py-8 sm:px-8 sm:py-10",
          sectionPadding: "px-5 py-6 sm:px-8 sm:py-9",
          cardPadding: "p-6 sm:p-8",
          stackGap: "gap-6",
        };
  const splitAboutClass =
    portfolio.appearance.sectionLayout === "stacked"
      ? "grid gap-6"
      : "grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]";
  const canvasComponents = portfolio.layout.components;
  const hiddenSections = new Set(
    canvasComponents
      .filter((component) => !component.visible && isBuiltInSectionType(component.type))
      .map((component) => component.type),
  );
  const showHero = !hiddenSections.has("hero");
  const showAbout = !hiddenSections.has("about") && Boolean(aboutDescription.value.trim());
  const showProfessional =
    !hiddenSections.has("professional") &&
    Boolean(
      professional.summary ||
        professional.location ||
        professional.availability ||
        professional.actions.length > 1 ||
        isEditMode,
    );
  const showProjects = !hiddenSections.has("projects") && (repositories.length > 0 || isEditMode);
  const showLinks = !hiddenSections.has("links") && links.length > 0;
  const showContact =
    !hiddenSections.has("contact") &&
    Boolean(contactDescription.value.trim() || contactText || contactMethods.length > 0 || isEditMode);
  const showStack = techStack.length > 0;
  const hasProfileDetails = Boolean(
    professional.company || preview?.profile.company || professional.location || preview?.profile.location || isEditMode,
  );
  const visibleCanvasComponents = canvasComponents.filter((component) => {
    if (!component.visible) {
      return false;
    }

    if (component.type === "custom") {
      const customSection = overrides.customSections.find((section) => section.id === component.id);
      return Boolean(customSection?.title.trim() || customSection?.description.trim() || isEditMode);
    }

    switch (component.type) {
        case "hero":
          return showHero;
        case "about":
          return showAbout;
        case "professional":
          return showProfessional;
        case "projects":
          return showProjects;
        case "links":
          return showLinks;
        case "contact":
          return showContact;
        default:
          return false;
      }
  });
  const hiddenCanvasComponents = canvasComponents.filter((component) => !component.visible);
  const defaultAppearance = buildEmptyOverrides().appearance;
  const sectionLabels: Record<PortfolioSectionType, string> = {
    hero: "Hero",
    about: "About",
    professional: "Professional",
    projects: "Projects",
    links: "Links",
    contact: "Contact",
    custom: "Custom",
  };
  const visibleSectionRows = resolvePortfolioSectionRows(
    visibleCanvasComponents,
    portfolio.appearance.sectionLayout,
  ).rows;
  const selectedCanvasComponent =
    visibleCanvasComponents.find((component) => component.id === selectedSectionId) ??
    canvasComponents.find((component) => component.id === selectedSectionId) ??
    null;
  const selectedCustomSection =
    selectedCanvasComponent?.type === "custom"
      ? overrides.customSections.find((section) => section.id === selectedCanvasComponent.id) ?? null
      : null;

  const hiddenChildComponentIds = new Set(overrides.layout.hiddenComponentIds);
  const componentOrder = overrides.layout.componentOrder;
  const heroActionItems = heroActions.map((action) => ({
    id: `hero-action:${action.id}`,
    label: action.label,
    action,
  }));
  const professionalActionItems = professional.actions
    .filter((action) => action.id !== "github")
    .map((action) => ({
      id: `professional-action:${action.id}`,
      label: action.label,
      action,
    }));
  const contactActionItems = contactActionButtons.map((action) => ({
    id: `contact-action:${action.id}`,
    label: action.label,
    action,
  }));
  const linkCardItems = links.map((link, index) => ({
    id: `link-card:${toCanvasKey(link.label)}-${index}`,
    label: link.label,
    link,
  }));
  const contactMethodItems = contactMethods.map((item) => ({
    id: `contact-method:${toCanvasKey(item.label)}`,
    label: item.label,
    item,
  }));
  const heroHighlightItems = heroHighlights.map((item) => ({
    id: `hero-highlight:${toCanvasKey(item.label)}`,
    label: item.label,
    item,
  }));
  const heroStackItems = heroFocusAreas.map((item) => ({
    id: `hero-stack:${toCanvasKey(item)}`,
    label: item,
    value: item,
  }));
  const secondaryProjectItems = secondaryProjects.map((repository) => ({
    id: `project-card:${toCanvasKey(repository.name)}`,
    label: repository.name,
    repository,
  }));

  const heroLeftDefaultIds = ["hero:image", "hero:name", "hero:title", "hero:intro", "hero:actions"];
  const heroRightDefaultIds = ["hero:summary", "hero:highlights", "hero:stack"];
  const aboutDefaultIds = ["about:description", "about:profile"];
  const professionalDefaultIds = [
    "professional:heading",
    "professional:summary",
    "professional:company",
    "professional:location",
    "professional:availability",
    "professional:actions",
    "professional:imports",
  ];
  const contactDefaultIds = ["contact:heading", "contact:description", "contact:note", "contact:methods", "contact:actions"];
  const linksDefaultIds = ["links:heading", "links:description", "links:cards"];
  const projectsDefaultIds = ["projects:heading", "projects:featured-image", "projects:featured-header", "projects:featured-description", "projects:featured-meta", "projects:grid"];

  const orderedHeroLeftIds = orderCanvasChildIds(heroLeftDefaultIds, componentOrder["hero:left"]);
  const orderedHeroRightIds = orderCanvasChildIds(heroRightDefaultIds, componentOrder["hero:right"]);
  const orderedAboutIds = orderCanvasChildIds(aboutDefaultIds, componentOrder.about);
  const orderedProfessionalIds = orderCanvasChildIds(professionalDefaultIds, componentOrder.professional);
  const orderedContactIds = orderCanvasChildIds(contactDefaultIds, componentOrder.contact);
  const orderedLinksIds = orderCanvasChildIds(linksDefaultIds, componentOrder.links);
  const orderedProjectsIds = orderCanvasChildIds(projectsDefaultIds, componentOrder.projects);

  const orderedHeroActionIds = orderCanvasChildIds(
    heroActionItems.map((item) => item.id),
    componentOrder["hero:actions"],
  );
  const orderedHeroHighlightIds = orderCanvasChildIds(
    heroHighlightItems.map((item) => item.id),
    componentOrder["hero:highlights"],
  );
  const orderedHeroStackIds = orderCanvasChildIds(
    heroStackItems.map((item) => item.id),
    componentOrder["hero:stack:items"],
  );
  const orderedProfessionalActionIds = orderCanvasChildIds(
    professionalActionItems.map((item) => item.id),
    componentOrder["professional:actions"],
  );
  const orderedContactMethodIds = orderCanvasChildIds(
    contactMethodItems.map((item) => item.id),
    componentOrder["contact:methods"],
  );
  const orderedContactActionIds = orderCanvasChildIds(
    contactActionItems.map((item) => item.id),
    componentOrder["contact:actions"],
  );
  const orderedLinkCardIds = orderCanvasChildIds(
    linkCardItems.map((item) => item.id),
    componentOrder["links:cards"],
  );
  const orderedSecondaryProjectIds = orderCanvasChildIds(
    secondaryProjectItems.map((item) => item.id),
    componentOrder["projects:grid"],
  );

  const visibleHeroActionItems = orderedHeroActionIds
    .filter((id) => !hiddenChildComponentIds.has(id))
    .map((id) => heroActionItems.find((item) => item.id === id))
    .filter(Boolean) as typeof heroActionItems;
  const visibleHeroHighlightItems = orderedHeroHighlightIds
    .filter((id) => !hiddenChildComponentIds.has(id))
    .map((id) => heroHighlightItems.find((item) => item.id === id))
    .filter(Boolean) as typeof heroHighlightItems;
  const visibleHeroStackItems = orderedHeroStackIds
    .filter((id) => !hiddenChildComponentIds.has(id))
    .map((id) => heroStackItems.find((item) => item.id === id))
    .filter(Boolean) as typeof heroStackItems;
  const visibleProfessionalActionItems = orderedProfessionalActionIds
    .filter((id) => !hiddenChildComponentIds.has(id))
    .map((id) => professionalActionItems.find((item) => item.id === id))
    .filter(Boolean) as typeof professionalActionItems;
  const visibleContactMethodItems = orderedContactMethodIds
    .filter((id) => !hiddenChildComponentIds.has(id))
    .map((id) => contactMethodItems.find((item) => item.id === id))
    .filter(Boolean) as typeof contactMethodItems;
  const visibleContactActionItems = orderedContactActionIds
    .filter((id) => !hiddenChildComponentIds.has(id))
    .map((id) => contactActionItems.find((item) => item.id === id))
    .filter(Boolean) as typeof contactActionItems;
  const visibleLinkCardItems = orderedLinkCardIds
    .filter((id) => !hiddenChildComponentIds.has(id))
    .map((id) => linkCardItems.find((item) => item.id === id))
    .filter(Boolean) as typeof linkCardItems;
  const visibleSecondaryProjectItems = orderedSecondaryProjectIds
    .filter((id) => !hiddenChildComponentIds.has(id))
    .map((id) => secondaryProjectItems.find((item) => item.id === id))
    .filter(Boolean) as typeof secondaryProjectItems;
  const hybridProjectGridClass = "grid gap-4 md:grid-cols-2 md:auto-rows-fr";
  const hybridProjectTargetSlotCount = Math.min(
    6,
    Math.max(2, visibleSecondaryProjectItems.length + 1),
  );
  const hybridProjectPlaceholderCount =
    isEditMode && projectLayoutMode === "hybrid"
      ? hybridProjectTargetSlotCount - visibleSecondaryProjectItems.length
      : 0;
  const childComponentLabels: Record<string, string> = {
    "hero:image": "Hero image",
    "hero:name": "Hero name block",
    "hero:title": "Hero headline",
    "hero:intro": "Hero intro text",
    "hero:actions": "Hero actions row",
    "hero:summary": "Hero summary card",
    "hero:highlights": "Hero highlight cards",
    "hero:stack": "Hero stack block",
    "about:description": "About text block",
    "about:profile": "Profile details",
    "professional:heading": "Professional heading",
    "professional:summary": "Professional summary",
    "professional:company": "Company block",
    "professional:location": "Location block",
    "professional:availability": "Availability block",
    "professional:actions": "Professional actions",
    "professional:imports": "Professional import tools",
    "contact:heading": "Contact heading",
    "contact:description": "Contact intro text",
    "contact:note": "Contact custom note",
    "contact:methods": "Contact methods",
    "contact:actions": "Contact actions",
    "links:heading": "Links heading",
    "links:description": "Links intro text",
    "links:cards": "Link cards",
    "projects:heading": "Projects heading",
    "projects:featured-image": "Featured project image",
    "projects:featured-header": "Featured project header",
    "projects:featured-description": "Featured project description",
    "projects:featured-meta": "Featured project links and badges",
    "projects:grid": "Project grid",
    "hero:stack:items": "Hero stack badges",
    ...Object.fromEntries(heroActionItems.map((item) => [item.id, item.label])),
    ...Object.fromEntries(heroHighlightItems.map((item) => [item.id, item.label])),
    ...Object.fromEntries(heroStackItems.map((item) => [item.id, item.label])),
    ...Object.fromEntries(professionalActionItems.map((item) => [item.id, item.label])),
    ...Object.fromEntries(contactMethodItems.map((item) => [item.id, item.label])),
    ...Object.fromEntries(contactActionItems.map((item) => [item.id, item.label])),
    ...Object.fromEntries(linkCardItems.map((item) => [item.id, item.label])),
    ...Object.fromEntries(secondaryProjectItems.map((item) => [item.id, item.label])),
  };
  const childDefaultsByParent: Record<string, string[]> = {
    "hero:left": heroLeftDefaultIds,
    "hero:right": heroRightDefaultIds,
    about: aboutDefaultIds,
    professional: professionalDefaultIds,
    contact: contactDefaultIds,
    links: linksDefaultIds,
    projects: projectsDefaultIds,
    "hero:actions": heroActionItems.map((item) => item.id),
    "hero:highlights": heroHighlightItems.map((item) => item.id),
    "hero:stack:items": heroStackItems.map((item) => item.id),
    "professional:actions": professionalActionItems.map((item) => item.id),
    "contact:methods": contactMethodItems.map((item) => item.id),
    "contact:actions": contactActionItems.map((item) => item.id),
    "links:cards": linkCardItems.map((item) => item.id),
    "projects:grid": secondaryProjectItems.map((item) => item.id),
  };
  const childParentLabels: Record<string, string> = {
    "hero:left": "Hero left column",
    "hero:right": "Hero right column",
    about: "About section",
    professional: "Professional section",
    contact: "Contact section",
    links: "Links section",
    projects: "Projects section",
    "hero:actions": "Hero action buttons",
    "hero:highlights": "Hero highlight cards",
    "hero:stack:items": "Hero stack badges",
    "professional:actions": "Professional actions",
    "professional:imports": "Professional import tools",
    "professional:company": "Company block",
    "professional:location": "Location block",
    "professional:availability": "Availability block",
    "contact:heading": "Contact heading",
    "contact:description": "Contact intro text",
    "contact:note": "Contact custom note",
    "contact:methods": "Contact methods",
    "contact:actions": "Contact actions",
    "links:heading": "Links heading",
    "links:description": "Links intro text",
    "links:cards": "Link cards",
    "projects:featured-image": "Featured project image",
    "projects:featured-header": "Featured project header",
    "projects:featured-description": "Featured project description",
    "projects:featured-meta": "Featured project links and badges",
    "projects:grid": "Project cards",
  };
  const hiddenChildComponentGroups = Object.entries(childDefaultsByParent)
    .map(([parentId, ids]) => {
      const hiddenItems = orderCanvasChildIds(ids, componentOrder[parentId])
        .filter((id) => hiddenChildComponentIds.has(id))
        .map((id) => ({
          id,
          label: childComponentLabels[id] ?? id,
        }));

      return {
        parentId,
        label: childParentLabels[parentId] ?? parentId,
        items: hiddenItems,
      };
    })
    .filter((group) => group.items.length > 0);
  const hiddenSectionCount = hiddenCanvasComponents.length;
  const hiddenBlockCount = hiddenChildComponentGroups.reduce((count, group) => count + group.items.length, 0);
  const availableBuiltInSections = canvasComponents.filter(
    (
      component,
    ): component is PortfolioCanvasComponent & { type: PortfolioSectionId } =>
      isBuiltInSectionType(component.type) && !component.visible,
  );
  const selectedSectionLabel = selectedCanvasComponent
    ? selectedCanvasComponent.type === "custom"
      ? selectedCustomSection?.title || "Custom Section"
      : sectionLabels[selectedCanvasComponent.type]
    : "Nothing selected";
  const selectedSectionHint = selectedCanvasComponent
    ? SECTION_CONTENT_HINTS[selectedCanvasComponent.type]
    : "Select a section on the canvas to adjust layout, styling, and section settings here.";
  const customSectionTitles = Object.fromEntries(
    overrides.customSections.map((section) => [section.id, section.title || "Custom Section"]),
  );
  const featureBadges = [
    "GitHub + README aware",
    "Resume and profile imports",
    "Human-reviewed AI suggestions",
  ];
  const hasHeroEdit = Boolean(
    overrides.hero.headline.trim() ||
      overrides.hero.subheadline.trim() ||
      overrides.hero.headlineSuggestion.trim(),
  );
  const hasAboutEdit = Boolean(overrides.about.description.trim() || overrides.aboutSuggestion.trim());
  const hasProjectEdit = Object.values(overrides.projectOverrides).some(
    (project) =>
      Boolean(project.description.trim()) ||
      Boolean(project.descriptionSuggestion.trim()) ||
      Boolean(project.imageUrl.trim()),
  );
  const hasLayoutChange =
    getHiddenSectionsFromComponents(overrides.layout.components).length > 0 ||
    JSON.stringify(getSectionOrderFromComponents(overrides.layout.components)) !==
      JSON.stringify(DEFAULT_SECTION_ORDER) ||
    overrides.customSections.length > 0;
  const hasThemeChange =
    Boolean(overrides.appearance.themeId) ||
    Boolean(overrides.appearance.customPalette) ||
    overrides.appearance.density !== defaultAppearance.density ||
    overrides.appearance.cardStyle !== defaultAppearance.cardStyle ||
    overrides.appearance.colorMode !== defaultAppearance.colorMode;
  const walkthrough = useRepo2SiteWalkthrough({
    context: {
      hasPreview: Boolean(preview),
      hasResume: hasResumeContext,
      hasProjects: Boolean(preview?.featuredRepositories.length),
      hasPendingAiSuggestions: pendingAiSuggestionCount > 0,
      isCustomizeOpen,
      isEditMode,
      isPreviewMode,
      hasHeroEdit,
      hasAboutEdit,
      hasProjectEdit,
      hasLayoutChange,
      hasThemeChange,
    },
    onTrackEvent: trackAnalyticsEvent,
  });

  function handleWalkthroughAction(action: WalkthroughActionKind) {
    const heroSectionId = canvasComponents.find((component) => component.type === "hero")?.id ?? null;
    const aboutSectionId = canvasComponents.find((component) => component.type === "about")?.id ?? null;

    switch (action) {
      case "focus-github-input":
        window.setTimeout(() => {
          const input = document.getElementById("profile-url");
          if (input instanceof HTMLInputElement) {
            input.focus();
            input.select();
          }
        }, 0);
        break;
      case "open-edit-mode":
        toggleEditMode(true);
        break;
      case "focus-hero":
        toggleEditMode(true);
        if (heroSectionId) focusSection(heroSectionId);
        break;
      case "focus-about":
        toggleEditMode(true);
        if (aboutSectionId) focusSection(aboutSectionId);
        break;
      case "focus-workspace":
        toggleEditMode(true);
        if (selectedSectionId) {
          focusSection(selectedSectionId);
        }
        break;
      case "open-customize":
        revealInspector("theme");
        break;
      case "switch-preview-mode":
        toggleEditMode(false);
        break;
      case "return-to-editor":
        toggleEditMode(true);
        break;
      case "open-export":
        toggleEditMode(true);
        toggleSharePanel(true);
        break;
    }
  }

  function isCanvasChildVisible(componentId: string) {
    return !hiddenChildComponentIds.has(componentId);
  }


  function renderPreviewSection(component: PortfolioCanvasComponent) {
    const sectionContentLayout = getSectionContentLayout(component);

    if (component.type === "custom") {
      const customSection = overrides.customSections.find((section) => section.id === component.id);
      const customBlocks = customSection?.blocks ?? [];

      return (
        <div className={`rounded-[2rem] border ${densityClasses.sectionPadding} space-y-4`} style={themeStyles.surface}>
          <PreviewCanvasItemFrame
            label={customSection?.title || component.title || "Custom section"}
            themeStyles={themeStyles}
            isEditing={isEditMode}
          >
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.mutedText}>
                {customSection?.title || component.title || "Custom Section"}
              </p>
              {customSection?.description ? (
                <p className="text-sm leading-7 sm:text-base">
                  {customSection.description}
                </p>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                {customBlocks.map((block) => (
                  <div
                    key={block.id}
                    className={`min-w-0 rounded-[1.2rem] border p-4 ${block.width === "full" ? "md:col-span-2" : ""}`}
                    style={themeStyles.strongSurface}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={themeStyles.mutedText}>
                          {block.label || (block.type === "image" ? "Image" : "Text")}
                        </p>
                        {block.title ? (
                          <p className="mt-2 text-lg font-semibold tracking-tight">{block.title}</p>
                        ) : null}
                      </div>
                      {isEditMode ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateCustomSectionBlock(component.id, block.id, "width", block.width === "full" ? "half" : "full")
                            }
                            className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                            style={themeStyles.ghostButton}
                          >
                            {block.width === "full" ? "Half" : "Full"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCustomSectionBlock(component.id, block.id)}
                            className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                            style={themeStyles.ghostButton}
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {block.type === "image" ? (
                      <div className="mt-4 space-y-3">
                        {block.imageUrl ? (
                          <img
                            src={block.imageUrl}
                            alt={block.title || block.label || "Custom section image"}
                            className="w-full rounded-[1rem] border object-cover"
                            style={{ borderColor: themeStyles.surface.borderColor, maxHeight: block.width === "full" ? "24rem" : "18rem" }}
                          />
                        ) : (
                          <div className="flex min-h-[12rem] items-center justify-center rounded-[1rem] border border-dashed text-sm" style={themeStyles.surface}>
                            Add an image URL to show visual content here.
                          </div>
                        )}
                        {block.text ? (
                          <p className="break-words whitespace-pre-wrap text-sm leading-7" style={themeStyles.mutedText}>
                            {block.text}
                          </p>
                        ) : null}
                      </div>
                    ) : block.text ? (
                      <p className="mt-4 break-words whitespace-pre-wrap text-sm leading-7 sm:text-base">
                        {block.text}
                      </p>
                    ) : (
                      <p className="mt-4 text-sm leading-7 sm:text-base" style={themeStyles.mutedText}>
                        Add text here from the editor controls.
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {isEditMode ? (
                <div className="grid gap-3">
                  <input
                    value={customSection?.title || ""}
                    onChange={(event) => updateCustomSection(component.id, "title", event.target.value)}
                    placeholder="Section title"
                    className="h-11 rounded-[0.95rem] border px-3 text-sm outline-none transition"
                    style={themeStyles.strongSurface}
                  />
                  <textarea
                    value={customSection?.description || ""}
                    onChange={(event) => updateCustomSection(component.id, "description", event.target.value)}
                    rows={4}
                    placeholder="Describe the content for this custom section"
                    className="min-h-[108px] rounded-[0.95rem] border px-3 py-3 text-sm leading-7 outline-none transition"
                    style={themeStyles.strongSurface}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => addCustomSectionBlock(component.id, "text")}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                      style={themeStyles.accentButton}
                    >
                      Add Text Block
                    </button>
                    <button
                      type="button"
                      onClick={() => addCustomSectionBlock(component.id, "image")}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                      style={themeStyles.ghostButton}
                    >
                      Add Image Block
                    </button>
                  </div>
                  <div className="grid gap-3">
                    {customBlocks.map((block, index) => (
                      <div key={`editor-${block.id}`} className="grid gap-3 rounded-[1rem] border p-4" style={themeStyles.strongSurface}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                            Block {index + 1}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => updateCustomSectionBlock(component.id, block.id, "width", block.width === "full" ? "half" : "full")}
                              className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                              style={themeStyles.ghostButton}
                            >
                              {block.width === "full" ? "Half Width" : "Full Width"}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeCustomSectionBlock(component.id, block.id)}
                              className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                              style={themeStyles.ghostButton}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <input
                          value={block.label}
                          onChange={(event) => updateCustomSectionBlock(component.id, block.id, "label", event.target.value)}
                          placeholder="Block label"
                          className="h-11 rounded-[0.95rem] border px-3 text-sm outline-none transition"
                          style={themeStyles.surface}
                        />
                        <input
                          value={block.title}
                          onChange={(event) => updateCustomSectionBlock(component.id, block.id, "title", event.target.value)}
                          placeholder="Block title"
                          className="h-11 rounded-[0.95rem] border px-3 text-sm outline-none transition"
                          style={themeStyles.surface}
                        />
                        {block.type === "image" ? (
                          <>
                            <input
                              value={block.imageUrl}
                              onChange={(event) => updateCustomSectionBlock(component.id, block.id, "imageUrl", event.target.value)}
                              placeholder="https://example.com/image.png"
                              className="h-11 rounded-[0.95rem] border px-3 text-sm outline-none transition"
                              style={themeStyles.surface}
                            />
                            <textarea
                              value={block.text}
                              onChange={(event) => updateCustomSectionBlock(component.id, block.id, "text", event.target.value)}
                              rows={3}
                              placeholder="Optional caption or supporting note"
                              className="min-h-[88px] rounded-[0.95rem] border px-3 py-3 text-sm leading-7 outline-none transition"
                              style={themeStyles.surface}
                            />
                          </>
                        ) : (
                          <textarea
                            value={block.text}
                            onChange={(event) => updateCustomSectionBlock(component.id, block.id, "text", event.target.value)}
                            rows={4}
                            placeholder="Write the content for this subsection"
                            className="min-h-[108px] rounded-[0.95rem] border px-3 py-3 text-sm leading-7 outline-none transition"
                            style={themeStyles.surface}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </PreviewCanvasItemFrame>
        </div>
      );
    }

    const sectionId = component.type;
    const renderSecondaryProjectCard = (
      repository: ResolvedPreviewRepository,
      id: string,
      variant: "grid" | "stacked",
    ) => {
      const hasProjectImage = Boolean(repository.resolvedImage);

      return (
        <div
          key={id}
          className={`min-w-0 flex h-full flex-col rounded-[1.5rem] border p-5 transition ${draggedProjectName === repository.name ? "opacity-60" : ""}`}
          style={{
            ...themeStyles.projectCard,
            borderColor:
              projectDropTargetName === repository.name && draggedProjectName !== repository.name
                ? theme.palette.accent
                : themeStyles.projectCard.borderColor,
            boxShadow:
              projectDropTargetName === repository.name && draggedProjectName !== repository.name
                ? `0 0 0 1px ${theme.palette.accent}`
                : themeStyles.projectCard.boxShadow,
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            handleProjectDragOver(repository.name);
          }}
          onDrop={(event) => {
            event.preventDefault();
            handleProjectDrop(repository.name);
          }}
        >
          {hasProjectImage ? (
            <ProjectImagePreview repository={repository} themeStyles={themeStyles} compact={variant === "grid"} />
          ) : null}
          <div className={`mb-4 ${hasProjectImage ? "mt-5" : "mt-0"} h-1 w-14 rounded-full`} style={{ backgroundColor: theme.palette.accent }} />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <p className="break-words text-lg font-semibold leading-6">{repository.name}</p>
              <SourceBadge source={repository.descriptionSource} themeStyles={themeStyles} />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {isEditMode ? (
                <button
                  type="button"
                  onClick={() => removeProjectFromSelectedWork(repository.name)}
                  className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={themeStyles.ghostButton}
                >
                  Remove
                </button>
              ) : null}
              <button
                type="button"
                draggable
                onDragStart={(event) => {
                  event.stopPropagation();
                  handleProjectDragStart(repository.name);
                }}
                onDragEnd={handleProjectDragEnd}
                className="rounded-full border p-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={themeStyles.ghostButton}
                aria-label={`Drag ${repository.name}`}
                title={`Drag ${repository.name}`}
              >
                <span aria-hidden="true">⋮⋮</span>
              </button>
              {isEditMode ? (
                <button
                  type="button"
                  onClick={() => setChildComponentVisible(id, false)}
                  className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={themeStyles.ghostButton}
                >
                  Hide
                </button>
              ) : null}
            </div>
          </div>
          <p className={`flex-1 break-words whitespace-pre-wrap text-sm leading-7 ${hasProjectImage ? "mt-4" : "mt-5 text-base"}`} style={themeStyles.mutedText}>
            {repository.description}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="min-w-0">
              <TechBadge label={repository.language} themeStyles={themeStyles} compact />
            </div>
            <a href={repository.href} target="_blank" rel="noreferrer" className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.palette.accent }}>
              Open Project
            </a>
            <button
              type="button"
              onClick={() => makeFeaturedProject(repository.name)}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
              style={themeStyles.ghostButton}
            >
              Make Featured
            </button>
          </div>
          <InlineEditableField
            label={`${repository.name} description`}
            value={overrides.projectOverrides[repository.name]?.description ?? ""}
            onChange={(nextValue) => setProjectDescriptionOverride(repository.name, nextValue)}
            generatedValue={
              customProjectsByName.get(repository.name)?.description ??
              baseRepositories.find((item) => item.name === repository.name)?.description ??
              ""
            }
            suggestedValue={overrides.projectOverrides[repository.name]?.descriptionSuggestion ?? ""}
            activeSource={overrides.projectOverrides[repository.name]?.acceptedAi ? "ai" : "user"}
            placeholder="Shape this repository into a stronger portfolio case study"
            themeStyles={themeStyles}
            onApplySuggestion={() =>
              setProjectDescriptionOverride(
                repository.name,
                overrides.projectOverrides[repository.name]?.descriptionSuggestion ?? "",
                "ai",
              )
            }
            onDismissSuggestion={() => dismissProjectDescriptionSuggestion(repository.name)}
            onReset={() => setProjectDescriptionOverride(repository.name, "")}
            editing={isEditMode}
            multiline
            compact
          />
          {isEditMode && customProjectsByName.has(repository.name) ? (
            <div className="mt-4 grid gap-3 rounded-[1rem] border p-4" style={themeStyles.strongSurface}>
              <InlineEditableField
                label="Project title"
                value={customProjectsByName.get(repository.name)?.name ?? ""}
                onChange={(nextValue) =>
                  updateCustomProject(customProjectsByName.get(repository.name)!.id, "name", nextValue)
                }
                generatedValue=""
                placeholder="Custom project title"
                themeStyles={themeStyles}
                onReset={() =>
                  updateCustomProject(customProjectsByName.get(repository.name)!.id, "name", "")
                }
                editing={isEditMode}
                compact
              />
              <InlineEditableField
                label="Project summary"
                value={customProjectsByName.get(repository.name)?.description ?? ""}
                onChange={(nextValue) =>
                  updateCustomProject(customProjectsByName.get(repository.name)!.id, "description", nextValue)
                }
                generatedValue=""
                placeholder="Describe what this project does and why it matters"
                themeStyles={themeStyles}
                onReset={() =>
                  updateCustomProject(customProjectsByName.get(repository.name)!.id, "description", "")
                }
                editing={isEditMode}
                multiline
              />
              <InlineEditableField
                label="Project URL"
                value={customProjectsByName.get(repository.name)?.href ?? ""}
                onChange={(nextValue) =>
                  updateCustomProject(customProjectsByName.get(repository.name)!.id, "href", nextValue)
                }
                generatedValue=""
                placeholder="https://example.com/project"
                themeStyles={themeStyles}
                onReset={() =>
                  updateCustomProject(customProjectsByName.get(repository.name)!.id, "href", "")
                }
                editing={isEditMode}
                compact
              />
              <InlineEditableField
                label="Project language"
                value={customProjectsByName.get(repository.name)?.language ?? ""}
                onChange={(nextValue) =>
                  updateCustomProject(customProjectsByName.get(repository.name)!.id, "language", nextValue)
                }
                generatedValue=""
                placeholder="TypeScript"
                themeStyles={themeStyles}
                onReset={() =>
                  updateCustomProject(customProjectsByName.get(repository.name)!.id, "language", "")
                }
                editing={isEditMode}
                compact
              />
            </div>
          ) : null}
          {isEditMode ? (
            <div className="mt-4 grid gap-3 rounded-[1rem] border p-4" style={themeStyles.strongSurface}>
              {!hasProjectImage ? (
                <p className="text-xs leading-5" style={themeStyles.mutedText}>
                  No image yet. This card can stay text-first, or you can upload an image when you want a more visual layout.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <label className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.ghostButton}>
                  <input type="file" accept="image/*" className="sr-only" onChange={(event) => handleProjectImageUpload(repository.name, event)} />
                  Upload Image
                </label>
                <button type="button" onClick={() => toggleProjectImportPanel(repository.name)} className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.ghostButton}>
                  {openProjectImports[repository.name] ? "Hide Image Options" : "Image Options"}
                </button>
                <button type="button" onClick={() => removeProjectImage(repository.name)} className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.ghostButton}>
                  Remove Image
                </button>
              </div>
              {openProjectImports[repository.name] ? (
                <div className="grid gap-3">
                  <input
                    value={overrides.projectOverrides[repository.name]?.imageUrl ?? ""}
                    onChange={(event) => setProjectImageOverride(repository.name, event.target.value)}
                    placeholder="https://example.com/project-image.png"
                    className="h-11 rounded-[0.95rem] border px-3 text-sm outline-none transition"
                    style={themeStyles.surface}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => restoreDefaultProjectImage(repository.name)} className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.ghostButton}>
                      Use Default Image
                    </button>
                    {repository.readmeImages.map((imageUrl) => (
                      <button
                        key={imageUrl}
                        type="button"
                        onClick={() => setProjectImageOverride(repository.name, imageUrl)}
                        className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                        style={themeStyles.ghostButton}
                      >
                        Apply README Image
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      );
    };

    const renderProjectPlaceholder = (
      key: string,
      secondaryIndex: number,
      emptyMessage: string,
    ) => (
      <button
        key={key}
        type="button"
        onClick={() => addCustomProject(secondaryIndex)}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={(event) => {
          event.preventDefault();

          if (!draggedProjectName) {
            return;
          }

          insertProjectAtSecondaryIndex(draggedProjectName, secondaryIndex);
          setDraggedProjectName(null);
          setProjectDropTargetName(null);
        }}
        className="min-h-[23rem] rounded-[1.5rem] border border-dashed p-5 text-left transition hover:-translate-y-0.5"
        style={{
          borderColor: themeStyles.projectCard.borderColor,
          background:
            portfolio.appearance.colorMode === "dark"
              ? "rgba(15, 23, 42, 0.08)"
              : "rgba(148, 163, 184, 0.05)",
        }}
      >
        <div
          className="flex h-full flex-col rounded-[1rem] border border-dashed p-4"
          style={{ borderColor: themeStyles.projectCard.borderColor }}
        >
          <div
            className="h-1 w-14 rounded-full"
            style={{ backgroundColor: theme.palette.accent, opacity: 0.7 }}
          />
          <p
            className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={themeStyles.mutedText}
          >
            Open project slot
          </p>
          <p className="mt-2 text-sm leading-6" style={themeStyles.mutedText}>
            {emptyMessage}
          </p>
          <div className="mt-auto pt-4">
            <span
              className="inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
              style={themeStyles.ghostButton}
            >
              Add Project Here
            </span>
          </div>
        </div>
      </button>
    );

    switch (sectionId) {
      case "hero":
        return (
          <div className={`rounded-[2rem] border ${densityClasses.heroPadding}`} style={themeStyles.heroSurface}>
            <div
              className={
                sectionContentLayout.supportsDualContentColumns
                  ? "grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)] xl:items-stretch"
                  : "grid gap-6"
              }
            >
              <div className="space-y-6">
                {orderedHeroLeftIds.map((componentId) => {
                  if (!isCanvasChildVisible(componentId)) {
                    return null;
                  }

                  if (componentId === "hero:image") {
                    return (
                      <PreviewCanvasItemFrame
                        key={componentId}
                        label="Hero image"
                        themeStyles={themeStyles}
                        isEditing={isEditMode}
                        isDragging={draggedChildComponentId === componentId}
                        isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                        onDragStart={() => handleChildDragStart(componentId)}
                        onDragOver={() => handleChildDragOver(componentId)}
                        onDrop={() => handleChildDrop("hero:left", heroLeftDefaultIds, componentId)}
                        onDragEnd={handleChildDragEnd}
                        onRemove={() => setChildComponentVisible(componentId, false)}
                      >
                        <div className="space-y-3">
                          <div className="h-20 w-20 overflow-hidden rounded-[1.5rem] border shadow-sm sm:h-24 sm:w-24" style={themeStyles.strongSurface}>
                            {portfolio.hero.imageUrl ? (
                              <img src={portfolio.hero.imageUrl} alt={portfolio.hero.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold" style={themeStyles.accentBlock}>
                                GH
                              </div>
                            )}
                          </div>
                          {isEditMode ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                ref={heroImageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleHeroImageUpload}
                                className="sr-only"
                              />
                              <button
                                type="button"
                                onClick={() => heroImageInputRef.current?.click()}
                                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                                style={themeStyles.ghostButton}
                              >
                                Upload Hero Image
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateOverrides((current) => ({
                                    ...current,
                                    hero: {
                                      ...current.hero,
                                      imageUrl: "",
                                    },
                                  }))
                                }
                                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                                style={themeStyles.ghostButton}
                              >
                                Use GitHub Avatar
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </PreviewCanvasItemFrame>
                    );
                  }

                  if (componentId === "hero:name") {
                    return (
                      <PreviewCanvasItemFrame
                        key={componentId}
                        label="Hero name block"
                        themeStyles={themeStyles}
                        isEditing={isEditMode}
                        isDragging={draggedChildComponentId === componentId}
                        isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                        onDragStart={() => handleChildDragStart(componentId)}
                        onDragOver={() => handleChildDragOver(componentId)}
                        onDrop={() => handleChildDrop("hero:left", heroLeftDefaultIds, componentId)}
                        onDragEnd={handleChildDragEnd}
                        onRemove={() => setChildComponentVisible(componentId, false)}
                      >
                        <div>
                          <p className="mt-2 text-4xl tracking-tight sm:text-6xl" style={themeStyles.headline}>
                            {portfolio.hero.name}
                          </p>
                          <p className="mt-2 text-base sm:text-lg" style={themeStyles.mutedText}>
                            {preview?.profile.username ? `@${preview.profile.username}` : "@username"}
                          </p>
                        </div>
                      </PreviewCanvasItemFrame>
                    );
                  }

                  if (componentId === "hero:title") {
                    return (
                      <div key={componentId} {...getTourHighlightProps("tour-hero-headline")}>
                        <PreviewCanvasItemFrame
                          label="Hero headline"
                          themeStyles={themeStyles}
                          isEditing={isEditMode}
                          isDragging={draggedChildComponentId === componentId}
                          isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                          onDragStart={() => handleChildDragStart(componentId)}
                          onDragOver={() => handleChildDragOver(componentId)}
                          onDrop={() => handleChildDrop("hero:left", heroLeftDefaultIds, componentId)}
                          onDragEnd={handleChildDragEnd}
                          onRemove={() => setChildComponentVisible(componentId, false)}
                        >
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              {isEditMode ? (
                                <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={themeStyles.surface}>
                                  Edit
                                </span>
                              ) : null}
                              <SourceBadge source={heroHeadline.source} themeStyles={themeStyles} />
                            </div>
                            <p className="max-w-4xl break-words text-3xl leading-[1.04] tracking-tight sm:text-[3.6rem]">{heroHeadline.value}</p>
                            <InlineEditableField
                              label="Hero headline"
                              value={overrides.hero.headline}
                              onChange={(nextValue) =>
                                updateOverrides((current) => ({
                                  ...current,
                                  hero: { ...current.hero, headline: nextValue },
                                  aiAccepted: { ...current.aiAccepted, heroHeadline: false },
                                }))
                              }
                              generatedValue={baseHero.headline}
                              suggestedValue={overrides.hero.headlineSuggestion}
                              activeSource={overrides.aiAccepted.heroHeadline ? "ai" : "user"}
                              placeholder="Add a sharper headline"
                              themeStyles={themeStyles}
                              onApplySuggestion={() =>
                                updateOverrides((current) => ({
                                  ...current,
                                  hero: {
                                    ...current.hero,
                                    headline: current.hero.headlineSuggestion,
                                    headlineSuggestion: "",
                                  },
                                  aiAccepted: { ...current.aiAccepted, heroHeadline: true },
                                }))
                              }
                              onDismissSuggestion={() =>
                                updateOverrides((current) => ({
                                  ...current,
                                  hero: { ...current.hero, headlineSuggestion: "" },
                                }))
                              }
                              onReset={() =>
                                updateOverrides((current) => ({
                                  ...current,
                                  hero: { ...current.hero, headline: "" },
                                  aiAccepted: { ...current.aiAccepted, heroHeadline: false },
                                }))
                              }
                              editing={isEditMode}
                            />
                          </div>
                        </PreviewCanvasItemFrame>
                      </div>
                    );
                  }

                  if (componentId === "hero:intro") {
                    return (
                      <PreviewCanvasItemFrame
                        key={componentId}
                        label="Hero intro text"
                        themeStyles={themeStyles}
                        isEditing={isEditMode}
                        isDragging={draggedChildComponentId === componentId}
                        isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                        onDragStart={() => handleChildDragStart(componentId)}
                        onDragOver={() => handleChildDragOver(componentId)}
                        onDrop={() => handleChildDrop("hero:left", heroLeftDefaultIds, componentId)}
                        onDragEnd={handleChildDragEnd}
                        onRemove={() => setChildComponentVisible(componentId, false)}
                      >
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <SourceBadge source={heroSubheadline.source} themeStyles={themeStyles} />
                          </div>
                          <p className="max-w-3xl break-words whitespace-pre-wrap text-base leading-7 sm:text-lg sm:leading-8" style={themeStyles.mutedText}>
                            {heroIntroText}
                          </p>
                          <InlineEditableField
                            label="Hero intro"
                            value={overrides.hero.subheadline}
                            onChange={(nextValue) =>
                              updateOverrides((current) => ({
                                ...current,
                                hero: { ...current.hero, subheadline: nextValue },
                                aiAccepted: { ...current.aiAccepted, heroSubheadline: false },
                              }))
                            }
                            generatedValue={baseHero.subheadline}
                            suggestedValue={overrides.hero.subheadlineSuggestion}
                            activeSource={overrides.aiAccepted.heroSubheadline ? "ai" : "user"}
                            placeholder="Describe the work you want this site to emphasize"
                            themeStyles={themeStyles}
                            onApplySuggestion={() =>
                              updateOverrides((current) => ({
                                ...current,
                                hero: {
                                  ...current.hero,
                                  subheadline: current.hero.subheadlineSuggestion,
                                  subheadlineSuggestion: "",
                                },
                                aiAccepted: { ...current.aiAccepted, heroSubheadline: true },
                              }))
                            }
                            onDismissSuggestion={() =>
                              updateOverrides((current) => ({
                                ...current,
                                hero: { ...current.hero, subheadlineSuggestion: "" },
                              }))
                            }
                            onReset={() =>
                              updateOverrides((current) => ({
                                ...current,
                                hero: { ...current.hero, subheadline: "" },
                                aiAccepted: { ...current.aiAccepted, heroSubheadline: false },
                              }))
                            }
                            editing={isEditMode}
                            multiline
                          />
                        </div>
                      </PreviewCanvasItemFrame>
                    );
                  }

                  if (componentId === "hero:actions") {
                    return (
                      <PreviewCanvasItemFrame
                        key={componentId}
                        label="Hero actions"
                        themeStyles={themeStyles}
                        isEditing={isEditMode}
                        isDragging={draggedChildComponentId === componentId}
                        isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                        onDragStart={() => handleChildDragStart(componentId)}
                        onDragOver={() => handleChildDragOver(componentId)}
                        onDrop={() => handleChildDrop("hero:left", heroLeftDefaultIds, componentId)}
                        onDragEnd={handleChildDragEnd}
                        onRemove={() => setChildComponentVisible(componentId, false)}
                      >
                        <div
                          className={
                            sectionContentLayout.isNarrow
                              ? "grid gap-3"
                              : sectionContentLayout.isBalanced
                                ? "flex flex-wrap items-center gap-3"
                                : "flex flex-wrap items-center gap-3"
                          }
                        >
                          {visibleHeroActionItems.map((item, index) => (
                            <div
                              key={item.id}
                              draggable={isEditMode}
                              onDragStart={() => handleChildDragStart(item.id)}
                              onDragOver={(event) => {
                                event.preventDefault();
                                handleChildDragOver(item.id);
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                handleChildDrop("hero:actions", heroActionItems.map((entry) => entry.id), item.id);
                              }}
                              onDragEnd={handleChildDragEnd}
                              className={isEditMode ? "cursor-grab active:cursor-grabbing" : ""}
                            >
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  draggable
                                  onDragStart={(event) => {
                                    event.stopPropagation();
                                    handleChildDragStart(item.id);
                                  }}
                                  onDragEnd={handleChildDragEnd}
                                  className="rounded-full border p-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                                  style={themeStyles.ghostButton}
                                  aria-label={`Drag ${item.label}`}
                                  title={`Drag ${item.label}`}
                                >
                                  <span aria-hidden="true">⋮⋮</span>
                                </button>
                                <ActionLink
                                  href={item.action.href}
                                  label={item.action.label}
                                  themeStyles={themeStyles}
                                  primary={index === 0}
                                />
                                {isEditMode ? (
                                  <button
                                    type="button"
                                    onClick={() => setChildComponentVisible(item.id, false)}
                                    className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                                    style={themeStyles.ghostButton}
                                  >
                                    Hide
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                          <ActionLink href="#projects" label="Explore Featured Projects" themeStyles={themeStyles} />
                        </div>
                      </PreviewCanvasItemFrame>
                    );
                  }

                  return null;
                })}
              </div>

              <div className="grid gap-4">
                {orderedHeroRightIds.map((componentId) => {
                  if (!isCanvasChildVisible(componentId)) {
                    return null;
                  }

                  if (componentId === "hero:summary") {
                    return (
                      <PreviewCanvasItemFrame
                        key={componentId}
                        label="Professional snapshot"
                        themeStyles={themeStyles}
                        isEditing={isEditMode}
                        isDragging={draggedChildComponentId === componentId}
                        isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                        onDragStart={() => handleChildDragStart(componentId)}
                        onDragOver={() => handleChildDragOver(componentId)}
                        onDrop={() => handleChildDrop("hero:right", heroRightDefaultIds, componentId)}
                        onDragEnd={handleChildDragEnd}
                        onRemove={() => setChildComponentVisible(componentId, false)}
                      >
                        <div className={`rounded-[2rem] border ${densityClasses.cardPadding}`} style={themeStyles.projectShowcase}>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>
                            Professional Snapshot
                          </p>
                          <p className="mt-4 break-words whitespace-pre-wrap text-base leading-8 sm:text-lg" style={themeStyles.mutedText}>
                            {heroSummary}
                          </p>
                        </div>
                      </PreviewCanvasItemFrame>
                    );
                  }

                  if (componentId === "hero:highlights" && visibleHeroHighlightItems.length > 0) {
                    return (
                      <PreviewCanvasItemFrame
                        key={componentId}
                        label="Hero highlight cards"
                        themeStyles={themeStyles}
                        isEditing={isEditMode}
                        isDragging={draggedChildComponentId === componentId}
                        isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                        onDragStart={() => handleChildDragStart(componentId)}
                        onDragOver={() => handleChildDragOver(componentId)}
                        onDrop={() => handleChildDrop("hero:right", heroRightDefaultIds, componentId)}
                        onDragEnd={handleChildDragEnd}
                        onRemove={() => setChildComponentVisible(componentId, false)}
                      >
                        <div
                          className={
                            sectionContentLayout.supportsDualContentColumns
                              ? "grid gap-3 sm:grid-cols-2"
                              : "grid gap-3"
                          }
                        >
                          {visibleHeroHighlightItems.map((highlight) => (
                            <div
                              key={highlight.id}
                              draggable={isEditMode}
                              onDragStart={() => handleChildDragStart(highlight.id)}
                              onDragOver={(event) => {
                                event.preventDefault();
                                handleChildDragOver(highlight.id);
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                handleChildDrop("hero:highlights", heroHighlightItems.map((entry) => entry.id), highlight.id);
                              }}
                              onDragEnd={handleChildDragEnd}
                              className={`rounded-[1.1rem] border px-4 py-4 ${isEditMode ? "cursor-grab active:cursor-grabbing" : ""}`}
                              style={themeStyles.strongSurface}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={themeStyles.mutedText}>
                                    {highlight.item.label}
                                  </p>
                                  <p className="mt-2 break-words text-sm font-medium sm:text-base">{highlight.item.value}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    draggable
                                    onDragStart={(event) => {
                                      event.stopPropagation();
                                      handleChildDragStart(highlight.id);
                                    }}
                                    onDragEnd={handleChildDragEnd}
                                    className="rounded-full border p-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                                    style={themeStyles.ghostButton}
                                    aria-label={`Drag ${highlight.item.label}`}
                                    title={`Drag ${highlight.item.label}`}
                                  >
                                    <span aria-hidden="true">⋮⋮</span>
                                  </button>
                                  {isEditMode ? (
                                    <button
                                      type="button"
                                      onClick={() => setChildComponentVisible(highlight.id, false)}
                                      className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                                      style={themeStyles.ghostButton}
                                    >
                                      Hide
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </PreviewCanvasItemFrame>
                    );
                  }

                  if (componentId === "hero:stack" && showStack) {
                    return (
                      <PreviewCanvasItemFrame
                        key={componentId}
                        label="Stack tools"
                        themeStyles={themeStyles}
                        isEditing={isEditMode}
                        isDragging={draggedChildComponentId === componentId}
                        isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                        onDragStart={() => handleChildDragStart(componentId)}
                        onDragOver={() => handleChildDragOver(componentId)}
                        onDrop={() => handleChildDrop("hero:right", heroRightDefaultIds, componentId)}
                        onDragEnd={handleChildDragEnd}
                        onRemove={() => setChildComponentVisible(componentId, false)}
                      >
                        <div className={`rounded-[1.8rem] border ${densityClasses.cardPadding}`} style={themeStyles.sectionSurface}>
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>
                              Stack
                            </p>
                            <span className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.chip}>
                              {techStack.length} tools
                            </span>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2.5">
                            {visibleHeroStackItems.map((item) => (
                              <div
                                key={item.id}
                                draggable={isEditMode}
                                onDragStart={() => handleChildDragStart(item.id)}
                                onDragOver={(event) => {
                                  event.preventDefault();
                                  handleChildDragOver(item.id);
                                }}
                                onDrop={(event) => {
                                  event.preventDefault();
                                  handleChildDrop("hero:stack:items", heroStackItems.map((entry) => entry.id), item.id);
                                }}
                                onDragEnd={handleChildDragEnd}
                                className={isEditMode ? "cursor-grab active:cursor-grabbing" : ""}
                              >
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    draggable
                                    onDragStart={(event) => {
                                      event.stopPropagation();
                                      handleChildDragStart(item.id);
                                    }}
                                    onDragEnd={handleChildDragEnd}
                                    className="rounded-full border p-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                                    style={themeStyles.ghostButton}
                                    aria-label={`Drag ${item.label}`}
                                    title={`Drag ${item.label}`}
                                  >
                                    <span aria-hidden="true">⋮⋮</span>
                                  </button>
                                  <TechBadge label={item.value} themeStyles={themeStyles} compact />
                                  {isEditMode ? (
                                    <button
                                      type="button"
                                      onClick={() => setChildComponentVisible(item.id, false)}
                                      className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                                      style={themeStyles.ghostButton}
                                    >
                                      Hide
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PreviewCanvasItemFrame>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          </div>
        );
      case "about":
        return (
          <div className={sectionContentLayout.isWide ? splitAboutClass : "grid gap-6"}>
            {orderedAboutIds.map((componentId) => {
              if (!isCanvasChildVisible(componentId)) {
                return null;
              }

              if (componentId === "about:description") {
                return (
                  <div key={componentId} {...getTourHighlightProps("tour-about-edit")}>
                    <PreviewCanvasItemFrame
                      label="About text block"
                      themeStyles={themeStyles}
                      isEditing={isEditMode}
                      isDragging={draggedChildComponentId === componentId}
                      isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                      onDragStart={() => handleChildDragStart(componentId)}
                      onDragOver={() => handleChildDragOver(componentId)}
                      onDrop={() => handleChildDrop("about", aboutDefaultIds, componentId)}
                      onDragEnd={handleChildDragEnd}
                      onRemove={() => setChildComponentVisible(componentId, false)}
                    >
                      <div className={`rounded-[1.8rem] border ${densityClasses.cardPadding}`} style={themeStyles.sectionSurface}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>About Me</p>
                          <SourceBadge source={aboutDescription.source} themeStyles={themeStyles} />
                        </div>
                        <h2 className="mt-3 break-words text-3xl font-semibold tracking-tight">About Me</h2>
                        <p className="mt-5 break-words whitespace-pre-wrap text-sm leading-7 sm:text-base" style={themeStyles.mutedText}>{aboutDescription.value}</p>
                        <InlineEditableField
                          label="About Me"
                          value={overrides.about.description}
                          onChange={(nextValue) =>
                            updateOverrides((current) => ({
                              ...current,
                              about: { ...current.about, description: nextValue },
                              aiAccepted: { ...current.aiAccepted, aboutDescription: false },
                            }))
                          }
                          generatedValue={baseAbout.description}
                          suggestedValue={overrides.aboutSuggestion}
                          activeSource={overrides.aiAccepted.aboutDescription ? "ai" : "user"}
                          placeholder="Add a more personal summary"
                          themeStyles={themeStyles}
                          onApplySuggestion={() =>
                            updateOverrides((current) => ({
                              ...current,
                              about: { ...current.about, description: current.aboutSuggestion },
                              aboutSuggestion: "",
                              aiAccepted: { ...current.aiAccepted, aboutDescription: true },
                            }))
                          }
                          onDismissSuggestion={() => updateOverrides((current) => ({ ...current, aboutSuggestion: "" }))}
                          onReset={() =>
                            updateOverrides((current) => ({
                              ...current,
                              about: { ...current.about, description: "" },
                              aiAccepted: { ...current.aiAccepted, aboutDescription: false },
                            }))
                          }
                          editing={isEditMode}
                          multiline
                        />
                      </div>
                    </PreviewCanvasItemFrame>
                  </div>
                );
              }

              if (componentId === "about:profile" && hasProfileDetails) {
                return (
                  <div key={componentId} {...getTourHighlightProps("tour-profile-edit")}>
                    <PreviewCanvasItemFrame
                      label="Profile details"
                      themeStyles={themeStyles}
                      isEditing={isEditMode}
                      isDragging={draggedChildComponentId === componentId}
                      isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                      onDragStart={() => handleChildDragStart(componentId)}
                      onDragOver={() => handleChildDragOver(componentId)}
                      onDrop={() => handleChildDrop("about", aboutDefaultIds, componentId)}
                      onDragEnd={handleChildDragEnd}
                      onRemove={() => setChildComponentVisible(componentId, false)}
                    >
                      <div className={`rounded-[1.8rem] border ${densityClasses.cardPadding}`} style={themeStyles.sectionSurface}>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>Profile Details</p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em]" style={themeStyles.mutedText}>Company</p>
                            <p className="mt-2 text-base font-medium">{professional.company || preview?.profile.company || "Add company"}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em]" style={themeStyles.mutedText}>Location</p>
                            <p className="mt-2 text-base font-medium">{professional.location || preview?.profile.location || "Add location"}</p>
                          </div>
                        </div>
                        <div className={`${isEditMode ? "mt-4 grid gap-3 sm:grid-cols-2" : "hidden"}`}>
                          <InlineEditableField
                            label="Company"
                            value={overrides.professional.company}
                            onChange={(nextValue) =>
                              updateOverrides((current) => ({
                                ...current,
                                professional: { ...current.professional, company: nextValue },
                              }))
                            }
                            generatedValue={preview?.profile.company ?? ""}
                            placeholder="Acme Inc."
                            themeStyles={themeStyles}
                            onReset={() =>
                              updateOverrides((current) => ({
                                ...current,
                                professional: { ...current.professional, company: "" },
                              }))
                            }
                            editing={isEditMode}
                            compact
                          />
                          <InlineEditableField label="Location override" value={overrides.professional.location} onChange={(nextValue) => updateOverrides((current) => ({ ...current, professional: { ...current.professional, location: nextValue } }))} generatedValue={preview?.profile.location ?? ""} placeholder="San Francisco, CA" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, professional: { ...current.professional, location: "" } }))} editing={isEditMode} compact />
                        </div>
                      </div>
                    </PreviewCanvasItemFrame>
                  </div>
                );
              }

              return null;
            })}
          </div>
        );
      case "professional":
        return (
          <div className={`rounded-[1.8rem] border ${densityClasses.cardPadding}`} style={themeStyles.sectionSurface}>
            {orderedProfessionalIds.map((componentId) => {
              if (!isCanvasChildVisible(componentId)) {
                return null;
              }

              if (componentId === "professional:heading") {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Professional heading"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("professional", professionalDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>{professional.title}</p>
                      {isEditMode ? (
                        <div className="flex flex-wrap gap-2">
                          <InlineActionButton label="Import Resume" onClick={() => resumeUploadInputRef.current?.click()} themeStyles={themeStyles} />
                          <InlineActionButton label="Add LinkedIn" onClick={() => appendEnrichmentSource(overrides.linksSection.linkedIn || "https://linkedin.com/in/username")} themeStyles={themeStyles} />
                          <InlineActionButton label="Add Handshake" onClick={() => appendEnrichmentSource(overrides.linksSection.handshakeUrl || "https://app.joinhandshake.com/...")} themeStyles={themeStyles} />
                        </div>
                      ) : null}
                    </div>
                    <InlineEditableField
                      label="Professional heading"
                      value={overrides.professional.title}
                      onChange={(nextValue) =>
                        updateOverrides((current) => ({
                          ...current,
                          professional: { ...current.professional, title: nextValue },
                          aiAccepted: { ...current.aiAccepted, professionalTitle: false },
                        }))
                      }
                      generatedValue="Career / Professional Info"
                      suggestedValue={overrides.professional.titleSuggestion}
                      activeSource={overrides.aiAccepted.professionalTitle ? "ai" : "user"}
                      placeholder="Career / Professional Info"
                      themeStyles={themeStyles}
                      onApplySuggestion={() =>
                        updateOverrides((current) => ({
                          ...current,
                          professional: {
                            ...current.professional,
                            title: current.professional.titleSuggestion,
                            titleSuggestion: "",
                          },
                          aiAccepted: { ...current.aiAccepted, professionalTitle: true },
                        }))
                      }
                      onDismissSuggestion={() =>
                        updateOverrides((current) => ({
                          ...current,
                          professional: { ...current.professional, titleSuggestion: "" },
                        }))
                      }
                      onReset={() =>
                        updateOverrides((current) => ({
                          ...current,
                          professional: { ...current.professional, title: "" },
                          aiAccepted: { ...current.aiAccepted, professionalTitle: false },
                        }))
                      }
                      editing={isEditMode}
                      compact
                    />
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "professional:summary") {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Professional summary"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("professional", professionalDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    {professional.summary ? (
                      <p
                        className={`break-words whitespace-pre-wrap text-sm leading-7 sm:text-base ${sectionContentLayout.isWide ? "max-w-3xl" : ""}`}
                        style={themeStyles.mutedText}
                      >
                        {professional.summary}
                      </p>
                    ) : null}
                    <InlineEditableField
                      label="Professional summary"
                      value={overrides.professional.summary}
                      onChange={(nextValue) => updateOverrides((current) => ({ ...current, professional: { ...current.professional, summary: nextValue }, aiAccepted: { ...current.aiAccepted, professionalSummary: false } }))}
                      generatedValue=""
                      suggestedValue={overrides.professional.summarySuggestion}
                      activeSource={overrides.aiAccepted.professionalSummary ? "ai" : "user"}
                      placeholder="Summarize the roles, strengths, or focus areas you want to emphasize"
                      themeStyles={themeStyles}
                      onApplySuggestion={() => updateOverrides((current) => ({ ...current, professional: { ...current.professional, summary: current.professional.summarySuggestion, summarySuggestion: "" }, aiAccepted: { ...current.aiAccepted, professionalSummary: true } }))}
                      onDismissSuggestion={() => updateOverrides((current) => ({ ...current, professional: { ...current.professional, summarySuggestion: "" } }))}
                      onReset={() => updateOverrides((current) => ({ ...current, professional: { ...current.professional, summary: "" }, aiAccepted: { ...current.aiAccepted, professionalSummary: false } }))}
                      editing={isEditMode}
                      multiline
                    />
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "professional:actions" && visibleProfessionalActionItems.length > 0) {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Professional action links"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("professional", professionalDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className={sectionContentLayout.supportsDualContentColumns ? "grid gap-3 md:grid-cols-2" : "grid gap-3"}>
                      {visibleProfessionalActionItems.map((item) => (
                        <div
                          key={item.id}
                          draggable={isEditMode}
                          onDragStart={() => handleChildDragStart(item.id)}
                          onDragOver={(event) => {
                            event.preventDefault();
                            handleChildDragOver(item.id);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            handleChildDrop("professional:actions", professionalActionItems.map((entry) => entry.id), item.id);
                          }}
                          onDragEnd={handleChildDragEnd}
                          className={`min-w-0 ${isEditMode ? "cursor-grab active:cursor-grabbing" : ""}`}
                        >
                          <div className={`flex min-w-0 ${sectionContentLayout.isNarrow ? "flex-col items-stretch gap-2" : "items-center gap-2"}`}>
                            <button
                              type="button"
                              draggable
                              onDragStart={(event) => {
                                event.stopPropagation();
                                handleChildDragStart(item.id);
                              }}
                              onDragEnd={handleChildDragEnd}
                              className="rounded-full border p-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                              style={themeStyles.ghostButton}
                              aria-label={`Drag ${item.label}`}
                              title={`Drag ${item.label}`}
                            >
                              <span aria-hidden="true">⋮⋮</span>
                            </button>
                            <a href={item.action.href} target="_blank" rel="noreferrer" className={`inline-flex rounded-xl border px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${sectionContentLayout.isNarrow ? "w-full justify-center" : ""}`} style={themeStyles.ghostButton}>
                              {item.action.label}
                            </a>
                            {isEditMode ? (
                              <button type="button" onClick={() => setChildComponentVisible(item.id, false)} className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={themeStyles.ghostButton}>
                                Hide
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "professional:company") {
                if (!isEditMode && !(professional.company || preview?.profile.company)) {
                  return null;
                }

                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Company block"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("professional", professionalDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <p className="text-xs uppercase tracking-[0.2em]" style={themeStyles.mutedText}>Company</p>
                    <p className="mt-2 text-base font-medium">{professional.company || preview?.profile.company}</p>
                    <div className={`${isEditMode ? "mt-3 grid gap-3" : "hidden"}`}>
                      <InlineEditableField label="Company" value={overrides.professional.company} onChange={(nextValue) => updateOverrides((current) => ({ ...current, professional: { ...current.professional, company: nextValue } }))} generatedValue={preview?.profile.company ?? ""} placeholder="Acme Inc." themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, professional: { ...current.professional, company: "" } }))} editing={isEditMode} compact />
                    </div>
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "professional:location") {
                if (!isEditMode && !(professional.location || preview?.profile.location)) {
                  return null;
                }

                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Location block"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("professional", professionalDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <p className="text-xs uppercase tracking-[0.2em]" style={themeStyles.mutedText}>Location</p>
                    <p className="mt-2 text-base font-medium">{professional.location || preview?.profile.location}</p>
                    <div className={`${isEditMode ? "mt-3 grid gap-3" : "hidden"}`}>
                      <InlineEditableField label="Location override" value={overrides.professional.location} onChange={(nextValue) => updateOverrides((current) => ({ ...current, professional: { ...current.professional, location: nextValue } }))} generatedValue={preview?.profile.location ?? ""} placeholder="San Francisco, CA" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, professional: { ...current.professional, location: "" } }))} editing={isEditMode} compact />
                    </div>
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "professional:availability") {
                if (!isEditMode && !professional.availability) {
                  return null;
                }

                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Availability block"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("professional", professionalDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <p className="text-xs uppercase tracking-[0.2em]" style={themeStyles.mutedText}>Availability</p>
                    <p className="mt-2 text-base font-medium">{professional.availability || "Add availability"}</p>
                    <div className={`${isEditMode ? "mt-3 grid gap-3" : "hidden"}`}>
                      <InlineEditableField label="Availability" value={overrides.professional.availability} onChange={(nextValue) => updateOverrides((current) => ({ ...current, professional: { ...current.professional, availability: nextValue } }))} generatedValue="" placeholder="Open to product engineering roles" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, professional: { ...current.professional, availability: "" } }))} editing={isEditMode} compact />
                    </div>
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "professional:imports") {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Professional import tools"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("professional", professionalDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className={`${isEditMode ? "grid gap-3" : "hidden"}`}>
                      <div>
                        <p className="text-sm font-semibold">Import from Public Links or PDF Files</p>
                        <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                          Resume upload gives the AI the best grounding for stronger summaries, more accurate profile language, and better personalization. Public websites are imported conservatively, and LinkedIn or Handshake only work when the page is truly public.
                        </p>
                      </div>
                      <textarea value={enrichmentInput} onChange={(event) => setEnrichmentInput(event.target.value)} rows={3} placeholder={"https://your-site.com\nhttps://linkedin.com/in/username\nhttps://example.com/resume.pdf"} className="min-h-[88px] rounded-[1rem] border px-3 py-3 text-sm outline-none transition" style={themeStyles.surface} />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="inline-flex cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5" style={themeStyles.ghostButton}>
                          <input ref={resumeUploadInputRef} type="file" accept="application/pdf,.pdf" multiple onChange={handleResumeUploadChange} className="sr-only" />
                          Upload Resume / Cover Letter
                        </label>
                        <button type="button" onClick={handleEnrich} disabled={isEnriching} className="rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50" style={themeStyles.accentButton}>
                          {isEnriching ? "Importing..." : "Import Suggestions"}
                        </button>
                      </div>
                    </div>
                  </PreviewCanvasItemFrame>
                );
              }

              return null;
            })}
            {isEditMode && !isCanvasChildVisible("professional:imports") ? (
              <div className="mt-4 grid gap-3 rounded-[1rem] border p-4" style={themeStyles.strongSurface}>
                <div>
                  <p className="text-sm font-semibold">Import from Public Links or PDF Files</p>
                  <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                    Resume upload gives the AI the best grounding for stronger summaries, more accurate profile language, and better personalization. Public websites are imported conservatively, and LinkedIn or Handshake only work when the page is truly public.
                  </p>
                </div>
                <textarea value={enrichmentInput} onChange={(event) => setEnrichmentInput(event.target.value)} rows={3} placeholder={"https://your-site.com\nhttps://linkedin.com/in/username\nhttps://example.com/resume.pdf"} className="min-h-[88px] rounded-[1rem] border px-3 py-3 text-sm outline-none transition" style={themeStyles.surface} />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5" style={themeStyles.ghostButton}>
                    <input ref={resumeUploadInputRef} type="file" accept="application/pdf,.pdf" multiple onChange={handleResumeUploadChange} className="sr-only" />
                    Upload Resume / Cover Letter
                  </label>
                  <button type="button" onClick={handleEnrich} disabled={isEnriching} className="rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50" style={themeStyles.accentButton}>
                    {isEnriching ? "Importing..." : "Import Suggestions"}
                  </button>
                </div>
                {uploadedResumeFiles.length > 0 ? (
                  <div className="grid gap-2">
                    {uploadedResumeFiles.map((file) => (
                      <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 rounded-[0.9rem] border px-3 py-2" style={themeStyles.surface}>
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium">{file.name}</p>
                          <p className="text-xs" style={themeStyles.mutedText}>{(file.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button type="button" onClick={() => removeUploadedResume(file.name)} className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>Remove</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[0.9rem] border px-3 py-3 text-sm" style={themeStyles.surface}>
                    <p className="font-medium">No resume or cover letter uploaded yet.</p>
                    <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                      Uploading a PDF is optional, but it usually gives the AI better material for summaries, profile details, and polished portfolio copy.
                    </p>
                  </div>
                )}
                {(overrides.documents.resumeFileName || overrides.documents.coverLetterFileName) ? (
                  <div className="grid gap-2 rounded-[0.9rem] border p-3" style={themeStyles.surface}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                      Downloadable Documents
                    </p>
                    {overrides.documents.resumeFileName ? (
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 break-words text-sm font-medium">
                          Resume: {overrides.documents.resumeFileName}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeUploadedResume(overrides.documents.resumeFileName)}
                          className="text-xs font-semibold uppercase tracking-[0.16em]"
                          style={themeStyles.mutedText}
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}
                    {overrides.documents.coverLetterFileName ? (
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 break-words text-sm font-medium">
                          Cover letter: {overrides.documents.coverLetterFileName}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeUploadedResume(overrides.documents.coverLetterFileName)}
                          className="text-xs font-semibold uppercase tracking-[0.16em]"
                          style={themeStyles.mutedText}
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}
                    <p className="text-xs leading-5" style={themeStyles.mutedText}>
                      These stay separate from your site content and only power AI grounding plus optional download actions.
                    </p>
                  </div>
                ) : null}
                {enrichError ? <div className="rounded-[0.9rem] border px-3 py-3 text-sm" style={themeStyles.accentBlock}>{enrichError}</div> : null}
                {enrichmentResults.length === 0 && !isEnriching ? (
                  <div className="rounded-[0.9rem] border px-3 py-3 text-sm" style={themeStyles.surface}>
                    <p className="font-medium">Imported suggestions will appear here.</p>
                    <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                      Use this area for resume files or public profile links when you want help filling in summaries, links, and profile details.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      case "contact":
        return (
          <div className={`rounded-[1.8rem] border ${densityClasses.cardPadding}`} style={themeStyles.sectionSurface}>
            {orderedContactIds.map((componentId) => {
              if (!isCanvasChildVisible(componentId)) {
                return null;
              }

              if (componentId === "contact:heading") {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Contact heading"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("contact", contactDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>Contact</p>
                    </div>
                    <h2 className="mt-3 break-words text-2xl font-semibold tracking-tight">{contactTitle.value}</h2>
                    <InlineEditableField label="Contact heading" value={overrides.contact.title} onChange={(nextValue) => updateOverrides((current) => ({ ...current, contact: { ...current.contact, title: nextValue } }))} generatedValue={baseContact.title} placeholder="Contact" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, contact: { ...current.contact, title: "" } }))} editing={isEditMode} compact />
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "contact:description") {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Contact intro text"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("contact", contactDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <SourceBadge source={contactDescription.source} themeStyles={themeStyles} />
                    </div>
                    <p className="mt-4 break-words whitespace-pre-wrap text-sm leading-7 sm:text-base" style={themeStyles.mutedText}>{contactDescription.value}</p>
                    <InlineEditableField label="Contact intro" value={overrides.contact.description} onChange={(nextValue) => updateOverrides((current) => ({ ...current, contact: { ...current.contact, description: nextValue }, aiAccepted: { ...current.aiAccepted, contactDescription: false } }))} generatedValue={baseContact.description} suggestedValue={overrides.contact.descriptionSuggestion} activeSource={overrides.aiAccepted.contactDescription ? "ai" : "user"} placeholder="Tell visitors how you prefer to collaborate" themeStyles={themeStyles} onApplySuggestion={() => updateOverrides((current) => ({ ...current, contact: { ...current.contact, description: current.contact.descriptionSuggestion, descriptionSuggestion: "" }, aiAccepted: { ...current.aiAccepted, contactDescription: true } }))} onDismissSuggestion={() => updateOverrides((current) => ({ ...current, contact: { ...current.contact, descriptionSuggestion: "" } }))} onReset={() => updateOverrides((current) => ({ ...current, contact: { ...current.contact, description: "" }, aiAccepted: { ...current.aiAccepted, contactDescription: false } }))} editing={isEditMode} multiline />
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "contact:note") {
                if (!isEditMode && !contactText) {
                  return null;
                }

                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Contact custom note"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("contact", contactDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    {contactText ? <p className="break-words whitespace-pre-wrap text-sm leading-7 sm:text-base" style={themeStyles.mutedText}>{contactText}</p> : null}
                    <InlineEditableField label="Custom contact note" value={overrides.contact.customText} onChange={(nextValue) => updateOverrides((current) => ({ ...current, contact: { ...current.contact, customText: nextValue } }))} generatedValue="" placeholder="Add a short invitation to reach out" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, contact: { ...current.contact, customText: "" } }))} editing={isEditMode} multiline />
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "contact:methods" && visibleContactMethodItems.length > 0) {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Contact methods"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("contact", contactDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className={sectionContentLayout.supportsDualContentColumns ? "grid gap-3 md:grid-cols-2" : "grid gap-3"}>
                      {visibleContactMethodItems.map((entry) => (
                        <div
                          key={entry.id}
                          draggable={isEditMode}
                          onDragStart={() => handleChildDragStart(entry.id)}
                          onDragOver={(event) => {
                            event.preventDefault();
                            handleChildDragOver(entry.id);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            handleChildDrop("contact:methods", contactMethodItems.map((item) => item.id), entry.id);
                          }}
                          onDragEnd={handleChildDragEnd}
                          className={isEditMode ? "cursor-grab active:cursor-grabbing" : ""}
                        >
                          <a href={entry.item.href} className="block h-full rounded-[1.2rem] border px-4 py-4 text-sm transition hover:-translate-y-0.5" style={themeStyles.surface}>
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium">{entry.item.label}</p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  draggable
                                  onDragStart={(event) => {
                                    event.stopPropagation();
                                    handleChildDragStart(entry.id);
                                  }}
                                  onDragEnd={handleChildDragEnd}
                                  className="rounded-full border p-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                                  style={themeStyles.ghostButton}
                                  aria-label={`Drag ${entry.item.label}`}
                                  title={`Drag ${entry.item.label}`}
                                >
                                  <span aria-hidden="true">⋮⋮</span>
                                </button>
                                <SourceBadge source="user" themeStyles={themeStyles} />
                                {isEditMode ? (
                                  <button type="button" onClick={(event) => { event.preventDefault(); setChildComponentVisible(entry.id, false); }} className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={themeStyles.ghostButton}>
                                    Hide
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            <p className="mt-1 break-words" style={themeStyles.mutedText}>{entry.item.value}</p>
                          </a>
                        </div>
                      ))}
                    </div>
                    <div className={`${isEditMode ? "mt-3 grid gap-3 sm:grid-cols-2" : "hidden"}`}>
                      <InlineEditableField label="Email" value={overrides.contact.email} onChange={(nextValue) => updateOverrides((current) => ({ ...current, contact: { ...current.contact, email: nextValue } }))} generatedValue="" placeholder="name@example.com" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, contact: { ...current.contact, email: "" } }))} editing={isEditMode} compact />
                      <InlineEditableField label="Phone" value={overrides.contact.phone} onChange={(nextValue) => updateOverrides((current) => ({ ...current, contact: { ...current.contact, phone: nextValue } }))} generatedValue="" placeholder="+1 (555) 555-5555" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, contact: { ...current.contact, phone: "" } }))} editing={isEditMode} compact />
                    </div>
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "contact:actions" && visibleContactActionItems.length > 0) {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Contact actions"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("contact", contactDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className={sectionContentLayout.supportsDualContentColumns ? "grid gap-3 md:grid-cols-2" : "flex flex-wrap gap-3"}>
                      {visibleContactActionItems.map((item) => (
                        <div
                          key={item.id}
                          draggable={isEditMode}
                          onDragStart={() => handleChildDragStart(item.id)}
                          onDragOver={(event) => {
                            event.preventDefault();
                            handleChildDragOver(item.id);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            handleChildDrop("contact:actions", contactActionItems.map((entry) => entry.id), item.id);
                          }}
                          onDragEnd={handleChildDragEnd}
                          className={`${sectionContentLayout.supportsDualContentColumns ? "min-w-0" : "flex items-center gap-2"} ${isEditMode ? "cursor-grab active:cursor-grabbing" : ""}`}
                        >
                          <div className={`flex min-w-0 ${sectionContentLayout.supportsDualContentColumns ? "flex-col items-stretch gap-2" : "items-center gap-2"}`}>
                            <button
                              type="button"
                              draggable
                              onDragStart={(event) => {
                                event.stopPropagation();
                                handleChildDragStart(item.id);
                              }}
                              onDragEnd={handleChildDragEnd}
                              className="rounded-full border p-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                              style={themeStyles.ghostButton}
                              aria-label={`Drag ${item.label}`}
                              title={`Drag ${item.label}`}
                            >
                              <span aria-hidden="true">⋮⋮</span>
                            </button>
                            <ActionLink href={item.action.href} label={item.action.label} themeStyles={themeStyles} />
                            {isEditMode ? (
                              <button type="button" onClick={() => setChildComponentVisible(item.id, false)} className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={themeStyles.ghostButton}>
                                Hide
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </PreviewCanvasItemFrame>
                );
              }

              return null;
            })}
          </div>
        );
      case "links":
        return (
          <div className={`rounded-[1.8rem] border ${densityClasses.cardPadding}`} style={themeStyles.sectionSurface}>
            {orderedLinksIds.map((componentId) => {
              if (!isCanvasChildVisible(componentId)) {
                return null;
              }

              if (componentId === "links:heading") {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Links heading"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("links", linksDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>Links</p>
                    </div>
                    <h2 className="mt-3 break-words text-2xl font-semibold tracking-tight">{linksTitle.value}</h2>
                    <InlineEditableField label="Links heading" value={overrides.linksSection.title} onChange={(nextValue) => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, title: nextValue } }))} generatedValue={baseLinksSection.title} placeholder="Links" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, title: "" } }))} editing={isEditMode} compact />
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "links:description") {
                if (!isEditMode && !linksDescription.value.trim()) {
                  return null;
                }

                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Links intro text"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("links", linksDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <SourceBadge source={linksDescription.source} themeStyles={themeStyles} />
                    </div>
                    {linksDescription.value.trim() ? <p className="mt-4 break-words whitespace-pre-wrap text-sm leading-7 sm:text-base" style={themeStyles.mutedText}>{linksDescription.value}</p> : null}
                    <InlineEditableField
                      label="Links intro"
                      value={overrides.linksSection.description}
                      onChange={(nextValue) =>
                        updateOverrides((current) => ({
                          ...current,
                          linksSection: { ...current.linksSection, description: nextValue },
                          aiAccepted: { ...current.aiAccepted, linksDescription: false },
                        }))
                      }
                      generatedValue={baseLinksSection.description}
                      suggestedValue={overrides.linksSection.descriptionSuggestion}
                      activeSource={overrides.aiAccepted.linksDescription ? "ai" : "user"}
                      placeholder="Explain what visitors can explore next"
                      themeStyles={themeStyles}
                      onApplySuggestion={() =>
                        updateOverrides((current) => ({
                          ...current,
                          linksSection: {
                            ...current.linksSection,
                            description: current.linksSection.descriptionSuggestion,
                            descriptionSuggestion: "",
                          },
                          aiAccepted: { ...current.aiAccepted, linksDescription: true },
                        }))
                      }
                      onDismissSuggestion={() =>
                        updateOverrides((current) => ({
                          ...current,
                          linksSection: { ...current.linksSection, descriptionSuggestion: "" },
                        }))
                      }
                      onReset={() =>
                        updateOverrides((current) => ({
                          ...current,
                          linksSection: { ...current.linksSection, description: "" },
                          aiAccepted: { ...current.aiAccepted, linksDescription: false },
                        }))
                      }
                      editing={isEditMode}
                      multiline
                    />
                  </PreviewCanvasItemFrame>
                );
              }

              if (componentId === "links:cards") {
                return (
                  <PreviewCanvasItemFrame
                    key={componentId}
                    label="Link cards"
                    themeStyles={themeStyles}
                    isEditing={isEditMode}
                    isDragging={draggedChildComponentId === componentId}
                    isDropTarget={dropTargetChildComponentId === componentId && draggedChildComponentId !== componentId}
                    onDragStart={() => handleChildDragStart(componentId)}
                    onDragOver={() => handleChildDragOver(componentId)}
                    onDrop={() => handleChildDrop("links", linksDefaultIds, componentId)}
                    onDragEnd={handleChildDragEnd}
                    onRemove={() => setChildComponentVisible(componentId, false)}
                  >
                    <div className={`${isEditMode ? "mb-3 grid gap-3" : "hidden"}`}>
                      <InlineEditableField label="Resume URL" value={overrides.linksSection.resumeUrl} onChange={(nextValue) => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, resumeUrl: nextValue } }))} generatedValue="" placeholder="https://example.com/resume.pdf" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, resumeUrl: "" } }))} editing={isEditMode} compact />
                      <InlineEditableField label="Cover letter URL" value={overrides.linksSection.coverLetterUrl} onChange={(nextValue) => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, coverLetterUrl: nextValue } }))} generatedValue="" placeholder="https://example.com/cover-letter.pdf" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, coverLetterUrl: "" } }))} editing={isEditMode} compact />
                      <InlineEditableField label="LinkedIn URL" value={overrides.linksSection.linkedIn} onChange={(nextValue) => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, linkedIn: nextValue } }))} generatedValue="" placeholder="https://linkedin.com/in/username" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, linkedIn: "" } }))} editing={isEditMode} compact />
                      <InlineEditableField label="Handshake URL" value={overrides.linksSection.handshakeUrl} onChange={(nextValue) => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, handshakeUrl: nextValue } }))} generatedValue="" placeholder="https://app.joinhandshake.com/..." themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, handshakeUrl: "" } }))} editing={isEditMode} compact />
                      <InlineEditableField label="Website URL" value={overrides.linksSection.portfolioUrl} onChange={(nextValue) => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, portfolioUrl: nextValue } }))} generatedValue="" placeholder="https://yourportfolio.com" themeStyles={themeStyles} onReset={() => updateOverrides((current) => ({ ...current, linksSection: { ...current.linksSection, portfolioUrl: "" } }))} editing={isEditMode} compact />
                    </div>
                    <div
                      className={
                        visibleLinkCardItems.length <= 1
                          ? "grid gap-3"
                          : sectionContentLayout.supportsDualContentColumns
                            ? "grid gap-3 md:grid-cols-2"
                            : "grid gap-3"
                      }
                    >
                      {visibleLinkCardItems.map((entry) => (
                        <div
                          key={entry.id}
                          draggable={isEditMode}
                          onDragStart={() => handleChildDragStart(entry.id)}
                          onDragOver={(event) => {
                            event.preventDefault();
                            handleChildDragOver(entry.id);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            handleChildDrop("links:cards", linkCardItems.map((item) => item.id), entry.id);
                          }}
                          onDragEnd={handleChildDragEnd}
                          className={`min-w-0 ${isEditMode ? "cursor-grab active:cursor-grabbing" : ""}`}
                        >
                          <a
                            href={entry.link.href}
                            target="_blank"
                            rel="noreferrer"
                            className={`block h-full rounded-[1.2rem] border px-4 py-4 text-sm transition hover:-translate-y-0.5 ${
                              visibleLinkCardItems.length === 1 && !sectionContentLayout.prefersSingleColumnCards ? "max-w-3xl" : ""
                            }`}
                            style={themeStyles.surface}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium">{entry.link.label}</p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  draggable
                                  onDragStart={(event) => {
                                    event.stopPropagation();
                                    handleChildDragStart(entry.id);
                                  }}
                                  onDragEnd={handleChildDragEnd}
                                  className="rounded-full border p-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                                  style={themeStyles.ghostButton}
                                  aria-label={`Drag ${entry.link.label}`}
                                  title={`Drag ${entry.link.label}`}
                                >
                                  <span aria-hidden="true">⋮⋮</span>
                                </button>
                                <SourceBadge source={entry.link.source} themeStyles={themeStyles} />
                                {isEditMode ? (
                                  <button type="button" onClick={(event) => { event.preventDefault(); setChildComponentVisible(entry.id, false); }} className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={themeStyles.ghostButton}>
                                    Hide
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            <p className="mt-1 break-words" style={themeStyles.mutedText}>{entry.link.href}</p>
                          </a>
                        </div>
                      ))}
                      {visibleLinkCardItems.length === 0 ? (
                        <div className="rounded-[1rem] border px-4 py-4 text-sm" style={themeStyles.surface}>
                          <p className="font-medium">No extra links yet.</p>
                          <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                            Add LinkedIn, Handshake, a website, or document links in edit mode to give visitors more ways to learn about you.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </PreviewCanvasItemFrame>
                );
              }

              return null;
            })}
          </div>
        );
      case "projects":
        return (
          <div {...getTourHighlightProps("tour-project-edit")}>
            {isCanvasChildVisible("projects:heading") ? (
              <PreviewCanvasItemFrame
                label="Projects heading"
                themeStyles={themeStyles}
                isEditing={isEditMode}
                isDragging={draggedChildComponentId === "projects:heading"}
                isDropTarget={dropTargetChildComponentId === "projects:heading" && draggedChildComponentId !== "projects:heading"}
                onDragStart={() => handleChildDragStart("projects:heading")}
                onDragOver={() => handleChildDragOver("projects:heading")}
                onDrop={() => handleChildDrop("projects", projectsDefaultIds, "projects:heading")}
                onDragEnd={handleChildDragEnd}
                onRemove={() => setChildComponentVisible("projects:heading", false)}
              >
                <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-5" style={{ borderColor: theme.palette.border }}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>Featured Projects</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Selected Work</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6" style={themeStyles.mutedText}>
                      Drag project cards to change the order, or use Make Featured to move a project into the spotlight.
                    </p>
                  </div>
                  {featuredProject?.language ? <TechBadge label={featuredProject.language} themeStyles={themeStyles} compact /> : null}
                </div>
                {isEditMode ? (
                  <div className="mt-4 grid gap-3 rounded-[1rem] border p-4" style={themeStyles.strongSurface}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Manage project cards</p>
                        <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                          Add your own project, remove one from Selected Work, or restore a hidden project later.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addCustomProject()}
                        className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                        style={themeStyles.accentButton}
                      >
                        Add Project
                      </button>
                    </div>
                    {hiddenProjectOptions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {hiddenProjectOptions.map((projectName) => (
                          <button
                            key={projectName}
                            type="button"
                            onClick={() => restoreProjectToSelectedWork(projectName)}
                            className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                            style={themeStyles.ghostButton}
                          >
                            Restore {projectName}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </PreviewCanvasItemFrame>
            ) : null}
            {repositories.length === 0 ? (
              <div className="mt-6 rounded-[1.6rem] border p-6" style={themeStyles.sectionSurface}>
                <p className="text-lg font-semibold">No projects in Selected Work yet.</p>
                <p className="mt-2 max-w-2xl text-sm leading-6" style={themeStyles.mutedText}>
                  Add a custom project or restore one of your hidden projects to bring this section back.
                </p>
                {isEditMode ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => addCustomProject()}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                      style={themeStyles.accentButton}
                    >
                      Add Project
                    </button>
                    {hiddenProjectOptions.map((projectName) => (
                      <button
                        key={projectName}
                        type="button"
                        onClick={() => restoreProjectToSelectedWork(projectName)}
                        className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                        style={themeStyles.ghostButton}
                      >
                        Restore {projectName}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {featuredProject && (isCanvasChildVisible("projects:featured-image") || isCanvasChildVisible("projects:featured-header") || isCanvasChildVisible("projects:featured-description") || isCanvasChildVisible("projects:featured-meta")) ? (
              <div
                className={`mt-6 ${
                  projectLayoutMode === "hybrid" && visibleSecondaryProjectItems.length > 0
                    ? "grid gap-5 xl:grid-cols-[minmax(18rem,0.84fr)_minmax(24rem,1.16fr)]"
                    : "space-y-5"
                }`}
              >
                <div
                  className={`flex h-full flex-col rounded-[2rem] border p-6 sm:p-8 transition ${draggedProjectName === featuredProject.name ? "opacity-60" : ""}`}
                  style={{
                    ...themeStyles.projectShowcase,
                    borderColor:
                      projectDropTargetName === featuredProject.name && draggedProjectName !== featuredProject.name
                        ? theme.palette.accent
                        : themeStyles.projectShowcase.borderColor,
                    boxShadow:
                      projectDropTargetName === featuredProject.name && draggedProjectName !== featuredProject.name
                        ? `0 0 0 1px ${theme.palette.accent}`
                        : themeStyles.projectShowcase.boxShadow,
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    handleProjectDragOver(featuredProject.name);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleProjectDrop(featuredProject.name);
                  }}
                >
                  {featuredProjectHasImage && isCanvasChildVisible("projects:featured-image") ? (
                    <ProjectImagePreview repository={featuredProject} themeStyles={themeStyles} prominent />
                  ) : null}
                  {isCanvasChildVisible("projects:featured-header") ? (
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]" style={themeStyles.chip}>Featured</span>
                      <SourceBadge source={featuredProject.descriptionSource} themeStyles={themeStyles} />
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditMode ? (
                        <button
                          type="button"
                          onClick={() => setChildComponentVisible("projects:featured", false)}
                          className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                          style={themeStyles.ghostButton}
                        >
                          Remove
                        </button>
                      ) : null}
                      {isEditMode ? (
                        <button
                          type="button"
                          onClick={() => removeProjectFromSelectedWork(featuredProject.name)}
                          className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                          style={themeStyles.ghostButton}
                        >
                          Remove Project
                        </button>
                      ) : null}
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          event.stopPropagation();
                          event.dataTransfer.effectAllowed = "move";
                          handleProjectDragStart(featuredProject.name);
                        }}
                        onDragEnd={handleProjectDragEnd}
                        className="rounded-full border p-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                        style={themeStyles.ghostButton}
                        aria-label={`Drag ${featuredProject.name}`}
                        title={`Drag ${featuredProject.name}`}
                      >
                        <span aria-hidden="true">⋮⋮</span>
                      </button>
                    </div>
                  </div>
                  ) : null}
                  {isCanvasChildVisible("projects:featured-description") ? (
                  <div className="mt-8 max-w-xl flex-1">
                    <p className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">{featuredProject.name}</p>
                    <p className="mt-4 break-words whitespace-pre-wrap text-base leading-8 sm:text-lg" style={themeStyles.mutedText}>{featuredProject.description}</p>
                  </div>
                  ) : null}
                  {isCanvasChildVisible("projects:featured-meta") ? (
                  <div className="mt-auto pt-6 flex flex-wrap items-center gap-3">
                    <TechBadge label={featuredProject.language} themeStyles={themeStyles} compact />
                    <a href={featuredProject.href} target="_blank" rel="noreferrer" className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: theme.palette.accent }}>
                      Open Project
                    </a>
                  </div>
                  ) : null}
                  <InlineEditableField
                    label={`${featuredProject.name} description`}
                    value={overrides.projectOverrides[featuredProject.name]?.description ?? ""}
                    onChange={(nextValue) => setProjectDescriptionOverride(featuredProject.name, nextValue)}
                    generatedValue={
                      customProjectsByName.get(featuredProject.name)?.description ??
                      baseRepositories.find((item) => item.name === featuredProject.name)?.description ??
                      ""
                    }
                    suggestedValue={overrides.projectOverrides[featuredProject.name]?.descriptionSuggestion ?? ""}
                    activeSource={overrides.projectOverrides[featuredProject.name]?.acceptedAi ? "ai" : "user"}
                    placeholder="Shape this repository into a stronger portfolio case study"
                    themeStyles={themeStyles}
                    onApplySuggestion={() =>
                      setProjectDescriptionOverride(
                        featuredProject.name,
                        overrides.projectOverrides[featuredProject.name]?.descriptionSuggestion ?? "",
                        "ai",
                      )
                    }
                    onDismissSuggestion={() => dismissProjectDescriptionSuggestion(featuredProject.name)}
                    onReset={() => setProjectDescriptionOverride(featuredProject.name, "")}
                    editing={isEditMode}
                    multiline
                  />
                  {isEditMode && customProjectsByName.has(featuredProject.name) ? (
                    <div className="mt-4 grid gap-3 rounded-[1rem] border p-4" style={themeStyles.strongSurface}>
                      <InlineEditableField
                        label="Project title"
                        value={customProjectsByName.get(featuredProject.name)?.name ?? ""}
                        onChange={(nextValue) =>
                          updateCustomProject(customProjectsByName.get(featuredProject.name)!.id, "name", nextValue)
                        }
                        generatedValue=""
                        placeholder="Custom project title"
                        themeStyles={themeStyles}
                        onReset={() =>
                          updateCustomProject(customProjectsByName.get(featuredProject.name)!.id, "name", "")
                        }
                        editing={isEditMode}
                        compact
                      />
                      <InlineEditableField
                        label="Project summary"
                        value={customProjectsByName.get(featuredProject.name)?.description ?? ""}
                        onChange={(nextValue) =>
                          updateCustomProject(customProjectsByName.get(featuredProject.name)!.id, "description", nextValue)
                        }
                        generatedValue=""
                        placeholder="Describe what this project does and why it matters"
                        themeStyles={themeStyles}
                        onReset={() =>
                          updateCustomProject(customProjectsByName.get(featuredProject.name)!.id, "description", "")
                        }
                        editing={isEditMode}
                        multiline
                      />
                      <InlineEditableField
                        label="Project URL"
                        value={customProjectsByName.get(featuredProject.name)?.href ?? ""}
                        onChange={(nextValue) =>
                          updateCustomProject(customProjectsByName.get(featuredProject.name)!.id, "href", nextValue)
                        }
                        generatedValue=""
                        placeholder="https://example.com/project"
                        themeStyles={themeStyles}
                        onReset={() =>
                          updateCustomProject(customProjectsByName.get(featuredProject.name)!.id, "href", "")
                        }
                        editing={isEditMode}
                        compact
                      />
                      <InlineEditableField
                        label="Project language"
                        value={customProjectsByName.get(featuredProject.name)?.language ?? ""}
                        onChange={(nextValue) =>
                          updateCustomProject(customProjectsByName.get(featuredProject.name)!.id, "language", nextValue)
                        }
                        generatedValue=""
                        placeholder="TypeScript"
                        themeStyles={themeStyles}
                        onReset={() =>
                          updateCustomProject(customProjectsByName.get(featuredProject.name)!.id, "language", "")
                        }
                        editing={isEditMode}
                        compact
                      />
                    </div>
                  ) : null}
                  {isEditMode ? (
                    <div className="mt-4 grid gap-3 rounded-[1rem] border p-4" style={themeStyles.strongSurface}>
                      {!featuredProjectHasImage ? (
                        <p className="text-xs leading-5" style={themeStyles.mutedText}>
                          No image yet. Upload one, paste an image URL, or use an image found in the project README.
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.ghostButton}>
                          <input type="file" accept="image/*" className="sr-only" onChange={(event) => handleProjectImageUpload(featuredProject.name, event)} />
                          Upload Image
                        </label>
                        <button type="button" onClick={() => toggleProjectImportPanel(featuredProject.name)} className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.ghostButton}>
                          {openProjectImports[featuredProject.name] ? "Hide Image Options" : "Image Options"}
                        </button>
                        <button type="button" onClick={() => removeProjectImage(featuredProject.name)} className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.ghostButton}>
                          Remove Image
                        </button>
                        <button type="button" onClick={() => restoreDefaultProjectImage(featuredProject.name)} className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.ghostButton}>
                          Use Default Image
                        </button>
                      </div>
                      {openProjectImports[featuredProject.name] ? (
                        <div className="grid gap-3">
                          <input
                            value={overrides.projectOverrides[featuredProject.name]?.imageUrl ?? ""}
                            onChange={(event) => setProjectImageOverride(featuredProject.name, event.target.value)}
                            placeholder="https://example.com/project-image.png"
                            className="h-11 rounded-[0.95rem] border px-3 text-sm outline-none transition"
                            style={themeStyles.surface}
                          />
                          <div className="flex flex-wrap gap-2">
                            {featuredProject.readmeImages.map((imageUrl) => (
                              <button
                                key={imageUrl}
                                type="button"
                                onClick={() => setProjectImageOverride(featuredProject.name, imageUrl)}
                                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                                style={themeStyles.ghostButton}
                              >
                                Apply README Image
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {projectLayoutMode === "hybrid" && visibleSecondaryProjectItems.length > 0 ? (
                  <div className={hybridProjectGridClass}>
                    {visibleSecondaryProjectItems.map(({ id, repository }) =>
                      renderSecondaryProjectCard(repository, id, "grid"),
                    )}
                    {Array.from({ length: hybridProjectPlaceholderCount }).map((_, index) => (
                      renderProjectPlaceholder(
                        `project-placeholder-${index}`,
                        visibleSecondaryProjectItems.length + index,
                        "Drop a project here or add a new one in this position.",
                      )
                    ))}
                  </div>
                ) : null}
                {projectLayoutMode === "hybrid" &&
                visibleSecondaryProjectItems.length === 0 &&
                hybridProjectPlaceholderCount > 0 ? (
                  <div className={hybridProjectGridClass}>
                    {Array.from({ length: hybridProjectPlaceholderCount }).map((_, index) => (
                      renderProjectPlaceholder(
                        `project-placeholder-empty-${index}`,
                        index,
                        "Add a project here to start filling this grid.",
                      )
                    ))}
                  </div>
                ) : null}
                {isCanvasChildVisible("projects:grid") ? (
                  <>
                    {projectLayoutMode === "side-by-side" ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {visibleSecondaryProjectItems.map(({ id, repository }) =>
                          renderSecondaryProjectCard(repository, id, "grid"),
                        )}
                      </div>
                    ) : null}
                    {projectLayoutMode === "stacked" ? (
                      <div className="grid gap-4">
                        {visibleSecondaryProjectItems.map(({ id, repository }) =>
                          renderSecondaryProjectCard(repository, id, "stacked"),
                        )}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      default:
        return null;
    }
  }

  function renderCustomizePanelContent() {
    const inspectorTabs: Array<{ id: BuilderInspectorTab; label: string }> = [
      { id: "theme", label: "Theme" },
      { id: "style", label: "Style" },
    ];

    return (
      <div className="grid gap-4">
        <div className="rounded-[1rem] border p-4" style={appThemeStyles.surface}>
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={appThemeStyles.mutedText}>
            Customize
          </p>
          <p className="mt-1 text-sm font-medium">Theme, palette, and visual style</p>
          <p className="mt-1 text-xs leading-5" style={appThemeStyles.mutedText}>
            Use the preview for content and structure. Use this drawer only for color, style, and theme changes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {inspectorTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveInspectorTab(tab.id)}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
              style={activeInspectorTab === tab.id ? appThemeStyles.accentButton : appThemeStyles.ghostButton}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeInspectorTab === "theme" ? (
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                Theme
                <select
                  value={overrides.appearance.themeId || theme.id}
                  onChange={(event) =>
                    updateOverrides((current) => ({
                      ...current,
                      appearance: {
                        ...current.appearance,
                        themeId: event.target.value,
                      },
                    }))
                  }
                  className="h-10 rounded-[0.95rem] border px-3 text-sm font-normal outline-none"
                  style={appThemeStyles.strongSurface}
                >
                  <option value="">Auto ({theme.name})</option>
                  {PORTFOLIO_THEMES.map((themeOption) => (
                    <option key={themeOption.id} value={themeOption.id}>
                      {themeOption.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                Color Mode
                <select
                  value={overrides.appearance.colorMode}
                  onChange={(event) =>
                    updateOverrides((current) => ({
                      ...current,
                      appearance: {
                        ...current.appearance,
                        colorMode: event.target.value as PortfolioOverrides["appearance"]["colorMode"],
                      },
                    }))
                  }
                  className="h-10 rounded-[0.95rem] border px-3 text-sm font-normal outline-none"
                  style={appThemeStyles.strongSurface}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
            </div>
            <div className="grid gap-2 rounded-[1rem] border p-4" style={appThemeStyles.surface}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                  Quick Presets
                </p>
                <p className="mt-1 text-xs leading-5" style={appThemeStyles.mutedText}>
                  Use a cleaner SaaS-style look when you want something more neutral than the colorful presets.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateOverrides((current) => ({
                      ...current,
                      appearance: {
                        ...current.appearance,
                        themeId: "saas-clean",
                        colorMode: "light",
                      },
                    }))
                  }
                  className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
                  style={
                    (overrides.appearance.themeId || theme.id) === "saas-clean" &&
                    overrides.appearance.colorMode === "light"
                      ? appThemeStyles.accentButton
                      : appThemeStyles.ghostButton
                  }
                >
                  SaaS Clean Light
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateOverrides((current) => ({
                      ...current,
                      appearance: {
                        ...current.appearance,
                        themeId: "saas-clean",
                        colorMode: "dark",
                      },
                    }))
                  }
                  className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
                  style={
                    (overrides.appearance.themeId || theme.id) === "saas-clean" &&
                    overrides.appearance.colorMode === "dark"
                      ? appThemeStyles.accentButton
                      : appThemeStyles.ghostButton
                  }
                >
                  SaaS Clean Dark
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {activeInspectorTab === "style" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2 rounded-[1rem] border p-4 sm:col-span-2" style={appThemeStyles.surface}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                    Layout Flow
                  </p>
                  <p className="mt-1 text-xs leading-5" style={appThemeStyles.mutedText}>
                    Use stacked for a simple vertical page, or free flow to let sections share rows where the layout supports it.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSectionLayout("stacked")}
                    className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
                    style={
                      overrides.appearance.sectionLayout === "stacked"
                        ? appThemeStyles.accentButton
                        : appThemeStyles.ghostButton
                    }
                  >
                    Stacked
                  </button>
                  <button
                    type="button"
                    onClick={() => setSectionLayout("split")}
                    className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
                    style={
                      overrides.appearance.sectionLayout === "split"
                        ? appThemeStyles.accentButton
                        : appThemeStyles.ghostButton
                    }
                  >
                    Free Flow
                  </button>
                </div>
              </div>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                Density
                <select
                  value={overrides.appearance.density}
                  onChange={(event) =>
                    updateOverrides((current) => ({
                      ...current,
                      appearance: {
                        ...current.appearance,
                        density: event.target.value as PortfolioOverrides["appearance"]["density"],
                      },
                    }))
                  }
                  className="h-10 rounded-[0.95rem] border px-3 text-sm font-normal outline-none"
                  style={appThemeStyles.strongSurface}
                >
                  <option value="compact">Compact</option>
                  <option value="spacious">Spacious</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                Card Style
                <select
                  value={overrides.appearance.cardStyle}
                  onChange={(event) =>
                    updateOverrides((current) => ({
                      ...current,
                      appearance: {
                        ...current.appearance,
                        cardStyle: event.target.value as PortfolioOverrides["appearance"]["cardStyle"],
                      },
                    }))
                  }
                  className="h-10 rounded-[0.95rem] border px-3 text-sm font-normal outline-none"
                  style={appThemeStyles.strongSurface}
                >
                  <option value="soft">Soft</option>
                  <option value="outlined">Outlined</option>
                  <option value="elevated">Elevated</option>
                </select>
              </label>
              <div className="grid gap-2 rounded-[1rem] border p-4 sm:col-span-2" style={appThemeStyles.surface}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                    Safe Layout Presets
                  </p>
                  <p className="mt-1 text-xs leading-5" style={appThemeStyles.mutedText}>
                    Start from polished layout defaults, then fine-tune section flow and Selected Work if you want more control.
                  </p>
                </div>
                <div className="grid gap-2 lg:grid-cols-3">
                  {REPO2SITE_LAYOUT_PRESETS.map((preset) => {
                    const isActive =
                      overrides.appearance.sectionLayout === preset.appearance.sectionLayout &&
                      overrides.appearance.projectsLayout === preset.appearance.projectsLayout &&
                      overrides.appearance.projectsOverflowSize === preset.appearance.projectsOverflowSize &&
                      overrides.appearance.density === preset.appearance.density;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          updateOverrides((current) => ({
                            ...current,
                            appearance: {
                              ...current.appearance,
                              sectionLayout: preset.appearance.sectionLayout,
                              projectsLayout: preset.appearance.projectsLayout,
                              projectsOverflowSize: preset.appearance.projectsOverflowSize,
                              density: preset.appearance.density,
                            },
                          }))
                        }
                        className="grid gap-2 rounded-[0.95rem] border px-4 py-4 text-left transition"
                        style={isActive ? appThemeStyles.accentButton : appThemeStyles.strongSurface}
                      >
                        <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                          {preset.label}
                        </span>
                        <span
                          className="text-xs leading-5"
                          style={isActive ? undefined : appThemeStyles.mutedText}
                        >
                          {preset.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-2 rounded-[1rem] border p-4 sm:col-span-2" style={appThemeStyles.surface}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                    Selected Work Layout
                  </p>
                  <p className="mt-1 text-xs leading-5" style={appThemeStyles.mutedText}>
                    Choose how the extra project cards flow under the featured project.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {([
                    ["side-by-side", "Side by Side"],
                    ["stacked", "Stacked"],
                    ["hybrid", "Mixed"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        updateOverrides((current) => ({
                          ...current,
                          appearance: {
                            ...current.appearance,
                            projectsLayout: value,
                          },
                        }))
                      }
                      className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
                      style={
                        overrides.appearance.projectsLayout === value
                          ? appThemeStyles.accentButton
                          : appThemeStyles.ghostButton
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {overrides.appearance.projectsLayout === "hybrid" ? (
                  <div className="mt-2 grid gap-2 rounded-[0.95rem] border p-3" style={appThemeStyles.strongSurface}>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                        Overflow Card Size
                      </p>
                      <p className="mt-1 text-xs leading-5" style={appThemeStyles.mutedText}>
                        Control how roomy the extra project cards feel under the top mixed row. Phones still stack cleanly.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {([
                        ["compact", "Compact"],
                        ["expanded", "Expanded"],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            updateOverrides((current) => ({
                              ...current,
                              appearance: {
                                ...current.appearance,
                                projectsOverflowSize: value,
                              },
                            }))
                          }
                          className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
                          style={
                            overrides.appearance.projectsOverflowSize === value
                              ? appThemeStyles.accentButton
                              : appThemeStyles.ghostButton
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border p-4" style={appThemeStyles.surface}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.mutedText}>
                  Custom Palette
                </p>
                <p className="text-xs leading-5" style={appThemeStyles.mutedText}>
                  Fine-tune the preset theme with your own colors. These changes carry through preview, templates, public shares, and export.
                </p>
              </div>
              <button
                type="button"
                onClick={clearCustomPalette}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                style={appThemeStyles.ghostButton}
              >
                Clear Palette Overrides
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(PALETTE_FIELD_LABELS) as Array<keyof PreviewTheme["palette"]>).map((paletteKey) => (
                <PaletteFieldControl
                  key={paletteKey}
                  label={PALETTE_FIELD_LABELS[paletteKey]}
                  value={overrides.appearance.customPalette?.[paletteKey] || activePalette[paletteKey]}
                  onChange={(nextValue) => updateCustomPalette(paletteKey, nextValue)}
                  onReset={() => resetCustomPaletteField(paletteKey)}
                  themeStyles={themeStyles}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  function renderBuilderWorkspacePanel() {
    return (
      <Repo2SiteBuilderWorkspacePanel
        previewReady={Boolean(preview)}
        themeStyles={themeStyles}
        selectedSectionLabel={selectedSectionLabel}
        selectedSectionHint={selectedSectionHint}
        visibleCanvasCount={visibleCanvasComponents.length}
        hiddenSectionCount={hiddenSectionCount}
        hiddenBlockCount={hiddenBlockCount}
        isExpanded={isWorkspaceExpanded}
        modeToggleLabel={modeToggleLabel}
        canvasComponents={canvasComponents}
        availableBuiltInSections={availableBuiltInSections}
        hiddenCanvasComponents={hiddenCanvasComponents}
        hiddenChildComponentGroups={hiddenChildComponentGroups}
        hiddenProjectNames={hiddenProjectOptions}
        customProjects={overrides.customProjects}
        projectsLayoutMode={overrides.appearance.projectsLayout}
        projectsOverflowSize={overrides.appearance.projectsOverflowSize}
        selectedSectionId={selectedSectionId}
        sectionLabels={sectionLabels}
        customSectionTitles={customSectionTitles}
        onAddProject={addCustomProject}
        onChangeProject={updateCustomProject}
        onChangeProjectsLayoutMode={(mode) =>
          updateOverrides((current) => ({
            ...current,
            appearance: {
              ...current.appearance,
              projectsLayout: mode,
            },
          }))
        }
        onChangeProjectsOverflowSize={(size) =>
          updateOverrides((current) => ({
            ...current,
            appearance: {
              ...current.appearance,
              projectsOverflowSize: size,
            },
          }))
        }
        onRemoveProject={removeProjectFromSelectedWork}
        onToggleEditMode={() => toggleEditMode()}
        onToggleExpanded={() => toggleWorkspace()}
        onResetCanvas={resetCanvasLayout}
        onOpenCustomize={() => revealInspector("style")}
        onFocusSection={focusSection}
        onAddBuiltInSection={addBuiltInSection}
        onAddCustomSection={addCustomSection}
        onRestoreProject={restoreProjectToSelectedWork}
        onRestoreSection={restoreSection}
        onSetChildComponentVisible={setChildComponentVisible}
      />
    );
  }

  const sharePanelContent = isShareOpen ? (
    <div className="mt-4 rounded-[1.15rem] border p-4" style={themeStyles.surface}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
            Share portfolio
          </p>
          <p className="mt-1 text-sm font-medium">Publish a clean public link you can send to anyone.</p>
          <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
            The shared page shows only the portfolio site, not the editor or internal tools.
          </p>
          <p className="mt-2 text-xs leading-5" style={themeStyles.mutedText}>
            {authSession
              ? `Signed in as @${authSession.username}. This public link will be owned by your GitHub account.`
              : "Sign in with GitHub first so the public link is tied to your account and can be updated safely later."}
          </p>
        </div>
        {sharedPortfolioUrl ? (
          <a
            href={sharedPortfolioUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
            style={themeStyles.ghostButton}
          >
            Open Public Page
          </a>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
            Public URL
          </span>
          <div className="flex items-center overflow-hidden rounded-full border" style={themeStyles.strongSurface}>
            <span className="border-r px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em]" style={{ ...themeStyles.mutedText, borderColor: theme.palette.border }}>
              /u/
            </span>
            <input
              type="text"
              value={shareSlug}
              onChange={(event) => {
                setShareCopied(false);
                setShareCaptionCopied(false);
                setShareError(null);
                setShareSlug(buildShareSlug(event.target.value));
              }}
              placeholder="your-name"
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none"
            />
          </div>
        </label>
        <button
          type="button"
          onClick={handlePublishShareLink}
          disabled={
            !preview ||
            isPublishingShare ||
            shareAvailability?.reason === "invalid" ||
            shareAvailability?.reason === "taken"
          }
          className="rounded-full px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
          style={themeStyles.accentButton}
        >
          {isPublishingShare ? "Publishing..." : sharedPortfolioUrl ? "Update Public Link" : "Publish Public Link"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs leading-5" style={themeStyles.mutedText}>
        {isCheckingShareSlug ? <p>Checking public URL…</p> : null}
        {!isCheckingShareSlug && shareAvailability?.reason === "available" ? (
          <p>This public URL is available.</p>
        ) : null}
        {!isCheckingShareSlug && shareAvailability?.reason === "owned" ? (
          <p>You already control this URL, so publishing will update the existing page.</p>
        ) : null}
        {!isCheckingShareSlug && shareAvailability?.reason === "taken" ? (
          <p>
            That URL is already in use.
            {shareAvailability.suggestedSlug ? ` Try ${shareAvailability.suggestedSlug}.` : ""}
          </p>
        ) : null}
        {!isCheckingShareSlug && shareAvailability?.reason === "invalid" ? (
          <p>Use 2-60 lowercase letters, numbers, and hyphens only.</p>
        ) : null}
      </div>
      {sharedPortfolioUrl ? (
        <div className="mt-4 grid gap-4 rounded-[1rem] border p-4" style={themeStyles.strongSurface}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                Live link
              </p>
              <p className="mt-1 truncate text-sm font-medium">{sharedPortfolioUrl}</p>
              <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
                Published {sharePublishedAt ? new Date(sharePublishedAt).toLocaleString() : "just now"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                style={themeStyles.ghostButton}
              >
                {shareCopied ? "Copied" : "Copy Link"}
              </button>
              {canUseNativeShare ? (
                <button
                  type="button"
                  onClick={handleShareAnywhere}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                  style={themeStyles.ghostButton}
                >
                  Share Anywhere
                </button>
              ) : null}
              <a
                href={sharedPortfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                style={themeStyles.ghostButton}
              >
                Open Public Page
              </a>
            </div>
          </div>
          <div className="rounded-[0.95rem] border p-3" style={themeStyles.surface}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                  Share caption
                </p>
                <p className="mt-1 max-w-3xl text-sm leading-6">{shareText}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyShareCaption}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                  style={themeStyles.ghostButton}
                >
                  {shareCaptionCopied ? "Caption Copied" : "Copy Caption"}
                </button>
                {shareImageUrl ? (
                  <a
                    href={shareImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                    style={themeStyles.ghostButton}
                  >
                    Preview Image
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-[0.95rem] border p-3" style={themeStyles.surface}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                Direct share
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { label: "LinkedIn", href: shareLinkedInHref },
                  { label: "X", href: shareTwitterHref },
                  { label: "Facebook", href: shareFacebookHref },
                  { label: "WhatsApp", href: shareWhatsAppHref },
                  { label: "Telegram", href: shareTelegramHref },
                  { label: "Reddit", href: shareRedditHref },
                  { label: "Email", href: shareEmailHref },
                ].map((platform) => (
                  <a
                    key={platform.label}
                    href={platform.href}
                    target={platform.href.startsWith("mailto:") ? undefined : "_blank"}
                    rel={platform.href.startsWith("mailto:") ? undefined : "noreferrer"}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                    style={themeStyles.ghostButton}
                  >
                    {platform.label}
                  </a>
                ))}
              </div>
            </div>
            <div className="rounded-[0.95rem] border p-3" style={themeStyles.surface}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
                Copy-and-post platforms
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await handleCopyShareLink();
                    await handleCopyShareCaption();
                    openPlatformFallback("https://www.instagram.com/", "Portfolio Share Instagram Prep");
                  }}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                  style={themeStyles.ghostButton}
                >
                  Instagram
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleCopyShareLink();
                    await handleCopyShareCaption();
                    openPlatformFallback("https://www.tiktok.com/", "Portfolio Share TikTok Prep");
                  }}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                  style={themeStyles.ghostButton}
                >
                  TikTok
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleCopyShareLink();
                    await handleCopyShareCaption();
                    trackAnalyticsEvent("Portfolio Share Discord Prep");
                  }}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                  style={themeStyles.ghostButton}
                >
                  Discord
                </button>
              </div>
              <p className="mt-3 text-xs leading-5" style={themeStyles.mutedText}>
                Instagram, TikTok, and Discord work best as copy-and-post flows on the web, so Repo2Site prepares the link and caption for you instead of pretending there is a native one-click share.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-[1rem] border px-4 py-3 text-sm leading-6" style={themeStyles.surface}>
          <p className="font-medium">Publish once, then share anywhere.</p>
          <p className="mt-1" style={themeStyles.mutedText}>
            Repo2Site generates a standalone public page with your approved portfolio content, subtle attribution, and a call-to-action back to the app.
          </p>
        </div>
      )}
      {shareError ? <p className="mt-3 text-sm" style={themeStyles.errorText}>{shareError}</p> : null}
    </div>
  ) : null;

  const templatePanelContent = isTemplateOpen ? (
    <div className="mt-4 rounded-[1.15rem] border p-4" style={themeStyles.surface}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
            Publish template
          </p>
          <p className="mt-1 text-sm font-medium">Share this design as a reusable community template.</p>
          <p className="mt-1 text-xs leading-5" style={themeStyles.mutedText}>
            Templates publish theme and layout choices only. They do not replace another user’s GitHub projects, resume content, or personal profile details.
          </p>
          <p className="mt-2 text-xs leading-5" style={themeStyles.mutedText}>
            {authSession
              ? `Publishing as @${authSession.username}. Template ownership, reactions, and future moderation all follow this account.`
              : "Sign in with GitHub first so your template is published under a real account instead of a browser-local identity."}
          </p>
        </div>
        <Link
          href="/templates"
          className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
          style={themeStyles.ghostButton}
        >
          Open Gallery
        </Link>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
            Template title
          </span>
          <input
            type="text"
            value={templateTitle}
            onChange={(event) => setTemplateTitle(event.target.value)}
            className="rounded-[1rem] border px-4 py-3 text-sm outline-none"
            style={themeStyles.strongSurface}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
            Category
          </span>
          <input
            type="text"
            value={templateCategory}
            onChange={(event) => setTemplateCategory(event.target.value)}
            className="rounded-[1rem] border px-4 py-3 text-sm outline-none"
            style={themeStyles.strongSurface}
          />
        </label>
        <label className="grid gap-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
            Short description
          </span>
          <textarea
            value={templateDescription}
            onChange={(event) => setTemplateDescription(event.target.value)}
            rows={3}
            className="rounded-[1rem] border px-4 py-3 text-sm outline-none"
            style={themeStyles.strongSurface}
          />
        </label>
        <label className="grid gap-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
            Tags
          </span>
          <input
            type="text"
            value={templateTags}
            onChange={(event) => setTemplateTags(event.target.value)}
            placeholder="minimal, product, developer"
            className="rounded-[1rem] border px-4 py-3 text-sm outline-none"
            style={themeStyles.strongSurface}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-5" style={themeStyles.mutedText}>
          Current preset includes theme, color mode, density, card style, section layout, section order, and section visibility.
        </p>
        <button
          type="button"
          onClick={handlePublishTemplate}
          disabled={!preview || isPublishingTemplate}
          className="rounded-full px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
          style={themeStyles.accentButton}
        >
          {isPublishingTemplate ? "Publishing..." : "Publish Template"}
        </button>
      </div>
      {templateMessage ? <p className="mt-3 text-sm" style={themeStyles.successText}>{templateMessage}</p> : null}
      {templateError ? <p className="mt-3 text-sm" style={themeStyles.errorText}>{templateError}</p> : null}
    </div>
  ) : null;

  const completenessPanelContent = preview ? (
    <div className="mt-4 rounded-[1rem] border p-4" style={themeStyles.surface}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={themeStyles.mutedText}>
            Portfolio completeness
          </p>
          <p className="mt-1 text-sm font-medium">{completenessScore}% ready for review</p>
        </div>
        <span
          className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
          style={themeStyles.chip}
        >
          {missingGuidance.length === 0 ? "Looking strong" : `${missingGuidance.length} quick wins`}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${completenessScore}%`, backgroundColor: theme.palette.accent }}
        />
      </div>
      {missingGuidance.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {missingGuidance.map((item) => (
            <span
              key={item}
              className="rounded-full border px-3 py-1 text-xs font-medium"
              style={themeStyles.ghostButton}
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5" style={themeStyles.mutedText}>
          The core sections are filled in. This is a good point to fine-tune copy and export a first version.
        </p>
      )}
    </div>
  ) : null;

  return (
    <main className="min-h-screen px-3 py-3 sm:px-4 sm:py-4 xl:px-5" style={appThemeStyles.page}>
      <div className="mx-auto flex w-full max-w-[112rem] flex-col gap-3">
        <section className="flex flex-col gap-2">
          <div className="rounded-[1.35rem] border px-4 py-3" style={appThemeStyles.navSurface}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] border text-sm font-semibold" style={appThemeStyles.strongSurface}>
                    R2
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight">Repo2Site</p>
                    <p className="text-xs" style={appThemeStyles.mutedText}>
                      Turn GitHub work into a portfolio you can review, edit, and export
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.chip}>
                  {preview?.profile.username ? "Profile live" : "Waiting for source"}
                </span>
                <span className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={isEditMode ? themeStyles.aiBadge : themeStyles.githubBadge}>
                  {isEditMode ? "Tools on" : "Preview mode"}
                </span>
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
                  onClick={cycleAppTheme}
                  className="rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition hover:-translate-y-0.5"
                  style={appThemeStyles.ghostButton}
                >
                  Theme: {themeChoice === "system" ? "System" : themeChoice === "light" ? "Light" : "Dark"}
                </button>
              </div>
            </div>
          </div>

          <Repo2SiteBuilderControlPanels
            appThemeStyles={appThemeStyles}
            themeStyles={themeStyles}
            themeChoice={themeChoice}
            walkthrough={walkthrough}
            getTourHighlightProps={getTourHighlightProps}
            authSession={authSession}
            profileUrl={profileUrl}
            githubImportAutofillNotice={githubImportAutofillNotice}
            isGitHubSignInHelpOpen={isGitHubSignInHelpOpen}
            isLoading={isLoading}
            isEnhancing={isEnhancing}
            isExporting={isExporting}
            previewReady={Boolean(preview)}
            modeToggleLabel={modeToggleLabel}
            pendingAiSuggestionCount={pendingAiSuggestionCount}
            hasOverrides={hasOverrides}
            isQuickStartExpanded={isQuickStartExpanded}
            featureBadges={featureBadges}
            onCycleAppTheme={cycleAppTheme}
            onProfileUrlChange={handleProfileUrlChange}
            onUseSamplePortfolio={handleUseSamplePortfolio}
            onGeneratePortfolio={handleGeneratePortfolio}
            onResumeUploadChange={handleResumeUploadChange}
            onToggleGitHubHelp={() => toggleGitHubHelp()}
            onSignOut={async () => {
              await fetch("/api/auth/session", { method: "DELETE" }).catch(() => null);
              setAuthSession(null);
              setGitHubImportAutofillNotice(null);
              setShareError(null);
              setTemplateError(null);
            }}
            onEnhance={handleEnhance}
            onAcceptAllAiSuggestions={acceptAllAiSuggestions}
            onToggleEditMode={() => toggleEditMode()}
            onToggleSharePanel={() => toggleSharePanel()}
            onToggleTemplatePanel={() => toggleTemplatePanel()}
            onExportZip={handleExportZip}
            onResetOverrides={() => setOverrides(buildEmptyOverrides())}
            onToggleQuickStart={() => toggleQuickStart()}
            sharePanelContent={sharePanelContent}
            templatePanelContent={templatePanelContent}
            completenessPanelContent={completenessPanelContent}
            enhanceError={enhanceError}
          />
        </section>

        <section
          className="rounded-[1.9rem] border shadow-[0_26px_80px_-42px_rgba(15,23,42,0.48)]"
          style={themeStyles.surface}
          {...getTourHighlightProps("tour-generated-preview")}
        >
          <div>
          <article className="min-w-0">
            {error ? (
              <div className="border-b px-6 py-4 text-sm" style={themeStyles.accentBlock}>
                {error}
              </div>
            ) : null}
            <header className="border-b px-5 py-3 backdrop-blur sm:px-7 sm:py-4" style={themeStyles.navSurface}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.mutedText}>
                    Visual Builder
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {preview?.profile.name || "Portfolio Preview"}
                  </p>
                  <p className="mt-1 text-xs" style={themeStyles.mutedText}>
                    {isEditMode && selectedCanvasComponent
                      ? `${selectedSectionLabel} selected. Click, drag, and refine the page directly on the canvas.`
                      : preview?.profile.username
                        ? `@${preview.profile.username}`
                        : "Start by loading GitHub, then use the preview to review and edit the generated site"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isEditMode && selectedCanvasComponent ? (
                    <span
                      className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                      style={themeStyles.chip}
                    >
                      {selectedSectionLabel}
                    </span>
                  ) : null}
                  {!isPreviewMode ? (
                    <button
                      type="button"
                      onClick={() => revealInspector("style")}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] xl:hidden"
                      style={themeStyles.ghostButton}
                    >
                      Customize
                    </button>
                  ) : null}
                </div>
              </div>
            </header>

            <Repo2SiteBuilderCanvas
              previewReady={Boolean(preview)}
              isEditing={isEditMode}
              themeStyles={themeStyles}
              theme={theme}
              densityStackGapClassName={densityClasses.stackGap}
              selectedSectionId={selectedSectionId}
              visibleSectionRows={visibleSectionRows}
              sectionLabels={sectionLabels}
              customSectionTitles={customSectionTitles}
              rowLayoutMode={portfolio.appearance.sectionLayout}
              draggedSectionId={draggedSectionId}
              dropTargetSectionId={dropTargetSectionId}
              hoveredSectionId={hoveredSectionId}
              pendingSectionRemovalId={pendingSectionRemovalId}
              dropPosition={dropPosition}
              resizingSectionIds={resizingSectionIds}
              workspacePanel={renderBuilderWorkspacePanel()}
              firstStepContent={
                  <div className="rounded-[1.6rem] border p-5 sm:p-6" style={themeStyles.sectionSurface}>
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border" style={themeStyles.strongSurface}>
                        <span className="text-lg">↗</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={themeStyles.mutedText}>
                          First Step
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Load a GitHub profile to generate your first portfolio draft.</h2>
                        <p className="mt-3 max-w-3xl text-sm leading-7" style={themeStyles.mutedText}>
                          Repo2Site uses public GitHub details and repository descriptions to build a starting website. After that, you can upload a resume, edit the copy, reorder projects, review AI suggestions, and export the final result.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => walkthrough.openWalkthrough("quick", true)}
                            className="rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                            style={themeStyles.ghostButton}
                          >
                            Start Walkthrough
                          </button>
                          <button
                            type="button"
                            onClick={() => resumeUploadInputRef.current?.click()}
                            className="rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                            style={themeStyles.ghostButton}
                          >
                            Upload Resume First
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
              }
              emptyCanvasActions={
                  <div className="rounded-[1.5rem] border p-5 sm:p-6" style={themeStyles.sectionSurface}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={themeStyles.mutedText}>
                      Empty Canvas
                    </p>
                    <p className="mt-2 text-lg font-semibold">There are no visible sections right now.</p>
                    <p className="mt-2 text-sm leading-6" style={themeStyles.mutedText}>
                      Add a section or restore a hidden one to keep building.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {hiddenCanvasComponents.slice(0, 4).map((component) => (
                        <button
                          key={`empty-restore-${component.id}`}
                          type="button"
                          onClick={() => restoreSection(component.id)}
                          className="rounded-full border px-4 py-2 text-sm font-medium"
                          style={themeStyles.ghostButton}
                        >
                          Restore {component.type === "custom" ? component.title || "Custom Section" : sectionLabels[component.type]}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={addCustomSection}
                        className="rounded-full border px-4 py-2 text-sm font-medium"
                        style={themeStyles.accentButton}
                      >
                        Add Custom Section
                      </button>
                    </div>
                  </div>
              }
              renderSectionContent={renderPreviewSection}
              onFocusSection={focusSection}
              onHoverSection={setHoveredSectionId}
              onSectionDragStart={(sectionId, event) => {
                handleSectionDragStart(sectionId, event);
              }}
              onSectionDragOver={(sectionId, event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                handleSectionDragOver(event, sectionId);
              }}
              onSectionDrop={(sectionId, event) => {
                event.preventDefault();
                handleSectionDrop(sectionId, event);
              }}
              onSectionDragEnd={handleSectionDragEnd}
              onRequestRemoveSection={requestSectionRemoval}
              onCancelRemoveSection={cancelSectionRemoval}
              onMoveSectionRow={updateSectionOrder}
              onRemoveSection={removeSection}
              onPlaceSectionBeside={placeSectionBeside}
              onStackSection={stackSection}
              onAdjustSectionWidth={adjustSectionWidth}
              onSetSectionWidthPreset={setSectionWidthPreset}
              onDuplicateSection={duplicateSection}
              onStartSectionResize={(rowId, leftSectionId, rightSectionId, event) =>
                startSectionResize(rowId, leftSectionId, rightSectionId, event as PointerEvent<HTMLButtonElement>)
              }
            />
          </article>
          </div>
        </section>
      </div>
      <Repo2SiteBuilderCustomizeTool
        isOpen={isCustomizeOpen}
        appThemeStyles={appThemeStyles}
        launcherStyle={customizeLauncherStyle}
        onToggle={toggleCustomizePanel}
      >
        {renderCustomizePanelContent()}
      </Repo2SiteBuilderCustomizeTool>
      <Repo2SiteWalkthroughLauncher
        isOpen={walkthrough.showChoice}
        onStart={() => walkthrough.openWalkthrough("quick", true)}
        onSkip={walkthrough.skipTour}
      />
      <Repo2SiteGuidedTour
        isOpen={walkthrough.isOpen}
        steps={walkthrough.activeSteps}
        completedStepIds={walkthrough.completedStepIds}
        currentStep={walkthrough.currentStep}
        currentStepIndex={walkthrough.currentStepIndex}
        anchorRect={walkthrough.anchorRect}
        onAction={handleWalkthroughAction}
        prefersReducedMotion={walkthrough.prefersReducedMotion}
        onNext={walkthrough.goToNextStep}
        onBack={walkthrough.goToPreviousStep}
        onSkip={walkthrough.skipTour}
        onCloseForNow={walkthrough.closeForNow}
        onFinish={walkthrough.finishTour}
        onJumpToStep={walkthrough.jumpToStep}
      />
    </main>
  );
}
