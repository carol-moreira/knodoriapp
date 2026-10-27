import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from "@angular/core";
import { ImagePlus, Link2, MessageCircle, SendHorizontal, X } from "lucide-angular";
import { ImageLightboxComponent } from "@/components/joiner/minhas-compras/image-lightbox/image-lightbox.component";
import { MERCARI_STATUS_META, type SolicitacaoGOM } from "@/lib/gom-types";
import { resumoItens, type Mensagem } from "@/lib/mensagens-types";
import { IconDirective } from "@/shared/icon.directive";
import { ConfirmService } from "@/shared/confirm-dialog/confirm.service";
import { AssinaturaComponent } from "@/shared/assinatura/assinatura.component";

const MAX_IMAGENS = 4;
const MAX_IMAGEM_BYTES = 4 * 1024 * 1024;

export interface NovaMensagem {
  texto: string;
  pedidoId?: string;
  imagens?: string[];
}

interface LinhaMensagem {
  mensagem: Mensagem;
  minha: boolean;
  pedido: SolicitacaoGOM | undefined;
  /** Rótulo do dia, só na primeira mensagem de cada dia. */
  dia: string | null;
}

/** Thread de mensagens + campo de envio (com vínculo opcional a um pedido). */
@Component({
  selector: "app-chat-thread",
  imports: [IconDirective, ImageLightboxComponent, AssinaturaComponent],
  templateUrl: "./chat-thread.component.html",
  styleUrl: "./chat-thread.component.scss",
})
export class ChatThreadComponent {
  private readonly confirm = inject(ConfirmService);

  /** Trocar de conversa limpa o rascunho e o pedido vinculado. */
  readonly conversaId = input.required<string>();
  readonly mensagens = input.required<Mensagem[]>();
  readonly meuId = input.required<string>();
  /** Pedidos da joiner da conversa — podem ser vinculados às mensagens. */
  readonly pedidos = input<SolicitacaoGOM[]>([]);
  /** Pedido já selecionado ao abrir (ex.: vindo do card em minhas compras). */
  readonly pedidoInicial = input<string | null>(null);
  readonly placeholder = input("escreva uma mensagem…");

  readonly enviar = output<NovaMensagem>();

  protected readonly icons = { ImagePlus, Link2, MessageCircle, SendHorizontal, X };
  protected readonly STATUS_META = MERCARI_STATUS_META;
  protected readonly resumoItens = resumoItens;
  protected readonly MAX_IMAGENS = MAX_IMAGENS;

  protected readonly texto = linkedSignal(() => {
    this.conversaId();
    return "";
  });
  protected readonly pedidoId = linkedSignal<string | null>(() => {
    this.conversaId();
    return this.pedidoInicial();
  });
  /** Imagens anexadas ao rascunho (data URLs). */
  protected readonly anexos = linkedSignal<string[]>(() => {
    this.conversaId();
    return [];
  });
  protected readonly erro = linkedSignal(() => {
    this.conversaId();
    return "";
  });

  /** Imagens abertas no lightbox (as da mensagem clicada). */
  protected readonly lightbox = signal<{ imagens: string[]; index: number } | null>(null);

  protected readonly podeEnviar = computed(
    () => this.texto().trim().length > 0 || this.anexos().length > 0,
  );

  private readonly scroller = viewChild<ElementRef<HTMLElement>>("scroller");

  private readonly pedidosPorId = computed(
    () => new Map(this.pedidos().map((p) => [p.id, p] as const)),
  );

  protected readonly pedidoSelecionado = computed(() => {
    const id = this.pedidoId();
    return id ? this.pedidosPorId().get(id) : undefined;
  });

  protected readonly linhas = computed<LinhaMensagem[]>(() => {
    let diaAnterior = "";
    return this.mensagens().map((m) => {
      const dia = fmtDia(m.data);
      const novoDia = dia !== diaAnterior;
      diaAnterior = dia;
      return {
        mensagem: m,
        minha: m.autorId === this.meuId(),
        pedido: m.pedidoId ? this.pedidosPorId().get(m.pedidoId) : undefined,
        dia: novoDia ? dia : null,
      };
    });
  });

  constructor() {
    // Mantém a conversa rolada até a última mensagem
    afterRenderEffect(() => {
      this.mensagens();
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    // Enter envia; Shift+Enter quebra a linha
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.submit();
    }
  }

  protected submit(): void {
    if (!this.podeEnviar()) return;
    this.enviar.emit({
      texto: this.texto().trim(),
      pedidoId: this.pedidoId() ?? undefined,
      imagens: this.anexos(),
    });
    this.texto.set("");
    this.pedidoId.set(null);
    this.anexos.set([]);
    this.erro.set("");
  }

  protected handleFiles(e: Event): void {
    const input = e.target as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = "";
    this.erro.set("");

    const vagas = MAX_IMAGENS - this.anexos().length;
    if (files.length > vagas) {
      this.erro.set(`máximo de ${MAX_IMAGENS} imagens por mensagem.`);
    }
    for (const file of files.slice(0, Math.max(vagas, 0))) {
      if (!file.type.startsWith("image/")) {
        this.erro.set("selecione apenas imagens (JPG, PNG, WebP).");
        continue;
      }
      if (file.size > MAX_IMAGEM_BYTES) {
        this.erro.set(`${file.name} é muito grande. máximo 4 MB por imagem.`);
        continue;
      }
      // 🔌 em produção: upload para o storage e enviar só a URL
      const reader = new FileReader();
      reader.onload = (ev) => this.anexos.update((a) => [...a, ev.target?.result as string]);
      reader.readAsDataURL(file);
    }
  }

  protected async removerAnexo(i: number): Promise<void> {
    const ok = await this.confirm.confirmar({ titulo: `excluir a imagem ${i + 1}?` });
    if (ok) this.anexos.update((a) => a.filter((_, idx) => idx !== i));
  }

  protected gradeImagens(qtd: number): string {
    return `grid gap-1 ${qtd === 1 ? "grid-cols-1" : "grid-cols-2"}`;
  }

  protected selecionarPedido(id: string): void {
    this.pedidoId.set(id || null);
  }

  protected fmtHora(iso: string): string {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  protected bolhaClass(minha: boolean): string {
    return minha
      ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground"
      : "rounded-2xl rounded-bl-md border border-border/60 bg-muted/60 text-foreground";
  }
}

function fmtDia(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}
