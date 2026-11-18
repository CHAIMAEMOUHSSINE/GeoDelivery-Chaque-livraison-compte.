import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
  @if (auth.session(); as session) {
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" routerLink="/dashboard"><span class="brand-icon">g<span>↗</span></span>GeoDelivery<span class="brand-period">.</span></a>
        <div class="workspace"><span class="workspace-icon">C</span><div>Casablanca <small>Espace de démonstration</small></div><span class="workspace-chevron">⌄</span></div>
        <div class="nav-caption">ESPACE OPÉRATIONS</div>
        <nav aria-label="Navigation principale">
          @for (item of nav; track item.path) {
            @if (session.role !== 'DRIVER' || item.driver) {
              <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{exact: item.path === '/routes'}">
                <span class="nav-symbol">{{item.icon}}</span>{{item.label}} @if(item.path === '/routes/optimize'){<span class="nav-new">NN + 2-opt</span>}
              </a>
            }
          }
        </nav>
        <div class="sidebar-bottom">
          <div class="spatial-card"><span class="spatial-orbit">◎</span><strong>La donnée au bon endroit.</strong><p>Oracle Spatial au cœur de chaque livraison.</p><span class="chip dark">WGS84 · SRID 4326</span></div>
          <div class="profile"><div class="avatar">{{session.email[0].toUpperCase()}}</div><div><strong>{{session.role === 'ADMIN' ? 'Administration' : session.role === 'DRIVER' ? 'Livreur' : 'Dispatch'}}</strong><small>{{session.email}}</small></div><button class="icon-button" (click)="auth.logout()" title="Se déconnecter" aria-label="Se déconnecter">⇥</button></div>
        </div>
      </aside>
      <div class="main-shell">
        <header class="topbar"><div><span class="breadcrumb">Espace opérations</span><span class="slash">/</span><strong>GeoDelivery</strong></div><div class="topbar-right"><span class="environment"><i></i>Environnement local</span><span class="topbar-divider"></span><span>Casablanca, MA</span><span class="avatar small">{{session.email[0].toUpperCase()}}</span></div></header>
        <main><router-outlet /></main>
        <footer>GeoDelivery · Projet Oracle Spatial <span>GLSID 3 · 2026–2027</span></footer>
      </div>
    </div>
  } @else { <router-outlet /> }`
})
export class AppComponent {
  auth = inject(AuthService);
  nav = [
    { path: '/dashboard', label: 'Vue d’ensemble', icon: '▦' },
    { path: '/map', label: 'Carte en direct', icon: '⌖' },
    { path: '/orders', label: 'Commandes', icon: '▤' },
    { path: '/routes', label: 'Tournées', icon: '↝', driver: true },
    { path: '/routes/optimize', label: 'Optimisation', icon: '✧' },
    { path: '/deliveries', label: 'Livraisons', icon: '✓', driver: true },
    { path: '/drivers', label: 'Livreurs', icon: '♧' },
    { path: '/clients', label: 'Clients', icon: '♙' },
    { path: '/vehicles', label: 'Véhicules', icon: '▱' },
    { path: '/depots', label: 'Dépôts', icon: '⌂' }
  ];
}
