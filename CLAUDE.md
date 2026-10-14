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

| Email prefix | Role |
|---|---|
| `admin@…` | `ADMIN` |
| `gom@…` | `GOM` |
| anything else | `JOINER` |

`AuthService` exposes read-only signals `user`, `status`, `needsOnboarding` and methods `signInWithEmail`, `signUpWithEmail`, `signInWithGoogle`, `completeOnboarding`, `updateUser`, `signOut`.

All auth functions are mocked for development. Integration points are marked with `// 🔌`. Provider adapters (Firebase, Cognito, OAuth2) and the integration guide are in [src/app/lib/auth-providers.ts](src/app/lib/auth-providers.ts).

### Routing

Routes are declared in [src/app/app.routes.ts](src/app/app.routes.ts) (Angular Router via `provideRouter` in [app.config.ts](src/app/app.config.ts)), all lazy (`loadComponent`).

- `title` + `data.seo` set `<title>` and meta tags through `SeoTitleStrategy`.
- Mock data that React passed as props goes in route `data` and reaches component inputs via `withComponentInputBinding()`.
- `/admin`, `/gom`, `/joiner` use [RoleGuardPage](src/app/pages/role-guard/role-guard.page.ts) as a layout route (`data.role`). It reacts to the auth signals with an `effect` (redirects to `/login`, `/onboarding` or the user's own dashboard) — same behavior as the old component-level guards.
- Navigation per role is defined in `NAV_BY_ROLE` inside [layout.component.ts](src/app/components/layout/layout.component.ts). Index routes use `exact: true` to avoid active-state collision with sub-routes.

| Route group | Role | Key pages |
|---|---|---|
| `/admin` | ADMIN | Dashboard, Métricas, Usuários, Configurações |
| `/gom` | GOM | Dashboard, CEGs, Financeiro, Fila Mercari, Joiners, Taxas |
| `/joiner` | JOINER | Dashboard, Minhas Compras, Extrato |
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

The logo lives at `public/logo.jpg` (served at `/logo.jpg`). It renders in the header and auth screen. If it fails to load, a Heart icon fallback is shown automatically.

### Profile Settings

[profile-settings-modal](src/app/components/auth/profile-settings-modal/profile-settings-modal.component.ts) — opened from the avatar dropdown in the header. Saves via `AuthService.updateUser()`. Fields: nome, username, telefone, faves (textarea), wishlistUrl, avatarUrl (base64 upload). Also hosts the appearance settings (mode + color theme).

### Pricing (server-only)

The JPY→BRL engine runs **only on the server** in [server/pricing-engine.ts](server/pricing-engine.ts), exposed as `POST /api/pricing` by [server/worker.ts](server/worker.ts) (Zod-validated). The credit card fee table never reaches the browser; the client receives final values in cents. Client side, `PricingService.createCalculator()` ([pricing.service.ts](src/app/services/pricing.service.ts)) gives a debounced (350 ms) calculator with `resultado` / `loading` / `error` signals — used by `SimuladorCotacao`.

```
BRL = ((JPY + acrescimoBaseJpy) × fatorIdrJpy × taxaIdrBrl) × (1 + spreadWise/100) + markupItens
```

`ConfigTaxasGOM` holds all configurable parameters. `calcularValorBrl()` (client-side preview) is exported from [painel-taxas.component.ts](src/app/components/gom/painel-taxas/painel-taxas.component.ts).

Note: the `/calculadora` page (`CurrencyCalculator`) still computes prices client-side with its own hardcoded table — inherited from the original app.

### Admin: Role Change Requires Password

In [controle-usuarios](src/app/components/admin/controle-usuarios/controle-usuarios.component.ts), changing a user's role opens `RoleChangeDialog` requiring admin password confirmation before the role is applied. The select is controlled: the `(change)` handler immediately reverts the DOM value to the current role until confirmed. Mock validation accepts any non-empty string; production must call `POST /api/admin/verify-password`.

### Errors

`AppErrorHandler` (global `ErrorHandler`) logs, reports to Lovable (`lib/lovable-error-reporting.ts`) and switches the root view to the "This page didn't load" screen. Unknown routes render `NotFoundPage`.

### Charts

The Admin › Métricas charts (formerly Recharts) were removed during the Angular migration; only the KPI cards remain. Choosing a chart library is pending.

### Prettier Config

100-character line width, double quotes, trailing commas everywhere, semicolons on; `*.html` uses the `angular` parser. Run `npm run format` before committing.
