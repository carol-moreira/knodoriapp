import { Component, computed, effect, inject, signal } from "@angular/core";
import { ArrowLeft, Link2, MessageCircle, Search, SquarePen } from "lucide-angular";
import { MOCK_JOINERS } from "@/lib/gom-types";
import type { Conversa, Mensagem } from "@/lib/mensagens-types";
import { AuthService } from "@/services/auth.service";
import { MensagensService } from "@/services/mensagens.service";
import { PedidosMercariService } from "@/services/pedidos-mercari.service";
import { IconDirective } from "@/shared/icon.directive";
import { ChatThreadComponent, type NovaMensagem } from "../chat-thread/chat-thread.component";

interface ItemConversa {
  conversa: Conversa;
  ultima: Mensagem | undefined;
  naoLidas: number;
}

/** Rota "/gom/mensagens" — caixa de entrada da GOM com todas as joiners. */
@Component({
  selector: "app-gom-mensagens",
  imports: [IconDirective, ChatThreadComponent],
  templateUrl: "./gom-mensagens.component.html",
  styleUrl: "./gom-mensagens.component.scss",
})
export class GomMensagensComponent {
  protected readonly auth = inject(AuthService);
  private readonly mensagensService = inject(MensagensService);
  private readonly pedidosService = inject(PedidosMercariService);

  protected readonly icons = { ArrowLeft, Link2, MessageCircle, Search, SquarePen };

  protected readonly busca = signal("");
  protected readonly selecionadaId = signal<string | null>(null);

  protected readonly conversas = computed<ItemConversa[]>(() => {
    const termo = this.busca().trim().toLowerCase();
    return this.mensagensService
      .minhasConversas()
      .filter(
        (c) =>
          !termo ||
          c.joinerNome.toLowerCase().includes(termo) ||
          c.joinerUsername.toLowerCase().includes(termo),
      )
      .map((conversa) => ({
        conversa,
        ultima: this.mensagensService.ultimaMensagem(conversa.id),
        naoLidas: this.mensagensService.naoLidasDa(conversa.id),
      }))
      .sort((a, b) => (b.ultima?.data ?? "").localeCompare(a.ultima?.data ?? ""));
  });

  /** Joiners da GOM que ainda não têm conversa (para iniciar uma). */
  protected readonly semConversa = computed(() => {
    const comConversa = new Set(this.mensagensService.minhasConversas().map((c) => c.joinerId));
    return MOCK_JOINERS.filter((j) => !comConversa.has(j.id));
  });

  protected readonly selecionada = computed(
    () =>
      this.mensagensService.minhasConversas().find((c) => c.id === this.selecionadaId()) ?? null,
  );

  protected readonly mensagens = computed(() => {
    const c = this.selecionada();
    return c ? this.mensagensService.daConversa(c.id) : [];
  });

  /** Pedidos da joiner da conversa aberta (para vincular às mensagens). */
  protected readonly pedidosDaJoiner = computed(() => {
    const c = this.selecionada();
    return c ? this.pedidosService.solicitacoes().filter((s) => s.joinerId === c.joinerId) : [];
  });

  constructor() {
    effect(() => {
      this.mensagens();
      const c = this.selecionada();
      if (c) this.mensagensService.marcarLidas(c.id);
    });
  }

  protected iniciarConversa(joinerId: string): void {
    const joiner = MOCK_JOINERS.find((j) => j.id === joinerId);
    if (!joiner) return;
    const conversa = this.mensagensService.abrirConversa(joiner);
    this.selecionadaId.set(conversa.id);
  }

  protected enviar(nova: NovaMensagem): void {
    const c = this.selecionada();
    if (c) this.mensagensService.enviar(c.id, nova);
  }

  protected iniciais(nome: string): string {
    return nome
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }

  protected previa(item: ItemConversa): string {
    const m = item.ultima;
    if (!m) return "nenhuma mensagem ainda";
    const conteudo = m.texto || `📷 ${m.imagens?.length === 1 ? "imagem" : "imagens"}`;
    return (m.autorId === item.conversa.gomId ? "você: " : "") + conteudo;
  }

  protected fmtQuando(iso: string): string {
    const d = new Date(iso);
    const hoje = new Date();
    return d.toDateString() === hoje.toDateString()
      ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }

  protected itemClass(item: ItemConversa): string {
    return (
      "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition " +
      (item.conversa.id === this.selecionadaId() ? "bg-primary/10" : "hover:bg-muted/60")
    );
  }
}
