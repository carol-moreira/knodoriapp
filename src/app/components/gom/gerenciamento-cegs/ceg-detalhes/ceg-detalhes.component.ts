import { Component, computed, effect, inject, input, output, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import {
  BarChart3,
  CalendarClock,
  Check,
  Hand,
  Megaphone,
  MessagesSquare,
  Package,
  PackageX,
  Pencil,
  Phone,
  Plus,
  Repeat2,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-angular";
import {
  CLAIM_STATUS_META,
  ITEM_STATUS_META,
  type CegItem,
  type PagamentoItem,
} from "@/lib/claims-types";
import { MERCARI_STATUS_META } from "@/lib/gom-types";
import { resumoItens } from "@/lib/mensagens-types";
import { CEG_POST_META, CegPostsService } from "@/services/ceg-posts.service";
import { ClaimsService } from "@/services/claims.service";
import { PedidosMercariService } from "@/services/pedidos-mercari.service";
import { RepassesService } from "@/services/repasses.service";
import { IconDirective } from "@/shared/icon.directive";
import { ConfirmService } from "@/shared/confirm-dialog/confirm.service";
import { inputValue } from "@/shared/dom";
import { RodadaStatusComponent } from "@/components/claims/rodada-status/rodada-status.component";
import { ClaimsJoinerModalComponent } from "./claims-joiner-modal/claims-joiner-modal.component";
import { ItemModalComponent } from "./item-modal/item-modal.component";
import {
  CEG_STATUS_META,
  INPUT_CLS,
  REPASSE_META,
  brl,
  fmtDate,
  type CegGOM,
  type Repasse,
} from "../cegs.model";
import { AssinaturaComponent } from "@/shared/assinatura/assinatura.component";

export const AVISO_OPCOES = [0, 5, 15, 30, 60];

/**
 * Dropdown do card da CEG com todos os detalhes: resumo, pagamentos, novidades, pedidos da
 * caixa (caixas mercari) e, nas demais CEGs, a agenda dos claims e o inventário dos itens.
 */
@Component({
  selector: "app-ceg-detalhes",
  imports: [
    IconDirective,
    RouterLink,
    RodadaStatusComponent,
    ItemModalComponent,
    ClaimsJoinerModalComponent,
    AssinaturaComponent,
  ],
  templateUrl: "./ceg-detalhes.component.html",
  styleUrl: "./ceg-detalhes.component.scss",
})
export class CegDetalhesComponent {
  readonly ceg = input.required<CegGOM>();
  /** Cobranças (pagamentos) da CEG — estado do pai. */
  readonly repasses = input<Repasse[]>([]);

  readonly abrirNovidades = output<void>();
  readonly abrirPagamentos = output<void>();
  readonly abrirRepasses = output<void>();

  protected readonly claims = inject(ClaimsService);
  private readonly confirm = inject(ConfirmService);
  private readonly posts = inject(CegPostsService);
  private readonly pedidos = inject(PedidosMercariService);
  private readonly repassesClaim = inject(RepassesService);

  protected readonly icons = {
    BarChart3,
    CalendarClock,
    Check,
    Hand,
    Megaphone,
    MessagesSquare,
    Package,
    PackageX,
    Pencil,
    Phone,
    Plus,
    Repeat2,
    ShieldAlert,
    Trash2,
    Users,
    X,
  };
  protected readonly STATUS_META = CEG_STATUS_META;
  protected readonly REPASSE_META = REPASSE_META;
  protected readonly POST_META = CEG_POST_META;
  protected readonly MERCARI_META = MERCARI_STATUS_META;
  protected readonly fmtDate = fmtDate;
  protected readonly resumoItens = resumoItens;
  protected readonly INPUT_CLS = INPUT_CLS;
  protected readonly ITEM_META = ITEM_STATUS_META;
  protected readonly CLAIM_META = CLAIM_STATUS_META;
  protected readonly avisoOpcoes = AVISO_OPCOES;
  protected readonly brl = brl;
  protected readonly val = inputValue;

  // Agenda
  protected readonly abreEm = signal("");
  protected readonly fechaEm = signal("");
  protected readonly avisoMinutos = signal(15);
  protected readonly agendaErro = signal("");
  protected readonly agendaSalva = signal(false);

  /** Modal do item aberto (id null = novo item). */
  protected readonly itemModal = signal<{ id: string | null } | null>(null);
  /** Modal de claims por joiner aberto (joinerId null = primeira da lista). */
  protected readonly joinerModal = signal<{ joinerId: string | null } | null>(null);

  protected readonly ehCaixa = computed(() => this.ceg().tipo === "CAIXA_MERCARI");

  protected readonly pagamentos = computed(() => {
    const lista = this.repasses();
    return {
      total: lista.reduce((s, r) => s + r.valorTotal, 0),
      pago: lista.reduce((s, r) => s + r.valorPago, 0),
      pendentes: lista.filter((r) => r.status !== "PAGO").length,
    };
  });

  protected readonly ultimosPosts = computed(() => this.posts.daCeg(this.ceg().id).slice(0, 3));
  protected readonly totalPosts = computed(() => this.posts.daCeg(this.ceg().id).length);
  protected readonly repassesPendentes = computed(() =>
    this.repassesClaim.pendentesDaCeg(this.ceg().id),
  );
  protected readonly pedidosDaCaixa = computed(() =>
    this.ehCaixa() ? this.pedidos.pedidosDaCaixa(this.ceg().id) : [],
  );

  protected readonly agenda = computed(() => this.claims.agendaDa(this.ceg().id));
  protected readonly estado = computed(() => this.claims.estado(this.ceg().id));

  protected readonly linhas = computed(() =>
    this.claims.itensDa(this.ceg().id).map((item) => ({
      item,
      dono: this.claims.donoDo(item),
      fila: this.claims.filaDoItem(item.id),
    })),
  );

  protected readonly resumo = computed(() => {
    const itens = this.linhas().map((l) => l.item);
    const confirmados = itens.filter((i) => i.status === "CONFIRMADO");
    return {
      total: itens.length,
      disponiveis: itens.filter((i) => i.status === "DISPONIVEL").length,
      reservados: itens.filter((i) => i.status === "RESERVADO").length,
      confirmados: confirmados.length,
      valorConfirmado: confirmados.reduce((s, i) => s + i.valor, 0),
      valorPago: confirmados.filter((i) => i.pagamento === "PAGO").reduce((s, i) => s + i.valor, 0),
      avarias: itens.filter((i) => i.avaria).length,
      abandonados: itens.filter((i) => i.abandonado).length,
    };
  });

  constructor() {
    // Preenche o formulário com a agenda salva
    effect(() => {
      const agenda = this.agenda();
      this.abreEm.set(agenda ? toLocalInput(agenda.abreEm) : "");
      this.fechaEm.set(agenda?.fechaEm ? toLocalInput(agenda.fechaEm) : "");
      this.avisoMinutos.set(agenda?.avisoMinutos ?? 15);
    });
  }

  protected salvarAgenda(): void {
    this.agendaErro.set("");
    this.agendaSalva.set(false);
    const abre = this.abreEm() ? new Date(this.abreEm()) : null;
    const fecha = this.fechaEm() ? new Date(this.fechaEm()) : null;
    if (!abre || Number.isNaN(abre.getTime())) {
      this.agendaErro.set("escolha a data e o horário de abertura.");
      return;
    }
    if (fecha && fecha <= abre) {
      this.agendaErro.set("o encerramento precisa ser depois da abertura.");
      return;
    }
    this.claims.agendar(
      this.ceg().id,
      abre.toISOString(),
      this.avisoMinutos(),
      fecha?.toISOString(),
    );
    this.agendaSalva.set(true);
  }

  protected async removerItem(item: CegItem): Promise<void> {
    const ok = await this.confirm.confirmar({
      titulo: `excluir o item #${item.codigo}?`,
      mensagem: `${item.nome} sai do inventário da CEG.`,
    });
    if (ok) this.claims.removerItem(item.id);
  }

  protected onPagamento(itemId: string, e: Event): void {
    this.claims.marcarPagamento(itemId, inputValue(e) as PagamentoItem);
  }

  protected fmtDataHora(iso: string): string {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /** Quantas joiners receberam a cobrança da caixa. */
  protected qtdCobrados(porJoiner: Record<string, number>): number {
    return Object.keys(porJoiner).length;
  }

  /** Link do WhatsApp (só dígitos, com DDI 55). */
  protected whatsapp(telefone: string): string {
    return `https://wa.me/55${telefone.replace(/\D/g, "")}`;
  }
}

/** ISO → valor de <input type="datetime-local"> no fuso local. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
