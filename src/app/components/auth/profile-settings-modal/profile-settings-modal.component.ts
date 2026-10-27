import { Component, computed, effect, inject, input, output, signal } from "@angular/core";
import {
  AtSign,
  Camera,
  CheckCircle2,
  Heart,
  Link2,
  Palette,
  Phone,
  Upload,
  User,
  X,
} from "lucide-angular";
import { AuthService } from "@/services/auth.service";
import { DialogComponent } from "@/shared/dialog.component";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import { AparenciaSettingsComponent } from "../aparencia-settings/aparencia-settings.component";

const INPUT_CLS =
  "w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60";

@Component({
  selector: "app-profile-settings-modal",
  imports: [DialogComponent, IconDirective, AparenciaSettingsComponent],
  templateUrl: "./profile-settings-modal.component.html",
  styleUrl: "./profile-settings-modal.component.scss",
})
export class ProfileSettingsModalComponent {
  readonly open = input.required<boolean>();
  readonly closed = output<void>();

  private readonly auth = inject(AuthService);

  protected readonly icons = {
    AtSign,
    Camera,
    CheckCircle2,
    Heart,
    Link2,
    Palette,
    Phone,
    Upload,
    User,
    X,
  };
  protected readonly INPUT_CLS = INPUT_CLS;
  protected readonly val = inputValue;

  protected readonly nome = signal("");
  protected readonly username = signal("");
  protected readonly telefone = signal("");
  protected readonly faves = signal("");
  protected readonly wishlistUrl = signal("");
  protected readonly avatarPreview = signal<string | undefined>(undefined);

  protected readonly saving = signal(false);
  protected readonly saved = signal(false);

  protected readonly initials = computed(() =>
    (this.nome() || this.auth.user()?.nome || "?").slice(0, 2).toUpperCase(),
  );

  constructor() {
    // Sincroniza form quando o modal abre (ou o usuário muda com o modal aberto)
    effect(() => {
      const user = this.auth.user();
      if (this.open() && user) {
        this.nome.set(user.nome ?? "");
        this.username.set(user.username ?? "");
        this.telefone.set(user.telefone ?? "");
        this.faves.set(user.faves ?? "");
        this.wishlistUrl.set(user.wishlistUrl ?? "");
        this.avatarPreview.set(user.avatarUrl);
        this.saved.set(false);
      }
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.closed.emit();
  }

  // Upload de foto de perfil → base64
  protected handleAvatarChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => this.avatarPreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  // Upload de wishlist → usa nome do arquivo como label
  protected handleWishlistFile(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.wishlistUrl.set(file.name);
  }

  protected async handleSave(): Promise<void> {
    const user = this.auth.user();
    this.saving.set(true);
    // 🔌 Real: await fetch("/api/user/profile", { method: "PATCH", body: JSON.stringify({...}) })
    await new Promise((r) => setTimeout(r, 600));
    this.auth.updateUser({
      nome: this.nome().trim() || user?.nome,
      username: this.username().trim() || user?.username,
      avatarUrl: this.avatarPreview(),
      telefone: this.telefone().trim() || undefined,
      faves: this.faves().trim() || undefined,
      wishlistUrl: this.wishlistUrl().trim() || undefined,
    });
    this.saving.set(false);
    this.saved.set(true);
    setTimeout(() => {
      this.saved.set(false);
      this.closed.emit();
    }, 900);
  }
}
