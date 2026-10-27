import { Component, computed, inject, signal } from "@angular/core";
import { Search, Truck } from "lucide-angular";
import type { EnvioNacional } from "@/lib/envios-types";
import { EnviosService } from "@/services/envios.service";
import { ConfirmService } from "@/shared/confirm-dialog/confirm.service";
import { IconDirective } from "@/shared/icon.directive";
import { NumberValueDirective } from "@/shared/number-value.directive";
import { inputValue } from "@/shared/dom";
import { EnvioCardComponent } from "../envio-card/envio-card.component";

type Aba = "FAZER" | "JOINER" | "POSTADOS" | "CONCLUIDOS";

/** Em qual aba o envio aparece para a GOM. */
function abaDo(e: EnvioNacional): Aba {
  switch (e.status) {
    case "SOLICITADO":
    case "EM_SEPARACAO":
      return "FAZER";
    case "AGUARDANDO_PAGAMENTO":
      return e.pagamentoInformado ? "FAZER" : "JOINER";
    case "POSTADO":
      return "POSTADOS";
    default:
      return "CONCLUIDOS";
  }
}

const ABAS: { value: Aba; label: string }[] = [
  { value: "FAZER", label: "a fazer" },
  { value: "JOINER", label: "com a joiner" },
  { value: "POSTADOS", label: "postados" },
  { value: "CONCLUIDOS", label: "concluídos" },
];

/** Rota "/gom/envios" — envios nacionais da comunidade: frete, pagamento, postagem e entrega. */
@Component({
  selector: "app-gom-envios",
  imports: [IconDirective, NumberValueDirective, EnvioCardComponent],
  templateUrl: "./gom-envios.component.html",
  styleUrl: "./gom-envios.component.scss",
})
export class GomEnviosComponent {
  protected readonly envios = inject(EnviosService);
  private readonly confirm = inject(ConfirmService);

  protected readonly icons = { Search, Truck };
  protected readonly abas = ABAS;
  protected readonly val = inputValue;

  protected readonly aba = signal<Aba>("FAZER");
  protected readonly busca = signal("");

  /** Valores digitados por envio (frete e rastreio). */
  protected readonly fretes = signal<Partial<Record<string, number>>>({});
  protected readonly rastreios = signal<Partial<Record<string, string>>>({});
  protected readonly erros = signal<Partial<Record<string, string>>>({});

  protected readonly contagem = computed(() => {
    const c: Record<Aba, number> = { FAZER: 0, JOINER: 0, POSTADOS: 0, CONCLUIDOS: 0 };
    for (const e of this.envios.daComunidade()) c[abaDo(e)]++;
    return c;
  });

  protected readonly lista = computed(() => {
    const q = this.busca().trim().toLowerCase();
    return this.envios
      .daComunidade()
      .filter((e) => abaDo(e) === this.aba())
      .filter(
        (e) =>
          !q ||
          e.joinerNome.toLowerCase().includes(q) ||
          e.joinerUsername.toLowerCase().includes(q) ||
          (e.rastreio ?? "").toLowerCase().includes(q),
      );
  });

  protected informarFrete(e: EnvioNacional): void {
    this.setErro(e.id, this.envios.informarFrete(e.id, this.fretes()[e.id] ?? 0));
  }

  protected postar(e: EnvioNacional): void {
    this.setErro(e.id, this.envios.postar(e.id, this.rastreios()[e.id] ?? ""));
  }

  protected async cancelar(e: EnvioNacional): Promise<void> {
    const ok = await this.confirm.confirmar({
      titulo: `cancelar o envio de ${e.joinerNome}?`,
      mensagem: "os itens voltam para “prontos para envio” e a joiner é avisada.",
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

  private setErro(id: string, erro: string | null): void {
    this.erros.update((x) => ({ ...x, [id]: erro ?? undefined }));
  }

  protected abaClass(a: Aba): string {
    return `flex shrink-0 items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-xs font-medium transition ${
      this.aba() === a
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted text-muted-foreground hover:text-foreground"
    }`;
  }

  protected brl(v: number): string {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
}
