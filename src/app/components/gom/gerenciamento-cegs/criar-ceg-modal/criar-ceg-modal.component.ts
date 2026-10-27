import { Component, computed, effect, inject, input, output, signal } from "@angular/core";
import { CalendarClock, Hand, Layers, Plus, Trash2, X } from "lucide-angular";
import { AuthService } from "@/services/auth.service";
import { CegsService } from "@/services/cegs.service";
import { ClaimsService } from "@/services/claims.service";
import { ComunidadeService } from "@/services/comunidade.service";
import { ConfirmService } from "@/shared/confirm-dialog/confirm.service";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { NumberValueDirective } from "@/shared/number-value.directive";
import { inputValue } from "@/shared/dom";
import { AVISO_OPCOES } from "../ceg-detalhes/ceg-detalhes.component";
import {
  CEG_STATUS_META,
  INPUT_CLS,
  LOJAS,
  MOEDAS,
  brl,
  type CegGOM,
  type CegStatus,
  type Moeda,
} from "../cegs.model";

interface LinhaItem {
  key: number;
  codigo: string;
  nome: string;
  valor: number;
}

const linhaVazia = (key: number): LinhaItem => ({ key, codigo: "", nome: "", valor: 0 });

/**
 * Nova CEG com os mesmos campos da visualização detalhada: dados (loja, moeda, prazo, status),
 * itens (código, nome, valor) e a rodada de claims (abertura, encerramento, aviso prévio).
 * Cria tudo de uma vez — a CEG já nasce pronta para a vitrine das joiners.
 */
@Component({
  selector: "app-criar-ceg-modal",
  imports: [DialogComponent, IconDirective, NumberValueDirective],
  templateUrl: "./criar-ceg-modal.component.html",
  styleUrl: "./criar-ceg-modal.component.scss",
})
export class CriarCegModalComponent {
  readonly open = input.required<boolean>();
  readonly closed = output<void>();
  /** CEG criada (já com itens e agenda). */
  readonly saved = output<CegGOM>();

  private readonly auth = inject(AuthService);
  private readonly cegs = inject(CegsService);
  private readonly claims = inject(ClaimsService);
  private readonly comunidade = inject(ComunidadeService);
  private readonly confirm = inject(ConfirmService);

  protected readonly icons = { CalendarClock, Hand, Layers, Plus, Trash2, X };
  protected readonly INPUT_CLS = INPUT_CLS;
  protected readonly lojas = LOJAS;
  protected readonly moedas = MOEDAS;
  protected readonly STATUS_META = CEG_STATUS_META;
  protected readonly statusList = Object.keys(CEG_STATUS_META) as CegStatus[];
  protected readonly avisoOpcoes = AVISO_OPCOES;
  protected readonly brl = brl;
  protected readonly val = inputValue;
  protected readonly hoje = new Date().toISOString().split("T")[0];

  // Dados
  protected readonly nome = signal("");
  protected readonly loja = signal("Mercari");
  protected readonly moeda = signal<Moeda>("JPY");
  protected readonly prazo = signal("");
  protected readonly status = signal<CegStatus>("ABERTA");

  // Itens
  private proximaKey = 1;
  protected readonly itens = signal<LinhaItem[]>([linhaVazia(0)]);

  // Rodada de claims
  protected readonly agendar = signal(true);
  protected readonly abreEm = signal("");
  protected readonly fechaEm = signal("");
  protected readonly avisoMinutos = signal(15);

  protected readonly erro = signal("");

  /** Linhas preenchidas (as totalmente vazias são ignoradas). */
  private readonly itensPreenchidos = computed(() =>
    this.itens().filter((i) => i.codigo.trim() || i.nome.trim() || i.valor > 0),
  );

