import { NextResponse } from "next/server";
import { applyGithubOAuthState, createAuthStateValue, getGitHubOAuthConfig } from "@/lib/auth-session";
import { getSiteOrigin } from "@/lib/site-url";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo")?.trim() || "/builder";
  const config = getGitHubOAuthConfig();

  if (!config) {
    const fallbackUrl = new URL(returnTo, getSiteOrigin());
    fallbackUrl.searchParams.set("authError", "github_not_configured");
    return NextResponse.redirect(fallbackUrl);
  }

  const state = createAuthStateValue(returnTo);
  const callbackUrl = `${getSiteOrigin()}/api/auth/github/callback`;
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizeUrl.searchParams.set("scope", "read:user user:email");
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  applyGithubOAuthState(response, state);
  return response;
}
