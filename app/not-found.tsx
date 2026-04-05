import Link from "next/link";
import { AppStatusPage } from "@/components/app-status-page";

export default function NotFound() {
  return (
    <AppStatusPage
      eyebrow="404"
      title="Page not found."
      description="The page you were looking for is not available. You can head back home and keep building from there."
      action={
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "999px",
            backgroundColor: "#2563eb",
            color: "#fff",
            padding: "0.8rem 1.1rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Back to Home
        </Link>
      }
    />
  );
}
