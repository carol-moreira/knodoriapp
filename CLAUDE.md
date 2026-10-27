# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # ng serve (:4200) + wrangler dev (:8787) juntos; /api é proxied para o Worker
npm run dev:web      # Só o Angular (as chamadas a /api falham sem o Worker)
npm run dev:api      # Só o Worker (wrangler dev)
npm run build        # Build de produção do Angular → dist/knodori/browser
npm run build:dev    # Build de desenvolvimento (source maps, sem otimização)
npm run preview      # Build de produção + wrangler dev servindo o resultado
npm run deploy       # Build + wrangler deploy (Cloudflare Workers)
npm run lint         # ESLint (typescript-eslint + angular-eslint, templates incluídos)
npm run format       # Prettier (write mode; templates .html usam o parser "angular")
```

No test runner is configured. There are no unit or integration tests in the project.

## Architecture

**KNODORI** is a K-pop group-order (CEG) community management app built with **Angular 20** (standalone components, Signals, zoneless change detection, new control flow) + **Tailwind CSS v4**. Deployment target is **Cloudflare Workers**: the Angular build is served as static assets with SPA fallback, and a small Worker in [server/worker.ts](server/worker.ts) handles `/api/*`.

Hard rules for this codebase:

- **Standalone only** — there are no `NgModule`s / `.module.ts` files.
- **Signals for state** — `signal`, `computed`, `effect`, `linkedSignal`, `input()`, `output()`. No RxJS state stores.
- **New control flow only** — `@if`, `@for` (with `track`), `@switch`. Never `*ngIf` / `*ngFor` / `*ngTemplateOutlet`.
- **One component = `.ts` + `.html` + `.scss`** (no inline templates).

### Layout do projeto

```
src/
  main.ts, index.html, styles.css      # bootstrap + estilos globais (Tailwind + design system)
  app/
    app.ts|html|scss, app.config.ts, app.routes.ts
    lib/          # tipos, mocks e helpers puros (gom-types, admin-types, pricing, auth, utils)
    services/     # estado global com Signals (auth, theme, pricing, erro, título/SEO)
    shared/       # primitivas: IconDirective, DialogComponent, NumberValueDirective, spinner…
    components/   # componentes de UI por domínio (auth, gom, joiner, admin, dashboards, layout…)
    pages/        # componentes de rota com lógica própria (redirects, guard, fila, financeiro, 404)
server/
  worker.ts, pricing-engine.ts         # Cloudflare Worker (server-only)
```

Path alias `@/*` → `src/app/*`.

### Auth & RBAC

Auth lives in [src/app/services/auth.service.ts](src/app/services/auth.service.ts) (`AuthService`, `providedIn: 'root'`). Pure types/helpers (`AuthUser`, `UserRole`, `dashboardForRole`, `isValidEmail`, `getPasswordStrength`) live in [src/app/lib/auth.ts](src/app/lib/auth.ts). Role is determined at sign-in from the email prefix (dev mock only):

| Email | Role |
|---|---|
| registered in a community (`ComunidadeService`, e.g. `lia@knodori.app`) | `GOM` of that community (dona or admin) |
| `admin@…` | `ADMIN` |
| `gom@…` | `GOM` (dona of the mock community) |
| anything else | `JOINER` |

The mock JOINER signs in as Bia Costa (`id: "j1"`), the same id used by the mock Mercari orders, so the joiner screens have data.

`AuthService` exposes read-only signals `user`, `status`, `needsOnboarding` and methods `signInWithEmail`, `signUpWithEmail`, `signInWithGoogle`, `completeOnboarding`, `updateUser`, `signOut`.

All auth functions are mocked for development. Integration points are marked with `// 🔌`. Provider adapters (Firebase, Cognito, OAuth2) and the integration guide are in [src/app/lib/auth-providers.ts](src/app/lib/auth-providers.ts).

### Routing

Routes are declared in [src/app/app.routes.ts](src/app/app.routes.ts) (Angular Router via `provideRouter` in [app.config.ts](src/app/app.config.ts)), all lazy (`loadComponent`).

- `title` + `data.seo` set `<title>` and meta tags through `SeoTitleStrategy`.
- Mock data that React passed as props goes in route `data` and reaches component inputs via `withComponentInputBinding()`.
- `/admin`, `/gom`, `/joiner` use [RoleGuardPage](src/app/pages/role-guard/role-guard.page.ts) as a layout route (`data.role`). It reacts to the auth signals with an `effect` (redirects to `/login`, `/onboarding` or the user's own dashboard) — same behavior as the old component-level guards.
- Navigation per role is defined in `NAV_BY_ROLE` inside [layout.component.ts](src/app/components/layout/layout.component.ts). Index routes use `exact: true` to avoid active-state collision with sub-routes.
- Mobile-first shell (the app is mostly used on phones): below `lg` the header shows only logo + page title + actions, and navigation is a fixed bottom bar with the first 4 `NAV_BY_ROLE` items (`curto` = short label) plus a "mais" bottom sheet for the rest; from `lg` up the full nav sits in the header. Full-height screens (chats) use `h-[calc(100dvh-var(--app-chrome))]`; `--app-chrome` lives in `styles.css` and must match the header/`<main>` paddings in `layout.component.html`. Wide tables get a card list below `sm` (`sm:hidden` cards + `hidden sm:block` table).

| Route group | Role | Key pages |
|---|---|---|
| `/admin` | ADMIN | Dashboard, Métricas, Usuários, Configurações |
| `/gom` | GOM | Dashboard, CEGs, Claims, Fila Mercari, Envios, Financeiro, Joiners, Ajustes |
| `/joiner` | JOINER | Dashboard, Vitrine, Claims, Minhas Compras, Envios, Minhas CEGs, Extrato |
| `/calculadora`, `/mercari`, `/sistema` | any | Calculadora, vitrine Mercari, Super Admin |

### State Management

- **Services + Signals** — global state (`AuthService`, `ThemeService`) lives in root services.
- **Mock data** — all data is mock arrays in `lib/*-types.ts` or component model files. Comments marked `// 🔌` flag exact integration points (swap for `HttpClient` calls in a service).
- **Optimistic local state** — status changes use `signal.update()` + immediate array map. No rollback on error yet.
- **Forms** — signals with `[value]` + `(input)` (controlled-input style). For `<input type="number">` use `[appNumberValue]` ([NumberValueDirective](src/app/shared/number-value.directive.ts)), which mirrors React's controlled number input semantics. For `<select>`, bind `[selected]` on each `<option>`.
- **Dialogs** — [DialogComponent](src/app/shared/dialog.component.ts) (`<app-dialog [open] (openChange) contentClass overlayClass>`) replaces Radix Dialog: portal to `<body>` (CDK `DomPortalOutlet`), Esc / overlay click → `openChange(false)`, focus trap (`cdkTrapFocus`), focus restore, body scroll lock. Sync form fields with an `effect` on the `open`/entity inputs.
  - Place modal elements **outside** `space-y-*` containers: in React a closed Radix dialog renders no DOM node, but an Angular host element would count as a child and shift the `:last-child` spacing.
- **Dropdown** — the avatar menu uses Angular CDK Menu (`cdkMenuTriggerFor`, `cdkMenu`, `cdkMenuItem`). Requires `@angular/cdk/overlay-prebuilt.css` (already in `angular.json` styles).

### Icons

Lucide icons come from `lucide-angular` (same icon set/version as the former `lucide-react`) and are rendered by [IconDirective](src/app/shared/icon.directive.ts) directly on an `<svg>`:

```html
<svg [appIcon]="icons.Heart" class="h-5 w-5" fill="currentColor"></svg>
```

It produces the same markup as lucide-react, so Tailwind classes apply to the `<svg>` itself. Attributes written in the template override the Lucide defaults.

Whitespace caveat: JSX drops whitespace at line breaks, Angular collapses it to one space. Where an icon is followed by text in a non-flex inline context (e.g. `cozy-pill` with an inline icon), keep the text glued to `</svg>`.

### Key Domain Types

Canonical types live in [src/app/lib/gom-types.ts](src/app/lib/gom-types.ts) and [src/app/lib/admin-types.ts](src/app/lib/admin-types.ts).

```ts
// SolicitacaoGOM — Mercari purchase request
interface SolicitacaoGOM {
  id, joinerId, joinerNome, joinerUsername, linkMercari,
  itens: Record<ItemKey, number>,
  valorJpy, valorBrl,
  formaPagamento: "pix" | "cartao", parcelas,
  status: "PENDENTE" | "AGUARDANDO_PAGAMENTO" | "COMPRADO",
  dataSolicitacao, rastreio?
}

// ItemKey — item types for markup calculation
type ItemKey = "photocard" | "postcard" | "adesivo" | "pequeno" | "pelucia_pequena" | "album" | "grande"

// GlobalUser — platform user (admin view)
interface GlobalUser {
  id, username, nome, email,
  role: "ADMIN" | "GOM" | "JOINER",
  status: "ATIVO" | "SUSPENSO",
  cadastro, ultimaAtividade, totalCegs
}
```

### Design System

Tailwind CSS v4 (via `@tailwindcss/postcss`, see `.postcssrc.json`) with OKLCH colors defined in [src/styles.css](src/styles.css). Most styling is Tailwind classes in templates; component `.scss` files only set the host `display` (`block` by default, `contents` for modal/dialog wrappers). Custom utilities in `@layer utilities`:

| Class | Purpose |
|---|---|
| `.cozy-card` | Rounded card (1.5rem radius) with border + shadow |
| `.cozy-pill` | Pill badge (rounded-full, padded) |
| `.silver-surface` | Gradient background |
| `.no-scrollbar` | Hides scrollbar (Webkit + Firefox) |

Theme: `ThemeService` sets `data-theme` (classic-elegance [default], winter-frost, matcha-latte, spring-blossom, berry-vanilla — each theme only defines `--bg-color`, `--text-color`, `--primary-color`, `--secondary-color` (+ `--on-*`); semantic tokens are derived with `color-mix`) and the `.dark` class on `<html>`, persisted in `localStorage` (`knodori-color-theme`, `knodori-mode`).

Global cursor rules are in `@layer base`: `button:not(:disabled)`, `a`, `select:not(:disabled)`, `[role="button"]` all get `cursor-pointer`; disabled elements get `cursor-not-allowed`.

**Critical CSS caveat:** `.cozy-card` sets `background-color: var(--color-card)` and is declared *after* Tailwind-generated utilities in the CSS cascade. This means `class="cozy-card bg-primary"` will render as a white card — `cozy-card` wins. When a card needs a colored background, skip `cozy-card` and replicate manually:
```html
<!-- Wrong — bg-primary is overridden by cozy-card -->
<div class="cozy-card bg-primary p-5">

<!-- Correct -->
<div class="rounded-3xl border border-primary/30 bg-primary p-5 shadow-sm">
```

Font stack: `SF Pro Rounded`, `Nunito`, `Quicksand`.

### App Logo

The official icon/logo lives at `public/images/init/icon.png` (served at `/images/init/icon.png`); it is also the favicon, apple-touch-icon and og:image. It renders in the header and auth screen. If it fails to load, a Heart icon fallback is shown automatically.

### Profile Settings

[profile-settings-modal](src/app/components/auth/profile-settings-modal/profile-settings-modal.component.ts) — opened from the avatar dropdown in the header. Saves via `AuthService.updateUser()`. Fields: nome, username, telefone, faves (textarea), wishlistUrl, avatarUrl (base64 upload). It also hosts the appearance settings (`AparenciaSettingsComponent`: mode + color theme) for every role. GOM settings that aren't profile live on `/gom/ajustes` ([ajustes](src/app/components/gom/ajustes/ajustes.component.ts), tabs via `?aba=`: comunidade & admins (default), taxas; `/gom/taxas` redirects there). The avatar menu only has "configurações de perfil" and "sair" — ajustes is reached through the nav.

### Deletions need confirmation

Every delete in the app goes through `ConfirmService.confirmar({ titulo, mensagem?, confirmar? })` ([confirm.service.ts](src/app/shared/confirm-dialog/confirm.service.ts)), which resolves a `Promise<boolean>` from the single `<app-confirm-dialog>` mounted in `app.html`. It stacks on top of other dialogs (z-60).

### Autoria (signatures)

Every action that changes data records who did it, from the logged-in user's registration: `Autoria` (`id`, `nome`, `username`, `em`) in [autoria.ts](src/app/lib/autoria.ts). Services call `AssinaturaService.assinar(area, texto)` ([assinatura.service.ts](src/app/services/assinatura.service.ts)) and store the returned `Autoria` on the changed record (`atualizadoPor`, `decididoPor`, `confirmadoPor`, `por`, `enviadoPor`, `solicitadoPor`…); `area`/`texto` are the payload of the server-side audit (🔌). There is no history screen — authorship is shown **only** as a signature next to the record, always through `<app-assinatura [por] acao="confirmado por">` ([assinatura.component.ts](src/app/shared/assinatura/assinatura.component.ts)). New mutations must do the same. Exception: `ComunidadeService` can't inject `AssinaturaService` (AuthService → ComunidadeService cycle), so its callers pass the autoria. In `CegsService`, use `editar()` for team edits (signed) and `atualizar()` for automatic adjustments.

### Moderação de joiners

On `/gom/joiners` the GOM (dona or admin of the community) can only **request** the removal (leaves the community) or ban (account `SUSPENSO` on the platform + leaves the community) of a joiner, with a mandatory reason (`MOTIVO_MIN`). Requests live in `ModeracaoService` ([moderacao.service.ts](src/app/services/moderacao.service.ts); types in [moderacao-types.ts](src/app/lib/moderacao-types.ts)); the platform admin approves/declines them at the top of `/admin/usuarios` (`SolicitacoesModeracao`, nav badge). Approving applies the change through `UsuariosService` ([usuarios.service.ts](src/app/services/usuarios.service.ts) — single source of account status; login refuses `SUSPENSO`) and `ComunidadeService.removerJoiner()`. Joiner ↔ community membership is `ParticipacaoJoiner` in `ComunidadeService` (`participa`, `comunidadesDaJoiner`); every `CegGOM` has a `comunidadeId`.

### Vitrine de CEGs (joiner)

`/joiner/vitrine` ([vitrine-cegs](src/app/components/joiner/vitrine-cegs/vitrine-cegs.component.ts)) lists the `ABERTA` CEGs of the joiner's communities (`ClaimsService.cegsDaJoiner`) with their items, queue and her claims (status + payment). "dar claim" calls `ClaimsService.darClaim()`, which goes through the same private `publicar()` as the chat: it posts a CLAIM message in the round's room, so queue, GOM confirmation, reservation, inventory and payment are one flow. `bloqueioDeClaim()` centralizes the rules (joiner only, member of the CEG's community, round open). A CEG whose status leaves `ABERTA` ends its round (`estado()` returns `ENCERRADA`).

The "nova CEG" modal ([criar-ceg-modal](src/app/components/gom/gerenciamento-cegs/criar-ceg-modal/criar-ceg-modal.component.ts)) has the same fields as the detail panel — data + status, items (code/name/price) and the claim round (open/close/warning) — and creates the CEG, its items and its schedule in one go.

### Comunidade & admins (GOM)

A GOM account belongs to a community (`ComunidadeService`, [comunidade.service.ts](src/app/services/comunidade.service.ts); types in [comunidade-types.ts](src/app/lib/comunidade-types.ts)). The dona registers admins by e-mail in Ajustes › comunidade. An admin logs in with her own e-mail and gets role `GOM` with `gomId` = the dona's account id, plus `comunidadeId`, `comunidadeNome` and `papel` on `AuthUser`. Data scoped to the GOM must use `user.gomId ?? user.id`, not `user.id` (see `MensagensService`, where the team writes as the GOM account). Only the dona manages admins and edits the community data.

### Pricing (server-only)

The JPY→BRL engine runs **only on the server** in [server/pricing-engine.ts](server/pricing-engine.ts), exposed as `POST /api/pricing` by [server/worker.ts](server/worker.ts) (Zod-validated). The credit card fee table never reaches the browser; the client receives final values in cents. Client side, `PricingService.createCalculator()` ([pricing.service.ts](src/app/services/pricing.service.ts)) gives a debounced (350 ms) calculator with `resultado` / `loading` / `error` signals — used by `SimuladorCotacao`.

```
BRL = ((JPY + acrescimoBaseJpy) × fatorIdrJpy × taxaIdrBrl) × (1 + spreadWise/100) + markupItens
```

`ConfigTaxasGOM` holds all configurable parameters. `calcularValorBrl()` (client-side preview) is exported from [painel-taxas.component.ts](src/app/components/gom/painel-taxas/painel-taxas.component.ts).

Note: the `/calculadora` page (`CurrencyCalculator`) still computes prices client-side with its own hardcoded table — inherited from the original app.

### Fila Mercari & caixas mercari

`MercariStatus` ([gom-types.ts](src/app/lib/gom-types.ts), `MERCARI_ETAPAS`) follows the flow: na fila → aguard. pgto → pago → pedido feito → compra confirmada → na warehouse → caixa fechada → chegou na GOM → envio liberado. State lives in `PedidosMercariService` ([pedidos-mercari.service.ts](src/app/services/pedidos-mercari.service.ts)), shared by the fila, GOM dashboard and financeiro. On `/gom/fila` the GOM changes the first six stages in the status column (a `<select>`); "compra confirmada" opens `ConfirmarCompraModal` (proof images + which caixa). A caixa mercari is a CEG with `tipo: "CAIXA_MERCARI"` (`CegsService`, [cegs.service.ts](src/app/services/cegs.service.ts), also backs the CEGs page); confirmed orders go to an open caixa ("caixa mercari N", created on demand). The last stages are caixa-wide actions in `CaixasMercari`: fechar (all orders must be na warehouse) → cobrar fretes e taxas (freight split equally per joiner + fee) → chegou na GOM → liberar envio nacional. Each step notifies the joiners via `NotificacoesService`. The joiner side reads the same service: Minhas Compras maps the logged-in joiner's orders with `toPedidoJoiner()` ([minhas-compras.model.ts](src/app/components/joiner/minhas-compras/minhas-compras.model.ts)), the `/calculadora` submit calls `PedidosMercariService.criar()`, and a confirmed repasse calls `transferir()` to change the order's owner.

### Minhas CEGs & novidades

`/joiner/cegs` ([minhas-cegs](src/app/components/joiner/minhas-cegs/minhas-cegs.component.ts)) lists every CEG where the logged-in joiner has orders (via `cegId` in `PedidosMercariService`): her items, the CEG status bar, her freight/fee charge and the CEG feed. The feed lives in `CegPostsService` ([ceg-posts.service.ts](src/app/services/ceg-posts.service.ts)): the GOM publishes `COMUNICADO` / `AVISO` posts from the "novidades" button on each CEG card (`NovidadesModal`), and every joiner with items in that CEG is notified.

### Claims de CEG (rodada + chat)

State lives in `ClaimsService` ([claims.service.ts](src/app/services/claims.service.ts)); types, mocks and the pure parser `itensCitados()` in [claims-types.ts](src/app/lib/claims-types.ts). The GOM registers items (código, nome, valor) and schedules the round in the expandable "itens & claims" panel of each CEG card ([ceg-detalhes](src/app/components/gom/gerenciamento-cegs/ceg-detalhes/ceg-detalhes.component.ts)), which also shows the full inventory (status, claimer, WhatsApp, pagamento). `/joiner/claims` and `/gom/claims` share `ClaimChatComponent`: while the round is open, a joiner's message citing item codes/names becomes one `Claim` per item, carrying a snapshot of her profile. Competing claims on the same item form a queue ordered by `(criadoEm, seq)`; confirming one rejects the rest, and rejecting the last one frees the item. A 1 s clock in the service drives countdowns and fires the advance warning and opening notifications (in production that is a Durable Object alarm). Backend contract and real-time design: [docs/claims.md](docs/claims.md).

### Envios nacionais

State lives in `EnviosService` ([envios.service.ts](src/app/services/envios.service.ts)); types/mocks in [envios-types.ts](src/app/lib/envios-types.ts). `/joiner/envios` lists what is **ready to ship** (`prontos`: Mercari orders `ENVIO_LIBERADO` + confirmed, paid claims of CEGs `CHEGOU_BR`/`FINALIZADA`, minus items already in an active envio) and the joiner's envios; she picks items, method (PAC/SEDEX/retirada) and address (pre-filled with her last one). `/gom/envios` (tabs: a fazer / com a joiner / postados / concluídos) runs the flow: SOLICITADO → frete informado (`AGUARDANDO_PAGAMENTO`; retirada skips to separação) → joiner says she paid → GOM confirms (`EM_SEPARACAO`) → postado with a Correios tracking code (also written to the Mercari orders via `PedidosMercariService.registrarRastreio`) → ENTREGUE. Every step is an `EventoEnvio` signed with `Autoria`, notifies the other side, and cancelling (confirm popup) returns the items to "prontos". `EnvioCardComponent` is shared by both views (actions via `<ng-content>`). The "solicitar envio nacional" button in Minhas Compras now opens `/joiner/envios?pedido=…` and shows the envio stage once requested.

### Repasses de claim (joiner → joiner)

State lives in `RepassesService` ([repasses.service.ts](src/app/services/repasses.service.ts)); types/mocks in [repasse-types.ts](src/app/lib/repasse-types.ts). The joiner opens `SolicitarRepasseModal` from Minhas Compras (CEG → item → destination joiner's registration code → payment confirmation); only paid items (`pagamentoConfirmado`) without a pending request can be chosen. The GOM gets a notification and reviews requests in the "fila de repasses" section of the CEGs page ([fila-repasses](src/app/components/gom/gerenciamento-cegs/fila-repasses/fila-repasses.component.ts), consolidated or per CEG). Confirming changes the item's owner (the pedido leaves the sender's list) and notifies the destination joiner. The per-CEG "pagamentos" modal (`RepassesModal`, payment collection) is a different thing.

In-app notifications: `NotificacoesService` ([notificacoes.service.ts](src/app/services/notificacoes.service.ts)), addressed to a user id or a whole role (`"GOM"`), shown by the bell in the header.

### Admin: Role Change Requires Password

In [controle-usuarios](src/app/components/admin/controle-usuarios/controle-usuarios.component.ts), changing a user's role opens `RoleChangeDialog` requiring admin password confirmation before the role is applied. The select is controlled: the `(change)` handler immediately reverts the DOM value to the current role until confirmed. Mock validation accepts any non-empty string; production must call `POST /api/admin/verify-password`.

### Errors

`AppErrorHandler` (global `ErrorHandler`) logs, reports to Lovable (`lib/lovable-error-reporting.ts`) and switches the root view to the "This page didn't load" screen. Unknown routes render `NotFoundPage`.

### Charts

The Admin › Métricas charts (formerly Recharts) were removed during the Angular migration; only the KPI cards remain. Choosing a chart library is pending.

### Prettier Config

100-character line width, double quotes, trailing commas everywhere, semicolons on; `*.html` uses the `angular` parser. Run `npm run format` before committing.
