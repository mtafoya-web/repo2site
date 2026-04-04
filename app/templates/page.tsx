import { Suspense } from "react";
import { AppLoadingShell } from "@/components/app-loading-shell";
import { Repo2SiteTemplateGallery } from "@/components/repo2site-template-gallery";

export default function TemplatesPage() {
  return (
    <Suspense
      fallback={
        <AppLoadingShell
          label="Templates"
          title="Loading the template gallery"
          description="Fetching curated layouts, preview snapshots, and remix actions so browsing feels smooth instead of abrupt."
        />
      }
    >
      <Repo2SiteTemplateGallery />
    </Suspense>
  );
}
