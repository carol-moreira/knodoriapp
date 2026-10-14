// =====================================================================
// COMPONENTE B) Formulário de Solicitação do Joiner — JPY → BRL
// =====================================================================
import { Component, computed, signal } from "@angular/core";
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  CreditCard,
  Link2,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-angular";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";

const TAXA_COMERCIAL_IDR_BRL = 0.000286;
const SPREAD_WISE = 1.025;

// Configuração das taxas internas por tipo de item (agora ocultas para o usuário)
const ITEM_TYPES = {
  photocard: { label: "photocard", taxa: 2.5 },
  postcard: { label: "postcard", taxa: 2.5 },
  adesivo: { label: "adesivo (cartela)", taxa: 2.5 },
  pequeno: { label: "item peq. (outros merchs)", taxa: 8.0 },
  pelucia_pequena: { label: "pelúcia pequena", taxa: 10.0 },
  album: { label: "álbum", taxa: 15.0 },
  grande: { label: "item grande (> 15cm)", taxa: 25.0 },
};

type ItemChave = keyof typeof ITEM_TYPES;

// Tabela de taxas de cartão
const TAXAS_CARTAO: Record<number, number> = {
  1: 0.0498,
  2: 0.0964,
  3: 0.1123,
  4: 0.1136,
  5: 0.1431,
  6: 0.1432,
  7: 0.1672,
};

const PARCELAS_OPCOES = [
  { value: 1, label: "1x (taxa de 4,98%)" },
  { value: 2, label: "2x (taxa de 9,64%)" },
  { value: 3, label: "3x (taxa de 11,23%)" },
  { value: 4, label: "4x (taxa de 11,36%)" },
  { value: 5, label: "5x (taxa de 14,31%)" },
  { value: 6, label: "6x (taxa de 14,32%)" },
  { value: 7, label: "7x (taxa de 16,72%)" },
];

