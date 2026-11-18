import { Component, inject, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { Row } from '../core/models';
import { MapComponent, MapMarker } from '../shared/map.component';
import { StatusPipe } from '../shared/status.pipe';

@Component({
  imports: [DecimalPipe, RouterLink, MapComponent, StatusPipe],
  template: `
    <div class="page-heading"><div><div class="eyebrow">VOTRE CENTRE DE CONTRÔLE</div><h1>Chaque livraison compte<span class="accent">.</span></h1><p>Une vue claire sur vos opérations, de l’entrepôt au dernier kilomètre.</p></div><a class="button primary" routerLink="/routes/optimize"><span>✧</span> Planifier une tournée <span>↗</span></a></div>
    @if(error()){<div class="alert error" role="alert">{{error()}} <button class="text-button" (click)="load()">Réessayer</button></div>}
    <div class="overview-banner"><div><span class="live-dot"></span><strong>Vos opérations, connectées.</strong><span>Positions fictives à Casablanca · données issues d’Oracle</span></div><span class="chip">◎ ORACLE SPATIAL {{stats()?.databaseVersion || ''}}</span></div>
    <div class="kpi-grid">
      <article class="kpi"><div class="kpi-top">Commandes au total<span class="kpi-icon">▤</span></div><strong>{{stats()?.totalOrders ?? '—'}}<small>commandes</small></strong><div class="kpi-note"><span class="little-dot"></span>{{stats()?.pendingOrders ?? '—'}} en attente d’affectation</div></article>
      <article class="kpi"><div class="kpi-top">Livreurs disponibles<span class="kpi-icon">↗</span></div><strong>{{stats()?.availableDrivers ?? '—'}}<small>/ {{stats()?.totalDrivers ?? '—'}} livreurs</small></strong><div class="kpi-note"><span class="little-dot"></span>Prêts pour la prochaine tournée</div></article>
      <article class="kpi"><div class="kpi-top">Tournées actives<span class="kpi-icon">↝</span></div><strong>{{stats()?.activeRoutes ?? '—'}}<small>tournées</small></strong><div class="kpi-note">Planifiées ou en cours d’exécution</div></article>
      <article class="kpi highlight"><div class="kpi-top">Kilomètres économisés<span class="kpi-icon">✧</span></div><strong>{{(stats()?.savedKm ?? 0) | number:'1.1-1'}}<small>km estimés</small></strong><div class="kpi-note">Gain 2-opt par rapport à Nearest Neighbor</div></article>
    </div>
    <div class="dashboard-middle"><section class="panel map-panel"><div class="panel-heading"><div><h2>Le terrain, en un regard</h2><p>Dépôts, livreurs et destinations de livraison</p></div><a class="text-link" routerLink="/map">Ouvrir la carte ↗</a></div><gd-map [markers]="markers()" /></section>
      <section class="panel fleet-panel"><div class="panel-heading"><div><h2>Votre flotte</h2><p>Les personnes derrière vos livraisons</p></div><span class="chip">{{drivers().length}} livreurs</span></div>
      <div class="fleet-list">@for(d of drivers().slice(0,5);track d.id){<div class="fleet-row"><div class="avatar fleet">{{d.name[0]}}</div><div><strong>{{d.name}}</strong><small>Casablanca · GPS enregistré</small></div><span class="status" [class]="d.status">{{d.status | statusLabel}}</span></div>}</div>
      <a class="fleet-footer text-link" routerLink="/drivers">Gérer tous les livreurs <span>→</span></a></section></div>
    <div class="dashboard-bottom"><section class="panel"><div class="panel-heading"><div><h2>Dernières commandes</h2><p>De nouvelles destinations à organiser</p></div><a class="text-link" routerLink="/orders">Tout voir →</a></div>
      <div class="table-wrap"><table><thead><tr><th>Référence</th><th>Client</th><th>Poids</th><th>Statut</th></tr></thead><tbody>
        @for(o of orders().slice(0,5);track o.id){<tr><td class="reference">{{o.reference}}</td><td>{{o.clientName}}</td><td>{{o.weightKg}} kg</td><td><span class="status" [class]="o.status">{{o.status | statusLabel}}</span></td></tr>}
        @if(!orders().length){<tr><td colspan="4" class="empty">{{stats() ? 'Aucune commande.' : 'Chargement des données Oracle…'}}</td></tr>}
      </tbody></table></div></section>
      <section class="panel spatial-note"><span class="eyebrow">SOUS LE CAPOT</span><div class="spatial-note-icon">◎</div><h2>La géographie fait<br>la différence.</h2><p>Index spatiaux, recherche de proximité et optimisation : vos données Oracle passent à l’action.</p><div class="code-chips"><code>SDO_NN</code><code>SDO_DISTANCE</code><code>2-opt</code></div><small>Distances géodésiques · tracés non routiers</small></section></div>
  `
})
export class DashboardComponent {
  api = inject(ApiService);
  stats = signal<any>(null); drivers = signal<Row[]>([]); orders = signal<Row[]>([]);
  clients = signal<Row[]>([]); depots = signal<Row[]>([]); error = signal('');
  markers = computed<MapMarker[]>(() => [
    ...this.clients().map(c => ({ ...c, label: c.name, detail: c.address, kind: 'client' as const, latitude: c.latitude, longitude: c.longitude })),
    ...this.drivers().map(d => ({ ...d, label: d.name, detail: d.status, kind: 'driver' as const, latitude: d.latitude, longitude: d.longitude })),
    ...this.depots().map(d => ({ ...d, label: d.name, detail: d.address, kind: 'depot' as const, latitude: d.latitude, longitude: d.longitude }))
  ]);
  constructor() { void this.load(); }
  async load() {
    this.error.set('');
    try {
      const [stats, drivers, orders, clients, depots] = await Promise.all([
        this.api.get<any>('dashboard/stats'), this.api.get('drivers?size=200'), this.api.get('orders?size=5'),
        this.api.get('clients?size=200'), this.api.get('depots?size=200')
      ]);
      this.stats.set(stats); this.drivers.set(drivers); this.orders.set(orders); this.clients.set(clients); this.depots.set(depots);
    } catch(e) { this.error.set(errorMessage(e)); }
  }
}
