import { Component, computed, input, signal } from "@angular/core";
import {
  Check,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  MessageCircle,
  Package,
  Star,
  TriangleAlert,
  Truck,
} from "lucide-angular";
import {
  MODALIDADE_META,
  STATUS_ENVIO_META,
  etapaAntesDeAguardar,
  fluxoEnvio,
  formatarEndereco,
  linkRastreio,
  motivoAguardando,
  rotuloEtapa,
  type EnvioNacional,
} from "@/lib/envios-types";
import { AssinaturaComponent } from "@/shared/assinatura/assinatura.component";
import { ComprovanteChipComponent } from "@/shared/comprovante/comprovante-chip.component";
import { IconDirective } from "@/shared/icon.directive";

/**
 * Card de um envio nacional (GOM e joiner): status, itens, endereço, rastreio e as etapas
 * assinadas. As ações de cada visão entram por <ng-content>.
 */
@Component({
  selector: "app-envio-card",
  imports: [IconDirective, AssinaturaComponent, ComprovanteChipComponent],
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
    Clock,
    Copy,
    ExternalLink,
    MapPin,
    MessageCircle,
    Package,
    Star,
    TriangleAlert,
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

  /** Etapas lineares da modalidade; "aguardando" mostra a barra parada (em laranja) onde estava. */
  protected readonly etapas = computed(() => fluxoEnvio(this.envio().modalidade));
  protected readonly aguardando = computed(() => this.envio().status === "AGUARDANDO");
  protected readonly motivo = computed(() => motivoAguardando(this.envio()));
  protected readonly passo = computed(() => {
    const e = this.envio();
    return this.etapas().indexOf(e.status === "AGUARDANDO" ? etapaAntesDeAguardar(e) : e.status);
  });
  protected readonly estrelas = [1, 2, 3, 4, 5];

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

  protected fmtPrazo(iso: string): string {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  protected fmtData(iso: string): string {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }

  protected brl(v: number): string {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
}