  protected readonly resumo = computed(() => {
    const itens = this.itensPreenchidos();
    return { qtd: itens.length, total: itens.reduce((s, i) => s + (i.valor || 0), 0) };
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.nome.set("");
      this.loja.set("Mercari");
      this.moeda.set("JPY");
      this.prazo.set("");
      this.status.set("ABERTA");
      this.proximaKey = 1;
      this.itens.set([linhaVazia(0)]);
      this.agendar.set(true);
      this.abreEm.set("");
      this.fechaEm.set("");
      this.avisoMinutos.set(15);
      this.erro.set("");
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.closed.emit();
  }

  protected adicionarLinha(): void {
    this.itens.update((prev) => [...prev, linhaVazia(this.proximaKey++)]);
  }

  protected atualizarLinha(key: number, patch: Partial<LinhaItem>): void {
    this.itens.update((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  protected async removerLinha(linha: LinhaItem): Promise<void> {
    const preenchida = linha.codigo.trim() || linha.nome.trim() || linha.valor > 0;
    if (preenchida) {
      const ok = await this.confirm.confirmar({
        titulo: `excluir o item ${linha.codigo.trim() ? `#${linha.codigo.trim()}` : "da lista"}?`,
      });
      if (!ok) return;
    }
    this.itens.update((prev) => {
      const resto = prev.filter((i) => i.key !== linha.key);
      return resto.length > 0 ? resto : [linhaVazia(this.proximaKey++)];
    });
  }

  /** Mesmas regras do cadastro de item (ClaimsService) + as da agenda. */
  private validar(): string | null {
    if (!this.nome().trim()) return "dê um nome para a CEG.";
    if (!this.prazo()) return "escolha o prazo de encerramento.";

    const codigos = new Set<string>();
    for (const [n, i] of this.itensPreenchidos().entries()) {
      const linha = `item ${n + 1}`;
      const codigo = i.codigo.trim().toLowerCase();
      if (!codigo || !i.nome.trim()) return `${linha}: preencha código e nome.`;
      if (/\s/.test(codigo)) return `${linha}: o código não pode ter espaços.`;
      if (!(i.valor > 0)) return `${linha}: informe um valor maior que zero.`;
      if (codigos.has(codigo)) return `o código ${i.codigo.trim()} está repetido.`;
      codigos.add(codigo);
    }

    if (this.agendar()) {
      if (this.itensPreenchidos().length === 0) {
        return "cadastre pelo menos um item para agendar os claims.";
      }
      const abre = this.abreEm() ? new Date(this.abreEm()) : null;
      if (!abre || Number.isNaN(abre.getTime())) return "escolha quando os claims abrem.";
      if (this.fechaEm() && new Date(this.fechaEm()) <= abre) {
        return "o encerramento dos claims precisa ser depois da abertura.";
      }
    }
    return null;
  }

  protected salvar(): void {
    const erro = this.validar();
    this.erro.set(erro ?? "");
    if (erro) return;

    const ceg: CegGOM = {
      id: `ceg_${Date.now()}`,
      comunidadeId: this.auth.user()?.comunidadeId ?? this.comunidade.comunidade().id,
      nome: this.nome().trim(),
      loja: this.loja(),
      prazo: this.prazo(),
      moeda: this.moeda(),
      status: this.status(),
      qtdJoiners: 0,
      qtdItens: 0,
    };
    // 🔌 POST /api/gom/cegs { ...ceg, itens, agenda } — uma transação só no servidor
    this.cegs.criar(ceg);
    for (const i of this.itensPreenchidos()) {
      this.claims.adicionarItem(ceg.id, { codigo: i.codigo, nome: i.nome, valor: i.valor });
    }
    if (this.agendar()) {
      this.claims.agendar(
        ceg.id,
        new Date(this.abreEm()).toISOString(),
        this.avisoMinutos(),
        this.fechaEm() ? new Date(this.fechaEm()).toISOString() : undefined,
      );
    }
    this.saved.emit(this.cegs.porId(ceg.id) ?? ceg);
    this.closed.emit();
  }
}
