import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Row, Stop } from '../core/models';
import { MapComponent, MapMarker } from '../shared/map.component';
import { StatusPipe } from '../shared/status.pipe';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  imports:[RouterLink,DecimalPipe,MapComponent,StatusPipe,ReactiveFormsModule],
  template:`<a class="text-link back-link" routerLink="/routes">← Toutes les tournées</a>
    <div class="page-heading"><div><div class="eyebrow">LE PARCOURS EN DÉTAIL</div><h1>Tournée #{{id}}<span class="accent">.</span></h1><p>{{route()?.driverName}} · {{route()?.depotName}}</p></div>
      @if(route();as r){<div class="heading-actions"><span class="status" [class]="r.status">{{r.status | statusLabel}}</span>
      @if(r.status === 'PLANNED'){<button class="button primary" [disabled]="busy()" (click)="transition('IN_PROGRESS')">Démarrer la tournée →</button>
        @if(auth.session()?.role !== 'DRIVER'){<button class="button secondary" [disabled]="busy()" (click)="cancel()">Annuler</button>}}</div>}
    </div>
    @if(error()){<div class="alert error" role="alert">{{error()}}</div>}
    @if(route();as r){
      <div class="route-summary"><div><small>Distance géodésique</small><strong>{{r.totalDistanceKm | number:'1.2-2'}} km</strong></div><div><small>Algorithme</small><strong>{{r.algorithm === 'TWO_OPT' ? 'NN + 2-opt' : 'Nearest Neighbor'}}</strong></div><div><small>Arrêts</small><strong>{{r.orderedStops.length}}</strong></div><div><small>Retour au dépôt</small><strong>{{r.returnToDepot ? 'Inclus' : 'Non'}}</strong></div></div>
      <div class="route-detail-grid"><section class="panel"><div class="panel-heading"><div><h2>Un arrêt après l’autre</h2><p>Les coordonnées du plan sont figées lors de la confirmation.</p></div></div>
        @for(s of r.orderedStops;track s.orderId){<div class="stop-row"><span class="stop-number">{{s.sequence}}</span><div><strong>{{s.clientName}}</strong><small>{{s.reference}}</small><small>{{s.segmentDistanceKm | number:'1.2-2'}} km depuis l’arrêt précédent</small></div><div class="stop-actions"><span class="status" [class]="s.deliveryStatus">{{s.deliveryStatus | statusLabel}}</span>
          @if(r.status === 'IN_PROGRESS' && s.deliveryStatus === 'IN_PROGRESS'){<button class="text-button" [disabled]="busy()" (click)="delivery(s,'DELIVERED')">Livrer ✓</button><button class="text-button danger" [disabled]="busy()" (click)="delivery(s,'FAILED')">Échec</button>}
        </div></div>}
        @if(r.returnToDepot){<div class="stop-row"><span class="stop-number depot">⌂</span><div><strong>Retour au dépôt</strong><small>{{r.returnDistanceKm | number:'1.2-2'}} km</small></div></div>}
      </section><section class="panel map-large"><gd-map [markers]="markers()" [path]="path()" /></section></div>
      <div class="inline-note">Tracé indicatif, pas un itinéraire routier. Une livraison FAILED reste à traiter ; elle bloque la clôture dans ce MVP.</div>
      <section class="panel position-panel"><h2>Actualiser la position du livreur</h2><form class="position-form" [formGroup]="position" (ngSubmit)="updatePosition()"><label>Latitude<input type="number" step="any" formControlName="latitude"></label><label>Longitude<input type="number" step="any" formControlName="longitude"></label><button class="button secondary" type="submit" [disabled]="position.invalid || busy()">Enregistrer le GPS</button></form>
      @if(positionSaved()){<small class="positive">Position enregistrée dans Oracle.</small>}</section>
    }`
})
export class RouteDetailComponent {
  api=inject(ApiService); auth=inject(AuthService); id=Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  route=signal<any>(null); error=signal(''); busy=signal(false); positionSaved=signal(false);
  position=inject(FormBuilder).nonNullable.group({latitude:[33.57,[Validators.required,Validators.min(-90),Validators.max(90)]],longitude:[-7.63,[Validators.required,Validators.min(-180),Validators.max(180)]]});
  markers=computed<MapMarker[]>(() => {
    const r=this.route(); return r ? [{...r.depot,label:r.depotName,kind:'depot'},...r.orderedStops.map((s: Stop) => ({...s,label:s.clientName,detail:s.reference,kind:'stop'}))] : [];
  });
  path=computed(() => { const r=this.route(); return r ? [r.depot,...r.orderedStops,...(r.returnToDepot?[r.depot]:[])] : []; });
  constructor() { void this.load(); }
  async load() { try { this.route.set(await this.api.get(`routes/${this.id}`)); } catch(e) { this.error.set(errorMessage(e)); } }
  async action(fn: () => Promise<unknown>) {
    this.busy.set(true); this.error.set('');
    try { await fn(); await this.load(); } catch(e) { this.error.set(errorMessage(e)); } finally { this.busy.set(false); }
  }
  transition(status: string) { void this.action(() => this.api.patch(`routes/${this.id}/status`,{status})); }
  cancel() { if(confirm('Annuler la tournée et ses commandes ? Cette version ne permet pas de replanifier ces commandes.')) this.transition('CANCELLED'); }
  delivery(stop: Stop,status: string) {
    if(status === 'FAILED' && !confirm('Signaler un échec ? Le retraitement des échecs est hors périmètre de ce MVP.')) return;
    void this.action(() => this.api.patch(`deliveries/${stop.deliveryId}/status`,{status}));
  }
  async updatePosition() {
    this.positionSaved.set(false);
    await this.action(() => this.api.put(`drivers/${this.route().driverId}/position`,this.position.getRawValue()));
    if(!this.error()) this.positionSaved.set(true);
  }
}
