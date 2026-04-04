import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import { POST as enhancePost } from "@/app/api/enhance/route";
import { POST as enrichPost } from "@/app/api/enrich/route";
import { POST as exportPost } from "@/app/api/export/route";
import { POST as generatePost } from "@/app/api/generate/route";
import { GET as shareGet, POST as sharePost } from "@/app/api/share/route";
import { POST as templateReactionPost } from "@/app/api/templates/[slug]/reaction/route";
import { POST as templatePost } from "@/app/api/templates/route";
import { createAuthCookieHeaderForSession, type AuthSession } from "@/lib/auth-session";
import { createSampleOverrides, createSamplePreview } from "@/tests/fixtures/sample-preview";

const dataDir = path.join(process.cwd(), ".repo2site-data");

async function jsonBody(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

function createAuthenticatedHeaders() {
  const session: AuthSession = {
    provider: "github",
    accountId: "github:999",
    username: "janedoe",
    displayName: "Jane Doe",
    avatarUrl: "https://avatars.githubusercontent.com/u/999?v=4",
    profileUrl: "https://github.com/janedoe",
  };

  return {
    "Content-Type": "application/json",
    Cookie: createAuthCookieHeaderForSession(session),
  };
}

beforeEach(() => {
  delete process.env.VERCEL_ENV;
  delete process.env.REPO2SITE_RUNTIME_ENV;
  delete process.env.REPO2SITE_SHARE_BACKEND;
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

describe("core API routes", () => {
  test("GitHub generate rejects an empty profile URL", async () => {
    const response = await generatePost(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileUrl: "" }),
      }),
    );

    assert.equal(response.status, 400);
    assert.match(String((await jsonBody(response)).error), /valid public github profile url/i);
  });

  test("resume/profile enrichment rejects empty input", async () => {
    const response = await enrichPost(
      new Request("http://localhost/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [] }),
      }),
    );

    assert.equal(response.status, 400);
    assert.match(String((await jsonBody(response)).error), /add at least one public url/i);
  });

  test("AI enhancement rejects missing draft input", async () => {
    const response = await enhancePost(
      new Request("http://localhost/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    assert.equal(response.status, 400);
    assert.match(String((await jsonBody(response)).error), /missing portfolio draft/i);
  });

  test("export builds a deployable zip from a valid preview", async () => {
    const response = await exportPost(
      new Request("http://localhost/api/export", {
        method: "POST",
        headers: createAuthenticatedHeaders(),
        body: JSON.stringify({
          preview: createSamplePreview(),
          overrides: createSampleOverrides(),
        }),
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "application/zip");
    assert.match(response.headers.get("X-Exported-Files") || "", /index\.html/);
  });

  test("export also accepts form submission for browser-native downloads", async () => {
    const formData = new FormData();
    formData.set("preview", JSON.stringify(createSamplePreview()));
    formData.set("overrides", JSON.stringify(createSampleOverrides()));

    const response = await exportPost(
      new Request("http://localhost/api/export", {
        method: "POST",
        body: formData,
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "application/zip");
    assert.match(response.headers.get("Content-Disposition") || "", /\.zip/i);
  });

  test("share publishing creates a stable public path and availability check", async () => {
    const slug = `share-${Date.now()}`;
    const publishResponse = await sharePost(
      new Request("http://localhost/api/share", {
        method: "POST",
        headers: createAuthenticatedHeaders(),
        body: JSON.stringify({
          preview: createSamplePreview(),
          overrides: createSampleOverrides(),
          slug,
        }),
      }),
    );

    assert.equal(publishResponse.status, 200);
    const publishBody = await jsonBody(publishResponse);
    assert.equal(publishBody.slug, slug);
    assert.equal(publishBody.path, `/u/${slug}`);

    const availabilityResponse = await shareGet(
      new Request(`http://localhost/api/share?slug=${slug}`, {
        method: "GET",
      }),
    );
    const availabilityBody = await jsonBody(availabilityResponse);

    assert.equal(availabilityResponse.status, 200);
    assert.equal(availabilityBody.available, false);
    assert.equal(availabilityBody.reason, "taken");
  });

  test("template publish and reactions persist through the template routes", async () => {
    const publishResponse = await templatePost(
      new Request("http://localhost/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preview: createSamplePreview(),
          overrides: createSampleOverrides(),
          title: `Template ${Date.now()}`,
          description: "A production-readiness test template.",
          category: "engineering",
          tags: ["typescript", "nextjs"],
        }),
      }),
    );

    assert.equal(publishResponse.status, 200);
    const publishedBody = (await publishResponse.json()) as {
      template: {
        slug: string;
      };
    };

    const slug = publishedBody.template.slug;

    const likeResponse = await templateReactionPost(
      new Request(`http://localhost/api/templates/${slug}/reaction`, {
        method: "POST",
        headers: createAuthenticatedHeaders(),
        body: JSON.stringify({
          reaction: "like",
        }),
      }),
      {
        params: Promise.resolve({ slug }),
      },
    );

    assert.equal(likeResponse.status, 200);
    const likedBody = (await likeResponse.json()) as {
      template: {
        likes: number;
        dislikes: number;
        viewerReaction: "like" | "dislike" | null;
      };
    };
    assert.equal(likedBody.template.likes, 1);
    assert.equal(likedBody.template.dislikes, 0);
    assert.equal(likedBody.template.viewerReaction, "like");

    const dislikeResponse = await templateReactionPost(
      new Request(`http://localhost/api/templates/${slug}/reaction`, {
        method: "POST",
        headers: createAuthenticatedHeaders(),
        body: JSON.stringify({
          reaction: "dislike",
        }),
      }),
      {
        params: Promise.resolve({ slug }),
      },
    );

    assert.equal(dislikeResponse.status, 200);
    const dislikedBody = (await dislikeResponse.json()) as {
      template: {
        likes: number;
        dislikes: number;
        viewerReaction: "like" | "dislike" | null;
      };
    };
    assert.equal(dislikedBody.template.likes, 0);
    assert.equal(dislikedBody.template.dislikes, 1);
    assert.equal(dislikedBody.template.viewerReaction, "dislike");
  });
});
