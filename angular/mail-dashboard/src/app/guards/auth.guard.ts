import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      const u = JSON.parse(stored);
      if (u?.email) return true;
    }
  } catch { /* noop */ }
  router.navigate(['/'], { replaceUrl: true });
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      const u = JSON.parse(stored);
      if (u?.email && u?.role === 'admin') return true;
    }
  } catch { /* noop */ }
  router.navigate(['/'], { replaceUrl: true });
  return false;
};
