"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/48 px-4 pb-4 pt-10 backdrop-blur-sm sm:items-center sm:py-6">
      <div className="w-full max-w-xl overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-950 text-slate-100 shadow-[0_32px_90px_-38px_rgba(15,23,42,0.96)]">
        <div className="grid gap-3 border-b border-slate-800/90 px-5 py-5 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Welcome to Repo2Site
          </p>
          <div className="grid gap-2">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Take a quick tour of the core builder flow.
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              This walkthrough covers the six actions most first-time users need: resume, GitHub, AI, editing, themes, and rearranging the layout.
            </p>
          </div>
        </div>
        <div className="grid gap-3 px-5 py-5 sm:px-6">
          <button
            type="button"
            onClick={onStart}
            className="grid gap-2 rounded-[1.2rem] border border-sky-400/30 bg-sky-500/10 px-4 py-4 text-left transition hover:border-sky-300 hover:bg-sky-500/16"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">
              Beginner friendly
            </span>
            <span className="text-base font-semibold tracking-tight text-slate-50">Start walkthrough</span>
            <span className="text-sm leading-6 text-slate-300">
              Short, practical guidance without locking you into the tour.
            </span>
          </button>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-800/90 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs leading-5 text-slate-400">
            You can restart the tour later from the builder help actions.
          </p>
          <button
            type="button"
            onClick={onExplore}
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500"
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
  if (!anchorRect || !cardRect || placement === "center") {
    return null;
  }

  const size = 14;
  const sharedClassName =
    "pointer-events-none absolute h-3.5 w-3.5 rotate-45 border border-slate-700 bg-slate-950";

  if (placement === "top" || placement === "bottom") {
    const targetCenter = anchorRect.left + anchorRect.width / 2;
    const localLeft = Math.max(18, Math.min(cardRect.width - 18, targetCenter - cardRect.left));

    return (
      <span
        aria-hidden="true"
        className={sharedClassName}
        style={{
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
      <div className="pointer-events-none fixed inset-0 z-[90] bg-slate-950/46" />
      {spotlightStyle ? (
        <div
          className="pointer-events-none fixed z-[91] rounded-[1.2rem] border border-sky-400/80 bg-white/[0.02] shadow-[0_0_0_9999px_rgba(2,6,23,0.32),0_0_0_1px_rgba(56,189,248,0.92),0_24px_80px_-40px_rgba(56,189,248,0.78)]"
          style={spotlightStyle}
        />
      ) : null}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="repo2site-tour-title"
        tabIndex={-1}
        className={`pointer-events-auto fixed z-[95] overflow-y-auto border border-slate-700 bg-slate-950 text-slate-100 shadow-[0_32px_90px_-38px_rgba(15,23,42,0.96)] outline-none ${
          layout.mode === "sheet"
            ? "left-4 right-4 rounded-[1.35rem] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
            : "w-[min(24rem,calc(100vw-2rem))] rounded-[1.35rem]"
        }`}
        style={{
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
        <div className="grid gap-4 border-b border-slate-800/90 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Walkthrough
                </p>
                <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
              </div>
              <h2
                id="repo2site-tour-title"
                className="mt-2 text-lg font-semibold tracking-tight text-slate-50 sm:text-xl"
              >
                {currentStep.title}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onSkip}
                className="rounded-full border border-slate-700 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 transition hover:border-slate-500"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={onCloseForNow}
                className="rounded-full border border-slate-700 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 transition hover:border-slate-500"
              >
                Resume later
              </button>
            </div>
          </div>
          <div className="grid gap-2">
            <p className="text-sm leading-6 text-slate-200">{currentStep.description}</p>
            <p className="text-xs leading-5 text-slate-400">
              Why it matters: {currentStep.rationale}
            </p>
            {currentStep.keepTargetInteractive ? (
              <p className="text-xs leading-5 text-sky-300/90">
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
                    ? "h-2.5 w-8 bg-sky-400"
                    : "h-2.5 w-2.5 bg-slate-700 hover:bg-slate-500"
                }`}
              />
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onBack}
              disabled={currentStepIndex === 0}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={isLastStep ? onFinish : onNext}
              className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
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
