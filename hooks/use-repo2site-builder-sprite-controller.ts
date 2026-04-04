"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PreviewTheme } from "@/lib/types";

export type BuilderSpriteReactionType =
  | "drag-start"
  | "drag-end"
  | "ai-accepted"
  | "editor-open"
  | "theme-change"
  | "export";

export type BuilderSpriteReactionSignal = {
  type: BuilderSpriteReactionType;
  nonce: number;
  meta?: string;
};

type SpriteBehavior = "idle" | "wander" | "play" | "sleep" | "react" | "interact";
type SpriteExpression = "neutral" | "blink" | "curious" | "happy" | "sleepy" | "surprised";
type SpriteMotion = "idle" | "walk" | "hop" | "celebrate" | "sleep" | "snack";
type SpriteLook = "left" | "center" | "right";

const IDLE_MESSAGES = ["clean layout", "steady build", "nice flow"];
const PLAY_MESSAGES = ["you cooking", "tiny victory", "looking sharp"];
const SLEEP_MESSAGES = ["nap mode", "dreaming in JSX", "tiny reboot"];
const SNACK_MESSAGES = ["coffee break", "debug snack", "tiny fuel"];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chooseRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

export function useRepo2SiteBuilderSpriteController({
  enabled,
  palette,
  reaction,
}: {
  enabled: boolean;
  palette: PreviewTheme["palette"];
  reaction: BuilderSpriteReactionSignal | null;
}) {
  const [behavior, setBehavior] = useState<SpriteBehavior>("idle");
  const [expression, setExpression] = useState<SpriteExpression>("neutral");
  const [motion, setMotion] = useState<SpriteMotion>("idle");
  const [look, setLook] = useState<SpriteLook>("center");
  const [message, setMessage] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const schedulerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const shellShadow = useMemo(
    () => ({
      filter: `drop-shadow(0 24px 40px ${palette.pageAccent}) drop-shadow(0 4px 16px rgba(15,23,42,0.32))`,
    }),
    [palette.pageAccent],
  );

  const faceGlow = useMemo(
    () => ({
      stopA: palette.surfaceStrong,
      stopB: palette.pageAccent,
      accent: palette.accent,
      accentSoft: palette.accentSoft,
    }),
    [palette],
  );

  useEffect(() => {
    return () => {
      if (schedulerRef.current) clearTimeout(schedulerRef.current);
      if (resetRef.current) clearTimeout(resetRef.current);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (schedulerRef.current) clearTimeout(schedulerRef.current);
      if (resetRef.current) clearTimeout(resetRef.current);
      setBehavior("idle");
      setExpression("neutral");
      setMotion("idle");
      setMessage(null);
      setOffset({ x: 0, y: 0 });
      return;
    }

    function clearReset() {
      if (resetRef.current) {
        clearTimeout(resetRef.current);
        resetRef.current = null;
      }
    }

    function scheduleReturn(delay: number) {
      clearReset();
      resetRef.current = setTimeout(() => {
        setBehavior("idle");
        setExpression("neutral");
        setMotion("idle");
        setMessage(null);
        setOffset({ x: 0, y: 0 });
      }, delay);
    }

    function queueNextBehavior() {
      if (schedulerRef.current) {
        clearTimeout(schedulerRef.current);
      }

      schedulerRef.current = setTimeout(() => {
        const inactiveFor = Date.now() - lastActivityRef.current;
        const roll = Math.random();

        if (inactiveFor > 12000 && roll < 0.34) {
          setBehavior("sleep");
          setExpression("sleepy");
          setMotion("sleep");
          setLook("center");
          setMessage(chooseRandom(SLEEP_MESSAGES));
          setOffset({ x: randomBetween(-2, 12), y: 4 });
          scheduleReturn(2800);
          queueNextBehavior();
          return;
        }

        if (roll < 0.38) {
          setBehavior("wander");
          setExpression(Math.random() < 0.55 ? "curious" : "neutral");
          setMotion("walk");
          setLook(chooseRandom<SpriteLook>(["left", "center", "right"]));
          setOffset({ x: randomBetween(-18, 92), y: randomBetween(-8, 3) });

          if (Math.random() < 0.12) {
            setMessage(chooseRandom(IDLE_MESSAGES));
          }

          scheduleReturn(1700);
        } else if (roll < 0.54) {
          setBehavior("play");
          setExpression("happy");
          setMotion("snack");
          setLook("center");
          setMessage(chooseRandom(SNACK_MESSAGES));
          setOffset({ x: randomBetween(-2, 14), y: 0 });
          scheduleReturn(2200);
        } else {
          setBehavior("idle");
          setExpression(Math.random() < 0.18 ? "blink" : "neutral");
          setMotion("idle");
          setLook(chooseRandom<SpriteLook>(["left", "center", "right"]));

          if (Math.random() < 0.06) {
            setMessage(chooseRandom(IDLE_MESSAGES));
            scheduleReturn(1600);
          }
        }

        queueNextBehavior();
      }, randomBetween(3000, 8000));
    }

    queueNextBehavior();

    return () => {
      if (schedulerRef.current) {
        clearTimeout(schedulerRef.current);
        schedulerRef.current = null;
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !reaction) {
      return;
    }

    lastActivityRef.current = Date.now();

    if (resetRef.current) {
      clearTimeout(resetRef.current);
    }

    const reactionMap: Record<
      BuilderSpriteReactionType,
      {
        behavior: SpriteBehavior;
        expression: SpriteExpression;
        motion: SpriteMotion;
        message: string;
        look: SpriteLook;
      }
    > = {
      "drag-start": { behavior: "react", expression: "curious", motion: "walk", message: "nice drag", look: "right" },
      "drag-end": { behavior: "react", expression: "happy", motion: "hop", message: "clean move", look: "center" },
      "ai-accepted": { behavior: "react", expression: "happy", motion: "celebrate", message: "smart pick", look: "center" },
      "editor-open": { behavior: "react", expression: "curious", motion: "hop", message: "builder ready", look: "left" },
      "theme-change": { behavior: "react", expression: "surprised", motion: "hop", message: "new vibe", look: "center" },
      export: { behavior: "react", expression: "happy", motion: "celebrate", message: "ship it", look: "center" },
    };

    const next = reactionMap[reaction.type];
    setBehavior(next.behavior);
    setExpression(next.expression);
    setMotion(next.motion);
    setMessage(next.message);
    setLook(next.look);
    setOffset({
      x: reaction.type === "drag-start" ? 16 : reaction.type === "ai-accepted" ? 20 : reaction.type === "theme-change" ? 8 : 0,
      y: reaction.type === "export" ? -12 : -7,
    });

    resetRef.current = setTimeout(() => {
      setBehavior("idle");
      setExpression("neutral");
      setMotion("idle");
      setMessage(null);
      setOffset({ x: 0, y: 0 });
    }, reaction.type === "ai-accepted" || reaction.type === "export" ? 1900 : reaction.type === "theme-change" ? 1500 : 1300);
  }, [enabled, reaction]);

  function handleSpriteClick() {
    if (!enabled) {
      return;
    }

    lastActivityRef.current = Date.now();

    if (resetRef.current) {
      clearTimeout(resetRef.current);
    }

    setBehavior("interact");
    setExpression(Math.random() < 0.5 ? "surprised" : "happy");
    setMotion(Math.random() < 0.5 ? "hop" : "celebrate");
    setLook(chooseRandom<SpriteLook>(["left", "center", "right"]));
    setMessage(chooseRandom(PLAY_MESSAGES));
    setOffset({ x: randomBetween(-2, 12), y: -8 });

    resetRef.current = setTimeout(() => {
      setBehavior("idle");
      setExpression("neutral");
      setMotion("idle");
      setMessage(null);
      setOffset({ x: 0, y: 0 });
    }, 1700);
  }

  return {
    behavior,
    expression,
    faceGlow,
    handleSpriteClick,
    look,
    message,
    motion,
    offset,
    shellShadow,
  };
}
