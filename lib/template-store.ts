import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildFinalPortfolio, buildLayoutComponents, createEmptyOverrides } from "@/lib/portfolio";
import { generatePortfolioPreview } from "@/lib/preview-generator";
import {
  assertProductionStorageBackend,
  getConfiguredStorageBackend,
  isProductionDeployment,
} from "@/lib/runtime-env";
import { logServerEvent } from "@/lib/server-logger";
import type {
  CommunityTemplateRecord,
  TemplateAuthor,
  TemplateExampleContent,
  TemplatePreviewSnapshot,
  TemplatePreset,
  TemplateReaction,
  TemplateSortMode,
  TemplateStatus,
} from "@/lib/template-presets";
import { buildTemplatePreset, applyTemplatePreset } from "@/lib/template-presets";
import { SYSTEM_TEMPLATE_DEFINITIONS } from "@/lib/template-seeds";

export const TEMPLATE_SCHEMA_VERSION = 1;
const SYSTEM_TEMPLATE_CACHE_TTL_MS = 30 * 60 * 1000;
const SYSTEM_TEMPLATE_FAILURE_TTL_MS = 15 * 60 * 1000;

type StoredCommunityTemplateRecord = CommunityTemplateRecord & {
  likedActorIds?: string[];
  reactionsByActor?: Record<string, TemplateReaction>;
  ratingsByActor?: Record<string, number>;
  viewerReaction?: TemplateReaction | null;
};

type TemplateDriver = {
  kind: "filesystem" | "upstash";
  getBySlug(slug: string): Promise<StoredCommunityTemplateRecord | null>;
  list(): Promise<StoredCommunityTemplateRecord[]>;
  save(record: StoredCommunityTemplateRecord): Promise<void>;
};

const TEMPLATES_DIR = path.join(process.cwd(), ".repo2site-data", "templates");
const systemTemplateCache = new Map<
  string,
  {
    expiresAt: number;
    record: StoredCommunityTemplateRecord;
  }
>();
const systemTemplateInFlight = new Map<string, Promise<StoredCommunityTemplateRecord | null>>();
const systemTemplateFailureCache = new Map<
  string,
  {
    retryAfter: number;
    message: string;
  }
>();

function sanitizeTemplateSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "template"
  );
}

function normalizeTemplateText(value: string, fallback = "", maxLength = 220) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength) || fallback;
}

function normalizeTemplateTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .map((tag) => normalizeTemplateText(tag, "", 32).toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 6);
}

function templateFilePath(slug: string) {
  return path.join(TEMPLATES_DIR, `${slug}.json`);
}

async function ensureTemplateDirectory() {
  await mkdir(TEMPLATES_DIR, { recursive: true });
}

function buildTemplateAuthor(input: {
  provider?: TemplateAuthor["provider"];
  id?: string;
  username?: string;
  displayName?: string;
  profileUrl?: string;
  avatarUrl?: string;
}) {
  const explicitId = normalizeTemplateText(input.id ?? "", "", 120);
  const explicitProvider = input.provider ?? "github";
  const username = normalizeTemplateText(input.username ?? "", "", 80).toLowerCase();

  if (explicitId) {
    return {
      provider: explicitProvider,
      id: explicitId,
      displayName: normalizeTemplateText(input.displayName ?? "", username || explicitId, 120),
      username,
      profileUrl: normalizeTemplateText(input.profileUrl ?? "", "", 320),
      avatarUrl: normalizeTemplateText(input.avatarUrl ?? "", "", 1000),
    };
  }

  if (username) {
    return {
      provider: "github" as const,
      id: username,
      displayName: normalizeTemplateText(input.displayName ?? "", username, 120),
      username,
      profileUrl: normalizeTemplateText(input.profileUrl ?? "", "", 320),
      avatarUrl: normalizeTemplateText(input.avatarUrl ?? "", "", 1000),
    };
  }

  return {
    provider: "anonymous" as const,
    id: `anon-${randomUUID().slice(0, 12)}`,
    displayName: normalizeTemplateText(input.displayName ?? "", "Community creator", 120),
    username: "",
    profileUrl: "",
    avatarUrl: "",
  };
}

export { applyTemplatePreset, buildTemplatePreset };

function getReactionCounts(reactionsByActor: Record<string, TemplateReaction>) {
  const values = Object.values(reactionsByActor);
  return {
    likes: values.filter((value) => value === "like").length,
    dislikes: values.filter((value) => value === "dislike").length,
  };
}

