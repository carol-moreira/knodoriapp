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
import { Check, X } from "lucide-angular";
import { ITEM_META, type ItemKey } from "@/lib/gom-types";
import { ITEM_STATUS_META } from "@/lib/claims-types";
import { BancoItensService } from "@/services/banco-itens.service";
import { CegsService } from "@/services/cegs.service";
import { ClaimsService } from "@/services/claims.service";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { NumberValueDirective } from "@/shared/number-value.directive";
import { AssinaturaComponent } from "@/shared/assinatura/assinatura.component";
import { inputValue } from "@/shared/dom";
import { INPUT_CLS } from "@/components/gom/gerenciamento-cegs/cegs.model";

/**
 * Cadastro (um item por vez) e edição de um item do banco. No cadastro dá para seguir
 * cadastrando o próximo sem fechar o modal.
 */
@Component({
  selector: "app-item-banco-modal",
  imports: [DialogComponent, IconDirective, NumberValueDirective, AssinaturaComponent],
  templateUrl: "./item-banco-modal.component.html",
  styleUrl: "./item-banco-modal.component.scss",
})
export class ItemBancoModalComponent {
  readonly open = input.required<boolean>();
  /** null = novo item. */
  readonly itemId = input<string | null>(null);
  readonly closed = output<void>();

  private readonly banco = inject(BancoItensService);
  private readonly claims = inject(ClaimsService);
  private readonly cegs = inject(CegsService);

  protected readonly icons = { Check, X };
  protected readonly INPUT_CLS = INPUT_CLS;
  protected readonly ITEM_STATUS = ITEM_STATUS_META;
  protected readonly categorias = Object.entries(ITEM_META) as [
    ItemKey,
    (typeof ITEM_META)[ItemKey],
  ][];
  protected readonly val = inputValue;

  protected readonly nome = signal("");
  protected readonly valor = signal(0);
  protected readonly categoria = signal<ItemKey | "">("");
  protected readonly notas = signal("");
  protected readonly continuar = signal(false);
  protected readonly erro = signal("");
  /** Código do último item cadastrado com "cadastrar outro" ligado. */
  protected readonly cadastrado = signal("");

  protected readonly item = computed(() => {
    const id = this.itemId();
    return id ? this.banco.porId(id) : undefined;
  });

  /** Onde o item está agora (CEG + item da CEG), se atrelado. */
  protected readonly vinculo = computed(() => {
    const id = this.itemId();
    const cegItem = id ? this.claims.itemDoBanco(id) : undefined;
    return cegItem ? { cegItem, ceg: this.cegs.porId(cegItem.cegId) } : undefined;
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const id = this.itemId();
      const item = untracked(() => (id ? this.banco.porId(id) : undefined));
      this.nome.set(item?.nome ?? "");
      this.valor.set(item?.valor ?? 0);
      this.categoria.set(item?.categoria ?? "");
      this.notas.set(item?.notas ?? "");
      this.erro.set("");
      this.cadastrado.set("");
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.closed.emit();
  }

  protected salvar(): void {
    const dados = {
      nome: this.nome(),
      valor: this.valor(),
      categoria: this.categoria() || undefined,
      notas: this.notas(),
    };
    const id = this.itemId();
    if (id) {
      const erro = this.banco.atualizar(id, dados);
      this.erro.set(erro ?? "");
      if (!erro) this.closed.emit();
      return;
    }
    const r = this.banco.adicionar(dados);
    if (typeof r === "string") {
      this.erro.set(r);
      return;
    }
    this.erro.set("");
    if (!this.continuar()) {
      this.closed.emit();
      return;
    }
    // Próximo item: mantém a categoria (costuma ser um lote do mesmo tipo)
    this.cadastrado.set(`${r.codigo} · ${r.nome}`);
    this.nome.set("");
    this.valor.set(0);
    this.notas.set("");
  }
}
