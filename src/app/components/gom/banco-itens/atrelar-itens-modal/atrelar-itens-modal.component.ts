import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from "@angular/core";
import { Link2, Search, X } from "lucide-angular";
import { sugerirCodigosClaim } from "@/lib/banco-itens-types";
import { ITEM_META } from "@/lib/gom-types";
import { BancoItensService } from "@/services/banco-itens.service";
import { CegsService } from "@/services/cegs.service";
import { ClaimsService, type VinculoBanco } from "@/services/claims.service";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { NumberValueDirective } from "@/shared/number-value.directive";
import { inputValue } from "@/shared/dom";
import { INPUT_CLS, brl } from "@/components/gom/gerenciamento-cegs/cegs.model";

/**
 * Atrela itens livres do banco a uma CEG. Cada item escolhido ganha um código de claim (sugerido
 * na sequência da CEG, editável) e o valor naquela CEG (começa no valor base do banco).
 *
 * - Do banco de itens: `bancoIds` vem pré-selecionado e a GOM escolhe a CEG.
 * - Do painel da CEG: `cegId` fixa a CEG e a GOM escolhe os itens.
 */
@Component({
  selector: "app-atrelar-itens-modal",
  imports: [DialogComponent, IconDirective, NumberValueDirective],
  templateUrl: "./atrelar-itens-modal.component.html",
  styleUrl: "./atrelar-itens-modal.component.scss",
})
export class AtrelarItensModalComponent {
  readonly open = input.required<boolean>();
  /** CEG fixa (painel da CEG). null = a GOM escolhe. */
  readonly cegId = input<string | null>(null);
  /** Itens do banco já marcados ao abrir. */
  readonly bancoIds = input<string[]>([]);
  readonly closed = output<void>();
  /** CEG que recebeu os itens. */
  readonly saved = output<string>();

  private readonly banco = inject(BancoItensService);
  protected readonly claims = inject(ClaimsService);
  private readonly cegs = inject(CegsService);

  protected readonly icons = { Link2, Search, X };
  protected readonly INPUT_CLS = INPUT_CLS;
  protected readonly ITEM_META = ITEM_META;
  protected readonly brl = brl;
  protected readonly val = inputValue;

  protected readonly cegSel = signal("");
  protected readonly busca = signal("");
  /** Itens marcados, na ordem em que foram marcados. */
  protected readonly linhas = signal<VinculoBanco[]>([]);
  protected readonly erro = signal("");

  protected readonly cegsOpcoes = this.claims.cegsParaAtrelar;
  protected readonly cegFixa = computed(() => {
    const id = this.cegId();
    return id ? this.cegs.porId(id) : undefined;
  });

  /** Itens livres do banco (+ busca por código, nome ou notas). */
  protected readonly livres = computed(() => {
    const q = this.busca().trim().toLowerCase();
    return this.banco
      .itens()
      .filter((i) => !this.claims.itemDoBanco(i.id))
      .filter(
        (i) =>
          !q ||
          i.codigo.toLowerCase().includes(q) ||
          i.nome.toLowerCase().includes(q) ||
          i.notas?.toLowerCase().includes(q),
      );
  });

  protected readonly total = computed(() => this.linhas().reduce((s, l) => s + (l.valor || 0), 0));

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const fixa = this.cegId();
      const ids = this.bancoIds();
      untracked(() => {
        this.cegSel.set(fixa ?? this.cegsOpcoes()[0]?.id ?? "");
        this.busca.set("");
        this.erro.set("");
        const sugestoes = sugerirCodigosClaim(this.codigosDaCeg(), ids.length);
        this.linhas.set(
          ids.flatMap((bancoId, n) => {
            const item = this.banco.porId(bancoId);
            return item ? [{ bancoId, codigo: sugestoes[n], valor: item.valor }] : [];
          }),
        );
      });
    });
  }

  protected linha(bancoId: string): VinculoBanco | undefined {
    return this.linhas().find((l) => l.bancoId === bancoId);
  }

  protected alternar(bancoId: string): void {
    if (this.linha(bancoId)) {
      this.linhas.update((prev) => prev.filter((l) => l.bancoId !== bancoId));
      return;
    }
    const item = this.banco.porId(bancoId);
    if (!item) return;
    const [codigo] = sugerirCodigosClaim(
      [...this.codigosDaCeg(), ...this.linhas().map((l) => l.codigo)],
      1,
    );
    this.linhas.update((prev) => [...prev, { bancoId, codigo, valor: item.valor }]);
  }

  protected editarLinha(bancoId: string, patch: Partial<VinculoBanco>): void {
    this.linhas.update((prev) => prev.map((l) => (l.bancoId === bancoId ? { ...l, ...patch } : l)));
  }

  /** Trocar de CEG refaz as sugestões de código na sequência da nova CEG. */
  protected trocarCeg(id: string): void {
    this.cegSel.set(id);
    const sugestoes = sugerirCodigosClaim(this.codigosDaCeg(), this.linhas().length);
    this.linhas.update((prev) => prev.map((l, n) => ({ ...l, codigo: sugestoes[n] })));
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.closed.emit();
  }

  protected salvar(): void {
    const cegId = this.cegSel();
    if (!cegId) {
      this.erro.set("escolha a CEG.");
      return;
    }
    const erro = this.claims.atrelarDoBanco(cegId, this.linhas());
    this.erro.set(erro ?? "");
    if (erro) return;
    this.saved.emit(cegId);
    this.closed.emit();
  }

  private codigosDaCeg(): string[] {
    const id = this.cegSel();
    return id ? this.claims.itensDa(id).map((i) => i.codigo) : [];
  }
}
