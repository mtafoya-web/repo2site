"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PreviewTheme } from "@/lib/types";

export type BuilderSpriteReactionType =
  | "drag-start"
  | "drag-end"
  | "ai-accepted"
  | "editor-open"
  | "export";

export type BuilderSpriteReactionSignal = {
  type: BuilderSpriteReactionType;
  nonce: number;
  meta?: string;
};

type BuilderSpriteProps = {
  enabled: boolean;
  palette: PreviewTheme["palette"];
  reaction: BuilderSpriteReactionSignal | null;
};

type SpriteBehavior = "idle" | "wander" | "play" | "sleep" | "react" | "interact";
type SpriteExpression = "neutral" | "blink" | "curious" | "happy" | "sleepy" | "surprised";
type SpriteMotion = "idle" | "walk" | "hop" | "celebrate" | "sleep" | "snack";
type SpriteLook = "left" | "center" | "right";

const IDLE_MESSAGES = ["clean layout", "steady build", "nice flow"];
const PLAY_MESSAGES = ["you cooking", "tiny victory", "looking sharp"];
const SLEEP_MESSAGES = ["nap mode", "dreaming in JSX", "tiny reboot"];
const SNACK_MESSAGES = ["coffee break", "debug snack", "tiny fuel"];
const SPRITE_COLORS = {
  shellTop: "#2a303b",
  shellBottom: "#0f1725",
  trimTop: "#f5f7fb",
  trimBottom: "#cdd8ea",
  faceGlassTop: "#091018",
  faceGlassBottom: "#161f2e",
  faceShadow: "#05080d",
  hoodieStripe: "#eef3fb",
  eye: "#111827",
  cheek: "#7dd3fc",
  snack: "#2f6fed",
  accentWarm: "#ff9d3f",
} as const;

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chooseRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

