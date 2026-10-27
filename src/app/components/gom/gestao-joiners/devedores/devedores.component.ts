import { Component, computed, inject, signal } from "@angular/core";
import { CheckCircle2, CircleAlert, Clock, Send } from "lucide-angular";
import {
  CobrancasService,
  TIPO_DEBITO_META,
  brl,
  type Devedor,
} from "@/services/cobrancas.service";
import { IconDirective } from "@/shared/icon.directive";
import { CobrancaWhatsappModalComponent } from "../cobranca-whatsapp-modal/cobranca-whatsapp-modal.component";
import { AssinaturaComponent } from "@/shared/assinatura/assinatura.component";

/** Joiners com pagamentos pendentes (itens, fretes e taxas) + cobrança pelo WhatsApp. */
@Component({
  selector: "app-devedores",
  imports: [IconDirective, CobrancaWhatsappModalComponent, AssinaturaComponent],
  templateUrl: "./devedores.component.html",
  styleUrl: "./devedores.component.scss",
})
export class DevedoresComponent {
  protected readonly cobrancas = inject(CobrancasService);

  protected readonly icons = { CheckCircle2, CircleAlert, Clock, Send };
  protected readonly TIPO_META = TIPO_DEBITO_META;
  protected readonly brl = brl;

  protected readonly cobrandoId = signal<string | null>(null);
  protected readonly cobrando = computed<Devedor | null>(
    () => this.cobrancas.devedores().find((d) => d.joinerId === this.cobrandoId()) ?? null,
  );

  protected iniciais(nome: string): string {
    return nome
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }

  protected fmtDataHora(iso: string): string {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
