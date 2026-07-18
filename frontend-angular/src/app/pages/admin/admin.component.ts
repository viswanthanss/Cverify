import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { AdminStats, User } from '../../core/models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    .admin-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px;margin-bottom:28px}
    .stat-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px 16px;display:flex;flex-direction:column;align-items:flex-start;gap:6px;transition:.2s;min-width:0}
    .stat-card:hover{box-shadow:0 8px 24px rgba(0,0,0,.08)}
    .stat-val{font-size:1.7rem;font-weight:800;line-height:1;white-space:nowrap}
    .stat-lbl{font-size:.78rem;color:#94a3b8;font-weight:500;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
    .action-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;border:none;cursor:pointer;font-weight:600;font-size:.88rem;transition:.2s}
    .btn-green{background:#dcfce7;color:#15803d}.btn-green:hover{background:#bbf7d0}
    .btn-slate{background:#f1f5f9;color:#475569}.btn-slate:hover{background:#e2e8f0}
    .btn-red{background:#fee2e2;color:#dc2626}.btn-red:hover{background:#fecaca}
    .btn-purple{background:#f3e8ff;color:#7c3aed}.btn-purple:hover{background:#ede9fe}
    .btn-blue{background:#dbeafe;color:#1d4ed8}.btn-blue:hover{background:#bfdbfe}
    .btn-orange{background:#ffedd5;color:#ea580c}.btn-orange:hover{background:#fed7aa}
    table{width:100%;border-collapse:collapse;font-size:.85rem}
    th{text-align:left;padding:10px 12px;border-bottom:2px solid #e2e8f0;font-size:.75rem;font-weight:700;color:#64748b;text-transform:uppercase}
    td{padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#334155}
    tr:hover td{background:#f8fafc}
    .auth-box{max-width:380px;margin:60px auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:28px;text-align:center}
    .form-group label{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:4px;text-align:left}
    .form-group input{width:100%;padding:9px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box}
    .role-select{padding:5px 8px;border-radius:6px;border:1px solid #e2e8f0;font-size:12px;font-family:inherit;outline:none}
    .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700}
    .badge-active{background:#dcfce7;color:#15803d}.badge-inactive{background:#fee2e2;color:#dc2626}
    .badge-admin{background:#f3e8ff;color:#7c3aed}.badge-recruiter{background:#e0f2fe;color:#0369a1}.badge-candidate{background:#f1f5f9;color:#475569}
    .action-msg{padding:10px 16px;border-radius:8px;font-size:.88rem;font-weight:500;margin-top:12px}
    .action-msg.ok{background:#dcfce7;color:#15803d}.action-msg.err{background:#fee2e2;color:#dc2626}
    .scrape-log{font-size:.78rem;color:#64748b}
    .scrape-log td{padding:6px 10px}
    .status-success{color:#15803d;font-weight:600}.status-error{color:#dc2626;font-weight:600}.status-running{color:#d97706;font-weight:600}
    .search-input{padding:8px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:.88rem;width:220px;outline:none;font-family:inherit}
    .search-input:focus{border-color:#7c3aed}
    .tab-bar{display:flex;gap:0;border-bottom:2px solid #e2e8f0;margin-bottom:20px}
    .tab-btn{padding:10px 20px;font-size:.88rem;font-weight:600;color:#94a3b8;cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-2px;transition:.2s}
    .tab-btn.active{color:#7c3aed;border-bottom-color:#7c3aed}
    .tab-btn:hover{color:#475569}
  `],
  template: `
    <div class="container" style="padding-top:40px;padding-bottom:60px;">
      @if (!auth.isAdmin()) {
        <div class="auth-box">
          <div style="font-size:2.5rem;margin-bottom:12px;">🔐</div>
          <h2 style="font-size:1.4rem;font-weight:800;margin-bottom:6px;">Accès Administrateur</h2>
          <p style="color:#64748b;font-size:.9rem;margin-bottom:20px;">Connexion requise avec un compte admin.</p>
          <div style="text-align:left;">
            <div class="form-group"><label>Email</label><input type="email" [(ngModel)]="loginEmail" placeholder="admin@exemple.com"></div>
            <div class="form-group" style="margin-top:8px;"><label>Mot de passe</label><input type="password" [(ngModel)]="loginPwd" placeholder="••••••••" (keyup.enter)="doLogin()"></div>
          </div>
          @if (authError()) { <p style="color:#ef4444;font-size:12px;margin-top:8px;">{{ authError() }}</p> }
          <button class="btn btn-primary" style="width:100%;margin-top:14px;" (click)="doLogin()">Se connecter</button>
        </div>
      } @else {
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
          <h1 style="font-size:1.8rem;font-weight:800;margin:0;"><i class="fas fa-shield-alt" style="color:#7c3aed;"></i> Administration</h1>
        </div>

        <!-- KPI Cards -->
        <div class="admin-grid">
          @if (stats()) {
            <div class="stat-card"><div class="stat-val" style="color:#0ea5e9;">{{ stats()!.total }}</div><div class="stat-lbl">Total CVs</div></div>
            <div class="stat-card"><div class="stat-val" style="color:#16a34a;">{{ stats()!.hired_count }}</div><div class="stat-lbl">Recommandés</div></div>
            <div class="stat-card"><div class="stat-val" style="color:#7c3aed;">{{ (stats()!.avg_hire_probability*100).toFixed(1) }}%</div><div class="stat-lbl">Prob. Moy. Embauche</div></div>
            <div class="stat-card"><div class="stat-val" style="color:#ea580c;">\${{ formatSalary(stats()!.avg_predicted_salary) }}</div><div class="stat-lbl">Salaire Moyen Prédit</div></div>
          }
          @if (jobsStats()) {
            <div class="stat-card"><div class="stat-val" style="color:#1d4ed8;">{{ jobsStats()!.total_jobs.toLocaleString() }}</div><div class="stat-lbl">Offres Totales</div></div>
            <div class="stat-card"><div class="stat-val" style="color:#0891b2;">{{ jobsStats()!.remote_jobs.toLocaleString() }}</div><div class="stat-lbl">Offres Remote</div></div>
            <div class="stat-card"><div class="stat-val" style="color:#059669;">{{ jobsStats()!.jobs_with_salary.toLocaleString() }}</div><div class="stat-lbl">Avec Salaire</div></div>
          }
          <div class="stat-card"><div class="stat-val" style="color:#7c3aed;">{{ users().length }}</div><div class="stat-lbl">Utilisateurs</div></div>
          <div class="stat-card"><div class="stat-val" style="color:#0369a1;">{{ companies().length }}</div><div class="stat-lbl">Recruteurs</div></div>
        </div>

        <!-- Tabs -->
        <div class="tab-bar">
          <button class="tab-btn" [class.active]="activeTab()==='jobs'" (click)="activeTab.set('jobs')"><i class="fas fa-briefcase"></i> Offres & Scraping</button>
          <button class="tab-btn" [class.active]="activeTab()==='recruiters'" (click)="activeTab.set('recruiters')"><i class="fas fa-building"></i> Recruteurs</button>
          <button class="tab-btn" [class.active]="activeTab()==='users'" (click)="activeTab.set('users')"><i class="fas fa-users-cog"></i> Utilisateurs</button>
          <button class="tab-btn" [class.active]="activeTab()==='logs'" (click)="activeTab.set('logs');loadScrapeLogs()"><i class="fas fa-history"></i> Logs</button>
        </div>

        <!-- TAB: Jobs & Scraping -->
        @if (activeTab() === 'jobs') {
          <div class="section-card">
            <h3><i class="fas fa-spider"></i> Scraping & Import</h3>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
              <button class="action-btn btn-orange" (click)="triggerScrape()" [disabled]="scraping()">
                @if (scraping()) { <i class="fas fa-spinner fa-spin"></i> Scraping... } @else { <i class="fas fa-spider"></i> Lancer un Scrape }
              </button>
              <button class="action-btn btn-green" (click)="importCsv()" [disabled]="importing()">
                @if (importing()) { <i class="fas fa-spinner fa-spin"></i> } @else { <i class="fas fa-file-csv"></i> }
                Importer data_jobs.csv
              </button>
              <button class="action-btn btn-blue" (click)="importScraperOutput()" [disabled]="importingScraper()">
                @if (importingScraper()) { <i class="fas fa-spinner fa-spin"></i> } @else { <i class="fas fa-download"></i> }
                Importer résultat scraper
              </button>
              <button class="action-btn btn-purple" (click)="reseedAll()" [disabled]="reseeding()">
                @if (reseeding()) { <i class="fas fa-spinner fa-spin"></i> Reseed en cours... } @else { <i class="fas fa-database"></i> Importer données seed }
              </button>
            </div>
            @if (importMsg()) { <div class="action-msg" [class]="importMsgClass()">{{ importMsg() }}</div> }
            @if (jobsStats()) {
              <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:16px;font-size:.88rem;color:#64748b;">
                <span><i class="fas fa-briefcase"></i> <strong>{{ jobsStats()!.total_jobs.toLocaleString() }}</strong> offres totales</span>
                <span><i class="fas fa-home"></i> <strong>{{ jobsStats()!.remote_jobs.toLocaleString() }}</strong> remote</span>
                <span><i class="fas fa-dollar-sign"></i> <strong>{{ jobsStats()!.jobs_with_salary.toLocaleString() }}</strong> avec salaire</span>
              </div>
            }
          </div>
        }

        <!-- TAB: Recruiters -->
        @if (activeTab() === 'recruiters') {
          <div class="section-card">
            <h3><i class="fas fa-building"></i> Recruteurs & Entreprises</h3>
            @if (loadingCompanies()) {
              <div style="text-align:center;padding:20px;color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Chargement...</div>
            } @else if (companies().length) {
              <div style="overflow-x:auto;">
                <table>
                  <thead><tr><th>ID</th><th>Nom</th><th>Email</th><th>Entreprise</th><th>Offres</th><th>Statut</th><th>Actions</th></tr></thead>
                  <tbody>
                    @for (c of companies(); track c['id']) {
                      <tr>
                        <td>{{ c['id'] }}</td>
                        <td>{{ c['full_name'] || '—' }}</td>
                        <td>{{ c['email'] }}</td>
                        <td>{{ c['company'] || '—' }}</td>
                        <td>{{ c['post_count'] }}</td>
                        <td><span class="badge" [class]="c['is_active'] ? 'badge-active' : 'badge-inactive'">{{ c['is_active'] ? 'Actif' : 'Inactif' }}</span></td>
                        <td>
                          @if (c['is_active']) {
                            <button class="action-btn btn-red" style="padding:4px 10px;font-size:11px;" (click)="deactivateUser(+c['id']!)">Désactiver</button>
                          } @else {
                            <button class="action-btn btn-green" style="padding:4px 10px;font-size:11px;" (click)="reactivateUser(+c['id']!)">Activer</button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p style="color:#94a3b8;">Aucun recruteur trouvé.</p>
            }
          </div>
        }

        <!-- TAB: Users -->
        @if (activeTab() === 'users') {
          <div class="section-card">
            <h3><i class="fas fa-users-cog"></i> Gestion des Utilisateurs</h3>
            <div style="margin-bottom:12px;">
              <input class="search-input" placeholder="Rechercher par email..." [(ngModel)]="userSearch" (input)="filterUsers()">
            </div>
            @if (loadingUsers()) {
              <div style="text-align:center;padding:20px;color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Chargement...</div>
            } @else if (filteredUsers().length) {
              <div style="overflow-x:auto;">
                <table>
                  <thead><tr><th>ID</th><th>Email</th><th>Nom</th><th>Rôle</th><th>Actif</th><th>Créé</th><th>Changer Rôle</th><th>Actions</th></tr></thead>
                  <tbody>
                    @for (u of filteredUsers(); track u.id) {
                      <tr>
                        <td>{{ u.id }}</td>
                        <td>{{ u.email }}</td>
                        <td>{{ u.full_name || '—' }}</td>
                        <td><span class="badge" [class]="'badge-'+u.role">{{ u.role }}</span></td>
                        <td><span class="badge" [class]="u.is_active ? 'badge-active' : 'badge-inactive'">{{ u.is_active ? 'Oui' : 'Non' }}</span></td>
                        <td style="font-size:.78rem;">{{ formatDate(u.created_at) }}</td>
                        <td>
                          <select class="role-select" [value]="u.role" (change)="changeRole(u.id, $any($event.target).value)">
                            <option value="candidate">candidat</option>
                            <option value="recruiter">recruteur</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td>
                          @if (u.is_active) {
                            <button class="action-btn btn-red" style="padding:4px 10px;font-size:11px;" (click)="deactivateUser(u.id)">Désactiver</button>
                          } @else {
                            <button class="action-btn btn-green" style="padding:4px 10px;font-size:11px;" (click)="reactivateUser(u.id)">Activer</button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <p style="font-size:.78rem;color:#94a3b8;margin-top:8px;">{{ filteredUsers().length }} / {{ users().length }} utilisateurs</p>
            } @else {
              <p style="color:#94a3b8;">Aucun utilisateur trouvé.</p>
            }
          </div>
        }

        <!-- TAB: Logs -->
        @if (activeTab() === 'logs') {
          <div class="section-card">
            <h3><i class="fas fa-history"></i> Historique de Scraping</h3>
            <div style="margin-bottom:12px;">
              <button class="action-btn btn-slate" (click)="loadScrapeLogs()"><i class="fas fa-sync-alt"></i> Actualiser</button>
            </div>
            @if (scrapeLogs().length) {
              <div style="overflow-x:auto;">
                <table class="scrape-log">
                  <thead><tr><th>ID</th><th>Source</th><th>Offres ajoutées</th><th>Statut</th><th>Erreur</th><th>Date</th></tr></thead>
                  <tbody>
                    @for (log of scrapeLogs(); track log['id']) {
                      <tr>
                        <td>{{ log['id'] }}</td>
                        <td>{{ log['source'] }}</td>
                        <td>{{ log['records_added'] ?? '—' }}</td>
                        <td [class]="'status-' + log['status']">{{ log['status'] }}</td>
                        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ log['error_message'] || '—' }}</td>
                        <td>{{ log['scraped_at'] ? formatDate('' + log['scraped_at']) : '—' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p style="color:#94a3b8;">Aucun log de scraping.</p>
            }
          </div>
        }
      }
    </div>
  `,
})
export class AdminComponent implements OnInit {
  auth    = inject(AuthService);
  private api   = inject(ApiService);
  private toast = inject(ToastService);

  stats       = signal<AdminStats | null>(null);
  jobsStats   = signal<{ total_jobs: number; remote_jobs: number; jobs_with_salary: number } | null>(null);

  companies       = signal<Record<string, unknown>[]>([]);
  loadingCompanies = signal(false);

  users        = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  loadingUsers = signal(false);
  userSearch = '';

  importing    = signal(false);
  importingScraper = signal(false);
  scraping     = signal(false);
  reseeding    = signal(false);
  importMsg    = signal('');
  importMsgClass = signal('action-msg ok');

  scrapeLogs   = signal<Record<string, unknown>[]>([]);
  activeTab    = signal<'jobs' | 'recruiters' | 'users' | 'logs'>('jobs');

  loginEmail = ''; loginPwd = '';
  authError  = signal('');

  ngOnInit(): void {
    if (this.auth.isAdmin()) this.loadAll();
  }

  loadAll(): void {
    this.api.adminStats().subscribe({ next: s => this.stats.set(s), error: () => {} });
    this.api.jobsStats().subscribe({ next: s => this.jobsStats.set(s), error: () => {} });
    this.loadCompanies();
    this.loadUsers();
  }

  importCsv(): void {
    this.importing.set(true); this.importMsg.set('');
    this.api.importJobsCsv().subscribe({
      next: d => { this.importing.set(false); this.importMsg.set('✅ ' + (d['message'] ?? JSON.stringify(d))); this.importMsgClass.set('action-msg ok'); this.api.jobsStats().subscribe(s => this.jobsStats.set(s)); },
      error: (e: { error?: { detail?: string } }) => { this.importing.set(false); this.importMsg.set('❌ ' + (e.error?.detail ?? 'Erreur')); this.importMsgClass.set('action-msg err'); },
    });
  }

  importScraperOutput(): void {
    this.importingScraper.set(true); this.importMsg.set('');
    this.api.importScraperOutput().subscribe({
      next: d => { this.importingScraper.set(false); this.importMsg.set('✅ ' + (d['message'] ?? JSON.stringify(d))); this.importMsgClass.set('action-msg ok'); this.api.jobsStats().subscribe(s => this.jobsStats.set(s)); },
      error: (e: { error?: { detail?: string } }) => { this.importingScraper.set(false); this.importMsg.set('❌ ' + (e.error?.detail ?? 'Erreur')); this.importMsgClass.set('action-msg err'); },
    });
  }

  reseedAll(): void {
    if (!confirm('Vider TOUTES les données (utilisateurs, CVs, offres, candidatures) et réimporter les données seed ?')) return;
    this.reseeding.set(true); this.importMsg.set('');
    this.api.reseedAll().subscribe({
      next: d => {
        this.reseeding.set(false);
        this.importMsg.set('✅ ' + (d['message'] ?? JSON.stringify(d)));
        this.importMsgClass.set('action-msg ok');
        this.toast.show('Données seed importées avec succès !', 'success');
        this.loadAll();
      },
      error: (e: { error?: { detail?: string } }) => {
        this.reseeding.set(false);
        this.importMsg.set('❌ ' + (e.error?.detail ?? 'Erreur reseed'));
        this.importMsgClass.set('action-msg err');
        this.toast.show('Erreur reseed', 'error');
      },
    });
  }

  triggerScrape(): void {
    this.scraping.set(true); this.importMsg.set('');
    this.toast.show('Scraping lancé... Cela peut prendre quelques minutes.', 'info');
    this.api.triggerScrape().subscribe({
      next: d => {
        this.scraping.set(false);
        const status = d['status'] as string;
        if (status === 'success') {
          this.importMsg.set('✅ Scraping terminé : ' + (d['jobs_scraped'] ?? 0) + ' offres importées');
          this.importMsgClass.set('action-msg ok');
          this.toast.show('Scraping terminé avec succès !', 'success');
        } else {
          this.importMsg.set('⚠️ ' + (d['detail'] ?? JSON.stringify(d)));
          this.importMsgClass.set('action-msg err');
        }
        this.api.jobsStats().subscribe(s => this.jobsStats.set(s));
      },
      error: (e: { error?: { detail?: string } }) => { this.scraping.set(false); this.importMsg.set('❌ ' + (e.error?.detail ?? 'Erreur scraping')); this.importMsgClass.set('action-msg err'); this.toast.show('Erreur scraping', 'error'); },
    });
  }

  loadCompanies(): void {
    this.loadingCompanies.set(true);
    this.api.adminCompanies().subscribe({
      next: c => { this.companies.set(c as Record<string, unknown>[]); this.loadingCompanies.set(false); },
      error: () => this.loadingCompanies.set(false),
    });
  }

  loadUsers(): void {
    this.loadingUsers.set(true);
    this.api.adminUsers().subscribe({
      next: u => { this.users.set(u); this.filteredUsers.set(u); this.loadingUsers.set(false); },
      error: () => this.loadingUsers.set(false),
    });
  }

  filterUsers(): void {
    const q = this.userSearch.toLowerCase().trim();
    if (!q) { this.filteredUsers.set(this.users()); return; }
    this.filteredUsers.set(this.users().filter(u =>
      u.email.toLowerCase().includes(q) || (u.full_name?.toLowerCase().includes(q))
    ));
  }

  loadScrapeLogs(): void {
    this.api.scrapeLogs().subscribe({
      next: logs => this.scrapeLogs.set(logs as Record<string, unknown>[]),
      error: () => {},
    });
  }

  deactivateUser(id: number): void {
    if (!confirm('Désactiver cet utilisateur ?')) return;
    this.api.deactivateUser(id).subscribe({
      next: () => { this.toast.show('Utilisateur désactivé', 'info'); this.loadCompanies(); this.loadUsers(); },
      error: () => this.toast.show('Erreur', 'error'),
    });
  }

  reactivateUser(id: number): void {
    this.api.updateUserRole(id, 'candidate').subscribe({
      next: () => { this.toast.show('Utilisateur réactivé', 'success'); this.loadCompanies(); this.loadUsers(); },
      error: () => this.toast.show('Erreur', 'error'),
    });
  }

  changeRole(userId: number, newRole: string): void {
    this.api.updateUserRole(userId, newRole).subscribe({
      next: () => { this.toast.show('Rôle mis à jour → ' + newRole, 'success'); this.loadUsers(); this.loadCompanies(); },
      error: (e: { error?: { detail?: string } }) => this.toast.show('❌ ' + (e.error?.detail ?? 'Erreur'), 'error'),
    });
  }

  doLogin(): void {
    this.authError.set('');
    this.auth.login(this.loginEmail, this.loginPwd).subscribe({
      next: (d) => {
        if (d.user.role !== 'admin') { this.authError.set("Ce compte n'est pas administrateur."); this.auth.logout(); return; }
        this.loadAll();
        this.toast.show('Connecté en tant qu\'admin', 'success');
      },
      error: (e: { error?: { detail?: string } }) => this.authError.set(e.error?.detail ?? 'Erreur'),
    });
  }

  formatDate(d: string): string { return new Date(d).toLocaleDateString('fr-FR'); }
  formatSalary(n: number): string { return Math.round(n).toLocaleString(); }
}