function hydrateStoredTemplateRecord(
  record: StoredCommunityTemplateRecord,
  actorId?: string,
): StoredCommunityTemplateRecord {
  const reactionsByActor = { ...(record.reactionsByActor ?? {}) };

  for (const likedActorId of record.likedActorIds ?? []) {
    if (!reactionsByActor[likedActorId]) {
      reactionsByActor[likedActorId] = "like";
    }
  }

  const { likes, dislikes } = getReactionCounts(reactionsByActor);

  return {
    ...record,
    reactionsByActor,
    likedActorIds: Object.entries(reactionsByActor)
      .filter(([, reaction]) => reaction === "like")
      .map(([id]) => id),
    likes,
    dislikes,
    viewerReaction: actorId ? reactionsByActor[actorId] ?? null : null,
  };
}

function buildTemplatePreviewSnapshot(
  preview: Awaited<ReturnType<typeof generatePortfolioPreview>>,
  overrides: ReturnType<typeof createEmptyOverrides>,
): TemplatePreviewSnapshot {
  return buildFinalPortfolio(preview, overrides, {
    theme: preview.theme,
    hero: preview.hero,
    about: preview.about,
    contact: preview.contact,
    linksSection: preview.linksSection,
    repositories: preview.featuredRepositories,
    links: preview.links,
    techStack: preview.techStack,
  });
}

function scoreTemplate(record: CommunityTemplateRecord) {
  const ageInHours = Math.max(
    1,
    (Date.now() - new Date(record.publishedAt).getTime()) / (1000 * 60 * 60),
  );
  const reactionScore = record.likes * 3 - record.dislikes * 2;
  return (reactionScore + record.remixes * 5 + record.ratingAverage) / Math.log2(ageInHours + 2);
}

