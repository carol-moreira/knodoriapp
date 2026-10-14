import type { Routes } from "@angular/router";
import {
  MOCK_API_KEYS,
  MOCK_CHART_DATA,
  MOCK_DB_STATUS,
  MOCK_LOGS,
  MOCK_USERS,
} from "@/lib/admin-types";
import { CONFIG_TAXAS_DEFAULT, MOCK_JOINERS } from "@/lib/gom-types";
import type { RouteSeo } from "./services/seo-title.strategy";

/**
 * Rotas da aplicação (antes: file-based routing do TanStack Router em src/routes).
 *
 * - `title` + `data.seo` substituem o `head()` de cada rota.
 * - Os mocks passados como props no React vão em `data` e chegam aos inputs dos
 *   componentes via `withComponentInputBinding()` (ver app.config.ts).
 * - /admin, /gom e /joiner usam RoleGuardPage como layout protegido por role.
 */

const seo = (description: string, og?: { title: string; description: string }): RouteSeo => ({
  description,
  ogTitle: og?.title,
  ogDescription: og?.description,
});

export const routes: Routes = [
  {
    path: "",
    pathMatch: "full",
    loadComponent: () =>
      import("./pages/root-redirect/root-redirect.page").then((m) => m.RootRedirectPage),
  },
  {
    path: "login",
    title: "entrar · KNODORI",
    data: { seo: seo("entre ou crie sua conta na KNODORI.") },
    loadComponent: () => import("./pages/login/login.page").then((m) => m.LoginPage),
  },
  {
    path: "onboarding",
    title: "configure seu perfil · KNODORI",
    data: { seo: seo("personalize seu perfil para começar.") },
    loadComponent: () => import("./pages/onboarding/onboarding.page").then((m) => m.OnboardingPage),
  },
  {
    path: "calculadora",
    title: "calculadora · KNODORI",
    data: {
      seo: seo("converta won, iene, dólar e rupia para real rapidinho.", {
        title: "calculadora · KNODORI",
        description: "conversor de moedas para joiners de CEG.",
      }),
    },
    loadComponent: () =>
      import("./components/currency-calculator/currency-calculator.component").then(
        (m) => m.CurrencyCalculatorComponent,
      ),
  },
  {
    path: "mercari",
    title: "mercari · KNODORI",
    data: {
      seo: seo("vitrine fofa de itens k-pop garimpados no mercari.", {
        title: "mercari · KNODORI",
        description: "vitrine mercari para joiners.",
      }),
    },
    loadComponent: () =>
      import("./components/mercari-showcase/mercari-showcase.component").then(
        (m) => m.MercariShowcaseComponent,
      ),
  },
  {
    path: "sistema",
    title: "sistema · super admin · KNODORI",
    data: {
      seo: seo("painel de super administração: gerenciamento global de GOMs, joiners e CEGs.", {
        title: "super admin · KNODORI",
        description: "gerenciamento global do sistema.",
      }),
    },
    loadComponent: () =>
      import("./components/super-admin-panel/super-admin-panel.component").then(
        (m) => m.SuperAdminPanelComponent,
      ),
  },

  // ── ADMIN ────────────────────────────────────────────────────────────────
  {
    path: "admin",
    data: { role: "ADMIN" },
    loadComponent: () => import("./pages/role-guard/role-guard.page").then((m) => m.RoleGuardPage),
    children: [
      {
        path: "",
        pathMatch: "full",
        title: "admin · KNODORI",
        data: { seo: seo("painel de administração global do sistema.") },
        loadComponent: () =>
          import("./components/dashboards/admin-dashboard/admin-dashboard.component").then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: "metricas",
        title: "métricas · KNODORI",
        data: { seo: seo("métricas globais de faturamento e engajamento."), data: MOCK_CHART_DATA },
        loadComponent: () =>
          import("./components/admin/metricas-globais/metricas-globais.component").then(
            (m) => m.MetricasGlobaisComponent,
          ),
      },
      {
        path: "usuarios",
        title: "usuários · KNODORI",
        data: {
          seo: seo("controle global de usuários, roles e banimentos."),
          usuarios: MOCK_USERS,
        },
        loadComponent: () =>
          import("./components/admin/controle-usuarios/controle-usuarios.component").then(
            (m) => m.ControleUsuariosComponent,
          ),
      },
      {
        path: "configuracoes",
        title: "configurações · KNODORI",
        data: {
          seo: seo("status do banco de dados, logs e chaves de API."),
          logs: MOCK_LOGS,
          dbStatus: MOCK_DB_STATUS,
          apiKeys: MOCK_API_KEYS,
        },
        loadComponent: () =>
          import("./components/admin/configuracoes-core/configuracoes-core.component").then(
            (m) => m.ConfiguracoesCoreComponent,
          ),
      },
    ],
  },

  // ── GOM ──────────────────────────────────────────────────────────────────
  {
    path: "gom",
    data: { role: "GOM" },
    loadComponent: () => import("./pages/role-guard/role-guard.page").then((m) => m.RoleGuardPage),
    children: [
      {
        path: "",
        pathMatch: "full",
        title: "painel GOM · KNODORI",
        data: { seo: seo("painel da GOM: CEGs, pedidos mercari e suas joiners.") },
        loadComponent: () =>
          import("./components/dashboards/gom-dashboard/gom-dashboard.component").then(
            (m) => m.GomDashboardComponent,
          ),
      },
      {
        path: "cegs",
        title: "CEGs · KNODORI",
        data: { seo: seo("gestão das suas CEGs.") },
        loadComponent: () =>
          import("./components/gom/gerenciamento-cegs/gerenciamento-cegs.component").then(
            (m) => m.GerenciamentoCegsComponent,
          ),
      },
      {
        path: "financeiro",
        title: "financeiro · KNODORI",
        data: { seo: seo("resumo financeiro das suas CEGs.") },
        loadComponent: () =>
          import("./pages/gom-financeiro/gom-financeiro.page").then((m) => m.GomFinanceiroPage),
      },
      {
        path: "fila",
        title: "fila mercari · KNODORI",
        data: { seo: seo("gerencie os pedidos mercari e acompanhe o status das solicitações.") },
        loadComponent: () => import("./pages/gom-fila/gom-fila.page").then((m) => m.GomFilaPage),
      },
      {
        path: "joiners",
        title: "joiners · KNODORI",
        data: { seo: seo("gestão de joiners e histórico de pedidos."), joiners: MOCK_JOINERS },
        loadComponent: () =>
          import("./components/gom/gestao-joiners/gestao-joiners.component").then(
            (m) => m.GestaoJoinersComponent,
          ),
      },
      {
        path: "taxas",
        title: "taxas · KNODORI",
        data: { seo: seo("configure spreads e markups por item."), config: CONFIG_TAXAS_DEFAULT },
        loadComponent: () =>
          import("./components/gom/painel-taxas/painel-taxas.component").then(
            (m) => m.PainelTaxasComponent,
          ),
      },
    ],
  },

  // ── JOINER ───────────────────────────────────────────────────────────────
  {
    path: "joiner",
    data: { role: "JOINER" },
    loadComponent: () => import("./pages/role-guard/role-guard.page").then((m) => m.RoleGuardPage),
    children: [
      {
        path: "",
        pathMatch: "full",
        title: "minha área · KNODORI",
        data: { seo: seo("sua área de joiner: pedidos, pagamentos e perfil.") },
        loadComponent: () =>
          import("./components/dashboards/joiner-dashboard/joiner-dashboard.component").then(
            (m) => m.JoinerDashboardComponent,
          ),
      },
      {
        path: "compras",
        title: "minhas compras · KNODORI",
        data: { seo: seo("acompanhe seus pedidos em andamento.") },
        loadComponent: () =>
          import("./components/joiner/minhas-compras/minhas-compras.component").then(
            (m) => m.MinhasComprasComponent,
          ),
      },
      {
        path: "extrato",
        title: "extrato · KNODORI",
        data: { seo: seo("seu histórico financeiro de compras.") },
        loadComponent: () =>
          import("./components/joiner/extrato-individual/extrato-individual.component").then(
            (m) => m.ExtratoIndividualComponent,
          ),
      },
    ],
  },

  // ── 404 ──────────────────────────────────────────────────────────────────
  {
    path: "**",
    title: "page not found · KNODORI",
    loadComponent: () => import("./pages/not-found/not-found.page").then((m) => m.NotFoundPage),
  },
];
