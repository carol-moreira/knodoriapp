import { Injectable, inject } from "@angular/core";
import { Meta, Title } from "@angular/platform-browser";
import {
  TitleStrategy,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
} from "@angular/router";

const DEFAULT_TITLE = "KNODORI";
const DEFAULT_DESCRIPTION = "gerenciamento fofo de CEGs e coleções de k-pop.";

/** Metadados de <head> declarados em `data` de cada rota (antes: `head()` do TanStack). */
export interface RouteSeo {
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
}

/**
 * Aplica `title` + meta tags da rota mais profunda ativa.
 * Equivalente ao `head: () => ({ meta: [...] })` das rotas React.
 */
@Injectable({ providedIn: "root" })
export class SeoTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot) ?? DEFAULT_TITLE;
    this.title.setTitle(title);

    let route: ActivatedRouteSnapshot = snapshot.root;
    while (route.firstChild) route = route.firstChild;
    const seo = (route.data["seo"] ?? {}) as RouteSeo;

    this.meta.updateTag({ name: "description", content: seo.description ?? DEFAULT_DESCRIPTION });
    this.meta.updateTag({ property: "og:title", content: seo.ogTitle ?? DEFAULT_TITLE });
    this.meta.updateTag({
      property: "og:description",
      content: seo.ogDescription ?? DEFAULT_DESCRIPTION,
    });
  }
}