function sortTemplates(records: CommunityTemplateRecord[], mode: TemplateSortMode) {
  const list = [...records];

  if (mode === "newest") {
    return list.sort(
      (left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
    );
  }

  if (mode === "most-liked") {
    return list.sort(
      (left, right) =>
        right.likes - right.dislikes - (left.likes - left.dislikes) ||
        right.likes - left.likes ||
        right.remixes - left.remixes,
    );
  }

  return list.sort((left, right) => scoreTemplate(right) - scoreTemplate(left));
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function joinTemplateList(values: string[]) {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function buildSystemTemplateExampleContent(
  definition: (typeof SYSTEM_TEMPLATE_DEFINITIONS)[number],
  preview: Awaited<ReturnType<typeof generatePortfolioPreview>>,
): TemplateExampleContent {
  const topRepositories = preview.featuredRepositories.slice(0, 3).map((repository) => repository.name);
  const techHighlights = preview.techStack.slice(0, 4);
  const aboutTail = topRepositories.length
    ? `Featured work is drawn from repositories like ${joinTemplateList(topRepositories)}.`
    : "";
  const professionalTail = techHighlights.length
    ? `Common stack highlights include ${joinTemplateList(techHighlights)}.`
    : "";

  return {
    hero: {
      headline: normalizeTemplateText(preview.hero.headline, "Built from real engineering work.", 160),
      subheadline: normalizeTemplateText(
        preview.hero.subheadline,
        "Use this starter to shape a polished portfolio around your own projects and profile.",
        240,
      ),
    },
    about: {
      title: normalizeTemplateText(definition.exampleContent.aboutTitle, preview.about.title || "About", 120),
      description: normalizeTemplateText(
        [preview.about.description, aboutTail].filter(Boolean).join(" "),
        preview.about.description,
        420,
      ),
    },
    professional: {
      title: normalizeTemplateText(
        definition.exampleContent.professionalTitle,
        "Career / Professional Info",
        120,
      ),
      summary: normalizeTemplateText(
        [preview.summary, professionalTail].filter(Boolean).join(" "),
        preview.summary,
        420,
      ),
      availability: normalizeTemplateText(definition.exampleContent.availability, "", 180),
    },
    contact: {
      title: normalizeTemplateText(definition.exampleContent.contactTitle, preview.contact.title || "Contact", 120),
      description: normalizeTemplateText(
        definition.exampleContent.contactDescription,
        preview.contact.description,
        260,
      ),
      customText: normalizeTemplateText(definition.exampleContent.contactCustomText, "", 220),
    },
    linksSection: {
      title: normalizeTemplateText(definition.exampleContent.linksTitle, preview.linksSection.title || "Links", 120),
      description: normalizeTemplateText(
        definition.exampleContent.linksDescription,
        preview.linksSection.description,
        260,
      ),
    },
  };
}

async function generateSystemTemplateRecord(definition: (typeof SYSTEM_TEMPLATE_DEFINITIONS)[number]) {
  const preview = await generatePortfolioPreview(definition.profileUrl);
  const overrides = createEmptyOverrides();
  overrides.appearance = {
    ...overrides.appearance,
    themeId: definition.overrides.themeId ?? overrides.appearance.themeId,
    colorMode: definition.overrides.colorMode ?? overrides.appearance.colorMode,
    density: definition.overrides.density ?? overrides.appearance.density,
    sectionLayout: definition.overrides.sectionLayout ?? overrides.appearance.sectionLayout,
    cardStyle: definition.overrides.cardStyle ?? overrides.appearance.cardStyle,
  };
  overrides.layout.sectionOrder = [...definition.overrides.sectionOrder];
  overrides.layout.hiddenSections = [...definition.overrides.hiddenSections];
  overrides.layout.components = buildLayoutComponents(
    overrides.layout.sectionOrder,
    overrides.layout.hiddenSections,
  );
  const previewSnapshot = buildTemplatePreviewSnapshot(preview, overrides);
  const preset = buildTemplatePreset(overrides, previewSnapshot.theme.id);
  const exampleContent = buildSystemTemplateExampleContent(definition, preview);
  const exampleProjects = previewSnapshot.repositories.slice(0, 3).map((repository) => ({
    name: repository.name,
    description: repository.description,
    tech: Array.from(new Set([repository.language, ...previewSnapshot.techStack])).filter(Boolean).slice(0, 3),
  }));

  return {
    id: definition.id,
    slug: definition.slug,
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    status: "published" as const,
    isSystem: true,
    isRecommended: definition.isRecommended,
    title: definition.title,
    description: definition.description,
    category: definition.category,
    tags: definition.tags,
    previewImageUrl:
      preview.featuredRepositories.find((repository) => repository.image?.url)?.image?.url ||
      preview.profile.avatarUrl,
    sourceLabel: definition.sourceLabel,
    author: {
      provider: "anonymous" as const,
      id: "repo2site-system",
      displayName: "Repo2Site Starter Templates",
      username: "",
      profileUrl: "",
      avatarUrl: "",
    },
    preset,
    previewSnapshot,
    exampleContent,
    exampleProjects,
    likes: 0,
    dislikes: 0,
    remixes: 0,
    ratingAverage: 0,
    ratingsCount: 0,
    createdAt: daysAgo(12),
    updatedAt: daysAgo(2),
    publishedAt: daysAgo(12),
    likedActorIds: [] as string[],
    reactionsByActor: {} as Record<string, TemplateReaction>,
    ratingsByActor: {} as Record<string, number>,
  } satisfies StoredCommunityTemplateRecord;
}

function getCachedSystemTemplate(slug: string) {
  const cached = systemTemplateCache.get(slug);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt < Date.now()) {
    systemTemplateCache.delete(slug);
    return null;
  }

  return cached.record;
}

function setCachedSystemTemplate(record: StoredCommunityTemplateRecord) {
  systemTemplateCache.set(record.slug, {
    expiresAt: Date.now() + SYSTEM_TEMPLATE_CACHE_TTL_MS,
    record,
  });
}

function getSystemTemplateFailure(slug: string) {
  const cached = systemTemplateFailureCache.get(slug);

  if (!cached) {
    return null;
  }

  if (cached.retryAfter < Date.now()) {
    systemTemplateFailureCache.delete(slug);
    return null;
  }

  return cached;
}

async function getOrCreateSystemTemplateRecord(
  definition: (typeof SYSTEM_TEMPLATE_DEFINITIONS)[number],
  driver: TemplateDriver,
  existing?: StoredCommunityTemplateRecord | null,
) {
  if (
    existing?.isSystem &&
    (existing.exampleProjects.length > 0 ||
      Boolean(existing.exampleContent?.about?.description) ||
      Boolean(existing.previewSnapshot?.theme?.id))
  ) {
    setCachedSystemTemplate(existing);
    return existing;
  }

  const cached = getCachedSystemTemplate(definition.slug);

  if (cached) {
    return cached;
  }

  if (getSystemTemplateFailure(definition.slug)) {
    return existing ?? null;
  }

  const inFlight = systemTemplateInFlight.get(definition.slug);

  if (inFlight) {
    return inFlight;
  }

  const generationPromise = (async () => {
    try {
      const generated = await generateSystemTemplateRecord(definition);
      systemTemplateFailureCache.delete(definition.slug);
      const mergedRecord = existing
        ? {
            ...existing,
            isSystem: true,
            isRecommended: generated.isRecommended,
            sourceLabel: generated.sourceLabel,
            previewSnapshot: generated.previewSnapshot,
            exampleContent: generated.exampleContent,
            exampleProjects: generated.exampleProjects,
            previewImageUrl: existing.previewImageUrl || generated.previewImageUrl,
            preset: generated.preset,
            title: generated.title,
            description: generated.description,
            category: generated.category,
            tags: generated.tags,
          }
        : generated;

      await driver.save(mergedRecord);
      setCachedSystemTemplate(mergedRecord);
      return mergedRecord;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const nextRetryTime = Date.now() + SYSTEM_TEMPLATE_FAILURE_TTL_MS;
      const activeFailure = getSystemTemplateFailure(definition.slug);

      systemTemplateFailureCache.set(definition.slug, {
        retryAfter: nextRetryTime,
        message,
      });

      if (!activeFailure) {
        logServerEvent("warn", "Failed to generate system template", {
          slug: definition.slug,
          profileUrl: definition.profileUrl,
          retryAfter: new Date(nextRetryTime).toISOString(),
          error,
        });
      }

      return existing ?? null;
    } finally {
      systemTemplateInFlight.delete(definition.slug);
    }
  })();

  systemTemplateInFlight.set(definition.slug, generationPromise);
  return generationPromise;
}

async function mergeSeedTemplates(records: StoredCommunityTemplateRecord[], driver: TemplateDriver) {
  const merged = [...records];

  for (const definition of SYSTEM_TEMPLATE_DEFINITIONS) {
    const existing = merged.find((record) => record.slug === definition.slug) ?? null;
    const seed = await getOrCreateSystemTemplateRecord(definition, driver, existing);

    if (!seed) {
      continue;
    }

    if (!merged.some((record) => record.slug === seed.slug)) {
      merged.push(seed);
      continue;
    }

    const existingIndex = merged.findIndex((record) => record.slug === seed.slug);
    const existingRecord = merged[existingIndex];

    merged[existingIndex] = {
      ...existingRecord,
      isSystem: true,
      isRecommended: seed.isRecommended,
      sourceLabel: seed.sourceLabel,
      previewSnapshot: existingRecord.previewSnapshot ?? seed.previewSnapshot,
      exampleContent: existingRecord.exampleContent ?? seed.exampleContent,
      exampleProjects: seed.exampleProjects,
      category: existingRecord.category || seed.category,
      tags: existingRecord.tags.length > 0 ? existingRecord.tags : seed.tags,
      previewImageUrl: existingRecord.previewImageUrl || seed.previewImageUrl,
    };
  }

  return merged;
}

class FileTemplateDriver implements TemplateDriver {
  kind = "filesystem" as const;

  async getBySlug(slug: string) {
    try {
      const raw = await readFile(templateFilePath(slug), "utf8");
      return hydrateStoredTemplateRecord(JSON.parse(raw) as StoredCommunityTemplateRecord);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }

  async list() {
    await ensureTemplateDirectory();
    const entries = await readdir(TEMPLATES_DIR);
    const records = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".json"))
        .map(async (entry) => {
          const raw = await readFile(path.join(TEMPLATES_DIR, entry), "utf8");
          return hydrateStoredTemplateRecord(JSON.parse(raw) as StoredCommunityTemplateRecord);
        }),
    );

    return records;
  }

  async save(record: StoredCommunityTemplateRecord) {
    await ensureTemplateDirectory();
    await writeFile(templateFilePath(record.slug), JSON.stringify(record, null, 2), "utf8");
  }
}

