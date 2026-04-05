"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppTheme } from "@/components/app-theme-provider";
import { buildAppThemeStyles } from "@/lib/app-theme";
import {
  computeWalkthroughLayout,
  getWalkthroughSpotlightStyle,
  type WalkthroughPlacement,
  type WalkthroughStep,
} from "@/lib/repo2site-walkthrough";

function TourLauncher({
  isOpen,
  onStart,
  onExplore,
}: {
  isOpen: boolean;
  onStart: () => void;
  onExplore: () => void;
}) {
  if (!isOpen) {
    return null;
  }

  const { renderTheme } = useAppTheme();
  const appThemeStyles = buildAppThemeStyles(renderTheme);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 pt-10 backdrop-blur-sm sm:items-center sm:py-6" style={{ backgroundColor: renderTheme === "dark" ? "rgba(2, 6, 23, 0.48)" : "rgba(15, 23, 42, 0.2)" }}>
      <div className="w-full max-w-xl overflow-hidden rounded-[1.5rem] border shadow-[0_32px_90px_-38px_rgba(15,23,42,0.38)]" style={appThemeStyles.strongSurface}>
        <div className="grid gap-3 border-b px-5 py-5 sm:px-6" style={{ borderColor: appThemeStyles.surface.borderColor }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={appThemeStyles.mutedText}>
            Welcome to Repo2Site
          </p>
          <div className="grid gap-2">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Start a clear step-by-step builder tour.
            </h2>
            <p className="max-w-2xl text-sm leading-6" style={appThemeStyles.helperText}>
              This walkthrough points at the real controls you will use to import, edit, customize, and export your portfolio.
            </p>
          </div>
        </div>
        <div className="grid gap-3 px-5 py-5 sm:px-6">
          <button
            type="button"
            onClick={onStart}
            className="grid gap-2 rounded-[1.2rem] border px-4 py-4 text-left transition"
            style={appThemeStyles.heroAccent}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={appThemeStyles.infoText}>
              Beginner friendly
            </span>
            <span className="text-base font-semibold tracking-tight">Start walkthrough</span>
            <span className="text-sm leading-6" style={appThemeStyles.helperText}>
              Short, direct guidance that highlights each tool in order.
            </span>
          </button>
        </div>
        <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6" style={{ borderColor: appThemeStyles.surface.borderColor }}>
          <p className="text-xs leading-5" style={appThemeStyles.mutedText}>
            You can restart the tour later from the builder help actions.
          </p>
          <button
            type="button"
            onClick={onExplore}
            className="rounded-full border px-4 py-2 text-sm font-medium transition"
            style={appThemeStyles.ghostButton}
          >
            Explore on my own
          </button>
        </div>
      </div>
    </div>
  );
}

function TourPlacementArrow({
  placement,
  anchorRect,
  cardRect,
}: {
  placement: WalkthroughPlacement;
  anchorRect: DOMRect | null;
  cardRect: DOMRect | null;
}) {
  const { renderTheme } = useAppTheme();
  const appThemeStyles = buildAppThemeStyles(renderTheme);
  if (!anchorRect || !cardRect || placement === "center") {
    return null;
  }

  const size = 14;
  const sharedClassName = "pointer-events-none absolute h-3.5 w-3.5 rotate-45 border";

  if (placement === "top" || placement === "bottom") {
    const targetCenter = anchorRect.left + anchorRect.width / 2;
    const localLeft = Math.max(18, Math.min(cardRect.width - 18, targetCenter - cardRect.left));

    return (
      <span
        aria-hidden="true"
        className={sharedClassName}
        style={{
          borderColor: appThemeStyles.surface.borderColor,
          background: appThemeStyles.strongSurface.background,
          left: localLeft - size / 2,
          top: placement === "top" ? cardRect.height - size / 2 : -size / 2,
        }}
      />
    );
  }

  const targetCenter = anchorRect.top + anchorRect.height / 2;
  const localTop = Math.max(18, Math.min(cardRect.height - 18, targetCenter - cardRect.top));

  return (
    <span
      aria-hidden="true"
      className={sharedClassName}
      style={{
        borderColor: appThemeStyles.surface.borderColor,
        background: appThemeStyles.strongSurface.background,
        top: localTop - size / 2,
        left: placement === "left" ? cardRect.width - size / 2 : -size / 2,
      }}
    />
  );
}

