import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  viewChild,
} from "@angular/core";
import { Hand, Lock, MessagesSquare, SendHorizontal, Sparkles, Timer } from "lucide-angular";
import {
  CLAIM_STATUS_META,
  ITEM_STATUS_META,
  type CegItem,
  type Claim,
  type ClaimMensagem,
} from "@/lib/claims-types";
import { ClaimsService } from "@/services/claims.service";
import { IconDirective } from "@/shared/icon.directive";
import { brl } from "@/components/gom/gerenciamento-cegs/cegs.model";

interface LinhaChat {
  mensagem: ClaimMensagem;
  minha: boolean;
  claims: { claim: Claim; item: CegItem | undefined; posicao: number }[];
}

/**
 * Chat de uma rodada de claims. Mensagens de claim mostram cada item pedido com o status e,
 * enquanto pendente, a posição na fila. A joiner tem atalhos com os itens disponíveis.
 */
@Component({
  selector: "app-claim-chat",
  imports: [IconDirective],
  templateUrl: "./claim-chat.component.html",
  styleUrl: "./claim-chat.component.scss",
})
export class ClaimChatComponent {
  readonly cegId = input.required<string>();
  readonly meuId = input.required<string>();
  /** Joiner: mostra os atalhos de itens e o feedback do parse. */
  readonly modoJoiner = input(false);

  /** Mensagem enviada — o pai mostra o resultado (claims criados / ignorados). */
  readonly enviado = output<string>();

  protected readonly claimsService = inject(ClaimsService);

  protected readonly icons = { Hand, Lock, MessagesSquare, SendHorizontal, Sparkles, Timer };
  protected readonly CLAIM_META = CLAIM_STATUS_META;
  protected readonly ITEM_META = ITEM_STATUS_META;
  protected readonly brl = brl;

  protected readonly texto = linkedSignal(() => {
    this.cegId();
    return "";
  });

  protected readonly estado = computed(() => this.claimsService.estado(this.cegId()));
  protected readonly itens = computed(() => this.claimsService.itensDa(this.cegId()));
  protected readonly atalhos = computed(() =>
    this.itens().filter((i) => i.status !== "CONFIRMADO"),
  );

  private readonly scroller = viewChild<ElementRef<HTMLElement>>("scroller");

  protected readonly linhas = computed<LinhaChat[]>(() => {
    const itens = new Map(this.itens().map((i) => [i.id, i] as const));
    return this.claimsService.mensagensDa(this.cegId()).map((m) => ({
      mensagem: m,
      minha: m.autorId === this.meuId(),
      claims: (m.claimIds ?? [])
        .map((id) => this.claimsService.claimPorId(id))
        .filter((c): c is Claim => !!c)
        .map((claim) => ({
          claim,
          item: itens.get(claim.itemId),
          posicao: claim.status === "PENDENTE" ? this.claimsService.posicaoNaFila(claim) : 0,
        })),
    }));
  });

  constructor() {
    afterRenderEffect(() => {
      this.linhas();
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  /** Acrescenta o código do item ao rascunho. */
  protected inserirCodigo(item: CegItem): void {
    const atual = this.texto().trim();
    this.texto.set(atual ? `${atual} ${item.codigo}` : item.codigo);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.submit();
    }
  }

  protected submit(): void {
    const texto = this.texto().trim();
    if (!texto) return;
    this.enviado.emit(texto);
    this.texto.set("");
  }

  protected placeholder(): string {
    if (!this.modoJoiner()) return "mensagem para a sala…";
    return this.estado() === "ABERTA"
      ? "digite o código do item (ex: 03 ou 03 e 05)…"
      : "os claims ainda não estão abertos — dá pra conversar :)";
  }

  protected fmtHora(iso: string): string {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  protected bolhaClass(linha: LinhaChat): string {
    if (linha.minha) return "rounded-2xl rounded-br-md bg-primary text-primary-foreground";
    return linha.mensagem.tipo === "CLAIM"
      ? "rounded-2xl rounded-bl-md border border-amber-200 bg-amber-50/60 text-foreground dark:border-amber-500/30 dark:bg-amber-500/10"
      : "rounded-2xl rounded-bl-md border border-border/60 bg-muted/60 text-foreground";
  }
}
