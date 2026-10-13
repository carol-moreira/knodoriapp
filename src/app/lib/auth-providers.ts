/**
 * Adapters de provedores de autenticação.
 *
 * Escolha UM provedor e substitua os métodos de AuthService
 * (src/app/services/auth.service.ts) pelos métodos
 * do adapter correspondente. O contrato de retorno é idêntico entre
 * todos os adapters, facilitando a troca.
 *
 * Uso:
 *   import { createFirebaseAdapter } from "@/lib/auth-providers";
 *   const provider = createFirebaseAdapter(firebaseApp);
 *   await provider.signInWithEmail(email, password);
 */

// ---------------------------------------------------------------------------
// Contrato comum (todos os adapters implementam isso)
// ---------------------------------------------------------------------------

export interface ProviderUser {
  id: string;
  email: string;
  nome?: string;
  avatarUrl?: string;
}

export interface AuthAdapter {
  signInWithEmail(email: string, password: string): Promise<ProviderUser>;
  signUpWithEmail(email: string, password: string): Promise<ProviderUser>;
  signInWithGoogle(): Promise<ProviderUser>;
  signOut(): Promise<void>;
  /** Verifica se há uma sessão ativa (chamado no constructor do AuthService). */
  getCurrentUser(): Promise<ProviderUser | null>;
}

// ---------------------------------------------------------------------------
// Firebase Adapter
// ---------------------------------------------------------------------------
// npm install firebase
// Inicializar em src/lib/firebase.ts:
//   import { initializeApp } from "firebase/app";
//   export const firebaseApp = initializeApp({ apiKey, authDomain, ... });

/*
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import type { FirebaseApp } from "firebase/app";

export function createFirebaseAdapter(app: FirebaseApp): AuthAdapter {
  const auth = getAuth(app);
  const googleProvider = new GoogleAuthProvider();

  const toProviderUser = (u: User): ProviderUser => ({
    id: u.uid,
    email: u.email!,
    nome: u.displayName ?? undefined,
    avatarUrl: u.photoURL ?? undefined,
  });

  return {
    async signInWithEmail(email, password) {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      return toProviderUser(user);
    },
    async signUpWithEmail(email, password) {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      return toProviderUser(user);
    },
    async signInWithGoogle() {
      const { user } = await signInWithPopup(auth, googleProvider);
      return toProviderUser(user);
    },
    async signOut() {
      await fbSignOut(auth);
    },
    async getCurrentUser() {
      return new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, (user) => {
          unsub();
          resolve(user ? toProviderUser(user) : null);
        });
      });
    },
  };
}
*/

// ---------------------------------------------------------------------------
// AWS Cognito Adapter
// ---------------------------------------------------------------------------
// npm install @aws-amplify/auth
// Configurar em src/lib/amplify.ts:
//   import { Amplify } from "aws-amplify";
//   Amplify.configure({ Auth: { Cognito: { userPoolId, userPoolClientId } } });

/*
import {
  signIn,
  signUp,
  signInWithRedirect,
  signOut as cognitoSignOut,
  getCurrentUser as cognitoGetCurrentUser,
  fetchUserAttributes,
} from "@aws-amplify/auth";

export function createCognitoAdapter(): AuthAdapter {
  return {
    async signInWithEmail(email, password) {
      await signIn({ username: email, password });
      const user = await cognitoGetCurrentUser();
      const attrs = await fetchUserAttributes();
      return { id: user.userId, email: attrs.email!, nome: attrs.name, avatarUrl: attrs.picture };
    },
    async signUpWithEmail(email, password) {
      await signUp({ username: email, password, options: { userAttributes: { email } } });
      return { id: email, email }; // ID real vem após confirmação
    },
    async signInWithGoogle() {
      await signInWithRedirect({ provider: "Google" });
      const user = await cognitoGetCurrentUser();
      const attrs = await fetchUserAttributes();
      return { id: user.userId, email: attrs.email!, nome: attrs.name, avatarUrl: attrs.picture };
    },
    async signOut() {
      await cognitoSignOut();
    },
    async getCurrentUser() {
      try {
        const user = await cognitoGetCurrentUser();
        const attrs = await fetchUserAttributes();
        return { id: user.userId, email: attrs.email!, nome: attrs.name, avatarUrl: attrs.picture };
      } catch {
        return null;
      }
    },
  };
}
*/

