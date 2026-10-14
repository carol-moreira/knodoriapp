import type { UserStatus } from "@/lib/admin-types";
import type { UserRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Metadados de exibição
// ---------------------------------------------------------------------------

export const ROLE_META: Record<UserRole, { label: string; badge: string }> = {
  ADMIN: { label: "admin", badge: "bg-purple-50 text-purple-700 ring-1 ring-purple-200" },
  GOM: { label: "GOM", badge: "bg-primary/10 text-primary ring-1 ring-primary/30" },
  JOINER: { label: "joiner", badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
};

export const STATUS_META: Record<UserStatus, { label: string; badge: string }> = {
  ATIVO: { label: "ativo", badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  SUSPENSO: { label: "suspenso", badge: "bg-red-50 text-red-700 ring-1 ring-red-200" },
};

export const ROLE_OPTIONS: UserRole[] = ["JOINER", "GOM", "ADMIN"];

export interface PendingRoleChange {
  userId: string;
  userName: string;
  currentRole: UserRole;
  newRole: UserRole;
}

export interface UserEdit {
  id: string;
  dados: { nome: string; email: string };
}

export const DIALOG_OVERLAY_CLS =
  "fixed inset-0 z-40 bg-black/30 backdrop-blur-sm animate-in fade-in duration-150";

export const DIALOG_CONTENT_CLS =
  "fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 cozy-card p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-150";

export function iniciais(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}