export function Repo2SiteGuidedTour({
  anchorRect,
  currentStep,
  currentStepIndex,
  isOpen,
  prefersReducedMotion,
  steps,
  onBack,
  onCloseForNow,
  onFinish,
  onJumpToStep,
  onNext,
  onSkip,
}: {
  anchorRect: DOMRect | null;
  currentStep: WalkthroughStep | null;
  currentStepIndex: number;
  isOpen: boolean;
  prefersReducedMotion: boolean;
  steps: WalkthroughStep[];
  onBack: () => void;
  onCloseForNow: () => void;
  onFinish: () => void;
  onJumpToStep: (index: number) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { renderTheme } = useAppTheme();
  const appThemeStyles = buildAppThemeStyles(renderTheme);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardRect, setCardRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isOpen || !cardRef.current) {
      return;
    }

    const updateRect = () => {
      if (!cardRef.current) {
        return;
      }

      setCardRect(cardRef.current.getBoundingClientRect());
    };

    updateRect();
    window.addEventListener("resize", updateRect);

    return () => {
      window.removeEventListener("resize", updateRect);
    };
  }, [currentStep?.id, isOpen]);

  useEffect(() => {
    if (!isOpen || !cardRef.current) {
      return;
    }

    cardRef.current.focus();
  }, [currentStep?.id, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseForNow();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (currentStepIndex === steps.length - 1) {
          onFinish();
        } else {
          onNext();
        }
        return;
      }

      if (event.key === "ArrowLeft" && currentStepIndex > 0) {
        event.preventDefault();
        onBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentStepIndex, isOpen, onBack, onCloseForNow, onFinish, onNext, steps.length]);

  if (!isOpen || !currentStep || typeof document === "undefined") {
    return null;
  }

  const isLastStep = currentStepIndex === steps.length - 1;
  const layout = computeWalkthroughLayout({
    anchorRect,
    cardWidth: cardRect?.width ?? 380,
    cardHeight: cardRect?.height ?? 312,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    isMobile: window.innerWidth < 820,
  });
  const spotlightStyle = getWalkthroughSpotlightStyle(anchorRect);
  const showArrow = layout.mode === "floating" && layout.placement !== "center";

  return createPortal(
    <>
      <div
        className="pointer-events-none fixed inset-0 z-[90]"
        style={{ backgroundColor: renderTheme === "dark" ? "rgba(2, 6, 23, 0.46)" : "rgba(15, 23, 42, 0.18)" }}
      />
      {spotlightStyle ? (
        <div
          className="pointer-events-none fixed z-[91] rounded-[1.2rem] border"
          style={{
            ...spotlightStyle,
            borderColor: String(appThemeStyles.accentButton.backgroundColor),
            backgroundColor: renderTheme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.28)",
            boxShadow:
              renderTheme === "dark"
                ? `0 0 0 9999px rgba(2,6,23,0.32), 0 0 0 1px ${String(appThemeStyles.accentButton.backgroundColor)}, 0 24px 80px -40px rgba(37,99,235,0.78)`
                : `0 0 0 9999px rgba(15,23,42,0.14), 0 0 0 1px ${String(appThemeStyles.accentButton.backgroundColor)}, 0 24px 80px -40px rgba(37,99,235,0.28)`,
          }}
        />
      ) : null}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="repo2site-tour-title"
        tabIndex={-1}
        className={`pointer-events-auto fixed z-[95] overflow-y-auto border shadow-[0_32px_90px_-38px_rgba(15,23,42,0.32)] outline-none ${
          layout.mode === "sheet"
            ? "left-4 right-4 rounded-[1.35rem] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
            : "w-[min(24rem,calc(100vw-2rem))] rounded-[1.35rem]"
        }`}
        style={{
          ...appThemeStyles.strongSurface,
          top: layout.mode === "sheet" ? layout.top : layout.top,
          left: layout.mode === "sheet" ? undefined : layout.left,
          maxHeight: layout.maxHeight,
          transition: prefersReducedMotion ? undefined : "top 180ms ease, left 180ms ease",
        }}
      >
        {showArrow ? (
          <TourPlacementArrow
            placement={layout.placement}
            anchorRect={anchorRect}
            cardRect={cardRect}
          />
        ) : null}
        <div className="grid gap-4 border-b px-5 py-4" style={{ borderColor: appThemeStyles.surface.borderColor }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={appThemeStyles.mutedText}>
                  Walkthrough
                </p>
                <span className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={appThemeStyles.ghostButton}>
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
              </div>
              <h2
                id="repo2site-tour-title"
                className="mt-2 text-lg font-semibold tracking-tight sm:text-xl"
              >
                {currentStep.title}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onSkip}
                className="rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition"
                style={appThemeStyles.ghostButton}
              >
                Skip
              </button>
              <button
                type="button"
                onClick={onCloseForNow}
                className="rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition"
                style={appThemeStyles.ghostButton}
              >
                Resume later
              </button>
            </div>
          </div>
        <div className="grid gap-2">
          <p className="text-sm leading-6" style={appThemeStyles.helperText}>{currentStep.description}</p>
          {currentStep.actionLabel ? (
            <p className="text-xs font-medium leading-5" style={appThemeStyles.infoText}>
              Try this now: {currentStep.actionLabel}
            </p>
          ) : null}
          <p className="text-xs leading-5" style={appThemeStyles.mutedText}>
            {currentStep.rationale}
          </p>
          {currentStep.keepTargetInteractive ? (
            <p className="text-xs leading-5" style={appThemeStyles.infoText}>
                The highlighted control stays usable while this step is open.
              </p>
            ) : null}
          </div>
        </div>
        <div className="grid gap-4 px-5 py-4">
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => onJumpToStep(index)}
                aria-label={`Go to walkthrough step ${index + 1}: ${step.title}`}
                className={`rounded-full transition ${
                  index === currentStepIndex
                    ? "h-2.5 w-8"
                    : "h-2.5 w-2.5"
                }`}
                style={{
                  backgroundColor:
                    index === currentStepIndex
                      ? String(appThemeStyles.accentButton.backgroundColor)
                      : renderTheme === "dark"
                        ? "rgba(148,163,184,0.32)"
                        : "rgba(100,116,139,0.34)",
                }}
              />
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onBack}
              disabled={currentStepIndex === 0}
              className="rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-40"
              style={appThemeStyles.ghostButton}
            >
              Back
            </button>
            <button
              type="button"
              onClick={isLastStep ? onFinish : onNext}
              className="rounded-full px-4 py-2 text-sm font-semibold transition"
              style={appThemeStyles.accentButton}
            >
              {isLastStep ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

export function Repo2SiteWalkthroughLauncher(props: {
  isOpen: boolean;
  onExplore: () => void;
  onStart: () => void;
}) {
  return <TourLauncher {...props} />;
}
