import type { GitHubProfileInfo, GitHubRepo } from "@/lib/types";

const GITHUB_PROFILE_URL =
  /^https?:\/\/github\.com\/(?<username>[A-Za-z0-9](?:[A-Za-z0-9-]{0,38}[A-Za-z0-9])?)(?:\/)?(?:[#?].*)?$/i;

const GITHUB_API_BASE = "https://api.github.com";
const CACHE_TTL_MS = 10 * 60 * 1000;
const githubResponseCache = new Map<string, { expiresAt: number; data: unknown }>();
const GITHUB_TOKEN = process.env.GITHUB_TOKEN?.trim() || process.env.GITHUB_API_TOKEN?.trim() || "";

class GitHubApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

type GitHubUserResponse = {
  login: string;
  html_url: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  location: string | null;
  company: string | null;
  blog: string | null;
  followers: number;
  following: number;
  public_repos: number;
};

type GitHubRepoResponse = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics?: string[];
  updated_at: string;
  fork: boolean;
  archived: boolean;
  private: boolean;
};

type GitHubReadmeResponse = {
  content: string;
  download_url: string | null;
  encoding: string;
  path: string;
};

const README_MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*]\(([^)]+)\)/g;
const README_HTML_IMAGE_PATTERN = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
const README_BADGE_HOSTS = new Set(["img.shields.io", "shields.io"]);
const README_BADGE_KEYWORDS = ["badge", "status", "version", "license"];
const README_VISUAL_PRIORITY_KEYWORDS = ["screenshot", "preview", "demo"];
const README_CODE_FENCE_PATTERN = /```[\s\S]*?```/g;
const README_INLINE_CODE_PATTERN = /`([^`]+)`/g;
const README_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;
const README_HEADING_PATTERN = /^#{1,6}\s+/gm;
const README_LIST_PATTERN = /^[*-]\s+/gm;
const README_BLOCKQUOTE_PATTERN = /^>\s?/gm;
const README_HTML_TAG_PATTERN = /<[^>]+>/g;
const README_IMAGE_PATTERN = /!\[[^\]]*]\([^)]+\)/g;

function fallbackDisplayName(username: string) {
  return username
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getCachedGitHubResponse<T>(key: string) {
  const cached = githubResponseCache.get(key);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt < Date.now()) {
    githubResponseCache.delete(key);
    return null;
  }

  return cached.data as T;
}

function setCachedGitHubResponse<T>(key: string, data: T) {
  githubResponseCache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data,
  });
}

function buildGitHubHeaders(): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "repo2site",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
  };
}

async function fetchGitHubJson<T>(path: string): Promise<T> {
  const cached = getCachedGitHubResponse<T>(path);

  if (cached) {
    return cached;
  }

  let response: Response | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetch(`${GITHUB_API_BASE}${path}`, {
      headers: buildGitHubHeaders(),
      next: { revalidate: 600 },
    });

    if (response.ok || response.status < 500 || attempt === 1) {
      break;
    }
  }

  if (!response) {
    throw new GitHubApiError("GitHub API request failed. Please try again shortly.", 502);
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new GitHubApiError("GitHub profile not found.", 404);
    }

    if (response.status === 403 || response.status === 429) {
      const resetHeader = response.headers.get("x-ratelimit-reset");
      const retryHint = resetHeader
        ? ` GitHub rate limits should reset around ${new Date(Number(resetHeader) * 1000).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}.`
        : "";
      throw new GitHubApiError(
        `GitHub API rate limit reached. Please try again in a few minutes.${retryHint}`,
        response.status,
      );
    }

    throw new GitHubApiError(
      "GitHub API request failed. Please try again shortly.",
      response.status,
    );
  }

  const data = (await response.json()) as T;
  setCachedGitHubResponse(path, data);
  return data;
}

function parseRepositoryCoordinates(fullName: string) {
  const [owner, repo] = fullName.split("/");

  if (!owner || !repo) {
    throw new Error("Invalid repository name.");
  }

  return { owner, repo };
}

function normalizeReadmeImageCandidate(rawValue: string) {
  return rawValue
    .trim()
    .replace(/^<|>$/g, "")
    .replace(/\s+["'][^"']*["']$/, "");
}

function buildReadmeAssetResolver(
  owner: string,
  repo: string,
  downloadUrl: string | null,
  readmePath: string,
) {
  if (!downloadUrl) {
    return (candidate: string) => candidate;
  }

  const readmeDirectory = readmePath.includes("/")
    ? readmePath.slice(0, readmePath.lastIndexOf("/") + 1)
    : "";
  const baseDirectoryUrl = new URL(readmeDirectory, downloadUrl).toString();
  const rawRootMatch = downloadUrl.match(
    /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\//i,
  );

  return (candidate: string) => {
    if (/^https?:\/\//i.test(candidate)) {
      return candidate;
    }

    if (candidate.startsWith("//")) {
      return `https:${candidate}`;
    }

    if (candidate.startsWith("/")) {
      if (!rawRootMatch) {
        return candidate;
      }

      const [, resolvedOwner, resolvedRepo, branch] = rawRootMatch;
      return `https://raw.githubusercontent.com/${resolvedOwner}/${resolvedRepo}/${branch}${candidate}`;
    }

    try {
      return new URL(candidate, baseDirectoryUrl).toString();
    } catch {
      return `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${candidate}`;
    }
  };
}

