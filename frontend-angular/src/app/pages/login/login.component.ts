import { Component, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-wrap">

      <!-- Brand panel -->
      <aside class="auth-aside">
        <div class="auth-orb auth-orb-1"></div>
        <div class="auth-orb auth-orb-2"></div>
        <div class="auth-aside-inner">
          <div class="auth-brand-row">
            <div class="brand-icon">CV</div>
            <strong>CVerify</strong>
          </div>
          <h2 class="auth-headline">Bon retour 👋<br>Connectez-vous à <span class="gradient-text">CVerify</span></h2>
          <p class="auth-sub">Accédez à vos analyses de CV, candidatures et recommandations d'emploi propulsées par l'IA.</p>
          <div class="auth-feats">
            <div class="auth-feat">
              <div class="auth-feat-ic"><img src="assets/icons/lightning.svg" alt="" width="48" height="48"></div>
              <div class="auth-feat-txt"><h4>Analyse instantanée</h4><p>Probabilité d'embauche & salaire en 3 secondes</p></div>
            </div>
            <div class="auth-feat">
              <div class="auth-feat-ic"><img src="assets/icons/match.svg" alt="" width="48" height="48"></div>
              <div class="auth-feat-txt"><h4>Recommandations ciblées</h4><p>Les meilleures offres adaptées à votre profil</p></div>
            </div>
            <div class="auth-feat">
              <div class="auth-feat-ic"><img src="assets/icons/shield.svg" alt="" width="48" height="48"></div>
              <div class="auth-feat-txt"><h4>Sécurisé & privé</h4><p>JWT & contrôle d'accès par rôle</p></div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Form panel -->
      <main class="auth-main">
        <div class="auth-card">
          <div class="auth-mini-brand">
            <div class="brand-icon">CV</div><strong>CVerify</strong>
          </div>
          <a routerLink="/" class="auth-back"><i class="fas fa-arrow-left"></i> Retour à l'accueil</a>
          <h1>Connexion</h1>
          <p class="auth-card-sub">Entrez vos identifiants pour accéder à votre espace.</p>

          <form class="auth-form" (ngSubmit)="submit()">
            <div class="auth-field">
              <label>Adresse email</label>
              <div class="auth-input-wrap">
                <i class="fas fa-envelope"></i>
                <input type="email" name="email" [(ngModel)]="email" placeholder="vous@exemple.com" autocomplete="email">
              </div>
            </div>

            <div class="auth-field">
              <label>Mot de passe</label>
              <div class="auth-input-wrap">
                <i class="fas fa-lock"></i>
                <input [type]="showPwd() ? 'text' : 'password'" name="password" [(ngModel)]="password" placeholder="••••••••" autocomplete="current-password">
                <button type="button" class="auth-pwd-toggle" (click)="showPwd.set(!showPwd())" [attr.aria-label]="showPwd() ? 'Masquer' : 'Afficher'">
                  <i class="fas" [class.fa-eye]="!showPwd()" [class.fa-eye-slash]="showPwd()"></i>
                </button>
              </div>
            </div>

            @if (error()) {
              <div class="auth-error"><i class="fas fa-circle-exclamation"></i> {{ error() }}</div>
            }

            <button type="submit" class="auth-submit" [disabled]="loading()">
              @if (loading()) { <i class="fas fa-circle-notch fa-spin"></i> Connexion... }
              @else { <i class="fas fa-right-to-bracket"></i> Se connecter }
            </button>
          </form>

          <p class="auth-switch">
            Pas encore de compte ? <a routerLink="/register">Créer un compte</a>
          </p>
        </div>
      </main>

    </div>
  `,
})
export class LoginComponent implements OnInit {
  private auth  = inject(AuthService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private toast  = inject(ToastService);

  email = '';
  password = '';
  showPwd = signal(false);
  loading = signal(false);
  error   = signal('');

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) this.go();
  }

  submit(): void {
    if (!this.email.trim() || !this.password) {
      this.error.set('Veuillez remplir tous les champs.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.show('✅ Connexion réussie !', 'success');
        this.go();
      },
      error: (e: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.error.set(e.error?.detail ?? 'Email ou mot de passe incorrect.');
      },
    });
  }

  private go(): void {
    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    if (redirect) { this.router.navigateByUrl(redirect); return; }
    const role = this.auth.user()?.role;
    const dest = role === 'admin' ? '/admin'
      : role === 'recruiter' ? '/recruteur'
      : role === 'candidate' ? '/candidat'
      : '/';
    this.router.navigate([dest]);
  }
}
