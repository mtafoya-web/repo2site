type MonitoringContext = {
  area: string;
  action?: string;
  message?: string;
  metadata?: Record<string, unknown>;
};

type ClientErrorPayload = {
  message: string;
  stack?: string;
  name?: string;
  componentStack?: string;
  pathname?: string;
  metadata?: Record<string, unknown>;
};

function getSentryDsn() {
  return process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || "";
}

function parseSentryDsn(dsn: string) {
  const parsed = new URL(dsn);
  const publicKey = parsed.username;
  const host = parsed.host;
  const pathSegments = parsed.pathname.split("/").filter(Boolean);
  const projectId = pathSegments[pathSegments.length - 1];
  const pathPrefix =
    pathSegments.length > 1 ? `/${pathSegments.slice(0, -1).join("/")}` : "";

  if (!publicKey || !projectId) {
    return null;
  }

  return {
    publicKey,
    host,
    projectId,
    pathPrefix,
  };
}

async function sendSentryEvent(event: Record<string, unknown>) {
  const dsn = getSentryDsn();

  if (!dsn) {
    return;
  }

  const parsedDsn = parseSentryDsn(dsn);

  if (!parsedDsn) {
    return;
  }

  const endpoint = `https://${parsedDsn.host}${parsedDsn.pathPrefix}/api/${parsedDsn.projectId}/envelope/`;
  const eventId = crypto.randomUUID().replace(/-/g, "");
  const envelope = [
    JSON.stringify({
      event_id: eventId,
      sent_at: new Date().toISOString(),
      dsn,
      sdk: {
        name: "repo2site-monitoring",
        version: "1.0.0",
      },
    }),
    JSON.stringify({ type: "event" }),
    JSON.stringify({
      event_id: eventId,
      platform: "javascript",
      environment: process.env.NODE_ENV || "development",
      release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
      timestamp: Math.floor(Date.now() / 1000),
      ...event,
    }),
  ].join("\n");

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parsedDsn.publicKey}`,
      },
      body: envelope,
      cache: "no-store",
    });
  } catch {
    // Monitoring should never interrupt the app flow.
  }
}

export async function captureServerException(error: unknown, context: MonitoringContext) {
  const message =
    error instanceof Error ? error.message : context.message || "Unexpected server-side error";
  const stack = error instanceof Error ? error.stack : undefined;
  const errorName = error instanceof Error ? error.name : "ServerError";

  await sendSentryEvent({
    level: "error",
    message,
    tags: {
      area: context.area,
      action: context.action || "unknown",
      runtime: "server",
    },
    extra: {
      metadata: context.metadata,
      stack,
    },
    exception: {
      values: [
        {
          type: errorName,
          value: message,
          stacktrace: stack ? { frames: [] } : undefined,
        },
      ],
    },
  });
}

export async function captureClientError(payload: ClientErrorPayload) {
  await sendSentryEvent({
    level: "error",
    message: payload.message,
    tags: {
      area: "client",
      runtime: "browser-forwarded",
    },
    extra: {
      pathname: payload.pathname,
      componentStack: payload.componentStack,
      metadata: payload.metadata,
      stack: payload.stack,
    },
    exception: {
      values: [
        {
          type: payload.name || "ClientError",
          value: payload.message,
        },
      ],
    },
  });
}

export async function reportClientError(payload: ClientErrorPayload) {
  try {
    await fetch("/api/monitoring/client-error", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Client reporting should never block UI interactions.
  }
}
