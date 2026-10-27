/**
 * Envio nacional: o pacote que a GOM despacha para a joiner no Brasil, juntando os itens que já
 * chegaram — pedidos Mercari com envio liberado e claims pagos de CEGs que chegaram.
 *
 * Fluxo: SOLICITADO (joiner escolhe itens + endereço + modalidade)
 *   → AGUARDANDO_PAGAMENTO (GOM informa o frete; a joiner avisa que pagou)
 *   → EM_SEPARACAO (GOM confirma o pagamento; retirada pula direto pra cá)
 *   → POSTADO (código de rastreio — ou "pronto para retirada")
 *   → ENTREGUE.  CANCELADO devolve os itens para "prontos para envio".
 */

import type { Autoria } from "./autoria";

export type ModalidadeEnvio = "PAC" | "SEDEX" | "RETIRADA";
export type StatusEnvio =
  "SOLICITADO" | "AGUARDANDO_PAGAMENTO" | "EM_SEPARACAO" | "POSTADO" | "ENTREGUE" | "CANCELADO";

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
  nota?: string;
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
  /** Frete cobrado pela GOM (0 na retirada). */
  frete?: number;
  /** A joiner avisou que pagou o frete (a GOM ainda confere). */
  pagamentoInformado?: boolean;
  rastreio?: string;
  status: StatusEnvio;
  eventos: EventoEnvio[];
}

// ---------------------------------------------------------------------------
// Metadados de UI
// ---------------------------------------------------------------------------

export const MODALIDADE_META: Record<ModalidadeEnvio, { label: string; descricao: string }> = {
  PAC: { label: "PAC", descricao: "mais barato, 5–12 dias úteis" },
  SEDEX: { label: "SEDEX", descricao: "mais rápido, 1–4 dias úteis" },
  RETIRADA: { label: "retirada em mãos", descricao: "combine com a GOM — sem frete" },
};

export const ETAPAS_ENVIO: StatusEnvio[] = [
  "SOLICITADO",
  "AGUARDANDO_PAGAMENTO",
  "EM_SEPARACAO",
  "POSTADO",
  "ENTREGUE",
];

export const STATUS_ENVIO_META: Record<StatusEnvio, { label: string; badge: string }> = {
  SOLICITADO: { label: "solicitado", badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200" },
  AGUARDANDO_PAGAMENTO: {
    label: "aguardando frete",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  },
  EM_SEPARACAO: {
    label: "em separação",
    badge: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  },
  POSTADO: { label: "postado", badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
  ENTREGUE: { label: "entregue", badge: "bg-lime-50 text-lime-700 ring-1 ring-lime-200" },
  CANCELADO: { label: "cancelado", badge: "bg-muted text-muted-foreground" },
};

/** Rótulo da etapa considerando a modalidade (retirada não é "postada"). */
export function rotuloEtapa(status: StatusEnvio, modalidade: ModalidadeEnvio): string {
  if (modalidade === "RETIRADA") {
    if (status === "POSTADO") return "pronto para retirada";
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
    status: "AGUARDANDO_PAGAMENTO",
    eventos: [
      { status: "SOLICITADO", por: { ...ANA, em: "2026-05-21T13:10:00Z" } },
      {
        status: "AGUARDANDO_PAGAMENTO",
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
    status: "POSTADO",
    eventos: [
      { status: "SOLICITADO", por: { ...MARINA, em: "2026-05-12T10:00:00Z" } },
      {
        status: "AGUARDANDO_PAGAMENTO",
        por: { ...DONA, em: "2026-05-12T15:20:00Z" },
        nota: "frete R$ 31,50",
      },
      { status: "EM_SEPARACAO", por: { ...DONA, em: "2026-05-13T09:05:00Z" } },
      {
        status: "POSTADO",
        por: { ...LIA, em: "2026-05-14T16:45:00Z" },
        nota: "rastreio AA123456785BR",
      },
    ],
  },
];
