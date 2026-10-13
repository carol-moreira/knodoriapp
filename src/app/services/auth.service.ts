import { Injectable, computed, signal } from "@angular/core";
import {
  delay,
  type AuthStatus,
  type AuthUser,
  type OnboardingData,
  type UserRole,
} from "@/lib/auth";

// ---------------------------------------------------------------------------
// Mocks de usuários para desenvolvimento
// 🔌 Remover quando integrar com provedor real (ver lib/auth-providers.ts)
// ---------------------------------------------------------------------------

const MOCK_EXISTING_USER: AuthUser = {
  id: "usr_gom_01",
  email: "gom@knodori.app",
  username: "@knodori_gom",
  nome: "Knodori",
  role: "GOM",
  avatarUrl: undefined,
};

const MOCK_GOOGLE_USER: AuthUser = {
  id: "usr_google_01",
  email: "user@gmail.com",
  username: "@newuser",
  nome: "K-pop Fan",
  role: "JOINER",
  avatarUrl: undefined,
};

/** Estado global da sessão (substitui o AuthProvider/useAuth do React). */
@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly _user = signal<AuthUser | null>(null);
  private readonly _status = signal<AuthStatus>("unauthenticated");
  private readonly _needsOnboarding = signal(false);

  readonly user = this._user.asReadonly();
  readonly status = this._status.asReadonly();
  readonly needsOnboarding = this._needsOnboarding.asReadonly();
  readonly isAuthenticated = computed(() => this._status() === "authenticated" && !!this._user());

  // ---------------------------------------------------------------------------
  // 🔌 signInWithEmail
  // Real: POST /api/auth/login → { token, user }
  // ---------------------------------------------------------------------------
  async signInWithEmail(email: string, _password: string): Promise<void> {
    this._status.set("loading");
    try {
      await delay(700);
      // Dev: prefixo do e-mail define o role → admin@, gom@, qualquer outro = JOINER
      const role: UserRole = email.startsWith("admin@")
        ? "ADMIN"
        : email.startsWith("gom@")
          ? "GOM"
          : "JOINER";
      this._user.set({ ...MOCK_EXISTING_USER, email, role });
      this._needsOnboarding.set(false);
      this._status.set("authenticated");
    } catch {
      this._status.set("unauthenticated");
      throw new Error("Credenciais inválidas. Verifique e-mail e senha.");
    }
  }

  // ---------------------------------------------------------------------------
  // 🔌 signUpWithEmail
  // Real: POST /api/auth/register → { token, user }
  // O usuário recebe role JOINER por padrão; admin pode elevar depois.
  // ---------------------------------------------------------------------------
  async signUpWithEmail(email: string, _password: string): Promise<void> {
    this._status.set("loading");
    try {
      await delay(800);
      const newUser: AuthUser = {
        id: `usr_new_${Date.now()}`,
        email,
        username: "",
        nome: "",
        role: "JOINER",
      };
      this._user.set(newUser);
      this._needsOnboarding.set(true);
      this._status.set("authenticated");
    } catch {
      this._status.set("unauthenticated");
      throw new Error("Não foi possível criar a conta. Tente novamente.");
    }
  }

  // ---------------------------------------------------------------------------
  // 🔌 signInWithGoogle
  // Real: ver auth-providers.ts — Firebase signInWithPopup ou redirect OAuth2
  // ---------------------------------------------------------------------------
  async signInWithGoogle(): Promise<void> {
    this._status.set("loading");
    try {
      await delay(1000);
      this._user.set(MOCK_GOOGLE_USER);
      this._needsOnboarding.set(false);
      this._status.set("authenticated");
    } catch {
      this._status.set("unauthenticated");
      throw new Error("Login com Google falhou. Tente novamente.");
    }
  }

  // ---------------------------------------------------------------------------
  // 🔌 completeOnboarding
  // Real: PATCH /api/user/onboarding  { nome, username, avatarUrl }
  // ---------------------------------------------------------------------------
  async completeOnboarding(data: OnboardingData): Promise<void> {
    this._status.set("loading");
    try {
      await delay(600);
      this._user.update((prev) => (prev ? { ...prev, ...data } : null));
      this._needsOnboarding.set(false);
      this._status.set("authenticated");
    } catch {
      this._status.set("authenticated");
      throw new Error("Erro ao salvar perfil. Tente novamente.");
    }
  }

  // ---------------------------------------------------------------------------
  // updateUser — atualiza campos do perfil localmente
  // 🔌 Real: PATCH /api/user/profile  { ...data }
  // ---------------------------------------------------------------------------
  updateUser(data: Partial<AuthUser>): void {
    this._user.update((prev) => (prev ? { ...prev, ...data } : null));
  }

  // ---------------------------------------------------------------------------
  // 🔌 signOut
  // Real: DELETE /api/auth/session  (invalidar token/cookie)
  // ---------------------------------------------------------------------------
  signOut(): void {
    this._user.set(null);
    this._needsOnboarding.set(false);
    this._status.set("unauthenticated");
  }
}
