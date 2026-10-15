import { Component, computed, inject, input, linkedSignal, output, signal } from "@angular/core";
import { CheckCircle2, ExternalLink, Phone, Send, X } from "lucide-angular";
import { AuthService } from "@/services/auth.service";
import {
  CobrancasService,
  TIPO_DEBITO_META,
  brl,
  mensagemCobranca,
  telefoneWhatsApp,
  type Debito,
  type Devedor,
} from "@/services/cobrancas.service";
import { DialogComponent } from "@/shared/dialog.component";
import { inputValue } from "@/shared/dom";
import { IconDirective } from "@/shared/icon.directive";

/** GOM escolhe o que cobrar (itens / frete / taxas) e envia a cobrança pelo WhatsApp. */
@Component({
  selector: "app-cobranca-whatsapp-modal",
  imports: [DialogComponent, IconDirective],
  templateUrl: "./cobranca-whatsapp-modal.component.html",
  styleUrl: "./cobranca-whatsapp-modal.component.scss",
})
export class CobrancaWhatsappModalComponent {
  readonly open = input.required<boolean>();
  readonly devedor = input.required<Devedor | null>();
  readonly closed = output<void>();

  private readonly auth = inject(AuthService);
  private readonly cobrancas = inject(CobrancasService);

  protected readonly icons = { CheckCircle2, ExternalLink, Phone, Send, X };
  protected readonly TIPO_META = TIPO_DEBITO_META;
  protected readonly brl = brl;
  protected readonly val = inputValue;

  /** Ao abrir, todos os débitos vêm marcados. */
  protected readonly selecionados = linkedSignal<Set<string>>(() => {
    this.open();
    return new Set(this.devedor()?.debitos.map((d) => d.id) ?? []);
  });

  protected readonly debitosSelecionados = computed<Debito[]>(() => {
    const sel = this.selecionados();
    return this.devedor()?.debitos.filter((d) => sel.has(d.id)) ?? [];
  });

  protected readonly total = computed(() =>
    this.debitosSelecionados().reduce((t, d) => t + d.valor, 0),
  );

  /** Gerada a partir da seleção; a GOM pode editar (mudar a seleção regenera o texto). */
  protected readonly mensagem = linkedSignal(() => {
    const devedor = this.devedor();
    const debitos = this.debitosSelecionados();
    if (!devedor || debitos.length === 0) return "";
    return mensagemCobranca(devedor, debitos, this.auth.user()?.username ?? "sua GOM");
  });

  protected readonly telefone = computed(() => {
    const tel = this.devedor()?.telefone;
    return tel ? telefoneWhatsApp(tel) : null;
  });

  /** Fallback: abre o WhatsApp da própria GOM com a mensagem pronta. */
  protected readonly linkWhatsApp = computed(() => {
    const tel = this.telefone();
    return tel ? `https://wa.me/${tel}?text=${encodeURIComponent(this.mensagem())}` : null;
  });

  protected readonly podeEnviar = computed(
    () => !!this.telefone() && this.debitosSelecionados().length > 0 && !!this.mensagem().trim(),
  );

  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly erro = signal("");

  protected toggle(id: string): void {
    this.selecionados.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open && !this.sending()) {
      this.erro.set("");
      this.sent.set(false);
      this.closed.emit();
    }
  }

  protected async enviar(): Promise<void> {
    const devedor = this.devedor();
    if (!devedor || !this.podeEnviar()) return;
    this.sending.set(true);
    this.erro.set("");
    try {
      await this.cobrancas.enviarWhatsApp(devedor, this.debitosSelecionados(), this.mensagem());
      this.sent.set(true);
      setTimeout(() => this.onOpenChange(false), 1100);
    } catch {
      this.erro.set("não foi possível enviar pelo WhatsApp. tente abrir no seu WhatsApp.");
    } finally {
      this.sending.set(false);
    }
  }

  /** Enviada manualmente pelo WhatsApp da GOM — só registra e avisa a joiner no app. */
  protected registrarManual(): void {
    const devedor = this.devedor();
    if (!devedor || !this.podeEnviar()) return;
    const debitos = this.debitosSelecionados();
    const mensagem = this.mensagem();
    // Depois do clique: o link precisa continuar no DOM para o navegador abrir o WhatsApp
    setTimeout(() => {
      this.cobrancas.registrar(devedor, debitos, mensagem);
      this.onOpenChange(false);
    });
  }

  protected fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }
}
