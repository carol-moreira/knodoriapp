/**
 * Cloudflare Worker — servidor da KNODORI.
 *
 * O app Angular é um build estático servido pelo binding ASSETS (ver wrangler.jsonc,
 * com fallback de SPA). Este Worker só é executado para /api/* e mantém no servidor
 * a lógica que não pode ir para o navegador (tabela de taxas do cartão, markups).
 *
 * On Cloudflare Workers, env binds at REQUEST time — leia variáveis de ambiente
 * dentro do handler, nunca no escopo do módulo.
 */

import { calcularPreco, PricingInputSchema } from "./pricing-engine";

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    try {
      // POST /api/pricing — antes era a server function calcularPrecoFn
      if (url.pathname === "/api/pricing") {
        if (request.method !== "POST") return json({ message: "Método não permitido." }, 405);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ message: "JSON inválido." }, 400);
        }

        const parsed = PricingInputSchema.safeParse(body);
        if (!parsed.success) {
          return json({ message: parsed.error.issues[0]?.message ?? "Entrada inválida." }, 400);
        }

        return json(await calcularPreco(parsed.data));
      }

      if (url.pathname.startsWith("/api/")) return json({ message: "Não encontrado." }, 404);

      // Qualquer outra rota: arquivos estáticos do Angular (SPA fallback no wrangler.jsonc)
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return json({ message: "Erro interno no servidor." }, 500);
    }
  },
};
