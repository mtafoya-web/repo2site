import { buildPreviewPromptSeed } from "@/lib/prompt";
import { PORTFOLIO_THEMES } from "@/lib/themes";
import {
  deriveTopLanguages,
  fetchGitHubProfile,
  fetchGitHubRepos,
  fetchRepositoryReadmeExcerpt,
  fetchRepositoryReadmeImages,
  parseGitHubProfileUrl,
} from "@/lib/github";
import type { GeneratePreviewResponse, GitHubProfileInfo, GitHubRepo, PreviewLink } from "@/lib/types";

export class PortfolioPreviewService {
  async generateFromProfileUrl(profileUrl: string): Promise<GeneratePreviewResponse> {
    const parsedProfile = parseGitHubProfileUrl(profileUrl);
    const [profile, repos] = await Promise.all([
      fetchGitHubProfile(parsedProfile.username),
      fetchGitHubRepos(parsedProfile.username),
    ]);

    const featuredRepositoryCandidates = this.selectFeaturedRepositories(repos);
    const featuredRepositories = await Promise.all(
      featuredRepositoryCandidates.map(async (repo) => {
        const [readmeImages, readmeExcerpt] = await Promise.all([
          fetchRepositoryReadmeImages(repo),
          fetchRepositoryReadmeExcerpt(repo),
        ]);

        return {
          name: repo.fullName,
          description: this.buildRepositoryDescription(repo),
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
    const links = this.buildLinks(profile);
    const theme = this.selectTheme(profile, repos, techStack);

    return {
      profile,
      summary: this.buildSummary(profile, repos, techStack),
      hero: {
        name: profile.name,
        headline: this.buildHeadline(profile, techStack),
        subheadline: this.buildHeroSubheadline(profile, featuredRepositories.length, techStack),
        ctaLabel: "View GitHub Profile",
      },
      about: {
        title: "About Me",
        description: this.buildAbout(profile, repos.length),
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

  private scoreRepository(repo: GitHubRepo) {
    let score = repo.stargazersCount * 12 + repo.forksCount * 4;

    if (repo.description) score += 18;
    if (repo.homepage) score += 8;
    if (repo.language) score += 8;

    score += Math.min(repo.topics.length, 4) * 3;

    if (!repo.isFork) score += 14;
    if (!repo.isArchived) score += 6;

    return score;
  }

  private selectFeaturedRepositories(repos: GitHubRepo[]) {
    const ranked = repos
      .filter((repo) => !repo.isArchived)
      .sort((left, right) => this.scoreRepository(right) - this.scoreRepository(left));

    const preferred = ranked.filter(
      (repo) => !repo.isFork && (repo.description || repo.stargazersCount > 0 || repo.homepage),
    );

    const pool = preferred.length > 0 ? preferred : ranked;
    const targetCount = pool.length >= 3 ? Math.min(6, pool.length) : pool.length;

    return pool.slice(0, targetCount);
  }

  private joinNaturalList(values: string[]) {
    if (values.length === 0) return "";
    if (values.length === 1) return values[0];
    if (values.length === 2) return `${values[0]} and ${values[1]}`;
    return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
  }

  private buildHeadline(profile: GitHubProfileInfo, topLanguages: string[]) {
    if (profile.bio) {
      return profile.bio;
    }

    if (topLanguages.length > 0) {
      return `Software projects grounded in ${this.joinNaturalList(topLanguages.slice(0, 3))}.`;
    }

    return "Public projects, experiments, and developer tools built from real GitHub work.";
  }

  private buildSummary(profile: GitHubProfileInfo, repos: GitHubRepo[], topLanguages: string[]) {
    const activeRepositories = repos.filter((repo) => !repo.isArchived);
    const repoHighlights = activeRepositories
      .filter((repo) => repo.description || repo.homepage || repo.stargazersCount > 0)
      .slice(0, 3)
      .map((repo) => repo.name);
    const highlights = [
      topLanguages.length > 0 ? `focused most often on ${this.joinNaturalList(topLanguages.slice(0, 4))}` : "",
      profile.company ? `shaped by work connected to ${profile.company}` : "",
      profile.location ? `based in ${profile.location}` : "",
    ].filter(Boolean);

    if (profile.bio && highlights.length > 0) {
      return `${profile.bio} The portfolio draft reflects ${this.joinNaturalList(highlights)}${repoHighlights.length > 0 ? `, with selected work such as ${this.joinNaturalList(repoHighlights)}` : ""}.`;
    }

    if (profile.bio) {
      return profile.bio;
    }

    if (highlights.length > 0) {
      return `A portfolio draft shaped by ${this.joinNaturalList(highlights)}${repoHighlights.length > 0 ? ` and selected work such as ${this.joinNaturalList(repoHighlights)}` : ""}.`;
    }

    return "A portfolio draft built from public GitHub projects, experiments, and repository context.";
  }

  private buildHeroSubheadline(
    profile: GitHubProfileInfo,
    featuredRepositoryCount: number,
    topLanguages: string[],
  ) {
    const languageSummary =
      topLanguages.length > 0 ? `with a focus on ${this.joinNaturalList(topLanguages.slice(0, 3))}` : "";

    if (featuredRepositoryCount > 0) {
      return `Built from ${featuredRepositoryCount} featured repositories drawn from recent public GitHub work ${languageSummary}. This draft starts from real code, repository context, and README signals instead of placeholder portfolio copy.`.trim();
    }

    if (profile.bio) {
      return `Grounded in public profile details and repository activity ${languageSummary}. The starting point comes directly from work already visible on GitHub.`.trim();
    }

    return `This portfolio starts from public GitHub work ${languageSummary}. Adding a resume or professional links helps turn the draft into a stronger career story.`.trim();
  }

  private buildAbout(profile: GitHubProfileInfo, repoCount: number) {
    const parts = [profile.bio || "Public GitHub work and repository history are shaping this portfolio draft."];

    if (profile.company) parts.push(`Current work is connected to ${profile.company}.`);
    if (profile.location) parts.push(`Based in ${profile.location}.`);
    if (repoCount > 0) {
      parts.push("Selected repositories and README content are being used to shape the project story and technical focus.");
    }

    return parts.join(" ");
  }

  private buildLinks(profile: GitHubProfileInfo) {
    const links: PreviewLink[] = [{ label: "GitHub", href: profile.url }];

    if (profile.blog) {
      const href = /^https?:\/\//i.test(profile.blog) ? profile.blog : `https://${profile.blog}`;
      links.push({ label: "Website", href });
    }

    return links;
  }

  private buildRepositoryDescription(repo: GitHubRepo) {
    if (repo.description) {
      return repo.description;
    }

    const repoSignals = [repo.language, ...repo.topics.slice(0, 2)].filter(Boolean);

    if (repoSignals.length > 0) {
      return `Built in ${this.joinNaturalList(repoSignals)} and selected as part of this portfolio preview.`;
    }

    return "Selected from public GitHub work and ready to be expanded with README context, portfolio edits, or AI suggestions.";
  }

  private selectTheme(profile: GitHubProfileInfo, repos: GitHubRepo[], topLanguages: string[]) {
    const primaryLanguage = topLanguages[0] || "";
    const activeRepoCount = repos.filter((repo) => !repo.isArchived).length;
    const hasCreativeSignals = ["HTML", "CSS", "MDX"].includes(primaryLanguage) || Boolean(profile.blog);
    const hasSystemsSignals = ["Rust", "Go", "C", "C++", "Zig"].includes(primaryLanguage);
    const hasHighActivitySignals = profile.followers >= 200 || activeRepoCount >= 40;

    if (hasCreativeSignals) return PORTFOLIO_THEMES[2];
    if (hasSystemsSignals) return PORTFOLIO_THEMES[1];
    if (hasHighActivitySignals) return PORTFOLIO_THEMES[3];

    return PORTFOLIO_THEMES[0];
  }
}

export const portfolioPreviewService = new PortfolioPreviewService();