// ---------------------------------------------------------------------------
// OAuth2 / PKCE Adapter genérico
// ---------------------------------------------------------------------------
// Para uso com qualquer servidor OAuth2 (Keycloak, Auth0, Supabase, etc.)
// npm install oidc-client-ts (recomendado) ou oauth4webapi

export interface OAuth2Config {
  /** URL do authorization server (ex: https://auth.meudominio.com) */
  issuer: string;
  clientId: string;
  redirectUri: string;
  /** Scopes adicionais além de "openid email profile" */
  extraScopes?: string[];
}

/*
import { UserManager, WebStorageStateStore } from "oidc-client-ts";

export function createOAuth2Adapter(config: OAuth2Config): AuthAdapter {
  const manager = new UserManager({
    authority: config.issuer,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: ["openid", "email", "profile", ...(config.extraScopes ?? [])].join(" "),
    userStore: new WebStorageStateStore({ store: window.localStorage }),
  });

  return {
    async signInWithEmail(_email, _password) {
      // OAuth2 puro não expõe login por senha no cliente; use resource-owner grant ou redirecione
      throw new Error("Use signInWithGoogle para este provedor OAuth2.");
    },
    async signUpWithEmail(_email, _password) {
      throw new Error("Cadastro via OAuth2 deve ser feito no portal do provedor.");
    },
    async signInWithGoogle() {
      await manager.signinRedirect();
      const user = await manager.getUser();
      if (!user) throw new Error("Autenticação cancelada.");
      return { id: user.profile.sub, email: user.profile.email!, nome: user.profile.name, avatarUrl: user.profile.picture };
    },
    async signOut() {
      await manager.signoutRedirect();
    },
    async getCurrentUser() {
      const user = await manager.getUser();
      if (!user || user.expired) return null;
      return { id: user.profile.sub, email: user.profile.email!, nome: user.profile.name, avatarUrl: user.profile.picture };
    },
  };
}
*/

// ---------------------------------------------------------------------------
// Como integrar ao AuthService (src/app/services/auth.service.ts)
// ---------------------------------------------------------------------------
//
// 1. Escolha um adapter acima e descomente.
// 2. Instancie o adapter fora da classe (ou forneça via InjectionToken):
//    const authAdapter = createFirebaseAdapter(firebaseApp);
//
// 3. Substitua os mocks no AuthService:
//    async signInWithEmail(email: string, password: string) {
//      this._status.set("loading");
//      try {
//        const { id, email: e, nome, avatarUrl } = await authAdapter.signInWithEmail(email, password);
//        // Buscar role do seu banco: GET /api/users/${id}
//        const { role } = await firstValueFrom(this.http.get<{ role: UserRole }>(`/api/users/${id}`));
//        this._user.set({ id, email: e, username: "", nome: nome ?? "", role, avatarUrl });
//        this._status.set("authenticated");
//      } catch (err) {
//        this._status.set("unauthenticated");
//        throw err;
//      }
//    }
//
// 4. No constructor do AuthService, verifique sessão existente:
//    authAdapter.getCurrentUser().then(async (providerUser) => {
//      if (!providerUser) { this._status.set("unauthenticated"); return; }
//      const { role, username, nome } = await firstValueFrom(
//        this.http.get<Pick<AuthUser, "role" | "username" | "nome">>(`/api/users/${providerUser.id}`),
//      );
//      this._user.set({ ...providerUser, role, username, nome });
//      this._status.set("authenticated");
//    });