class UpstashTemplateDriver implements TemplateDriver {
  kind = "upstash" as const;
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url.replace(/\/+$/, "");
    this.token = token;
  }

  private async command<T>(...command: Array<string | number>) {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command.map((value) => String(value))),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Upstash template request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as { result?: T; error?: string };

    if (payload.error) {
      throw new Error(payload.error);
    }

    return payload.result ?? null;
  }

  private templateKey(slug: string) {
    return `repo2site:template:${slug}`;
  }

  private indexKey() {
    return "repo2site:template:index";
  }

  async getBySlug(slug: string) {
    const raw = await this.command<string>("GET", this.templateKey(slug));
    return raw ? hydrateStoredTemplateRecord(JSON.parse(raw) as StoredCommunityTemplateRecord) : null;
  }

  async list() {
    const slugs = (await this.command<string[]>("SMEMBERS", this.indexKey())) ?? [];
    const records = await Promise.all(slugs.map((slug) => this.getBySlug(slug)));
    return records.filter(Boolean) as StoredCommunityTemplateRecord[];
  }

  async save(record: StoredCommunityTemplateRecord) {
    await this.command("SET", this.templateKey(record.slug), JSON.stringify(record));
    await this.command("SADD", this.indexKey(), record.slug);
  }
}

function getTemplateDriver() {
  const backend = getConfiguredStorageBackend();

  if (backend.kind === "upstash") {
    return new UpstashTemplateDriver(backend.upstashUrl, backend.upstashToken);
  }

  assertProductionStorageBackend("templates");

  if (!isProductionDeployment()) {
    logServerEvent("warn", "Using filesystem template storage fallback", {
      backend: "filesystem",
      path: TEMPLATES_DIR,
    });
  }

  return new FileTemplateDriver();
}

