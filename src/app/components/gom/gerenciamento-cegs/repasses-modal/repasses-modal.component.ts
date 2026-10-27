import { Component, computed, inject, input, output, signal } from "@angular/core";
import { CheckCircle2, CreditCard, Plus, X } from "lucide-angular";
import { AutofocusDirective } from "@/shared/autofocus.directive";
import { ComprovanteChipComponent } from "@/shared/comprovante/comprovante-chip.component";
import { ComprovanteService } from "@/shared/comprovante/comprovante.service";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import { REPASSE_META, brl, fmtDate, type CegGOM, type Repasse } from "../cegs.model";

export interface RepasseUpdate {
  cegId: string;
  updated: Repasse;
}

@Component({
  selector: "app-repasses-modal",
  imports: [DialogComponent, IconDirective, AutofocusDirective, ComprovanteChipComponent],
  templateUrl: "./repasses-modal.component.html",
  styleUrl: "./repasses-modal.component.scss",
})
export class RepassesModalComponent {
  readonly open = input.required<boolean>();
  readonly ceg = input.required<CegGOM | null>();
  readonly repasses = input.required<Repasse[]>();
  readonly closed = output<void>();
  readonly updated = output<RepasseUpdate>();

  private readonly comprovantes = inject(ComprovanteService);

  protected readonly icons = { CheckCircle2, CreditCard, Plus, X };
  protected readonly REPASSE_META = REPASSE_META;
  protected readonly brl = brl;
  protected readonly fmtDate = fmtDate;
  protected readonly val = inputValue;

  protected readonly registrandoId = signal<string | null>(null);
  protected readonly valor = signal("");

  protected readonly totalPago = computed(() =>
    this.repasses().reduce((s, r) => s + r.valorPago, 0),
  );
  protected readonly totalGeral = computed(() =>
    this.repasses().reduce((s, r) => s + r.valorTotal, 0),
  );
  protected readonly pendentes = computed(
    () => this.repasses().filter((r) => r.status !== "PAGO").length,
  );

  protected readonly descricao = computed(() => {
    const pend = this.pendentes();
    return this.repasses().length > 0
      ? `${pend} pendente${pend !== 1 ? "s" : ""} · ${brl(this.totalPago())} / ${brl(this.totalGeral())}`
      : "nenhum pagamento registrado";
  });

  protected progresso(rep: Repasse): number {
    return rep.valorTotal > 0 ? (rep.valorPago / rep.valorTotal) * 100 : 0;
  }

  protected percentTotal(): number {
    return Math.round((this.totalPago() / this.totalGeral()) * 100);
  }

  protected onOpenChange(open: boolean): void {
    if (!open) {
      this.closed.emit();
      this.registrandoId.set(null);
    }
  }

  protected handleRegistrar(rep: Repasse): void {
    this.registrandoId.set(rep.id);
    this.valor.set((rep.valorTotal - rep.valorPago).toFixed(2));
  }

  /** Cada pagamento registrado leva o comprovante. */
  protected async handleConfirmar(): Promise<void> {
    const ceg = this.ceg();
    const registrandoId = this.registrandoId();
    if (!ceg || !registrandoId) return;
    const pago = parseFloat(this.valor().replace(",", ".")) || 0;
    if (pago <= 0) return;
    const rep = this.repasses().find((r) => r.id === registrandoId);
    if (!rep) return;
    const r = await this.comprovantes.pedir({
      titulo: `pagamento de ${rep.joinerUsername}`,
      mensagem: `${ceg.nome} — anexe o comprovante do valor recebido.`,
      valor: pago,
      confirmar: "registrar pagamento",
    });
    if (!r?.comprovante) return;
    const novoPago = Math.min(rep.valorPago + pago, rep.valorTotal);
    const novoStatus: Repasse["status"] =
      novoPago >= rep.valorTotal ? "PAGO" : novoPago > 0 ? "PARCIAL" : "PENDENTE";
    this.updated.emit({
      cegId: ceg.id,
      updated: {
        ...rep,
        valorPago: novoPago,
        status: novoStatus,
        comprovantes: [...(rep.comprovantes ?? []), r.comprovante],
      },
    });
    this.registrandoId.set(null);
    this.valor.set("");
  }
}
