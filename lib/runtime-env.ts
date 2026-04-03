type StorageScope = "shares" | "templates";

type RuntimeConfigErrorOptions = {
  area: string;
  details: string[];
};

const validatedAreas = new Set<string>();

function buildConfigError({ area, details }: RuntimeConfigErrorOptions) {
  return new Error(
    `[repo2site] Missing required production configuration for ${area}: ${details.join(", ")}.`,
  );
}

export function isProductionDeployment() {
  return (
    process.env.REPO2SITE_RUNTIME_ENV?.trim().toLowerCase() === "production" ||
    process.env.VERCEL_ENV?.trim().toLowerCase() === "production"
  );
}

export function getConfiguredStorageBackend() {
  const preferredBackend = process.env.REPO2SITE_SHARE_BACKEND?.trim().toLowerCase();
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (
    (preferredBackend === "upstash" || (!preferredBackend && upstashUrl && upstashToken)) &&
    upstashUrl &&
    upstashToken
  ) {
    return {
      kind: "upstash" as const,
      upstashUrl,
      upstashToken,
    };
  }

  return {
    kind: "filesystem" as const,
    upstashUrl: upstashUrl || "",
    upstashToken: upstashToken || "",
  };
}

export function assertProductionAppRuntimeEnv() {
  if (!isProductionDeployment()) {
    return;
  }

  const area = "app-runtime";

  if (validatedAreas.has(area)) {
    return;
  }

  const missing: string[] = [];

  if (!process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    missing.push("NEXT_PUBLIC_APP_URL");
  }

  if (!process.env.SENTRY_DSN?.trim() && !process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) {
    missing.push("SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN");
  }

  if (!process.env.REPO2SITE_AUTH_SECRET?.trim()) {
    missing.push("REPO2SITE_AUTH_SECRET");
  }

  if (!process.env.GITHUB_CLIENT_ID?.trim() || !process.env.GITHUB_CLIENT_SECRET?.trim()) {
    missing.push("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET");
  }

  const backend = getConfiguredStorageBackend();

  if (backend.kind !== "upstash") {
    missing.push(
      "REPO2SITE_SHARE_BACKEND=upstash plus UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN",
    );
  }

  if (missing.length > 0) {
    throw buildConfigError({
      area,
      details: missing,
    });
  }

  validatedAreas.add(area);
}

export function assertProductionStorageBackend(scope: StorageScope) {
  if (!isProductionDeployment()) {
    return;
  }

  const area = `storage:${scope}`;

  if (validatedAreas.has(area)) {
    return;
  }

  const backend = getConfiguredStorageBackend();

  if (backend.kind !== "upstash") {
    throw buildConfigError({
      area,
      details: [
        "REPO2SITE_SHARE_BACKEND=upstash",
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_TOKEN",
      ],
    });
  }

  validatedAreas.add(area);
}
