import { Suspense } from "react";
import { AppLoadingShell } from "@/components/app-loading-shell";
import { Repo2SiteShell } from "@/components/repo2site-shell";

export default function BuilderPage() {
  return (
    <Suspense
      fallback={
        <AppLoadingShell
          label="Builder"
          title="Preparing your editing workspace"
          description="Loading the live preview, editor controls, and theme tools so the workspace feels ready before you start changing anything."
        />
      }
    >
      <Repo2SiteShell />
    </Suspense>
  );
}
