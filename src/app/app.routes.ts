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
    title: "Entrar · KNODORI",
    data: { seo: seo("Entre ou crie sua conta na KNODORI.") },
    loadComponent: () => import("./pages/login/login.page").then((m) => m.LoginPage),
  },
  {
    path: "onboarding",
    title: "Configure seu perfil · KNODORI",
    data: { seo: seo("Personalize seu perfil para começar.") },
    loadComponent: () => import("./pages/onboarding/onboarding.page").then((m) => m.OnboardingPage),
  },
  {
    path: "calculadora",
    title: "Calculadora · KNODORI",
    data: {
      seo: seo("Converta Won, Iene, Dólar e Rupia para Real rapidinho.", {
        title: "Calculadora · KNODORI",
        description: "Conversor de moedas para joiners de CEG.",
      }),
    },
    loadComponent: () =>
      import("./components/currency-calculator/currency-calculator.component").then(
        (m) => m.CurrencyCalculatorComponent,
      ),
  },
  {
    path: "mercari",
    title: "Mercari · KNODORI",
    data: {
      seo: seo("Vitrine fofa de itens K-pop garimpados no Mercari.", {
        title: "Mercari · KNODORI",
        description: "Vitrine Mercari para joiners.",
      }),
    },
    loadComponent: () =>
      import("./components/mercari-showcase/mercari-showcase.component").then(
        (m) => m.MercariShowcaseComponent,
      ),
  },
  {
    path: "sistema",
    title: "Sistema · Super Admin · KNODORI",
    data: {
      seo: seo("Painel de Super Administração: gerenciamento global de GOMs, Joiners e CEGs.", {
        title: "Super Admin · KNODORI",
        description: "Gerenciamento global do sistema.",
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
        title: "Admin · KNODORI",
        data: { seo: seo("Painel de administração global do sistema.") },
        loadComponent: () =>
          import("./components/dashboards/admin-dashboard/admin-dashboard.component").then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: "metricas",
        title: "Métricas · KNODORI",
        data: { seo: seo("Métricas globais de faturamento e engajamento."), data: MOCK_CHART_DATA },
        loadComponent: () =>
          import("./components/admin/metricas-globais/metricas-globais.component").then(
            (m) => m.MetricasGlobaisComponent,
          ),
      },
      {
        path: "usuarios",
        title: "Usuários · KNODORI",
        data: {
          seo: seo("Controle global de usuários, roles e banimentos."),
          usuarios: MOCK_USERS,
        },
        loadComponent: () =>
          import("./components/admin/controle-usuarios/controle-usuarios.component").then(
            (m) => m.ControleUsuariosComponent,
          ),
      },
      {
        path: "configuracoes",
        title: "Configurações · KNODORI",
        data: {
          seo: seo("Status do banco de dados, logs e chaves de API."),
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
        title: "Painel GOM · KNODORI",
        data: { seo: seo("Painel da GOM: CEGs, pedidos Mercari e suas joiners.") },
        loadComponent: () =>
          import("./components/dashboards/gom-dashboard/gom-dashboard.component").then(
            (m) => m.GomDashboardComponent,
          ),
      },
      {
        path: "cegs",
        title: "CEGs · KNODORI",
        data: { seo: seo("Gestão das suas CEGs.") },
        loadComponent: () =>
          import("./components/gom/gerenciamento-cegs/gerenciamento-cegs.component").then(
            (m) => m.GerenciamentoCegsComponent,
          ),
      },
      {
        path: "financeiro",
        title: "Financeiro · KNODORI",
        data: { seo: seo("Resumo financeiro das suas CEGs.") },
        loadComponent: () =>
          import("./pages/gom-financeiro/gom-financeiro.page").then((m) => m.GomFinanceiroPage),
      },
      {
        path: "fila",
        title: "Fila Mercari · KNODORI",
        data: { seo: seo("Gerencie os pedidos Mercari e acompanhe o status das solicitações.") },
        loadComponent: () => import("./pages/gom-fila/gom-fila.page").then((m) => m.GomFilaPage),
      },
      {
        path: "joiners",
        title: "Joiners · KNODORI",
        data: { seo: seo("Gestão de joiners e histórico de pedidos."), joiners: MOCK_JOINERS },
        loadComponent: () =>
          import("./components/gom/gestao-joiners/gestao-joiners.component").then(
            (m) => m.GestaoJoinersComponent,
          ),
      },
      {
        path: "taxas",
        title: "Taxas · KNODORI",
        data: { seo: seo("Configure spreads e markups por item."), config: CONFIG_TAXAS_DEFAULT },
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
        title: "Minha Área · KNODORI",
        data: { seo: seo("Sua área de joiner: pedidos, pagamentos e perfil.") },
        loadComponent: () =>
          import("./components/dashboards/joiner-dashboard/joiner-dashboard.component").then(
            (m) => m.JoinerDashboardComponent,
          ),
      },
      {
        path: "compras",
        title: "Minhas Compras · KNODORI",
        data: { seo: seo("Acompanhe seus pedidos em andamento.") },
        loadComponent: () =>
          import("./components/joiner/minhas-compras/minhas-compras.component").then(
            (m) => m.MinhasComprasComponent,
          ),
      },
      {
        path: "extrato",
        title: "Extrato · KNODORI",
        data: { seo: seo("Seu histórico financeiro de compras.") },
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
    title: "Page not found · KNODORI",
    loadComponent: () => import("./pages/not-found/not-found.page").then((m) => m.NotFoundPage),
  },
];