export async function listCommunityTemplates(sort: TemplateSortMode = "trending", actorId?: string) {
  const driver = getTemplateDriver();
  const templates = (await mergeSeedTemplates(await driver.list(), driver)).filter(
    (record) => record.status === "published",
  );
  return sortTemplates(templates, sort).map((record) => hydrateStoredTemplateRecord(record, actorId));
}

export async function getCommunityTemplateBySlug(slug: string, actorId?: string) {
  const driver = getTemplateDriver();
  const normalizedSlug = sanitizeTemplateSlug(slug);
  const record = await driver.getBySlug(normalizedSlug);

  if (!record) {
    const definition = SYSTEM_TEMPLATE_DEFINITIONS.find((template) => template.slug === normalizedSlug);
    const seed = definition ? await getOrCreateSystemTemplateRecord(definition, driver, null) : null;

    if (!seed) {
      return null;
    }
    return hydrateStoredTemplateRecord(seed, actorId);
  }

  if (!record || record.status !== "published") {
    return null;
  }

  return hydrateStoredTemplateRecord(record, actorId);
}

export async function publishCommunityTemplate(input: {
  slug?: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  previewImageUrl?: string;
  preset: TemplatePreset;
  previewSnapshot?: TemplatePreviewSnapshot;
  author: {
    provider?: TemplateAuthor["provider"];
    id?: string;
    username?: string;
    displayName?: string;
    profileUrl?: string;
    avatarUrl?: string;
  };
}) {
  const driver = getTemplateDriver();
  const title = normalizeTemplateText(input.title, "Untitled template", 120);
  const description = normalizeTemplateText(input.description, "A community template for Repo2Site.", 300);
  const category = normalizeTemplateText(input.category, "general", 60).toLowerCase();
  const tags = normalizeTemplateTags(input.tags);
  const author = buildTemplateAuthor(input.author);
  const requestedBaseSlug = sanitizeTemplateSlug(input.slug || title);

  let slug = requestedBaseSlug;
  let suffix = 2;
  let existing = await driver.getBySlug(slug);

  while (existing && existing.author.id !== author.id) {
    slug = `${requestedBaseSlug}-${suffix}`;
    existing = await driver.getBySlug(slug);
    suffix += 1;
  }

  const now = new Date().toISOString();
  const record: StoredCommunityTemplateRecord = existing
    ? {
        ...existing,
        title,
        description,
        category,
        tags,
        previewImageUrl: normalizeTemplateText(input.previewImageUrl ?? existing.previewImageUrl, "", 2000),
        preset: {
          appearance: { ...input.preset.appearance },
          layout: {
            sectionOrder: [...input.preset.layout.sectionOrder],
            hiddenSections: [...input.preset.layout.hiddenSections],
            components: input.preset.layout.components.map((component) => ({ ...component })),
            componentOrder: Object.fromEntries(
              Object.entries(input.preset.layout.componentOrder ?? {}).map(([key, ids]) => [key, [...ids]]),
            ),
            hiddenComponentIds: [...(input.preset.layout.hiddenComponentIds ?? [])],
          },
        },
        previewSnapshot: input.previewSnapshot ?? existing.previewSnapshot,
        updatedAt: now,
      }
    : {
        id: randomUUID(),
        slug,
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        status: "published",
        isSystem: false,
        isRecommended: false,
        title,
        description,
        category,
        tags,
        previewImageUrl: normalizeTemplateText(input.previewImageUrl ?? "", "", 2000),
        sourceLabel: "Community published template",
        author,
        preset: {
          appearance: { ...input.preset.appearance },
          layout: {
            sectionOrder: [...input.preset.layout.sectionOrder],
            hiddenSections: [...input.preset.layout.hiddenSections],
            components: input.preset.layout.components.map((component) => ({ ...component })),
            componentOrder: Object.fromEntries(
              Object.entries(input.preset.layout.componentOrder ?? {}).map(([key, ids]) => [key, [...ids]]),
            ),
            hiddenComponentIds: [...(input.preset.layout.hiddenComponentIds ?? [])],
          },
        },
        previewSnapshot: input.previewSnapshot,
        exampleContent: undefined,
        exampleProjects: [],
        likes: 0,
        dislikes: 0,
        remixes: 0,
        ratingAverage: 0,
        ratingsCount: 0,
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
        likedActorIds: [],
        reactionsByActor: {},
        ratingsByActor: {},
      };

  await driver.save(record);
  return record;
}

