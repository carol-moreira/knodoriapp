import { Component, computed, inject, signal } from "@angular/core";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  ShieldCheck,
  UserPlus,
  XCircle,
  type LucideIconData,
} from "lucide-angular";
import { MOCK_USERS } from "@/lib/admin-types";
import { AuthService } from "@/services/auth.service";
import { IconDirective } from "@/shared/icon.directive";
import { PainelSectionComponent } from "./painel-section/painel-section.component";

// ---------------------------------------------------------------------------
// Tipos locais (dashboard operacional)
// ---------------------------------------------------------------------------

type TicketStatus = "ABERTO" | "EM_ATENDIMENTO" | "RESOLVIDO";
type TicketPrioridade = "BAIXA" | "MEDIA" | "ALTA";
type AprovacaoStatus = "PENDENTE" | "APROVADO" | "REJEITADO";

interface Ticket {
  id: string;
  autorNome: string;
  autorUsername: string;
  assunto: string;
  mensagem: string;
  status: TicketStatus;
  prioridade: TicketPrioridade;
  dataCriacao: string;
}

interface SolicitacaoAcessoGom {
  id: string;
  nome: string;
  username: string;
  email: string;
  justificativa: string;
  dataSolicitacao: string;
  status: AprovacaoStatus;
}

// ---------------------------------------------------------------------------
// Mocks — 🔌 substituir por chamadas HttpClient em um service
// ---------------------------------------------------------------------------

const MOCK_TICKETS: Ticket[] = [
  {
    id: "tkt_01",
    autorNome: "Bia Costa",
    autorUsername: "@miniheart",
    assunto: "Não consigo acessar minha CEG",
    mensagem: "Entrei no link mas aparece erro 403. Pode verificar?",
    status: "ABERTO",
    prioridade: "ALTA",
    dataCriacao: "2026-06-10T09:15:00Z",
  },
  {
    id: "tkt_02",
    autorNome: "Ana Reis",
    autorUsername: "@bunbun",
    assunto: "Pedido duplicado na fila",
    mensagem: "Meu pedido apareceu duas vezes após recarregar a página.",
    status: "EM_ATENDIMENTO",
    prioridade: "MEDIA",
    dataCriacao: "2026-06-09T18:42:00Z",
  },
  {
    id: "tkt_03",
    autorNome: "Ji-yeon Park",
    autorUsername: "@peachmode",
    assunto: "Calculadora com valor errado",
    mensagem: "O valor em BRL está muito diferente do que a GOM me passou.",
    status: "ABERTO",
    prioridade: "MEDIA",
    dataCriacao: "2026-06-09T14:05:00Z",
  },
  {
    id: "tkt_04",
    autorNome: "Marina Souza",
    autorUsername: "@cherrymari",
    assunto: "Dúvida sobre prazo de entrega",
    mensagem: "Quando meu item chega ao Brasil?",
    status: "RESOLVIDO",
    prioridade: "BAIXA",
    dataCriacao: "2026-06-08T11:30:00Z",
  },
];

const MOCK_SOLICITACOES_GOM: SolicitacaoAcessoGom[] = [
  {
    id: "sol_01",
    nome: "Camila Fontes",
    username: "@camilafontes",
    email: "camila@example.com",
    justificativa:
      "Organizo CEGs há 6 meses pelo Instagram. Tenho mais de 40 joiners regulares e quero gerenciar tudo aqui.",
    dataSolicitacao: "2026-06-09T20:00:00Z",
    status: "PENDENTE",
  },
  {
    id: "sol_02",
    nome: "Nara Oliveira",
    username: "@naraoli",
    email: "nara@example.com",
    justificativa:
      "Trabalho em grupo de K-pop há 2 anos e quero centralizar os pedidos da minha comunidade.",
    dataSolicitacao: "2026-06-08T16:30:00Z",
    status: "PENDENTE",
  },
  {
    id: "sol_03",
    nome: "Priya Santos",
    username: "@priya_kpop",
    email: "priya@example.com",
    justificativa:
      "Tenho experiência com logística de importação e quero oferecer esse serviço para meus seguidores.",
    dataSolicitacao: "2026-06-07T10:15:00Z",
    status: "PENDENTE",
  },
];

// ---------------------------------------------------------------------------
// Config visual
// ---------------------------------------------------------------------------

const TICKET_STATUS_META: Record<
  TicketStatus,
  { label: string; badge: string; icon: LucideIconData }
> = {
  ABERTO: {
    label: "Aberto",
    badge: "bg-red-50 text-red-700 ring-1 ring-red-200",
    icon: AlertCircle,
  },
  EM_ATENDIMENTO: {
    label: "Em atendimento",
    badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    icon: Loader2,
  },
  RESOLVIDO: {
    label: "Resolvido",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    icon: CheckCircle2,
  },
};

const PRIORIDADE_META: Record<TicketPrioridade, { label: string; badge: string }> = {
  ALTA: { label: "Alta", badge: "bg-red-100 text-red-700 font-bold" },
  MEDIA: { label: "Média", badge: "bg-amber-100 text-amber-700 font-semibold" },
  BAIXA: { label: "Baixa", badge: "bg-muted text-muted-foreground" },
};

@Component({
  selector: "app-admin-dashboard",
  imports: [IconDirective, PainelSectionComponent],
  templateUrl: "./admin-dashboard.component.html",
  styleUrl: "./admin-dashboard.component.scss",
})
export class AdminDashboardComponent {
  protected readonly auth = inject(AuthService);

  protected readonly icons = { CheckCircle2, Clock, MessageSquare, ShieldCheck, UserPlus, XCircle };
  protected readonly TICKET_STATUS_META = TICKET_STATUS_META;
  protected readonly PRIORIDADE_META = PRIORIDADE_META;

  // GOMs ativas (derivadas do controle de usuários)
  protected readonly gomsAtivas = MOCK_USERS.filter(
    (u) => u.role === "GOM" && u.status === "ATIVO",
  );

  // Suporte
  protected readonly tickets = signal<Ticket[]>(MOCK_TICKETS);
  protected readonly ticketsAbertos = computed(
    () => this.tickets().filter((t) => t.status !== "RESOLVIDO").length,
  );

  // Aprovações GOM
  protected readonly solicitacoes = signal<SolicitacaoAcessoGom[]>(MOCK_SOLICITACOES_GOM);
  protected readonly pendentes = computed(
    () => this.solicitacoes().filter((s) => s.status === "PENDENTE").length,
  );

  protected handleTicketStatus(id: string, novoStatus: TicketStatus): void {
    // 🔌 await fetch(`/api/admin/tickets/${id}`, { method: "PATCH", body: JSON.stringify({ status: novoStatus }) })
    this.tickets.update((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: novoStatus } : t)),
    );
  }

  protected handleAprovacao(id: string, decisao: "APROVADO" | "REJEITADO"): void {
    // 🔌 await fetch(`/api/admin/solicitacoes-gom/${id}`, { method: "PATCH", body: JSON.stringify({ status: decisao }) })
    this.solicitacoes.update((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: decisao } : s)),
    );
  }

  protected fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  }

  protected fmtDateTime(iso: string): string {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
