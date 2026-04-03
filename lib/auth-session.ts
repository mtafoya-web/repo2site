import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isProductionDeployment } from "@/lib/runtime-env";

const AUTH_COOKIE_NAME = "repo2site_session";
const GITHUB_OAUTH_STATE_COOKIE = "repo2site_github_oauth_state";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10;

export type AuthSession = {
  provider: "github";
  accountId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  profileUrl: string;
};

type GitHubUserPayload = {
  id: number;
  login: string;
  name?: string | null;
  avatar_url?: string | null;
  html_url?: string | null;
};

function getAuthSecret() {
  const configured = process.env.REPO2SITE_AUTH_SECRET?.trim();

  if (configured) {
    return configured;
  }

  if (isProductionDeployment()) {
    throw new Error("[repo2site] Missing REPO2SITE_AUTH_SECRET for authenticated production sessions.");
  }

  return "repo2site-dev-auth-secret";
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function buildCookieValue(session: AuthSession) {
  const payload = toBase64Url(JSON.stringify(session));
  return `${payload}.${sign(payload)}`;
}

function parseCookieHeader(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  const cookies = header.split(/;\s*/).filter(Boolean);

  for (const entry of cookies) {
    const separatorIndex = entry.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = entry.slice(0, separatorIndex).trim();
    const value = entry.slice(separatorIndex + 1).trim();

    if (key === name) {
      return decodeURIComponent(value);
    }
  }

  return "";
}

export function getAuthSessionFromRequest(request: Request): AuthSession | null {
  const raw = parseCookieHeader(request, AUTH_COOKIE_NAME);

  if (!raw) {
    return null;
  }

  const [payload, signature] = raw.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = sign(payload);

  try {
    if (
      !timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expectedSignature, "utf8"))
    ) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as AuthSession;

    if (!parsed.accountId || !parsed.username) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function applyAuthSessionToResponse(response: NextResponse, session: AuthSession) {
  response.cookies.set(AUTH_COOKIE_NAME, buildCookieValue(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionDeployment(),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearAuthSessionFromResponse(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionDeployment(),
    path: "/",
    maxAge: 0,
  });
}

export function applyGithubOAuthState(response: NextResponse, state: string) {
  response.cookies.set(GITHUB_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionDeployment(),
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  });
}

export function readGithubOAuthStateFromRequest(request: Request) {
  return parseCookieHeader(request, GITHUB_OAUTH_STATE_COOKIE);
}

export function clearGithubOAuthState(response: NextResponse) {
  response.cookies.set(GITHUB_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionDeployment(),
    path: "/",
    maxAge: 0,
  });
}

export function getGitHubOAuthConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    if (isProductionDeployment()) {
      throw new Error(
        "[repo2site] Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET for GitHub authentication.",
      );
    }

    return null;
  }

  return {
    clientId,
    clientSecret,
  };
}

export function buildAuthSessionFromGitHubUser(user: GitHubUserPayload): AuthSession {
  return {
    provider: "github",
    accountId: `github:${String(user.id)}`,
    username: user.login.trim().toLowerCase(),
    displayName: user.name?.trim() || user.login.trim(),
    avatarUrl: user.avatar_url?.trim() || "",
    profileUrl: user.html_url?.trim() || `https://github.com/${user.login.trim()}`,
  };
}

export async function exchangeGitHubCodeForSession(code: string, redirectUri: string) {
  const config = getGitHubOAuthConfig();

  if (!config) {
    throw new Error("GitHub authentication is not configured.");
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    throw new Error(`GitHub token exchange failed with status ${tokenResponse.status}.`);
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenPayload.access_token) {
    throw new Error(tokenPayload.error_description || tokenPayload.error || "GitHub token exchange failed.");
  }

  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${tokenPayload.access_token}`,
      "User-Agent": "repo2site-auth",
    },
    cache: "no-store",
  });

  if (!userResponse.ok) {
    throw new Error(`GitHub user lookup failed with status ${userResponse.status}.`);
  }

  const user = (await userResponse.json()) as GitHubUserPayload;
  return buildAuthSessionFromGitHubUser(user);
}

export function createAuthStateValue(returnTo: string) {
  return toBase64Url(
    JSON.stringify({
      nonce: crypto.randomUUID(),
      returnTo,
    }),
  );
}

export function parseAuthStateValue(state: string) {
  try {
    const parsed = JSON.parse(fromBase64Url(state)) as { nonce?: string; returnTo?: string };

    return {
      nonce: parsed.nonce?.trim() || "",
      returnTo:
        parsed.returnTo?.startsWith("/") && !parsed.returnTo.startsWith("//")
          ? parsed.returnTo
          : "/builder",
    };
  } catch {
    return null;
  }
}

export function buildSignedInAuthSummary(session: AuthSession | null) {
  if (!session) {
    return null;
  }

  return {
    provider: session.provider,
    username: session.username,
    displayName: session.displayName,
    avatarUrl: session.avatarUrl,
    profileUrl: session.profileUrl,
  };
}

export function createAuthCookieHeaderForSession(session: AuthSession) {
  return `${AUTH_COOKIE_NAME}=${encodeURIComponent(buildCookieValue(session))}`;
}
