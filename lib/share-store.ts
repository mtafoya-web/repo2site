import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FinalPortfolio } from "@/lib/portfolio";
import {
  assertProductionStorageBackend,
  getConfiguredStorageBackend,
  isProductionDeployment,
} from "@/lib/runtime-env";
import { logServerEvent } from "@/lib/server-logger";
import { getSiteOrigin } from "@/lib/site-url";

export const SHARE_SCHEMA_VERSION = 2;
export const SHARE_SNAPSHOT_VERSION = 1;

export type ShareStatus = "published" | "unpublished" | "archived";

export type PublicPortfolioProfile = {
  username: string;
  url: string;
  name: string;
  bio: string;
  avatarUrl: string;
  location: string;
  company: string;
  blog: string;
};

export type PublicPortfolioSnapshot = Omit<FinalPortfolio, "profile"> & {
  profile: PublicPortfolioProfile | null;
};

export type ShareOwnerRef = {
  provider: "github" | "anonymous" | "account";
  id: string;
  displayName: string;
};

export type SharePublicMetadata = {
  title: string;
  description: string;
  featuredProjectName: string;
  imageUrl: string;
  shareText: string;
  themeId: string;
};

export type SharedPortfolioRecord = {
  id: string;
  slug: string;
  schemaVersion: number;
  snapshotVersion: number;
  status: ShareStatus;
  owner: ShareOwnerRef;
  portfolio: PublicPortfolioSnapshot;
  metadata: SharePublicMetadata;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  viewCount: number;
};

type StoredSharedPortfolioRecord = SharedPortfolioRecord & {
  recentViewKeys?: Record<string, string[]>;
  ownerKey?: string;
};

export type ShareAvailabilityResult = {
  slug: string;
  normalizedSlug: string;
  available: boolean;
  reason: "available" | "owned" | "taken" | "invalid";
  suggestedSlug?: string;
};

type PublishShareInput = {
  portfolio: FinalPortfolio;
  requestedSlug?: string;
  siteOrigin?: string;
  owner?: ShareOwnerRef;
};

type ShareDriver = {
  kind: "filesystem" | "upstash";
  getBySlug(slug: string): Promise<StoredSharedPortfolioRecord | null>;
  getByOwner(owner: ShareOwnerRef): Promise<StoredSharedPortfolioRecord | null>;
  save(record: StoredSharedPortfolioRecord): Promise<void>;
  deleteBySlug(slug: string): Promise<void>;
  recordView(record: StoredSharedPortfolioRecord, viewerKey?: string): Promise<StoredSharedPortfolioRecord>;
};

const SHARES_DIR = path.join(process.cwd(), ".repo2site-data", "shares");

function safeText(value: string, fallback = "", maxLength = 600) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.slice(0, maxLength) || fallback;
}

function getShareFilePath(slug: string) {
  return path.join(SHARES_DIR, `${slug}.json`);
}

function getOwnerLookupKey(owner: ShareOwnerRef) {
  return `${owner.provider}:${owner.id}`;
}

function buildOwnerKeyFromSnapshot(portfolio: PublicPortfolioSnapshot) {
  return (
    portfolio.profile?.username?.trim().toLowerCase() ||
    portfolio.profile?.url?.trim().toLowerCase() ||
    portfolio.hero.name.trim().toLowerCase() ||
    "portfolio-owner"
  );
}

function buildOwnerFromSnapshot(portfolio: PublicPortfolioSnapshot): ShareOwnerRef {
  if (portfolio.profile?.username.trim()) {
    return {
      provider: "github",
      id: portfolio.profile.username.trim().toLowerCase(),
      displayName: portfolio.profile.name.trim() || portfolio.profile.username.trim(),
    };
  }

  const displayName = safeText(portfolio.hero.name, "Portfolio owner", 120);

  return {
    provider: "anonymous",
    id: createHash("sha256").update(buildOwnerKeyFromSnapshot(portfolio)).digest("hex").slice(0, 20),
    displayName,
  };
}

