import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Row } from '../core/models';
import { StatusPipe } from '../shared/status.pipe';

interface Field { key: string; label: string; type?: string; options?: {value: any; label: string}[]; required?: boolean; min?: number; max?: number; }
const CONFIG: Record<string, { title: string; singular: string; subtitle: string; columns: string[]; labels: string[] }> = {
  clients: { title: 'Clients', singular: 'client', subtitle: 'Vos destinations, leurs coordonnées et toutes les bonnes connexions.', columns: ['name', 'address', 'phone', 'active'], labels: ['Nom', 'Adresse', 'Téléphone', 'État'] },
  drivers: { title: 'Livreurs', singular: 'livreur', subtitle: 'Une équipe en mouvement, des positions toujours à portée de main.', columns: ['name', 'phone', 'status', 'latitude', 'longitude'], labels: ['Nom', 'Téléphone', 'Disponibilité', 'Latitude', 'Longitude'] },
  vehicles: { title: 'Véhicules', singular: 'véhicule', subtitle: 'Associez chaque livreur au véhicule et à la capacité adaptés.', columns: ['plateNumber', 'capacityKg', 'driverId'], labels: ['Immatriculation', 'Capacité (kg)', 'ID livreur'] },
  depots: { title: 'Dépôts', singular: 'dépôt', subtitle: 'Chaque bonne tournée commence au bon endroit.', columns: ['name', 'address', 'latitude', 'longitude'], labels: ['Dépôt', 'Adresse', 'Latitude', 'Longitude'] },
  orders: { title: 'Commandes', singular: 'commande', subtitle: 'De la première demande à la dernière livraison.', columns: ['reference', 'clientName', 'weightKg', 'priority', 'status'], labels: ['Référence', 'Client', 'Poids (kg)', 'Priorité', 'Statut'] },
  routes: { title: 'Tournées', singular: 'tournée', subtitle: 'Tous vos itinéraires et leur progression, au même endroit.', columns: ['id', 'driverName', 'depotName', 'totalDistanceKm', 'status'], labels: ['N°', 'Livreur', 'Dépôt', 'Distance géodésique (km)', 'Statut'] },
  deliveries: { title: 'Livraisons', singular: 'livraison', subtitle: 'Un suivi précis pour chaque arrêt de vos tournées.', columns: ['reference', 'clientName', 'driverName', 'routeId', 'status'], labels: ['Commande', 'Client', 'Livreur', 'Tournée', 'Statut'] }
};
@Component({
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe, StatusPipe],
  template: `
    <div class="page-heading"><div><div class="eyebrow">ESPACE OPÉRATIONS / {{config.title.toUpperCase()}}</div><h1>{{config.title}}<span class="accent">.</span></h1><p>{{config.subtitle}}</p></div>
      @if(kind === 'routes' && auth.session()?.role !== 'DRIVER'){<a routerLink="/routes/optimize" class="button primary">✧ Planifier une tournée</a>}
      @if(canCreate()){<button class="button primary" (click)="open()">＋ Ajouter un {{config.singular}}</button>}
    </div>
    @if(error()){<div class="alert error" role="alert">{{error()}} <button class="text-button" (click)="load()">Réessayer</button></div>}
    @if(success()){<div class="alert success" role="status">{{success()}}</div>}
    <section class="panel"><div class="resource-toolbar"><div class="tabs"><span class="tab active">{{config.title}} <span class="count">{{rows().length}}</span></span><span class="muted">Données Oracle</span></div>
      <div class="toolbar-controls"><input class="search-input" aria-label="Rechercher" placeholder="⌕  Rechercher…" [formControl]="search">
      @if(kind === 'orders'){<select aria-label="Filtrer par statut" [formControl]="status" (change)="filter()"><option value="ALL">Tous les statuts</option>@for(s of statuses;track s){<option [value]="s">{{s | statusLabel}}</option>}</select>}
      <button class="button secondary small-button" (click)="load()" [disabled]="loading()">↻ Actualiser</button></div>
    </div><div class="table-wrap"><table><thead><tr>@for(label of config.labels;track label){<th>{{label}}</th>}<th class="right">Actions</th></tr></thead>
      <tbody>@for(row of filtered();track row.id){<tr>@for(key of config.columns;track key){
        <td [class.reference]="key === 'reference' || key === 'name'">
          @if(key === 'status' || key === 'priority'){<span class="status" [class]="row[key]">{{row[key] | statusLabel}}</span>}
          @else if(key === 'active'){<span class="status" [class]="row[key] ? 'AVAILABLE' : 'OFFLINE'">{{row[key] ? 'Actif' : 'Désactivé'}}</span>}
          @else if(key === 'totalDistanceKm' || key === 'latitude' || key === 'longitude'){ {{row[key] | number:'1.2-4'}} }
          @else { {{row[key] ?? '—'}} }
        </td>}
        <td class="right actions">
          @if(kind === 'routes'){<a class="text-link" [routerLink]="['/routes',row.id]">Voir la tournée ↗</a>}
          @else if(kind === 'deliveries'){<a class="text-link" [routerLink]="['/routes',row.routeId]">Détail ↗</a>@if(row.status === 'IN_PROGRESS' && row.routeStatus === 'IN_PROGRESS'){<button class="text-button" (click)="deliver(row)">Livrer ✓</button>}}
          @else {
            @if(canEdit(row)){<button class="text-button" (click)="open(row)">Modifier</button>}
            @if(kind === 'orders' && row.status === 'PENDING'){<button class="text-button danger" (click)="cancelOrder(row)">Annuler</button>}
            @if(kind === 'clients' && row.active){<button class="text-button danger" (click)="deactivate(row)">Désactiver</button>}
          }
        </td></tr>}
        @if(!filtered().length){<tr><td [attr.colspan]="config.columns.length+1" class="empty">{{loading() ? 'Chargement depuis Oracle…' : 'Aucun résultat pour le moment.'}}</td></tr>}
      </tbody></table></div><div class="pagination"><span>Page {{page()+1}} · {{rows().length}} éléments · 100 par page</span><div><button class="button secondary small-button" [disabled]="page() === 0 || loading()" (click)="changePage(-1)">← Précédent</button><button class="button secondary small-button" [disabled]="rows().length < 100 || loading()" (click)="changePage(1)">Suivant →</button></div></div>
    </section>
    @if(kind === 'routes'){<div class="inline-note">◎ Les distances affichées sont géodésiques. Elles ne correspondent pas à la longueur réelle d’un trajet routier.</div>}
    @if(editing()){
      <div class="modal-backdrop" (click)="close()"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="form-title" (click)="$event.stopPropagation()">
        <div class="panel-heading"><div><span class="eyebrow">VOTRE CARNET D’OPÉRATIONS</span><h2 id="form-title">{{editingId() ? 'Modifier' : 'Ajouter'}} un {{config.singular}}</h2></div><button class="icon-button" aria-label="Fermer" (click)="close()">×</button></div>
        <form [formGroup]="form" (ngSubmit)="save()"><div class="form-grid">
          @for(field of fields();track field.key){<label>{{field.label}}@if(field.required){<span class="required"> *</span>}
            @if(field.options){<select [formControlName]="field.key">@for(option of field.options;track option.value){<option [ngValue]="option.value">{{option.label}}</option>}</select>}
            @else{<input [type]="field.type || 'text'" [formControlName]="field.key" [attr.min]="field.min" [attr.max]="field.max" [attr.step]="field.type === 'number' ? 'any' : null">}
            @if(form.get(field.key)?.invalid && form.get(field.key)?.touched){<small class="field-error">Valeur obligatoire ou invalide.</small>}
          </label>}
        </div>
        @if(kind !== 'orders' && kind !== 'vehicles'){<p class="inline-note">GPS WGS84 : latitude puis longitude. Exemple Casablanca : 33.57, −7.63.</p>}
        @if(formError()){<div class="alert error" role="alert">{{formError()}}</div>}
        <div class="modal-footer"><button class="button secondary" type="button" (click)="close()">Annuler</button><button class="button primary" [disabled]="form.invalid || saving()" type="submit">{{saving() ? 'Enregistrement…' : 'Enregistrer →'}}</button></div></form>
      </section></div>
    }
  `
})
export class ResourcesComponent {
  api = inject(ApiService); auth = inject(AuthService); route = inject(ActivatedRoute);
  kind = this.route.snapshot.data['kind'] as string;
  config = CONFIG[this.kind];
  rows = signal<Row[]>([]); page = signal(0); error = signal(''); success = signal('');
  loading = signal(false); saving = signal(false); editing = signal(false); editingId = signal<number | null>(null);
  formError = signal(''); fields = signal<Field[]>([]); form = new FormGroup<any>({});
  search = new FormControl('', {nonNullable:true}); query = signal('');
  status = new FormControl('ALL', {nonNullable:true});
  statuses = ['PENDING','ASSIGNED','IN_DELIVERY','DELIVERED','CANCELLED'];
  filtered = computed(() => this.rows().filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(this.query()))));
  constructor() { this.search.valueChanges.subscribe(v => this.query.set(v.toLowerCase())); void this.load(); }
  canCreate() { return !['routes','deliveries'].includes(this.kind) && (['clients','orders'].includes(this.kind) || this.auth.session()?.role === 'ADMIN'); }
  canEdit(row: Row) { return this.canCreate() && (this.kind !== 'orders' || row.status === 'PENDING') && (this.kind !== 'drivers' || row.status !== 'BUSY'); }
  async load() {
    this.loading.set(true); this.error.set('');
    try { this.rows.set(await this.api.get(`${this.kind}?page=${this.page()}&size=100${this.kind === 'orders' ? '&status='+this.status.value : ''}`)); }
    catch(e) { this.error.set(errorMessage(e)); } finally { this.loading.set(false); }
  }
  filter() { this.page.set(0); void this.load(); }
  changePage(delta: number) { this.page.update(p => p+delta); void this.load(); }
  close() { if(!this.saving()) this.editing.set(false); }
  async open(row?: Row) {
    this.error.set(''); this.formError.set('');
    let fields: Field[] = [];
    try {
      if(this.kind === 'orders') {
        const clients = await this.api.get('clients?size=200');
        fields = [
          {key:'reference',label:'Référence',required:true},
          {key:'clientId',label:'Client actif',required:true,options:clients.filter(c => c.active).map(c => ({value:c.id,label:c.name}))},
          {key:'weightKg',label:'Poids (kg)',type:'number',required:true,min:.01,max:1000000},
          {key:'priority',label:'Priorité',required:true,options:[{value:'LOW',label:'Basse'},{value:'NORMAL',label:'Normale'},{value:'HIGH',label:'Haute'}]}
        ];
      } else if(this.kind === 'vehicles') {
        const drivers = await this.api.get('drivers?size=200');
        fields = [{key:'plateNumber',label:'Immatriculation',required:true},
          {key:'capacityKg',label:'Capacité (kg)',required:true,type:'number',min:.01,max:1000000},
          {key:'driverId',label:'Livreur',options:[{value:null,label:'Non affecté'},...drivers.map(d => ({value:d.id,label:d.name}))]}];
      } else {
        fields = [{key:'name',label:'Nom',required:true}];
        if(this.kind !== 'drivers') fields.push({key:'address',label:'Adresse',required:true});
        if(this.kind !== 'depots') fields.push({key:'phone',label:'Téléphone'});
        if(this.kind === 'drivers') fields.push({key:'status',label:'Disponibilité',required:true,options:[{value:'AVAILABLE',label:'Disponible'},{value:'OFFLINE',label:'Hors ligne'}]});
        fields.push({key:'latitude',label:'Latitude',type:'number',min:-90,max:90,required:true},
          {key:'longitude',label:'Longitude',type:'number',min:-180,max:180,required:true});
      }
      const controls: Record<string,FormControl> = {};
      for(const f of fields) {
        const validators = f.required ? [Validators.required] : [];
        if(f.min !== undefined) validators.push(Validators.min(f.min));
        if(f.max !== undefined) validators.push(Validators.max(f.max));
        if(f.type !== 'number' && !f.options) validators.push(Validators.maxLength(f.key === 'address' ? 255 : f.key === 'name' ? 100 : f.key === 'reference' ? 50 : 30));
        const fallback: Record<string,any> = {latitude:33.57,longitude:-7.63,priority:'NORMAL',status:'AVAILABLE',reference:`GD-${Date.now()}`,driverId:null};
        controls[f.key] = new FormControl(row?.[f.key] ?? fallback[f.key] ?? '', validators);
      }
      this.form = new FormGroup(controls); this.fields.set(fields); this.editingId.set(row?.id ?? null);
      // Conserver le lien compte utilisateur existant lors de l'edition d'un livreur.
      this.existingUserId = row?.userId ?? null;
      this.editing.set(true);
    } catch(e) { this.error.set(errorMessage(e)); }
  }
  existingUserId: number | null = null;
  async save() {
    if(this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.formError.set('');
    const data = {...this.form.getRawValue()};
    if(!['orders','vehicles'].includes(this.kind)) {
      data.position = {latitude:Number(data.latitude),longitude:Number(data.longitude)};
      delete data.latitude; delete data.longitude;
      if(this.kind === 'drivers') data.userId = this.existingUserId;
    }
    try {
      const id = this.editingId();
      if(id) await this.api.put(`${this.kind}/${id}`,data); else await this.api.post(this.kind,data);
      this.editing.set(false); this.success.set('Enregistrement effectué dans Oracle.'); await this.load();
    } catch(e) { this.formError.set(errorMessage(e)); } finally { this.saving.set(false); }
  }
  async action(fn: () => Promise<unknown>) {
    this.error.set(''); this.success.set('');
    try { await fn(); this.success.set('Modification enregistrée.'); await this.load(); }
    catch(e) { this.error.set(errorMessage(e)); }
  }
  cancelOrder(row: Row) { if(confirm(`Annuler la commande ${row.reference} ?`)) void this.action(() => this.api.patch(`orders/${row.id}/status`,{status:'CANCELLED'})); }
  deactivate(row: Row) { if(confirm(`Désactiver ${row.name} ?`)) void this.action(() => this.api.delete(`clients/${row.id}`)); }
  deliver(row: Row) { void this.action(() => this.api.patch(`deliveries/${row.id}/status`,{status:'DELIVERED'})); }
}
