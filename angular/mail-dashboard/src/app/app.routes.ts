import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/landing/landing').then(m => m.Landing)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/user-dashboard/user-dashboard').then(m => m.UserDashboard),
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    loadComponent: () => import('./components/admin-dashboard/admin-dashboard').then(m => m.AdminDashboard),
    canActivate: [adminGuard]
  },
  {
    path: 'privacy',
    loadComponent: () => import('./components/legal/privacy').then(m => m.Privacy)
  },
  {
    path: 'terms',
    loadComponent: () => import('./components/legal/terms').then(m => m.Terms)
  },
  { path: '**', redirectTo: '' }
];
