"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/monitoring";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportClientError({
      message: error.message,
      name: error.name,
      stack: error.stack,
      pathname: typeof window !== "undefined" ? window.location.pathname : "",
      metadata: {
        digest: error.digest,
        source: "global-error-boundary",
      },
    });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5f7fb", color: "#0f172a", fontFamily: "var(--font-sans), Segoe UI, sans-serif" }}>
        <div style={{ width: "min(32rem, calc(100vw - 2rem))", padding: "2rem", borderRadius: "1.25rem", border: "1px solid rgba(148,163,184,0.25)", background: "#ffffff", boxShadow: "0 24px 60px -40px rgba(15,23,42,0.35)" }}>
          <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#64748b" }}>
            Repo2Site
          </p>
          <h1 style={{ margin: "0.75rem 0 0", fontSize: "1.75rem", lineHeight: 1.1 }}>
            Something went wrong.
          </h1>
          <p style={{ margin: "0.75rem 0 0", fontSize: "0.95rem", lineHeight: 1.7, color: "#475569" }}>
            The error has been captured for review. You can try loading the page again without losing the overall app setup.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ marginTop: "1.25rem", border: "none", borderRadius: "999px", background: "#2563eb", color: "#fff", padding: "0.8rem 1.1rem", fontWeight: 600, cursor: "pointer" }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
