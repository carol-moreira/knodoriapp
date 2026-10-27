import { Component, computed, inject, signal } from "@angular/core";
import { ShieldAlert, ShieldOff, UserMinus } from "lucide-angular";
import {
  STATUS_MODERACAO_META,
  TIPO_MODERACAO_META,
  type SolicitacaoModeracao,
} from "@/lib/moderacao-types";
import { ModeracaoService } from "@/services/moderacao.service";
import { AssinaturaComponent } from "@/shared/assinatura/assinatura.component";
import { ConfirmService } from "@/shared/confirm-dialog/confirm.service";
import { IconDirective } from "@/shared/icon.directive";

/** Fila do admin: pedidos de remoção/banimento de joiners enviados pelas GOMs. */
@Component({
  selector: "app-solicitacoes-moderacao",
  imports: [IconDirective, AssinaturaComponent],
  templateUrl: "./solicitacoes-moderacao.component.html",
  styleUrl: "./solicitacoes-moderacao.component.scss",
})
export class SolicitacoesModeracaoComponent {
  protected readonly moderacao = inject(ModeracaoService);
  private readonly confirm = inject(ConfirmService);

  protected readonly icons = { ShieldAlert };
  protected readonly TIPO = TIPO_MODERACAO_META;
  protected readonly STATUS = STATUS_MODERACAO_META;

  /** Resposta digitada por solicitação. */
  protected readonly respostas = signal<Partial<Record<string, string>>>({});

  protected readonly decididas = computed(() =>
    this.moderacao
      .solicitacoes()
      .filter((s) => s.status !== "PENDENTE")
      .slice(0, 5),
  );

  protected setResposta(id: string, valor: string): void {
    this.respostas.update((r) => ({ ...r, [id]: valor }));
  }

  protected async aprovar(s: SolicitacaoModeracao): Promise<void> {
    const banir = s.tipo === "BANIMENTO";
    const ok = await this.confirm.confirmar({
      titulo: banir ? `banir ${s.joinerNome}?` : `remover ${s.joinerNome} da ${s.comunidadeNome}?`,
      mensagem: banir
        ? `${s.joinerUsername} perde o acesso ao app e sai da comunidade.`
        : `${s.joinerUsername} sai da comunidade e deixa de ver as CEGs dela.`,
      confirmar: banir ? "banir" : "remover",
      icone: banir ? ShieldOff : UserMinus,
    });
    if (ok) this.moderacao.aprovar(s.id, this.respostas()[s.id] ?? "");
  }

  protected recusar(s: SolicitacaoModeracao): void {
    this.moderacao.recusar(s.id, this.respostas()[s.id] ?? "");
  }
}
