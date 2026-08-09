import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  imports: [RouterLink],
  template: `<main class="center">
    <span class="error-code">403</span>
    <h1>This area has a different key.</h1>
    <p>Your role does not include access to this page.</p>
    <a class="btn primary" routerLink="/dashboard">Return to dashboard</a>
  </main>`,
})
export class Forbidden {}
