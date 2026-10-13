import { Component, computed, input, linkedSignal, signal } from "@angular/core";
import { CheckCircle2, Info, RefreshCw, Save } from "lucide-angular";
import {
  CONFIG_TAXAS_DEFAULT,
  ITEM_META,
  type ConfigTaxasGOM,
  type ItemKey,
} from "@/lib/gom-types";
import { IconDirective } from "@/shared/icon.directive";
import { NumberValueDirective } from "@/shared/number-value.directive";
import { inputValue } from "@/shared/dom";

// ---------------------------------------------------------------------------
// Fórmula de conversão (espelhada do SimuladorCotacao)
// BRL = ((JPY + acrescimoBaseJpy) * fatorIdrJpy * taxaIdrBrl) * (1 + spreadWise/100) + markup
// ---------------------------------------------------------------------------

export function calcularValorBrl(
  valorJpy: number,
  config: ConfigTaxasGOM,
  itens: Partial<Record<ItemKey, number>> = {},
): number {
  const base = (valorJpy + config.acrescimoBaseJpy) * config.fatorIdrJpy * config.taxaIdrBrl;
  const comSpread = base * (1 + config.spreadWise / 100);
  const markupTotal = (Object.entries(itens) as [ItemKey, number][]).reduce(
    (sum, [k, q]) => sum + (config.markupItens[k] ?? 0) * q,
    0,
  );
  return comSpread + markupTotal;
}

type NumericField = Exclude<keyof ConfigTaxasGOM, "markupItens">;

interface NumberFieldDef {
  key: NumericField;
  label: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  decimalPlaces: number;
}

const CAMBIO_FIELDS: NumberFieldDef[] = [
  {
    key: "spreadWise",
    label: "Spread Wise (%)",
    hint: "Percentual cobrado sobre a taxa Wise",
    min: 0,
    max: 20,
    step: 0.1,
    decimalPlaces: 2,
  },
  {
    key: "taxaIdrBrl",
    label: "Taxa IDR → BRL",
    hint: "Ex: 0.000286",
    min: 0,
    step: 0.000001,
    decimalPlaces: 6,
  },
  {
    key: "fatorIdrJpy",
    label: "Fator JPY → IDR",
    hint: "Ex: 123",
    min: 1,
    step: 1,
    decimalPlaces: 2,
  },
  {
    key: "acrescimoBaseJpy",
    label: "Acréscimo base (JPY)",
    hint: "Taxa fixa adicionada ao JPY antes da conversão",
    min: 0,
    step: 50,
    decimalPlaces: 2,
  },
];

@Component({
  selector: "app-painel-taxas",
  imports: [IconDirective, NumberValueDirective],
  templateUrl: "./painel-taxas.component.html",
  styleUrl: "./painel-taxas.component.scss",
})
export class PainelTaxasComponent {
  readonly config = input<ConfigTaxasGOM>(CONFIG_TAXAS_DEFAULT);
  /** Persistência opcional; sem ela, simula a chamada à API. */
  readonly onSave = input<((config: ConfigTaxasGOM) => Promise<void>) | undefined>(undefined);

  protected readonly icons = { CheckCircle2, Info, RefreshCw, Save };
  protected readonly cambioFields = CAMBIO_FIELDS;
  protected readonly itemKeys = Object.keys(ITEM_META) as ItemKey[];
  protected readonly ITEM_META = ITEM_META;

  /** Estado editável do formulário (inicia com o input `config`). */
  protected readonly form = linkedSignal<ConfigTaxasGOM>(() => this.config());
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);

  protected readonly preview = computed(() =>
    calcularValorBrl(3000, this.form(), { photocard: 1 }),
  );

  protected brl(v: number): string {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  protected onFieldInput(key: NumericField, e: Event): void {
    this.updateField(key, parseFloat(inputValue(e)) || 0);
  }

  protected onFieldBlur(field: NumberFieldDef, e: Event): void {
    this.updateField(
      field.key,
      parseFloat(parseFloat(inputValue(e)).toFixed(field.decimalPlaces)) || 0,
    );
  }

  protected onMarkupInput(key: ItemKey, e: Event): void {
    this.saved.set(false);
    const value = parseFloat(inputValue(e)) || 0;
    this.form.update((prev) => ({
      ...prev,
      markupItens: { ...prev.markupItens, [key]: value },
    }));
  }

  private updateField(key: NumericField, value: number): void {
    this.saved.set(false);
    this.form.update((prev) => ({ ...prev, [key]: value }));
  }

  protected async handleSave(): Promise<void> {
    this.saving.set(true);
    try {
      const onSave = this.onSave();
      if (onSave) {
        await onSave(this.form());
      } else {
        // 🔌 substituir por: await fetch(`/api/gom/${gomId}/config-taxas`, { method: "PUT", body: JSON.stringify(config) })
        await new Promise((r) => setTimeout(r, 700));
      }
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 3000);
    } finally {
      this.saving.set(false);
    }
  }

  protected handleReset(): void {
    this.form.set(CONFIG_TAXAS_DEFAULT);
    this.saved.set(false);
  }
}
