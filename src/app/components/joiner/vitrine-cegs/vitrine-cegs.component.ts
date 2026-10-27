import { Component, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Clock, Hand, Layers, MessagesSquare, Store } from "lucide-angular";
import { RodadaStatusComponent } from "@/components/claims/rodada-status/rodada-status.component";
import { CLAIM_STATUS_META, ITEM_STATUS_META, type CegItem } from "@/lib/claims-types";
import { AuthService } from "@/services/auth.service";
import { ClaimsService } from "@/services/claims.service";
import { ComunidadeService } from "@/services/comunidade.service";
import { ConfirmService } from "@/shared/confirm-dialog/confirm.service";
import { IconDirective } from "@/shared/icon.directive";
import { brl, fmtDate, type CegGOM } from "@/components/gom/gerenciamento-cegs/cegs.model";

type Filtro = "TODAS" | "ABERTA" | "EM_BREVE";

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "TODAS", label: "todas" },
  { value: "ABERTA", label: "claims abertos" },
  { value: "EM_BREVE", label: "em breve" },
];

/**
 * Rota "/joiner/vitrine" — CEGs abertas das comunidades da joiner, com os itens e o claim direto.
 * O claim feito aqui vira uma mensagem na sala da rodada (mesmo fluxo do chat de claims).
 */
@Component({
  selector: "app-vitrine-cegs",
  imports: [IconDirective, RouterLink, RodadaStatusComponent],
  templateUrl: "./vitrine-cegs.component.html",
  styleUrl: "./vitrine-cegs.component.scss",
})
export class VitrineCegsComponent {
  private readonly auth = inject(AuthService);
  private readonly comunidade = inject(ComunidadeService);
  private readonly confirm = inject(ConfirmService);
  protected readonly claims = inject(ClaimsService);

  protected readonly icons = { Clock, Hand, Layers, MessagesSquare, Store };
  protected readonly ITEM_META = ITEM_STATUS_META;
  protected readonly CLAIM_META = CLAIM_STATUS_META;
  protected readonly filtros = FILTROS;
  protected readonly brl = brl;
  protected readonly fmtDate = fmtDate;

  protected readonly filtro = signal<Filtro>("TODAS");
  /** Retorno do último claim, por CEG. */
  protected readonly feedback = signal<Partial<Record<string, { ok: boolean; texto: string }>>>({});

  protected readonly comunidades = computed(() => {
    const id = this.auth.user()?.id;
    return id ? this.comunidade.comunidadesDaJoiner(id) : [];
  });

  /** CEGs abertas das comunidades da joiner: claims abertos primeiro, depois as agendadas. */
  protected readonly vitrine = computed(() => {
    const ordem = { ABERTA: 0, AGENDADA: 1, SEM_AGENDA: 2, ENCERRADA: 3 };
    return this.claims
      .cegsDaJoiner()
      .filter((c) => c.status === "ABERTA")
      .map((ceg) => ({
        ceg,
        estado: this.claims.estado(ceg.id),
        itens: this.claims.itensDa(ceg.id),
        comunidade: this.comunidades().find((c) => c.id === ceg.comunidadeId)?.nome ?? "",
      }))
      .filter((v) => {
        if (this.filtro() === "ABERTA") return v.estado === "ABERTA";
        if (this.filtro() === "EM_BREVE")
          return v.estado === "AGENDADA" || v.estado === "SEM_AGENDA";
        return true;
      })
      .sort((a, b) => ordem[a.estado] - ordem[b.estado]);
  });

  protected async darClaim(ceg: CegGOM, item: CegItem): Promise<void> {
    const fila = this.claims.filaDoItem(item.id).length;
    const ok = await this.confirm.confirmar({
      titulo: `dar claim no #${item.codigo}?`,
      mensagem: `${item.nome} · ${brl(item.valor)}${
        fila > 0 ? ` — você entra na fila em ${fila + 1}º lugar.` : ""
      } a GOM confirma pelo chat da rodada.`,
      confirmar: "dar claim",
      icone: Hand,
    });
    if (!ok) return;
    const r = this.claims.darClaim(ceg.id, item.id);
    const texto = r.erro
      ? r.erro
      : r.claims.length > 0
        ? `claim do #${item.codigo} enviado — aguardando a GOM.`
        : `#${item.codigo}: ${r.ignorados[0]?.motivo ?? "não foi possível dar claim"}.`;
    this.feedback.update((f) => ({ ...f, [ceg.id]: { ok: r.claims.length > 0, texto } }));
  }

  protected filtroClass(f: Filtro): string {
    return `shrink-0 rounded-pill px-3.5 py-1.5 text-xs font-medium transition ${
      this.filtro() === f
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted text-muted-foreground hover:text-foreground"
    }`;
  }
}
