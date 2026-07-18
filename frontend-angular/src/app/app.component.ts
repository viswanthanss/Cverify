import { Component, signal, HostListener, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ApiService } from './core/api.service';
import { ToastComponent } from './shared/toast.component';
import { ChatWidgetComponent } from './shared/chat-widget.component';
import { Notification } from './core/models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastComponent, ChatWidgetComponent],
  template: `
    <!-- Notification dropdown overlay -->
    @if (showNotifDropdown()) {
      <div class="notif-backdrop" (click)="showNotifDropdown.set(false)"></div>
    }

    <!-- Navigation -->
    <nav class="nav" [class.nav-scrolled]="scrolled()">
      <div class="nav-container">
        <!-- Brand -->
        <a class="nav-brand" routerLink="/" (click)="closeMenu()">
          <div class="brand-icon">CV</div>
          <strong>CVerify</strong>
        </a>

        <!-- Desktop Links -->
        <div class="nav-links" [class.mobile-open]="menuOpen()">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" (click)="closeMenu()">Accueil</a>

          <!-- Plateforme dropdown -->
          <div class="nav-dropdown" [class.dd-open]="openDropdown() === 'plateforme'">
            <button class="nav-dd-trigger" (click)="toggleDropdown('plateforme')">
              Plateforme <i class="fas fa-chevron-down dd-arrow"></i>
            </button>
            <div class="nav-dd-menu">
              <a routerLink="/analyse" routerLinkActive="active" (click)="closeAll()">
                <span class="dd-icon"><i class="fas fa-file-alt"></i></span>
                <span class="dd-text"><strong>Analyse CV</strong><small>Analyse IA de votre CV</small></span>
              </a>
              <a routerLink="/offres" routerLinkActive="active" (click)="closeAll()">
                <span class="dd-icon"><i class="fas fa-briefcase"></i></span>
                <span class="dd-text"><strong>Offres d'emploi</strong><small>+46 000 offres indexées</small></span>
              </a>
              <a routerLink="/dashboard" routerLinkActive="active" (click)="closeAll()">
                <span class="dd-icon"><i class="fas fa-chart-bar"></i></span>
                <span class="dd-text"><strong>Dashboard</strong><small>Statistiques & KPIs</small></span>
              </a>
            </div>
          </div>

          <!-- Notre Projet dropdown -->
          <div class="nav-dropdown" [class.dd-open]="openDropdown() === 'projet'">
            <button class="nav-dd-trigger" (click)="toggleDropdown('projet')">
              Notre Projet <i class="fas fa-chevron-down dd-arrow"></i>
            </button>
            <div class="nav-dd-menu">
              <a routerLink="/showcase" routerLinkActive="active" (click)="closeAll()">
                <span class="dd-icon"><i class="fas fa-microscope"></i></span>
                <span class="dd-text"><strong>Présentation</strong><small>Technologies & architecture</small></span>
              </a>
              <a href="https://gitlab.com/AttiaImeed/cverify" target="_blank" rel="noopener" (click)="closeAll()">
                <span class="dd-icon"><i class="fab fa-gitlab"></i></span>
                <span class="dd-text"><strong>GitLab</strong><small>Code source du projet</small></span>
              </a>
              <a href="https://hub.docker.com/r/attiaimeed/cverify-backend" target="_blank" rel="noopener" (click)="closeAll()">
                <span class="dd-icon"><i class="fab fa-docker"></i></span>
                <span class="dd-text"><strong>Docker Hub</strong><small>Images publiées</small></span>
              </a>
            </div>
          </div>

          @if (auth.isCandidate()) {
            <a routerLink="/candidat" routerLinkActive="active" (click)="closeMenu()">Mon Espace</a>
          }
          @if (auth.isOnlyRecruiter()) {
            <a routerLink="/recruteur" routerLinkActive="active" (click)="closeMenu()">Recruteur</a>
          }
          @if (auth.isAdmin()) {
            <a routerLink="/admin" routerLinkActive="active" (click)="closeMenu()">Admin</a>
          }

          <!-- Mobile-only: user actions -->
          @if (auth.isLoggedIn()) {
            <div class="mobile-user-info">
              <i class="fas fa-user-circle"></i>
              <span>{{ auth.user()?.email }}</span>
            </div>
            <button class="mobile-logout-btn" (click)="auth.logout(); closeMenu()">
              <i class="fas fa-sign-out-alt"></i> Déconnexion
            </button>
          } @else {
            <a routerLink="/login" class="mobile-auth-link mobile-auth-login" (click)="closeMenu()">
              <i class="fas fa-right-to-bracket"></i> Connexion
            </a>
            <a routerLink="/register" class="mobile-auth-link mobile-auth-register" (click)="closeMenu()">
              <i class="fas fa-user-plus"></i> Créer un compte
            </a>
          }
        </div>

        <!-- Desktop: user + actions -->
        <div class="nav-actions">
          @if (auth.isLoggedIn()) {
            <!-- Notification Bell -->
            <div class="notif-bell-wrap" style="position:relative;">
              <button class="notif-bell" (click)="toggleNotifDropdown()" title="Notifications">
                <i class="fas fa-bell"></i>
                @if (unreadCount() > 0) {
                  <span class="notif-badge">{{ unreadCount() > 9 ? '9+' : unreadCount() }}</span>
                }
              </button>
              @if (showNotifDropdown()) {
                <div class="notif-dropdown">
                  <div class="notif-header">
                    <span>Notifications</span>
                    @if (unreadCount() > 0) {
                      <button class="notif-mark-all" (click)="markAllRead()">Tout lire</button>
                    }
                  </div>
                  @if (!notifications().length) {
                    <div class="notif-empty"><i class="fas fa-bell-slash"></i> Aucune notification</div>
                  }
                  @for (n of notifications(); track n.id) {
                    <div class="notif-item" [class.unread]="!n.is_read" (click)="readNotif(n)">
                      <div class="notif-icon" [class]="'notif-icon-' + n.type">
                        <i class="fas" [class]="notifIcon(n.type)"></i>
                      </div>
                      <div class="notif-content">
                        <div class="notif-title">{{ n.title }}</div>
                        <div class="notif-msg">{{ n.message }}</div>
                        <div class="notif-time">{{ formatNotifTime(n.created_at) }}</div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="nav-user">
              <div class="user-avatar"><i class="fas fa-user"></i></div>
              <span class="user-email">{{ auth.user()?.email }}</span>
              <button class="btn-logout" (click)="auth.logout()" title="Déconnexion">
                <i class="fas fa-sign-out-alt"></i>
              </button>
            </div>
          } @else {
            <a routerLink="/register" class="nav-register-link">S'inscrire</a>
            <a routerLink="/login" class="nav-login-btn"><i class="fas fa-right-to-bracket"></i> Connexion</a>
          }
          <!-- Hamburger -->
          <button class="hamburger" [class.open]="menuOpen()" (click)="toggleMenu()" aria-label="Menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Mobile backdrop -->
    @if (menuOpen()) {
      <div class="mobile-backdrop" (click)="closeMenu()"></div>
    }

    <!-- Page content -->
    <main>
      <router-outlet />
    </main>

    <!-- Toast notifications -->
    <app-toast />

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-grid">
        <!-- Brand col -->
        <div class="footer-col footer-col-brand">
          <div class="footer-logo">
            <div class="brand-icon" style="width:40px;height:40px;font-size:.9rem;">CV</div>
            <strong>CVerify</strong>
          </div>
          <p class="footer-tagline">
            Plateforme intelligente d'analyse de CV propulsée par le Machine Learning — Analyse, prédiction et recommandation en temps réel.
          </p>
          <div class="footer-links-row">
            <a class="footer-icon-link" href="https://cverify-frontend.onrender.com" target="_blank" rel="noopener">
              <i class="fas fa-globe"></i> Live Demo
            </a>
            <a class="footer-icon-link" href="https://gitlab.com/AttiaImeed/cverify" target="_blank" rel="noopener">
              <i class="fab fa-gitlab"></i> GitLab
            </a>
            <a class="footer-icon-link" href="https://hub.docker.com/r/attiaimeed/cverify-backend" target="_blank" rel="noopener">
              <i class="fab fa-docker"></i> Docker Hub
            </a>
            <a class="footer-icon-link" href="https://cverify-backend.onrender.com" target="_blank" rel="noopener">
              <i class="fas fa-server"></i> API
            </a>
          </div>
        </div>

        <!-- Navigation -->
        <div class="footer-col">
          <h4>Navigation</h4>
          <ul class="footer-list">
            <li><a routerLink="/"><i class="fas fa-home footer-ext-icon"></i> Accueil</a></li>
            <li><a routerLink="/analyse"><i class="fas fa-file-alt footer-ext-icon"></i> Analyse CV</a></li>
            <li><a routerLink="/dashboard"><i class="fas fa-chart-bar footer-ext-icon"></i> Dashboard</a></li>
            <li><a routerLink="/offres"><i class="fas fa-briefcase footer-ext-icon"></i> Offres d'emploi</a></li>
            <li><a routerLink="/showcase"><i class="fas fa-microscope footer-ext-icon"></i> Notre Projet</a></li>
          </ul>
        </div>

        <!-- Notebooks -->
        <div class="footer-col">
          <h4>Notebooks Kaggle</h4>
          <ul class="footer-list">
            <li>
              <a href="https://www.kaggle.com/code/attiaimeed/job-recommender-model" target="_blank" rel="noopener">
                <i class="fas fa-external-link-alt footer-ext-icon"></i> Job Recommender
              </a>
            </li>
            <li>
              <a href="https://www.kaggle.com/code/attiaimeed/nlp-model-comparison-for-resume-job-role-classific" target="_blank" rel="noopener">
                <i class="fas fa-external-link-alt footer-ext-icon"></i> NLP Classification
              </a>
            </li>
            <li>
              <a href="https://www.kaggle.com/code/attiaimeed/resume-ml-pj" target="_blank" rel="noopener">
                <i class="fas fa-external-link-alt footer-ext-icon"></i> Resume ML Pipeline
              </a>
            </li>
          </ul>
        </div>

        <!-- Team -->
        <div class="footer-col">
          <h4>Équipe</h4>
          <div class="footer-team">
            <span><i class="fas fa-user-circle" style="color:var(--primary);margin-right:8px;"></i>Imed Attia</span>
            <span><i class="fas fa-user-circle" style="color:var(--secondary);margin-right:8px;"></i>Khalil Chiha</span>
            <span><i class="fas fa-user-circle" style="color:var(--green);margin-right:8px;"></i>Zaineb Khlifi</span>
            <span><i class="fas fa-user-circle" style="color:var(--amber);margin-right:8px;"></i>Yessine Mnejja</span>
            <span><i class="fas fa-user-circle" style="color:var(--accent);margin-right:8px;"></i>Feres Loukil</span>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <p>
          &copy; 2026 CVerify &nbsp;·&nbsp;
          <span style="color:var(--primary);">Projet ML &amp; Data Science</span>
          &nbsp;·&nbsp; ESPRIT École Supérieure Privée d'Ingénierie
        </p>
      </div>
    </footer>

    <!-- Chat widget -->
    <app-chat-widget />
  `,
  styles: [`
    .notif-backdrop { position:fixed;inset:0;z-index:4999; }
    .notif-bell-wrap { display:flex;align-items:center; }
    .notif-bell {
      position:relative; background:none; border:none; cursor:pointer;
      color:rgba(255,255,255,0.75); font-size:1.1rem; padding:6px 8px;
      border-radius:8px; transition:all .2s;
    }
    .notif-bell:hover { color:#38bdf8; background:rgba(56,189,248,.1); }
    .notif-badge {
      position:absolute; top:-4px; right:-4px;
      background:#ef4444; color:#fff; font-size:.6rem; font-weight:800;
      border-radius:999px; min-width:16px; height:16px;
      display:flex; align-items:center; justify-content:center;
      padding:0 4px; line-height:1;
    }
    .notif-dropdown {
      position:absolute; top:calc(100% + 10px); right:0;
      background:#fff; border-radius:16px; width:340px; max-height:420px;
      overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.2);
      border:1px solid rgba(226,232,240,.6); z-index:5000;
    }
    .notif-header {
      display:flex; justify-content:space-between; align-items:center;
      padding:14px 16px 10px; font-weight:700; font-size:.9rem; color:#0f172a;
      border-bottom:1px solid #f1f5f9; position:sticky; top:0; background:#fff;
    }
    .notif-mark-all {
      font-size:.75rem; color:#0ea5e9; background:none; border:none;
      cursor:pointer; font-weight:600; padding:4px 8px; border-radius:6px;
    }
    .notif-mark-all:hover { background:#f0f9ff; }
    .notif-empty { padding:28px; text-align:center; color:#94a3b8; font-size:.88rem; }
    .notif-item {
      display:flex; gap:10px; padding:12px 14px; cursor:pointer;
      border-bottom:1px solid #f8fafc; transition:background .15s;
    }
    .notif-item:hover { background:#f8fafc; }
    .notif-item.unread { background:#f0f9ff; }
    .notif-icon {
      width:34px; height:34px; border-radius:50%; flex-shrink:0;
      display:flex; align-items:center; justify-content:center; font-size:.85rem;
    }
    .notif-icon-accepted { background:#dcfce7; color:#16a34a; }
    .notif-icon-rejected { background:#fee2e2; color:#dc2626; }
    .notif-icon-application_received { background:#dbeafe; color:#1d4ed8; }
    .notif-icon-application_confirmed { background:#fef9c3; color:#854d0e; }
    .notif-icon-reviewed { background:#f3e8ff; color:#7c3aed; }
    .notif-content { flex:1; min-width:0; }
    .notif-title { font-size:.82rem; font-weight:700; color:#0f172a; margin-bottom:2px; }
    .notif-msg { font-size:.76rem; color:#64748b; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .notif-time { font-size:.7rem; color:#94a3b8; margin-top:3px; }
    .mobile-user-info {
      display:none; align-items:center; gap:10px; padding:12px 16px;
      background:rgba(255,255,255,0.05); border-radius:10px;
      color:rgba(255,255,255,0.7); font-size:0.88rem; margin-top:8px;
    }
    .mobile-logout-btn {
      display:none; width:100%; padding:12px 16px;
      background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.25);
      border-radius:10px; color:#fc8181; font-weight:600; font-size:0.92rem;
      cursor:pointer; text-align:left; margin-top:6px; transition:all 0.2s;
    }
    .mobile-logout-btn:hover { background:rgba(239,68,68,0.3); }
    .mobile-auth-link {
      display:none; width:100%; padding:13px 16px; border-radius:12px;
      font-weight:700; font-size:0.95rem; text-align:center;
      align-items:center; justify-content:center; gap:8px; margin-top:8px;
    }
    .mobile-auth-login { background:linear-gradient(135deg,#0ea5e9,#38bdf8); color:#0a0f1e; box-shadow:0 6px 18px rgba(56,189,248,0.3); }
    .mobile-auth-login:hover { background:linear-gradient(135deg,#0ea5e9,#7dd3fc); color:#0a0f1e; }
    .mobile-auth-register { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.14); color:#fff; }
    .mobile-auth-register:hover { background:rgba(255,255,255,0.12); color:#fff; }

    /* ── Nav Dropdowns ─────────────────────────── */
    .nav-dropdown { position:relative; display:flex; align-items:center; }

    .nav-dd-trigger {
      display:inline-flex; align-items:center; gap:6px;
      background:none; border:none; cursor:pointer;
      color:rgba(255,255,255,0.65); padding:8px 14px;
      border-radius:10px; font-weight:500; font-size:0.9rem;
      font-family:inherit; transition:all .2s;
      white-space:nowrap;
    }
    .nav-dd-trigger:hover { color:#fff; background:rgba(255,255,255,0.08); }
    .nav-dropdown.dd-open .nav-dd-trigger { color:#38bdf8; background:rgba(56,189,248,0.1); }

    .dd-arrow { font-size:.65rem; transition:transform .25s; color:inherit; }
    .nav-dropdown.dd-open .dd-arrow { transform:rotate(180deg); }

    .nav-dd-menu {
      position:absolute; top:calc(100% + 10px); left:50%;
      transform:translateX(-50%) translateY(-6px);
      background:rgba(10,15,30,0.97);
      backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
      border:1px solid rgba(255,255,255,0.1);
      border-radius:16px; min-width:240px;
      box-shadow:0 20px 60px rgba(0,0,0,.45);
      padding:8px; z-index:2000;
      pointer-events:none; opacity:0;
      transition:opacity .2s, transform .2s;
    }
    .nav-dropdown.dd-open .nav-dd-menu {
      opacity:1; pointer-events:all;
      transform:translateX(-50%) translateY(0);
    }
    .nav-dd-menu a {
      display:flex; align-items:center; gap:12px;
      padding:10px 12px; border-radius:10px;
      color:rgba(255,255,255,0.75) !important;
      transition:all .15s;
    }
    .nav-dd-menu a:hover { background:rgba(56,189,248,0.1); color:#fff !important; }
    .nav-dd-menu a.active { color:#38bdf8 !important; background:rgba(56,189,248,0.08); }

    .dd-icon {
      width:34px; height:34px; border-radius:8px; flex-shrink:0;
      background:rgba(255,255,255,0.07); display:flex;
      align-items:center; justify-content:center;
      font-size:.9rem; color:#38bdf8;
    }
    .nav-dd-menu a:hover .dd-icon { background:rgba(56,189,248,0.15); }
    .dd-text { display:flex; flex-direction:column; }
    .dd-text strong { font-size:.85rem; font-weight:600; line-height:1.2; }
    .dd-text small { font-size:.72rem; color:rgba(255,255,255,0.45); line-height:1.3; margin-top:1px; }

    @media(max-width:768px) {
      .mobile-user-info { display:flex; }
      .mobile-logout-btn { display:block; }
      .mobile-auth-link { display:flex; }
      .nav-actions .nav-user { display:none; }
      .notif-dropdown { width:300px; right:-60px; }

      /* Mobile dropdowns: stack inline */
      .nav-dropdown { flex-direction:column; align-items:stretch; width:100%; }
      .nav-dd-trigger { width:100%; text-align:left; padding:12px 16px; border-radius:10px; font-size:0.95rem; }
      .nav-dd-menu {
        position:static; transform:none !important;
        opacity:1 !important; pointer-events:all !important;
        background:rgba(255,255,255,0.04);
        border:1px solid rgba(255,255,255,0.07);
        border-radius:10px; margin-top:4px;
        box-shadow:none; min-width:unset; display:none;
      }
      .nav-dropdown.dd-open .nav-dd-menu { display:block; }
      .nav-dd-menu a { padding:10px 14px; }
    }
  `],
})
export class AppComponent implements OnInit {
  scrolled = signal(false);
  menuOpen = signal(false);
  openDropdown = signal<string | null>(null);
  showNotifDropdown = signal(false);
  notifications = signal<Notification[]>([]);
  unreadCount = signal(0);

