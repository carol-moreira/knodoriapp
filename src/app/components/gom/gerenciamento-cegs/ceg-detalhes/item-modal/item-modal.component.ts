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
import { PackageX, Phone, ShieldAlert, Trash2, Undo2, X } from "lucide-angular";
import { CLAIM_STATUS_META, ITEM_STATUS_META, type CegItem } from "@/lib/claims-types";
import { ClaimsService } from "@/services/claims.service";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { ConfirmService } from "@/shared/confirm-dialog/confirm.service";
import { NumberValueDirective } from "@/shared/number-value.directive";
import { inputValue } from "@/shared/dom";
import { INPUT_CLS, brl } from "../../cegs.model";
import { AssinaturaComponent } from "@/shared/assinatura/assinatura.component";

/**
 * Cadastro/edição de um item da CEG: código, nome, valor, avaria e abandono. Na edição mostra
 * também quem é a dona e o histórico de claims do item.
 */
@Component({
  selector: "app-item-modal",
  imports: [DialogComponent, IconDirective, NumberValueDirective, AssinaturaComponent],
  templateUrl: "./item-modal.component.html",
  styleUrl: "./item-modal.component.scss",
})
export class ItemModalComponent {
  readonly open = input.required<boolean>();
  readonly cegId = input.required<string>();
  /** null = novo item. */
  readonly itemId = input<string | null>(null);
  readonly closed = output<void>();

  protected readonly claims = inject(ClaimsService);
  private readonly confirm = inject(ConfirmService);

  protected readonly icons = { PackageX, Phone, ShieldAlert, Trash2, Undo2, X };
  protected readonly INPUT_CLS = INPUT_CLS;
  protected readonly ITEM_META = ITEM_STATUS_META;
  protected readonly CLAIM_META = CLAIM_STATUS_META;
  protected readonly brl = brl;
  protected readonly val = inputValue;

  protected readonly codigo = signal("");
  protected readonly nome = signal("");
  protected readonly valor = signal(0);
  protected readonly avaria = signal(false);
  protected readonly avariaNota = signal("");
  protected readonly abandonado = signal(false);
  protected readonly erro = signal("");

  /** Item atual (sempre lido do service, para refletir mudanças de status). */
  protected readonly item = computed<CegItem | undefined>(() => {
    const id = this.itemId();
    return id ? this.claims.itensDa(this.cegId()).find((i) => i.id === id) : undefined;
  });
  protected readonly dono = computed(() => {
    const item = this.item();
    return item ? this.claims.donoDo(item) : undefined;
  });
  protected readonly historico = computed(() => {
    const id = this.itemId();
    return id ? this.claims.claimsDoItem(id) : [];
  });

  constructor() {
    // Preenche o formulário ao abrir (não a cada mudança do item, para não perder a edição)
    effect(() => {
      if (!this.open()) return;
      const id = this.itemId();
      const cegId = this.cegId();
      const item = untracked(() =>
        id ? this.claims.itensDa(cegId).find((i) => i.id === id) : undefined,
      );
      this.codigo.set(item?.codigo ?? "");
      this.nome.set(item?.nome ?? "");
      this.valor.set(item?.valor ?? 0);
      this.avaria.set(!!item?.avaria);
      this.avariaNota.set(item?.avariaNota ?? "");
      this.abandonado.set(!!item?.abandonado);
      this.erro.set("");
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.closed.emit();
  }

  protected salvar(): void {
    const dados = {
      codigo: this.codigo(),
      nome: this.nome(),
      valor: this.valor(),
      avaria: this.avaria(),
      avariaNota: this.avariaNota(),
      abandonado: this.abandonado(),
    };
    const id = this.itemId();
    const erro = id
      ? this.claims.atualizarItem(id, dados)
      : this.claims.adicionarItem(this.cegId(), dados);
    this.erro.set(erro ?? "");
    if (!erro) this.closed.emit();
  }

  protected async remover(): Promise<void> {
    const item = this.item();
    if (!item) return;
    const ok = await this.confirm.confirmar({
      titulo: `excluir o item #${item.codigo}?`,
      mensagem: `${item.nome} sai do inventário da CEG.`,
    });
    if (!ok) return;
    this.claims.removerItem(item.id);
    this.closed.emit();
  }

  /** Salva as alterações e devolve o item abandonado ao estoque. */
  protected liberar(): void {
    const id = this.itemId();
    if (!id) return;
    this.salvar();
    if (!this.erro()) this.claims.liberarItem(id);
  }

  protected fmtDataHora(iso: string): string {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  protected toggleClass(ativo: boolean, cor: "amber" | "rose"): string {
    const on =
      cor === "amber"
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : "border-rose-300 bg-rose-50 text-rose-800";
    return `flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
      ativo ? on : "border-border bg-card hover:bg-muted/50"
    }`;
  }
}
