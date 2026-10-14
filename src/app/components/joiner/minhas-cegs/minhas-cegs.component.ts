import { Component, computed, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Clock, Layers, Megaphone, Package, Truck, TriangleAlert } from "lucide-angular";
import { IconDirective } from "@/shared/icon.directive";
import { AuthService } from "@/services/auth.service";
import { CegsService } from "@/services/cegs.service";
import { CEG_POST_META, CegPostsService } from "@/services/ceg-posts.service";
import { PedidosMercariService } from "@/services/pedidos-mercari.service";
import { ITEM_META, MERCARI_STATUS_META, type SolicitacaoGOM } from "@/lib/gom-types";
import {
  CEG_STATUS_META,
  brl,
  fmtDate,
  type CegGOM,
  type CegStatus,
} from "../../gom/gerenciamento-cegs/cegs.model";

interface CegDaJoiner {
  ceg: CegGOM;
  itens: SolicitacaoGOM[];
  total: number;
  cobranca: number | undefined;
}

/** CEGs em que a joiner logada tem itens: seus itens, status da CEG e novidades da GOM. */
@Component({
  selector: "app-minhas-cegs",
  imports: [IconDirective, RouterLink],
  templateUrl: "./minhas-cegs.component.html",
  styleUrl: "./minhas-cegs.component.scss",
})
export class MinhasCegsComponent {
  private readonly auth = inject(AuthService);
  private readonly cegs = inject(CegsService);
  private readonly pedidos = inject(PedidosMercariService);
  protected readonly posts = inject(CegPostsService);

  protected readonly icons = { Clock, Layers, Megaphone, Package, Truck, TriangleAlert };
  protected readonly CEG_STATUS_META = CEG_STATUS_META;
  protected readonly PEDIDO_META = MERCARI_STATUS_META;
  protected readonly POST_META = CEG_POST_META;
  protected readonly steps = Object.keys(CEG_STATUS_META) as CegStatus[];
  protected readonly brl = brl;
  protected readonly fmtDate = fmtDate;

  private readonly meusPedidos = computed(() => {
    const userId = this.auth.user()?.id;
    return userId ? this.pedidos.solicitacoes().filter((s) => s.joinerId === userId) : [];
  });

  protected readonly minhasCegs = computed<CegDaJoiner[]>(() => {
    const userId = this.auth.user()?.id ?? "";
    const porCeg = new Map<string, SolicitacaoGOM[]>();
    for (const s of this.meusPedidos()) {
      if (s.cegId) porCeg.set(s.cegId, [...(porCeg.get(s.cegId) ?? []), s]);
    }
    return [...porCeg]
      .map(([cegId, itens]): CegDaJoiner | null => {
        const ceg = this.cegs.porId(cegId);
        return ceg
          ? {
              ceg,
              itens,
              total: itens.reduce((t, s) => t + s.valorBrl, 0),
              cobranca: ceg.cobranca?.porJoiner[userId],
            }
          : null;
      })
      .filter((c): c is CegDaJoiner => c !== null)
      .sort(
        (a, b) => Number(a.ceg.status === "FINALIZADA") - Number(b.ceg.status === "FINALIZADA"),
      );
  });

  /** Pedidos que ainda não entraram em nenhuma CEG (compra não confirmada). */
  protected readonly semCeg = computed(() => this.meusPedidos().filter((s) => !s.cegId).length);

  protected resumoItens(s: SolicitacaoGOM): string {
    return Object.entries(s.itens)
      .filter(([, q]) => q > 0)
      .map(([k, q]) => `${q}× ${ITEM_META[k as keyof typeof ITEM_META]?.label ?? k}`)
      .join(", ");
  }

  protected stepClass(ceg: CegGOM, s: CegStatus): string {
    return `h-1.5 flex-1 rounded-full transition-all ${
      CEG_STATUS_META[s].step <= CEG_STATUS_META[ceg.status].step ? "bg-primary" : "bg-muted"
    }`;
  }

  protected fmtDataHora(iso: string): string {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
