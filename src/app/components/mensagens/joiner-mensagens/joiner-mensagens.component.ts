import { Component, computed, effect, inject, input } from "@angular/core";
import { MessageCircle } from "lucide-angular";
import { AuthService } from "@/services/auth.service";
import { MensagensService } from "@/services/mensagens.service";
import { PedidosMercariService } from "@/services/pedidos-mercari.service";
import { IconDirective } from "@/shared/icon.directive";
import { ChatThreadComponent, type NovaMensagem } from "../chat-thread/chat-thread.component";

/** Rota "/joiner/mensagens" — conversa da joiner com a GOM. */
@Component({
  selector: "app-joiner-mensagens",
  imports: [IconDirective, ChatThreadComponent],
  templateUrl: "./joiner-mensagens.component.html",
  styleUrl: "./joiner-mensagens.component.scss",
})
export class JoinerMensagensComponent {
  /** Query param `?pedido=` — já abre com o pedido vinculado (botão do card de compras). */
  readonly pedido = input<string | undefined>();

  protected readonly auth = inject(AuthService);
  private readonly mensagensService = inject(MensagensService);
  private readonly pedidosService = inject(PedidosMercariService);

  protected readonly icons = { MessageCircle };

  protected readonly conversa = this.mensagensService.conversaDaJoiner();

  protected readonly mensagens = computed(() =>
    this.conversa ? this.mensagensService.daConversa(this.conversa.id) : [],
  );

  protected readonly meusPedidos = computed(() => {
    const userId = this.auth.user()?.id;
    return this.pedidosService.solicitacoes().filter((s) => s.joinerId === userId);
  });

  constructor() {
    // Abrir a conversa (ou receber mensagem com ela aberta) marca como lida
    effect(() => {
      this.mensagens();
      if (this.conversa) this.mensagensService.marcarLidas(this.conversa.id);
    });
  }

  protected enviar(nova: NovaMensagem): void {
    if (this.conversa) this.mensagensService.enviar(this.conversa.id, nova);
  }
}
