import { Routes } from '@angular/router';
import { Landing } from './components/landing/landing';
import { UserDashboard } from './components/user-dashboard/user-dashboard';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '',           component: Landing },
  { path: 'dashboard',  component: UserDashboard,  canActivate: [authGuard] },
  { path: 'admin',      component: AdminDashboard, canActivate: [authGuard] },
  { path: '**',         redirectTo: '' }
];