export async function reactCommunityTemplate(input: {
  slug: string;
  actorId: string;
  reaction: TemplateReaction;
}) {
  const driver = getTemplateDriver();
  const normalizedSlug = sanitizeTemplateSlug(input.slug);
  const definition = SYSTEM_TEMPLATE_DEFINITIONS.find((template) => template.slug === normalizedSlug);
  const record =
    (await driver.getBySlug(normalizedSlug)) ??
    (definition ? await getOrCreateSystemTemplateRecord(definition, driver, null) : null);

  if (!record || record.status !== "published") {
    return null;
  }

  const actorId = normalizeTemplateText(input.actorId, "", 120);

  if (!actorId) {
    return record;
  }

  const reactionsByActor = { ...(record.reactionsByActor ?? {}) };
  const currentReaction = reactionsByActor[actorId] ?? null;
  const nextReaction = currentReaction === input.reaction ? null : input.reaction;

  if (nextReaction) {
    reactionsByActor[actorId] = nextReaction;
  } else {
    delete reactionsByActor[actorId];
  }

  const { likes, dislikes } = getReactionCounts(reactionsByActor);

  const nextRecord: StoredCommunityTemplateRecord = {
    ...record,
    reactionsByActor,
    likedActorIds: Object.entries(reactionsByActor)
      .filter(([, reaction]) => reaction === "like")
      .map(([id]) => id),
    likes,
    dislikes,
    updatedAt: new Date().toISOString(),
  };

  await driver.save(nextRecord);
  return hydrateStoredTemplateRecord(nextRecord, actorId);
}

export async function rateCommunityTemplate(input: { slug: string; actorId: string; rating: number }) {
  const driver = getTemplateDriver();
  const normalizedSlug = sanitizeTemplateSlug(input.slug);
  const definition = SYSTEM_TEMPLATE_DEFINITIONS.find((template) => template.slug === normalizedSlug);
  const record =
    (await driver.getBySlug(normalizedSlug)) ??
    (definition ? await getOrCreateSystemTemplateRecord(definition, driver, null) : null);

  if (!record || record.status !== "published") {
    return null;
  }

  const actorId = normalizeTemplateText(input.actorId, "", 120);
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));

  if (!actorId) {
    return record;
  }

  const ratingsByActor = { ...(record.ratingsByActor ?? {}) };
  ratingsByActor[actorId] = rating;
  const ratingValues = Object.values(ratingsByActor);
  const average = ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length;

  const nextRecord: StoredCommunityTemplateRecord = {
    ...record,
    ratingsByActor,
    ratingAverage: Number(average.toFixed(2)),
    ratingsCount: ratingValues.length,
    updatedAt: new Date().toISOString(),
  };

  await driver.save(nextRecord);
  return nextRecord;
}

export async function incrementTemplateRemixCount(slug: string) {
  const driver = getTemplateDriver();
  const normalizedSlug = sanitizeTemplateSlug(slug);
  const definition = SYSTEM_TEMPLATE_DEFINITIONS.find((template) => template.slug === normalizedSlug);
  const record =
    (await driver.getBySlug(normalizedSlug)) ??
    (definition ? await getOrCreateSystemTemplateRecord(definition, driver, null) : null);

  if (!record || record.status !== "published") {
    return null;
  }

  const nextRecord: StoredCommunityTemplateRecord = {
    ...record,
    remixes: record.remixes + 1,
    updatedAt: new Date().toISOString(),
  };

  await driver.save(nextRecord);
  return nextRecord;
}
