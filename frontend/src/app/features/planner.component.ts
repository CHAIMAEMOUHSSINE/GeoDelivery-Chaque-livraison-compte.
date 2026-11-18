import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { Row, Plan, OptimizeRequest } from '../core/models';
import { MapComponent, MapMarker } from '../shared/map.component';

@Component({
  imports:[ReactiveFormsModule, DecimalPipe, MapComponent],
  template: `
    <div class="page-heading"><div><div class="eyebrow">FAITES MIEUX, PAS PLUS LONG</div><h1>Une tournée bien pensée<span class="accent">.</span></h1><p>Sélectionnez vos commandes. Oracle mesure les distances, les heuristiques organisent les arrêts.</p></div><span class="chip">✧ NEAREST NEIGHBOR + 2-OPT</span></div>
    @if(error()){<div class="alert error" role="alert">{{error()}}</div>}
    <div class="planner-grid"><section class="panel planner-controls"><div class="panel-heading"><div><h2>01. Configurez votre tournée</h2><p>Un livreur, un dépôt, plusieurs possibilités.</p></div></div>
      <form [formGroup]="form"><div class="form-grid">
        <label>Dépôt de départ<select formControlName="depotId">@for(d of depots();track d.id){<option [ngValue]="d.id">{{d.name}}</option>}</select></label>
        <label>Livreur disponible<select formControlName="driverId">@for(d of drivers();track d.id){<option [ngValue]="d.id">{{d.name}}</option>}</select></label>
        <label>Algorithme<select formControlName="algorithm"><option value="TWO_OPT">Nearest Neighbor + 2-opt</option><option value="NEAREST_NEIGHBOR">Nearest Neighbor seul</option></select></label>
        <label class="check-label"><input type="checkbox" formControlName="returnToDepot"> Retour au dépôt</label>
      </div></form>
      <div class="section-divider"></div><div class="selection-heading"><h2>02. Choisissez les commandes</h2><span class="chip">{{selected().size}} / 60</span></div>
      <input class="search-input full" aria-label="Rechercher une commande" placeholder="⌕ Référence ou client…" (input)="query.set($any($event.target).value.toLowerCase())">
      <div class="order-selection">@for(o of filtered();track o.id){<label class="order-option" [class.selected]="selected().has(o.id)"><input type="checkbox" [checked]="selected().has(o.id)" (change)="toggle(o.id)"><div><strong>{{o.reference}}</strong><small>{{o.clientName}}</small></div><span>{{o.weightKg}} kg</span></label>}
      @if(!orders().length){<div class="empty">Aucune commande en attente.</div>}</div>
      <div class="weight-summary"><span>Poids sélectionné</span><strong>{{totalWeight() | number:'1.1-2'}} kg</strong></div>
      <button class="button primary full" [disabled]="busy() || selected().size === 0 || form.invalid" (click)="optimize()">{{busy() ? 'Calcul Oracle en cours…' : '✧ Calculer le meilleur ordre →'}}</button>
      <p class="helper">L’aperçu ne crée aucune affectation. Maximum 60 arrêts ; 200 commandes proposées par chargement.</p>
    </section>
    <section class="planner-preview">
      <div class="panel"><div class="panel-heading"><div><h2>{{plan() ? 'Votre parcours optimisé' : 'Le prochain parcours commence ici'}}</h2><p>Tracé indicatif · segments droits · mode GEODESIC</p></div><span class="chip">◎ WGS84</span></div><gd-map [markers]="markers()" [path]="path()" /></div>
      @if(plan();as p){
        <div class="result-metrics"><div><small>Nearest Neighbor</small><strong>{{p.initialDistanceKm | number:'1.2-2'}} <span>km</span></strong></div><div><small>Après optimisation</small><strong>{{p.optimizedDistanceKm | number:'1.2-2'}} <span>km</span></strong></div><div class="result-gain"><small>Distance économisée</small><strong>{{p.improvementPercent === null ? '—' : (p.improvementPercent | number:'1.1-2')}} <span>%</span></strong></div></div>
        <div class="panel result-stops"><div class="panel-heading"><div><h2>03. Vérifiez et confirmez</h2><p>{{p.stopCount}} arrêts · {{p.computationTimeMs | number:'1.0-0'}} ms · {{p.totalWeightKg}} / {{p.capacityKg}} kg</p></div><button class="button primary" [disabled]="busy()" (click)="confirmPlan()">Confirmer la tournée ✓</button></div>
          @for(s of p.orderedStops;track s.orderId){<div class="stop-row"><span class="stop-number">{{s.sequence}}</span><div><strong>{{s.clientName}}</strong><small>{{s.reference}} · {{s.address}}</small></div><span>{{s.segmentDistanceKm | number:'1.2-2'}} km</span></div>}
          @if(p.returnToDepot){<div class="stop-row"><span class="stop-number depot">⌂</span><div><strong>Retour au dépôt</strong></div><span>{{p.returnDistanceKm | number:'1.2-2'}} km</span></div>}
        </div>
      } @else {<div class="optimization-explainer"><span>✧</span><div><strong>L’intelligence des distances, sans détour.</strong><p>Nearest Neighbor construit un premier ordre. 2-opt améliore cet ordre sans garantir l’optimum global. Aucun réseau routier n’est utilisé.</p></div></div>}
    </section></div>`
})
export class PlannerComponent {
  api = inject(ApiService); fb = inject(FormBuilder); router = inject(Router);
  depots = signal<Row[]>([]); drivers = signal<Row[]>([]); orders = signal<Row[]>([]);
  selected = signal(new Set<number>()); query = signal(''); busy = signal(false); error = signal('');
  plan = signal<Plan | null>(null); request: OptimizeRequest | null = null;
  selectedDepot = signal<number | null>(null);
  form = this.fb.group({depotId:[null as number | null,Validators.required],driverId:[null as number | null,Validators.required],
    algorithm:['TWO_OPT' as 'TWO_OPT' | 'NEAREST_NEIGHBOR',Validators.required],returnToDepot:[true]});
  filtered = computed(() => this.orders().filter(o => `${o.reference} ${o.clientName}`.toLowerCase().includes(this.query())));
  totalWeight = computed(() => this.orders().filter(o => this.selected().has(o.id)).reduce((s,o) => s+Number(o.weightKg),0));
  markers = computed<MapMarker[]>(() => {
    const p = this.plan();
    if(p) return [{...p.depot,label:'Dépôt de départ',kind:'depot'},...p.orderedStops.map(s => ({...s,label:s.clientName,detail:s.reference,kind:'stop' as const}))];
    const depot = this.depots().find(d => d.id === this.selectedDepot());
    return [...(depot ? [{latitude:depot.latitude,longitude:depot.longitude,label:depot.name,kind:'depot' as const}] : []),
      ...this.orders().filter(o => this.selected().has(o.id)).map(o => ({latitude:o.latitude,longitude:o.longitude,label:o.clientName,detail:o.reference,kind:'client' as const}))];
  });
  path = computed(() => { const p=this.plan(); return p ? [p.depot,...p.orderedStops,...(p.returnToDepot?[p.depot]:[])] : []; });
  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(v => { this.selectedDepot.set(v.depotId ?? null); this.plan.set(null); this.request=null; });
    void this.load();
  }
  async load() {
    try {
      const [depots,drivers,orders] = await Promise.all([this.api.get('depots?size=200'),this.api.get('drivers?size=200'),this.api.get('orders?status=PENDING&size=200')]);
      this.depots.set(depots); this.drivers.set(drivers.filter(d => d.status === 'AVAILABLE')); this.orders.set(orders);
      this.form.patchValue({depotId:depots[0]?.id ?? null,driverId:this.drivers()[0]?.id ?? null});
      this.selected.set(new Set(orders.slice(0,5).map(o => o.id)));
    } catch(e) { this.error.set(errorMessage(e)); }
  }
  toggle(id: number) {
    const next=new Set(this.selected()); if(next.has(id)) next.delete(id); else if(next.size<60) next.add(id);
    this.selected.set(next); this.plan.set(null); this.request=null;
  }
  async optimize() {
    if(this.form.invalid || !this.selected().size) return;
    this.busy.set(true); this.error.set(''); this.plan.set(null);
    const v=this.form.getRawValue();
    this.request={driverId:v.driverId!,depotId:v.depotId!,algorithm:v.algorithm!,returnToDepot:!!v.returnToDepot,orderIds:[...this.selected()]};
    try { this.plan.set(await this.api.post<Plan>('routes/optimize',this.request)); }
    catch(e) { this.error.set(errorMessage(e)); this.request=null; } finally { this.busy.set(false); }
  }
  async confirmPlan() {
    if(!this.request || !this.plan()) return;
    this.busy.set(true); this.error.set('');
    try { const route=await this.api.post('routes',this.request); await this.router.navigate(['/routes',route.id]); }
    catch(e) { this.error.set(errorMessage(e)); } finally { this.busy.set(false); }
  }
}
