import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";

/** Rota curinga (404). */
@Component({
  selector: "app-not-found-page",
  imports: [RouterLink],
  templateUrl: "./not-found.page.html",
  styleUrl: "./not-found.page.scss",
})
export class NotFoundPage {}
