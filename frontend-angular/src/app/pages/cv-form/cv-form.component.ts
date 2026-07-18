import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { CandidateOut, JobRecommendation } from '../../core/models';

@Component({
  selector: 'app-cv-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  styles: [`
    /* Tabs */
    .tabs{display:flex;gap:10px;margin-bottom:28px;}
    .tab-btn{padding:12px 24px;border-radius:14px;border:1.5px solid #e2e8f0;background:#fff;font-weight:700;font-size:.88rem;cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);color:#64748b;display:inline-flex;align-items:center;gap:8px;}
    .tab-btn:hover{border-color:#bae6fd;color:#0ea5e9;transform:translateY(-1px);}
    .tab-btn.active{border-color:transparent;color:#fff;background:linear-gradient(135deg,#0ea5e9,#38bdf8);box-shadow:0 8px 22px rgba(14,165,233,.32);}
    /* Form card */
    .form-card{background:linear-gradient(180deg,#ffffff,#f7fbff);border:1px solid rgba(226,232,240,.85);border-radius:24px;padding:36px;box-shadow:0 14px 44px rgba(15,23,42,.07);}
    .form-card h3{margin:0 0 24px;font-size:1.1rem;font-weight:800;color:#0f172a;}
    /* Grid */
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
    @media(max-width:640px){.form-grid{grid-template-columns:1fr}}
    .full{grid-column:1/-1;}
    /* Inputs */
    .form-group label{display:block;font-size:.76rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:7px;}
    .form-group input,.form-group select,.form-group textarea{width:100%;padding:13px 16px;border:1.5px solid #e6ecf3;border-radius:14px;font-size:.95rem;font-family:inherit;outline:none;box-sizing:border-box;transition:all .25s;background:#fbfdff;box-shadow:inset 0 1px 2px rgba(15,23,42,.03);}
    .form-group input:hover,.form-group select:hover,.form-group textarea:hover{border-color:#cdd9e8;}
    .form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:#0ea5e9;background:#fff;box-shadow:0 0 0 4px rgba(14,165,233,.13),0 6px 18px rgba(14,165,233,.08);}
    /* Tag input */
    .tag-input-wrap{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:9px 12px;border:1.5px solid #e6ecf3;border-radius:14px;background:#fbfdff;min-height:50px;cursor:text;box-sizing:border-box;transition:all .25s;width:100%;box-shadow:inset 0 1px 2px rgba(15,23,42,.03);}
    .tag-input-wrap:focus-within{border-color:#0ea5e9;background:#fff;box-shadow:0 0 0 4px rgba(14,165,233,.13);}
    .skill-chip{display:inline-flex;align-items:center;gap:5px;background:linear-gradient(135deg,#0ea5e9,#38bdf8);color:#fff;border-radius:999px;padding:5px 13px;font-size:.76rem;font-weight:700;white-space:nowrap;box-shadow:0 3px 10px rgba(14,165,233,.28);}
    .skill-chip button{background:none;border:none;cursor:pointer;color:#fff;padding:0;font-size:.9rem;line-height:1;margin-left:2px;opacity:.75;}
    .skill-chip button:hover{opacity:1;}
    .tag-inner-input{border:none;outline:none;font-size:.9rem;font-family:inherit;min-width:80px;padding:2px 0;background:transparent;flex:1;}
    /* Upload zone */
    .upload-zone{border:2px dashed #93d5fb;border-radius:20px;padding:48px 32px;text-align:center;cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);background:linear-gradient(180deg,#f0f9ff,#eef6ff);}
    .upload-zone:hover,.upload-zone.drag{border-color:#0ea5e9;background:linear-gradient(180deg,#e0f2fe,#dbeafe);transform:scale(1.012);box-shadow:0 12px 32px rgba(14,165,233,.12);}
    /* Result */
    .result-card{background:linear-gradient(145deg,#f0f9ff,#f5f3ff 55%,#fdf2f8);border:1.5px solid #c7e6fb;border-radius:24px;padding:32px;margin-top:24px;box-shadow:0 16px 44px rgba(56,189,248,.12);}
    .prob-bar{height:8px;border-radius:999px;background:#e2e8f0;margin-top:8px;overflow:hidden;}
    .prob-fill{height:100%;border-radius:999px;transition:width 1s cubic-bezier(.4,0,.2,1);}
    .rec-card{background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:18px;transition:all .3s;}
    .rec-card:hover{box-shadow:0 8px 24px rgba(0,0,0,.08);transform:translateY(-3px);border-color:rgba(56,189,248,.3);}
    /* btn-outline */
    .btn-outline{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;border:1.5px solid #e2e8f0;background:transparent;font-weight:600;font-size:.9rem;color:#64748b;cursor:pointer;transition:all .25s;}
    .btn-outline:hover{border-color:#0ea5e9;color:#0ea5e9;background:#f0f9ff;}

    /* Page hero */
    .cv-hero{position:relative;margin-bottom:30px;}
    .cv-eyebrow{display:inline-flex;align-items:center;gap:9px;background:linear-gradient(135deg,rgba(56,189,248,.12),rgba(168,85,247,.1));border:1px solid rgba(56,189,248,.2);color:#0369a1;font-size:.74rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;padding:6px 16px;border-radius:999px;margin-bottom:18px;}
    .cv-eyebrow .dot{width:7px;height:7px;border-radius:50%;background:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.25);animation:cv-pulse 2s ease-in-out infinite;}
    @keyframes cv-pulse{0%,100%{box-shadow:0 0 0 3px rgba(14,165,233,.25);}50%{box-shadow:0 0 0 7px rgba(14,165,233,0);}}
    .cv-title{font-family:'Poppins',sans-serif;font-size:clamp(1.9rem,4vw,2.7rem);font-weight:900;letter-spacing:-.03em;line-height:1.12;margin:0 0 14px;color:#0f172a;}
    .cv-lead{color:#64748b;font-size:1.05rem;line-height:1.7;max-width:640px;margin:0 0 22px;}
    .cv-trust{display:flex;gap:10px;flex-wrap:wrap;}
    .cv-trust span{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid #e6ecf3;border-radius:999px;padding:6px 15px 6px 7px;font-size:.8rem;font-weight:700;color:#334155;box-shadow:0 2px 10px rgba(15,23,42,.04);}
    .cv-trust span img{width:24px;height:24px;}

    /* Range slider */
    .range-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;}
    .slider-val{font-family:'Poppins',sans-serif;font-weight:800;font-size:.92rem;color:#0ea5e9;background:rgba(14,165,233,.1);padding:2px 12px;border-radius:999px;}
    .range-slider{-webkit-appearance:none;appearance:none;width:100%;height:8px;border-radius:999px;outline:none;background:linear-gradient(90deg,#0ea5e9,#38bdf8) 0/var(--val,50%) no-repeat,#e6ecf3;cursor:pointer;margin-top:4px;}
    .range-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;border-radius:50%;background:#fff;border:3px solid #0ea5e9;box-shadow:0 3px 10px rgba(14,165,233,.4);cursor:pointer;transition:transform .15s;}
    .range-slider::-webkit-slider-thumb:hover{transform:scale(1.15);}
    .range-slider::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:#fff;border:3px solid #0ea5e9;box-shadow:0 3px 10px rgba(14,165,233,.4);cursor:pointer;}

    /* Result metrics */
    .res-grid{display:grid;grid-template-columns:1.05fr 1fr 1fr;gap:16px;margin-bottom:22px;}
    @media(max-width:680px){.res-grid{grid-template-columns:1fr;}}
    .res-card{background:#fff;border:1px solid #e8edf5;border-radius:18px;padding:22px;box-shadow:0 6px 20px rgba(15,23,42,.05);display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;transition:all .3s;}
    .res-card:hover{transform:translateY(-4px);box-shadow:0 16px 36px rgba(15,23,42,.1);}
    .res-card .res-lbl{font-size:.72rem;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.05em;}
    .res-logo{width:46px;height:46px;filter:drop-shadow(0 8px 14px rgba(15,23,42,.14));margin-bottom:2px;}
    .res-big{font-family:'Poppins',sans-serif;font-weight:900;font-size:1.6rem;line-height:1.1;}
    .res-sub{font-size:.74rem;color:#94a3b8;}

    /* Gauge */
    .gauge{position:relative;width:128px;height:128px;}
    .gauge svg{transform:rotate(-90deg);width:128px;height:128px;}
    .gauge-bg{fill:none;stroke:#eef2f7;stroke-width:11;}
    .gauge-fg{fill:none;stroke-width:11;stroke-linecap:round;transition:stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1),stroke .4s;}
    .gauge-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
    .gauge-val{font-family:'Poppins',sans-serif;font-weight:900;font-size:2rem;line-height:1;}
    .gauge-val small{font-size:1rem;}
    .gauge-lbl{font-size:.66rem;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-top:2px;}

    /* Job rec cards */
    .rec-rank{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#0ea5e9,#38bdf8);color:#fff;font-weight:800;font-size:.82rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px rgba(14,165,233,.3);}
    .match-pill{display:inline-flex;align-items:center;gap:6px;font-size:.74rem;font-weight:800;padding:3px 11px;border-radius:999px;background:linear-gradient(135deg,rgba(124,58,237,.12),rgba(168,85,247,.08));color:#7c3aed;}
  `],
  template: `
    <div class="container" style="padding-top:40px;max-width:900px;">
      <div class="cv-hero">
        <div class="cv-eyebrow"><span class="dot"></span> Analyse IA · 100%</div>
        <h1 class="cv-title">Analysez votre <span class="gradient-text">CV</span><br>et révélez votre potentiel</h1>
        <p class="cv-lead">Probabilité d'embauche, salaire estimé, cluster de profil et top offres recommandées — calculés en quelques secondes par nos modèles Machine Learning.</p>
        <div class="cv-trust">
          <span><img src="assets/icons/percent.svg" alt=""> 95% de précision</span>
          <span><img src="assets/icons/lightning.svg" alt=""> Résultats en 3 sec</span>
          <span><img src="assets/icons/layers.svg" alt=""> 5 modèles ML</span>
        </div>
      </div>

      <div class="tabs">
        <button class="tab-btn" [class.active]="tab()==='form'" (click)="tab.set('form')">
          <i class="fas fa-edit"></i> Formulaire
        </button>
        <button class="tab-btn" [class.active]="tab()==='pdf'" (click)="tab.set('pdf')">
          <i class="fas fa-file-pdf"></i> Upload PDF
        </button>
      </div>

      <!-- Form Tab -->
      @if (tab() === 'form') {
        <div class="form-card">
          <h3 style="margin:0 0 20px;font-size:1.05rem;font-weight:700;">Informations du candidat</h3>
          <div class="form-grid">
            <div class="form-group"><label>Nom complet *</label>
              <input [(ngModel)]="form.full_name" placeholder="Jean Dupont" /></div>
            <div class="form-group"><label>Email *</label>
              <input type="email" [(ngModel)]="form.email" placeholder="jean@exemple.com" /></div>
            <div class="form-group"><label>Téléphone</label>
              <input [(ngModel)]="form.phone" placeholder="+33 6 00 00 00 00" /></div>
            <div class="form-group"><label>Niveau d'études *</label>
              <select [(ngModel)]="form.education">
                <option value="">Sélectionner...</option>
                @for (e of educationOptions; track e) { <option [value]="e">{{ e }}</option> }
              </select></div>
            <div class="form-group"><label>Rôle visé *</label>
              <input [(ngModel)]="form.job_role" placeholder="Data Scientist, Développeur..." /></div>
            <div class="form-group"><label>Années d'expérience *</label>
              <input type="number" [(ngModel)]="form.experience_years" min="0" max="40" /></div>
            <div class="form-group"><label>Nombre de projets</label>
              <input type="number" [(ngModel)]="form.projects_count" min="0" /></div>
            <div class="form-group full">
              <div class="range-row">
                <label style="margin:0;">Score IA <small style="font-weight:400;text-transform:none;color:#94a3b8;">(auto-évaluation)</small></label>
                <span class="slider-val">{{ form.ai_score }} / 100</span>
              </div>
              <input type="range" min="0" max="100" [(ngModel)]="form.ai_score" class="range-slider" [style.--val]="form.ai_score + '%'" /></div>
            <div class="form-group full"><label>Compétences <small style="font-weight:400;text-transform:none;color:#94a3b8;">(tapez puis Entrée)</small></label>
              <div class="tag-input-wrap" (click)="cvSkillInput.focus()">
                @for (tag of cvSkillTags; track tag) {
                  <span class="skill-chip">{{ tag }}<button type="button" (click)="removeCvSkill(tag)">×</button></span>
                }
                <input #cvSkillInput class="tag-inner-input" [(ngModel)]="cvSkillInputVal"
                  placeholder="{{ cvSkillTags.length ? '' : 'Python, SQL, React...' }}"
                  (keydown.enter)="addCvSkill($event)"
                  (keydown.backspace)="onCvSkillBackspace()">
              </div>
            </div>
            <div class="form-group full"><label>Certifications</label>
              <input [(ngModel)]="form.certifications" placeholder="AWS Certified, PMP..." /></div>
          </div>
          @if (formError()) { <p style="color:#ef4444;font-size:13px;margin-top:12px;">{{ formError() }}</p> }
          <button class="btn btn-primary" style="margin-top:20px;min-width:180px;" (click)="submitForm()" [disabled]="submitting()">
            @if (submitting()) { <i class="fas fa-circle-notch fa-spin"></i> Analyse en cours... }
            @else { <i class="fas fa-rocket"></i> Analyser le CV }
          </button>
        </div>
      }

      <!-- PDF Tab -->
      @if (tab() === 'pdf') {
        <div class="form-card">
          <h3 style="margin:0 0 16px;font-size:1.05rem;font-weight:700;">Upload votre CV PDF</h3>
          <div class="upload-zone" [class.drag]="dragging()"
            (dragover)="$event.preventDefault(); dragging.set(true)"
            (dragleave)="dragging.set(false)"
            (drop)="onDrop($event)"
            (click)="fileInput.click()">
            <input #fileInput type="file" accept=".pdf" style="display:none" (change)="onFileSelected($event)">
            @if (pdfFile()) {
              <div><img src="assets/icons/pdf.svg" alt="" width="58" height="58" style="margin:0 auto 10px;filter:drop-shadow(0 8px 14px rgba(245,158,11,.28));">
                <strong>{{ pdfFile()!.name }}</strong><br>
                <span style="font-size:.82rem;color:#64748b;">{{ (pdfFile()!.size / 1024).toFixed(0) }} KB</span>
              </div>
            } @else {
              <div><img src="assets/icons/cv-upload.svg" alt="" width="62" height="62" style="margin:0 auto 12px;filter:drop-shadow(0 10px 16px rgba(14,165,233,.26));">
                <strong>Glissez votre CV ici</strong> ou cliquez pour sélectionner<br>
                <span style="font-size:.82rem;color:#94a3b8;">PDF uniquement · Max 10 MB</span>
              </div>
            }
          </div>
          @if (pdfError()) { <p style="color:#ef4444;font-size:13px;margin-top:10px;">{{ pdfError() }}</p> }
          @if (pdfFile()) {
            <button class="btn btn-primary" style="margin-top:16px;min-width:180px;" (click)="submitPdf()" [disabled]="submitting()">
              @if (submitting()) { <i class="fas fa-circle-notch fa-spin"></i> Analyse en cours... }
              @else { <i class="fas fa-magic"></i> Analyser le PDF }
            </button>
          }
        </div>
      }

      <!-- Results -->
      @if (result()) {
        <div class="result-card">
          <h2 style="font-size:1.3rem;font-weight:800;margin:0 0 20px;">
            <i class="fas fa-chart-pie" style="color:#0ea5e9;"></i> Résultats de l'Analyse
          </h2>
          <div class="res-grid">
            <!-- Hire probability gauge -->
            <div class="res-card">
              <div class="gauge">
                <svg viewBox="0 0 128 128">
                  <circle class="gauge-bg" cx="64" cy="64" r="56"></circle>
                  <circle class="gauge-fg" cx="64" cy="64" r="56"
                    [style.stroke]="hireProbColor()"
                    [style.stroke-dasharray]="351.86"
                    [style.stroke-dashoffset]="351.86 * (1 - (result()!.hire_probability ?? 0))"></circle>
                </svg>
                <div class="gauge-center">
                  <div class="gauge-val" [style.color]="hireProbColor()">{{ ((result()!.hire_probability??0)*100).toFixed(0) }}<small>%</small></div>
                  <div class="gauge-lbl">Embauche</div>
                </div>
              </div>
              <div class="res-lbl">Probabilité d'embauche</div>
            </div>

            <!-- Predicted salary -->
            <div class="res-card">
              <img class="res-logo" src="assets/icons/salary.svg" alt="">
              <div class="res-lbl">Salaire prédit</div>
              <div class="res-big" style="color:#16a34a;">\${{ formatSalary(result()!.predicted_salary??0) }}</div>
              <div class="res-sub">par an (estimé)</div>
            </div>

            <!-- Cluster -->
            <div class="res-card">
              <img class="res-logo" src="assets/icons/category.svg" alt="">
              <div class="res-lbl">Cluster IA</div>
              <div class="res-big" style="color:#7c3aed;font-size:1.2rem;">{{ clusterName(result()!.candidate_cluster) }}</div>
              <div class="res-sub">Cluster {{ result()!.candidate_cluster ?? '—' }}</div>
            </div>
          </div>
          @if (result()!.recommendation) {
            <div style="background:rgba(14,165,233,.08);border-radius:12px;padding:16px;border-left:4px solid #0ea5e9;margin-bottom:20px;">
              <strong style="font-size:.82rem;color:#0369a1;text-transform:uppercase;">Recommandation IA</strong>
              <p style="margin:6px 0 0;color:#1e293b;font-size:.95rem;">{{ result()!.recommendation }}</p>
            </div>
          }

          <!-- Job Recommendations -->
          @if (jobRecs().length) {
            <h3 style="font-size:1rem;font-weight:700;margin:0 0 14px;">
              <i class="fas fa-star" style="color:#f59e0b;"></i> Top Offres Recommandées
            </h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
              @for (rec of jobRecs(); track rec.rank) {
                <div class="rec-card">
                  <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                    <div class="rec-rank">{{ rec.rank }}</div>
                    <div style="font-weight:700;font-size:.95rem;flex:1;line-height:1.3;">{{ rec.job_title }}</div>
                  </div>
                  <div style="font-size:.82rem;color:#64748b;">
                    <i class="fas fa-building"></i> {{ rec.company }}
                    @if (rec.location) { · <i class="fas fa-map-marker-alt"></i> {{ rec.location }} }
                  </div>
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;flex-wrap:wrap;gap:6px;">
                    @if (rec.salary_avg) {
                      <span style="font-size:.88rem;font-weight:800;color:#16a34a;">\${{ formatSalary(rec.salary_avg) }}/yr</span>
                    } @else { <span></span> }
                    <span class="match-pill"><i class="fas fa-bolt"></i> {{ (rec.similarity_score * 100).toFixed(0) }}% match</span>
                  </div>
                </div>
              }
            </div>
          }
          @if (loadingRecs()) {
            <div style="text-align:center;color:#94a3b8;padding:12px;"><i class="fas fa-spinner fa-spin"></i> Chargement des recommandations...</div>
          }

          <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap;">
            <a routerLink="/offres" class="btn btn-primary"><i class="fas fa-briefcase"></i> Voir les offres</a>
            <a routerLink="/candidat" class="btn btn-outline"><i class="fas fa-user"></i> Mon Espace</a>
            <button class="btn btn-outline" (click)="resetForm()"><i class="fas fa-redo"></i> Nouvelle analyse</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class CvFormComponent {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private toast = inject(ToastService);

  tab = signal<'form' | 'pdf'>('form');

  form = {
    full_name: '', email: '', phone: '', education: '', job_role: '',
    experience_years: 0, projects_count: 0, ai_score: 50, skills: [] as string[], certifications: '',
  };
  skillsText = '';

  // Skills tag input for CV form
  cvSkillTags: string[] = [];
  cvSkillInputVal = '';

  pdfFile  = signal<File | null>(null);
  dragging = signal(false);
  pdfError = signal('');

  submitting = signal(false);
  formError  = signal('');
  result     = signal<CandidateOut | null>(null);
  jobRecs    = signal<JobRecommendation[]>([]);
  loadingRecs = signal(false);

  readonly educationOptions = ['High School', 'Associate', 'Bachelor', 'Master', 'PhD', 'MBA', 'Other'];

  CLUSTER_NAMES: Record<number, string> = {
    0: 'Seniors Confirmés', 1: 'Experts Techniques', 2: 'Juniors Prometteurs', 3: 'Profils Polyvalents',
  };

  clusterName(cluster: number | undefined): string {
    return cluster !== undefined && cluster !== null ? (this.CLUSTER_NAMES[cluster] ?? `Cluster ${cluster}`) : '—';
  }

  hireProbColor(): string {
    const p = (this.result()?.hire_probability ?? 0);
    return p >= 0.7 ? '#16a34a' : p >= 0.5 ? '#f59e0b' : '#ef4444';
  }

  formatSalary(n: number): string { return Math.round(n).toLocaleString(); }

  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) { this.pdfFile.set(file); this.pdfError.set(''); }
  }

  onDrop(e: DragEvent): void {
    e.preventDefault(); this.dragging.set(false);
    const file = e.dataTransfer?.files[0];
    if (file?.type === 'application/pdf') { this.pdfFile.set(file); this.pdfError.set(''); }
    else this.pdfError.set('Veuillez déposer un fichier PDF.');
  }

  submitForm(): void {
    if (!this.form.full_name || !this.form.email || !this.form.education || !this.form.job_role) {
      this.formError.set('Veuillez remplir tous les champs obligatoires (*).');
      return;
    }
    this.form.skills = this.cvSkillTags.length
      ? this.cvSkillTags
      : this.skillsText.split(',').map(s => s.trim()).filter(Boolean);
    this.submitting.set(true); this.formError.set('');
    this.api.createCv(this.form).subscribe({
      next: r => { this.result.set(r); this.submitting.set(false); this.loadRecs(r.id!); this.toast.show('✅ Analyse terminée !', 'success'); },
      error: (e: { error?: { detail?: string } }) => { this.submitting.set(false); this.formError.set(e.error?.detail ?? 'Erreur'); },
    });
  }

  submitPdf(): void {
    const file = this.pdfFile();
    if (!file) return;
    this.submitting.set(true); this.pdfError.set('');
    this.api.uploadCvPdf(file).subscribe({
      next: r => { this.result.set(r); this.submitting.set(false); this.loadRecs(r.id!); this.toast.show('✅ PDF analysé avec succès !', 'success'); },
      error: (e: { error?: { detail?: string } }) => { this.submitting.set(false); this.pdfError.set(e.error?.detail ?? 'Erreur lors de l\'analyse PDF.'); },
    });
  }

  loadRecs(cvId: number): void {
    this.loadingRecs.set(true);
    this.api.getCvRecommendations(cvId).subscribe({
      next: recs => { this.jobRecs.set(recs); this.loadingRecs.set(false); },
      error: () => this.loadingRecs.set(false),
    });
  }

  resetForm(): void {
    this.result.set(null); this.jobRecs.set([]);
    this.pdfFile.set(null); this.submitting.set(false);
  }

  addCvSkill(e: Event): void {
    e.preventDefault();
    const v = this.cvSkillInputVal.trim();
    if (v && !this.cvSkillTags.includes(v)) this.cvSkillTags = [...this.cvSkillTags, v];
    this.cvSkillInputVal = '';
  }

  removeCvSkill(tag: string): void {
    this.cvSkillTags = this.cvSkillTags.filter(t => t !== tag);
  }

  onCvSkillBackspace(): void {
    if (!this.cvSkillInputVal && this.cvSkillTags.length) {
      this.cvSkillTags = this.cvSkillTags.slice(0, -1);
    }
  }
}
