import { Component, computed, input, signal } from "@angular/core";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  MapPin,
  MessageCircle,
  Package,
  Truck,
} from "lucide-angular";
import {
  ETAPAS_ENVIO,
  MODALIDADE_META,
  STATUS_ENVIO_META,
  formatarEndereco,
  linkRastreio,
  rotuloEtapa,
  type EnvioNacional,
} from "@/lib/envios-types";
import { AssinaturaComponent } from "@/shared/assinatura/assinatura.component";
import { IconDirective } from "@/shared/icon.directive";

/**
 * Card de um envio nacional (GOM e joiner): status, itens, endereço, rastreio e as etapas
 * assinadas. As ações de cada visão entram por <ng-content>.
 */
@Component({
  selector: "app-envio-card",
  imports: [IconDirective, AssinaturaComponent],
  templateUrl: "./envio-card.component.html",
  styleUrl: "./envio-card.component.scss",
})
export class EnvioCardComponent {
  readonly envio = input.required<EnvioNacional>();
  /** GOM vê a joiner e o endereço completo com botão de copiar. */
  readonly visao = input<"gom" | "joiner">("joiner");

  protected readonly icons = {
    Check,
    ChevronDown,
    Copy,
    ExternalLink,
    MapPin,
    MessageCircle,
    Package,
    Truck,
  };
  protected readonly MODALIDADE = MODALIDADE_META;
  protected readonly STATUS = STATUS_ENVIO_META;
  protected readonly rotulo = rotuloEtapa;
  protected readonly linkRastreio = linkRastreio;

  protected readonly etapasAberto = signal(false);
  protected readonly copiado = signal<"endereco" | "rastreio" | null>(null);

  protected readonly endereco = computed(() => {
    const e = this.envio().endereco;
    return e ? formatarEndereco(e) : "";
  });

  /** Progresso nas 5 etapas (cancelado não tem barra). */
  protected readonly passo = computed(() => ETAPAS_ENVIO.indexOf(this.envio().status));
  protected readonly etapas = ETAPAS_ENVIO;

  protected readonly whatsapp = computed(() => {
    const tel = this.envio().joinerTelefone?.replace(/\D/g, "");
    return tel ? `https://wa.me/55${tel}` : null;
  });

  protected async copiar(qual: "endereco" | "rastreio"): Promise<void> {
    const texto = qual === "endereco" ? this.endereco() : (this.envio().rastreio ?? "");
    try {
      await navigator.clipboard.writeText(texto);
      this.copiado.set(qual);
      setTimeout(() => this.copiado.set(null), 1500);
    } catch {
      // clipboard bloqueado (ex.: http) — o texto continua visível para copiar à mão
    }
  }

  protected fmtData(iso: string): string {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }

  protected brl(v: number): string {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
}
