import { Component, computed, input, linkedSignal, signal } from "@angular/core";
import {
  AlertCircle,
  AlertTriangle,
  Database,
  Info,
  RefreshCw,
  Wifi,
  WifiOff,
  type LucideIconData,
} from "lucide-angular";
import {
  MOCK_API_KEYS,
  MOCK_DB_STATUS,
  MOCK_LOGS,
  type ApiKey,
  type DbStatus,
  type LogEntry,
  type LogLevel,
} from "@/lib/admin-types";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import { ApiKeyRowComponent } from "./api-key-row/api-key-row.component";
import { fmtDatetime } from "./configuracoes.utils";

// ---------------------------------------------------------------------------
// Metadados de log level
// ---------------------------------------------------------------------------

const LOG_META: Record<LogLevel, { icon: LucideIconData; badge: string; row: string }> = {
  ERROR: { icon: AlertCircle, badge: "bg-red-100 text-red-700 font-bold", row: "bg-red-50/50" },
  WARN: {
    icon: AlertTriangle,
    badge: "bg-amber-100 text-amber-700 font-bold",
    row: "bg-amber-50/30",
  },
  INFO: { icon: Info, badge: "bg-blue-50 text-blue-600", row: "" },
};

const LOG_LIMIT_OPTIONS = [5, 10, 20] as const;
type LogLimit = (typeof LOG_LIMIT_OPTIONS)[number];
type LevelFilter = LogLevel | "TODOS";

@Component({
  selector: "app-configuracoes-core",
  imports: [IconDirective, ApiKeyRowComponent],
  templateUrl: "./configuracoes-core.component.html",
  styleUrl: "./configuracoes-core.component.scss",
})
export class ConfiguracoesCoreComponent {
  readonly logs = input<LogEntry[]>(MOCK_LOGS);
  readonly dbStatus = input<DbStatus>(MOCK_DB_STATUS);
  readonly apiKeys = input<ApiKey[]>(MOCK_API_KEYS);

  protected readonly icons = { AlertTriangle, Database, RefreshCw, Wifi, WifiOff };
  protected readonly LOG_META = LOG_META;
  protected readonly limitOptions = LOG_LIMIT_OPTIONS;
  protected readonly levels: LevelFilter[] = ["TODOS", "ERROR", "WARN", "INFO"];
  protected readonly fmtDatetime = fmtDatetime;
  protected readonly val = inputValue;

  // ── Status do banco de dados ───────────────────────────────────────────────
  protected readonly pctConexoes = computed(
    () => (this.dbStatus().conexoesAtivas / this.dbStatus().conexoesMax) * 100,
  );

  protected readonly stats = computed(() => {
    const s = this.dbStatus();
    return [
      { label: "latência", value: `${s.latenciaMs} ms`, ok: s.latenciaMs < 50, sub: undefined },
      {
        label: "conexões ativas",
        value: `${s.conexoesAtivas} / ${s.conexoesMax}`,
        ok: this.pctConexoes() < 80,
        sub: undefined,
      },
      {
        label: "última migração",
        value: s.versaoMigracao,
        ok: true,
        sub: fmtDatetime(s.ultimaMigracao),
      },
    ];
  });

  protected poolBarClass(): string {
    const p = this.pctConexoes();
    return `h-full rounded-full transition-all ${
      p > 80 ? "bg-red-500" : p > 60 ? "bg-amber-400" : "bg-emerald-500"
    }`;
  }

  // ── Logs do sistema ────────────────────────────────────────────────────────
  protected readonly limite = signal<LogLimit>(10);
  protected readonly filtroLevel = signal<LevelFilter>("TODOS");

  protected readonly filtrados = computed(() =>
    this.logs()
      .filter((l) => this.filtroLevel() === "TODOS" || l.level === this.filtroLevel())
      .slice(0, this.limite()),
  );

  protected readonly counts = computed<Record<LevelFilter, number>>(() => {
    const logs = this.logs();
    return {
      TODOS: logs.length,
      ERROR: logs.filter((l) => l.level === "ERROR").length,
      WARN: logs.filter((l) => l.level === "WARN").length,
      INFO: logs.filter((l) => l.level === "INFO").length,
    };
  });

  protected levelClass(l: LevelFilter): string {
    return `rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all ${
      this.filtroLevel() === l
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground"
    }`;
  }

  protected onLimiteChange(e: Event): void {
    this.limite.set(Number(inputValue(e)) as LogLimit);
  }

  // ── Chaves de API ──────────────────────────────────────────────────────────
  protected readonly chaves = linkedSignal<ApiKey[]>(() => this.apiKeys());

  protected regenerar(id: string): void {
    // 🔌 await fetch(`/api/admin/keys/${k.id}/regenerate`, { method: "POST" })
    const novaChave = `sk-regen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    this.chaves.update((prev) => prev.map((c) => (c.id === id ? { ...c, valor: novaChave } : c)));
  }
}
