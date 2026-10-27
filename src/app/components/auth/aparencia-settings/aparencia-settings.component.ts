import { NgTemplateOutlet } from "@angular/common";
import { Component, inject } from "@angular/core";
import { Moon, Palette, Sun } from "lucide-angular";
import { THEME_META, ThemeService, type AppMode, type ColorTheme } from "@/services/theme.service";
import { IconDirective } from "@/shared/icon.directive";

/** Modo claro/escuro + tema de cores (aplica na hora, sem botão de salvar). */
@Component({
  selector: "app-aparencia-settings",
  imports: [IconDirective, NgTemplateOutlet],
  templateUrl: "./aparencia-settings.component.html",
  styleUrl: "./aparencia-settings.component.scss",
})
export class AparenciaSettingsComponent {
  protected readonly theme = inject(ThemeService);

  protected readonly icons = { Moon, Palette, Sun };
  protected readonly THEME_META = THEME_META;
  protected readonly modes: { value: AppMode; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "claro", icon: Sun },
    { value: "dark", label: "escuro", icon: Moon },
  ];
  protected readonly themes = Object.keys(THEME_META) as ColorTheme[];

  protected themeLabel(t: ColorTheme): string {
    return THEME_META[t].label;
  }

  /** Faixas com as 3 cores da paleta do tema. */
  protected swatch(t: ColorTheme): string {
    const [c1, c2, c3] = THEME_META[t].palette;
    return `linear-gradient(90deg, ${c1} 0 33.33%, ${c2} 33.33% 66.66%, ${c3} 66.66%)`;
  }

  protected swatchClass(t: ColorTheme, compact: boolean): string {
    const isActive = this.theme.colorTheme() === t;
    return `relative flex flex-col items-center gap-1.5 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      compact ? "p-2" : "p-2.5"
    } ${
      isActive
        ? "ring-2 ring-primary ring-offset-1 ring-offset-card bg-primary/5"
        : "ring-1 ring-border/50 hover:ring-border hover:bg-muted/30"
    }`;
  }

  protected swatchLabelClass(t: ColorTheme, compact: boolean): string {
    const isActive = this.theme.colorTheme() === t;
    return `font-semibold leading-none transition-colors ${compact ? "text-[9px]" : "text-[11px]"} ${
      isActive ? "text-primary" : "text-muted-foreground"
    }`;
  }
}
