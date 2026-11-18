import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ApiService, errorMessage } from '../core/api.service';
import { Row } from '../core/models';
import { MapComponent, MapMarker } from '../shared/map.component';

@Component({
  imports:[ReactiveFormsModule,DecimalPipe,MapComponent],
  template:`<div class="page-heading"><div><div class="eyebrow">L’INTELLIGENCE DE LA PROXIMITÉ</div><h1>À la bonne distance<span class="accent">.</span></h1><p>Explorez les positions et trouvez les livreurs disponibles avec les opérateurs Oracle Spatial.</p></div><span class="chip">◎ SRID 4326 · WGS84</span></div>
    @if(error()){<div class="alert error" role="alert">{{error()}}</div>}
    <div class="map-page-grid"><section class="panel proximity-panel"><div class="panel-heading"><div><h2>Rechercher à proximité</h2><p>Les distances sont calculées dans Oracle.</p></div></div>
      <form [formGroup]="form" class="stack"><label>Position de référence<select formControlName="clientId">@for(c of clients();track c.id){<option [ngValue]="c.id">{{c.name}}</option>}</select></label>
        <label>Nombre de voisins<select formControlName="limit"><option [ngValue]="3">3 livreurs</option><option [ngValue]="5">5 livreurs</option><option [ngValue]="10">10 livreurs</option></select></label>
        <button type="button" class="button primary full" [disabled]="busy() || form.invalid" (click)="nearest()">⌖ Trouver les plus proches</button>
        <div class="section-divider"></div><label>Rayon de recherche (km)<input type="number" formControlName="radiusKm" min=".01" max="100" step=".5"></label>
        <button type="button" class="button secondary full" [disabled]="busy() || form.invalid" (click)="radius()">◎ Rechercher dans le rayon</button>
      </form>
      @if(searched()){<div class="proximity-results"><span class="eyebrow">{{mode()}} · {{results().length}} RÉSULTATS</span>
        @for(d of results();track d.id){<div class="fleet-row"><div class="avatar">{{d.name[0]}}</div><div><strong>{{d.name}}</strong><small>Disponible</small></div><strong>{{d.distanceKm | number:'1.2-2'}} km</strong></div>}
        @if(!results().length){<p class="muted">Aucun livreur disponible dans cette recherche.</p>}
      </div>}
      <p class="helper">SDO_NN avec filtrage des disponibilités, SDO_NN_DISTANCE et SDO_WITHIN_DISTANCE. Pas de simulation temps réel.</p>
      <button class="text-button" (click)="reset()">Réafficher toutes les positions →</button>
    </section><section class="panel map-large"><gd-map [markers]="markers()" /><div class="inline-note">{{clients().length}} clients · {{drivers().length}} livreurs · {{depots().length}} dépôts chargés (200 maximum par catégorie).</div></section></div>`
})
export class MapPageComponent {
  api=inject(ApiService); fb=inject(FormBuilder);
  clients=signal<Row[]>([]); drivers=signal<Row[]>([]); depots=signal<Row[]>([]);
  results=signal<Row[]>([]); error=signal(''); busy=signal(false); searched=signal(false); mode=signal('');
  reference=signal<number | null>(null);
  form=this.fb.group({clientId:[null as number | null,Validators.required],limit:[5],radiusKm:[5,[Validators.required,Validators.min(.01),Validators.max(100)]]});
  markers=computed<MapMarker[]>(() => {
    const clients=this.searched()?this.clients().filter(c => c.id === this.reference()):this.clients();
    const drivers=this.searched()?this.results():this.drivers();
    return [
      ...clients.map(c => ({latitude:c.latitude,longitude:c.longitude,label:c.name,detail:c.address,kind:'client' as const})),
      ...drivers.map(d => ({latitude:d.latitude,longitude:d.longitude,label:d.name,detail:`Statut : ${d.status}`,kind:'driver' as const})),
      ...this.depots().map(d => ({latitude:d.latitude,longitude:d.longitude,label:d.name,detail:d.address,kind:'depot' as const}))
    ];
  });
  constructor() { void this.load(); }
  async load() {
    try {
      const [c,d,p]=await Promise.all([this.api.get('clients?size=200'),this.api.get('drivers?size=200'),this.api.get('depots?size=200')]);
      this.clients.set(c); this.drivers.set(d); this.depots.set(p); this.form.patchValue({clientId:c[0]?.id ?? null});
    } catch(e) { this.error.set(errorMessage(e)); }
  }
  nearest() { void this.search('nearest-drivers',`limit=${this.form.value.limit}`,'SDO_NN'); }
  radius() { void this.search('drivers-within-radius',`radiusKm=${this.form.value.radiusKm}`,'SDO_WITHIN_DISTANCE'); }
  async search(path: string,query: string,mode: string) {
    this.busy.set(true); this.error.set('');
    try {
      this.results.set(await this.api.get(`spatial/${path}?clientId=${this.form.value.clientId}&${query}`));
      this.reference.set(this.form.value.clientId!); this.mode.set(mode); this.searched.set(true);
    } catch(e) { this.error.set(errorMessage(e)); } finally { this.busy.set(false); }
  }
  reset() { this.searched.set(false); this.results.set([]); }
}
