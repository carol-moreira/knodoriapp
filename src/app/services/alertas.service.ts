import { DestroyRef, Injectable, inject } from "@angular/core";
import { CegsService } from "./cegs.service";
import { EnviosService } from "./envios.service";
import { NotificacoesService } from "./notificacoes.service";

/** Caixa aberta com prazo de consolidação a até N dias (ou vencido) vira alerta para a GOM. */
const DIAS_ALERTA_CONSOLIDACAO = 3;
/** Pacote em "aguardando" há mais que isso vira alerta para a GOM. */
const HORAS_ALERTA_AGUARDANDO = 24;
/** Lembrete para a joiner quando faltam menos que isso para o prazo do frete. */
const HORAS_LEMBRETE_FRETE = 24;

const HORA = 3_600_000;
const DIA = 24 * HORA;

/**
 * Lembretes que dependem do tempo passar (não de uma ação): prazo de consolidação das caixas,
 * pacotes parados em "aguardando" e prazo de pagamento do frete nacional.
 * Cada alerta sai uma vez só (chave por registro + etapa).
 * 🔌 Em produção isso é um Cron Trigger do Worker que grava as notificações no servidor.
 */
@Injectable({ providedIn: "root" })
export class AlertasService {
  private readonly cegs = inject(CegsService);
  private readonly envios = inject(EnviosService);
  private readonly notificacoes = inject(NotificacoesService);

  private readonly enviados = new Set<string>();

  constructor() {
    this.verificar();
    const timer = setInterval(() => this.verificar(), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  private verificar(agora = Date.now()): void {
    this.consolidacao(agora);
    this.pacotesAguardando(agora);
    this.prazoFrete(agora);
  }

  private consolidacao(agora: number): void {
    for (const caixa of this.cegs.caixasAbertas()) {
      // prazo é uma data (YYYY-MM-DD): vale até o fim do dia
      const fim = Date.parse(`${caixa.prazo}T23:59:59`);
      const dias = Math.ceil((fim - agora) / DIA);
      if (Number.isNaN(fim) || dias > DIAS_ALERTA_CONSOLIDACAO) continue;
      const vencido = dias < 0;
      if (!this.primeiraVez(`consolidacao:${caixa.id}:${vencido ? "vencido" : "proximo"}`))
        continue;
      this.notificacoes.enviar(
        "GOM",
        "CONSOLIDACAO_PRAZO",
        vencido
          ? `prazo de consolidação vencido ⏰`
          : `consolidação: ${dias <= 0 ? "vence hoje" : `faltam ${dias} dia${dias !== 1 ? "s" : ""}`} ⏰`,
        `${caixa.nome} (prazo ${fmtData(caixa.prazo)}) ainda está aberta com ${caixa.qtdItens} item(ns). feche a caixa ou ajuste o prazo.`,
        "/gom/fila",
      );
    }
  }

  private pacotesAguardando(agora: number): void {
    for (const envio of this.envios.todos()) {
      if (envio.status !== "AGUARDANDO") continue;
      const desde = envio.eventos.at(-1)?.por.em;
      if (!desde || agora - Date.parse(desde) < HORAS_ALERTA_AGUARDANDO * HORA) continue;
      if (!this.primeiraVez(`aguardando:${envio.id}:${envio.eventos.length}`)) continue;
      const dias = Math.max(1, Math.floor((agora - Date.parse(desde)) / DIA));
      this.notificacoes.enviar(
        "GOM",
        "PACOTE_AGUARDANDO",
        `pacote aguardando há ${dias} dia${dias !== 1 ? "s" : ""} ⚠️`,
        `o envio de ${envio.joinerUsername} está parado em “aguardando”: ${envio.eventos.at(-1)?.nota ?? "sem motivo"}.`,
        "/gom/envios",
      );
    }
  }

  private prazoFrete(agora: number): void {
    for (const envio of this.envios.todos()) {
      if (envio.status !== "COTACAO_ENVIADA" || envio.comprovantes?.length) continue;
      const prazo = envio.prazoPagamento ? Date.parse(envio.prazoPagamento) : NaN;
      if (Number.isNaN(prazo) || prazo - agora > HORAS_LEMBRETE_FRETE * HORA) continue;
      const vencido = prazo < agora;
      if (!this.primeiraVez(`frete:${envio.id}:${vencido ? "vencido" : "proximo"}`)) continue;
      this.notificacoes.enviar(
        envio.joinerId,
        "PRAZO_PAGAMENTO",
        vencido ? "prazo do frete vencido 💸" : "o prazo do frete vence em breve 💸",
        `frete de ${(envio.frete ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} — pague e anexe o comprovante em envios${vencido ? " ou fale com a GOM" : ""}.`,
        "/joiner/envios",
      );
    }
  }

  private primeiraVez(chave: string): boolean {
    if (this.enviados.has(chave)) return false;
    this.enviados.add(chave);
    return true;
  }
}

function fmtData(data: string): string {
  return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
