import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Application, CVHistory, Notification } from '../../core/models';

@Component({
  selector: 'app-candidate-portal',
  standalone: true,
  imports: [FormsModule, RouterLink],
  styles: [`
    .portal-tabs{display:flex;gap:4px;margin-bottom:28px;border-bottom:2px solid #e8edf2;padding-bottom:0;}
    .ptab{padding:12px 22px;border:none;background:transparent;font-weight:700;font-size:.9rem;cursor:pointer;color:#64748b;border-bottom:2px solid transparent;transition:all .25s;margin-bottom:-2px;}
    .ptab:hover{color:#0ea5e9;}
    .ptab.active{color:#0ea5e9;border-bottom-color:#0ea5e9;}
    .app-card{background:#fff;border:1.5px solid rgba(226,232,240,.7);border-radius:18px;padding:22px;transition:all .3s;box-shadow:0 2px 12px rgba(0,0,0,.04);}
    .app-card:hover{box-shadow:0 10px 28px rgba(0,0,0,.08);transform:translateY(-2px);}
    .status-badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:.7rem;font-weight:800;letter-spacing:.03em;}
    .status-pending{background:#fef9c3;color:#854d0e;}
    .status-accepted{background:#dcfce7;color:#15803d;}
    .status-rejected{background:#fee2e2;color:#dc2626;}
    .status-reviewed{background:#dbeafe;color:#1d4ed8;}
    .cv-card{background:#fff;border:1.5px solid rgba(226,232,240,.7);border-radius:18px;padding:22px;transition:all .3s;box-shadow:0 2px 12px rgba(0,0,0,.04);}
    .cv-card:hover{box-shadow:0 10px 28px rgba(0,0,0,.08);transform:translateY(-3px);border-color:rgba(56,189,248,.25);}
    .hire-bar{height:8px;border-radius:999px;background:#e2e8f0;margin-top:10px;overflow:hidden;}
    .hire-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#38bdf8,#a855f7);}
    .auth-box{max-width:440px;margin:60px auto;background:#fff;border:1.5px solid rgba(226,232,240,.6);border-radius:24px;padding:36px;box-shadow:0 8px 40px rgba(0,0,0,.08);}
    .form-group label{display:block;font-size:.74rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;margin-top:14px;}
    .form-group input{width:100%;padding:11px 16px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:.92rem;font-family:inherit;outline:none;box-sizing:border-box;background:#f8fafc;transition:all .25s;}
    .form-group input:focus{border-color:#0ea5e9;background:#fff;box-shadow:0 0 0 3px rgba(14,165,233,.08);}
    .role-tabs{display:flex;gap:8px;margin-bottom:16px;}
    .rtab{flex:1;padding:10px;border-radius:12px;border:1.5px solid #e2e8f0;background:transparent;font-weight:700;font-size:.8rem;cursor:pointer;transition:all .25s;color:#64748b;}
    .rtab.active{border-color:#0ea5e9;color:#0ea5e9;background:#f0f9ff;box-shadow:0 0 0 3px rgba(14,165,233,.08);}
    .notif-item{background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:14px 18px;cursor:pointer;transition:all .25s;}
    .notif-item:hover{box-shadow:0 4px 16px rgba(0,0,0,.08);}
    .notif-item.unread{border-left:4px solid #0ea5e9;background:#f0f9ff;}
    .notif-icon{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;}
    .ni-application_confirmed{background:#e0f2fe;color:#0369a1;}
    .ni-accepted{background:#dcfce7;color:#15803d;}
    .ni-rejected{background:#fee2e2;color:#dc2626;}
    .ni-application_received{background:#f3e8ff;color:#7c3aed;}
    .ni-default{background:#f1f5f9;color:#64748b;}
    .meeting-box{background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:14px 18px;margin-top:12px;}
    .rejection-box{background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;padding:12px 16px;margin-top:12px;font-size:.85rem;color:#9a3412;}
  `],
  template: `
    <div class="container" style="padding-top:40px;max-width:900px;">
      @if (!auth.isLoggedIn()) {
        <!-- Auth Gate -->
        <div class="auth-box">
          <div style="font-size:2.5rem;text-align:center;margin-bottom:12px;">👤</div>
          <h2 style="text-align:center;font-size:1.4rem;font-weight:800;margin-bottom:6px;">Mon Espace Candidat</h2>
          <p style="text-align:center;color:#64748b;font-size:.9rem;margin-bottom:20px;">Connectez-vous pour accéder à vos candidatures et CVs.</p>
          <div class="role-tabs">
            <button class="rtab" [class.active]="authTab()==='login'" (click)="authTab.set('login')">Connexion</button>
            <button class="rtab" [class.active]="authTab()==='register'" (click)="authTab.set('register')">Inscription</button>
          </div>
          @if (authTab() === 'register') {
            <div class="form-group"><label>Nom complet</label><input [(ngModel)]="regName" placeholder="Jean Dupont"></div>
          }
          <div class="form-group"><label>Email</label><input type="email" [(ngModel)]="loginEmail" placeholder="vous@exemple.com"></div>
          <div class="form-group"><label>Mot de passe</label><input type="password" [(ngModel)]="loginPwd" placeholder="••••••••"></div>
          @if (authError()) { <p style="color:#ef4444;font-size:12px;margin-top:8px;">{{ authError() }}</p> }
          <button class="btn btn-primary" style="width:100%;margin-top:14px;" (click)="doAuth()">
            {{ authTab() === 'login' ? 'Se connecter' : 'Créer le compte' }}
          </button>
        </div>
      } @else if (auth.isAdmin() || auth.isRecruiter()) {
        <div style="text-align:center;padding:60px;color:#94a3b8;">
          <i class="fas fa-ban" style="font-size:3rem;display:block;margin-bottom:12px;color:#ef4444;"></i>
          <h2 style="font-size:1.4rem;color:#1e293b;margin-bottom:8px;">Accès Refusé</h2>
          <p>L'espace candidat est réservé aux candidats.</p>
          <button class="btn btn-primary" style="margin-top:16px;" (click)="auth.logout()">Se déconnecter</button>
        </div>
      } @else {
        <!-- Dashboard -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
          <div>
            <h1 style="font-size:1.8rem;font-weight:800;margin:0;"><i class="fas fa-user-circle" style="color:#0ea5e9;"></i> Mon Espace</h1>
            <p style="color:#64748b;margin:4px 0 0;">{{ auth.user()?.full_name || auth.user()?.email }}</p>
          </div>
        </div>

        <div class="portal-tabs">
          <button class="ptab" [class.active]="portalTab()==='apps'" (click)="switchTab('apps')">
            <i class="fas fa-paper-plane"></i> Mes Candidatures ({{ applications().length }})
          </button>
          <button class="ptab" [class.active]="portalTab()==='cvs'" (click)="switchTab('cvs')">
            <i class="fas fa-file-alt"></i> Historique CV ({{ cvHistory().length }})
          </button>
          <button class="ptab" [class.active]="portalTab()==='notifs'" (click)="switchTab('notifs')">
            <i class="fas fa-bell"></i> Notifications
            @if (unreadCount() > 0) { <span style="background:#ef4444;color:#fff;padding:1px 6px;border-radius:999px;font-size:.7rem;margin-left:4px;">{{ unreadCount() }}</span> }
          </button>
        </div>

        @if (loading()) {
          <div style="text-align:center;padding:60px;color:#94a3b8;"><i class="fas fa-circle-notch fa-spin" style="font-size:2rem;"></i></div>
        }

        <!-- Applications Tab -->
        @if (portalTab() === 'apps' && !loading()) {
          @if (!applications().length) {
            <div style="text-align:center;padding:60px;color:#94a3b8;">
              <i class="fas fa-inbox" style="font-size:2.5rem;display:block;margin-bottom:12px;"></i>
              <p>Aucune candidature pour le moment.</p>
              <a routerLink="/offres" class="btn btn-primary" style="margin-top:12px;"><i class="fas fa-search"></i> Voir les offres</a>
            </div>
          } @else {
            <div style="display:flex;flex-direction:column;gap:14px;">
              @for (app of applications(); track app.id) {
                <div class="app-card">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                    <div>
                      <h3 style="font-size:1rem;font-weight:700;margin:0 0 4px;">{{ app.job_title || 'Poste #'+app.job_post_id }}</h3>
                      <div style="font-size:.85rem;color:#64748b;">
                        @if (app.company_name) { <span><i class="fas fa-building"></i> {{ app.company_name }}</span> }
                        @if (app.job_location) { <span style="margin-left:10px;"><i class="fas fa-map-marker-alt"></i> {{ app.job_location }}</span> }
                      </div>
                    </div>
                    <span class="status-badge status-{{ app.status }}">{{ statusLabel(app.status) }}</span>
                  </div>
                  @if (app.cover_letter) {
                    <p style="font-size:.82rem;color:#64748b;margin:8px 0 0;background:#f8fafc;padding:8px 12px;border-radius:8px;">
                      {{ app.cover_letter }}
                    </p>
                  }
                  @if (app.status === 'accepted') {
                    <div class="meeting-box">
                      <div style="font-weight:700;font-size:.9rem;color:#15803d;margin-bottom:10px;"><i class="fas fa-check-circle"></i> Félicitations ! Votre candidature a été acceptée</div>
                      @if (app.meeting_type) {
                        <div style="font-size:.85rem;color:#166534;margin-bottom:6px;"><i class="fas fa-video" style="width:18px;"></i> Type d'entretien&nbsp;: <strong>{{ meetingTypeLabel(app.meeting_type) }}</strong></div>
                      }
                      @if (app.meeting_slots?.length) {
                        <div style="margin-bottom:8px;">
                          <div style="font-size:.75rem;font-weight:700;color:#166534;text-transform:uppercase;margin-bottom:4px;"><i class="fas fa-calendar"></i> Créneaux proposés</div>
                          @for (slot of app.meeting_slots!; track slot) {
                            <div style="font-size:.85rem;color:#166534;padding:4px 0;">• {{ slot }}</div>
                          }
                        </div>
                      }
                      @if (app.meeting_link) {
                        <div style="font-size:.85rem;margin-bottom:4px;"><i class="fas fa-link" style="width:18px;color:#166534;"></i> <a [href]="app.meeting_link" target="_blank" style="color:#0369a1;font-weight:600;">Rejoindre la visio</a></div>
                      }
                      @if (app.meeting_location) {
                        <div style="font-size:.85rem;color:#166534;margin-bottom:4px;"><i class="fas fa-map-marker-alt" style="width:18px;"></i> {{ app.meeting_location }}</div>
                      }
                      @if (app.recruiter_contact) {
                        <div style="font-size:.85rem;color:#166534;margin-bottom:4px;"><i class="fas fa-envelope" style="width:18px;"></i> {{ app.recruiter_contact }}</div>
                      }
                      @if (app.preparation_notes) {
                        <div style="font-size:.82rem;color:#166534;margin-top:8px;padding-top:8px;border-top:1px solid #bbf7d0;">
                          <div style="font-weight:700;margin-bottom:4px;"><i class="fas fa-lightbulb"></i> Instructions de préparation</div>
                          {{ app.preparation_notes }}
                        </div>
                      }
                    </div>
                  }
                  @if (app.status === 'rejected' && app.rejection_reason) {
                    <div class="rejection-box">
                      <div style="font-weight:700;margin-bottom:4px;"><i class="fas fa-info-circle"></i> Retour du recruteur</div>
                      {{ app.rejection_reason }}
                    </div>
                  }
                  <div style="font-size:.78rem;color:#94a3b8;margin-top:8px;">
                    <i class="fas fa-clock"></i> Candidature du {{ formatDate(app.created_at) }}
                    @if (app.updated_at && app.updated_at !== app.created_at) {
                      · Mis à jour le {{ formatDate(app.updated_at) }}
                    }
                  </div>
                </div>
              }
            </div>
          }
        }

        <!-- CV History Tab -->
        @if (portalTab() === 'cvs' && !loading()) {
          @if (!cvHistory().length) {
            <div style="text-align:center;padding:60px;color:#94a3b8;">
              <i class="fas fa-file-alt" style="font-size:2.5rem;display:block;margin-bottom:12px;"></i>
              <p>Aucun CV analysé avec ce compte.</p>
              <a routerLink="/analyse" class="btn btn-primary" style="margin-top:12px;"><i class="fas fa-plus"></i> Analyser un CV</a>
            </div>
          } @else {
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">
              @for (cv of cvHistory(); track cv.id) {
                <div class="cv-card">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <h3 style="font-size:1rem;font-weight:700;margin:0 0 4px;color:#1e293b;">{{ cv.job_role || 'CV #'+cv.id }}</h3>
                    <span style="font-size:.75rem;color:#94a3b8;">#{{ cv.id }}</span>
                  </div>
                  <div style="font-size:.82rem;color:#64748b;margin-bottom:10px;">
                    <i class="fas fa-briefcase"></i> {{ cv.experience_years }} ans exp.
                    @if (cv.education) { · <i class="fas fa-graduation-cap"></i> {{ cv.education }} }
                  </div>
                  @if (cv.hire_probability !== null && cv.hire_probability !== undefined) {
                    <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:4px;">
                      <span style="color:#64748b;font-weight:600;">Probabilité d'embauche</span>
                      <strong [style.color]="probColor(cv.hire_probability)">{{ (cv.hire_probability*100).toFixed(0) }}%</strong>
                    </div>
                    <div class="hire-bar"><div class="hire-fill" [style.width.%]="cv.hire_probability*100"></div></div>
                  }
                  @if (cv.predicted_salary) {
                    <div style="font-size:.88rem;font-weight:700;color:#16a34a;margin-top:8px;">
                      <i class="fas fa-dollar-sign"></i> {{ formatSalary(cv.predicted_salary) }}/yr
                    </div>
                  }
                  @if (cv.skills) {
                    <div style="font-size:.78rem;color:#64748b;margin-top:8px;">
                      <i class="fas fa-code"></i> {{ cv.skills.split(',').slice(0,4).join(', ') }}
                    </div>
                  }
                  <div style="font-size:.75rem;color:#94a3b8;margin-top:8px;">
                    <i class="fas fa-calendar"></i> {{ formatDate(cv.created_at) }}
                  </div>
                </div>
              }
            </div>
          }
        }

        <!-- Notifications Tab -->
        @if (portalTab() === 'notifs' && !loading()) {
          @if (!notifications().length) {
            <div style="text-align:center;padding:60px;color:#94a3b8;">
              <i class="fas fa-bell" style="font-size:2.5rem;display:block;margin-bottom:12px;"></i>
              <p>Aucune notification pour le moment.</p>
            </div>
          } @else {
            <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
              @if (unreadCount() > 0) {
                <button (click)="markAllRead()" style="background:none;border:1.5px solid #0ea5e9;color:#0ea5e9;padding:6px 14px;border-radius:8px;font-size:.82rem;font-weight:700;cursor:pointer;">
                  <i class="fas fa-check-double"></i> Tout marquer lu
                </button>
              }
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;">
              @for (n of notifications(); track n.id) {
                <div class="notif-item" [class.unread]="!n.is_read" (click)="readNotif(n)">
                  <div style="display:flex;gap:14px;align-items:flex-start;">
                    <div class="notif-icon ni-{{ n.type }}">
                      <i class="fas {{ notifIcon(n.type) }}"></i>
                    </div>
                    <div style="flex:1;min-width:0;">
                      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                        <div style="font-weight:700;font-size:.9rem;color:#1e293b;">{{ n.title }}</div>
                        <div style="font-size:.72rem;color:#94a3b8;white-space:nowrap;">{{ formatNotifTime(n.created_at) }}</div>
                      </div>
                      <div style="font-size:.85rem;color:#64748b;margin-top:2px;line-height:1.4;">{{ n.message }}</div>
                      @if (!n.is_read) {
                        <span style="display:inline-block;margin-top:4px;background:#0ea5e9;color:#fff;padding:1px 8px;border-radius:999px;font-size:.7rem;font-weight:700;">Nouveau</span>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        }
      }
    </div>
  `,
})
export class CandidatePortalComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  authTab   = signal<'login' | 'register'>('login');
  portalTab = signal<'apps' | 'cvs' | 'notifs'>('apps');
  loading   = signal(false);

  applications  = signal<Application[]>([]);
  cvHistory     = signal<CVHistory[]>([]);
  notifications = signal<Notification[]>([]);
  unreadCount   = computed(() => this.notifications().filter(n => !n.is_read).length);

  loginEmail = ''; loginPwd = ''; regName = '';
  authError = signal('');

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) this.loadData();
  }

  switchTab(tab: 'apps' | 'cvs' | 'notifs'): void {
    this.portalTab.set(tab);
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    Promise.all([
      new Promise<void>(res => this.api.candidateApplications().subscribe({ next: d => { this.applications.set(d); res(); }, error: () => res() })),
      new Promise<void>(res => this.api.candidateCvHistory().subscribe({ next: d => { this.cvHistory.set(d); res(); }, error: () => res() })),
      new Promise<void>(res => this.api.getNotifications().subscribe({ next: d => { this.notifications.set(d); res(); }, error: () => res() })),
    ]).then(() => this.loading.set(false));
  }

  readNotif(n: Notification): void {
    if (n.is_read) return;
    this.api.markNotificationRead(n.id).subscribe({
      next: () => this.notifications.update(list => list.map(x => x.id === n.id ? { ...x, is_read: true } : x)),
    });
  }

  markAllRead(): void {
    this.api.markAllNotificationsRead().subscribe({
      next: () => this.notifications.update(list => list.map(x => ({ ...x, is_read: true }))),
    });
  }

  doAuth(): void {
    this.authError.set('');
    const obs = this.authTab() === 'login'
      ? this.auth.login(this.loginEmail, this.loginPwd)
      : this.auth.register(this.loginEmail, this.loginPwd, this.regName, 'candidate');
    obs.subscribe({
      next: () => { this.loadData(); this.toast.show('✅ Connecté !', 'success'); },
      error: (e: { error?: { detail?: string } }) => this.authError.set(e.error?.detail ?? 'Erreur'),
    });
  }

  notifIcon(type: string): string {
    const m: Record<string, string> = {
      application_confirmed: 'fa-paper-plane',
      application_received: 'fa-inbox',
      accepted: 'fa-check-circle',
      rejected: 'fa-times-circle',
    };
    return m[type] ?? 'fa-bell';
  }

  meetingTypeLabel(t: string): string {
    const m: Record<string, string> = { video: 'Appel vidéo', phone: 'Appel téléphonique', 'in-person': 'Entretien en présentiel' };
    return m[t] ?? t;
  }

  formatNotifTime(d: string): string {
    const diff = Date.now() - new Date(d).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    return new Date(d).toLocaleDateString('fr-FR');
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = { pending:'En attente', reviewed:'Examiné', accepted:'Accepté ✅', rejected:'Refusé ❌' };
    return map[s] ?? s;
  }
  probColor(p: number): string { return p >= 0.7 ? '#16a34a' : p >= 0.5 ? '#f59e0b' : '#ef4444'; }
  formatDate(d: string): string { return new Date(d).toLocaleDateString('fr-FR'); }
  formatSalary(n: number): string { return Math.round(n).toLocaleString(); }
}
