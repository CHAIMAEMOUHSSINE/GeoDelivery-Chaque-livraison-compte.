import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/api.service';

@Component({
  imports: [ReactiveFormsModule],
  template: `<div class="login-page"><section class="login-art"><a class="brand"><span class="brand-icon">g↗</span>GeoDelivery.</a>
    <span class="eyebrow">L’INTELLIGENCE SPATIALE, EN MOUVEMENT</span><h1>Moins de kilomètres.<br>Plus de possibilités.</h1><p>Reliez vos commandes, vos livreurs et vos données géographiques. Une livraison à la fois.</p>
    <div class="orbit-graphic"><span class="orbit-point a">⌂</span><span class="orbit-point b">01</span><span class="orbit-point c">02</span><span class="orbit-point d">↗</span><div>g<span>↗</span></div></div>
    <small>ORACLE SPATIAL &nbsp; / &nbsp; SPRING BOOT &nbsp; / &nbsp; ANGULAR</small></section>
    <section class="login-form"><div class="login-box"><span class="chip">ESPACE OPÉRATIONS</span><h2>Bienvenue à bord.</h2><p class="muted">Connectez-vous pour piloter vos livraisons.</p>
      @if(error()){<div class="alert error" role="alert">{{error()}}</div>}
      <form [formGroup]="form" (ngSubmit)="submit()"><label>Adresse e-mail<input type="email" formControlName="email" autocomplete="username" placeholder="admin@geodelivery.local"></label>
      <label>Mot de passe<input type="password" formControlName="password" autocomplete="current-password" placeholder="Votre mot de passe"></label>
      <button class="button primary full" type="submit" [disabled]="form.invalid || busy()">{{busy() ? 'Connexion…' : 'Accéder à mon espace →'}}</button></form>
      <div class="login-note"><span>♧</span>Accès sécurisé par JWT. Identifiants locaux définis dans le fichier <code>.env</code>.</div>
    </div><small class="muted">Données fictives · Démonstration pédagogique GLSID 3</small></section></div>`
})
export class LoginComponent {
  auth = inject(AuthService); fb = inject(FormBuilder);
  error = signal(''); busy = signal(false);
  form = this.fb.nonNullable.group({ email: ['admin@geodelivery.local', [Validators.required, Validators.email]], password: ['', Validators.required] });
  async submit() {
    if (this.form.invalid) return;
    this.busy.set(true); this.error.set('');
    try { const r = this.form.getRawValue(); await this.auth.login(r.email, r.password); }
    catch (e) { this.error.set(errorMessage(e)); } finally { this.busy.set(false); }
  }
}
