export const WALKTHROUGH_STORAGE_KEY = "repo2site-walkthrough-state";
export const WALKTHROUGH_TARGET_ATTRIBUTE = "data-tour-id";
export const WALKTHROUGH_MOBILE_BREAKPOINT = 820;

export type WalkthroughStatus = "new" | "in_progress" | "skipped" | "completed";
export type WalkthroughMode = "quick" | "full";
export type WalkthroughPlacement = "top" | "right" | "bottom" | "left" | "center";
export type WalkthroughRenderMode = "floating" | "sheet";

export type WalkthroughContext = {
  hasPreview: boolean;
  hasResume: boolean;
  hasProjects: boolean;
  hasPendingAiSuggestions: boolean;
  isCustomizeOpen: boolean;
  isEditMode: boolean;
  isPreviewMode: boolean;
  hasHeroEdit: boolean;
  hasAboutEdit: boolean;
  hasProjectEdit: boolean;
  hasLayoutChange: boolean;
  hasThemeChange: boolean;
};

export type WalkthroughActionKind =
  | "focus-github-input"
  | "open-edit-mode"
  | "focus-hero"
  | "focus-about"
  | "focus-workspace"
  | "open-customize"
  | "switch-preview-mode"
  | "return-to-editor"
  | "open-export";

export type WalkthroughStepAction = {
  kind: WalkthroughActionKind;
  label: string;
};

export type WalkthroughStepDefinition = {
  order: number;
  id: string;
  targetId: string;
  title: string;
  description: string;
  interactionHint?: string;
  modes: WalkthroughMode[];
  preferredPlacement?: WalkthroughPlacement;
  isRelevant: (context: WalkthroughContext) => boolean;
  isSatisfied?: (context: WalkthroughContext) => boolean;
  autoAdvanceOnSatisfied?: boolean;
  keepTargetInteractive?: boolean;
  primaryAction?: WalkthroughStepAction;
  secondaryAction?: WalkthroughStepAction;
  completionText?: string;
};

export type WalkthroughStep = WalkthroughStepDefinition & {
  order: number;
};

export type WalkthroughSnapshot = {
  status: WalkthroughStatus;
  mode: WalkthroughMode;
  stepId: string | null;
  completedStepIds: string[];
};

export type WalkthroughLayout = {
  mode: WalkthroughRenderMode;
  placement: WalkthroughPlacement;
  top: number;
  left: number;
  maxHeight: number;
};

const WALKTHROUGH_STEP_DEFINITIONS: WalkthroughStepDefinition[] = [
  {
    order: 1,
    id: "resume-import",
    targetId: "tour-resume-upload",
    title: "Import a resume if you want",
    description: "This is optional. A resume can help improve the content, but you can skip it.",
    interactionHint: "Use this when you want stronger context for your portfolio.",
    modes: ["quick", "full"],
    preferredPlacement: "right",
    isRelevant: () => true,
  },
  {
    order: 2,
    id: "generate",
    targetId: "tour-generate-portfolio",
    title: "This is the generate button",
    description: "Use Generate to create or refresh the portfolio from your current data.",
    interactionHint: "The walkthrough will not run this for you.",
    modes: ["quick", "full"],
    preferredPlacement: "bottom",
    isRelevant: () => true,
  },
  {
    order: 3,
    id: "live-canvas",
    targetId: "tour-generated-preview",
    title: "This is the live canvas",
    description: "This is the live version of your site. Changes appear here in real time.",
    modes: ["quick", "full"],
    preferredPlacement: "top",
    isRelevant: () => true,
  },
  {
    order: 4,
    id: "edit-canvas",
    targetId: "tour-hero-headline",
    title: "Click sections to edit them",
    description: "Select a section to edit its content on the canvas or through the editing controls.",
    interactionHint: "Try clicking the highlighted section.",
    modes: ["quick", "full"],
    isRelevant: (context) => context.hasPreview,
    keepTargetInteractive: true,
    preferredPlacement: "right",
    primaryAction: {
      kind: "focus-hero",
      label: "Focus a section",
    },
  },
  {
    order: 5,
    id: "customize-theme",
    targetId: "tour-customize-button",
    title: "This is the customize button",
    description: "Use Customize to change theme, colors, and visual styling across the site.",
    interactionHint: "Open it to see your visual changes update immediately.",
    modes: ["quick", "full"],
    preferredPlacement: "left",
    isRelevant: (context) => context.hasPreview,
    isSatisfied: (context) => context.isCustomizeOpen,
    autoAdvanceOnSatisfied: true,
    keepTargetInteractive: true,
    primaryAction: {
      kind: "open-customize",
      label: "Open customize",
    },
  },
  {
    order: 6,
    id: "enhance-ai",
    targetId: "tour-ai",
    title: "This is the enhance with AI button",
    description: "Use AI to improve descriptions, summaries, and other content when you want help refining the draft.",
    interactionHint: "AI enhancement is optional.",
    modes: ["quick", "full"],
    preferredPlacement: "left",
    isRelevant: () => true,
  },
  {
    order: 7,
    id: "publish-download",
    targetId: "tour-publish-options",
    title: "These are the download and publish actions",
    description: "Use these options to export the site or publish it through the default GitHub to Vercel flow or your own setup.",
    interactionHint: "You can publish later. Export is a good first step.",
    modes: ["quick", "full"],
    preferredPlacement: "left",
    isRelevant: () => true,
  },
  {
    order: 8,
    id: "finish",
    targetId: "tour-publish-options",
    title: "You know the core workflow now",
    description: "Import a resume if you want, generate, edit, customize, enhance, and publish when you are ready.",
    modes: ["quick", "full"],
    preferredPlacement: "left",
    isRelevant: () => true,
    keepTargetInteractive: true,
  },
];

