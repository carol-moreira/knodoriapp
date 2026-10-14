import { Component, output, signal } from "@angular/core";
import { Heart } from "lucide-angular";
import { IconDirective } from "@/shared/icon.directive";
import { GoogleButtonComponent } from "../google-button/google-button.component";
import { LoginFormComponent } from "../login-form/login-form.component";
import { RegisterFormComponent } from "../register-form/register-form.component";

type AuthTab = "login" | "register";

@Component({
  selector: "app-auth-screen",
  imports: [IconDirective, GoogleButtonComponent, LoginFormComponent, RegisterFormComponent],
  templateUrl: "./auth-screen.component.html",
  styleUrl: "./auth-screen.component.scss",
})
export class AuthScreenComponent {
  readonly authSuccess = output<void>();

  protected readonly icons = { Heart };
  protected readonly tabs: AuthTab[] = ["login", "register"];

  protected readonly tab = signal<AuthTab>("login");
  // Fallback do logo: se /images/init/icon.png não carregar, mostra o coração
  protected readonly logoMobileFailed = signal(false);
}
