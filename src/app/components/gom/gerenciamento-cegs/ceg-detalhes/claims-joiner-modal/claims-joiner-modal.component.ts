import { Component, computed, inject, input, linkedSignal, output } from "@angular/core";
import { PackageX, Pencil, Phone, ShieldAlert, X } from "lucide-angular";
import { CLAIM_STATUS_META, type PagamentoItem } from "@/lib/claims-types";
import { ClaimsService } from "@/services/claims.service";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import { brl } from "../../cegs.model";
import { AssinaturaComponent } from "@/shared/assinatura/assinatura.component";

/** Claims da CEG vistos joiner a joiner, um por um, com totais e pagamento. */
@Component({
  selector: "app-claims-joiner-modal",
  imports: [DialogComponent, IconDirective, AssinaturaComponent],
  templateUrl: "./claims-joiner-modal.component.html",
  styleUrl: "./claims-joiner-modal.component.scss",
})
export class ClaimsJoinerModalComponent {
  readonly open = input.required<boolean>();
  readonly cegId = input.required<string>();
  readonly cegNome = input("");
  /** Joiner já selecionada ao abrir (ex.: clique no nome na tabela de itens). */
  readonly joinerInicial = input<string | null>(null);
  readonly closed = output<void>();
  /** Abrir o modal do item para editar (valor, avaria, abandono). */
  readonly editarItem = output<string>();

  protected readonly claims = inject(ClaimsService);

  protected readonly icons = { PackageX, Pencil, Phone, ShieldAlert, X };
  protected readonly CLAIM_META = CLAIM_STATUS_META;
  protected readonly brl = brl;

  protected readonly grupos = computed(() => this.claims.claimsPorJoiner(this.cegId()));

  protected readonly selecionadaId = linkedSignal<string | null>(() => {
    this.open();
    return this.joinerInicial() ?? this.grupos()[0]?.joinerId ?? null;
  });

  protected readonly detalhe = computed(() => {
    const grupo = this.grupos().find((g) => g.joinerId === this.selecionadaId());
    if (!grupo) return null;
    const itens = new Map(this.claims.itensDa(this.cegId()).map((i) => [i.id, i] as const));
    const linhas = grupo.claims.map((claim) => ({
      claim,
      item: itens.get(claim.itemId),
      posicao: claim.status === "PENDENTE" ? this.claims.posicaoNaFila(claim) : 0,
    }));
    const confirmadas = linhas.filter((l) => l.claim.status === "CONFIRMADO" && l.item);
    return {
      perfil: grupo.claims.at(-1)!,
      linhas,
      totalConfirmado: confirmadas.reduce((s, l) => s + l.item!.valor, 0),
      totalPago: confirmadas
        .filter((l) => l.item!.pagamento === "PAGO")
        .reduce((s, l) => s + l.item!.valor, 0),
      pendentes: linhas.filter((l) => l.claim.status === "PENDENTE").length,
    };
  });

  protected onOpenChange(open: boolean): void {
    if (!open) this.closed.emit();
  }

  protected resumoJoiner(joinerId: string): string {
    const grupo = this.grupos().find((g) => g.joinerId === joinerId);
    if (!grupo) return "";
    const conf = grupo.claims.filter((c) => c.status === "CONFIRMADO").length;
    const pend = grupo.claims.filter((c) => c.status === "PENDENTE").length;
    return `${conf} confirmado${conf !== 1 ? "s" : ""}${pend ? ` · ${pend} pendente${pend !== 1 ? "s" : ""}` : ""}`;
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
      second: "2-digit",
    });
  }

  protected joinerClass(id: string): string {
    return `flex w-full flex-col items-start rounded-2xl px-3 py-2 text-left transition ${
      this.selecionadaId() === id ? "bg-primary/10" : "hover:bg-muted/60"
    }`;
  }
}