  public auth = inject(AuthService);
  private api = inject(ApiService);

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) this.loadNotifications();
    this.pollInterval = setInterval(() => {
      if (this.auth.isLoggedIn()) this.loadUnreadCount();
    }, 30000);
  }

  loadNotifications(): void {
    this.api.getNotifications().subscribe({
      next: n => {
        this.notifications.set(n);
        this.unreadCount.set(n.filter(x => !x.is_read).length);
      },
      error: () => {},
    });
  }

  loadUnreadCount(): void {
    this.api.getUnreadCount().subscribe({
      next: r => this.unreadCount.set(r.count),
      error: () => {},
    });
  }

  toggleNotifDropdown(): void {
    this.showNotifDropdown.update(v => !v);
    if (this.showNotifDropdown()) this.loadNotifications();
  }

  readNotif(n: Notification): void {
    if (!n.is_read) {
      this.api.markNotificationRead(n.id).subscribe({ error: () => {} });
      this.notifications.update(list => list.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      this.unreadCount.update(c => Math.max(0, c - 1));
    }
  }

  markAllRead(): void {
    this.api.markAllNotificationsRead().subscribe({
      next: () => {
        this.notifications.update(list => list.map(x => ({ ...x, is_read: true })));
        this.unreadCount.set(0);
      },
      error: () => {},
    });
  }

  notifIcon(type: string): string {
    const map: Record<string, string> = {
      accepted: 'fa-check-circle',
      rejected: 'fa-times-circle',
      application_received: 'fa-inbox',
      application_confirmed: 'fa-paper-plane',
      reviewed: 'fa-eye',
    };
    return map[type] ?? 'fa-bell';
  }

  formatNotifTime(d: string): string {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    return new Date(d).toLocaleDateString('fr-FR');
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    this.scrolled.set(window.scrollY > 24);
    if (this.openDropdown()) this.openDropdown.set(null);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    if (!t.closest('.nav-dropdown')) this.openDropdown.set(null);
  }

  toggleDropdown(name: string): void {
    this.openDropdown.update(v => v === name ? null : name);
  }

  closeAll(): void {
    this.openDropdown.set(null);
    this.closeMenu();
  }

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
    if (!this.menuOpen()) this.openDropdown.set(null);
    document.body.style.overflow = this.menuOpen() ? 'hidden' : '';
  }

  closeMenu(): void {
    this.menuOpen.set(false);
    this.openDropdown.set(null);
    document.body.style.overflow = '';
  }
}
