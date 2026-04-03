import { NextResponse } from "next/server";
import {
  applyAuthSessionToResponse,
  clearGithubOAuthState,
  exchangeGitHubCodeForSession,
  parseAuthStateValue,
  readGithubOAuthStateFromRequest,
} from "@/lib/auth-session";
import { captureServerException } from "@/lib/monitoring";
import { getSiteOrigin } from "@/lib/site-url";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim() || "";
  const state = url.searchParams.get("state")?.trim() || "";
  const storedState = readGithubOAuthStateFromRequest(request);

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/builder?authError=invalid_state", getSiteOrigin()));
  }

  const parsedState = parseAuthStateValue(state);

  if (!parsedState) {
    return NextResponse.redirect(new URL("/builder?authError=invalid_state", getSiteOrigin()));
  }

  try {
    const session = await exchangeGitHubCodeForSession(
      code,
      `${getSiteOrigin()}/api/auth/github/callback`,
    );
    const response = NextResponse.redirect(new URL(parsedState.returnTo, getSiteOrigin()));
    applyAuthSessionToResponse(response, session);
    clearGithubOAuthState(response);
    return response;
  } catch (error) {
    await captureServerException(error, {
      area: "auth",
      action: "github-callback",
      metadata: {
        returnTo: parsedState.returnTo,
      },
    });

    return NextResponse.redirect(new URL("/builder?authError=github_sign_in_failed", getSiteOrigin()));
  }
}