function isValidProjectImage(url: string) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const normalizedUrl = url.toLowerCase();

    if (README_BADGE_HOSTS.has(hostname) || hostname.endsWith(".shields.io")) {
      return false;
    }

    return !README_BADGE_KEYWORDS.some((keyword) => normalizedUrl.includes(keyword));
  } catch {
    return false;
  }
}

function scoreProjectImage(url: string) {
  const normalizedUrl = url.toLowerCase();
  let score = 0;

  for (const keyword of README_VISUAL_PRIORITY_KEYWORDS) {
    if (normalizedUrl.includes(keyword)) {
      score += 2;
    }
  }

  if (normalizedUrl.includes("readme")) {
    score += 1;
  }

  return score;
}

function extractReadmeImageLinks(
  markdown: string,
  owner: string,
  repo: string,
  downloadUrl: string | null,
  readmePath: string,
) {
  const resolveAssetUrl = buildReadmeAssetResolver(owner, repo, downloadUrl, readmePath);
  const candidates = new Set<string>();

  for (const match of markdown.matchAll(README_MARKDOWN_IMAGE_PATTERN)) {
    const normalized = normalizeReadmeImageCandidate(match[1] ?? "");

    if (!normalized) {
      continue;
    }

    candidates.add(resolveAssetUrl(normalized));
  }

  for (const match of markdown.matchAll(README_HTML_IMAGE_PATTERN)) {
    const normalized = normalizeReadmeImageCandidate(match[1] ?? "");

    if (!normalized) {
      continue;
    }

    candidates.add(resolveAssetUrl(normalized));
  }

  return [...candidates]
    .filter((candidate) => /^https?:\/\//i.test(candidate))
    .filter((candidate) => isValidProjectImage(candidate))
    .map((candidate, index) => ({
      candidate,
      index,
      score: scoreProjectImage(candidate),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ candidate }) => candidate)
    .slice(0, 4);
}

function extractReadmeExcerpt(markdown: string) {
  const normalized = markdown
    .replace(README_CODE_FENCE_PATTERN, " ")
    .replace(README_IMAGE_PATTERN, " ")
    .replace(README_LINK_PATTERN, "$1")
    .replace(README_INLINE_CODE_PATTERN, "$1")
    .replace(README_HEADING_PATTERN, "")
    .replace(README_LIST_PATTERN, "")
    .replace(README_BLOCKQUOTE_PATTERN, "")
    .replace(README_HTML_TAG_PATTERN, " ")
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((section) => section.replace(/\n+/g, " ").replace(/\s+/g, " ").trim())
    .filter((section) => section.length >= 60);

  return normalized[0]?.slice(0, 420).trim() ?? "";
}

export function parseGitHubProfileUrl(url: string) {
  const normalizedUrl = url.trim();
  const match = GITHUB_PROFILE_URL.exec(normalizedUrl);

  if (!match?.groups?.username) {
    throw new Error("Invalid GitHub profile URL.");
  }

  return {
    username: match.groups.username,
    url: `https://github.com/${match.groups.username}`,
  };
}

export async function fetchGitHubProfile(username: string): Promise<GitHubProfileInfo> {
  const profile = await fetchGitHubJson<GitHubUserResponse>(`/users/${username}`);

  return {
    username: profile.login,
    url: profile.html_url,
    name: profile.name?.trim() || fallbackDisplayName(profile.login),
    bio: profile.bio?.trim() || "",
    avatarUrl: profile.avatar_url,
    location: profile.location?.trim() || "",
    company: profile.company?.trim() || "",
    blog: profile.blog?.trim() || "",
    followers: profile.followers,
    following: profile.following,
    publicRepos: profile.public_repos,
  };
}

export async function fetchGitHubRepos(username: string): Promise<GitHubRepo[]> {
  const collected: GitHubRepo[] = [];

  for (let page = 1; page <= 3; page += 1) {
    const repos = await fetchGitHubJson<GitHubRepoResponse[]>(
      `/users/${username}/repos?per_page=100&page=${page}&sort=updated&type=owner`,
    );

    collected.push(
      ...repos
        .filter((repo) => !repo.private)
        .map((repo) => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description?.trim() || "",
          htmlUrl: repo.html_url,
          homepage: repo.homepage?.trim() || "",
          stargazersCount: repo.stargazers_count,
          forksCount: repo.forks_count,
          language: repo.language?.trim() || "",
          topics: Array.isArray(repo.topics) ? repo.topics : [],
          updatedAt: repo.updated_at,
          isFork: repo.fork,
          isArchived: repo.archived,
        })),
    );

    if (repos.length < 100) {
      break;
    }
  }

  return collected;
}

