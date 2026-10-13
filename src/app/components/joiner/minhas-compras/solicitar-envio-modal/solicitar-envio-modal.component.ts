import { Component, computed, effect, input, output, signal } from "@angular/core";
import { CheckCircle2, Home, MapPin, Send, X } from "lucide-angular";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import {
  BR_ESTADOS,
  INPUT_CLS,
  brl,
  type Endereco,
  type PedidoJoiner,
} from "../minhas-compras.model";

const ENDERECO_VAZIO: Endereco = {
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "SP",
};

@Component({
  selector: "app-solicitar-envio-modal",
  imports: [DialogComponent, IconDirective],
  templateUrl: "./solicitar-envio-modal.component.html",
  styleUrl: "./solicitar-envio-modal.component.scss",
})
export class SolicitarEnvioModalComponent {
  readonly open = input.required<boolean>();
  readonly pedido = input.required<PedidoJoiner | null>();
  readonly closed = output<void>();

  protected readonly icons = { CheckCircle2, Home, MapPin, Send, X };
  protected readonly INPUT_CLS = INPUT_CLS;
  protected readonly estados = BR_ESTADOS;
  protected readonly brl = brl;

  protected readonly end = signal<Endereco>({ ...ENDERECO_VAZIO });
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);

  protected readonly canSend = computed(() => {
    const end = this.end();
    return !!(end.cep.length >= 8 && end.rua.trim() && end.numero.trim() && end.cidade.trim());
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.end.set({ ...ENDERECO_VAZIO });
        this.sent.set(false);
      }
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open && !this.sending()) this.closed.emit();
  }

  protected field(k: keyof Endereco, e: Event): void {
    const v = inputValue(e);
    this.end.update((p) => ({ ...p, [k]: v }));
  }

  protected onCepInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const cep = input.value.replace(/\D/g, "").slice(0, 8);
    this.end.update((p) => ({ ...p, cep }));
    // Input controlado: reflete o valor normalizado mesmo quando o estado não muda
    if (input.value !== cep) input.value = cep;
  }

  protected async handleSend(): Promise<void> {
    if (!this.pedido() || !this.canSend()) return;
    this.sending.set(true);
    // 🔌 await fetch(`/api/joiner/${userId}/envio-nacional`, { method: "POST", ... })
    await new Promise((r) => setTimeout(r, 800));
    this.sending.set(false);
    this.sent.set(true);
    setTimeout(() => {
      this.sent.set(false);
      this.closed.emit();
    }, 1100);
  }
}
