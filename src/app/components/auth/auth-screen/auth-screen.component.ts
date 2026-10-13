import { Component, output, signal } from "@angular/core";
import { Heart } from "lucide-angular";
import { IconDirective } from "@/shared/icon.directive";
import { GoogleButtonComponent } from "../google-button/google-button.component";
import { LoginFormComponent } from "../login-form/login-form.component";
import { RegisterFormComponent } from "../register-form/register-form.component";

type AuthTab = "login" | "register";

const FEATURES = [
  { emoji: "🌸", text: "Acompanhe seus pedidos em tempo real" },
  { emoji: "🍒", text: "Simule cotações JPY → BRL na hora" },
  { emoji: "💎", text: "Gerencie coleções e CEGs com sua GOM" },
];

// Decoração de fundo do painel esquerdo (CSS puro)
const FLOATING_ELEMENTS = [
  { emoji: "🍒", className: "top-16 right-16 text-4xl opacity-20" },
  { emoji: "🌸", className: "top-32 left-12 text-2xl opacity-15" },
  { emoji: "⭐", className: "bottom-32 right-20 text-3xl opacity-20" },
  { emoji: "💎", className: "bottom-20 left-16 text-2xl opacity-15" },
  { emoji: "🌙", className: "top-1/2 right-8 text-xl opacity-10" },
];

@Component({
  selector: "app-auth-screen",
  imports: [IconDirective, GoogleButtonComponent, LoginFormComponent, RegisterFormComponent],
  templateUrl: "./auth-screen.component.html",
  styleUrl: "./auth-screen.component.scss",
})
export class AuthScreenComponent {
  readonly authSuccess = output<void>();

  protected readonly icons = { Heart };
  protected readonly features = FEATURES;
  protected readonly floatingElements = FLOATING_ELEMENTS;
  protected readonly tabs: AuthTab[] = ["login", "register"];

  protected readonly tab = signal<AuthTab>("login");
  // Fallback do logo: se /logo.png não carregar, mostra o coração
  protected readonly logoDesktopFailed = signal(false);
  protected readonly logoMobileFailed = signal(false);
}
