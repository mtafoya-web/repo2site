import { expect, test } from "@playwright/test";
import { createAuthCookieHeaderForSession, type AuthSession } from "@/lib/auth-session";

function createBuilderAuthSession(): AuthSession {
  return {
    provider: "github",
    accountId: "github:4242",
    username: "playwright-user",
    displayName: "Playwright User",
    avatarUrl: "",
    profileUrl: "https://github.com/playwright-user",
  };
}

test("landing page explains the product and links into the builder", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Turn GitHub work into a polished portfolio")).toBeVisible();
  await expect(page.getByRole("link", { name: /open builder/i })).toBeVisible();
});

test("builder page renders its primary controls", async ({ page }) => {
  await page.goto("/builder");

  await expect(page.getByRole("button", { name: /open editor/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /share portfolio/i })).toBeVisible();
});

test("templates gallery renders curated sections", async ({ page }) => {
  await page.goto("/templates");

  await expect(page.getByText("Browse portfolio templates built by the Repo2Site community.")).toBeVisible();
  await expect(page.getByText("Starter templates")).toBeVisible();
});

test("public share pages render as clean standalone portfolios", async ({ page, request, baseURL }) => {
  const cookieHeader = createAuthCookieHeaderForSession(createBuilderAuthSession());
  const shareResponse = await request.post(`${baseURL}/api/share`, {
    headers: {
      Cookie: cookieHeader,
    },
    data: {
      preview: {
        profile: {
          username: "playwright-user",
          url: "https://github.com/playwright-user",
          name: "Playwright User",
          bio: "Testing public portfolio rendering.",
          avatarUrl: "",
          location: "Los Angeles, CA",
          company: "Repo2Site",
          blog: "https://example.com",
          followers: 1,
          following: 1,
          publicRepos: 1,
        },
        summary: "Smoke test summary",
        hero: {
          name: "Playwright User",
          headline: "Builder-generated public portfolio",
          subheadline: "A public share smoke test for Repo2Site.",
          ctaLabel: "View GitHub Profile",
        },
        about: {
          title: "About Me",
          description: "Testing the public portfolio route.",
        },
        contact: {
          title: "Contact",
          description: "Reach out any time.",
        },
        linksSection: {
          title: "Links",
          description: "Useful places to learn more.",
        },
        featuredRepositories: [
          {
            name: "repo2site-smoke",
            description: "Test project",
            language: "TypeScript",
            href: "https://github.com/playwright-user/repo2site-smoke",
            stars: 1,
            image: null,
            readmeImages: [],
            readmeExcerpt: "Smoke test repository",
          },
        ],
        techStack: ["TypeScript", "Next.js"],
        links: [{ label: "GitHub", href: "https://github.com/playwright-user" }],
        theme: {
          id: "builder-blue",
          name: "Builder Blue",
          reason: "Playwright smoke test theme",
          palette: {
            page: "#f6f8fc",
            pageAccent: "rgba(96, 165, 250, 0.16)",
            surface: "rgba(255,255,255,0.88)",
            surfaceStrong: "#ffffff",
            border: "rgba(148, 163, 184, 0.28)",
            text: "#0f172a",
            muted: "#475569",
            accent: "#2563eb",
            accentSoft: "rgba(37, 99, 235, 0.12)",
            chip: "#e0ecff",
          },
        },
        promptSeed: "Playwright smoke test",
      },
      overrides: {
        hero: {
          imageUrl: "",
          headline: "",
          headlineSuggestion: "",
          subheadline: "",
          subheadlineSuggestion: "",
        },
        about: {
          title: "",
          description: "",
        },
        aboutSuggestion: "",
        contact: {
          title: "",
          description: "",
          descriptionSuggestion: "",
          customText: "",
          email: "",
          phone: "",
        },
        professional: {
          title: "Career / Professional Info",
          titleSuggestion: "",
          summary: "",
          summarySuggestion: "",
          company: "",
          location: "",
          availability: "",
          ctaLabels: {
            resume: "Resume",
            coverLetter: "Cover Letter",
            handshake: "Handshake",
            linkedIn: "LinkedIn",
            portfolio: "Website",
            email: "Email",
            phone: "Phone",
          },
        },
        linksSection: {
          title: "",
          description: "",
          descriptionSuggestion: "",
          linkedIn: "",
          resumeUrl: "",
          coverLetterUrl: "",
          handshakeUrl: "",
          portfolioUrl: "",
          customLinks: [],
        },
        documents: {
          resumeAssetUrl: "",
          resumeFileName: "",
          coverLetterAssetUrl: "",
          coverLetterFileName: "",
        },
        projectOverrides: {},
        layout: {
          sectionOrder: ["hero", "about", "professional", "projects", "links", "contact"],
          hiddenSections: [],
          projectOrder: [],
          components: [
            { id: "hero", type: "hero", visible: true },
            { id: "about", type: "about", visible: true },
            { id: "professional", type: "professional", visible: true },
            { id: "projects", type: "projects", visible: true },
            { id: "links", type: "links", visible: true },
            { id: "contact", type: "contact", visible: true },
          ],
          componentOrder: {},
          hiddenComponentIds: [],
        },
        appearance: {
          themeId: "builder-blue",
          colorMode: "dark",
          density: "compact",
          sectionLayout: "split",
          cardStyle: "soft",
        },
        aiAccepted: {
          heroHeadline: false,
          heroSubheadline: false,
          aboutDescription: false,
          contactDescription: false,
          professionalTitle: false,
          professionalSummary: false,
          linksDescription: false,
          projectDescriptions: {},
        },
      },
      slug: `playwright-share-${Date.now()}`,
    },
  });

  expect(shareResponse.ok()).toBeTruthy();
  const share = (await shareResponse.json()) as { path: string };

  await page.goto(share.path);

  await expect(page.getByText("Builder-generated public portfolio")).toBeVisible();
  await expect(page.getByText("Built with Repo2Site")).toBeVisible();
});
