import { Component, computed, inject, signal } from "@angular/core";
import { Search, TriangleAlert, Truck } from "lucide-angular";
import {
  ANTES_DE_POSTAR,
  ETAPAS_ENVIO,
  STATUS_ENVIO_META,
  etapaAntesDeAguardar,
  type EnvioNacional,
  type StatusEnvio,
} from "@/lib/envios-types";
import { EnviosService } from "@/services/envios.service";
import { ComprovanteService } from "@/shared/comprovante/comprovante.service";
import { ConfirmService } from "@/shared/confirm-dialog/confirm.service";
import { IconDirective } from "@/shared/icon.directive";
import { NumberValueDirective } from "@/shared/number-value.directive";
import { inputValue } from "@/shared/dom";
import { EnvioCardComponent } from "../envio-card/envio-card.component";

/** "a fazer" = o que espera a GOM (mesma regra do badge da nav). */
type Filtro = "A_FAZER" | "TODOS" | StatusEnvio;

/** Rota "/gom/envios" — envios nacionais da comunidade: embalar, cotar, conferir, postar, entregar. */
@Component({
  selector: "app-gom-envios",
  imports: [IconDirective, NumberValueDirective, EnvioCardComponent],
  templateUrl: "./gom-envios.component.html",
  styleUrl: "./gom-envios.component.scss",
})
export class GomEnviosComponent {
  protected readonly envios = inject(EnviosService);
  private readonly confirm = inject(ConfirmService);
  private readonly comprovantes = inject(ComprovanteService);

  protected readonly icons = { Search, TriangleAlert, Truck };
  protected readonly STATUS = STATUS_ENVIO_META;
  protected readonly val = inputValue;

  /** Filtros na ordem oficial dos status. */
  protected readonly filtros: { value: Filtro; label: string }[] = [
    { value: "A_FAZER", label: "a fazer" },
    { value: "TODOS", label: "todos" },
    ...ETAPAS_ENVIO.map((s) => ({ value: s as Filtro, label: STATUS_ENVIO_META[s].label })),
  ];

  protected readonly filtro = signal<Filtro>("A_FAZER");
  protected readonly busca = signal("");

  /** Valores digitados por envio (frete, rastreio, motivo do "aguardando"). */
  protected readonly fretes = signal<Partial<Record<string, number>>>({});
  protected readonly rastreios = signal<Partial<Record<string, string>>>({});
  protected readonly motivos = signal<Partial<Record<string, string>>>({});
  /** Envio com o formulário de "aguardando" aberto. */
  protected readonly aguardandoId = signal<string | null>(null);
  protected readonly erros = signal<Partial<Record<string, string>>>({});

  private readonly aFazer = computed(() => new Set(this.envios.pendentesGom().map((e) => e.id)));

  protected readonly contagem = computed(() => {
    const c: Partial<Record<Filtro, number>> = {
      A_FAZER: this.aFazer().size,
      TODOS: this.envios.daComunidade().length,
    };
    for (const e of this.envios.daComunidade()) c[e.status] = (c[e.status] ?? 0) + 1;
    return c;
  });

  protected readonly lista = computed(() => {
    const q = this.busca().trim().toLowerCase();
    const f = this.filtro();
    return this.envios
      .daComunidade()
      .filter((e) => f === "TODOS" || (f === "A_FAZER" ? this.aFazer().has(e.id) : e.status === f))
      .filter(
        (e) =>
          !q ||
          e.joinerNome.toLowerCase().includes(q) ||
          e.joinerUsername.toLowerCase().includes(q) ||
          (e.rastreio ?? "").toLowerCase().includes(q),
      );
  });

  /** Pode ir para "aguardando": antes de postar, ou já postado (retenção na transportadora). */
  protected podeAguardar(e: EnvioNacional): boolean {
    return ANTES_DE_POSTAR.includes(e.status) || e.status === "A_CAMINHO";
  }

  protected podeCancelar(e: EnvioNacional): boolean {
    const etapa = e.status === "AGUARDANDO" ? etapaAntesDeAguardar(e) : e.status;
    return ANTES_DE_POSTAR.includes(etapa);
  }

  protected enviarCotacao(e: EnvioNacional): void {
    this.setErro(e.id, this.envios.enviarCotacao(e.id, this.fretes()[e.id] ?? 0));
  }

  protected postar(e: EnvioNacional): void {
    this.setErro(e.id, this.envios.postar(e.id, this.rastreios()[e.id] ?? ""));
  }

  /** Conferir o comprovante da joiner, ou anexar um (pix recebido por fora do app). */
  protected async confirmarPagamento(e: EnvioNacional): Promise<void> {
    const r = await this.comprovantes.pedir({
      titulo: `frete de ${e.joinerUsername}`,
      mensagem: e.comprovantes?.length
        ? "confira o comprovante que a joiner enviou antes de confirmar."
        : "anexe o comprovante do pagamento que você recebeu.",
      valor: e.frete,
      existentes: e.comprovantes,
      confirmar: "confirmar frete pago",
    });
    if (r) this.setErro(e.id, this.envios.confirmarPagamento(e.id, r.comprovante));
  }

  protected marcarAguardando(e: EnvioNacional): void {
    const erro = this.envios.marcarAguardando(e.id, this.motivos()[e.id] ?? "");
    this.setErro(e.id, erro);
    if (!erro) {
      this.aguardandoId.set(null);
      this.motivos.update((m) => ({ ...m, [e.id]: undefined }));
    }
  }

  protected async cancelar(e: EnvioNacional): Promise<void> {
    const ok = await this.confirm.confirmar({
      titulo: `cancelar o envio de ${e.joinerNome}?`,
      mensagem:
        "o pedido de envio é apagado, os itens voltam para “prontos para envio” e a joiner é avisada.",
      confirmar: "cancelar envio",
      cancelar: "voltar",
    });
    if (ok) this.envios.cancelar(e.id);
  }

  protected setFrete(id: string, e: Event): void {
    this.fretes.update((f) => ({ ...f, [id]: +inputValue(e) }));
  }

  protected setRastreio(id: string, e: Event): void {
    this.rastreios.update((r) => ({ ...r, [id]: inputValue(e) }));
  }

  protected setMotivo(id: string, e: Event): void {
    this.motivos.update((m) => ({ ...m, [id]: inputValue(e) }));
  }

  private setErro(id: string, erro: string | null): void {
    this.erros.update((x) => ({ ...x, [id]: erro ?? undefined }));
  }

  protected filtroClass(f: Filtro): string {
    return `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-3.5 py-1.5 text-xs font-medium transition ${
      this.filtro() === f
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted text-muted-foreground hover:text-foreground"
    }`;
  }

  protected brl(v: number): string {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
}
