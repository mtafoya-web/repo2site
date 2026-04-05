import type { ReactNode } from "react";

type AppStatusPageProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function AppStatusPage({
  eyebrow = "Repo2Site",
  title,
  description,
  action,
}: AppStatusPageProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "1rem",
        backgroundColor: "#f5f7fb",
        color: "#0f172a",
        fontFamily: "var(--font-sans), Segoe UI, sans-serif",
      }}
    >
      <div
        style={{
          width: "min(32rem, calc(100vw - 2rem))",
          padding: "2rem",
          borderRadius: "1.25rem",
          border: "1px solid rgba(148,163,184,0.25)",
          backgroundColor: "#ffffff",
          boxShadow: "0 24px 60px -40px rgba(15,23,42,0.35)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          {eyebrow}
        </p>
        <h1 style={{ margin: "0.75rem 0 0", fontSize: "1.75rem", lineHeight: 1.1 }}>{title}</h1>
        <p
          style={{
            margin: "0.75rem 0 0",
            fontSize: "0.95rem",
            lineHeight: 1.7,
            color: "#475569",
          }}
        >
          {description}
        </p>
        {action ? <div style={{ marginTop: "1.25rem" }}>{action}</div> : null}
      </div>
    </div>
  );
}