export function Repo2SiteBuilderSprite({
  enabled,
  palette,
  reaction,
}: BuilderSpriteProps) {
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
      if (schedulerRef.current) {
        clearTimeout(schedulerRef.current);
      }
      if (resetRef.current) {
        clearTimeout(resetRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (schedulerRef.current) {
        clearTimeout(schedulerRef.current);
      }
      if (resetRef.current) {
        clearTimeout(resetRef.current);
      }
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
          setOffset({
            x: randomBetween(-18, 92),
            y: randomBetween(-8, 3),
          });

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
      "drag-start": {
        behavior: "react",
        expression: "curious",
        motion: "walk",
        message: "nice drag",
        look: "right",
      },
      "drag-end": {
        behavior: "react",
        expression: "happy",
        motion: "hop",
        message: "clean move",
        look: "center",
      },
      "ai-accepted": {
        behavior: "react",
        expression: "happy",
        motion: "celebrate",
        message: "smart pick",
        look: "center",
      },
      "editor-open": {
        behavior: "react",
        expression: "curious",
        motion: "hop",
        message: "builder ready",
        look: "left",
      },
      export: {
        behavior: "react",
        expression: "happy",
        motion: "celebrate",
        message: "ship it",
        look: "center",
      },
    };

    const next = reactionMap[reaction.type];
    setBehavior(next.behavior);
    setExpression(next.expression);
    setMotion(next.motion);
    setMessage(next.message);
    setLook(next.look);
    setOffset({
      x: reaction.type === "drag-start" ? 16 : reaction.type === "ai-accepted" ? 20 : 0,
      y: reaction.type === "export" ? -12 : -7,
    });

    resetRef.current = setTimeout(() => {
      setBehavior("idle");
      setExpression("neutral");
      setMotion("idle");
      setMessage(null);
      setOffset({ x: 0, y: 0 });
    }, reaction.type === "ai-accepted" || reaction.type === "export" ? 1900 : 1300);
  }, [enabled, reaction]);

  function handleSpriteClick() {
    if (!enabled) {
      return;
    }

    lastActivityRef.current = Date.now();

    if (resetRef.current) {
      clearTimeout(resetRef.current);
    }

    const nextMessage = chooseRandom(PLAY_MESSAGES);
    const nextMotion = Math.random() < 0.5 ? "hop" : "celebrate";
    const nextExpression = Math.random() < 0.5 ? "surprised" : "happy";

    setBehavior("interact");
    setExpression(nextExpression);
    setMotion(nextMotion);
    setLook(chooseRandom<SpriteLook>(["left", "center", "right"]));
    setMessage(nextMessage);
    setOffset({ x: randomBetween(-2, 12), y: -8 });

    resetRef.current = setTimeout(() => {
      setBehavior("idle");
      setExpression("neutral");
      setMotion("idle");
      setMessage(null);
      setOffset({ x: 0, y: 0 });
    }, 1700);
  }

  if (!enabled) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-5 left-5 z-[47] hidden sm:block">
      <div
        className="relative transition-transform duration-500 ease-out"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <div
          className={`relative ${
            motion === "walk"
              ? "sprite-walk"
              : motion === "celebrate"
                ? "sprite-celebrate"
                : motion === "hop"
                  ? "sprite-hop"
                  : motion === "sleep"
                    ? "sprite-sleep"
                    : motion === "snack"
                      ? "sprite-snack"
                      : "sprite-idle"
          }`}
        >
          <button
            type="button"
            aria-label="Interact with the beta dev companion"
            onClick={handleSpriteClick}
            title={message ?? "Dev companion"}
            className="pointer-events-auto relative flex h-[7rem] w-[6.7rem] items-center justify-center bg-transparent transition duration-200 hover:-translate-y-0.5"
            style={shellShadow}
          >
            <svg
              viewBox="0 0 180 170"
              className="h-[6.5rem] w-[6.2rem]"
              role="presentation"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="companion-shell" x1="20%" y1="12%" x2="82%" y2="88%">
                  <stop offset="0%" stopColor={SPRITE_COLORS.shellTop} />
                  <stop offset="100%" stopColor={SPRITE_COLORS.shellBottom} />
                </linearGradient>
                <linearGradient id="companion-trim" x1="16%" y1="10%" x2="84%" y2="90%">
                  <stop offset="0%" stopColor={SPRITE_COLORS.trimTop} />
                  <stop offset="100%" stopColor={SPRITE_COLORS.trimBottom} />
                </linearGradient>
                <linearGradient id="companion-faceplate" x1="18%" y1="8%" x2="82%" y2="92%">
                  <stop offset="0%" stopColor={SPRITE_COLORS.faceGlassTop} />
                  <stop offset="60%" stopColor={SPRITE_COLORS.faceGlassBottom} />
                  <stop offset="100%" stopColor={SPRITE_COLORS.faceShadow} />
                </linearGradient>
                <linearGradient id="companion-antenna" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="100%" stopColor={faceGlow.accent} />
                </linearGradient>
                <radialGradient id="companion-accent-orb" cx="38%" cy="34%" r="70%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="28%" stopColor={faceGlow.accentSoft} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={faceGlow.accent} />
                </radialGradient>
              </defs>

              <ellipse cx="90" cy="155" rx="39" ry="9" fill={palette.pageAccent} opacity="0.42" />

              <g
                className={
                  motion === "walk"
                    ? "sprite-tail-swish"
                    : motion === "celebrate"
                      ? "sprite-tail-fast"
                      : "sprite-tail-idle"
                }
              >
                <path
                  d="M109 27c4-7 11-9 16-5 4 4 4 11 0 18"
                  fill="none"
                  stroke="url(#companion-antenna)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="5"
                />
                <circle cx="126" cy="20" r="7" fill="url(#companion-accent-orb)" />
              </g>

              <g transform={motion === "sleep" ? "translate(6 18) rotate(82 88 118)" : "translate(0 0)"}>
                <path
                  d="M46 117c0-31 14-54 31-54 10 0 19 7 24 18 5 10 7 24 7 40v18c0 10-6 17-17 17H66c-12 0-20-8-20-18v-21Z"
                  fill="url(#companion-shell)"
                  stroke="#0b1220"
                  strokeWidth="3"
                />
                <path
                  d="M64 142c-11 0-18-6-18-16v-4c5 4 11 6 18 6h26c11 0 18-3 18-6v6c0 9-7 14-18 14H64Z"
                  fill="#eef4ff"
                  opacity="0.18"
                />

                <path
                  d="M42 65c0-29 20-49 47-49 24 0 46 17 46 42 0 26-21 49-47 49-31 0-46-15-46-42Z"
                  fill="url(#companion-shell)"
                  stroke="#0b1220"
                  strokeWidth="3"
                />
                <path d="M54 48 64 26l13 18" fill="url(#companion-shell)" stroke="#0b1220" strokeLinejoin="round" strokeWidth="3" />
                <path d="M101 45 116 24l6 23" fill="url(#companion-shell)" stroke="#0b1220" strokeLinejoin="round" strokeWidth="3" />
                <path d="M60 45 66 34l7 10" fill={SPRITE_COLORS.trimBottom} opacity="0.6" />
                <path d="M106 42 112 32l5 11" fill={SPRITE_COLORS.trimBottom} opacity="0.6" />

                <path
                  d="M57 39c6-9 18-14 32-14 22 0 39 15 39 37 0 21-16 38-38 38H76c-16 0-28-9-28-24V39c3-2 6-2 9 0Z"
                  fill="url(#companion-trim)"
                  stroke="rgba(12,18,32,0.4)"
                  strokeWidth="2.3"
                />

                <path
                  d="M62 43c4-8 14-13 27-13 22 0 35 13 35 31 0 20-15 33-36 33H77c-14 0-24-7-24-19V43h9Z"
                  fill="url(#companion-faceplate)"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="1.6"
                />

                <g
                  transform={
                    look === "left"
                      ? "translate(-3 0)"
                      : look === "right"
                        ? "translate(3 0)"
                        : "translate(0 0)"
                  }
                >
                  {expression === "blink" || expression === "sleepy" ? (
                    <>
                      <path d="M75 59h8" stroke={faceGlow.accent} strokeLinecap="round" strokeWidth="4.2" />
                      <path d="M97 59h8" stroke={faceGlow.accent} strokeLinecap="round" strokeWidth="4.2" />
                    </>
                  ) : expression === "curious" ? (
                    <>
                      <path d="M71 60c3-6 8-6 11 0" fill="none" stroke={faceGlow.accent} strokeLinecap="round" strokeWidth="3.8" />
                      <ellipse cx="100" cy="59" rx="5.1" ry="7.3" fill={faceGlow.accent} />
                    </>
                  ) : expression === "surprised" ? (
                    <>
                      <ellipse cx="79" cy="59" rx="5.5" ry="8" fill={faceGlow.accent} />
                      <ellipse cx="101" cy="59" rx="5.5" ry="8" fill={faceGlow.accent} />
                    </>
                  ) : expression === "happy" ? (
                    <>
                      <path d="M72 59c3 6 9 6 12 0" fill="none" stroke={faceGlow.accent} strokeLinecap="round" strokeWidth="3.8" />
                      <path d="M96 59c3 6 9 6 12 0" fill="none" stroke={faceGlow.accent} strokeLinecap="round" strokeWidth="3.8" />
                    </>
                  ) : (
                    <>
                      <ellipse cx="79" cy="59" rx="5" ry="7" fill={faceGlow.accent} />
                      <ellipse cx="101" cy="59" rx="5" ry="7" fill={faceGlow.accent} />
                    </>
                  )}
                </g>

                <path d="M84 72c2 2 10 2 12 0" fill="none" stroke={faceGlow.accent} strokeLinecap="round" strokeWidth="2.8" opacity="0.9" />
                <path
                  d={
                    expression === "happy"
                      ? "M82 77c3 4 14 4 17 0"
                      : expression === "curious"
                        ? "M84 77c2 1 11 0 13-2"
                        : expression === "sleepy"
                          ? "M86 77c2 1 7 1 9 0"
                          : expression === "surprised"
                            ? "M91 78a3.4 3.4 0 1 0 0.1 0"
                            : "M86 77c2-1 8-1 10 0"
                  }
                  fill="none"
                  stroke={faceGlow.accent}
                  strokeLinecap="round"
                  strokeWidth="3"
                />

                <g
                  className={
                    motion === "walk"
                      ? "sprite-hind-legs-walk"
                      : motion === "hop" || motion === "celebrate"
                        ? "sprite-hind-legs-hop"
                        : "sprite-hind-legs-idle"
                  }
                >
                  <ellipse cx="73" cy="145" rx="12" ry="16" fill="url(#companion-shell)" stroke="#0b1220" strokeWidth="2" />
                  <ellipse cx="106" cy="145" rx="12" ry="16" fill="url(#companion-shell)" stroke="#0b1220" strokeWidth="2" />
                  <ellipse cx="71" cy="154" rx="13" ry="7" fill="#0b1220" opacity="0.9" />
                  <ellipse cx="104" cy="154" rx="13" ry="7" fill="#0b1220" opacity="0.9" />
                </g>

                <g
                  className={
                    motion === "walk"
                      ? "sprite-forepaws-walk"
                      : motion === "snack"
                        ? "sprite-forepaws-snack"
                        : motion === "hop"
                          ? "sprite-forepaws-hop"
                          : "sprite-forepaws-idle"
                  }
                >
                  <path d="M67 111c-8 8-11 18-11 27" fill="none" stroke={SPRITE_COLORS.trimTop} strokeLinecap="round" strokeWidth="7" />
                  <path d="M111 111c8 8 12 18 12 27" fill="none" stroke={SPRITE_COLORS.trimTop} strokeLinecap="round" strokeWidth="7" />
                </g>

                {motion === "snack" ? (
                  <g className="sprite-snack-item">
                    <path d="M120 112c0-9 6-15 14-15s14 6 14 15v9h-28Z" fill={SPRITE_COLORS.snack} stroke="#204db7" strokeWidth="2" />
                    <path d="M147 108h5c3 0 4 2 4 4s-1 4-4 4h-5" fill="none" stroke="#204db7" strokeLinecap="round" strokeWidth="2.4" />
                    <path d="M127 97c2-4 5-5 8-5 3 0 6 1 8 5" fill="none" stroke="#7c4a1d" strokeLinecap="round" strokeWidth="2.4" />
                  </g>
                ) : null}

                {motion === "sleep" ? (
                  <>
                    <path d="M122 27h10l-8 12h10" fill="none" stroke={faceGlow.accent} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.2" />
                    <path d="M135 16h7l-6 9h7" fill="none" stroke={faceGlow.accent} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8" opacity="0.85" />
                  </>
                ) : null}
              </g>

              <rect
                x="78"
                y="118"
                width="24"
                height="12"
                rx="6.5"
                fill={faceGlow.accentSoft}
                stroke={palette.border}
                strokeWidth="2"
              />
              <text
                x="90"
                y="126.8"
                textAnchor="middle"
                fontFamily="monospace"
                fontSize="8"
                fontWeight="700"
                fill={faceGlow.accent}
              >
                {"</>"}
              </text>
            </svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes sprite-idle {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-3px);
          }
        }

        @keyframes sprite-walk {
          0%,
          100% {
            transform: translateY(0px) rotate(-1deg);
          }
          40% {
            transform: translateY(-1px) rotate(1deg);
          }
          70% {
            transform: translateY(0px) rotate(-1deg);
          }
        }

        @keyframes sprite-hop {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          35% {
            transform: translateY(-14px) rotate(-3deg);
          }
          70% {
            transform: translateY(-4px) rotate(2deg);
          }
        }

        @keyframes sprite-celebrate {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          30% {
            transform: translateY(-11px) rotate(-6deg);
          }
          55% {
            transform: translateY(-6px) rotate(7deg);
          }
          80% {
            transform: translateY(-10px) rotate(-5deg);
          }
        }

        @keyframes sprite-sleep {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(1px) rotate(1deg);
          }
        }

        @keyframes sprite-snack {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        @keyframes sprite-tail-idle {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(8deg);
          }
        }

        @keyframes sprite-tail-swish {
          0%,
          100% {
            transform: rotate(-8deg);
          }
          50% {
            transform: rotate(12deg);
          }
        }

        @keyframes sprite-tail-fast {
          0%,
          100% {
            transform: rotate(-10deg);
          }
          50% {
            transform: rotate(18deg);
          }
        }

        @keyframes sprite-hind-legs-walk {
          0%,
          100% {
            transform: translateY(0px);
          }
          25% {
            transform: translate(-1px, 1px);
          }
          50% {
            transform: translate(1px, -1px);
          }
          75% {
            transform: translate(-1px, 1px);
          }
        }

        @keyframes sprite-hind-legs-hop {
          0%,
          100% {
            transform: translateY(0px);
          }
          45% {
            transform: translateY(-6px);
          }
          70% {
            transform: translateY(-2px);
          }
        }

        @keyframes sprite-forepaws-walk {
          0%,
          100% {
            transform: translateY(0px);
          }
          30% {
            transform: translate(-1px, 1px);
          }
          60% {
            transform: translate(1px, -1px);
          }
        }

        @keyframes sprite-forepaws-hop {
          0%,
          100% {
            transform: translateY(0px);
          }
          45% {
            transform: translateY(-7px);
          }
          70% {
            transform: translateY(-2px);
          }
        }

        @keyframes sprite-forepaws-snack {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(-7deg);
          }
        }

        @keyframes sprite-snack-item {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        .sprite-idle {
          animation: sprite-idle 2.8s ease-in-out infinite;
        }

        .sprite-walk {
          animation: sprite-walk 1s ease-in-out infinite;
        }

        .sprite-hop {
          animation: sprite-hop 0.9s ease-in-out;
        }

        .sprite-celebrate {
          animation: sprite-celebrate 1.1s ease-in-out;
        }

        .sprite-sleep {
          animation: sprite-sleep 2.2s ease-in-out infinite;
        }

        .sprite-snack {
          animation: sprite-snack 1.6s ease-in-out infinite;
        }

        .sprite-tail-idle {
          transform-origin: 114px 90px;
          animation: sprite-tail-idle 2.1s ease-in-out infinite;
        }

        .sprite-tail-swish {
          transform-origin: 114px 90px;
          animation: sprite-tail-swish 0.7s ease-in-out infinite;
        }

        .sprite-tail-fast {
          transform-origin: 114px 90px;
          animation: sprite-tail-fast 0.42s ease-in-out infinite;
        }

        .sprite-hind-legs-idle {
          transform-origin: 89px 145px;
        }

        .sprite-hind-legs-walk {
          transform-origin: 89px 145px;
          animation: sprite-hind-legs-walk 0.62s linear infinite;
        }

        .sprite-hind-legs-hop {
          transform-origin: 89px 145px;
          animation: sprite-hind-legs-hop 0.9s ease-in-out;
        }

        .sprite-forepaws-idle {
          transform-origin: 86px 108px;
        }

        .sprite-forepaws-walk {
          transform-origin: 86px 108px;
          animation: sprite-forepaws-walk 0.62s linear infinite;
        }

        .sprite-forepaws-hop {
          transform-origin: 86px 108px;
          animation: sprite-forepaws-hop 0.9s ease-in-out;
        }

        .sprite-forepaws-snack {
          transform-origin: 86px 108px;
          animation: sprite-forepaws-snack 0.85s ease-in-out infinite;
        }

        .sprite-snack-item {
          animation: sprite-snack-item 0.85s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
