import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: [`:host { display: block; }`]
})
export class App implements OnInit {

  constructor(private themeService: ThemeService) {}

  ngOnInit() {
    // Apply theme before the dashboard loads:
    // ThemeService reads localStorage immediately (0 ms latency),
    // then fetches server config and overwrites with server truth.
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        if (user?.email) {
          this.themeService.loadAndApply(user.email);
        }
      }
    } catch {
      // localStorage inaccessible (private mode) — not blocking
    }
  }
}
