import { Component, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { AdminStats } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  styles: [`
    .dash-hero {
      background:
        radial-gradient(ellipse at 30% 50%, rgba(56,189,248,.12),transparent 55%),
        radial-gradient(ellipse at 70% 30%, rgba(168,85,247,.12),transparent 55%),
        linear-gradient(135deg,#0a0f1e,#0f172a);
      padding:72px 0 100px;
    }
    .dash-hero h1 {
      font-family:'Poppins',sans-serif;
      font-size:clamp(1.9rem,4vw,2.8rem);
      font-weight:900; letter-spacing:-.04em;
      color:#fff; margin-bottom:8px;
    }
    .dash-hero p { color:#64748b; font-size:1rem; margin:0; }
    .dash-hero-badge {
      display:inline-flex; align-items:center; gap:8px;
      background:rgba(56,189,248,.1); border:1px solid rgba(56,189,248,.2);
      border-radius:999px; padding:5px 16px 5px 10px;
      font-size:.76rem; font-weight:700; color:#38bdf8;
      text-transform:uppercase; letter-spacing:.07em; margin-bottom:16px;
    }
    .stats-row {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
      gap:20px;
      margin-top:-56px;
      position:relative; z-index:10;
    }
    .kpi-card {
      background:linear-gradient(180deg,#ffffff,#f8fafe); border-radius:22px; padding:26px 28px;
      border:1px solid rgba(226,232,240,.7);
      box-shadow:0 10px 34px rgba(15,23,42,.07);
      display:flex; align-items:center; gap:18px;
      transition:all .3s cubic-bezier(.4,0,.2,1);
      position:relative; overflow:hidden;
    }
    .kpi-card::before {
      content:''; position:absolute; bottom:0; left:0; right:0;
      height:3px; background:var(--kpi-grad);
      transform:scaleX(0); transition:transform .35s;
    }
    .kpi-card:hover { transform:translateY(-5px); box-shadow:0 22px 50px rgba(15,23,42,.11); }
    .kpi-card:hover::before { transform:scaleX(1); }
    .kpi-logo {
      width:56px; height:56px; flex-shrink:0;
      filter:drop-shadow(0 9px 15px rgba(15,23,42,.16));
      transition:transform .45s cubic-bezier(0.34,1.56,0.64,1);
    }
    .kpi-card:hover .kpi-logo { transform:scale(1.1) rotate(-4deg); }
    .kpi-info h3 { font-size:.76rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#64748b; margin:0 0 4px; }
    .kpi-val  { font-family:'Poppins',sans-serif; font-size:1.9rem; font-weight:900; color:#0f172a; line-height:1; }
    .charts-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:32px; }
    .chart-card {
      background:#fff; border:1.5px solid rgba(226,232,240,.6);
      border-radius:20px; padding:28px;
      box-shadow:0 2px 16px rgba(0,0,0,.05);
    }
    .chart-card h3 { font-size:1rem; font-weight:800; color:#0f172a; margin:0 0 24px; display:flex; align-items:center; gap:8px; }
    .chart-card h3 i { color:#38bdf8; }
    .bar-row { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
    .bar-label { width:160px; font-size:.8rem; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:500; }
    .bar-track { flex:1; height:10px; background:#f1f5f9; border-radius:999px; overflow:hidden; }
    .bar-fill { height:100%; border-radius:999px; transition:width 1s cubic-bezier(.4,0,.2,1); }
    .bar-fill-blue { background:linear-gradient(90deg,#0ea5e9,#38bdf8); }
    .bar-fill-green { background:linear-gradient(90deg,#10b981,#34d399); }
    .bar-count { font-size:.76rem; color:#94a3b8; min-width:24px; text-align:right; font-weight:600; }
    .loading-state { text-align:center; padding:80px; color:#94a3b8; }
    .loading-state i { font-size:2.2rem; margin-bottom:16px; display:block; }
    .error-state { text-align:center; padding:60px; color:#94a3b8; }
    .tab-nav {
      display:flex; gap:8px; margin:0 0 32px;
      border-bottom:2px solid rgba(226,232,240,.7);
      padding-bottom:0;
    }
    .tab-btn {
      display:inline-flex; align-items:center; gap:8px;
      padding:12px 24px; border:none; background:transparent;
      font-size:.9rem; font-weight:700; color:#64748b;
      cursor:pointer; border-bottom:3px solid transparent;
      margin-bottom:-2px; border-radius:8px 8px 0 0;
      transition:all .2s;
    }
    .tab-btn:hover { color:#38bdf8; background:rgba(56,189,248,.05); }
    .tab-btn.active { color:#38bdf8; border-bottom-color:#38bdf8; background:rgba(56,189,248,.07); }
    .tab-btn i { font-size:1rem; }
    .powerbi-wrapper {
      background:#fff; border:1.5px solid rgba(226,232,240,.6);
      border-radius:20px; overflow:hidden;
      box-shadow:0 2px 24px rgba(15,23,42,.08);
      margin-top:8px;
    }
    .powerbi-wrapper iframe { display:block; width:100%; border:none; }
    .pbi-note {
      display:flex; gap:12px; align-items:flex-start;
      background:#f0f9ff; border:1px solid #bae6fd; border-radius:12px;
      padding:11px 16px; margin:8px 0 12px; font-size:.82rem; color:#0c4a6e; line-height:1.5;
    }
    .pbi-note i.fa-circle-info { color:#0ea5e9; font-size:1rem; margin-top:2px; }
    .pbi-note > div { flex:1; }
    .pbi-note a { color:#0369a1; font-weight:700; text-decoration:underline; }
    .pbi-open-link {
      display:inline-flex; align-items:center; gap:6px; margin-left:8px;
      white-space:nowrap; text-decoration:none !important;
    }
    .pbi-note-close {
      background:none; border:none; cursor:pointer; color:#64748b;
      font-size:.95rem; padding:2px 4px; border-radius:6px; flex-shrink:0; transition:all .15s;
    }
    .pbi-note-close:hover { background:#e0f2fe; color:#0369a1; }
    @media(max-width:768px) {
      .charts-grid { grid-template-columns:1fr; }
      .stats-row { grid-template-columns:1fr 1fr; }
      .bar-label { width:110px; }
      .tab-btn { padding:10px 14px; font-size:.8rem; }
      .powerbi-wrapper iframe { height:420px; }
    }
  `],
  template: `
    <!-- Hero -->
    <div class="dash-hero">
      <div class="container">
        <div class="dash-hero-badge">
          <span style="width:6px;height:6px;border-radius:50%;background:#38bdf8;display:inline-block;"></span>
          Tableau de bord
        </div>
        <h1><i class="fas fa-chart-bar" style="color:#38bdf8;font-size:.9em;"></i> Dashboard</h1>
        <p>Vue d'ensemble des analyses de candidats et des prédictions ML en temps réel.</p>
      </div>
    </div>

    <div class="container" style="padding-bottom:80px;">

      <!-- Tab Navigation -->
      <div class="tab-nav" style="margin-top:32px;">
        <button class="tab-btn" [class.active]="activeTab() === 'ia'" (click)="activeTab.set('ia')">
          <i class="fas fa-robot"></i> Dashboard IA
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'powerbi'" (click)="activeTab.set('powerbi')">
          <i class="fas fa-chart-pie"></i> Power BI Dashboard
        </button>
      </div>

      <!-- ── Tab: Dashboard IA ─────────────────────────────────── -->
      @if (activeTab() === 'ia') {
        @if (loading()) {
          <div class="loading-state stats-row" style="display:block;">
            <i class="fas fa-circle-notch fa-spin"></i>
            <p style="font-size:1rem;">Chargement des statistiques...</p>
          </div>
        } @else if (stats()) {

          <!-- KPI Cards -->
          <div class="stats-row" style="margin-top:24px;">
            <div class="kpi-card" style="--kpi-grad:linear-gradient(90deg,#38bdf8,#0ea5e9);">
              <img class="kpi-logo" src="assets/icons/users.svg" alt="" width="56" height="56">
              <div class="kpi-info">
                <h3>Total Candidats</h3>
                <div class="kpi-val">{{ stats()!.total }}</div>
              </div>
            </div>

            <div class="kpi-card" style="--kpi-grad:linear-gradient(90deg,#10b981,#34d399);">
              <img class="kpi-logo" src="assets/icons/check.svg" alt="" width="56" height="56">
              <div class="kpi-info">
                <h3>Recommandés</h3>
                <div class="kpi-val">{{ stats()!.hired_count }}</div>
              </div>
            </div>

            <div class="kpi-card" style="--kpi-grad:linear-gradient(90deg,#a855f7,#c084fc);">
              <img class="kpi-logo" src="assets/icons/percent.svg" alt="" width="56" height="56">
              <div class="kpi-info">
                <h3>Prob. Moy. Embauche</h3>
                <div class="kpi-val">{{ (stats()!.avg_hire_probability * 100).toFixed(1) }}%</div>
              </div>
            </div>

            <div class="kpi-card" style="--kpi-grad:linear-gradient(90deg,#f59e0b,#fbbf24);">
              <img class="kpi-logo" src="assets/icons/salary.svg" alt="" width="56" height="56">
              <div class="kpi-info">
                <h3>Salaire Moyen Prédit</h3>
                <div class="kpi-val">\${{ stats()!.avg_predicted_salary.toFixed(0) }}</div>
              </div>
            </div>
          </div>

          <!-- Charts -->
          <div class="charts-grid">
            <div class="chart-card">
              <h3><i class="fas fa-briefcase"></i> Répartition par Rôle</h3>
              @for (entry of topRoles(); track entry.role) {
                <div class="bar-row">
                  <div class="bar-label" [title]="entry.role">{{ entry.role }}</div>
                  <div class="bar-track">
                    <div class="bar-fill bar-fill-blue"
                      [style.width.%]="stats()!.total ? (entry.count / stats()!.total) * 100 : 0"></div>
                  </div>
                  <div class="bar-count">{{ entry.count }}</div>
                </div>
              }
            </div>

            <div class="chart-card">
              <h3><i class="fas fa-layer-group"></i> Clusters Candidats</h3>
              @for (entry of clusters(); track entry.cluster) {
                <div class="bar-row">
                  <div class="bar-label">{{ clusterName(entry.cluster) }}</div>
                  <div class="bar-track">
                    <div class="bar-fill bar-fill-green"
                      [style.width.%]="stats()!.total ? (entry.count / stats()!.total) * 100 : 0"></div>
                  </div>
                  <div class="bar-count">{{ entry.count }}</div>
                </div>
              }
            </div>
          </div>

        } @else {
          <div class="error-state">
            <i class="fas fa-exclamation-triangle" style="font-size:2rem;margin-bottom:12px;display:block;color:#f59e0b;"></i>
            <p>Impossible de charger les statistiques. Vérifiez la connexion au backend.</p>
          </div>
        }
      }

      <!-- ── Tab: Power BI Dashboard ───────────────────────────── -->
      @if (activeTab() === 'powerbi') {
        @if (showPbiNote()) {
          <div class="pbi-note">
            <i class="fas fa-circle-info"></i>
            <div>
              <strong>Rapport sécurisé (RLS).</strong>
              Si le rapport n'apparaît pas, connectez-vous à Power BI avec un compte autorisé
              (licence Pro + accès accordé par <a href="mailto:Imed.Attia@esprit.tn">Imed.Attia&#64;esprit.tn</a>).
              <a [href]="powerBiOpenUrl" target="_blank" rel="noopener" class="pbi-open-link">
                <i class="fas fa-external-link-alt"></i> Ouvrir dans Power BI
              </a>
            </div>
            <button class="pbi-note-close" (click)="showPbiNote.set(false)" title="Masquer">
              <i class="fas fa-times"></i>
            </button>
          </div>
        }
        <div class="powerbi-wrapper">
          <iframe
            title="Final_Jobs_Bi"
            [src]="powerBiUrl"
            height="600"
            frameborder="0"
            allowfullscreen="true">
          </iframe>
        </div>
      }

    </div>
  `,
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  stats = signal<AdminStats | null>(null);
  activeTab = signal<'ia' | 'powerbi'>('ia');
  showPbiNote = signal(true);

  // Power BI reports embedded by role.
  //  - Full report: recruiters / admins (all pages).
  //  - Candidate report: candidates only (Skills page removed).
  // The candidate never receives the full-report URL → real page-level partitioning.
  private static readonly FULL_REPORT_URL =
    'https://app.powerbi.com/reportEmbed?reportId=094b193e-3502-4e79-8bc8-6a9d26e0f4b0&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730&actionBarEnabled=true';
  private static readonly CANDIDATE_REPORT_URL =
    'https://app.powerbi.com/reportEmbed?reportId=cb829f90-5c9f-4a64-8650-9cc04325e765&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730&actionBarEnabled=true';

  readonly powerBiUrl: SafeResourceUrl;
  // Full Power BI tab — login/RLS works more reliably here than inside an iframe.
  readonly powerBiOpenUrl: string;

  readonly CLUSTER_NAMES: Record<string, string> = {
    '0': 'Seniors Confirmés',
    '1': 'Experts Techniques',
    '2': 'Juniors Prometteurs',
    '3': 'Profils Polyvalents',
  };

  constructor(private api: ApiService, private sanitizer: DomSanitizer, private auth: AuthService) {
    const reportUrl = this.auth.isCandidate()
      ? DashboardComponent.CANDIDATE_REPORT_URL
      : DashboardComponent.FULL_REPORT_URL;
    this.powerBiOpenUrl = reportUrl;
    this.powerBiUrl = this.sanitizer.bypassSecurityTrustResourceUrl(reportUrl);
  }

  ngOnInit(): void {
    this.api.adminStats().subscribe({
      next: d => { this.stats.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  topRoles(): { role: string; count: number }[] {
    const dist = this.stats()?.roles_distribution ?? {};
    return Object.entries(dist)
      .map(([role, count]) => ({ role, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }

  clusters(): { cluster: string; count: number }[] {
    const dist = this.stats()?.clusters_distribution ?? {};
    return Object.entries(dist).map(([cluster, count]) => ({ cluster, count: count as number }));
  }

  clusterName(key: string): string {
    return this.CLUSTER_NAMES[key] ?? `Cluster ${key}`;
  }
}
