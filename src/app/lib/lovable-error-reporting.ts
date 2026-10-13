type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "angular_error_handler";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
  }
}

export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(
    error,
    {
      source: "angular_error_handler",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "angular_error_handler",
      handled: false,
      severity: "error",
    },
  );
}