const QUANTIDADES_ZERADAS: Record<ItemChave, number> = {
  photocard: 0,
  postcard: 0,
  adesivo: 0,
  pequeno: 0,
  pelucia_pequena: 0,
  album: 0,
  grande: 0,
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

@Component({
  selector: "app-currency-calculator",
  imports: [IconDirective],
  templateUrl: "./currency-calculator.component.html",
  styleUrl: "./currency-calculator.component.scss",
})
export class CurrencyCalculatorComponent {
  protected readonly icons = {
    AlertCircle,
    ArrowRight,
    Calculator,
    CheckCircle2,
    CreditCard,
    Link2,
    Minus,
    Plus,
    ShoppingBag,
  };
  protected readonly itemEntries = Object.entries(ITEM_TYPES) as [
    ItemChave,
    (typeof ITEM_TYPES)[ItemChave],
  ][];
  protected readonly parcelasOpcoes = PARCELAS_OPCOES;
  protected readonly brl = brl;
  protected readonly val = inputValue;

  protected readonly valorJpy = signal("");
  protected readonly linkMercari = signal("");
  protected readonly quantidades = signal<Record<ItemChave, number>>({ ...QUANTIDADES_ZERADAS });
  protected readonly formaPagamento = signal<"pix" | "cartao">("pix");
  protected readonly parcelas = signal(1);
  protected readonly enviado = signal(false);
  protected readonly simulado = signal(false);

  protected readonly calculo = computed(() => {
    const jpy = parseInt(this.valorJpy().replace(/\D/g, "")) || 0;
    const forma = this.formaPagamento();
    const parcelas = this.parcelas();

    // 1. Cálculo base secreto (JPY + 200) * 123 -> IDR -> BRL
    const idr = (jpy + 200) * 123;
    const brlBase = idr * TAXA_COMERCIAL_IDR_BRL * SPREAD_WISE;

    // 2. Acréscimo secreto somando todas as quantidades vezes suas taxas unitárias
    let acrescimoItens = 0;
    if (jpy > 0) {
      acrescimoItens = (Object.entries(this.quantidades()) as [ItemChave, number][]).reduce(
        (acc, [chave, qtd]) => acc + qtd * ITEM_TYPES[chave].taxa,
        0,
      );
    }

    let valorFinalBrl = brlBase + acrescimoItens;

    // 3. Aplicação de taxas de cartão (1x até 7x)
    if (forma === "cartao") {
      const taxaAplicada = TAXAS_CARTAO[parcelas] || 0;
      valorFinalBrl = valorFinalBrl * (1 + taxaAplicada);
    }

    return {
      jpy,
      valorFinalBrl,
      valorParcela: valorFinalBrl / (forma === "cartao" ? parcelas : 1),
    };
  });

  // Manipulador para adicionar/remover itens do pedido
  protected handleQuantidade(chave: ItemChave, delta: number): void {
    this.quantidades.update((prev) => ({ ...prev, [chave]: Math.max(0, prev[chave] + delta) }));
    // Esconde o bloco de resultado instantaneamente junto com a mudança
    this.simulado.set(false);
  }

  protected onValorInput(e: Event): void {
    this.valorJpy.set(inputValue(e));
    this.simulado.set(false);
  }

  protected selecionarPix(): void {
    this.formaPagamento.set("pix");
    this.parcelas.set(1);
    this.simulado.set(false);
  }

  protected selecionarCartao(): void {
    this.formaPagamento.set("cartao");
    this.simulado.set(false);
  }

  protected onParcelasChange(e: Event): void {
    this.parcelas.set(Number(inputValue(e)));
    this.simulado.set(false);
  }

  protected formaClass(forma: "pix" | "cartao"): string {
    return `p-4 rounded-xl border text-sm font-semibold transition text-center ${
      this.formaPagamento() === forma
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-card border-border hover:bg-muted"
    }`;
  }

  protected itemRowClass(chave: ItemChave, index: number): string {
    const isLast = index === this.itemEntries.length - 1;
    return `flex items-center justify-between p-4 transition-colors ${
      !isLast ? "border-b border-border/50" : ""
    } ${this.quantidades()[chave] > 0 ? "bg-primary/5" : ""}`;
  }

  protected itemLabelClass(chave: ItemChave): string {
    return `text-sm font-semibold transition-colors ${
      this.quantidades()[chave] > 0 ? "text-primary" : "text-foreground"
    }`;
  }

  protected submitClass(): string {
    return `w-full inline-flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-primary-foreground shadow-md transition ${
      this.simulado()
        ? "bg-primary hover:opacity-95 cursor-pointer active:scale-[0.99]"
        : "bg-neutral-300 text-neutral-500 cursor-not-allowed opacity-60"
    }`;
  }

  protected handleSimularCotacao(): void {
    const jpy = parseInt(this.valorJpy().replace(/\D/g, "")) || 0;
    if (jpy <= 0) {
      alert("por favor, insira um valor válido em iene.");
      return;
    }

    const totalItens = Object.values(this.quantidades()).reduce((a, b) => a + b, 0);
    if (totalItens === 0) {
      alert("por favor, selecione as quantidades de itens contidos no anúncio antes de simular.");
      return;
    }

    this.simulado.set(true);
  }

  protected handleSubmit(e: Event): void {
    e.preventDefault();
    if (!this.simulado() || !this.valorJpy() || !this.linkMercari()) return;

    const calculo = this.calculo();
    const novaSolicitacao = {
      link: this.linkMercari(),
      valorJpy: calculo.jpy,
      valorBrl: calculo.valorFinalBrl,
      itens: this.quantidades(),
      paymentMethod: this.formaPagamento(),
      installments: this.formaPagamento() === "cartao" ? this.parcelas() : 1,
    };

    console.log("enviando para a fila do GOM:", novaSolicitacao);
    this.enviado.set(true);
  }

  protected novaSolicitacao(): void {
    this.enviado.set(false);
    this.valorJpy.set("");
    this.linkMercari.set("");
    this.quantidades.set({ ...QUANTIDADES_ZERADAS });
    this.formaPagamento.set("pix");
    this.parcelas.set(1);
    this.simulado.set(false);
  }
}
