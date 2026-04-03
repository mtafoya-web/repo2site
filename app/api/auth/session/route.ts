import { NextResponse } from "next/server";
import {
  buildSignedInAuthSummary,
  clearAuthSessionFromResponse,
  getAuthSessionFromRequest,
} from "@/lib/auth-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = getAuthSessionFromRequest(request);
  return NextResponse.json({ session: buildSignedInAuthSummary(session) });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearAuthSessionFromResponse(response);
  return response;
}
