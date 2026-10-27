# Claims de CEG — modelo, API e tempo real

O front já implementa o fluxo completo com mocks em memória. Os pontos de integração estão
marcados com `// 🔌` em [claims.service.ts](../src/app/services/claims.service.ts). Este documento
descreve o backend que substitui esses mocks.

- Tipos canônicos: [src/app/lib/claims-types.ts](../src/app/lib/claims-types.ts)
- Telas: `/gom/cegs` › "itens & claims" (painel expandido), `/gom/claims` (sala + moderação),
  `/joiner/claims` (sala + meus claims)

## 1. Fluxo

1. A GOM cadastra os itens (código, nome, valor) e agenda `abreEm` (com `fechaEm` e aviso prévio
   opcionais).
2. `abreEm − avisoMinutos`: aviso prévio para as joiners. `abreEm`: aviso de abertura + mensagem
   de sistema no chat.
3. Com a rodada aberta, a joiner envia uma mensagem (`"03"`, `"03 e 05"`, `"pc jungwon"`). O
   servidor identifica os itens citados e cria um `Claim` por item, copiando nome, @ e WhatsApp
   do perfil.
4. O item vai de `DISPONIVEL` para `RESERVADO`. Outros claims no mesmo item entram na fila,
   ordenada por `(criadoEm, seq)`.
5. A GOM confirma um claim: o item fica `CONFIRMADO` com `pagamento = PENDENTE`, e os demais
   claims da fila são rejeitados automaticamente. Se ela rejeitar, o próximo da fila continua
   pendente; com a fila vazia, o item volta a `DISPONIVEL`.
6. A joiner é notificada (in-app + push) a cada decisão.

## 2. Modelo de dados

Banco: D1 (SQLite) para o estado durável. A sala de cada CEG (Durable Object, §4) é a única
escritora dos claims dessa CEG.

```sql
CREATE TABLE ceg_items (
  id         TEXT PRIMARY KEY,
  ceg_id     TEXT NOT NULL REFERENCES cegs(id),
  codigo     TEXT NOT NULL,             -- digitado no chat
  nome       TEXT NOT NULL,
  valor_cents INTEGER NOT NULL CHECK (valor_cents > 0),
  status     TEXT NOT NULL DEFAULT 'DISPONIVEL'
             CHECK (status IN ('DISPONIVEL','RESERVADO','CONFIRMADO')),
  claim_id   TEXT REFERENCES claims(id), -- claim confirmado (dono)
  pagamento  TEXT CHECK (pagamento IN ('PENDENTE','PAGO')),
  avaria     INTEGER NOT NULL DEFAULT 0,
  avaria_nota TEXT,
  abandonado INTEGER NOT NULL DEFAULT 0,  -- só com status = 'CONFIRMADO'
  UNIQUE (ceg_id, codigo COLLATE NOCASE)
);

CREATE TABLE ceg_schedules (
  ceg_id           TEXT PRIMARY KEY REFERENCES cegs(id),
  abre_em          TEXT NOT NULL,       -- ISO UTC
  fecha_em         TEXT,
  aviso_minutos    INTEGER NOT NULL DEFAULT 15,
  aviso_enviado    INTEGER NOT NULL DEFAULT 0,
  abertura_enviada INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE claims (
  id              TEXT PRIMARY KEY,
  ceg_id          TEXT NOT NULL REFERENCES cegs(id),
  item_id         TEXT NOT NULL REFERENCES ceg_items(id),
  mensagem_id     TEXT NOT NULL REFERENCES claim_mensagens(id),
  user_id         TEXT NOT NULL REFERENCES users(id),
  -- snapshot do perfil no momento do claim
  joiner_nome     TEXT NOT NULL,
  joiner_username TEXT NOT NULL,
  joiner_telefone TEXT,
  criado_em       TEXT NOT NULL,        -- carimbado pelo servidor, com ms
  seq             INTEGER NOT NULL,     -- ordem de chegada na sala
  status          TEXT NOT NULL DEFAULT 'PENDENTE'
                  CHECK (status IN ('PENDENTE','CONFIRMADO','REJEITADO')),
  decidido_em     TEXT,
  motivo          TEXT,
  UNIQUE (ceg_id, seq)
);
-- no máximo um claim ativo por joiner e item
CREATE UNIQUE INDEX claims_ativo ON claims(item_id, user_id) WHERE status <> 'REJEITADO';
CREATE INDEX claims_fila ON claims(item_id, status, criado_em, seq);

CREATE TABLE claim_mensagens (
  id        TEXT PRIMARY KEY,
  ceg_id    TEXT NOT NULL REFERENCES cegs(id),
  autor_id  TEXT NOT NULL,              -- 'sistema' nas automáticas
  texto     TEXT NOT NULL,
  data      TEXT NOT NULL,
  tipo      TEXT NOT NULL CHECK (tipo IN ('TEXTO','CLAIM','SISTEMA'))
);
```

Relações: `CEG 1─N CegItem`, `CEG 1─1 CegSchedule`, `CegItem 1─N Claim`, `User 1─N Claim`.
O claim guarda uma cópia dos dados do perfil: se a joiner trocar o @ depois, o registro da rodada
não muda.

## 3. API (Worker, `/api/*`)

