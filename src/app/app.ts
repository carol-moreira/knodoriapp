import { Component, inject } from "@angular/core";
import { Router } from "@angular/router";
import { LayoutComponent } from "./components/layout/layout.component";
import { ConfirmDialogComponent } from "./shared/confirm-dialog/confirm-dialog.component";
import { AppErrorService } from "./services/app-error.service";
import { ThemeService } from "./services/theme.service";

@Component({
  selector: "app-root",
  imports: [LayoutComponent, ConfirmDialogComponent],
  templateUrl: "./app.html",
  styleUrl: "./app.scss",
})
export class App {
  protected readonly errors = inject(AppErrorService);
  private readonly router = inject(Router);

  constructor() {
    // Instancia o tema na inicialização (aplica data-theme e .dark no <html>)
    inject(ThemeService);
  }

  protected tryAgain(): void {
    this.errors.reset();
    void this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: "reload" });
  }
}
