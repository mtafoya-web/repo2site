import { Suspense } from "react";
import { Repo2SiteShell } from "@/components/repo2site-shell";

export default function BuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] bg-[#09111f] px-4 py-10 text-center text-sm text-slate-300">
          Loading builder...
        </div>
      }
    >
      <Repo2SiteShell />
    </Suspense>
  );
}
