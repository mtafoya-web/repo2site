"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CommunityTemplateRecord, TemplateReaction } from "@/lib/template-presets";
import { getPortfolioThemeById } from "@/lib/themes";

type SortMode = "trending" | "newest" | "most-liked";
type AuthSummary = {
  provider: "github";
  username: string;
  displayName: string;
  avatarUrl: string;
  profileUrl: string;
} | null;

function getTemplateCardStyles(template: CommunityTemplateRecord) {
  const snapshot = template.previewSnapshot;
  const appearance = snapshot?.appearance ?? template.preset.appearance;
  const theme = snapshot?.theme ?? getPortfolioThemeById(appearance.themeId);
  const palette = theme.palette;
  const isDarkMode = appearance.colorMode === "dark";

  return {
    article: {
      background: isDarkMode
        ? "linear-gradient(180deg, rgba(8, 15, 28, 0.96), rgba(13, 22, 38, 0.96))"
        : "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.94))",
      borderColor: isDarkMode ? "rgba(148, 163, 184, 0.16)" : "rgba(148, 163, 184, 0.18)",
      color: isDarkMode ? "#e5eefb" : palette.text,
      boxShadow: isDarkMode
        ? "0 34px 80px -46px rgba(2, 6, 23, 0.78)"
        : "0 28px 60px -40px rgba(15, 23, 42, 0.22)",
    } satisfies CSSProperties,
    frame: {
      backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)",
      borderColor: isDarkMode ? "rgba(148, 163, 184, 0.1)" : "rgba(148, 163, 184, 0.14)",
    } satisfies CSSProperties,
    preview: {
      background: isDarkMode
        ? `radial-gradient(circle at top right, ${palette.accentSoft}, transparent 34%), linear-gradient(160deg, #09111f, #0f172a)`
        : `radial-gradient(circle at top right, ${palette.pageAccent}, transparent 34%), ${palette.page}`,
      color: isDarkMode ? "#e5eefb" : palette.text,
      borderColor: isDarkMode ? "rgba(148, 163, 184, 0.16)" : palette.border,
    } satisfies CSSProperties,
    previewSurface: {
      backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : palette.surfaceStrong,
      borderColor: isDarkMode ? "rgba(148, 163, 184, 0.14)" : palette.border,
    } satisfies CSSProperties,
    chip: {
      backgroundColor: isDarkMode ? palette.accentSoft : palette.chip,
      borderColor: isDarkMode ? "rgba(148, 163, 184, 0.16)" : palette.border,
      color: isDarkMode ? "#eff6ff" : palette.accent,
    } satisfies CSSProperties,
    muted: {
      color: isDarkMode ? "#9fb0c8" : palette.muted,
    } satisfies CSSProperties,
    accentButton: {
      backgroundColor: palette.accent,
      color: "#ffffff",
    } satisfies CSSProperties,
    subtleButton: {
      backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.78)",
      borderColor: isDarkMode ? "rgba(148, 163, 184, 0.16)" : palette.border,
      color: isDarkMode ? "#e5eefb" : palette.text,
    } satisfies CSSProperties,
  };
}

function getTemplatePreviewData(template: CommunityTemplateRecord) {
  const snapshot = template.previewSnapshot;
  const rawPreviewTech =
    snapshot?.techStack.slice(0, 4) ??
    template.exampleProjects.flatMap((project) => project.tech).slice(0, 4);

  return {
    heroHeadline:
      snapshot?.hero.headline.value || template.exampleContent?.hero?.headline || template.title,
    heroSubheadline:
      snapshot?.hero.subheadline.value ||
      template.exampleContent?.hero?.subheadline ||
      template.description,
    previewProjects:
      snapshot?.repositories.slice(0, 2).map((repository) => ({
        name: repository.name,
        description: repository.description,
      })) ??
      template.exampleProjects.slice(0, 2).map((project) => ({
        name: project.name,
        description: project.description,
      })),
    previewTech: Array.from(new Set(rawPreviewTech.filter(Boolean))),
  };
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">{description}</p>
    </div>
  );
}