export async function fetchRepositoryReadmeImages(repo: GitHubRepo) {
  try {
    const { owner, repo: repositoryName } = parseRepositoryCoordinates(repo.fullName);
    const readme = await fetchGitHubJson<GitHubReadmeResponse>(
      `/repos/${owner}/${repositoryName}/readme`,
    );

    if (readme.encoding !== "base64" || !readme.content) {
      return [];
    }

    const markdown = Buffer.from(readme.content, "base64").toString("utf8");
    return extractReadmeImageLinks(markdown, owner, repositoryName, readme.download_url, readme.path);
  } catch (error) {
    if (error instanceof GitHubApiError) {
      return [];
    }

    return [];
  }
}

export async function fetchRepositoryReadmeExcerpt(repo: GitHubRepo) {
  try {
    const { owner, repo: repositoryName } = parseRepositoryCoordinates(repo.fullName);
    const readme = await fetchGitHubJson<GitHubReadmeResponse>(
      `/repos/${owner}/${repositoryName}/readme`,
    );

    if (readme.encoding !== "base64" || !readme.content) {
      return "";
    }

    const markdown = Buffer.from(readme.content, "base64").toString("utf8");
    return extractReadmeExcerpt(markdown);
  } catch (error) {
    if (error instanceof GitHubApiError) {
      return "";
    }

    return "";
  }
}

export function deriveTopLanguages(repos: GitHubRepo[]) {
  const scores = new Map<string, number>();

  for (const repo of repos) {
    if (!repo.language) {
      continue;
    }

    const weight = 1 + repo.stargazersCount * 2 + (repo.isFork ? 0 : 2);
    scores.set(repo.language, (scores.get(repo.language) ?? 0) + weight);
  }

  return [...scores.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([language]) => language);
}

export function isGitHubApiError(error: unknown): error is GitHubApiError {
  return error instanceof GitHubApiError;
}
