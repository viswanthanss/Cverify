import { Component, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-register',
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
          <h2 class="auth-headline">Rejoignez <span class="gradient-text">CVerify</span><br>en quelques secondes</h2>
          <p class="auth-sub">Créez votre compte gratuit et boostez votre recherche d'emploi grâce au Machine Learning.</p>
          <div class="auth-feats">
            <div class="auth-feat">
              <div class="auth-feat-ic"><img src="assets/icons/cv-upload.svg" alt="" width="48" height="48"></div>
              <div class="auth-feat-txt"><h4>Analysez vos CV</h4><p>Upload PDF ou formulaire interactif</p></div>
            </div>
            <div class="auth-feat">
              <div class="auth-feat-ic"><img src="assets/icons/chart.svg" alt="" width="48" height="48"></div>
              <div class="auth-feat-txt"><h4>Suivez vos statistiques</h4><p>Historique & probabilités d'embauche</p></div>
            </div>
            <div class="auth-feat">
              <div class="auth-feat-ic"><img src="assets/icons/star.svg" alt="" width="48" height="48"></div>
              <div class="auth-feat-txt"><h4>Offres recommandées</h4><p>Matching IA sur 40 000+ postes</p></div>
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
          <h1>Créer un compte</h1>
          <p class="auth-card-sub">Choisissez votre profil et créez votre compte gratuit.</p>

          <!-- Role selection -->
          <div class="auth-role-tabs">
            <div class="auth-role-tab" [class.active]="role()==='candidate'" (click)="role.set('candidate')">
              <i class="fas fa-user"></i>
              <span>Candidat</span>
              <small>Analyser mon CV</small>
            </div>
            <div class="auth-role-tab" [class.active]="role()==='recruiter'" (click)="role.set('recruiter')">
              <i class="fas fa-briefcase"></i>
              <span>Recruteur</span>
              <small>Publier des offres</small>
            </div>
          </div>

          <form class="auth-form" (ngSubmit)="submit()">
            <div class="auth-field">
              <label>Nom complet</label>
              <div class="auth-input-wrap">
                <i class="fas fa-id-card"></i>
                <input type="text" name="fullName" [(ngModel)]="fullName" placeholder="Jean Dupont" autocomplete="name">
              </div>
            </div>

            @if (role() === 'recruiter') {
              <div class="auth-field">
                <label>Entreprise</label>
                <div class="auth-input-wrap">
                  <i class="fas fa-building"></i>
                  <input type="text" name="company" [(ngModel)]="company" placeholder="Nom de votre entreprise" autocomplete="organization">
                </div>
              </div>
            }

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
                <input [type]="showPwd() ? 'text' : 'password'" name="password" [(ngModel)]="password" placeholder="Min. 6 caractères" autocomplete="new-password">
                <button type="button" class="auth-pwd-toggle" (click)="showPwd.set(!showPwd())" [attr.aria-label]="showPwd() ? 'Masquer' : 'Afficher'">
                  <i class="fas" [class.fa-eye]="!showPwd()" [class.fa-eye-slash]="showPwd()"></i>
                </button>
              </div>
            </div>

            @if (error()) {
              <div class="auth-error"><i class="fas fa-circle-exclamation"></i> {{ error() }}</div>
            }

            <button type="submit" class="auth-submit" [disabled]="loading()">
              @if (loading()) { <i class="fas fa-circle-notch fa-spin"></i> Création... }
              @else { <i class="fas fa-user-plus"></i> Créer mon compte }
            </button>
          </form>

          <p class="auth-switch">
            Vous avez déjà un compte ? <a routerLink="/login">Se connecter</a>
          </p>
        </div>
      </main>

    </div>
  `,
})
export class RegisterComponent implements OnInit {
  private auth  = inject(AuthService);
  private router = inject(Router);
  private toast  = inject(ToastService);

  role     = signal<'candidate' | 'recruiter'>('candidate');
  fullName = '';
  email    = '';
  password = '';
  company  = '';
  showPwd  = signal(false);
  loading  = signal(false);
  error    = signal('');

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) this.go();
  }

  submit(): void {
    if (!this.fullName.trim() || !this.email.trim() || !this.password) {
      this.error.set('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (this.password.length < 6) {
      this.error.set('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.register(this.email.trim(), this.password, this.fullName.trim(), this.role(), this.company.trim() || undefined).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.show('🎉 Compte créé avec succès !', 'success');
        this.go();
      },
      error: (e: { error?: { detail?: string } }) => {
        this.loading.set(false);
        this.error.set(e.error?.detail ?? 'Erreur lors de la création du compte.');
      },
    });
  }

  private go(): void {
    const role = this.auth.user()?.role;
    const dest = role === 'admin' ? '/admin'
      : role === 'recruiter' ? '/recruteur'
      : '/candidat';
    this.router.navigate([dest]);
  }
}
