import type { UserRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Usuário global (visão Admin)
// ---------------------------------------------------------------------------

export type UserStatus = "ATIVO" | "SUSPENSO";

export interface GlobalUser {
  id: string;
  username: string;
  nome: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  cadastro: string; // ISO date
  ultimaAtividade: string; // ISO date
  totalCegs: number; // CEGs abertas (relevante para GOM)
}

// ---------------------------------------------------------------------------
// Série histórica para gráficos
// ---------------------------------------------------------------------------

export interface ChartPoint {
  mes: string;
  faturamento: number; // BRL
  vendas: number; // número de pedidos comprados
  solicitacoes: number; // total de solicitações recebidas
}

// ---------------------------------------------------------------------------
// Log de erros
// ---------------------------------------------------------------------------

export type LogLevel = "ERROR" | "WARN" | "INFO";

export interface LogEntry {
  id: string;
  timestamp: string; // ISO
  level: LogLevel;
  mensagem: string;
  detalhes?: string;
}

// ---------------------------------------------------------------------------
// Status do banco de dados
// ---------------------------------------------------------------------------

export interface DbStatus {
  latenciaMs: number;
  conexoesAtivas: number;
  conexoesMax: number;
  ultimaMigracao: string;
  versaoMigracao: string;
  healthy: boolean;
}

// ---------------------------------------------------------------------------
// Chave de API
// ---------------------------------------------------------------------------

export interface ApiKey {
  id: string;
  label: string;
  valor: string; // chave real (mascarada na UI)
  ultimoUso?: string; // ISO
}

// ===========================================================================
// Mock data
// ===========================================================================

export const MOCK_CHART_DATA: ChartPoint[] = [
  { mes: "jan", faturamento: 3_200, vendas: 18, solicitacoes: 45 },
  { mes: "fev", faturamento: 4_100, vendas: 22, solicitacoes: 58 },
  { mes: "mar", faturamento: 3_800, vendas: 19, solicitacoes: 51 },
  { mes: "abr", faturamento: 5_600, vendas: 31, solicitacoes: 72 },
  { mes: "mai", faturamento: 5_100, vendas: 28, solicitacoes: 65 },
  { mes: "jun", faturamento: 6_400, vendas: 35, solicitacoes: 83 },
];

export const MOCK_USERS: GlobalUser[] = [
  {
    id: "u1",
    username: "@cahsbr15",
    nome: "Admin Principal",
    email: "cahsbr15@gmail.com",
    role: "ADMIN",
    status: "ATIVO",
    cadastro: "2025-01-10",
    ultimaAtividade: "2026-06-09",
    totalCegs: 0,
  },
  {
    id: "u2",
    username: "@gomsakura",
    nome: "Sakura Lima",
    email: "sakura@example.com",
    role: "GOM",
    status: "ATIVO",
    cadastro: "2025-03-15",
    ultimaAtividade: "2026-06-08",
    totalCegs: 3,
  },
  {
    id: "u3",
    username: "@miniheart",
    nome: "Bia Costa",
    email: "bia@example.com",
    role: "JOINER",
    status: "ATIVO",
    cadastro: "2025-04-02",
    ultimaAtividade: "2026-06-07",
    totalCegs: 0,
  },
  {
    id: "u4",
    username: "@bunbun",
    nome: "Ana Reis",
    email: "ana@example.com",
    role: "JOINER",
    status: "ATIVO",
    cadastro: "2025-04-10",
    ultimaAtividade: "2026-06-05",
    totalCegs: 0,
  },
  {
    id: "u5",
    username: "@cherrymari",
    nome: "Marina Souza",
    email: "marina@example.com",
    role: "JOINER",
    status: "ATIVO",
    cadastro: "2025-05-01",
    ultimaAtividade: "2026-05-20",
    totalCegs: 0,
  },
  {
    id: "u6",
    username: "@larakim",
    nome: "Lara Kim",
    email: "lara@example.com",
    role: "JOINER",
    status: "SUSPENSO",
    cadastro: "2025-06-12",
    ultimaAtividade: "2026-04-03",
    totalCegs: 0,
  },
  {
    id: "u7",
    username: "@gomyuki",
    nome: "Yuki Tanaka",
    email: "yuki@example.com",
    role: "GOM",
    status: "ATIVO",
    cadastro: "2025-07-20",
    ultimaAtividade: "2026-06-09",
    totalCegs: 2,
  },
  {
    id: "u8",
    username: "@peachmode",
    nome: "Ji-yeon Park",
    email: "jiyeon@example.com",
    role: "JOINER",
    status: "ATIVO",
    cadastro: "2025-09-05",
    ultimaAtividade: "2026-06-01",
    totalCegs: 0,
  },
];

export const MOCK_LOGS: LogEntry[] = [
  {
    id: "log_01",
    timestamp: "2026-06-09T14:32:11Z",
    level: "ERROR",
    mensagem: "Falha ao conectar com API Wise",
    detalhes: "ECONNREFUSED — timeout após 5000ms",
  },
  {
    id: "log_02",
    timestamp: "2026-06-09T13:18:44Z",
    level: "WARN",
    mensagem: "Taxa de câmbio desatualizada (>4h)",
    detalhes: "Último fetch: 2026-06-09T09:12:00Z",
  },
  {
    id: "log_03",
    timestamp: "2026-06-09T12:05:30Z",
    level: "INFO",
    mensagem: "Migração v1.5.0 aplicada com sucesso",
  },
  {
    id: "log_04",
    timestamp: "2026-06-09T11:47:02Z",
    level: "INFO",
    mensagem: "3 usuários autenticados via Google",
  },
  {
    id: "log_05",
    timestamp: "2026-06-08T22:15:00Z",
    level: "WARN",
    mensagem: "Usuário @larakim tentou acesso negado",
    detalhes: "Rota: /gom — role: JOINER",
  },
  {
    id: "log_06",
    timestamp: "2026-06-08T19:40:22Z",
    level: "ERROR",
    mensagem: "Erro ao gerar PDF de extrato",
    detalhes: "TypeError: Cannot read property 'itens' of undefined",
  },
  {
    id: "log_07",
    timestamp: "2026-06-08T17:03:11Z",
    level: "INFO",
    mensagem: "Backup automático concluído",
  },
  {
    id: "log_08",
    timestamp: "2026-06-08T10:22:55Z",
    level: "WARN",
    mensagem: "Pool de conexões DB atingiu 85%",
    detalhes: "Conexões: 85/100",
  },
];

export const MOCK_DB_STATUS: DbStatus = {
  latenciaMs: 12,
  conexoesAtivas: 4,
  conexoesMax: 100,
  ultimaMigracao: "2026-06-09T12:05:30Z",
  versaoMigracao: "v1.5.0",
  healthy: true,
};

export const MOCK_API_KEYS: ApiKey[] = [
  {
    id: "key_01",
    label: "Wise API Key",
    valor: "sk-wise-prod-8f4a2c1e9b3d7e6f0a5c2b9d4e1f8c7a",
    ultimoUso: "2026-06-09T13:18:44Z",
  },
  {
    id: "key_02",
    label: "Firebase API Key",
    valor: "AIzaSyBxK2mN8pQrL4wE7vJtU3oI9hG6fC1dA0s",
    ultimoUso: "2026-06-09T11:47:02Z",
  },
  {
    id: "key_03",
    label: "Cloudflare Token",
    valor: "cf-token-prod-3a7b9c2d4e1f5a8b0c3d6e9f2a5b8c1d",
    ultimoUso: "2026-06-08T07:00:00Z",
  },
];
