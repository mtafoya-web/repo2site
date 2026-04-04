import { useEffect, useRef, useState } from "react";
import {
  getClosestStepId,
  getWalkthroughStepById,
  getWalkthroughSteps,
  readWalkthroughSnapshot,
  resolveWalkthroughTarget,
  scrollWalkthroughTargetIntoView,
  type WalkthroughContext,
  type WalkthroughMode,
  type WalkthroughStatus,
  writeWalkthroughSnapshot,
} from "@/lib/repo2site-walkthrough";

type UseRepo2SiteWalkthroughOptions = {
  context: WalkthroughContext;
  onTrackEvent?: (event: string, payload?: Record<string, string | number | boolean>) => void;
};

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => {
      mediaQuery.removeEventListener("change", update);
    };
  }, [query]);

  return matches;
}

export function useRepo2SiteWalkthrough({
  context,
  onTrackEvent,
}: UseRepo2SiteWalkthroughOptions) {
  const [showChoice, setShowChoice] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<WalkthroughMode>("quick");
  const [status, setStatus] = useState<WalkthroughStatus>("new");
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const isMobile = useMediaQuery("(max-width: 820px)");
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const activeSteps = getWalkthroughSteps(mode, context);
  const currentStep = getWalkthroughStepById(currentStepId, activeSteps);
  const currentStepIndex = currentStep ? activeSteps.findIndex((step) => step.id === currentStep.id) : 0;
  const activeTargetId = currentStep?.targetId ?? null;
  const skipInFlightRef = useRef(false);
  const autoAdvanceBaselineRef = useRef<{ stepId: string | null; satisfied: boolean }>({
    stepId: null,
    satisfied: false,
  });

  useEffect(() => {
    const snapshot = readWalkthroughSnapshot(window.localStorage);

    if (!snapshot) {
      setShowChoice(true);
      return;
    }

    setMode(snapshot.mode);
    setStatus(snapshot.status);
    setCurrentStepId(snapshot.stepId);
    setCompletedStepIds(snapshot.completedStepIds);
  }, []);

  useEffect(() => {
    if (!currentStepId) {
      return;
    }

    if (currentStep) {
      return;
    }

    const nextStepId = getClosestStepId(mode, currentStepId, context);

    if (!nextStepId) {
      setAnchorRect(null);
      setIsOpen(false);
      return;
    }

    setCurrentStepId(nextStepId);
  }, [context, currentStep, currentStepId, mode]);

  useEffect(() => {
    if (!isOpen || !currentStep || !currentStep.isSatisfied || !currentStep.autoAdvanceOnSatisfied) {
      return;
    }

    const isSatisfied = currentStep.isSatisfied(context);
    const baseline = autoAdvanceBaselineRef.current;

    if (baseline.stepId !== currentStep.id) {
      autoAdvanceBaselineRef.current = {
        stepId: currentStep.id,
        satisfied: isSatisfied,
      };
      return;
    }

    if (!isSatisfied || baseline.satisfied) {
      autoAdvanceBaselineRef.current = {
        stepId: currentStep.id,
        satisfied: isSatisfied,
      };
      return;
    }

    const nextStep = activeSteps[currentStepIndex + 1];
    autoAdvanceBaselineRef.current = {
      stepId: currentStep.id,
      satisfied: true,
    };

    if (!nextStep) {
      const nextCompletedStepIds = [...new Set([...completedStepIds, currentStep.id])];
      setCompletedStepIds(nextCompletedStepIds);
      setIsOpen(false);
      setStatus("completed");
      writeWalkthroughSnapshot(window.localStorage, {
        status: "completed",
        mode,
        stepId: currentStep.id,
        completedStepIds: nextCompletedStepIds,
      });
      onTrackEvent?.("Walkthrough Completed", { mode });
      return;
    }

    const nextCompletedStepIds = [...new Set([...completedStepIds, currentStep.id])];
    setCompletedStepIds(nextCompletedStepIds);
    setCurrentStepId(nextStep.id);
    writeWalkthroughSnapshot(window.localStorage, {
      status: "in_progress",
      mode,
      stepId: nextStep.id,
      completedStepIds: nextCompletedStepIds,
    });
  }, [activeSteps, completedStepIds, context, currentStep, currentStepIndex, isOpen, mode, onTrackEvent]);

  useEffect(() => {
    if (!isOpen || !activeTargetId) {
      setAnchorRect(null);
      return;
    }

    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;

    const syncRect = () => {
      const element = resolveWalkthroughTarget(activeTargetId);

      if (!element) {
        if (retryCount < 16) {
          retryCount += 1;
          retryTimeout = setTimeout(syncRect, 120);
          return;
        }

        if (!cancelled && !skipInFlightRef.current) {
          skipInFlightRef.current = true;
          window.setTimeout(() => {
            skipInFlightRef.current = false;
            const nextStep = activeSteps[currentStepIndex + 1];

            if (nextStep) {
              setCurrentStepId(nextStep.id);
              writeWalkthroughSnapshot(window.localStorage, {
                status: "in_progress",
                mode,
                stepId: nextStep.id,
                completedStepIds,
              });
            } else {
              setIsOpen(false);
              setStatus("completed");
              writeWalkthroughSnapshot(window.localStorage, {
                status: "completed",
                mode,
                stepId: currentStep?.id ?? null,
                completedStepIds,
              });
            }
          }, 0);
        }

        return;
      }

      scrollWalkthroughTargetIntoView(element, {
        prefersReducedMotion,
        isMobile,
      });

      window.requestAnimationFrame(() => {
        if (cancelled) {
          return;
        }

        setAnchorRect(element.getBoundingClientRect());
      });
    };

    const handleViewportChange = () => {
      const element = resolveWalkthroughTarget(activeTargetId);
      setAnchorRect(element ? element.getBoundingClientRect() : null);
    };

    syncRect();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      cancelled = true;

      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }

      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [
    activeSteps,
    activeTargetId,
    completedStepIds,
    currentStep?.id,
    currentStepIndex,
    isOpen,
    isMobile,
    mode,
    prefersReducedMotion,
  ]);

  function persist(
    nextStatus: WalkthroughStatus,
    nextStepId: string | null,
    nextMode = mode,
    nextCompletedStepIds = completedStepIds,
  ) {
    setStatus(nextStatus);
    writeWalkthroughSnapshot(window.localStorage, {
      status: nextStatus,
      mode: nextMode,
      stepId: nextStepId,
      completedStepIds: nextCompletedStepIds,
    });
  }

  function markStepComplete(stepId: string | null) {
    if (!stepId) {
      return completedStepIds;
    }

    const nextCompleted = [...new Set([...completedStepIds, stepId])];
    setCompletedStepIds(nextCompleted);
    return nextCompleted;
  }

  function openWalkthrough(nextMode: WalkthroughMode, fromBeginning = false) {
    const steps = getWalkthroughSteps(nextMode, context);
    const stepId = fromBeginning
      ? steps[0]?.id ?? null
      : getWalkthroughStepById(currentStepId, steps)?.id ?? steps[0]?.id ?? null;

    setMode(nextMode);
    setCurrentStepId(stepId);
    if (fromBeginning) {
      setCompletedStepIds([]);
    }
    autoAdvanceBaselineRef.current = { stepId: null, satisfied: false };
    setShowChoice(false);
    setIsOpen(true);
    persist("in_progress", stepId, nextMode, fromBeginning ? [] : completedStepIds);
    onTrackEvent?.("Walkthrough Started", {
      mode: nextMode,
      resumed: !fromBeginning,
      step: stepId ? steps.findIndex((step) => step.id === stepId) + 1 : 0,
    });
  }

  function closeForNow() {
    setShowChoice(false);
    setIsOpen(false);
    persist("in_progress", currentStep?.id ?? currentStepId);
    onTrackEvent?.("Walkthrough Dismissed", { mode, step: currentStepIndex + 1 });
  }

  function skipTour() {
    setShowChoice(false);
    setIsOpen(false);
    persist("skipped", currentStep?.id ?? currentStepId, mode, markStepComplete(currentStep?.id ?? currentStepId));
    onTrackEvent?.("Walkthrough Skipped", { mode, step: currentStepIndex + 1 });
  }

  function finishTour() {
    setShowChoice(false);
    setIsOpen(false);
    persist("completed", currentStep?.id ?? currentStepId, mode, markStepComplete(currentStep?.id ?? currentStepId));
    onTrackEvent?.("Walkthrough Completed", { mode });
  }

  function showLauncher() {
    setShowChoice(true);
    setIsOpen(false);
  }

  function goToNextStep() {
    const nextStep = activeSteps[currentStepIndex + 1];

    if (!nextStep) {
      finishTour();
      return;
    }

    const nextCompleted = markStepComplete(currentStep?.id ?? currentStepId);
    setCurrentStepId(nextStep.id);
    autoAdvanceBaselineRef.current = { stepId: null, satisfied: false };
    persist("in_progress", nextStep.id, mode, nextCompleted);
  }

  function goToPreviousStep() {
    const previousStep = activeSteps[currentStepIndex - 1];

    if (!previousStep) {
      return;
    }

    setCurrentStepId(previousStep.id);
    autoAdvanceBaselineRef.current = { stepId: null, satisfied: false };
    persist("in_progress", previousStep.id);
  }

  function jumpToStep(index: number) {
    const nextStep = activeSteps[index];

    if (!nextStep) {
      return;
    }

    setCurrentStepId(nextStep.id);
    autoAdvanceBaselineRef.current = { stepId: null, satisfied: false };
    persist("in_progress", nextStep.id);
  }

  return {
    activeSteps,
    anchorRect,
    completedStepIds,
    currentStep,
    currentStepIndex,
    isOpen,
    mode,
    prefersReducedMotion,
    showChoice,
    status,
    closeForNow,
    finishTour,
    goToNextStep,
    goToPreviousStep,
    jumpToStep,
    openWalkthrough,
    setShowChoice,
    showLauncher,
    skipTour,
  };
}
