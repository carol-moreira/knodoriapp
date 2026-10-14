import { Component, computed, inject, output, signal } from "@angular/core";
import { AlertCircle, AtSign, CheckCircle2, Heart, Loader2, Upload } from "lucide-angular";
import type { OnboardingData } from "@/lib/auth";
import { AuthService } from "@/services/auth.service";
import { IconDirective } from "@/shared/icon.directive";
import { inputValue } from "@/shared/dom";
import { inputCls, labelCls } from "../auth-form.styles";

// ---------------------------------------------------------------------------
// Avatar presets
// ---------------------------------------------------------------------------

interface AvatarPreset {
  id: string;
  emoji: string;
  bg: string; // classes Tailwind
  ring: string; // classes Tailwind para o anel de seleção
}

const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "cherry", emoji: "🍒", bg: "bg-rose-100", ring: "ring-rose-400" },
  { id: "star", emoji: "⭐", bg: "bg-amber-100", ring: "ring-amber-400" },
  { id: "moon", emoji: "🌙", bg: "bg-indigo-100", ring: "ring-indigo-400" },
  { id: "flower", emoji: "🌸", bg: "bg-pink-100", ring: "ring-pink-400" },
  { id: "heart", emoji: "💖", bg: "bg-red-100", ring: "ring-red-400" },
  { id: "crystal", emoji: "💎", bg: "bg-sky-100", ring: "ring-sky-400" },
];

@Component({
  selector: "app-onboarding-screen",
  imports: [IconDirective],
  templateUrl: "./onboarding-screen.component.html",
  styleUrl: "./onboarding-screen.component.scss",
})
export class OnboardingScreenComponent {
  readonly complete = output<void>();

  private readonly auth = inject(AuthService);

  protected readonly icons = { AlertCircle, AtSign, CheckCircle2, Heart, Loader2, Upload };
  protected readonly labelCls = labelCls;
  protected readonly inputCls = inputCls;
  protected readonly val = inputValue;
  protected readonly presets = AVATAR_PRESETS;

  protected readonly nome = signal(this.auth.user()?.nome ?? "");
  protected readonly username = signal("");
  protected readonly selectedPreset = signal<string | null>(null);
  protected readonly uploadedAvatar = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal("");
  protected readonly touched = signal({ nome: false, username: false });

  // Validações
  protected readonly nomeError = computed(() =>
    this.touched().nome && this.nome().trim().length < 2 ? "mínimo de 2 caracteres." : "",
  );
  protected readonly rawUsername = computed(() => this.username().replace(/^@/, ""));
  protected readonly usernameError = computed(() => {
    const raw = this.rawUsername();
    if (this.touched().username && raw.length < 3) return "mínimo de 3 caracteres.";
    if (this.touched().username && /[^a-z0-9_.]/i.test(raw))
      return "use apenas letras, números, _ e .";
    return "";
  });

  protected readonly canSubmit = computed(
    () =>
      this.nome().trim().length >= 2 &&
      this.rawUsername().length >= 3 &&
      !this.usernameError() &&
      !this.loading(),
  );

  // Avatar efetivo (upload tem prioridade sobre preset)
  protected readonly effectiveAvatar = computed(
    () => this.uploadedAvatar() ?? this.selectedPreset(),
  );
  protected readonly previewPreset = computed(() =>
    AVATAR_PRESETS.find((p) => p.id === this.effectiveAvatar()),
  );
  protected readonly initials = computed(
    () => this.nome().trim().slice(0, 2).toUpperCase() || "??",
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  protected touch(field: "nome" | "username"): void {
    this.touched.update((t) => ({ ...t, [field]: true }));
  }

  protected onUsernameInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const next = input.value.replace(/^@/, "").toLowerCase();
    this.username.set(next);
    // Input controlado: reflete o valor normalizado mesmo quando o estado não muda
    if (input.value !== next) input.value = next;
  }

  protected selectPreset(id: string): void {
    this.selectedPreset.set(id);
    this.uploadedAvatar.set(null);
  }

  protected isSelected(preset: AvatarPreset): boolean {
    return !this.uploadedAvatar() && this.selectedPreset() === preset.id;
  }

  protected presetClass(preset: AvatarPreset): string {
    return `group flex h-11 w-full flex-col items-center justify-center rounded-2xl transition-all ${
      preset.bg
    } ${this.isSelected(preset) ? `ring-2 ${preset.ring} scale-110 shadow-sm` : "ring-1 ring-border hover:scale-105"}`;
  }

  protected handleFileChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      this.error.set("selecione uma imagem (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      this.error.set("imagem muito grande. máximo 4 MB.");
      return;
    }
    this.error.set("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      this.uploadedAvatar.set(ev.target?.result as string);
      this.selectedPreset.set(null);
    };
    reader.readAsDataURL(file);
  }

  protected async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    this.touched.set({ nome: true, username: true });
    if (!this.canSubmit()) return;

    this.loading.set(true);
    this.error.set("");

    const data: OnboardingData = {
      nome: this.nome().trim(),
      username: `@${this.rawUsername()}`,
      // 🔌 upload real: await uploadToStorage(uploadedAvatar) → URL
      avatarUrl: this.uploadedAvatar() ?? this.selectedPreset() ?? undefined,
    };

    try {
      await this.auth.completeOnboarding(data);
      this.complete.emit();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : "erro ao salvar perfil.");
    } finally {
      this.loading.set(false);
    }
  }
}
