import { Component, signal } from "@angular/core";
import {
  FilaMercariComponent,
  type StatusChange,
} from "@/components/gom/fila-mercari/fila-mercari.component";
import { MOCK_SOLICITACOES, type SolicitacaoGOM } from "@/lib/gom-types";

/** Rota "/gom/fila". */
@Component({
  selector: "app-gom-fila-page",
  imports: [FilaMercariComponent],
  templateUrl: "./gom-fila.page.html",
  styleUrl: "./gom-fila.page.scss",
})
export class GomFilaPage {
  // 🔌 substituir por HttpClient.get(`/api/gom/${gomId}/solicitacoes`)
  protected readonly solicitacoes = signal<SolicitacaoGOM[]>(MOCK_SOLICITACOES);

  protected handleStatusChange({ id, novoStatus }: StatusChange): void {
    // 🔌 await fetch(`/api/gom/${gomId}/solicitacoes/${id}`, { method: "PATCH", body: JSON.stringify({ status: novoStatus }) })
    this.solicitacoes.update((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: novoStatus } : s)),
    );
  }
}
