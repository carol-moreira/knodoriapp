import { Component, computed, inject, input, linkedSignal, signal } from "@angular/core";
import { ArrowLeft, Hand, IdCard, Receipt } from "lucide-angular";
import { CLAIM_STATUS_META, telefoneDaJoiner, type CegItem } from "@/lib/claims-types";
import { AuthService } from "@/services/auth.service";
import { ClaimsService, type ResultadoEnvio } from "@/services/claims.service";
import { ComprovanteChipComponent } from "@/shared/comprovante/comprovante-chip.component";
import { ComprovanteService } from "@/shared/comprovante/comprovante.service";
import { IconDirective } from "@/shared/icon.directive";
import { brl } from "@/components/gom/gerenciamento-cegs/cegs.model";
import { ClaimChatComponent } from "../claim-chat/claim-chat.component";
import { RodadaStatusComponent } from "../rodada-status/rodada-status.component";

/** Rota "/joiner/claims" — rodadas de claims: chat + status dos meus claims. */
@Component({
  selector: "app-joiner-claims",
  imports: [IconDirective, ClaimChatComponent, RodadaStatusComponent, ComprovanteChipComponent],
  templateUrl: "./joiner-claims.component.html",
  styleUrl: "./joiner-claims.component.scss",
})
export class JoinerClaimsComponent {
  /** Query param `?ceg=` — abre direto na rodada (ex.: vindo de uma notificação). */
  readonly ceg = input<string | undefined>();

  protected readonly auth = inject(AuthService);
  protected readonly claims = inject(ClaimsService);
  private readonly comprovantes = inject(ComprovanteService);

  protected readonly icons = { ArrowLeft, Hand, IdCard, Receipt };
  protected readonly CLAIM_META = CLAIM_STATUS_META;
  protected readonly brl = brl;

  /** Só rodadas agendadas aparecem para as joiners. */
  protected readonly rodadas = computed(() => {
    const ordem = { ABERTA: 0, AGENDADA: 1, ENCERRADA: 2, SEM_AGENDA: 3 };
    return this.claims
      .cegsDaJoiner()
      .map((ceg) => ({ ceg, estado: this.claims.estado(ceg.id) }))
      .filter((r) => r.estado !== "SEM_AGENDA")
      .sort((a, b) => ordem[a.estado] - ordem[b.estado]);
  });

  protected readonly selecionadaId = linkedSignal<string | null>(() => this.ceg() ?? null);

  protected readonly selecionada = computed(
    () => this.rodadas().find((r) => r.ceg.id === this.selecionadaId())?.ceg ?? null,
  );

  /** Dados que vão automaticamente em cada claim. */
  protected readonly perfil = computed(() => {
    const user = this.auth.user();
    if (!user) return null;
    return {
      nome: user.nome,
      username: user.username,
      telefone: telefoneDaJoiner(user.id, user.telefone),
    };
  });

  protected readonly meusClaims = computed(() => {
    const ceg = this.selecionada();
    if (!ceg) return [];
    const itens = new Map(this.claims.itensDa(ceg.id).map((i) => [i.id, i] as const));
    return this.claims
      .meusClaims()
      .filter((c) => c.cegId === ceg.id)
      .map((claim) => ({
        claim,
        item: itens.get(claim.itemId),
        posicao: claim.status === "PENDENTE" ? this.claims.posicaoNaFila(claim) : 0,
      }));
  });

  protected readonly totalConfirmado = computed(() =>
    this.meusClaims()
      .filter((m) => m.claim.status === "CONFIRMADO")
      .reduce((s, m) => s + (m.item?.valor ?? 0), 0),
  );

  /** Retorno do último envio (claims criados / itens ignorados). */
  protected readonly feedback = signal<{ tipo: "ok" | "aviso"; texto: string } | null>(null);

  /** Pagamento do item ganho: pix para a GOM + comprovante (ela confere e marca pago). */
  protected async enviarComprovante(item: CegItem): Promise<void> {
    const r = await this.comprovantes.pedir({
      titulo: `pagar #${item.codigo} ${item.nome}`,
      mensagem: "faça o pix para a GOM e anexe o comprovante — ela confere e confirma o pagamento.",
      valor: item.valor,
    });
    if (!r?.comprovante) return;
    const erro = this.claims.enviarComprovante(item.id, r.comprovante);
    this.feedback.set(
      erro
        ? { tipo: "aviso", texto: erro }
        : { tipo: "ok", texto: "comprovante enviado! a GOM confere e confirma o pagamento." },
    );
  }

  protected selecionar(id: string | null): void {
    this.selecionadaId.set(id);
    this.feedback.set(null);
  }

  protected enviar(texto: string): void {
    const ceg = this.selecionada();
    if (!ceg) return;
    const estado = this.claims.estado(ceg.id);
    this.feedback.set(feedbackDe(this.claims.enviar(ceg.id, texto), estado === "ABERTA"));
  }

  protected rodadaClass(id: string): string {
    return `flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
      this.selecionadaId() === id ? "bg-primary/10" : "hover:bg-muted/60"
    }`;
  }
}

function feedbackDe(
  r: ResultadoEnvio,
  aberta: boolean,
): { tipo: "ok" | "aviso"; texto: string } | null {
  if (r.erro) return { tipo: "aviso", texto: r.erro };
  const partes: string[] = [];
  if (r.claims.length > 0) {
    partes.push(
      `${r.claims.length} claim${r.claims.length > 1 ? "s" : ""} enviado${r.claims.length > 1 ? "s" : ""} — aguardando a GOM.`,
    );
  }
  for (const { item, motivo } of r.ignorados) partes.push(`#${item.codigo}: ${motivo}.`);
  if (partes.length > 0) {
    return { tipo: r.claims.length > 0 ? "ok" : "aviso", texto: partes.join(" ") };
  }
  // Mensagem comum: só avisa se parecia uma tentativa de claim com a rodada aberta
  return aberta
    ? { tipo: "aviso", texto: "nenhum item reconhecido — use o código (ex: 03) ou o nome exato." }
    : null;
}
