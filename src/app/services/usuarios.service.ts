import { Injectable, signal } from "@angular/core";
import { MOCK_USERS, type GlobalUser, type UserStatus } from "@/lib/admin-types";
import type { UserRole } from "@/lib/auth";

/**
 * Usuários da plataforma (visão do admin). Fonte única do status da conta: o login bloqueia
 * contas SUSPENSO e as solicitações de banimento aprovadas mudam o status aqui.
 * Sem dependências — o AuthService injeta este service.
 */
@Injectable({ providedIn: "root" })
export class UsuariosService {
  // 🔌 GET /api/admin/users
  private readonly _usuarios = signal<GlobalUser[]>(MOCK_USERS);
  readonly usuarios = this._usuarios.asReadonly();

  /** 🔌 o vínculo real é por id; o mock casa pelo @ (ids diferentes entre os mocks). */
  porUsername(username: string): GlobalUser | undefined {
    return this._usuarios().find((u) => u.username === username);
  }

  suspenso(username: string): boolean {
    return this.porUsername(username)?.status === "SUSPENSO";
  }

  alterarStatus(id: string, status: UserStatus): void {
    // 🔌 POST /api/admin/users/:id/status
    this.patch(id, { status });
  }

  alterarRole(id: string, role: UserRole): void {
    // 🔌 PATCH /api/admin/users/:id/role
    this.patch(id, { role });
  }

  editar(id: string, dados: Partial<Pick<GlobalUser, "nome" | "username" | "email">>): void {
    // 🔌 PATCH /api/admin/users/:id
    this.patch(id, dados);
  }

  private patch(id: string, patch: Partial<GlobalUser>): void {
    this._usuarios.update((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }
}
