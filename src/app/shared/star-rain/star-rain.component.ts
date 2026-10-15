import { Component, computed, input } from "@angular/core";

interface Star {
  id: number;
  left: number; // %
  size: number; // px
  duration: number; // s
  delay: number; // s (negativo: já começa no meio da queda)
  drift: number; // px de deslocamento horizontal durante a queda
  spin: number; // graus de rotação durante a queda
  opacity: number;
  twinkle: number; // s
  tone: "primary" | "gold" | "white";
}

const TONES: Star["tone"][] = ["primary", "primary", "gold", "white"];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Chuva de mini estrelinhas caindo em posições/velocidades aleatórias (decorativo). */
@Component({
  selector: "app-star-rain",
  templateUrl: "./star-rain.component.html",
  styleUrl: "./star-rain.component.scss",
})
export class StarRainComponent {
  readonly count = input(40);

  protected readonly stars = computed<Star[]>(() =>
    Array.from({ length: this.count() }, (_, id) => {
      const duration = rand(6, 14);
      return {
        id,
        left: rand(0, 100),
        size: rand(5, 13),
        duration,
        delay: -rand(0, duration),
        drift: rand(-60, 60),
        spin: rand(-360, 360),
        opacity: rand(0.45, 0.95),
        twinkle: rand(1.2, 3),
        tone: TONES[Math.floor(Math.random() * TONES.length)],
      };
    }),
  );
}
