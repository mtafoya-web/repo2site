type ServerLogLevel = "info" | "warn" | "error";

type ServerLogMetadata = Record<string, unknown> | undefined;

function serializeMetadata(metadata: ServerLogMetadata) {
  if (!metadata) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      value instanceof Error
        ? {
            name: value.name,
            message: value.message,
          }
        : value,
    ]),
  );
}

export function logServerEvent(level: ServerLogLevel, message: string, metadata?: ServerLogMetadata) {
  const payload = {
    at: new Date().toISOString(),
    area: "repo2site",
    message,
    metadata: serializeMetadata(metadata),
  };

  const method =
    level === "error" ? console.error : level === "warn" ? console.warn : console.info;

  method(`[repo2site] ${message}`, payload);
}
