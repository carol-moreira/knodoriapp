/**
 * Envio nacional: o pacote que a GOM despacha para a joiner no Brasil, juntando os itens que já
 * chegaram — pedidos Mercari com envio liberado e claims pagos de CEGs que chegaram.
 *
 * Status, nesta ordem:
 *   1. PENDENTE         — a joiner pediu (itens + endereço + modalidade)
 *   2. EMBALADO         — a GOM separou e embalou
 *   3. AGUARDANDO       — intercorrência: transportadora, retenção, dados pendentes, problema
 *                         no envio… (pode acontecer em qualquer etapa até "a caminho"; a GOM
 *                         informa o motivo e depois retoma de onde parou)
 *   4. COTACAO_ENVIADA  — a GOM mandou o frete; a joiner paga e anexa o comprovante
 *   5. FRETE_PAGO       — a GOM conferiu o comprovante
 *   6. A_CAMINHO        — postado com rastreio (retirada: pronto para retirar)
 *   7. ENTREGUE
 *   8. FEEDBACK_FEITO   — a joiner avaliou o recebimento
 * Retirada em mãos não tem frete: embalado → a caminho (pronto para retirada).
 * Cancelar (antes de "a caminho") apaga o pedido de envio e devolve os itens para "prontos".
 */

import type { Autoria } from "./autoria";
import type { Comprovante } from "./comprovante";

export type ModalidadeEnvio = "PAC" | "SEDEX" | "RETIRADA";
export type StatusEnvio =
  | "PENDENTE"
  | "EMBALADO"
  | "AGUARDANDO"
  | "COTACAO_ENVIADA"
  | "FRETE_PAGO"
  | "A_CAMINHO"
  | "ENTREGUE"
  | "FEEDBACK_FEITO";

