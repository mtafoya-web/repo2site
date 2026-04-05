import { buildPreviewPromptSeed } from "@/lib/prompt";
import { getPortfolioThemeById } from "@/lib/themes";
import {
  deriveTopLanguages,
  fetchGitHubProfile,
  fetchGitHubRepos,
  fetchRepositoryReadmeExcerpt,
  fetchRepositoryReadmeImages,
  parseGitHubProfileUrl,
} from "@/lib/github";
import type {
  GeneratePreviewResponse,
  GenerateRepoSelectionResponse,
  GitHubProfileInfo,
  GitHubRepo,
  PreviewLink,
} from "@/lib/types";

function scoreRepository(repo: GitHubRepo) {
  let score = repo.stargazersCount * 12 + repo.forksCount * 4;

  if (repo.description) score += 18;
  if (repo.homepage) score += 8;
  if (repo.language) score += 8;

  score += Math.min(repo.topics.length, 4) * 3;

  if (!repo.isFork) score += 14;
  if (!repo.isArchived) score += 6;

  return score;
}

function selectFeaturedRepositories(
  repos: GitHubRepo[],
  selectedRepositoryFullNames?: string[],
) {
  if (selectedRepositoryFullNames && selectedRepositoryFullNames.length > 0) {
    const selectedFullNames = new Set(
      selectedRepositoryFullNames.map((repositoryName) => repositoryName.trim().toLowerCase()),
    );
    const repositoriesByFullName = new Map(
      repos.map((repo) => [repo.fullName.trim().toLowerCase(), repo] as const),
    );

    return selectedRepositoryFullNames
      .map((repositoryName) => repositoriesByFullName.get(repositoryName.trim().toLowerCase()))
      .filter((repo): repo is GitHubRepo => Boolean(repo) && selectedFullNames.has(repo.fullName.trim().toLowerCase()));
  }

  const ranked = repos
    .filter((repo) => !repo.isArchived)
    .sort((left, right) => scoreRepository(right) - scoreRepository(left));

  const preferred = ranked.filter(
    (repo) => !repo.isFork && (repo.description || repo.stargazersCount > 0 || repo.homepage),
  );

  const pool = preferred.length > 0 ? preferred : ranked;
  const targetCount = pool.length >= 3 ? Math.min(6, pool.length) : pool.length;

  return pool.slice(0, targetCount);
}

export function buildRepositorySelectionResponse(repos: GitHubRepo[]): GenerateRepoSelectionResponse {
  const suggestedRepositoryFullNames = selectFeaturedRepositories(repos).map((repo) => repo.fullName);
  const ranked = [...repos].sort((left, right) => scoreRepository(right) - scoreRepository(left));

  return {
    repositories: ranked.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.fullName,
      description: repo.description,
      language: repo.language || "Not specified",
      stars: repo.stargazersCount,
      updatedAt: repo.updatedAt,
      isFork: repo.isFork,
      isArchived: repo.isArchived,
    })),
    suggestedRepositoryFullNames,
  };
}

