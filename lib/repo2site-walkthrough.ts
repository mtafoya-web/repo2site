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
};

export type WalkthroughStepDefinition = {
  id: string;
  targetId: string;
  title: string;
  description: string;
  rationale: string;
  modes: WalkthroughMode[];
  isRelevant: (context: WalkthroughContext) => boolean;
  isSatisfied?: (context: WalkthroughContext) => boolean;
  autoAdvanceOnSatisfied?: boolean;
  keepTargetInteractive?: boolean;
};

export type WalkthroughStep = WalkthroughStepDefinition & {
  order: number;
};

export type WalkthroughSnapshot = {
  status: WalkthroughStatus;
  mode: WalkthroughMode;
  stepId: string | null;
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
    id: "resume-upload",
    targetId: "tour-resume-upload",
    title: "Upload a resume",
    description: "Add a resume if you want stronger profile copy from the start.",
    rationale: "It gives Repo2Site more context for wording and presentation.",
    modes: ["quick", "full"],
    isRelevant: () => true,
    isSatisfied: (context) => context.hasResume,
    autoAdvanceOnSatisfied: true,
    keepTargetInteractive: true,
  },
  {
    id: "github-import",
    targetId: "tour-github-import",
    title: "Paste your GitHub link",
    description: "Paste a public GitHub profile, then load your first draft.",
    rationale: "This builds the initial site structure from your repos, profile, and README content.",
    modes: ["quick", "full"],
    isRelevant: () => true,
    isSatisfied: (context) => context.hasPreview,
    autoAdvanceOnSatisfied: true,
    keepTargetInteractive: true,
  },
  {
    id: "profile-edit",
    targetId: "tour-open-editor",
    title: "Open the editor",
    description: "Switch into Edit to change copy, details, and section content directly.",
    rationale: "This is where you turn the generated draft into your version.",
    modes: ["quick", "full"],
    isRelevant: () => true,
    isSatisfied: (context) => context.isEditMode,
    autoAdvanceOnSatisfied: true,
    keepTargetInteractive: true,
  },
  {
    id: "edit-text",
    targetId: "tour-edit-text",
    title: "Edit the text directly",
    description: "Use the text fields in Edit mode to rewrite headings, summaries, and details.",
    rationale: "Manual edits give you the fastest control over tone and accuracy.",
    modes: ["quick", "full"],
    isRelevant: () => true,
    keepTargetInteractive: true,
  },
  {
    id: "project-customize",
    targetId: "tour-projects",
    title: "Rearrange sections and projects",
    description: "Drag cards and sections to put the strongest work first.",
    rationale: "Order shapes the story and helps visitors find the right work faster.",
    modes: ["quick", "full"],
    isRelevant: () => true,
    keepTargetInteractive: true,
  },
  {
    id: "ai-suggestions",
    targetId: "tour-ai",
    title: "Use AI to improve the draft",
    description: "Run AI when you want help with wording, structure, or presentation.",
    rationale: "It is optional and stays reviewable until you accept what helps.",
    modes: ["quick", "full"],
    isRelevant: () => true,
    keepTargetInteractive: true,
  },
  {
    id: "customize-tool",
    targetId: "tour-customize-button",
    title: "Change themes and colors",
    description: "Open Customize to adjust the theme, palette, and overall feel.",
    rationale: "It is the quickest way to shift the look without reworking content.",
    modes: ["quick", "full"],
    isRelevant: () => true,
    isSatisfied: (context) => context.isCustomizeOpen,
    autoAdvanceOnSatisfied: true,
    keepTargetInteractive: true,
  },
  {
    id: "browse-templates",
    targetId: "tour-browse-templates",
    title: "Browse templates for inspiration",
    description: "Open the template gallery to compare layouts and reusable styles.",
    rationale: "Templates help you explore stronger presentation options without starting over.",
    modes: ["quick", "full"],
    isRelevant: () => true,
    keepTargetInteractive: true,
  },
];

export function getWalkthroughSteps(mode: WalkthroughMode, context: WalkthroughContext) {
  return WALKTHROUGH_STEP_DEFINITIONS.filter(
    (step) => step.modes.includes(mode) && step.isRelevant(context),
  ).map((step, order) => ({ ...step, order }));
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
}) {
  const {
    anchorRect,
    cardWidth,
    cardHeight,
    viewportWidth,
    viewportHeight,
    isMobile,
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
      .sort((leftCandidate, rightCandidate) => rightCandidate.score - leftCandidate.score)[0] ?? null;

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
