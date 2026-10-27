// ---------------------------------------------------------------------------
// Tipos e helpers de autenticação (sem estado).
// O estado da sessão vive em AuthService (src/app/services/auth.service.ts).
// ---------------------------------------------------------------------------

import type { PapelComunidade } from "./comunidade-types";

export type UserRole = "ADMIN" | "GOM" | "JOINER";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  nome: string;
  role: UserRole;
  avatarUrl?: string;
  telefone?: string;
  faves?: string;
  wishlistUrl?: string;
  // Só para role GOM — dona ou admin da comunidade
  /** Conta da GOM dona da comunidade (escopo dos dados). Igual a `id` para a dona. */
  gomId?: string;
  comunidadeId?: string;
  comunidadeNome?: string;
  papel?: PapelComunidade;
}

export interface OnboardingData {
  nome: string;
  username: string;
  avatarUrl?: string;
}

// Estados possíveis da sessão
export type AuthStatus = "loading" | "unauthenticated" | "authenticated";

/** Retorna o path do dashboard raiz para cada role. */
export function dashboardForRole(role: UserRole): string {
  const map: Record<UserRole, string> = {
    ADMIN: "/admin",
    GOM: "/gom",
    JOINER: "/joiner",
  };
  return map[role];
}

/** Validação básica de e-mail. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Calcula a força da senha (0–4). */
export function getPasswordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ["muito fraca", "fraca", "média", "forte", "muito forte"];
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score] };
}

export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
