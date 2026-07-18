import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { RecruiterPost, RecruiterPostCreate, ApplicationFull } from '../../core/models';

@Component({
  selector: 'app-recruiter',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    .portal-grid{display:grid;grid-template-columns:320px 1fr;gap:28px;align-items:start;}
    @media(max-width:900px){.portal-grid{grid-template-columns:1fr;}}
    .side-card{background:#fff;border:1.5px solid rgba(226,232,240,.7);border-radius:22px;padding:28px;position:sticky;top:90px;box-shadow:0 4px 24px rgba(0,0,0,.06);}
    .side-card h3{font-size:1rem;font-weight:800;margin:0 0 20px;color:#0f172a;display:flex;align-items:center;gap:8px;}
    .side-card h3 i{color:#7c3aed;}
    .post-card{background:#fff;border:1.5px solid rgba(226,232,240,.7);border-radius:18px;padding:22px;margin-bottom:16px;transition:all .3s;box-shadow:0 2px 12px rgba(0,0,0,.04);}
    .post-card:hover{box-shadow:0 12px 32px rgba(0,0,0,.09);transform:translateY(-2px);}
    .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:.7rem;font-weight:800;letter-spacing:.04em;}
    .badge-active{background:#dcfce7;color:#15803d;}
    .badge-closed{background:#fee2e2;color:#dc2626;}
    .post-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;}
    .post-actions button{padding:8px 16px;border-radius:10px;border:none;font-size:.8rem;font-weight:700;cursor:pointer;transition:all .25s;}
    .btn-view-apps{background:linear-gradient(135deg,#e0f2fe,#dbeafe);color:#0369a1;display:inline-flex;align-items:center;gap:6px;}.btn-view-apps:hover{background:#bae6fd;transform:translateY(-1px);}
    .apps-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#0369a1;color:#fff;font-size:.68rem;font-weight:800;line-height:1;}
    .btn-toggle{background:#f1f5f9;color:#475569;}.btn-toggle:hover{background:#e2e8f0;}
    .btn-del{background:#fee2e2;color:#dc2626;}.btn-del:hover{background:#fecaca;transform:translateY(-1px);}
    .form-group label{display:block;font-size:.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;margin-top:12px;}
    .form-group input,.form-group select,.form-group textarea{width:100%;padding:10px 14px;border:1.5px solid #e8edf2;border-radius:10px;font-size:.9rem;font-family:inherit;outline:none;box-sizing:border-box;background:#f8fafc;transition:all .25s;}
    .form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:#7c3aed;background:#fff;box-shadow:0 0 0 3px rgba(124,58,237,.08);}
    .auth-box{max-width:420px;margin:60px auto;background:#fff;border:1.5px solid rgba(226,232,240,.6);border-radius:24px;padding:36px;box-shadow:0 8px 32px rgba(0,0,0,.07);}
    .rtab{flex:1;padding:9px;border-radius:10px;border:1.5px solid #e2e8f0;background:transparent;font-weight:700;font-size:.8rem;cursor:pointer;transition:all .25s;color:#64748b;}
    .rtab.active{border-color:#7c3aed;color:#7c3aed;background:#faf5ff;box-shadow:0 0 0 3px rgba(124,58,237,.08);}
    .modal-overlay{position:fixed;inset:0;background:rgba(10,15,30,.55);z-index:8000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);}
    .modal-box{background:#fff;border-radius:24px;padding:32px;max-width:680px;width:100%;max-height:88vh;overflow-y:auto;box-shadow:0 40px 80px rgba(0,0,0,.25);}
    .app-card{border:1.5px solid #e2e8f0;border-radius:14px;padding:16px;margin-bottom:12px;transition:all .25s;}
    .app-card:hover{border-color:rgba(56,189,248,.3);box-shadow:0 4px 16px rgba(0,0,0,.06);}
    .status-badge{padding:4px 12px;border-radius:999px;font-size:.7rem;font-weight:800;}
    .status-pending{background:#fef9c3;color:#854d0e;}
    .status-accepted{background:#dcfce7;color:#15803d;}
    .status-rejected{background:#fee2e2;color:#dc2626;}
    .status-reviewed{background:#dbeafe;color:#1d4ed8;}
    .hire-bar{height:6px;border-radius:999px;background:#e2e8f0;margin-top:6px;overflow:hidden;}
    .hire-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#38bdf8,#7c3aed);}
    .rec-badge{display:inline-block;padding:3px 10px;border-radius:999px;margin-top:4px;}
    .rec-shortlist{background:#dcfce7;color:#15803d;}
    .rec-maybe{background:#fef9c3;color:#854d0e;}
    .rec-pass{background:#fee2e2;color:#dc2626;}
  `],
  template: `
    <div class="container" style="padding-top:40px;padding-bottom:60px;">
      @if (!auth.isRecruiter()) {
        <!-- Auth Gate -->
        <div class="auth-box">
          <div style="font-size:2.5rem;text-align:center;margin-bottom:12px;">🏢</div>
          <h2 style="text-align:center;font-size:1.4rem;font-weight:800;margin-bottom:6px;">Portail Recruteur</h2>
          <p style="text-align:center;color:#64748b;font-size:.9rem;margin-bottom:20px;">Connectez-vous en tant que recruteur pour gérer vos offres.</p>
          <div style="display:flex;gap:6px;margin-bottom:14px;">
            <button class="rtab" [class.active]="authTab()==='login'" (click)="authTab.set('login')">Connexion</button>
            <button class="rtab" [class.active]="authTab()==='register'" (click)="authTab.set('register')">Créer un compte recruteur</button>
          </div>
          @if (authTab() === 'register') {
            <div class="form-group"><label>Nom</label><input [(ngModel)]="regName" placeholder="Jean Dupont"></div>
            <div class="form-group"><label>Entreprise</label><input [(ngModel)]="regCompany" placeholder="Acme Corp"></div>
          }
          <div class="form-group"><label>Email</label><input type="email" [(ngModel)]="loginEmail" placeholder="recruteur@exemple.com"></div>
          <div class="form-group"><label>Mot de passe</label><input type="password" [(ngModel)]="loginPwd" placeholder="••••••••"></div>
          @if (authError()) { <p style="color:#ef4444;font-size:12px;margin-top:8px;">{{ authError() }}</p> }
          <button class="btn btn-primary" style="width:100%;margin-top:14px;background:#7c3aed;border-color:#7c3aed;" (click)="doAuth()">
            {{ authTab() === 'login' ? 'Se connecter' : 'Créer le compte recruteur' }}
          </button>
        </div>
      } @else {
        <!-- Dashboard -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
          <div>
            <h1 style="font-size:1.8rem;font-weight:800;margin:0;"><i class="fas fa-building" style="color:#7c3aed;"></i> Portail Recruteur</h1>
            <p style="color:#64748b;margin:4px 0 0;">{{ auth.user()?.full_name || auth.user()?.email }}{{ auth.user()?.company ? ' · ' + auth.user()?.company : '' }}</p>
          </div>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 22px;text-align:center;min-width:90px;">
            <div style="font-size:1.6rem;font-weight:800;color:#7c3aed;">{{ posts().length }}</div>
            <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;">Offres</div>
          </div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 22px;text-align:center;min-width:90px;">
            <div style="font-size:1.6rem;font-weight:800;color:#16a34a;">{{ activePosts() }}</div>
            <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;">Actives</div>
          </div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 22px;text-align:center;min-width:90px;">
            <div style="font-size:1.6rem;font-weight:800;color:#ef4444;">{{ posts().length - activePosts() }}</div>
            <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;">Fermées</div>
          </div>
        </div>

        <div class="portal-grid">
          <!-- Publish Form -->
          <div class="side-card">
            <h3 style="font-size:1rem;font-weight:700;margin:0 0 16px;"><i class="fas fa-plus-circle" style="color:#7c3aed;"></i> Publier une Offre</h3>
            <div class="form-group"><label>Titre *</label><input [(ngModel)]="newPost.title" placeholder="Data Scientist..."></div>
            <div class="form-group"><label>Entreprise</label><input [(ngModel)]="newPost.company_name" placeholder="Nom de l'entreprise"></div>
            <div class="form-group"><label>Catégorie</label>
              <select [(ngModel)]="newPost.category">
                <option value="">Sélectionner...</option>
                @for (c of categories; track c) { <option>{{ c }}</option> }
              </select>
            </div>
            <div class="form-group"><label>Localisation</label><input [(ngModel)]="newPost.location" placeholder="Paris, Remote..."></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div class="form-group"><label>Sal. Min (€)</label><input type="number" [(ngModel)]="newPost.salary_min" placeholder="35000"></div>
              <div class="form-group"><label>Sal. Max (€)</label><input type="number" [(ngModel)]="newPost.salary_max" placeholder="55000"></div>
            </div>
            <div class="form-group"><label>Compétences</label><input [(ngModel)]="newPost.required_skills" placeholder="Python, SQL..."></div>
            <div class="form-group"><label>Description</label><textarea [(ngModel)]="newPost.description" placeholder="Missions, profil..." style="min-height:80px;resize:vertical;"></textarea></div>
            @if (postError()) { <p style="color:#ef4444;font-size:12px;margin-top:8px;">{{ postError() }}</p> }
            <button class="btn btn-primary" style="width:100%;margin-top:12px;background:#7c3aed;" (click)="publishPost()" [disabled]="publishing()">
              @if (publishing()) { <i class="fas fa-spinner fa-spin"></i> } @else { <i class="fas fa-paper-plane"></i> }
              Publier l'offre
            </button>
          </div>

          <!-- Posts List -->
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <h2 style="font-size:1.1rem;font-weight:700;margin:0;">Mes Offres Publiées</h2>
              <button (click)="loadPosts()" style="background:none;border:none;color:#0ea5e9;font-size:13px;font-weight:600;cursor:pointer;">
                <i class="fas fa-sync-alt"></i> Actualiser
              </button>
            </div>
            @if (loadingPosts()) {
              <div style="text-align:center;padding:40px;color:#94a3b8;"><i class="fas fa-circle-notch fa-spin"></i></div>
            } @else if (!posts().length) {
              <div style="text-align:center;padding:48px;color:#94a3b8;">
                <i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:12px;"></i>
                Aucune offre. Utilisez le formulaire à gauche.
              </div>
            } @else {
              @for (p of posts(); track p.id) {
                <div class="post-card">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                    <div>
                      <h3 style="font-size:1rem;font-weight:700;margin:0 0 4px;">{{ p.title }}</h3>
                      <div style="font-size:.85rem;color:#64748b;">
                        @if (p.company_name) { <i class="fas fa-building"></i> {{ p.company_name }} }
                        @if (p.location) { · <i class="fas fa-map-marker-alt"></i> {{ p.location }} }
                      </div>
                    </div>
                    <span class="badge" [class]="p.is_active ? 'badge-active' : 'badge-closed'">
                      {{ p.is_active ? '● Active' : '✕ Fermée' }}
                    </span>
                  </div>
                  <div style="font-size:.8rem;color:#94a3b8;margin-top:8px;display:flex;gap:14px;flex-wrap:wrap;">
                    @if (p.salary_min || p.salary_max) {
                      <span><i class="fas fa-euro-sign"></i> {{ formatSalaryRange(p) }}</span>
                    }
                    @if (p.required_skills) {
                      <span><i class="fas fa-code"></i> {{ p.required_skills.split(',').slice(0,3).join(', ') }}</span>
                    }
                    <span><i class="fas fa-calendar"></i> {{ formatDate(p.created_at) }}</span>
                  </div>
                  <div class="post-actions">
                    <button class="btn-view-apps" (click)="viewApplicants(p)">
                      <i class="fas fa-users"></i> Candidatures
                      @if (p.applications_count) {
                        <span class="apps-count">{{ p.applications_count }}</span>
                      }
                    </button>
                    <button class="btn-toggle" (click)="togglePost(p)">
                      <i class="fas fa-toggle-{{ p.is_active ? 'on' : 'off' }}"></i>
                      {{ p.is_active ? 'Fermer' : 'Rouvrir' }}
                    </button>
                    <button class="btn-del" (click)="deletePost(p)"><i class="fas fa-trash"></i></button>
                  </div>
                </div>
              }
            }
          </div>
        </div>
      }
    </div>

    <!-- Applicants Modal -->
    @if (showAppsModal()) {
      <div class="modal-overlay" (click)="onOverlayClick($event)">
        <div class="modal-box">
          <button style="position:absolute;top:14px;right:18px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:#94a3b8;" (click)="showAppsModal.set(false)"><i class="fas fa-times"></i></button>
          <h3 style="margin:0 0 4px;font-size:1.1rem;font-weight:700;">Candidatures — {{ selectedPost()?.title }}</h3>
          <p style="color:#64748b;font-size:.88rem;margin-bottom:16px;">{{ applicants().length }} candidature(s)</p>
          @if (loadingApps()) {
            <div style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin"></i></div>
          } @else if (!applicants().length) {
            <div style="text-align:center;color:#94a3b8;padding:24px;">Aucune candidature pour le moment.</div>
          } @else {
            @for (app of applicants(); track $index) {
              <div class="app-card">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                  <div>
                    <strong style="font-size:.95rem;">{{ getApplicantName(app) }}</strong><br>
                    <span style="font-size:.82rem;color:#94a3b8;">{{ getApplicantEmail(app) }}</span>
                  </div>
                  <span class="status-badge status-{{ getAppStatus(app) }}">{{ statusLabel(getAppStatus(app)) }}</span>
                </div>
                @if (getCv(app)) {
                  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;font-size:.82rem;color:#64748b;">
                    @if (getCv(app)?.job_role) { <span><i class="fas fa-user-tie"></i> {{ getCv(app)!.job_role }}</span> }
                    @if (getCv(app)?.experience_years !== undefined) { <span><i class="fas fa-clock"></i> {{ getCv(app)!.experience_years }} ans</span> }
                    @if (getCv(app)?.predicted_salary) { <span><i class="fas fa-dollar-sign"></i> {{ formatSalary(+(getCv(app)!['predicted_salary']!)) }}</span> }
                    @if (getCv(app)?.hire_probability !== null && getCv(app)?.hire_probability !== undefined) {
                      <span><i class="fas fa-chart-line"></i> {{ (getCv(app)!.hire_probability! * 100).toFixed(0) }}% embauche</span>
                    }
                  </div>
                  @if (getCv(app)?.hire_probability !== undefined && getCv(app)?.hire_probability !== null) {
                    <div class="hire-bar"><div class="hire-fill" [style.width.%]="(getCv(app)!.hire_probability!)*100"></div></div>
                  }
                }
                <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
                  <button style="background:#f1f5f9;color:#334155;border:none;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;"
                    (click)="openDetailModal(app)"><i class="fas fa-search"></i> Analyse IA</button>
                  @if (getAppStatus(app) === 'pending' || getAppStatus(app) === 'reviewed') {
                    <button style="background:#dcfce7;color:#15803d;border:none;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;"
                      (click)="openAcceptModal(app)"><i class="fas fa-check"></i> Accepter</button>
                    <button style="background:#fee2e2;color:#dc2626;border:none;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;"
                      (click)="openRejectModal(app)"><i class="fas fa-times"></i> Refuser</button>
                  }
                </div>
              </div>
            }
          }
        </div>
      </div>
    }

    <!-- AI Detail Modal -->
    @if (showDetailModal()) {
      <div class="modal-overlay" (click)="showDetailModal.set(false)">
        <div class="modal-box" style="max-width:720px;" (click)="$event.stopPropagation()">
          <button style="position:absolute;top:14px;right:18px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:#94a3b8;" (click)="showDetailModal.set(false)"><i class="fas fa-times"></i></button>
          @if (loadingDetail()) {
            <div style="text-align:center;padding:40px;"><i class="fas fa-circle-notch fa-spin" style="font-size:2rem;color:#7c3aed;"></i></div>
          } @else if (appDetail()) {
            <div>
              <!-- Header -->
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:8px;">
                <div>
                  <h3 style="margin:0 0 4px;font-size:1.2rem;font-weight:800;">{{ appDetail()!.candidate_name || appDetail()!.candidate_email }}</h3>
                  <div style="font-size:.85rem;color:#64748b;">{{ appDetail()!.candidate_email }}</div>
                </div>
                <span class="status-badge status-{{ appDetail()!.status }}">{{ statusLabel(appDetail()!.status) }}</span>
              </div>

              <!-- AI Match Score -->
              @if (appDetail()!.match_score !== null && appDetail()!.match_score !== undefined) {
                <div style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border-radius:16px;padding:16px 20px;margin-bottom:16px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="font-weight:700;font-size:.9rem;color:#4c1d95;"><i class="fas fa-robot"></i> Score de correspondance IA</span>
                    <span style="font-size:1.6rem;font-weight:900;" [style.color]="scoreColor(appDetail()!.match_score!)">{{ appDetail()!.match_score }}%</span>
                  </div>
                  <div style="height:8px;background:#ddd6fe;border-radius:999px;overflow:hidden;">
                    <div style="height:100%;border-radius:999px;transition:width 1s;" [style.background]="scoreGradient(appDetail()!.match_score!)" [style.width.%]="appDetail()!.match_score!"></div>
                  </div>
                  @if (appDetail()!.ai_recommendation) {
                    <div style="margin-top:8px;font-size:.8rem;font-weight:700;" [class]="'rec-badge rec-' + appDetail()!.ai_recommendation!.toLowerCase()">
                      Recommandation IA&nbsp;: {{ appDetail()!.ai_recommendation }}
                    </div>
                  }
                </div>
              }

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                <!-- Candidate Profile -->
                <div style="background:#f8fafc;border-radius:12px;padding:14px;">
                  <h4 style="margin:0 0 10px;font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;">Profil candidat</h4>
                  @if (appDetail()!.cv_experience_years !== null) {
                    <div style="font-size:.85rem;color:#334155;margin-bottom:4px;"><i class="fas fa-clock" style="color:#7c3aed;width:16px;"></i> {{ appDetail()!.cv_experience_years }} ans exp. — {{ appDetail()!.experience_level }}</div>
                  }
                  @if (appDetail()!.cv_education) {
                    <div style="font-size:.85rem;color:#334155;margin-bottom:4px;"><i class="fas fa-graduation-cap" style="color:#7c3aed;width:16px;"></i> {{ appDetail()!.cv_education }}</div>
                  }
                  @if (appDetail()!.cv_projects_count) {
                    <div style="font-size:.85rem;color:#334155;margin-bottom:4px;"><i class="fas fa-code-branch" style="color:#7c3aed;width:16px;"></i> {{ appDetail()!.cv_projects_count }} projets</div>
                  }
                  @if (appDetail()!.hire_probability !== null && appDetail()!.hire_probability !== undefined) {
                    <div style="font-size:.85rem;color:#334155;margin-bottom:4px;"><i class="fas fa-percentage" style="color:#7c3aed;width:16px;"></i> {{ (appDetail()!.hire_probability! * 100).toFixed(0) }}% prob. embauche</div>
                  }
                  @if (appDetail()!.predicted_salary) {
                    <div style="font-size:.85rem;color:#334155;"><i class="fas fa-dollar-sign" style="color:#16a34a;width:16px;"></i> {{ formatSalary(appDetail()!.predicted_salary!) }}/yr</div>
                  }
                </div>

                <!-- Skills Analysis -->
                <div style="background:#f8fafc;border-radius:12px;padding:14px;">
                  <h4 style="margin:0 0 10px;font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;">Compétences</h4>
                  @if (appDetail()!.matched_skills?.length) {
                    <div style="margin-bottom:6px;">
                      <div style="font-size:.75rem;color:#15803d;font-weight:700;margin-bottom:4px;">✅ Maîtrisées</div>
                      <div style="display:flex;flex-wrap:wrap;gap:4px;">
                        @for (s of appDetail()!.matched_skills!.slice(0,6); track s) {
                          <span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:600;">{{ s }}</span>
                        }
                      </div>
                    </div>
                  }
                  @if (appDetail()!.missing_skills?.length) {
                    <div>
                      <div style="font-size:.75rem;color:#dc2626;font-weight:700;margin-bottom:4px;">❌ Manquantes</div>
                      <div style="display:flex;flex-wrap:wrap;gap:4px;">
                        @for (s of appDetail()!.missing_skills!.slice(0,6); track s) {
                          <span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:600;">{{ s }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Strengths & Red Flags -->
              @if (appDetail()!.strengths?.length || appDetail()!.red_flags?.length) {
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                  @if (appDetail()!.strengths?.length) {
                    <div style="background:#f0fdf4;border-radius:12px;padding:14px;border:1px solid #bbf7d0;">
                      <h4 style="margin:0 0 8px;font-size:.82rem;font-weight:700;color:#15803d;"><i class="fas fa-star"></i> Points forts</h4>
                      @for (s of appDetail()!.strengths!; track s) {
                        <div style="font-size:.82rem;color:#166534;margin-bottom:4px;"><i class="fas fa-check" style="margin-right:6px;"></i>{{ s }}</div>
                      }
                    </div>
                  }
                  @if (appDetail()!.red_flags?.length) {
                    <div style="background:#fff7ed;border-radius:12px;padding:14px;border:1px solid #fed7aa;">
                      <h4 style="margin:0 0 8px;font-size:.82rem;font-weight:700;color:#c2410c;"><i class="fas fa-exclamation-triangle"></i> Points d'attention</h4>
                      @for (f of appDetail()!.red_flags!; track f) {
                        <div style="font-size:.82rem;color:#9a3412;margin-bottom:4px;"><i class="fas fa-exclamation" style="margin-right:6px;"></i>{{ f }}</div>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Cover Letter -->
              @if (appDetail()!.cover_letter) {
                <div style="background:#f8fafc;border-radius:12px;padding:14px;margin-bottom:16px;">
                  <h4 style="margin:0 0 8px;font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;"><i class="fas fa-envelope"></i> Message de motivation</h4>
                  <p style="font-size:.85rem;color:#334155;line-height:1.6;margin:0;">{{ appDetail()!.cover_letter }}</p>
                </div>
              }

              <!-- Full skills list -->
              @if (appDetail()!.cv_skills?.length) {
                <div style="margin-bottom:16px;">
                  <h4 style="margin:0 0 8px;font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;">Toutes les compétences</h4>
                  <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    @for (s of appDetail()!.cv_skills!; track s) {
                      <span style="background:#e0f2fe;color:#0369a1;padding:3px 10px;border-radius:999px;font-size:.75rem;font-weight:600;">{{ s }}</span>
                    }
                  </div>
                </div>
              }

              <!-- Actions -->
              @if (appDetail()!.status === 'pending' || appDetail()!.status === 'reviewed') {
                <div style="display:flex;gap:10px;margin-top:4px;">
                  <button style="flex:1;background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;border:none;padding:11px;border-radius:12px;font-size:.88rem;font-weight:700;cursor:pointer;"
                    (click)="showDetailModal.set(false); openAcceptModalFromDetail()"><i class="fas fa-check-circle"></i> Accepter ce candidat</button>
                  <button style="flex:1;background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;border:none;padding:11px;border-radius:12px;font-size:.88rem;font-weight:700;cursor:pointer;"
                    (click)="showDetailModal.set(false); openRejectModalFromDetail()"><i class="fas fa-times-circle"></i> Refuser</button>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }

    <!-- Accept Modal -->
    @if (showAcceptModal()) {
      <div class="modal-overlay" (click)="showAcceptModal.set(false)">
        <div class="modal-box" style="max-width:540px;" (click)="$event.stopPropagation()">
          <button style="position:absolute;top:14px;right:18px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:#94a3b8;" (click)="showAcceptModal.set(false)"><i class="fas fa-times"></i></button>
          <h3 style="margin:0 0 4px;font-size:1.1rem;font-weight:800;color:#15803d;"><i class="fas fa-check-circle"></i> Accepter la candidature</h3>
          <p style="color:#64748b;font-size:.88rem;margin-bottom:16px;">Proposez des créneaux d'entretien au candidat.</p>
          <div class="form-group"><label>Type d'entretien</label>
            <select [(ngModel)]="meetingType">
              <option value="">Sélectionner...</option>
              <option value="video">Appel vidéo</option>
              <option value="phone">Appel téléphonique</option>
              <option value="in-person">Entretien en présentiel</option>
            </select>
          </div>
          <div class="form-group"><label>Créneaux proposés (un par ligne)</label>
            <textarea [(ngModel)]="meetingSlotsRaw" placeholder="Ex: Lundi 9 juin à 10h&#10;Mardi 10 juin à 14h30" style="min-height:70px;resize:vertical;"></textarea>
          </div>
          <div class="form-group"><label>Lien visio (si applicable)</label>
            <input [(ngModel)]="meetingLink" placeholder="https://meet.google.com/...">
          </div>
          <div class="form-group"><label>Lieu (si présentiel)</label>
            <input [(ngModel)]="meetingLocation" placeholder="12 rue des Roses, Paris...">
          </div>
          <div class="form-group"><label>Email de contact du recruteur</label>
            <input [(ngModel)]="recruiterContact" placeholder="recruteur@exemple.com">
          </div>
          <div class="form-group"><label>Instructions de préparation</label>
            <textarea [(ngModel)]="preparationNotes" placeholder="Préparez une présentation de 5min sur..." style="min-height:60px;resize:vertical;"></textarea>
          </div>
          <button style="width:100%;background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;border:none;padding:12px;border-radius:12px;font-size:.9rem;font-weight:700;cursor:pointer;margin-top:8px;"
            (click)="confirmAccept()" [disabled]="submitting()">
            @if (submitting()) { <i class="fas fa-spinner fa-spin"></i> } @else { <i class="fas fa-paper-plane"></i> }
            Envoyer la réponse
          </button>
        </div>
      </div>
    }

    <!-- Reject Modal -->
    @if (showRejectModal()) {
      <div class="modal-overlay" (click)="showRejectModal.set(false)">
        <div class="modal-box" style="max-width:480px;" (click)="$event.stopPropagation()">
          <button style="position:absolute;top:14px;right:18px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:#94a3b8;" (click)="showRejectModal.set(false)"><i class="fas fa-times"></i></button>
          <h3 style="margin:0 0 4px;font-size:1.1rem;font-weight:800;color:#dc2626;"><i class="fas fa-times-circle"></i> Refuser la candidature</h3>
          <p style="color:#64748b;font-size:.88rem;margin-bottom:16px;">Un message professionnel sera envoyé au candidat.</p>
          <div class="form-group"><label>Raison du refus (optionnel)</label>
            <textarea [(ngModel)]="rejectionReason" placeholder="Le profil ne correspond pas aux critères actuels..." style="min-height:80px;resize:vertical;"></textarea>
          </div>
          <button style="width:100%;background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;border:none;padding:12px;border-radius:12px;font-size:.9rem;font-weight:700;cursor:pointer;margin-top:8px;"
            (click)="confirmReject()" [disabled]="submitting()">
            @if (submitting()) { <i class="fas fa-spinner fa-spin"></i> } @else { <i class="fas fa-times"></i> }
            Confirmer le refus
          </button>
        </div>
      </div>
    }
  `,
})
export class RecruiterComponent implements OnInit {
  auth    = inject(AuthService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  posts       = signal<RecruiterPost[]>([]);
  loadingPosts = signal(false);
  publishing   = signal(false);
  postError    = signal('');

  applicants    = signal<Record<string, unknown>[]>([]);
  selectedPost  = signal<RecruiterPost | null>(null);
  showAppsModal = signal(false);
  loadingApps   = signal(false);

  // Detail modal
  showDetailModal = signal(false);
  loadingDetail   = signal(false);
  appDetail       = signal<ApplicationFull | null>(null);
  selectedAppId   = signal<number | null>(null);

  // Accept modal
  showAcceptModal = signal(false);
  meetingType = '';
  meetingSlotsRaw = '';
  meetingLink = '';
  meetingLocation = '';
  recruiterContact = '';
  preparationNotes = '';

  // Reject modal
  showRejectModal  = signal(false);
  rejectionReason  = '';

  submitting = signal(false);

  authTab  = signal<'login' | 'register'>('login');
  loginEmail = ''; loginPwd = ''; regName = ''; regCompany = '';
  authError = signal('');

  newPost: RecruiterPostCreate = { title: '', company_name: '', category: '', location: '', required_skills: '', description: '' };

  readonly categories = ['Data Science','Développement Web','DevOps','Marketing Digital','Finance','RH','Commercial','Design','Support Client','Management','Autre'];

  ngOnInit(): void {
    if (!this.auth.isRecruiter()) return;
    if (this.auth.user()?.company) this.newPost.company_name = this.auth.user()!.company!;
    // Subscribe to query params so a notification deep-link works even when we are
    // already on this route (ngOnInit does not re-run on same-route navigation).
    this.route.queryParams.subscribe(params => {
      const openPost = params['openPost'] ? +params['openPost'] : null;
      const openApp = params['openApp'] ? +params['openApp'] : null;
      const deepLink = (openPost || openApp) ? () => this._handleDeepLink(openPost, openApp) : undefined;
      if (this.posts().length) {
        if (deepLink) deepLink();
      } else {
        this.loadPosts(deepLink);
      }
    });
  }

  /** Open the candidates modal for a post referenced by a notification. */
  private _handleDeepLink(openPost: number | null, openApp: number | null): void {
    if (openPost) {
      const post = this.posts().find(p => p.id === openPost);
      if (post) this.viewApplicants(post);
      this._clearDeepLinkParams();
    } else if (openApp) {
      // Fallback for older notifications without job_post_id: resolve the post via the application
      this.api.getApplicationDetail(openApp).subscribe({
        next: d => {
          const post = this.posts().find(p => p.id === d.job_post_id);
          if (post) this.viewApplicants(post);
          this._clearDeepLinkParams();
        },
        error: () => this._clearDeepLinkParams(),
      });
    }
  }

  private _clearDeepLinkParams(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  get activePosts(): () => number { return () => this.posts().filter(p => p.is_active).length; }

  loadPosts(after?: () => void): void {
    this.loadingPosts.set(true);
    this.api.myPosts().subscribe({
      next: p => { this.posts.set(p); this.loadingPosts.set(false); if (after) after(); },
      error: () => this.loadingPosts.set(false),
    });
  }

  publishPost(): void {
    if (!this.newPost.title) { this.postError.set('Titre obligatoire'); return; }
    this.publishing.set(true); this.postError.set('');
    this.api.createPost(this.newPost).subscribe({
      next: () => { this.publishing.set(false); this.toast.show('✅ Offre publiée !', 'success'); this.loadPosts(); this.newPost = { title:'', company_name:'', category:'', location:'', required_skills:'', description:'' }; },
      error: (e: { error?: { detail?: string } }) => { this.publishing.set(false); this.postError.set(e.error?.detail ?? 'Erreur'); },
    });
  }

  togglePost(post: RecruiterPost): void {
    this.api.togglePost(post.id).subscribe({
      next: r => { this.toast.show(r.is_active ? '✅ Offre réouverte' : '🔒 Offre fermée', 'info'); this.loadPosts(); },
      error: () => this.toast.show('❌ Erreur', 'error'),
    });
  }

  deletePost(post: RecruiterPost): void {
    if (!confirm('Supprimer cette offre ?')) return;
    this.api.deletePost(post.id).subscribe({ next: () => { this.toast.show('🗑️ Offre supprimée', 'info'); this.loadPosts(); }, error: () => this.toast.show('❌ Erreur', 'error') });
  }

  viewApplicants(post: RecruiterPost): void {
    this.selectedPost.set(post); this.applicants.set([]); this.loadingApps.set(true); this.showAppsModal.set(true);
    this.api.postCandidates(post.id).subscribe({ next: a => { this.applicants.set(a as Record<string, unknown>[]); this.loadingApps.set(false); }, error: () => this.loadingApps.set(false) });
  }

  openDetailModal(app: Record<string, unknown>): void {
    const appId = app['application_id'] as number;
    this.selectedAppId.set(appId);
    this.appDetail.set(null);
    this.showDetailModal.set(true);
    this.loadingDetail.set(true);
    this.api.getApplicationDetail(appId).subscribe({
      next: d => { this.appDetail.set(d); this.loadingDetail.set(false); },
      error: () => { this.loadingDetail.set(false); this.toast.show('❌ Impossible de charger les détails', 'error'); },
    });
  }

  openAcceptModal(app: Record<string, unknown>): void {
    this.selectedAppId.set(app['application_id'] as number);
    this._resetAcceptForm();
    this.showAcceptModal.set(true);
  }

  openAcceptModalFromDetail(): void {
    this._resetAcceptForm();
    this.showAcceptModal.set(true);
  }

  openRejectModal(app: Record<string, unknown>): void {
    this.selectedAppId.set(app['application_id'] as number);
    this.rejectionReason = '';
    this.showRejectModal.set(true);
  }

  openRejectModalFromDetail(): void {
    this.rejectionReason = '';
    this.showRejectModal.set(true);
  }

  private _resetAcceptForm(): void {
    this.meetingType = ''; this.meetingSlotsRaw = ''; this.meetingLink = '';
    this.meetingLocation = ''; this.recruiterContact = ''; this.preparationNotes = '';
  }

  confirmAccept(): void {
    const appId = this.selectedAppId();
    if (!appId) return;
    this.submitting.set(true);
    const slots = this.meetingSlotsRaw.split('\n').map(s => s.trim()).filter(Boolean);
    this.api.updateApplicationStatus(appId, {
      status: 'accepted',
      meeting_type: this.meetingType || undefined,
      meeting_slots: slots,
      meeting_link: this.meetingLink || undefined,
      meeting_location: this.meetingLocation || undefined,
      recruiter_contact: this.recruiterContact || undefined,
      preparation_notes: this.preparationNotes || undefined,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showAcceptModal.set(false);
        this.toast.show('✅ Candidature acceptée ! Le candidat a été notifié.', 'success');
        const post = this.selectedPost();
        if (post) this.api.postCandidates(post.id).subscribe({ next: a => this.applicants.set(a as Record<string, unknown>[]) });
      },
      error: (e: { error?: { detail?: string } }) => { this.submitting.set(false); this.toast.show('❌ ' + (e.error?.detail ?? 'Erreur'), 'error'); },
    });
  }

  confirmReject(): void {
    const appId = this.selectedAppId();
    if (!appId) return;
    this.submitting.set(true);
    this.api.updateApplicationStatus(appId, {
      status: 'rejected',
      rejection_reason: this.rejectionReason || undefined,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showRejectModal.set(false);
        this.toast.show('Candidature refusée. Le candidat a été notifié.', 'info');
        const post = this.selectedPost();
        if (post) this.api.postCandidates(post.id).subscribe({ next: a => this.applicants.set(a as Record<string, unknown>[]) });
      },
      error: (e: { error?: { detail?: string } }) => { this.submitting.set(false); this.toast.show('❌ ' + (e.error?.detail ?? 'Erreur'), 'error'); },
    });
  }

  scoreColor(score: number): string { return score >= 70 ? '#16a34a' : score >= 45 ? '#f59e0b' : '#dc2626'; }
  scoreGradient(score: number): string { return score >= 70 ? 'linear-gradient(90deg,#16a34a,#22c55e)' : score >= 45 ? 'linear-gradient(90deg,#d97706,#f59e0b)' : 'linear-gradient(90deg,#dc2626,#ef4444)'; }

  doAuth(): void {
    this.authError.set('');
    const obs = this.authTab() === 'login'
      ? this.auth.login(this.loginEmail, this.loginPwd)
      : this.auth.register(this.loginEmail, this.loginPwd, this.regName, 'recruiter', this.regCompany);
    obs.subscribe({
      next: (d) => {
        if (d.user.role !== 'recruiter' && d.user.role !== 'admin') { this.authError.set("Ce compte n'est pas recruteur."); this.auth.logout(); return; }
        this.loadPosts();
        if (this.auth.user()?.company) this.newPost.company_name = this.auth.user()!.company!;
        this.toast.show('✅ Connecté !', 'success');
      },
      error: (e: { error?: { detail?: string } }) => this.authError.set(e.error?.detail ?? 'Erreur'),
    });
  }

  onOverlayClick(e: MouseEvent): void { if ((e.target as HTMLElement).classList.contains('modal-overlay')) this.showAppsModal.set(false); }

  getApplicantName(app: Record<string, unknown>): string { return ((app['applicant'] as Record<string, string>)?.['name']) ?? 'Candidat'; }
  getApplicantEmail(app: Record<string, unknown>): string { return ((app['applicant'] as Record<string, string>)?.['email']) ?? '?'; }
  getAppStatus(app: Record<string, unknown>): string { return app['status'] as string; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCv(app: Record<string, unknown>): any { return app['cv']; }
  statusLabel(s: string): string { const m: Record<string,string> = {pending:'En attente',reviewed:'Examiné',accepted:'Accepté ✅',rejected:'Refusé ❌'}; return m[s] ?? s; }
  formatDate(d: string): string { return new Date(d).toLocaleDateString('fr-FR'); }
  formatSalary(n: number): string { return Math.round(n).toLocaleString(); }
  formatSalaryRange(p: RecruiterPost): string {
    const min = p.salary_min ? '€'+Math.round(p.salary_min/1000)+'k' : '';
    const max = p.salary_max ? '€'+Math.round(p.salary_max/1000)+'k' : '';
    return [min, max].filter(Boolean).join(' — ');
  }
}
