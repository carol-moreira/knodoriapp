import { Component, computed, effect, inject, signal, untracked } from "@angular/core";
import { AlertCircle, ArrowRight, Calculator, Link2, Loader2, RefreshCw } from "lucide-angular";
import { ITEM_META, type ItemKey } from "@/lib/gom-types";
import { centsToDisplay, type InstallmentOption } from "@/lib/pricing";
import { PricingService } from "@/services/pricing.service";
import { IconDirective } from "@/shared/icon.directive";
import { NumberValueDirective } from "@/shared/number-value.directive";
import { inputValue } from "@/shared/dom";

@Component({
  selector: "app-simulador-cotacao",
  imports: [IconDirective, NumberValueDirective],
  templateUrl: "./simulador-cotacao.component.html",
  styleUrl: "./simulador-cotacao.component.scss",
})
export class SimuladorCotacaoComponent {
  protected readonly icons = { AlertCircle, ArrowRight, Calculator, Link2, Loader2, RefreshCw };
  protected readonly centsToDisplay = centsToDisplay;
  protected readonly val = inputValue;
  protected readonly itemEntries = Object.entries(ITEM_META) as [
    ItemKey,
    (typeof ITEM_META)[ItemKey],
  ][];
  protected readonly tiposPagamento = ["pix", "cartao"] as const;

  protected readonly valorJpy = signal("");
  protected readonly linkMercari = signal("");
  protected readonly tipoItem = signal<ItemKey | "">("");
  protected readonly qtdItem = signal(1);
  protected readonly formaPagamento = signal<"pix" | "cartao">("pix");
  protected readonly parcelas = signal(1);

  protected readonly pricing = inject(PricingService).createCalculator();

  protected readonly valorJpyNum = computed(
    () => parseInt(this.valorJpy().replace(/\D/g, ""), 10) || 0,
  );

  // Opção PIX (sempre o índice 0 da lista)
  protected readonly optionPix = computed(() => this.pricing.resultado()?.installments[0] ?? null);

  // Opções de cartão (índices 1–7)
  protected readonly opcoesCartao = computed<InstallmentOption[]>(
    () => this.pricing.resultado()?.installments.filter((o) => o.formaPagamento === "cartao") ?? [],
  );

  // Opção atualmente selecionada para exibição
  protected readonly optionAtual = computed<InstallmentOption | null>(() => {
    const resultado = this.pricing.resultado();
    const forma = this.formaPagamento();
    const parcelas = this.parcelas();
    return resultado
      ? (resultado.installments.find(
          (o) => o.formaPagamento === forma && (forma === "pix" || o.parcelas === parcelas),
        ) ?? resultado.installments[0])
      : null;
  });

  constructor() {
    // Dispara o cálculo no servidor sempre que JPY, tipo ou quantidade mudarem.
    effect(() => {
      const valorJpy = this.valorJpyNum();
      const tipoItem = this.tipoItem();
      const qtdItem = this.qtdItem();
      const itens = tipoItem && qtdItem > 0 ? { [tipoItem]: qtdItem } : {};
      untracked(() => this.pricing.calcular({ valorJpy, itens }));
    });
  }

  protected selecionarForma(tipo: "pix" | "cartao"): void {
    this.formaPagamento.set(tipo);
    if (tipo === "pix") this.parcelas.set(1);
  }

  protected selecionarOpcao(o: InstallmentOption): void {
    this.formaPagamento.set(o.formaPagamento);
    this.parcelas.set(o.parcelas);
  }

  protected onQtdInput(e: Event): void {
    this.qtdItem.set(Math.max(1, parseInt(inputValue(e), 10) || 1));
  }

  protected formaClass(tipo: "pix" | "cartao"): string {
    return `rounded-xl border py-3 text-sm font-semibold transition ${
      this.formaPagamento() === tipo
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-card hover:bg-muted"
    }`;
  }

  protected taxa(o: InstallmentOption): string {
    return o.taxaPercent.toFixed(2).replace(".", ",");
  }

  protected labelParcela(o: InstallmentOption): string {
    const extraVsPix =
      this.optionPix() && o.economiaVsPix < 0
        ? ` (+${centsToDisplay(Math.abs(o.economiaVsPix))} vs. PIX)`
        : "";
    return `${o.parcelas}x de ${centsToDisplay(o.parcelaCents)} · ${this.taxa(o)}%${extraVsPix}`;
  }

  protected isAtual(o: InstallmentOption): boolean {
    const atual = this.optionAtual();
    return !!atual && o.formaPagamento === atual.formaPagamento && o.parcelas === atual.parcelas;
  }

  protected economiaLabel(o: InstallmentOption): string | null {
    return o.economiaVsPix === 0
      ? null
      : o.economiaVsPix < 0
        ? `+${centsToDisplay(Math.abs(o.economiaVsPix))}`
        : `-${centsToDisplay(o.economiaVsPix)}`;
  }

  protected handleReset(): void {
    this.valorJpy.set("");
    this.linkMercari.set("");
    this.tipoItem.set("");
    this.qtdItem.set(1);
    this.formaPagamento.set("pix");
    this.parcelas.set(1);
    this.pricing.resetar();
  }
}
