import { NextResponse } from "next/server";
import { fetchGitHubRepos, isGitHubApiError, parseGitHubProfileUrl } from "@/lib/github";
import { captureServerException } from "@/lib/monitoring";
import { buildRepositorySelectionResponse } from "@/lib/preview-generator";

export async function POST(request: Request) {
  const body = (await request.json()) as { profileUrl?: string };
  const profileUrl = body.profileUrl?.trim() ?? "";

  if (!profileUrl) {
    return NextResponse.json(
      { error: "Please enter a valid public GitHub profile URL." },
      { status: 400 },
    );
  }

  let parsedProfile;

  try {
    parsedProfile = parseGitHubProfileUrl(profileUrl);
  } catch {
    return NextResponse.json(
      { error: "Please enter a valid public GitHub profile URL." },
      { status: 400 },
    );
  }

  try {
    const repos = await fetchGitHubRepos(parsedProfile.username);
    return NextResponse.json(buildRepositorySelectionResponse(repos));
  } catch (error) {
    if (isGitHubApiError(error)) {
      const status = error.status === 404 ? 404 : error.status >= 500 ? 502 : error.status;

      if (status >= 500) {
        await captureServerException(error, {
          area: "github-generate",
          action: "fetch-github-repositories",
          metadata: {
            profileUrl,
            username: parsedProfile?.username ?? "",
          },
        });
      }

      return NextResponse.json({ error: error.message }, { status });
    }

    await captureServerException(error, {
      area: "github-generate",
      action: "unexpected-repository-selection-error",
      metadata: {
        profileUrl,
        username: parsedProfile?.username ?? "",
      },
    });

    return NextResponse.json(
      { error: "Something went wrong while fetching GitHub repositories. Please try again." },
      { status: 502 },
    );
  }
}
