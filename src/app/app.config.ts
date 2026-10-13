import { provideHttpClient, withFetch } from "@angular/common/http";
import {
  ErrorHandler,
  provideZonelessChangeDetection,
  type ApplicationConfig,
} from "@angular/core";
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from "@angular/router";
import { routes } from "./app.routes";
import { AppErrorHandler } from "./services/app-error.service";
import { SeoTitleStrategy } from "./services/seo-title.strategy";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch()),
    provideRouter(
      routes,
      // Inputs dos componentes de rota recebem os valores de `data` (mocks) e params
      withComponentInputBinding(),
      // scrollRestoration: true do TanStack Router
      withInMemoryScrolling({ scrollPositionRestoration: "enabled" }),
    ),
    { provide: TitleStrategy, useClass: SeoTitleStrategy },
    { provide: ErrorHandler, useClass: AppErrorHandler },
  ],
};
