import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { Shell } from './layout/shell';
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login').then((m) => m.Login) },
  {
    path: 'forbidden',
    loadComponent: () => import('./features/forbidden/forbidden').then((m) => m.Forbidden),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'conferences',
        loadComponent: () => import('./features/projects/projects').then((m) => m.Projects),
      },
      {
        path: 'conferences/new',
        canActivate: [roleGuard(['ADMIN', 'ORGANIZER'])],
        loadComponent: () =>
          import('./features/projects/conference-form').then((m) => m.ConferenceForm),
      },
      {
        path: 'conferences/:id/edit',
        canActivate: [roleGuard(['ADMIN', 'ORGANIZER'])],
        loadComponent: () =>
          import('./features/projects/conference-form').then((m) => m.ConferenceForm),
      },
      {
        path: 'conferences/:id/rooms',
        canActivate: [roleGuard(['ADMIN', 'ORGANIZER'])],
        loadComponent: () =>
          import('./features/projects/conference-rooms').then((m) => m.ConferenceRooms),
      },
      {
        path: 'conferences/:id',
        loadComponent: () =>
          import('./features/projects/project-detail').then((m) => m.ProjectDetail),
      },
      {
        path: 'admin',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () => import('./features/admin/users').then((m) => m.Users),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