function makePublicSnapshot(portfolio: FinalPortfolio): PublicPortfolioSnapshot {
  const profile = portfolio.profile
    ? {
        username: safeText(portfolio.profile.username, "", 80),
        url: safeText(portfolio.profile.url, "", 320),
        name: safeText(portfolio.profile.name, "", 120),
        bio: safeText(portfolio.profile.bio, "", 400),
        avatarUrl: safeText(portfolio.profile.avatarUrl, "", 1000),
        location: safeText(portfolio.profile.location, "", 120),
        company: safeText(portfolio.profile.company, "", 120),
        blog: safeText(portfolio.profile.blog, "", 320),
      }
    : null;

  return {
    ...portfolio,
    profile,
    summary: safeText(portfolio.summary, "", 500),
    hero: {
      ...portfolio.hero,
      name: safeText(portfolio.hero.name, "Portfolio", 120),
      imageUrl: safeText(portfolio.hero.imageUrl, "", 1000),
      ctaLabel: safeText(portfolio.hero.ctaLabel, "View profile", 60),
      profileLink: safeText(portfolio.hero.profileLink, "", 320),
      headline: {
        ...portfolio.hero.headline,
        value: safeText(portfolio.hero.headline.value, "Portfolio overview", 220),
      },
      subheadline: {
        ...portfolio.hero.subheadline,
        value: safeText(portfolio.hero.subheadline.value, "", 320),
      },
    },
    about: {
      title: {
        ...portfolio.about.title,
        value: safeText(portfolio.about.title.value, "About", 80),
      },
      description: {
        ...portfolio.about.description,
        value: safeText(portfolio.about.description.value, "", 1400),
      },
    },
    contact: {
      ...portfolio.contact,
      title: {
        ...portfolio.contact.title,
        value: safeText(portfolio.contact.title.value, "Contact", 80),
      },
      description: {
        ...portfolio.contact.description,
        value: safeText(portfolio.contact.description.value, "", 800),
      },
      customText: safeText(portfolio.contact.customText, "", 800),
      email: safeText(portfolio.contact.email, "", 180),
      emailHref: safeText(portfolio.contact.emailHref, "", 320),
      phone: safeText(portfolio.contact.phone, "", 80),
      phoneHref: safeText(portfolio.contact.phoneHref, "", 120),
    },
    professional: {
      ...portfolio.professional,
      title: safeText(portfolio.professional.title, "Career / Professional Info", 120),
      summary: safeText(portfolio.professional.summary, "", 1200),
      company: safeText(portfolio.professional.company, "", 120),
      location: safeText(portfolio.professional.location, "", 120),
      availability: safeText(portfolio.professional.availability, "", 160),
      actions: portfolio.professional.actions
        .map((action) => ({
          ...action,
          label: safeText(action.label, "", 80),
          href: safeText(action.href, "", 1000),
        }))
        .filter((action) => action.label && action.href),
    },
    linksSection: {
      title: {
        ...portfolio.linksSection.title,
        value: safeText(portfolio.linksSection.title.value, "Links", 80),
      },
      description: {
        ...portfolio.linksSection.description,
        value: safeText(portfolio.linksSection.description.value, "", 800),
      },
      links: portfolio.linksSection.links
        .map((link) => ({
          ...link,
          label: safeText(link.label, "", 80),
          href: safeText(link.href, "", 1000),
        }))
        .filter((link) => link.label && link.href),
    },
    repositories: portfolio.repositories.map((repository) => ({
      ...repository,
      name: safeText(repository.name, "Project", 120),
      description: safeText(repository.description, "", 1000),
      language: safeText(repository.language, "", 80),
      href: safeText(repository.href, "", 1000),
      readmeExcerpt: safeText(repository.readmeExcerpt, "", 800),
      resolvedImage: repository.resolvedImage
        ? {
            ...repository.resolvedImage,
            url: safeText(repository.resolvedImage.url, "", 2000),
            alt: safeText(repository.resolvedImage.alt, repository.name, 160),
          }
        : null,
    })),
    techStack: portfolio.techStack.map((tech) => safeText(tech, "", 60)).filter(Boolean),
  };
}

function validatePublicSnapshot(snapshot: PublicPortfolioSnapshot) {
  if (!snapshot.hero.name.trim()) {
    throw new Error("Public portfolio snapshot is missing a name.");
  }

  if (!snapshot.hero.headline.value.trim()) {
    throw new Error("Public portfolio snapshot is missing a headline.");
  }

  if (!Array.isArray(snapshot.repositories)) {
    throw new Error("Public portfolio snapshot is invalid.");
  }

  return snapshot;
}

