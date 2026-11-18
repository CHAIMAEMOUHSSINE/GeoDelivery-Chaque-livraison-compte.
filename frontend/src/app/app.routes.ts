import { Routes } from '@angular/router';
import { authGuard, dispatchGuard } from './core/auth.service';

export const routes: Routes = [
  {path:'login',loadComponent:() => import('./features/login.component').then(m => m.LoginComponent)},
  {path:'',canActivate:[authGuard],children:[
    {path:'dashboard',canActivate:[dispatchGuard],loadComponent:() => import('./features/dashboard.component').then(m => m.DashboardComponent)},
    {path:'map',canActivate:[dispatchGuard],loadComponent:() => import('./features/map-page.component').then(m => m.MapPageComponent)},
    {path:'routes/optimize',canActivate:[dispatchGuard],loadComponent:() => import('./features/planner.component').then(m => m.PlannerComponent)},
    {path:'routes/:id',loadComponent:() => import('./features/route-detail.component').then(m => m.RouteDetailComponent)},
    ...['clients','drivers','vehicles','depots','orders','routes','deliveries'].map(kind => ({
      path:kind,data:{kind},canActivate:['routes','deliveries'].includes(kind)?[]:[dispatchGuard],
      loadComponent:() => import('./features/resources.component').then(m => m.ResourcesComponent)
    })),
    {path:'',pathMatch:'full',redirectTo:'dashboard'}
  ]},
  {path:'**',redirectTo:'dashboard'}
];
