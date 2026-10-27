import { Component, computed, inject, input, linkedSignal, signal } from "@angular/core";
import { ArrowLeft, Check, Hand, Phone, X } from "lucide-angular";
import { CLAIM_STATUS_META, compararClaims, type Claim } from "@/lib/claims-types";
import { AuthService } from "@/services/auth.service";
import { ClaimsService } from "@/services/claims.service";
import { IconDirective } from "@/shared/icon.directive";
import { brl } from "@/components/gom/gerenciamento-cegs/cegs.model";
import { ClaimChatComponent } from "../claim-chat/claim-chat.component";
import { RodadaStatusComponent } from "../rodada-status/rodada-status.component";
import { AssinaturaComponent } from "@/shared/assinatura/assinatura.component";

interface FilaItem {
  itemId: string;
  codigo: string;
  nome: string;
  valor: number;
  fila: Claim[];
}

/** Rota "/gom/claims" — salas de claims: chat da rodada + moderação dos claims. */
@Component({
  selector: "app-gom-claims",
  imports: [IconDirective, ClaimChatComponent, RodadaStatusComponent, AssinaturaComponent],
  templateUrl: "./gom-claims.component.html",
  styleUrl: "./gom-claims.component.scss",
})
export class GomClaimsComponent {
  /** Query param `?ceg=` — abre direto na sala da CEG (link do card da CEG). */
  readonly ceg = input<string | undefined>();

  protected readonly auth = inject(AuthService);
  protected readonly claims = inject(ClaimsService);

  protected readonly icons = { ArrowLeft, Check, Hand, Phone, X };
  protected readonly CLAIM_META = CLAIM_STATUS_META;
  protected readonly brl = brl;

  /** Rodadas com agenda primeiro (abertas → agendadas → encerradas), depois as sem agenda. */
  protected readonly salas = computed(() => {
    const ordem = { ABERTA: 0, AGENDADA: 1, ENCERRADA: 2, SEM_AGENDA: 3 };
    return this.claims
      .cegsComClaims()
      .map((ceg) => ({
        ceg,
        estado: this.claims.estado(ceg.id),
        pendentes: this.claims.pendentesDa(ceg.id).length,
      }))
      .sort((a, b) => ordem[a.estado] - ordem[b.estado]);
  });

  protected readonly selecionadaId = linkedSignal<string | null>(() => this.ceg() ?? null);

  /** Abaixo de xl, chat e moderação dividem a mesma coluna. */
  protected readonly painel = linkedSignal<"chat" | "fila">(() => {
    this.selecionadaId();
    return "chat";
  });

  protected readonly selecionada = computed(
    () => this.salas().find((s) => s.ceg.id === this.selecionadaId())?.ceg ?? null,
  );

  /** Claims pendentes agrupados por item, cada fila na ordem de chegada. */
  protected readonly filas = computed<FilaItem[]>(() => {
    const ceg = this.selecionada();
    if (!ceg) return [];
    return this.claims
      .itensDa(ceg.id)
      .map((i) => ({
        itemId: i.id,
        codigo: i.codigo,
        nome: i.nome,
        valor: i.valor,
        fila: this.claims.filaDoItem(i.id),
      }))
      .filter((f) => f.fila.length > 0)
      .sort((a, b) => compararClaims(a.fila[0], b.fila[0]));
  });

  protected readonly decididos = computed(() => {
    const ceg = this.selecionada();
    if (!ceg) return [];
    return this.claims
      .claims()
      .filter((c) => c.cegId === ceg.id && c.status !== "PENDENTE")
      .sort((a, b) => (b.decididoEm ?? "").localeCompare(a.decididoEm ?? ""))
      .slice(0, 8);
  });

  /** Claim com o campo de motivo da rejeição aberto. */
  protected readonly rejeitandoId = signal<string | null>(null);
  protected readonly motivo = signal("");

  protected enviar(texto: string): void {
    const ceg = this.selecionada();
    if (ceg) this.claims.enviar(ceg.id, texto);
  }

  protected abrirRejeicao(id: string): void {
    this.rejeitandoId.set(id);
    this.motivo.set("");
  }

  protected rejeitar(id: string): void {
    this.claims.rejeitar(id, this.motivo());
    this.rejeitandoId.set(null);
  }

  protected itemNome(itemId: string): string {
    const item = this.claims.itensDa(this.selecionada()?.id ?? "").find((i) => i.id === itemId);
    return item ? `#${item.codigo} ${item.nome}` : "item";
  }

  /** "14:02:07.412" — os milissegundos mostram o desempate. */
  protected fmtTimestamp(iso: string): string {
    const d = new Date(iso);
    const hms = d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return `${hms}.${String(d.getMilliseconds()).padStart(3, "0")}`;
  }

  protected salaClass(id: string): string {
    return `flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
      this.selecionadaId() === id ? "bg-primary/10" : "hover:bg-muted/60"
    }`;
  }
}