function sanitizeShareSlugBase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sanitizeShareSlug(value: string) {
  return sanitizeShareSlugBase(value) || "portfolio";
}

function isValidShareSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length >= 2 && value.length <= 60;
}

function buildSuggestedShareSlug(value: string) {
  const normalized = sanitizeShareSlug(value);
  return normalized.length < 2 ? `${normalized}site`.slice(0, 60) : normalized;
}

function buildShareMetadata(portfolio: PublicPortfolioSnapshot, slug: string, siteOrigin: string): SharePublicMetadata {
  const featuredProject = portfolio.repositories[0]?.name ?? "";
  const title = `${portfolio.hero.name} | Portfolio`;
  const description =
    safeText(portfolio.hero.subheadline.value, "", 220) ||
    safeText(portfolio.about.description.value, "", 220) ||
    safeText(portfolio.professional.summary, "", 220) ||
    "Explore this portfolio.";
  const shareText = [
    `${portfolio.hero.name}'s portfolio`,
    portfolio.hero.headline.value,
    featuredProject ? `Featured project: ${featuredProject}` : "",
  ]
    .filter(Boolean)
    .join(" — ");

  return {
    title,
    description,
    featuredProjectName: featuredProject,
    imageUrl: `${siteOrigin}/u/${slug}/opengraph-image`,
    shareText: safeText(shareText, title, 260),
    themeId: portfolio.theme.id,
  };
}

function migrateRecord(record: unknown, slug: string) {
  const fallbackNow = new Date().toISOString();
  const legacy = record as Partial<StoredSharedPortfolioRecord> & {
    ownerKey?: string;
    portfolio?: PublicPortfolioSnapshot;
    createdAt?: string;
    updatedAt?: string;
    viewCount?: number;
  };

  if (!legacy?.portfolio) {
    return null;
  }

  const portfolio = validatePublicSnapshot(legacy.portfolio);
  const owner = legacy.owner ?? buildOwnerFromSnapshot(portfolio);
  const siteOrigin = getSiteOrigin();

  return {
    id: legacy.id ?? randomUUID(),
    slug: sanitizeShareSlug(legacy.slug ?? slug),
    schemaVersion: SHARE_SCHEMA_VERSION,
    snapshotVersion: SHARE_SNAPSHOT_VERSION,
    status: legacy.status ?? "published",
    owner,
    portfolio,
    metadata: legacy.metadata ?? buildShareMetadata(portfolio, sanitizeShareSlug(legacy.slug ?? slug), siteOrigin),
    createdAt: legacy.createdAt ?? fallbackNow,
    updatedAt: legacy.updatedAt ?? legacy.createdAt ?? fallbackNow,
    publishedAt: legacy.publishedAt ?? legacy.updatedAt ?? legacy.createdAt ?? fallbackNow,
    viewCount: typeof legacy.viewCount === "number" ? legacy.viewCount : 0,
    recentViewKeys: legacy.recentViewKeys ?? {},
    ownerKey: legacy.ownerKey ?? getOwnerLookupKey(owner),
  } satisfies StoredSharedPortfolioRecord;
}

async function ensureSharesDirectory() {
  await mkdir(SHARES_DIR, { recursive: true });
}

class FileShareDriver implements ShareDriver {
  kind = "filesystem" as const;

