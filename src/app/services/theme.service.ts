import { DOCUMENT } from "@angular/common";
import { Injectable, effect, inject, signal } from "@angular/core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ColorTheme =
  "classic-elegance" | "winter-frost" | "matcha-latte" | "spring-blossom" | "berry-vanilla";

export type AppMode = "light" | "dark";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_THEME = "knodori-color-theme";
const STORAGE_MODE = "knodori-mode";

export const DEFAULT_THEME: ColorTheme = "classic-elegance";

/** Nome exibido + as 3 cores da paleta original (prévia no seletor de tema). */
export const THEME_META: Record<ColorTheme, { label: string; palette: [string, string, string] }> =
  {
    "classic-elegance": { label: "classic elegance", palette: ["#06141b", "#b4c6d7", "#043a51"] },
    "winter-frost": { label: "winter frost", palette: ["#d9e7f8", "#6371a2", "#56021e"] },
    "matcha-latte": { label: "matcha latte", palette: ["#f7cf89", "#83965f", "#4f5139"] },
    "spring-blossom": { label: "spring blossom", palette: ["#d1f985", "#ffe1e7", "#fc97b7"] },
    "berry-vanilla": { label: "berry vanilla", palette: ["#da6c81", "#f5e9d0", "#bf2b54"] },
  };

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage indisponível */
  }
}

/** Tema de cor + modo claro/escuro (substitui o ThemeProvider/useTheme do React). */
@Injectable({ providedIn: "root" })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  private readonly _colorTheme = signal<ColorTheme>(DEFAULT_THEME);
  private readonly _mode = signal<AppMode>("light");

  readonly colorTheme = this._colorTheme.asReadonly();
  readonly mode = this._mode.asReadonly();

  constructor() {
    const storedTheme = readStorage(STORAGE_THEME) as ColorTheme | null;
    const storedMode = readStorage(STORAGE_MODE) as AppMode | null;
    if (storedTheme && storedTheme in THEME_META) this._colorTheme.set(storedTheme);
    if (storedMode === "light" || storedMode === "dark") this._mode.set(storedMode);

    effect(() => {
      this.document.documentElement.setAttribute("data-theme", this._colorTheme());
    });

    effect(() => {
      const html = this.document.documentElement;
      if (this._mode() === "dark") html.classList.add("dark");
      else html.classList.remove("dark");
    });
  }

  setColorTheme(t: ColorTheme): void {
    this._colorTheme.set(t);
    writeStorage(STORAGE_THEME, t);
  }

  setMode(m: AppMode): void {
    this._mode.set(m);
    writeStorage(STORAGE_MODE, m);
  }
}
