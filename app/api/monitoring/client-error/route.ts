import { NextResponse } from "next/server";
import { captureClientError } from "@/lib/monitoring";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: string;
      stack?: string;
      name?: string;
      componentStack?: string;
      pathname?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.message?.trim()) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await captureClientError({
      message: body.message,
      stack: body.stack,
      name: body.name,
      componentStack: body.componentStack,
      pathname: body.pathname,
      metadata: body.metadata,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