  private async readRecord(slug: string) {
    try {
      const raw = await readFile(getShareFilePath(slug), "utf8");
      return migrateRecord(JSON.parse(raw), slug);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }

  async getBySlug(slug: string) {
    return this.readRecord(slug);
  }

  async getByOwner(owner: ShareOwnerRef) {
    await ensureSharesDirectory();
    const files = await readdir(SHARES_DIR);
    const ownerLookupKey = getOwnerLookupKey(owner);

    for (const fileName of files) {
      if (!fileName.endsWith(".json")) {
        continue;
      }

      const slug = fileName.replace(/\.json$/, "");
      const record = await this.readRecord(slug);

      if (record?.ownerKey === ownerLookupKey) {
        return record;
      }
    }

    return null;
  }

  async save(record: StoredSharedPortfolioRecord) {
    await ensureSharesDirectory();
    await writeFile(getShareFilePath(record.slug), JSON.stringify(record, null, 2), "utf8");
  }

  async deleteBySlug(slug: string) {
    await rm(getShareFilePath(slug), { force: true });
  }

  async recordView(record: StoredSharedPortfolioRecord, viewerKey?: string) {
    if (!viewerKey) {
      const next = { ...record, viewCount: record.viewCount + 1 };
      await this.save(next);
      return next;
    }

    const today = new Date().toISOString().slice(0, 10);
    const recentViewKeys = { ...(record.recentViewKeys ?? {}) };
    const todayKeys = recentViewKeys[today] ?? [];

    if (todayKeys.includes(viewerKey)) {
      return record;
    }

    const next = {
      ...record,
      viewCount: record.viewCount + 1,
      recentViewKeys: {
        ...recentViewKeys,
        [today]: [...todayKeys, viewerKey].slice(-400),
      },
    };

    await this.save(next);
    return next;
  }
}

class UpstashShareDriver implements ShareDriver {
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
      throw new Error(`Upstash share store request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as { result?: T; error?: string };

    if (payload.error) {
      throw new Error(payload.error);
    }

    return payload.result ?? null;
  }

  private shareKey(slug: string) {
    return `repo2site:share:${slug}`;
  }

  private ownerKey(owner: ShareOwnerRef) {
    return `repo2site:share-owner:${getOwnerLookupKey(owner)}`;
  }

  private viewKey(slug: string, viewerKey: string) {
    const day = new Date().toISOString().slice(0, 10);
    return `repo2site:share-view:${slug}:${day}:${viewerKey}`;
  }

  async getBySlug(slug: string) {
    const raw = await this.command<string>("GET", this.shareKey(slug));

    if (!raw) {
      return null;
    }

    return migrateRecord(JSON.parse(raw), slug);
  }

  async getByOwner(owner: ShareOwnerRef) {
    const slug = await this.command<string>("GET", this.ownerKey(owner));

    if (!slug) {
      return null;
    }

    return this.getBySlug(slug);
  }

  async save(record: StoredSharedPortfolioRecord) {
    await this.command("SET", this.shareKey(record.slug), JSON.stringify(record));
    await this.command("SET", this.ownerKey(record.owner), record.slug);
  }

  async deleteBySlug(slug: string) {
    await this.command("DEL", this.shareKey(slug));
  }

  async recordView(record: StoredSharedPortfolioRecord, viewerKey?: string) {
    if (!viewerKey) {
      const next = { ...record, viewCount: record.viewCount + 1 };
      await this.save(next);
      return next;
    }

    const dedupeKey = this.viewKey(record.slug, viewerKey);
    const wasInserted = await this.command<string | null>("SET", dedupeKey, "1", "NX", "EX", 172800);

    if (wasInserted !== "OK") {
      return record;
    }

    const next = { ...record, viewCount: record.viewCount + 1 };
    await this.save(next);
    return next;
  }
}

function resolveShareDriver() {
  const backend = getConfiguredStorageBackend();

  if (backend.kind === "upstash") {
    return new UpstashShareDriver(backend.upstashUrl, backend.upstashToken);
  }

  assertProductionStorageBackend("shares");

  if (!isProductionDeployment()) {
    logServerEvent("warn", "Using filesystem share storage fallback", {
      backend: "filesystem",
      path: SHARES_DIR,
    });
  }

  return new FileShareDriver();
}

function getShareDriver() {
  return resolveShareDriver();
}

function buildViewerKeyFromHint(viewerHint?: string) {
  if (!viewerHint?.trim()) {
    return undefined;
  }

  return createHash("sha256").update(viewerHint.trim()).digest("hex").slice(0, 24);
}

function buildPublishedRecord(input: {
  slug: string;
  snapshot: PublicPortfolioSnapshot;
  owner: ShareOwnerRef;
  existing?: StoredSharedPortfolioRecord | null;
  siteOrigin: string;
}) {
  const now = new Date().toISOString();
  const base = input.existing;

  return {
    id: base?.id ?? randomUUID(),
    slug: input.slug,
    schemaVersion: SHARE_SCHEMA_VERSION,
    snapshotVersion: SHARE_SNAPSHOT_VERSION,
    status: "published" as const,
    owner: input.owner,
    portfolio: input.snapshot,
    metadata: buildShareMetadata(input.snapshot, input.slug, input.siteOrigin),
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
    publishedAt: base?.publishedAt ?? now,
    viewCount: base?.viewCount ?? 0,
    recentViewKeys: base?.recentViewKeys ?? {},
    ownerKey: getOwnerLookupKey(input.owner),
  } satisfies StoredSharedPortfolioRecord;
}

export async function checkShareSlugAvailability(input: { slug: string; ownerHint?: string }) {
  const normalizedSlug = sanitizeShareSlugBase(input.slug);

  if (!normalizedSlug || !isValidShareSlug(normalizedSlug)) {
    return {
      slug: input.slug,
      normalizedSlug: normalizedSlug || "portfolio",
      available: false,
      reason: "invalid",
      suggestedSlug: buildSuggestedShareSlug(input.slug || "portfolio"),
    } satisfies ShareAvailabilityResult;
  }

  const driver = getShareDriver();
  const existing = await driver.getBySlug(normalizedSlug);

  if (!existing) {
    return {
      slug: input.slug,
      normalizedSlug,
      available: true,
      reason: "available",
    } satisfies ShareAvailabilityResult;
  }

  if (input.ownerHint?.trim() && getOwnerLookupKey(existing.owner) === input.ownerHint.trim()) {
    return {
      slug: input.slug,
      normalizedSlug,
      available: true,
      reason: "owned",
    } satisfies ShareAvailabilityResult;
  }

  return {
    slug: input.slug,
    normalizedSlug,
    available: false,
    reason: "taken",
    suggestedSlug: `${normalizedSlug}-${Math.floor(Math.random() * 90) + 10}`,
  } satisfies ShareAvailabilityResult;
}

export async function publishPortfolioShare(input: PublishShareInput) {
  const siteOrigin = input.siteOrigin || getSiteOrigin();
  const snapshot = validatePublicSnapshot(makePublicSnapshot(input.portfolio));
  const owner = input.owner ?? buildOwnerFromSnapshot(snapshot);
  const ownerKey = getOwnerLookupKey(owner);
  const driver = getShareDriver();
  const existingForOwner = await driver.getByOwner(owner);
  const requestedSlug = sanitizeShareSlug(input.requestedSlug || existingForOwner?.slug || snapshot.profile?.username || snapshot.hero.name);

  if (!isValidShareSlug(requestedSlug)) {
    throw new Error("Choose a public URL that uses letters, numbers, and single hyphens only.");
  }

  const recordAtSlug = await driver.getBySlug(requestedSlug);

  if (recordAtSlug && getOwnerLookupKey(recordAtSlug.owner) !== ownerKey) {
    throw new Error("That public URL is already taken. Try a different slug.");
  }

  const nextRecord = buildPublishedRecord({
    slug: requestedSlug,
    snapshot,
    owner,
    existing:
      recordAtSlug && getOwnerLookupKey(recordAtSlug.owner) === ownerKey
        ? recordAtSlug
      : existingForOwner,
    siteOrigin,
  });

  await driver.save(nextRecord);

  if (existingForOwner && existingForOwner.slug !== requestedSlug) {
    await driver.deleteBySlug(existingForOwner.slug);
  }

  return nextRecord;
}

export async function getSharedPortfolioBySlug(slug: string) {
  const driver = getShareDriver();
  const record = await driver.getBySlug(sanitizeShareSlug(slug));

  if (!record || record.status !== "published") {
    return null;
  }

  return record satisfies SharedPortfolioRecord;
}

export async function getSharedPortfolioForPublicView(slug: string, viewerHint?: string) {
  const driver = getShareDriver();
  const normalizedSlug = sanitizeShareSlug(slug);
  const record = await driver.getBySlug(normalizedSlug);

  if (!record || record.status !== "published") {
    return null;
  }

  const viewerKey = buildViewerKeyFromHint(viewerHint);
  const nextRecord = await driver.recordView(record, viewerKey);
  return nextRecord satisfies SharedPortfolioRecord;
}
