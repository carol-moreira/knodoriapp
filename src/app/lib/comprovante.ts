/**
 * Comprovante de pagamento (PIX, transferência, cartão…) anexado a qualquer pagamento do app:
 * item de claim, pedido mercari, frete internacional + taxas da caixa, frete do envio nacional,
 * repasse entre joiners e pagamentos registrados pela GOM.
 *
 * Só imagens (png, jpeg, webp) ou PDF, até 500 MB. A validação daqui roda no navegador antes do
 * upload; 🔌 o servidor repete as duas checagens (o mime pelo conteúdo do arquivo, não pela
 * extensão) e grava o arquivo no R2 por URL pré-assinada — 500 MB não cabe no corpo de um Worker.
 */

import type { Autoria } from "./autoria";

export const COMPROVANTE_TIPOS = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;
export type ComprovanteTipo = (typeof COMPROVANTE_TIPOS)[number];

/** Atributo `accept` do <input type="file">. */
export const COMPROVANTE_ACCEPT = COMPROVANTE_TIPOS.join(",");

export const COMPROVANTE_MAX_BYTES = 500 * 1024 * 1024;

export interface Comprovante {
  id: string;
  nome: string;
  tipo: ComprovanteTipo;
  /** Tamanho em bytes. */
  tamanho: number;
  /** URL para ver/baixar. Mock: blob: da sessão; 🔌 produção: URL assinada do R2. */
  url: string;
  /** Quem anexou e quando. */
  por: Autoria;
}

/** Retorna a mensagem de erro, ou null se o arquivo pode ser enviado. */
export function validarComprovante(arquivo: File): string | null {
  if (!(COMPROVANTE_TIPOS as readonly string[]).includes(arquivo.type)) {
    return "formato não aceito — envie uma imagem (png, jpg, webp) ou um PDF.";
  }
  if (arquivo.size === 0) return "o arquivo está vazio.";
  if (arquivo.size > COMPROVANTE_MAX_BYTES) {
    return `o arquivo tem ${fmtTamanho(arquivo.size)} — o limite é 500 MB.`;
  }
  return null;
}

export function ehImagem(c: { tipo: string }): boolean {
  return c.tipo.startsWith("image/");
}

/** 1536 → "1,5 KB" · 2_500_000 → "2,4 MB". */
export function fmtTamanho(bytes: number): string {
  const unidades = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < unidades.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: i === 0 ? 0 : 1 })} ${unidades[i]}`;
}
