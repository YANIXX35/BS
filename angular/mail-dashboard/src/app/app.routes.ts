import { Routes } from '@angular/router';
import { Landing } from './components/landing/landing';
import { UserDashboard } from './components/user-dashboard/user-dashboard';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';

export const routes: Routes = [
  { path: '',           component: Landing },
  { path: 'dashboard',  component: UserDashboard },
  { path: 'admin',      component: AdminDashboard },
  { path: '**',         redirectTo: '' }
];
