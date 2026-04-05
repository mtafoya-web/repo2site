import { Suspense } from "react";
import { Repo2SiteTemplateGallery } from "@/components/repo2site-template-gallery";

export default function TemplatesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] bg-[#09111f] px-4 py-10 text-center text-sm text-slate-300">
          Loading templates...
        </div>
      }
    >
      <Repo2SiteTemplateGallery />
    </Suspense>
  );
}
