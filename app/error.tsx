"use client";

import { useEffect } from "react";
import { AppStatusPage } from "@/components/app-status-page";
import { reportClientError } from "@/lib/monitoring";

export default function AppError({
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
        source: "app-error-boundary",
      },
    });
  }, [error]);

  return (
    <AppStatusPage
      title="Something went wrong."
      description="We hit a problem loading this page. The error has been logged, and you can try again."
      action={
        <button
          type="button"
          onClick={() => reset()}
          style={{
            border: "none",
            borderRadius: "999px",
            backgroundColor: "#2563eb",
            color: "#fff",
            padding: "0.8rem 1.1rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      }
    />
  );
}
