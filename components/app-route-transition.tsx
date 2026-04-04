"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function AppRouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="app-route-stage animate-route-enter">
      {children}
    </div>
  );
}