function TemplatePreviewFrame({
  template,
  compact = false,
}: {
  template: CommunityTemplateRecord;
  compact?: boolean;
}) {
  const styles = getTemplateCardStyles(template);
  const { heroHeadline, heroSubheadline, previewProjects, previewTech } = getTemplatePreviewData(template);
  const snapshot = template.previewSnapshot;

  return (
    <div
      className={`overflow-hidden rounded-[1.55rem] border p-3 ${compact ? "aspect-[5/4]" : "aspect-[16/11]"}`}
      style={styles.preview}
    >
      <div className="flex h-full flex-col rounded-[1.2rem] border p-4" style={styles.previewSurface}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={styles.muted}>
              {snapshot?.theme.name || "Template preview"}
            </p>
            <h3 className={`${compact ? "max-w-[15rem] text-base leading-6" : "max-w-[22rem] text-xl leading-7"} font-semibold`}>
              {heroHeadline}
            </h3>
            <p className={`${compact ? "max-w-[15rem]" : "max-w-[20rem]"} text-xs leading-5`} style={styles.muted}>
              {heroSubheadline}
            </p>
          </div>
          {template.previewImageUrl ? (
            <img
              src={template.previewImageUrl}
              alt={`${template.title} preview`}
              className={`${compact ? "h-14 w-14" : "h-16 w-16"} rounded-[1rem] object-cover`}
            />
          ) : null}
        </div>
        {previewTech.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {previewTech.map((tech) => (
              <span
                key={`${template.slug}-${tech}`}
                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={styles.chip}
              >
                {tech}
              </span>
            ))}
          </div>
        ) : null}
        {previewProjects.length > 0 ? (
          <div className="mt-4 grid gap-2">
            {previewProjects.slice(0, compact ? 1 : 2).map((project) => (
              <div
                key={project.name}
                className="rounded-[0.9rem] border px-3 py-2"
                style={styles.previewSurface}
              >
                <p className="text-sm font-medium">{project.name}</p>
                <p className="mt-1 text-xs leading-5" style={styles.muted}>
                  {project.description}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TemplateMeta({
  template,
  onReact,
  onRate,
  onRemix,
  reactionPending,
  reactionError,
  featured = false,
}: {
  template: CommunityTemplateRecord;
  onReact: (slug: string, reaction: TemplateReaction) => Promise<void>;
  onRate: (slug: string, rating: number) => void;
  onRemix: (slug: string) => Promise<void>;
  reactionPending?: TemplateReaction | null;
  reactionError?: string | null;
  featured?: boolean;
}) {
  const styles = getTemplateCardStyles(template);

  return (
    <div className={`space-y-4 ${featured ? "p-0" : "p-5"}`}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {template.isSystem ? (
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
              Starter Template
            </span>
          ) : null}
          {template.isRecommended ? (
            <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
              Recommended
            </span>
          ) : null}
          <span className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={styles.chip}>
            {template.category}
          </span>
        </div>
        <div>
          <h3 className={`${featured ? "text-3xl sm:text-4xl" : "text-xl"} font-semibold tracking-tight`}>
            {template.title}
          </h3>
          <p className="mt-2 text-sm leading-6" style={styles.muted}>
            {template.description}
          </p>
          <p className="mt-2 text-xs leading-5" style={styles.muted}>
            {template.sourceLabel}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {template.author.avatarUrl ? (
          <img
            src={template.author.avatarUrl}
            alt={template.author.displayName}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
            {template.author.displayName.slice(0, 1)}
          </div>
        )}
        <div>
          <p className="text-sm font-medium">{template.author.displayName}</p>
          <p className="text-xs" style={styles.muted}>
            {template.author.username ? `@${template.author.username}` : "Community creator"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {template.tags.slice(0, featured ? 5 : 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={styles.subtleButton}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 text-xs" style={styles.muted}>
        <span>{template.likes} likes</span>
        <span>{template.dislikes} dislikes</span>
        <span>{template.remixes} remixes</span>
        {template.ratingsCount > 0 ? <span>{template.ratingAverage.toFixed(1)} stars</span> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void onReact(template.slug, "like")}
          aria-pressed={template.viewerReaction === "like"}
          disabled={Boolean(reactionPending)}
          className="rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5"
          style={template.viewerReaction === "like" ? styles.chip : styles.subtleButton}
        >
          {reactionPending === "like" ? "Saving..." : `↑ Like ${template.likes}`}
        </button>
        <button
          type="button"
          onClick={() => void onReact(template.slug, "dislike")}
          aria-pressed={template.viewerReaction === "dislike"}
          disabled={Boolean(reactionPending)}
          className="rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5"
          style={template.viewerReaction === "dislike" ? styles.chip : styles.subtleButton}
        >
          {reactionPending === "dislike" ? "Saving..." : `↓ Dislike ${template.dislikes}`}
        </button>
        {[5, 4, 3].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onRate(template.slug, rating)}
            className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition hover:-translate-y-0.5"
            style={styles.subtleButton}
          >
            {rating}★
          </button>
        ))}
        <Link
          href={`/builder?template=${template.slug}`}
          onClick={() => void onRemix(template.slug)}
          className="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition hover:-translate-y-0.5"
          style={styles.accentButton}
        >
          Use Template
        </Link>
      </div>

      {reactionError ? (
        <p className="text-xs leading-5 text-rose-300">{reactionError}</p>
      ) : null}

      <p className="text-xs leading-5" style={styles.muted}>
        Applies layout and styling choices only. Your GitHub projects, personal profile, and documents stay intact.
      </p>
    </div>
  );
}

function TemplateCard({
  template,
  onReact,
  onRate,
  onRemix,
  reactionPending,
  reactionError,
}: {
  template: CommunityTemplateRecord;
  onReact: (slug: string, reaction: TemplateReaction) => Promise<void>;
  onRate: (slug: string, rating: number) => void;
  onRemix: (slug: string) => Promise<void>;
  reactionPending?: TemplateReaction | null;
  reactionError?: string | null;
}) {
  const styles = getTemplateCardStyles(template);

  return (
    <article
      className="group overflow-hidden rounded-[2rem] border p-3 transition duration-300 hover:-translate-y-1.5"
      style={styles.article}
    >
      <div className="rounded-[1.7rem] border p-2 backdrop-blur-sm" style={styles.frame}>
        <TemplatePreviewFrame template={template} compact />
        <TemplateMeta
          template={template}
          onReact={onReact}
          onRate={onRate}
          onRemix={onRemix}
          reactionPending={reactionPending}
          reactionError={reactionError}
        />
      </div>
    </article>
  );
}

export function Repo2SiteTemplateGallery() {
  const searchParams = useSearchParams();
  const [sort, setSort] = useState<SortMode>("trending");
  const [templates, setTemplates] = useState<CommunityTemplateRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authSession, setAuthSession] = useState<AuthSummary>(null);
  const [reactionPendingBySlug, setReactionPendingBySlug] = useState<
    Record<string, TemplateReaction | null>
  >({});
  const [reactionErrorBySlug, setReactionErrorBySlug] = useState<Record<string, string | null>>(
    {},
  );

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
    const authError = searchParams.get("authError");

    if (!authError) {
      return;
    }

    if (authError === "github_not_configured") {
      setError(
        "GitHub sign-in is not configured yet. Add GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and REPO2SITE_AUTH_SECRET to enable publishing and reactions.",
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
    let isCancelled = false;

    async function loadTemplates() {
      setIsLoading(true);
      setError(null);

      try {
        const url = `/api/templates?sort=${sort}`;
        const response = await fetch(url, {
          cache: "no-store",
        });
        const result = (await response.json()) as
          | { templates: CommunityTemplateRecord[] }
          | { error: string };

        if (!response.ok || "error" in result) {
          if (!isCancelled) {
            setError("error" in result ? result.error : "Could not load templates.");
          }
          return;
        }

        if (!isCancelled) {
          setTemplates(result.templates);
        }
      } catch {
        if (!isCancelled) {
          setError("Could not load templates.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTemplates();

    return () => {
      isCancelled = true;
    };
  }, [sort, authSession]);

  const emptyText = useMemo(() => {
    if (isLoading) {
      return "Loading templates...";
    }

    if (error) {
      return error;
    }

    return "No templates have been published yet. Publish one from the builder to seed the gallery.";
  }, [error, isLoading]);

  const featuredTemplate = useMemo(
    () => templates.find((template) => template.isRecommended) ?? templates[0] ?? null,
    [templates],
  );
  const starterTemplates = useMemo(
    () => templates.filter((template) => template.isSystem && template.id !== featuredTemplate?.id),
    [templates, featuredTemplate],
  );
  const communityTemplates = useMemo(
    () => templates.filter((template) => !template.isSystem && template.id !== featuredTemplate?.id),
    [templates, featuredTemplate],
  );

  async function reactToTemplate(slug: string, reaction: TemplateReaction) {
    const currentTemplate = templates.find((template) => template.slug === slug);

    if (!currentTemplate) {
      return;
    }

    if (!authSession) {
      setReactionErrorBySlug((current) => ({
        ...current,
        [slug]: "Sign in with GitHub to react to community templates.",
      }));
      return;
    }

    const currentReaction = currentTemplate.viewerReaction ?? null;
    const nextReaction = currentReaction === reaction ? null : reaction;
    const previousTemplates = templates;
    const optimisticTemplates = templates.map((template) => {
      if (template.slug !== slug) {
        return template;
      }

      return {
        ...template,
        likes:
          template.likes +
          (currentReaction === "like" ? -1 : 0) +
          (nextReaction === "like" ? 1 : 0),
        dislikes:
          template.dislikes +
          (currentReaction === "dislike" ? -1 : 0) +
          (nextReaction === "dislike" ? 1 : 0),
        viewerReaction: nextReaction,
      };
    });

    setReactionErrorBySlug((current) => ({ ...current, [slug]: null }));
    setReactionPendingBySlug((current) => ({ ...current, [slug]: reaction }));
    setTemplates(optimisticTemplates);

    try {
      const response = await fetch(`/api/templates/${slug}/reaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reaction,
        }),
      });
      const result = (await response.json()) as
        | { template: CommunityTemplateRecord }
        | { error: string };

      if (!response.ok || "error" in result) {
        setTemplates(previousTemplates);
        setReactionErrorBySlug((current) => ({
          ...current,
          [slug]: "Could not save your reaction. Please try again.",
        }));
        return;
      }

      setTemplates((current) =>
        current.map((template) => (template.slug === slug ? result.template : template)),
      );
    } catch {
      setTemplates(previousTemplates);
      setReactionErrorBySlug((current) => ({
        ...current,
        [slug]: "Could not save your reaction. Please try again.",
      }));
    } finally {
      setReactionPendingBySlug((current) => ({ ...current, [slug]: null }));
    }
  }

  async function rateTemplate(slug: string, rating: number) {
    if (!authSession) {
      setReactionErrorBySlug((current) => ({
        ...current,
        [slug]: "Sign in with GitHub to rate community templates.",
      }));
      return;
    }

    const response = await fetch(`/api/templates/${slug}/rate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rating,
      }),
    });
    const result = (await response.json()) as
      | { template: CommunityTemplateRecord }
      | { error: string };

    if (!response.ok || "error" in result) {
      return;
    }

    setTemplates((current) =>
      current.map((template) => (template.slug === slug ? result.template : template)),
    );
  }

  async function trackRemix(slug: string) {
    await fetch(`/api/templates/${slug}/remix`, {
      method: "POST",
    }).catch(() => null);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15),transparent_24%),linear-gradient(180deg,#07101d,#0d1728_40%,#0a1220)] px-4 py-8 text-[#e5eefb] sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-[84rem] flex-col gap-10">
        <section className="rounded-[2.2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(9,17,31,0.82))] px-6 py-8 shadow-[0_32px_70px_-46px_rgba(15,23,42,0.8)] sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                Community templates
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                Browse portfolio templates built by the Repo2Site community.
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                Starter templates are generated from the same repo2site preview pipeline used for real portfolios, then converted into safe design presets with richer example sections. Your GitHub projects, personal profile, resume content, and custom edits stay your own.
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {authSession
                  ? `Signed in as @${authSession.username}. Likes, dislikes, ratings, and your published templates are tied to this GitHub account.`
                  : "Sign in with GitHub to publish templates and leave reactions. Browsing the gallery still works without signing in."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {authSession ? (
                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => null);
                    setAuthSession(null);
                  }}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5"
                >
                  Sign Out
                </button>
              ) : (
                <a
                  href="/api/auth/github?returnTo=/templates"
                  className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5"
                >
                  Sign In with GitHub
                </a>
              )}
              <Link
                href="/builder"
                className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5"
              >
                Open Builder
              </Link>
              <Link
                href="/builder"
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5"
              >
                Publish Your Template
              </Link>
            </div>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[1.6rem] border border-white/8 bg-[rgba(255,255,255,0.03)] px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "trending", label: "Trending" },
              { id: "newest", label: "Newest" },
              { id: "most-liked", label: "Most liked" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSort(option.id as SortMode)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  sort === option.id ? "border-[#2563eb] bg-[#2563eb] text-white" : "border-white/15 text-slate-200 hover:-translate-y-0.5"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-400">
            Explore the look first, then open the builder when you are ready to remix.
          </p>
        </section>

        {templates.length === 0 ? (
          <section className="rounded-[1.8rem] border border-white/10 bg-white/5 px-6 py-8 text-sm text-slate-300">
            {emptyText}
          </section>
        ) : (
          <div className="space-y-10">
            {featuredTemplate ? (
              <section className="grid gap-6 rounded-[2.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 shadow-[0_36px_90px_-56px_rgba(15,23,42,0.9)] lg:grid-cols-[1.15fr_0.85fr] lg:p-6">
                <div className="rounded-[1.8rem] border border-white/8 bg-[rgba(255,255,255,0.03)] p-2">
                  <TemplatePreviewFrame template={featuredTemplate} />
                </div>
                <div className="rounded-[1.8rem] border border-white/8 bg-[rgba(255,255,255,0.03)] p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Featured pick
                  </p>
                  <div className="mt-4">
                    <TemplateMeta
                      template={featuredTemplate}
                      onReact={reactToTemplate}
                      onRate={rateTemplate}
                      onRemix={trackRemix}
                      reactionPending={reactionPendingBySlug[featuredTemplate.slug] ?? null}
                      reactionError={reactionErrorBySlug[featuredTemplate.slug] ?? null}
                      featured
                    />
                  </div>
                </div>
              </section>
            ) : null}

            {starterTemplates.length > 0 ? (
              <section className="space-y-5">
                <SectionHeader
                  eyebrow="Starter templates"
                  title="Curated starting points with distinct visual directions"
                  description="These are the quickest ways to explore different portfolio moods without losing your own project and profile data."
                />
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {starterTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onReact={reactToTemplate}
                      onRate={rateTemplate}
                      onRemix={trackRemix}
                      reactionPending={reactionPendingBySlug[template.slug] ?? null}
                      reactionError={reactionErrorBySlug[template.slug] ?? null}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {communityTemplates.length > 0 ? (
              <section className="space-y-5">
                <SectionHeader
                  eyebrow="Community gallery"
                  title="Remix-ready layouts from other Repo2Site users"
                  description="Browse the strongest community presets in a calmer showcase layout, then apply the one that best fits your voice and work."
                />
                <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                  {communityTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onReact={reactToTemplate}
                      onRate={rateTemplate}
                      onRemix={trackRemix}
                      reactionPending={reactionPendingBySlug[template.slug] ?? null}
                      reactionError={reactionErrorBySlug[template.slug] ?? null}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
