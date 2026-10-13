// Classes compartilhadas pelos formulários de login e cadastro.

export const labelCls = "block text-xs font-semibold text-muted-foreground";

export const inputCls = (hasError: boolean) =>
  `w-full rounded-2xl border bg-background py-3.5 px-4 text-sm outline-none transition focus:ring-2 ${
    hasError
      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
      : "border-border focus:border-primary focus:ring-primary/20"
  }`;