export function getWalkthroughSteps(mode: WalkthroughMode, context: WalkthroughContext) {
  return WALKTHROUGH_STEP_DEFINITIONS.filter(
    (step) => step.modes.includes(mode) && step.isRelevant(context),
  )
    .sort((leftStep, rightStep) => leftStep.order - rightStep.order)
    .map((step) => ({ ...step }));
}

export function getWalkthroughStepById(stepId: string | null, steps: WalkthroughStep[]) {
  if (!stepId) {
    return null;
  }

  return steps.find((step) => step.id === stepId) ?? null;
}

export function getClosestStepId(
  mode: WalkthroughMode,
  currentStepId: string | null,
  context: WalkthroughContext,
) {
  const steps = getWalkthroughSteps(mode, context);

  if (steps.length === 0) {
    return null;
  }

  if (!currentStepId) {
    return steps[0].id;
  }

  const globalIndex = WALKTHROUGH_STEP_DEFINITIONS.findIndex((step) => step.id === currentStepId);

  const next = steps.find(
    (step) =>
      WALKTHROUGH_STEP_DEFINITIONS.findIndex((candidate) => candidate.id === step.id) > globalIndex,
  );

  if (next) {
    return next.id;
  }

  const previous = [...steps]
    .reverse()
    .find(
      (step) =>
        WALKTHROUGH_STEP_DEFINITIONS.findIndex((candidate) => candidate.id === step.id) < globalIndex,
    );

  return previous?.id ?? steps[0].id;
}

export function readWalkthroughSnapshot(storage: Storage | null | undefined) {
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(WALKTHROUGH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WalkthroughSnapshot> & { stepIndex?: number };

    return {
      status: parsed.status ?? "completed",
      mode: parsed.mode === "full" ? "full" : "quick",
      stepId: typeof parsed.stepId === "string" ? parsed.stepId : null,
      completedStepIds: Array.isArray(parsed.completedStepIds)
        ? parsed.completedStepIds.filter((stepId): stepId is string => typeof stepId === "string")
        : [],
    } satisfies WalkthroughSnapshot;
  } catch {
    return null;
  }
}

export function writeWalkthroughSnapshot(
  storage: Storage | null | undefined,
  snapshot: WalkthroughSnapshot,
) {
  if (!storage) {
    return;
  }

  storage.setItem(WALKTHROUGH_STORAGE_KEY, JSON.stringify(snapshot));
}

export function resolveWalkthroughTarget(targetId: string) {
  const selector = `[${WALKTHROUGH_TARGET_ATTRIBUTE}="${targetId}"]`;
  const element = document.querySelector<HTMLElement>(selector);

  if (!element || !element.isConnected) {
    return null;
  }

  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.pointerEvents === "none" ||
    element.getAttribute("aria-hidden") === "true" ||
    rect.width < 1 ||
    rect.height < 1
  ) {
    return null;
  }

  if (
    (element instanceof HTMLButtonElement ||
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement) &&
    element.disabled
  ) {
    return null;
  }

  return element;
}

