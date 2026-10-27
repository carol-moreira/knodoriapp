import { Component, computed, effect, inject, signal } from "@angular/core";
import { AtSign, Mail, ShieldCheck, Trash2, UserPlus, Users } from "lucide-angular";
import { PAPEL_META, STATUS_MEMBRO_META } from "@/lib/comunidade-types";
import { AuthService } from "@/services/auth.service";
import { ComunidadeService } from "@/services/comunidade.service";
import { AssinaturaService } from "@/services/assinatura.service";
import { IconDirective } from "@/shared/icon.directive";
import { ConfirmService } from "@/shared/confirm-dialog/confirm.service";
import { inputValue } from "@/shared/dom";
import { INPUT_CLS } from "@/components/gom/gerenciamento-cegs/cegs.model";
import { AssinaturaComponent } from "@/shared/assinatura/assinatura.component";

/** Dados da comunidade + cadastro das administradoras (só a dona gerencia). */
@Component({
  selector: "app-comunidade-ajustes",
  imports: [IconDirective, AssinaturaComponent],
  templateUrl: "./comunidade-ajustes.component.html",
  styleUrl: "./comunidade-ajustes.component.scss",
})
export class ComunidadeAjustesComponent {
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly assinatura = inject(AssinaturaService);
  protected readonly comunidadeService = inject(ComunidadeService);

  protected readonly icons = { AtSign, Mail, ShieldCheck, Trash2, UserPlus, Users };
  protected readonly INPUT_CLS = INPUT_CLS;
  protected readonly PAPEL_META = PAPEL_META;
  protected readonly STATUS_META = STATUS_MEMBRO_META;
  protected readonly val = inputValue;

  protected readonly user = this.auth.user;
  protected readonly ehDona = computed(() => this.auth.user()?.papel === "DONA");
  protected readonly comunidade = this.comunidadeService.comunidade;
  protected readonly membros = this.comunidadeService.membros;

  // Dados da comunidade
  protected readonly nomeComunidade = signal("");
  protected readonly instagram = signal("");
  protected readonly comunidadeSalva = signal(false);

  // Nova admin
  protected readonly nome = signal("");
  protected readonly email = signal("");
  protected readonly username = signal("");
  protected readonly erro = signal("");
  protected readonly convidada = signal("");

  constructor() {
    effect(() => {
      const c = this.comunidade();
      this.nomeComunidade.set(c.nome);
      this.instagram.set(c.instagram ?? "");
    });
  }

  protected salvarComunidade(): void {
    const por = this.assinatura.assinar("COMUNIDADE", "editou os dados da comunidade");
    this.comunidadeService.atualizarComunidade(
      { nome: this.nomeComunidade(), instagram: this.instagram() },
      por,
    );
    // O nome da comunidade aparece no menu do avatar
    this.auth.updateUser({ comunidadeNome: this.comunidade().nome });
    this.comunidadeSalva.set(true);
  }

  protected cadastrar(): void {
    const email = this.email().trim().toLowerCase();
    const erro = this.comunidadeService.adicionarAdmin(
      { nome: this.nome(), email, username: this.username() },
      this.assinatura.autoria(),
    );
    if (!erro) {
      this.assinatura.assinar(
        "COMUNIDADE",
        `cadastrou ${this.nome().trim()} (${email}) como admin`,
      );
    }
    this.erro.set(erro ?? "");
    this.convidada.set(erro ? "" : email);
    if (!erro) {
      this.nome.set("");
      this.email.set("");
      this.username.set("");
    }
  }

  protected async remover(id: string, nome: string): Promise<void> {
    const ok = await this.confirm.confirmar({
      titulo: `remover ${nome}?`,
      mensagem: "ela perde o acesso à comunidade na hora.",
      confirmar: "remover",
    });
    if (!ok) return;
    this.assinatura.assinar("COMUNIDADE", `removeu ${nome} das admins`);
    this.comunidadeService.removerAdmin(id);
  }

  protected fmtData(iso?: string): string {
    if (!iso) return "nunca entrou";
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