function joinNaturalList(values: string[]) {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function buildHeadline(profile: GitHubProfileInfo, topLanguages: string[]) {
  if (profile.bio) {
    return profile.bio;
  }

  if (topLanguages.length > 0) {
    return `Software projects grounded in ${joinNaturalList(topLanguages.slice(0, 3))}.`;
  }

  return "Public projects, experiments, and developer tools built from real GitHub work.";
}

function buildSummary(profile: GitHubProfileInfo, repos: GitHubRepo[], topLanguages: string[]) {
  const activeRepositories = repos.filter((repo) => !repo.isArchived);
  const repoHighlights = activeRepositories
    .filter((repo) => repo.description || repo.homepage || repo.stargazersCount > 0)
    .slice(0, 3)
    .map((repo) => repo.name);
  const highlights = [
    topLanguages.length > 0 ? `focused most often on ${joinNaturalList(topLanguages.slice(0, 4))}` : "",
    profile.company ? `shaped by work connected to ${profile.company}` : "",
    profile.location ? `based in ${profile.location}` : "",
  ].filter(Boolean);

  if (profile.bio && highlights.length > 0) {
    return `${profile.bio} The portfolio draft reflects ${joinNaturalList(highlights)}${repoHighlights.length > 0 ? `, with selected work such as ${joinNaturalList(repoHighlights)}` : ""}.`;
  }

  if (profile.bio) {
    return profile.bio;
  }

  if (highlights.length > 0) {
    return `A portfolio draft shaped by ${joinNaturalList(highlights)}${repoHighlights.length > 0 ? ` and selected work such as ${joinNaturalList(repoHighlights)}` : ""}.`;
  }

  return "A portfolio draft built from public GitHub projects, experiments, and repository context.";
}

function buildHeroSubheadline(
  profile: GitHubProfileInfo,
  featuredRepositoryCount: number,
  topLanguages: string[],
) {
  const languageSummary =
    topLanguages.length > 0 ? `with a focus on ${joinNaturalList(topLanguages.slice(0, 3))}` : "";

  if (featuredRepositoryCount > 0) {
    return `Built from ${featuredRepositoryCount} featured repositories drawn from recent public GitHub work ${languageSummary}. This draft starts from real code, repository context, and README signals instead of placeholder portfolio copy.`.trim();
  }

  if (profile.bio) {
    return `Grounded in public profile details and repository activity ${languageSummary}. The starting point comes directly from work already visible on GitHub.`.trim();
  }

  return `This portfolio starts from public GitHub work ${languageSummary}. Adding a resume or professional links helps turn the draft into a stronger career story.`.trim();
}

function buildAbout(profile: GitHubProfileInfo, repoCount: number) {
  const parts = [profile.bio || "Public GitHub work and repository history are shaping this portfolio draft."];

  if (profile.company) parts.push(`Current work is connected to ${profile.company}.`);
  if (profile.location) parts.push(`Based in ${profile.location}.`);
  if (repoCount > 0) {
    parts.push("Selected repositories and README content are being used to shape the project story and technical focus.");
  }

  return parts.join(" ");
}

function buildLinks(profile: GitHubProfileInfo) {
  const links: PreviewLink[] = [{ label: "GitHub", href: profile.url }];

  if (profile.blog) {
    const href = /^https?:\/\//i.test(profile.blog) ? profile.blog : `https://${profile.blog}`;
    links.push({ label: "Website", href });
  }

  return links;
}

function buildRepositoryDescription(repo: GitHubRepo) {
  if (repo.description) {
    return repo.description;
  }

  const repoSignals = [repo.language, ...repo.topics.slice(0, 2)].filter(Boolean);

  if (repoSignals.length > 0) {
    return `Built in ${joinNaturalList(repoSignals)} and selected as part of this portfolio preview.`;
  }

  return "Selected from public GitHub work and ready to be expanded with README context, portfolio edits, or AI suggestions.";
}

function selectTheme(profile: GitHubProfileInfo, repos: GitHubRepo[], topLanguages: string[]) {
  const primaryLanguage = topLanguages[0] || "";
  const activeRepoCount = repos.filter((repo) => !repo.isArchived).length;
  const hasCreativeSignals = ["HTML", "CSS", "MDX"].includes(primaryLanguage) || Boolean(profile.blog);
  const hasSystemsSignals = ["Rust", "Go", "C", "C++", "Zig"].includes(primaryLanguage);
  const hasHighActivitySignals = profile.followers >= 200 || activeRepoCount >= 40;

  if (hasCreativeSignals) return getPortfolioThemeById("editorial-amber");
  if (hasSystemsSignals) return getPortfolioThemeById("systems-green");
  if (hasHighActivitySignals) return getPortfolioThemeById("signal-violet");

  return getPortfolioThemeById("builder-blue");
}

export async function generatePortfolioPreview(
  profileUrl: string,
  options?: { selectedRepositoryFullNames?: string[] },
): Promise<GeneratePreviewResponse> {
  const parsedProfile = parseGitHubProfileUrl(profileUrl);
  const [profile, repos] = await Promise.all([
    fetchGitHubProfile(parsedProfile.username),
    fetchGitHubRepos(parsedProfile.username),
  ]);

  const featuredRepositoryCandidates = selectFeaturedRepositories(
    repos,
    options?.selectedRepositoryFullNames,
  );
  const featuredRepositories = await Promise.all(
    featuredRepositoryCandidates.map(async (repo) => {
      const [readmeImages, readmeExcerpt] = await Promise.all([
        fetchRepositoryReadmeImages(repo),
        fetchRepositoryReadmeExcerpt(repo),
      ]);

      return {
        name: repo.fullName,
        description: buildRepositoryDescription(repo),
        language: repo.language || "Not specified",
        href: repo.htmlUrl,
        stars: repo.stargazersCount,
        image: readmeImages[0]
          ? {
              url: readmeImages[0],
              alt: `${repo.name} README preview`,
              source: "readme" as const,
            }
          : null,
        readmeImages,
        readmeExcerpt,
      };
    }),
  );

  const techStack = deriveTopLanguages(repos);
  const links = buildLinks(profile);
  const theme = selectTheme(profile, repos, techStack);

  return {
    profile,
    summary: buildSummary(profile, repos, techStack),
    hero: {
      name: profile.name,
      headline: buildHeadline(profile, techStack),
      subheadline: buildHeroSubheadline(profile, featuredRepositories.length, techStack),
      ctaLabel: "View GitHub Profile",
    },
    about: {
      title: "About Me",
      description: buildAbout(profile, repos.length),
    },
    contact: {
      title: "Contact",
      description:
        "Share the clearest way to connect for roles, freelance work, collaborations, or portfolio conversations.",
    },
    linksSection: {
      title: "Links",
      description:
        "Add the professional destinations you want visitors to open next, including your resume, cover letter, LinkedIn, Handshake, and portfolio links.",
    },
    featuredRepositories,
    techStack,
    links,
    theme,
    promptSeed: buildPreviewPromptSeed(profile),
  };
}
