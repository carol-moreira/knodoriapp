import { Component, computed, inject, input } from "@angular/core";
import { Timer } from "lucide-angular";
import { RODADA_META } from "@/lib/claims-types";
import { ClaimsService } from "@/services/claims.service";
import { IconDirective } from "@/shared/icon.directive";

/** Badge do estado da rodada + contagem regressiva até a abertura. */
@Component({
  selector: "app-rodada-status",
  imports: [IconDirective],
  templateUrl: "./rodada-status.component.html",
  styleUrl: "./rodada-status.component.scss",
})
export class RodadaStatusComponent {
  readonly cegId = input.required<string>();

  private readonly claims = inject(ClaimsService);

  protected readonly icons = { Timer };
  protected readonly META = RODADA_META;

  protected readonly estado = computed(() => this.claims.estado(this.cegId()));
  protected readonly agenda = computed(() => this.claims.agendaDa(this.cegId()));

  protected readonly detalhe = computed(() => {
    const agenda = this.agenda();
    if (!agenda) return "";
    const abre = Date.parse(agenda.abreEm);
    switch (this.estado()) {
      case "AGENDADA":
        return `abre em ${fmtContagem(abre - this.claims.agora())} · ${fmtDataHora(abre)}`;
      case "ABERTA":
        return agenda.fechaEm
          ? `fecha ${fmtDataHora(Date.parse(agenda.fechaEm))}`
          : `aberta desde ${fmtDataHora(abre)}`;
      case "ENCERRADA":
        return agenda.fechaEm ? `encerrada ${fmtDataHora(Date.parse(agenda.fechaEm))}` : "";
      default:
        return "";
    }
  });
}

/** "2d 03:12:09" / "14:05" (mm:ss abaixo de 1 h). */
function fmtContagem(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const hms = h > 0 || d > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  return d > 0 ? `${d}d ${hms}` : hms;
}

function fmtDataHora(ms: number): string {
  return new Date(ms).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
