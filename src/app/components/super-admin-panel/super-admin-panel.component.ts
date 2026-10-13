// =====================================================================
// SUPER ADMIN PANEL — Gerenciamento Global do Sistema
// Sidebar + Cards de métricas + DataTable global de usuários
// =====================================================================
import { Component, computed, signal } from "@angular/core";
import {
  Ban,
  Eye,
  Globe2,
  LayoutDashboard,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldAlert,
  UserCog,
  Users,
  X,
} from "lucide-angular";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";

type Role = "GOM" | "JOINER";
type Status = "ATIVO" | "SUSPENSO";

type GlobalUser = {
  id: string;
  username: string;
  nome: string;
  role: Role;
  status: Status;
  cadastro: string;
  ultimaAtividade: string;
  cegs: { id: string; nome: string; status: string }[];
};

// 🔌 LÓGICA DE NEGÓCIO: substituir por fetch("/api/admin/users")
const MOCK_USERS: GlobalUser[] = [
  {
    id: "u1",
    username: "knodori",
    nome: "Knodori Lee",
    role: "GOM",
    status: "ATIVO",
    cadastro: "12/01/2025",
    ultimaAtividade: "há 2h",
    cegs: [
      { id: "c1", nome: "TWICE · With YOU-th", status: "EM_COMPRA" },
      { id: "c2", nome: "ATEEZ · GOLDEN HOUR", status: "FINALIZADA" },
    ],
  },
  {
    id: "u2",
    username: "cherrygom",
    nome: "Marina Souza",
    role: "GOM",
    status: "ATIVO",
    cadastro: "03/11/2024",
    ultimaAtividade: "há 5min",
    cegs: [{ id: "c3", nome: "LE SSERAFIM · Easy", status: "TRANSITO" }],
  },
  {
    id: "u3",
    username: "miniheart",
    nome: "Bia Costa",
    role: "JOINER",
    status: "ATIVO",
    cadastro: "20/02/2025",
    ultimaAtividade: "há 1d",
    cegs: [{ id: "c4", nome: "NewJeans · Bunnies", status: "CHEGOU_BR" }],
  },
  {
    id: "u4",
    username: "chuusoft",
    nome: "Letícia Park",
    role: "JOINER",
    status: "SUSPENSO",
    cadastro: "08/05/2024",
    ultimaAtividade: "há 32d",
    cegs: [],
  },
  {
    id: "u5",
    username: "bunbun",
    nome: "Ana Reis",
    role: "JOINER",
    status: "ATIVO",
    cadastro: "15/03/2025",
    ultimaAtividade: "há 4h",
    cegs: [{ id: "c5", nome: "Stray Kids · ATE", status: "ABERTA" }],
  },
];

const SIDEBAR = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "goms", label: "Gerenciar GOMs", icon: UserCog },
  { id: "joiners", label: "Gerenciar Joiners", icon: Users },
  { id: "cegs", label: "Todas CEGs Global", icon: Globe2 },
  { id: "disputas", label: "Moderação de Disputas", icon: ShieldAlert },
  { id: "config", label: "Configurações do Sistema", icon: Settings2 },
] as const;

type SidebarId = (typeof SIDEBAR)[number]["id"];
type RoleFilter = Role | "ALL";

@Component({
  selector: "app-super-admin-panel",
  imports: [IconDirective],
  templateUrl: "./super-admin-panel.component.html",
  styleUrl: "./super-admin-panel.component.scss",
})
export class SuperAdminPanelComponent {
  protected readonly icons = { Ban, Eye, Globe2, Plus, RotateCcw, Search, UserCog, Users, X };
  protected readonly sidebar = SIDEBAR;
  protected readonly roleFilters: RoleFilter[] = ["ALL", "GOM", "JOINER"];
  protected readonly val = inputValue;

  protected readonly active = signal<SidebarId>("dashboard");
  protected readonly users = signal<GlobalUser[]>(MOCK_USERS);
  protected readonly q = signal("");
  protected readonly roleFilter = signal<RoleFilter>("ALL");
  protected readonly selected = signal<GlobalUser | null>(null);

  // Filtra a tabela conforme a sessão do menu lateral
  protected readonly filtered = computed(() => {
    let base = this.users();
    const active = this.active();
    const roleFilter = this.roleFilter();
    const q = this.q().toLowerCase();
    if (active === "goms") base = base.filter((u) => u.role === "GOM");
    if (active === "joiners") base = base.filter((u) => u.role === "JOINER");
    if (roleFilter !== "ALL") base = base.filter((u) => u.role === roleFilter);
    return base.filter(
      (u) => u.username.toLowerCase().includes(q) || u.nome.toLowerCase().includes(q),
    );
  });

  protected readonly metricas = computed(() => {
    const users = this.users();
    return [
      {
        icon: UserCog,
        label: "GOMs registradas",
        value: users.filter((u) => u.role === "GOM").length,
      },
      {
        icon: Users,
        label: "Joiners ativos",
        value: users.filter((u) => u.role === "JOINER" && u.status === "ATIVO").length,
      },
      {
        icon: Globe2,
        label: "CEGs ativas (global)",
        // Mock: CEGs ativas globais
        value: users.reduce(
          (s, u) => s + u.cegs.filter((c) => c.status !== "FINALIZADA").length,
          0,
        ),
      },
    ];
  });

  // 🔌 LÓGICA DE NEGÓCIO: PATCH /api/admin/users/:id/status
  protected toggleStatus(id: string): void {
    this.users.update((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === "ATIVO" ? "SUSPENSO" : "ATIVO" } : u,
      ),
    );
  }

  protected initials(username: string): string {
    return username.slice(0, 2).toUpperCase();
  }

  protected sidebarClass(id: SidebarId): string {
    return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
      this.active() === id
        ? "bg-primary text-primary-foreground shadow"
        : "text-foreground/70 hover:bg-muted"
    }`;
  }

  protected roleFilterClass(r: RoleFilter): string {
    return `rounded-full px-4 py-2 text-xs font-semibold transition ${
      this.roleFilter() === r
        ? "bg-primary text-primary-foreground shadow"
        : "bg-muted text-foreground/70 hover:bg-primary/10 hover:text-primary"
    }`;
  }
}