Todas as rotas exigem sessão. As rotas `gom/*` exigem o role `GOM` e que a CEG pertença à GOM.
Corpos validados com Zod, como em `/api/pricing`.

| Método | Rota | Corpo / retorno |
|---|---|---|
| GET | `/api/cegs/:id/claims` | snapshot: `{ itens, agenda, claims, mensagens }` |
| POST | `/api/gom/cegs/:id/itens` | `{ codigo, nome, valorCents }` → `CegItem` (409 se o código repetir) |
| PATCH | `/api/gom/cegs/:id` | dados gerais da CEG: `{ nome?, loja?, moeda?, prazo?, status? }` |
| PATCH | `/api/gom/cegs/:id/itens/:itemId` | `{ codigo?, nome?, valorCents?, pagamento?, avaria?, avariaNota?, abandonado? }` (avaria nova notifica a dona) |
| POST | `/api/gom/cegs/:id/itens/:itemId/liberar` | item abandonado volta ao estoque: claim → `REJEITADO` ("item abandonado") |
| DELETE | `/api/gom/cegs/:id/itens/:itemId` | 409 se o item tiver claims |
| PUT | `/api/gom/cegs/:id/claims/agenda` | `{ abreEm, fechaEm?, avisoMinutos }` (rearma os avisos) |
| POST | `/api/gom/cegs/:id/claims/encerrar` | define `fechaEm = agora` |
| POST | `/api/cegs/:id/claims/mensagens` | `{ texto }` → `{ mensagem, claims, ignorados }` (fallback HTTP do WebSocket) |
| POST | `/api/cegs/:id/claims` | `{ itemId }` — claim pela vitrine; o servidor publica a mensagem de claim na sala (mesmo fluxo do chat) |
| POST | `/api/gom/claims/:id/confirmar` | confirma + rejeita o resto da fila (transação) |
| POST | `/api/gom/claims/:id/rejeitar` | `{ motivo? }` |
| GET | `/api/cegs/:id/claims/ws` | upgrade para WebSocket da sala (§4) |
| POST | `/api/push/subscriptions` | Web Push: grava a `PushSubscription` do navegador |

No envio de claim o cliente manda só `{ texto }`. Usuário, nome, @ e telefone vêm da sessão, nunca
do corpo, então uma joiner não consegue dar claim em nome de outra.

## 4. Tempo real: um Durable Object por CEG

```
navegador ──WS──▶ Worker (/api/cegs/:id/claims/ws) ──▶ ClaimRoom DO (id = cegId)
                                                         ├─ SQLite do DO: seq, fila, chat
                                                         ├─ broadcast p/ todos os sockets
                                                         ├─ alarm(): aviso prévio / abertura
                                                         └─ grava em D1 (inventário durável)
```

Por que Durable Objects e não Socket.io ou Firebase: o app já roda em Cloudflare Workers, e um DO
processa uma requisição de cada vez. É isso que resolve a concorrência: dois "03" enviados no
mesmo milissegundo chegam à sala em ordem, e cada um recebe um `seq` sequencial. O desempate é
`(criadoEm, seq)` com o relógio e o contador do servidor. O relógio do celular da joiner nunca
entra na conta.

- **Conexão:** WebSocket Hibernation API (`state.acceptWebSocket`), para que salas ociosas não
  gerem custo. Na conexão, o DO envia o snapshot; depois, só eventos.
- **Eventos (servidor → cliente):** `message`, `claim.created`, `claim.updated`,
  `item.updated`, `schedule.updated`. Cada um traz a entidade inteira, e o cliente faz upsert no
  signal correspondente do `ClaimsService`.
- **Eventos (cliente → servidor):** `{ type: "message", texto }`. A GOM também pode mandar
  `confirm` e `reject`, ou usar as rotas HTTP, que encaminham ao DO.
- **Reconexão:** o cliente envia `lastSeq`/`lastMessageId` e o DO reenvia o que faltou.
- **Agendamento:** ao salvar a agenda, o DO chama `storage.setAlarm(min(abreEm − aviso, abreEm))`.
  O `alarm()` dispara a notificação, marca a flag (idempotente) e reagenda para o próximo marco.
  O cliente não dispara nada; no mock, o `setInterval` do service só simula isso.
- **Notificações:** in-app (`/api/notificacoes` + evento no socket do usuário) e Web Push (VAPID)
  para quem estiver fora do app, enviadas pelo `alarm()` e pelas decisões da GOM.

## 5. Regras de negócio

- Claims só são aceitos com a rodada `ABERTA` (`abreEm ≤ agora < fechaEm`). Antes disso o chat
  aceita mensagens comuns.
- Item `CONFIRMADO` não aceita claim. A mesma joiner não pode ter dois claims ativos no mesmo
  item (índice `claims_ativo`).
- Confirmar exige claim `PENDENTE`. A UI destaca o 1º da fila, mas a GOM pode escolher outro (ex.:
  o 1º desistiu pelo chat).
- Itens com claim não podem ser removidos, só editados.
- `abandonado` só vale para item confirmado. "Liberar" devolve o item ao estoque (`DISPONIVEL`),
  rejeita o claim da dona e avisa a joiner.
- Valores trafegam em centavos na API. O mock usa reais (`number`), como o resto do app.
