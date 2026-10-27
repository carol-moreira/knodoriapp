import { Component, computed, inject, input, output, signal } from "@angular/core";
import { Home, MapPin, Package, Send, X } from "lucide-angular";
import {
  BR_ESTADOS,
  ENDERECO_VAZIO,
  MODALIDADE_META,
  enderecoValido,
  type Endereco,
  type ItemEnvio,
  type ModalidadeEnvio,
} from "@/lib/envios-types";
import { AuthService } from "@/services/auth.service";
import { EnviosService } from "@/services/envios.service";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import { INPUT_CLS } from "@/components/gom/gerenciamento-cegs/cegs.model";

/** Joiner pede o envio nacional dos itens escolhidos: modalidade + endereço. */
@Component({
  selector: "app-solicitar-envio-modal",
  imports: [DialogComponent, IconDirective],
  templateUrl: "./solicitar-envio-modal.component.html",
  styleUrl: "./solicitar-envio-modal.component.scss",
})
export class SolicitarEnvioModalComponent {
  readonly itens = input.required<ItemEnvio[]>();
  readonly closed = output<void>();
  /** Envio criado. */
  readonly enviado = output<void>();

  private readonly auth = inject(AuthService);
  private readonly envios = inject(EnviosService);

  protected readonly icons = { Home, MapPin, Package, Send, X };
  protected readonly INPUT_CLS = INPUT_CLS;
  protected readonly estados = BR_ESTADOS;
  protected readonly MODALIDADE = MODALIDADE_META;
  protected readonly modalidades = Object.keys(MODALIDADE_META) as ModalidadeEnvio[];
  protected readonly val = inputValue;

  protected readonly modalidade = signal<ModalidadeEnvio>("PAC");
  /** Começa com o último endereço usado pela joiner. */
  protected readonly end = signal<Endereco>({
    ...(this.envios.ultimoEndereco(this.auth.user()?.id ?? "") ?? ENDERECO_VAZIO),
  });
  protected readonly observacao = signal("");
  protected readonly erro = signal("");

  protected readonly podeEnviar = computed(
    () => this.modalidade() === "RETIRADA" || enderecoValido(this.end()),
  );

  protected onOpenChange(open: boolean): void {
    if (!open) this.closed.emit();
  }

  protected field(k: keyof Endereco, e: Event): void {
    const v = inputValue(e);
    this.end.update((p) => ({ ...p, [k]: v }));
  }

  protected onCepInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const cep = input.value.replace(/\D/g, "").slice(0, 8);
    this.end.update((p) => ({ ...p, cep }));
    if (input.value !== cep) input.value = cep;
  }

  protected enviar(): void {
    const erro = this.envios.solicitar({
      itens: this.itens(),
      modalidade: this.modalidade(),
      endereco: this.end(),
      observacao: this.observacao(),
    });
    this.erro.set(erro ?? "");
    if (!erro) {
      this.enviado.emit();
      this.closed.emit();
    }
  }

  protected modalidadeClass(m: ModalidadeEnvio): string {
    return `flex flex-col items-start rounded-2xl border p-3 text-left transition ${
      this.modalidade() === m
        ? "border-primary bg-primary/10 text-foreground"
        : "border-border bg-card text-muted-foreground hover:bg-muted/50"
    }`;
  }
}
