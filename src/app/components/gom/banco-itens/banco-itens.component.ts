import { Component, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Boxes, Link2, Pencil, Plus, Search, Trash2, Unlink } from "lucide-angular";
import { ITEM_STATUS_META, type CegItem } from "@/lib/claims-types";
import type { ItemBanco } from "@/lib/banco-itens-types";
import { ITEM_META } from "@/lib/gom-types";
import { BancoItensService } from "@/services/banco-itens.service";
import { CegsService } from "@/services/cegs.service";
import { ClaimsService } from "@/services/claims.service";
import { ConfirmService } from "@/shared/confirm-dialog/confirm.service";
import { IconDirective } from "@/shared/icon.directive";
import { AssinaturaComponent } from "@/shared/assinatura/assinatura.component";
import { inputValue } from "@/shared/dom";
import { INPUT_CLS, brl, type CegGOM } from "@/components/gom/gerenciamento-cegs/cegs.model";
import { ItemBancoModalComponent } from "./item-banco-modal/item-banco-modal.component";
import { AtrelarItensModalComponent } from "./atrelar-itens-modal/atrelar-itens-modal.component";

type Filtro = "TODOS" | "LIVRES" | "EM_CEG";

interface Linha {
  item: ItemBanco;
  /** CegItem criado a partir dele (undefined = livre no banco). */
  cegItem?: CegItem;
  ceg?: CegGOM;
}

/**
 * Banco de itens da comunidade: a GOM cadastra os itens um a um e depois atrela cada um (ou
 * vários de uma vez) a uma CEG aberta.
 */
@Component({
  selector: "app-banco-itens",
  imports: [
    IconDirective,
    RouterLink,
    AssinaturaComponent,
    ItemBancoModalComponent,
    AtrelarItensModalComponent,
  ],
  templateUrl: "./banco-itens.component.html",
  styleUrl: "./banco-itens.component.scss",
})
export class BancoItensComponent {
  private readonly banco = inject(BancoItensService);
  private readonly claims = inject(ClaimsService);
  private readonly cegs = inject(CegsService);
  private readonly confirm = inject(ConfirmService);

  protected readonly icons = { Boxes, Link2, Pencil, Plus, Search, Trash2, Unlink };
  protected readonly ITEM_META = ITEM_META;
  protected readonly ITEM_STATUS = ITEM_STATUS_META;
  protected readonly INPUT_CLS = INPUT_CLS;
  protected readonly brl = brl;
  protected readonly val = inputValue;

  protected readonly filtros: { label: string; value: Filtro }[] = [
    { label: "todos", value: "TODOS" },
    { label: "livres", value: "LIVRES" },
    { label: "em CEG", value: "EM_CEG" },
  ];
  protected readonly filtro = signal<Filtro>("TODOS");
  protected readonly busca = signal("");

  /** Modal de cadastro/edição (id null = novo). */
  protected readonly itemModal = signal<{ id: string | null } | null>(null);
  /** Modal de atrelar (com os itens já marcados). */
  protected readonly atrelarModal = signal<{ bancoIds: string[] } | null>(null);

  private readonly todas = computed<Linha[]>(() =>
    this.banco.itens().map((item) => {
      const cegItem = this.claims.itemDoBanco(item.id);
      return { item, cegItem, ceg: cegItem ? this.cegs.porId(cegItem.cegId) : undefined };
    }),
  );

  protected readonly contagem = computed(() => {
    const todas = this.todas();
    const livres = todas.filter((l) => !l.cegItem);
    return {
      total: todas.length,
      livres: livres.length,
      emCeg: todas.length - livres.length,
      valorLivre: livres.reduce((s, l) => s + l.item.valor, 0),
    };
  });

  protected readonly linhas = computed(() => {
    const filtro = this.filtro();
    const q = this.busca().trim().toLowerCase();
    return this.todas()
      .filter((l) => (filtro === "LIVRES" ? !l.cegItem : filtro === "EM_CEG" ? !!l.cegItem : true))
      .filter(
        (l) =>
          !q ||
          l.item.codigo.toLowerCase().includes(q) ||
          l.item.nome.toLowerCase().includes(q) ||
          !!l.item.notas?.toLowerCase().includes(q) ||
          !!l.ceg?.codigo.toLowerCase().includes(q) ||
          !!l.ceg?.nome.toLowerCase().includes(q),
      );
  });

  protected readonly podeAtrelar = computed(() => this.claims.cegsParaAtrelar().length > 0);

  protected filtroClass(value: Filtro): string {
    return `shrink-0 rounded-pill px-3.5 py-1.5 text-xs font-medium transition ${
      this.filtro() === value
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted text-muted-foreground hover:text-foreground"
    }`;
  }

  /** Só sai da CEG o item ainda disponível (sem claims). */
  protected podeDesatrelar(l: Linha): boolean {
    return l.cegItem?.status === "DISPONIVEL";
  }

  protected async desatrelar(l: Linha): Promise<void> {
    if (!l.cegItem || !this.podeDesatrelar(l)) return;
    const ok = await this.confirm.confirmar({
      titulo: `tirar ${l.item.codigo} da ${l.ceg?.codigo ?? "CEG"}?`,
      mensagem: `o #${l.cegItem.codigo} sai do inventário de ${l.ceg?.nome ?? "CEG"} e o item volta livre para o banco.`,
      confirmar: "tirar da CEG",
    });
    if (ok) this.claims.removerItem(l.cegItem.id);
  }

  protected async excluir(l: Linha): Promise<void> {
    if (l.cegItem) return;
    const ok = await this.confirm.confirmar({
      titulo: `excluir ${l.item.codigo}?`,
      mensagem: `${l.item.nome} sai do banco de itens.`,
    });
    if (ok) this.banco.remover(l.item.id);
  }
}