export interface Endereco {
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface ItemEnvio {
  origem: "MERCARI" | "CLAIM";
  /** SolicitacaoGOM.id (Mercari) ou CegItem.id (claim). */
  refId: string;
  descricao: string;
  /** CEG / caixa mercari de onde o item veio. */
  cegNome: string;
}

/** Cada mudança de etapa, assinada por quem fez. */
export interface EventoEnvio {
  status: StatusEnvio;
  por: Autoria;
  /** Frete, rastreio, motivo do "aguardando"… */
  nota?: string;
}

export interface FeedbackEnvio {
  /** 1 a 5. */
  nota: number;
  texto?: string;
  por: Autoria;
}

export interface EnvioNacional {
  id: string;
  comunidadeId: string;
  joinerId: string;
  joinerNome: string;
  joinerUsername: string;
  joinerTelefone?: string;
  itens: ItemEnvio[];
  /** Vazio na retirada em mãos. */
  endereco?: Endereco;
  modalidade: ModalidadeEnvio;
  observacao?: string;
  /** Frete cotado pela GOM (0 na retirada). */
  frete?: number;
  /** Prazo para pagar o frete (ISO), definido junto com a cotação. */
  prazoPagamento?: string;
  /** Comprovantes do frete enviados pela joiner (ou anexados pela GOM ao confirmar). */
  comprovantes?: Comprovante[];
  rastreio?: string;
  status: StatusEnvio;
  eventos: EventoEnvio[];
  feedback?: FeedbackEnvio;
}

// ---------------------------------------------------------------------------
// Metadados de UI
// ---------------------------------------------------------------------------

export const MODALIDADE_META: Record<ModalidadeEnvio, { label: string; descricao: string }> = {
  PAC: { label: "PAC", descricao: "mais barato, 5–12 dias úteis" },
  SEDEX: { label: "SEDEX", descricao: "mais rápido, 1–4 dias úteis" },
  RETIRADA: { label: "retirada em mãos", descricao: "combine com a GOM — sem frete" },
};

/** Todos os status, na ordem oficial (filtros e listagens). */
export const ETAPAS_ENVIO: StatusEnvio[] = [
  "PENDENTE",
  "EMBALADO",
  "AGUARDANDO",
  "COTACAO_ENVIADA",
  "FRETE_PAGO",
  "A_CAMINHO",
  "ENTREGUE",
  "FEEDBACK_FEITO",
];

/** Dias para a joiner pagar o frete depois da cotação. */
export const PRAZO_PAGAMENTO_DIAS = 3;

/** Etapas em que a GOM ainda pode marcar "aguardando" ou cancelar. */
export const ANTES_DE_POSTAR: StatusEnvio[] = [
  "PENDENTE",
  "EMBALADO",
  "COTACAO_ENVIADA",
  "FRETE_PAGO",
];

export const STATUS_ENVIO_META: Record<
  StatusEnvio,
  { label: string; badge: string; descricao: string }
> = {
  PENDENTE: {
    label: "pendente",
    badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    descricao: "pedido recebido — a GOM vai separar e embalar.",
  },
  EMBALADO: {
    label: "embalado",
    badge: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    descricao: "itens embalados — a GOM vai cotar o frete.",
  },
  AGUARDANDO: {
    label: "aguardando",
    badge: "bg-orange-50 text-orange-700 ring-1 ring-orange-300",
    descricao: "há uma pendência no envio — veja o motivo nas etapas.",
  },
  COTACAO_ENVIADA: {
    label: "cotação enviada",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    descricao: "frete cotado — pague e anexe o comprovante.",
  },
  FRETE_PAGO: {
    label: "frete pago",
    badge: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
    descricao: "pagamento conferido — o pacote vai ser postado.",
  },
  A_CAMINHO: {
    label: "a caminho do destinatário",
    badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    descricao: "postado — acompanhe pelo rastreio.",
  },
  ENTREGUE: {
    label: "entregue",
    badge: "bg-lime-50 text-lime-700 ring-1 ring-lime-200",
    descricao: "pacote entregue — conte como chegou!",
  },
  FEEDBACK_FEITO: {
    label: "feedback feito",
    badge: "bg-primary/10 text-primary ring-1 ring-primary/30",
    descricao: "envio concluído com avaliação.",
  },
};

/** Barra de progresso: etapas lineares da modalidade (sem "aguardando"). */
export function fluxoEnvio(modalidade: ModalidadeEnvio): StatusEnvio[] {
  return ETAPAS_ENVIO.filter(
    (s) =>
      s !== "AGUARDANDO" &&
      !(modalidade === "RETIRADA" && (s === "COTACAO_ENVIADA" || s === "FRETE_PAGO")),
  );
}

/** Etapa em que o envio estava antes de entrar em "aguardando" (é para lá que ele volta). */
export function etapaAntesDeAguardar(envio: Pick<EnvioNacional, "eventos">): StatusEnvio {
  return [...envio.eventos].reverse().find((e) => e.status !== "AGUARDANDO")?.status ?? "PENDENTE";
}

/** Motivo do "aguardando" atual. */
export function motivoAguardando(envio: Pick<EnvioNacional, "eventos">): string | undefined {
  return [...envio.eventos].reverse().find((e) => e.status === "AGUARDANDO")?.nota;
}

/** Rótulo da etapa considerando a modalidade (retirada não vai "a caminho"). */
export function rotuloEtapa(status: StatusEnvio, modalidade: ModalidadeEnvio): string {
  if (modalidade === "RETIRADA") {
    if (status === "A_CAMINHO") return "pronto para retirada";
    if (status === "ENTREGUE") return "retirado";
  }
  return STATUS_ENVIO_META[status].label;
}

export const BR_ESTADOS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

export const ENDERECO_VAZIO: Endereco = {
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "SP",
};

export function enderecoValido(e: Endereco): boolean {
  return (
    e.cep.replace(/\D/g, "").length === 8 && !!(e.rua.trim() && e.numero.trim() && e.cidade.trim())
  );
}

/** "av. paulista, 1234 — apto 12 · bela vista · são paulo/SP · 01310-100" */
export function formatarEndereco(e: Endereco): string {
  const cep = e.cep.replace(/\D/g, "").replace(/^(\d{5})(\d{3})$/, "$1-$2");
  return [
    `${e.rua.trim()}, ${e.numero.trim()}${e.complemento.trim() ? ` — ${e.complemento.trim()}` : ""}`,
    e.bairro.trim(),
    `${e.cidade.trim()}/${e.estado}`,
    cep,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Rastreio nos Correios. */
export function linkRastreio(codigo: string): string {
  return `https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(codigo)}`;
}

// ---------------------------------------------------------------------------
// Mocks — 🔌 substituir por GET /api/gom/envios e /api/joiner/envios
// ---------------------------------------------------------------------------

const DONA = { id: "usr_gom_01", nome: "Knodori", username: "@knodori_gom" };
const LIA = { id: "adm_lia", nome: "Lia Park", username: "@liapark" };
const ANA = { id: "j2", nome: "Ana Reis", username: "@bunbun" };
const MARINA = { id: "j3", nome: "Marina Souza", username: "@cherrymari" };

const BIA = { id: "j1", nome: "Bia Costa", username: "@miniheart" };

export const MOCK_ENVIOS: EnvioNacional[] = [
  {
    id: "env_01",
    comunidadeId: "com_01",
    joinerId: "j2",
    joinerNome: "Ana Reis",
    joinerUsername: "@bunbun",
    joinerTelefone: "(21) 99123-4567",
    itens: [
      {
        origem: "MERCARI",
        refId: "req_15",
        descricao: "pedido mercari req_15",
        cegNome: "caixa mercari 1",
      },
    ],
    endereco: {
      cep: "22041001",
      rua: "rua barata ribeiro",
      numero: "502",
      complemento: "bloco 2, apto 801",
      bairro: "copacabana",
      cidade: "rio de janeiro",
      estado: "RJ",
    },
    modalidade: "PAC",
    frete: 24.9,
    prazoPagamento: "2026-05-24T18:40:00Z",
    status: "COTACAO_ENVIADA",
    eventos: [
      { status: "PENDENTE", por: { ...ANA, em: "2026-05-21T13:10:00Z" } },
      { status: "EMBALADO", por: { ...LIA, em: "2026-05-21T17:00:00Z" } },
      {
        status: "COTACAO_ENVIADA",
        por: { ...LIA, em: "2026-05-21T18:40:00Z" },
        nota: "frete R$ 24,90",
      },
    ],
  },
  {
    id: "env_02",
    comunidadeId: "com_01",
    joinerId: "j3",
    joinerNome: "Marina Souza",
    joinerUsername: "@cherrymari",
    joinerTelefone: "(31) 98888-1122",
    itens: [
      {
        origem: "CLAIM",
        refId: "it_52",
        descricao: "#B2 photobook idol power",
        cegNome: "Idol Power CEG",
      },
    ],
    endereco: {
      cep: "30140071",
      rua: "av. afonso pena",
      numero: "1500",
      complemento: "",
      bairro: "centro",
      cidade: "belo horizonte",
      estado: "MG",
    },
    modalidade: "SEDEX",
    frete: 31.5,
    rastreio: "AA123456785BR",
    status: "A_CAMINHO",
    eventos: [
      { status: "PENDENTE", por: { ...MARINA, em: "2026-05-12T10:00:00Z" } },
      { status: "EMBALADO", por: { ...DONA, em: "2026-05-12T14:00:00Z" } },
      {
        status: "COTACAO_ENVIADA",
        por: { ...DONA, em: "2026-05-12T15:20:00Z" },
        nota: "frete R$ 31,50",
      },
      { status: "FRETE_PAGO", por: { ...DONA, em: "2026-05-13T09:05:00Z" } },
      {
        status: "A_CAMINHO",
        por: { ...LIA, em: "2026-05-14T16:45:00Z" },
        nota: "rastreio AA123456785BR",
      },
    ],
  },
  {
    id: "env_03",
    comunidadeId: "com_01",
    joinerId: "j1",
    joinerNome: "Bia Costa",
    joinerUsername: "@miniheart",
    joinerTelefone: "(11) 98765-4321",
    itens: [
      {
        origem: "MERCARI",
        refId: "req_14",
        descricao: "pedido mercari req_14",
        cegNome: "caixa mercari 1",
      },
    ],
    endereco: {
      cep: "01310100",
      rua: "av. paulista",
      numero: "1234",
      complemento: "apto 12",
      bairro: "bela vista",
      cidade: "são paulo",
      estado: "SP",
    },
    modalidade: "SEDEX",
    status: "AGUARDANDO",
    eventos: [
      { status: "PENDENTE", por: { ...BIA, em: "2026-06-10T09:00:00Z" } },
      { status: "EMBALADO", por: { ...DONA, em: "2026-06-11T15:00:00Z" } },
      {
        status: "AGUARDANDO",
        por: { ...DONA, em: "2026-06-12T16:30:00Z" },
        nota: "o CEP não bate com o endereço — confirme o número do prédio pelo chat.",
      },
    ],
  },
];
