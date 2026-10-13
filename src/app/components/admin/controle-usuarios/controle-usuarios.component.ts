import { Component, computed, input, linkedSignal, signal } from "@angular/core";
import { Lock, Pencil, Search, Shield, ShieldOff, Users } from "lucide-angular";
import type { GlobalUser } from "@/lib/admin-types";
import type { UserRole } from "@/lib/auth";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import {
  ROLE_META,
  ROLE_OPTIONS,
  STATUS_META,
  fmtDate,
  iniciais,
  type PendingRoleChange,
  type UserEdit,
} from "./controle-usuarios.model";
import { EditUserDialogComponent } from "./edit-user-dialog/edit-user-dialog.component";
import { RoleChangeDialogComponent } from "./role-change-dialog/role-change-dialog.component";

type RoleFilter = UserRole | "TODOS";

@Component({
  selector: "app-controle-usuarios",
  imports: [IconDirective, EditUserDialogComponent, RoleChangeDialogComponent],
  templateUrl: "./controle-usuarios.component.html",
  styleUrl: "./controle-usuarios.component.scss",
})
export class ControleUsuariosComponent {
  readonly usuarios = input.required<GlobalUser[]>();

  protected readonly icons = { Lock, Pencil, Search, Shield, ShieldOff, Users };
  protected readonly ROLE_META = ROLE_META;
  protected readonly STATUS_META = STATUS_META;
  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly roleFilters: RoleFilter[] = ["TODOS", "ADMIN", "GOM", "JOINER"];
  protected readonly iniciais = iniciais;
  protected readonly fmtDate = fmtDate;
  protected readonly val = inputValue;

  /** Lista editável (inicia com o input `usuarios`). */
  protected readonly lista = linkedSignal<GlobalUser[]>(() => this.usuarios());
  protected readonly search = signal("");
  protected readonly filtroRole = signal<RoleFilter>("TODOS");
  protected readonly editTarget = signal<GlobalUser | null>(null);
  protected readonly pendingRoleChange = signal<PendingRoleChange | null>(null);

  protected readonly filtrados = computed(() => {
    const q = this.search().toLowerCase();
    const filtro = this.filtroRole();
    return this.lista().filter((u) => {
      const matchQ =
        !q ||
        u.nome.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchRole = filtro === "TODOS" || u.role === filtro;
      return matchQ && matchRole;
    });
  });

  protected readonly contadores = computed<Record<RoleFilter, number>>(() => {
    const us = this.lista();
    return {
      TODOS: us.length,
      ADMIN: us.filter((u) => u.role === "ADMIN").length,
      GOM: us.filter((u) => u.role === "GOM").length,
      JOINER: us.filter((u) => u.role === "JOINER").length,
    };
  });

  protected filterClass(r: RoleFilter): string {
    return `flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
      this.filtroRole() === r
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-foreground/60 hover:text-foreground hover:bg-background/60"
    }`;
  }

  protected filterCountClass(r: RoleFilter): string {
    return `rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
      this.filtroRole() === r ? "bg-white/20" : "bg-muted text-muted-foreground"
    }`;
  }

  /** Protege Admin de auto-banimento na UI. */
  protected isSelf(user: GlobalUser): boolean {
    return user.role === "ADMIN";
  }

  // ── Ações ──────────────────────────────────────────────────────────────────

  protected toggleStatus(id: string): void {
    // 🔌 await fetch(`/api/admin/users/${id}/toggle-status`, { method: "POST" })
    this.lista.update((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === "ATIVO" ? "SUSPENSO" : "ATIVO" } : u,
      ),
    );
  }

  private changeRole(id: string, role: UserRole): void {
    // 🔌 await fetch(`/api/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) })
    this.lista.update((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  }

  /**
   * Select controlado: o valor fica travado no cargo atual até a confirmação
   * por senha. O DOM é revertido imediatamente e a troca vai para o diálogo.
   */
  protected onRoleSelect(user: GlobalUser, e: Event): void {
    const select = e.target as HTMLSelectElement;
    const newRole = select.value as UserRole;
    select.value = user.role;
    if (newRole !== user.role) {
      this.pendingRoleChange.set({
        userId: user.id,
        userName: user.nome,
        currentRole: user.role,
        newRole,
      });
    }
  }

  protected confirmRoleChange(change: PendingRoleChange): void {
    this.changeRole(change.userId, change.newRole);
    this.pendingRoleChange.set(null);
  }

  protected saveEdit({ id, dados }: UserEdit): void {
    // 🔌 await fetch(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(dados) })
    this.lista.update((prev) => prev.map((u) => (u.id === id ? { ...u, ...dados } : u)));
    this.editTarget.set(null);
  }
}
