// =====================================================================
// COMPONENTE C) Painel de Solicitações Mercari — Fila da GOM
// =====================================================================
import { Component, computed, signal } from "@angular/core";
import {
  CheckCircle,
  Clock,
  DollarSign,
  ExternalLink,
  Search,
  type LucideIconData,
} from "lucide-angular";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";

type RequestStatus = "PENDENTE" | "AGUARDANDO_PAGAMENTO" | "COMPRADO";

type SolicitacaoMercari = {
  id: string;
  joinerNome: string;
  joinerUser: string;
  link: string;
  itens: Record<string, number>;
  valorJpy: number;
  valorBrl: number;
  formaPagamento: "pix" | "cartao";
  parcelas: number;
  status: RequestStatus;
};

// Dicionário para traduzir as chaves do carrinho para labels legíveis
const ITEM_LABELS: Record<string, string> = {
  photocard: "photocard",
  pequeno: "merch peq.",
  pelucia_pequena: "pelúcia peq.",
  album: "álbum",
  grande: "item grande",
};

// Mock atualizado simulando os pedidos com múltiplos itens enviados pelos Joiners
const MOCK_SOLICITACOES: SolicitacaoMercari[] = [
  {
    id: "req_1",
    joinerNome: "Bia Costa",
    joinerUser: "@miniheart",
    link: "https://jp.mercari.com/item/m112233",
    itens: { photocard: 2, pequeno: 1 },
    valorJpy: 2200,
    valorBrl: 95.3,
    formaPagamento: "pix",
    parcelas: 1,
    status: "PENDENTE",
  },
  {
    id: "req_2",
    joinerNome: "Ana Reis",
    joinerUser: "@bunbun",
    link: "https://jp.mercari.com/item/m445566",
    itens: { album: 1, photocard: 1 },
    valorJpy: 4200,
    valorBrl: 186.5,
    formaPagamento: "cartao",
    parcelas: 3,
    status: "AGUARDANDO_PAGAMENTO",
  },
  {
    id: "req_3",
    joinerNome: "Marina Souza",
    joinerUser: "@cherrygom",
    link: "https://jp.mercari.com/item/m778899",
    itens: { grande: 1 },
    valorJpy: 6500,
    valorBrl: 301.0,
    formaPagamento: "cartao",
    parcelas: 1,
    status: "COMPRADO",
  },
];

const STATUS_CONFIG: Record<RequestStatus, { label: string; cls: string; icon: LucideIconData }> = {
  PENDENTE: { label: "pendente", cls: "bg-amber-50 text-amber-700 ring-amber-200", icon: Clock },
  AGUARDANDO_PAGAMENTO: {
    label: "aguardando pgto",
    cls: "bg-blue-50 text-blue-700 ring-blue-200",
    icon: DollarSign,
  },
  COMPRADO: {
    label: "comprado ✓",
    cls: "bg-lime-50 text-lime-700 ring-lime-200",
    icon: CheckCircle,
  },
};

@Component({
  selector: "app-mercari-showcase",
  imports: [IconDirective],
  templateUrl: "./mercari-showcase.component.html",
  styleUrl: "./mercari-showcase.component.scss",
})
export class MercariShowcaseComponent {
  protected readonly icons = { ExternalLink, Search };
  protected readonly ITEM_LABELS = ITEM_LABELS;
  protected readonly statusConfig = STATUS_CONFIG;
  protected readonly val = inputValue;

  protected readonly solicitacoes = signal<SolicitacaoMercari[]>(MOCK_SOLICITACOES);
  protected readonly search = signal("");

  protected readonly filtrados = computed(() => {
    const q = this.search().toLowerCase();
    return this.solicitacoes().filter(
      (req) => req.joinerNome.toLowerCase().includes(q) || req.joinerUser.toLowerCase().includes(q),
    );
  });

  // 🔌 LÓGICA DE NEGÓCIO: PATCH /api/mercari/requests/:id
  protected alterarStatus(id: string, novoStatus: RequestStatus): void {
    this.solicitacoes.update((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: novoStatus } : req)),
    );
  }

  protected itens(req: SolicitacaoMercari): [string, number][] {
    return Object.entries(req.itens).filter(([, qtd]) => qtd !== 0);
  }

  protected brl(v: number): string {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  protected jpy(v: number): string {
    return v.toLocaleString("ja-JP");
  }
}