export function scrollWalkthroughTargetIntoView(
  element: HTMLElement,
  options: {
    prefersReducedMotion: boolean;
    isMobile: boolean;
  },
) {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const safeTop = 20;
  const safeBottom = options.isMobile ? 176 : 88;
  const safeHorizontal = 20;

  const fullyVisible =
    rect.top >= safeTop &&
    rect.bottom <= viewportHeight - safeBottom &&
    rect.left >= safeHorizontal &&
    rect.right <= viewportWidth - safeHorizontal;

  if (fullyVisible) {
    return;
  }

  element.scrollIntoView({
    block: options.isMobile ? "center" : "nearest",
    inline: "nearest",
    behavior: options.prefersReducedMotion ? "auto" : "smooth",
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function computeWalkthroughLayout(options: {
  anchorRect: DOMRect | null;
  cardWidth: number;
  cardHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  isMobile: boolean;
  preferredPlacement?: WalkthroughPlacement;
}) {
  const {
    anchorRect,
    cardWidth,
    cardHeight,
    viewportWidth,
    viewportHeight,
    isMobile,
    preferredPlacement,
  } = options;
  const safeLeft = 16;
  const safeRight = 16;
  const safeTop = 14;
  const safeBottom = isMobile ? 18 : 24;
  const availableWidth = viewportWidth - safeLeft - safeRight;
  const resolvedWidth = Math.min(cardWidth, availableWidth);
  const sheetHeight = Math.min(cardHeight, viewportHeight - safeTop - safeBottom);

  if (!anchorRect) {
    if (isMobile) {
      return {
        mode: "sheet" as const,
        placement: "center" as const,
        top: viewportHeight - sheetHeight - safeBottom,
        left: safeLeft,
        maxHeight: viewportHeight - safeTop - safeBottom,
      };
    }

    return {
      mode: "floating" as const,
      placement: "center" as const,
      top: clamp((viewportHeight - cardHeight) / 2, safeTop, viewportHeight - cardHeight - safeBottom),
      left: clamp((viewportWidth - resolvedWidth) / 2, safeLeft, viewportWidth - resolvedWidth - safeRight),
      maxHeight: viewportHeight - safeTop - safeBottom,
    };
  }

  const mobileNeedsSheet =
    isMobile &&
    (viewportWidth < WALKTHROUGH_MOBILE_BREAKPOINT ||
      cardHeight > viewportHeight * 0.42 ||
      anchorRect.bottom > viewportHeight - 220);

  if (mobileNeedsSheet) {
    return {
      mode: "sheet" as const,
      placement: "bottom" as const,
      top: viewportHeight - sheetHeight - safeBottom,
      left: safeLeft,
      maxHeight: viewportHeight - safeTop - safeBottom,
    };
  }

  const gap = 18;
  const candidates = [
    {
      placement: "right" as const,
      top: clamp(
        anchorRect.top + anchorRect.height / 2 - cardHeight / 2,
        safeTop,
        viewportHeight - cardHeight - safeBottom,
      ),
      left: anchorRect.right + gap,
      score: viewportWidth - anchorRect.right,
      fits:
        viewportWidth - anchorRect.right - gap >= Math.min(resolvedWidth, 260) &&
        cardHeight <= viewportHeight - safeTop - safeBottom,
    },
    {
      placement: "left" as const,
      top: clamp(
        anchorRect.top + anchorRect.height / 2 - cardHeight / 2,
        safeTop,
        viewportHeight - cardHeight - safeBottom,
      ),
      left: anchorRect.left - resolvedWidth - gap,
      score: anchorRect.left,
      fits:
        anchorRect.left - gap >= Math.min(resolvedWidth, 260) &&
        cardHeight <= viewportHeight - safeTop - safeBottom,
    },
    {
      placement: "bottom" as const,
      top: anchorRect.bottom + gap,
      left: clamp(
        anchorRect.left + anchorRect.width / 2 - resolvedWidth / 2,
        safeLeft,
        viewportWidth - resolvedWidth - safeRight,
      ),
      score: viewportHeight - anchorRect.bottom,
      fits: viewportHeight - anchorRect.bottom - gap >= Math.min(cardHeight, 240),
    },
    {
      placement: "top" as const,
      top: anchorRect.top - cardHeight - gap,
      left: clamp(
        anchorRect.left + anchorRect.width / 2 - resolvedWidth / 2,
        safeLeft,
        viewportWidth - resolvedWidth - safeRight,
      ),
      score: anchorRect.top,
      fits: anchorRect.top - gap >= Math.min(cardHeight, 240),
    },
  ];

  const bestCandidate =
    candidates
      .filter((candidate) => candidate.fits)
      .sort((leftCandidate, rightCandidate) => {
        const leftPriority = leftCandidate.placement === preferredPlacement ? 1 : 0;
        const rightPriority = rightCandidate.placement === preferredPlacement ? 1 : 0;

        if (leftPriority !== rightPriority) {
          return rightPriority - leftPriority;
        }

        return rightCandidate.score - leftCandidate.score;
      })[0] ?? null;

  if (!bestCandidate) {
    return {
      mode: isMobile ? ("sheet" as const) : ("floating" as const),
      placement: isMobile ? ("bottom" as const) : ("center" as const),
      top: isMobile
        ? viewportHeight - sheetHeight - safeBottom
        : clamp((viewportHeight - cardHeight) / 2, safeTop, viewportHeight - cardHeight - safeBottom),
      left: isMobile
        ? safeLeft
        : clamp((viewportWidth - resolvedWidth) / 2, safeLeft, viewportWidth - resolvedWidth - safeRight),
      maxHeight: viewportHeight - safeTop - safeBottom,
    };
  }

  return {
    mode: "floating" as const,
    placement: bestCandidate.placement,
    top: clamp(bestCandidate.top, safeTop, viewportHeight - cardHeight - safeBottom),
    left: clamp(bestCandidate.left, safeLeft, viewportWidth - resolvedWidth - safeRight),
    maxHeight: viewportHeight - safeTop - safeBottom,
  };
}

export function getWalkthroughSpotlightStyle(anchorRect: DOMRect | null) {
  if (!anchorRect) {
    return null;
  }

  const inset = 10;
  const top = clamp(anchorRect.top - inset, 8, window.innerHeight - 24);
  const left = clamp(anchorRect.left - inset, 8, window.innerWidth - 24);
  const width = clamp(anchorRect.width + inset * 2, 36, window.innerWidth - left - 8);
  const height = clamp(anchorRect.height + inset * 2, 36, window.innerHeight - top - 8);

  return { top, left, width, height };
}
