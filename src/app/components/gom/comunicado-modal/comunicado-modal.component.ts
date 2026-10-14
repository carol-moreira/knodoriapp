import { Component, effect, input, output, signal } from "@angular/core";
import { CheckCircle2, MessageSquare, Send, X } from "lucide-angular";
import { ITEM_META, type ItemKey, type SolicitacaoGOM } from "@/lib/gom-types";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildDefaultMensagem(s: SolicitacaoGOM): string {
  const pagamento = s.formaPagamento === "pix" ? "PIX" : `cartão ${s.parcelas}×`;
  const itens = (Object.entries(s.itens) as [ItemKey, number][])
    .filter(([, q]) => q > 0)
    .map(([k, q]) => `${q}× ${ITEM_META[k]?.label ?? k}`)
    .join(", ");
  return `olá, ${s.joinerNome}! 🌸\n\nseu pedido (${itens}) no valor de ${brl(s.valorBrl)} via ${pagamento} foi liberado!\n\nobrigada pela confiança. 𑄝੭\n— KNODORI`;
}

export interface ComunicadoConfirm {
  id: string;
  mensagem: string;
}

@Component({
  selector: "app-comunicado-modal",
  imports: [DialogComponent, IconDirective],
  templateUrl: "./comunicado-modal.component.html",
  styleUrl: "./comunicado-modal.component.scss",
})
export class ComunicadoModalComponent {
  readonly open = input.required<boolean>();
  readonly solicitacao = input.required<SolicitacaoGOM | null>();
  readonly closed = output<void>();
  readonly confirmed = output<ComunicadoConfirm>();

  protected readonly icons = { CheckCircle2, MessageSquare, Send, X };
  protected readonly brl = brl;
  protected readonly val = inputValue;

  protected readonly mensagem = signal("");
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);

  constructor() {
    effect(() => {
      const solicitacao = this.solicitacao();
      if (this.open() && solicitacao) {
        this.mensagem.set(buildDefaultMensagem(solicitacao));
        this.sent.set(false);
      }
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open && !this.sending()) this.closed.emit();
  }

  protected async handleSend(): Promise<void> {
    const solicitacao = this.solicitacao();
    if (!solicitacao || !this.mensagem().trim()) return;
    this.sending.set(true);
    // 🔌 await fetch(`/api/gom/comunicados`, { method: "POST", body: JSON.stringify({ joinerId: solicitacao.joinerId, mensagem }) })
    await new Promise((r) => setTimeout(r, 700));
    this.confirmed.emit({ id: solicitacao.id, mensagem: this.mensagem() });
    this.sending.set(false);
    this.sent.set(true);
    setTimeout(() => {
      this.sent.set(false);
      this.closed.emit();
    }, 900);
  }
}
