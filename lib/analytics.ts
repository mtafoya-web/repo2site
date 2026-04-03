declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

export function trackAnalyticsEvent(
  eventName: string,
  props?: Record<string, string | number | boolean>,
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.plausible?.(eventName, props ? { props } : undefined);
  } catch {
    // Analytics should never interrupt the product flow.
  }
}
