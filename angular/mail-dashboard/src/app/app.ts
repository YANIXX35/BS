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
    // Gmail OAuth popup: if this window was opened as a popup and carries the callback params,
    // relay the result to the opener and close — no Angular component needs to load.
    const urlParams = new URLSearchParams(window.location.search);
    if (window.opener && (urlParams.has('gmail_connected') || urlParams.has('gmail_error'))) {
      try {
        window.opener.postMessage({
          type: 'gmail_oauth',
          success: urlParams.get('gmail_connected') === '1',
          gmail_email: urlParams.get('gmail_email') || ''
        }, window.location.origin);
      } catch { /* opener may have navigated away */ }
      window.close();
      return;
    }

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
