import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-showcase',
  standalone: true,
  imports: [RouterLink],
  styles: [`
    .showcase { padding:0 0 80px; }

    /* Hero */
    .sc-hero {
      background:
        radial-gradient(ellipse at 20% 60%, rgba(56,189,248,.15),transparent 55%),
        radial-gradient(ellipse at 80% 30%, rgba(168,85,247,.15),transparent 55%),
        linear-gradient(135deg,#0a0f1e,#0f172a 60%,#1e293b);
      color:#fff; text-align:center;
      padding:96px 24px 100px;
      position:relative; overflow:hidden;
      margin-bottom:80px;
    }
    .sc-hero::after {
      content:'';
      position:absolute; bottom:0; left:0; right:0; top:0;
      background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.015'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      pointer-events:none;
    }
    .sc-hero-badge {
      display:inline-flex; align-items:center; gap:8px;
      background:rgba(56,189,248,.1); border:1px solid rgba(56,189,248,.22);
      border-radius:999px; padding:6px 18px 6px 12px;
      font-size:0.78rem; font-weight:700; color:#38bdf8;
      letter-spacing:.08em; text-transform:uppercase; margin-bottom:24px;
    }
    .sc-hero h1 {
      font-family:'Poppins',sans-serif;
      font-size:clamp(2.2rem,5vw,3.5rem);
      font-weight:900; letter-spacing:-.04em; margin-bottom:18px; line-height:1.1;
    }
    .sc-hero p {
      font-size:1.1rem; color:#94a3b8; max-width:600px; margin:0 auto; line-height:1.75;
    }
    .sc-hero-stats {
      display:flex; gap:48px; justify-content:center; margin-top:48px; flex-wrap:wrap;
    }
    .sc-stat { text-align:center; }
    .sc-stat-val {
      font-family:'Poppins',sans-serif; font-size:2rem; font-weight:900; display:block;
      background:linear-gradient(135deg,#38bdf8,#c084fc);
      -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;
    }
    .sc-stat-lbl { font-size:.76rem; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:.08em; margin-top:4px; display:block; }

    /* Sections */
    .sc-section { margin-bottom:72px; }
    .sc-section-header { display:flex; align-items:center; gap:14px; margin-bottom:32px; }
    .sc-section-icon {
      width:44px; height:44px; border-radius:14px;
      background:linear-gradient(135deg,rgba(124,58,237,.18),rgba(168,85,247,.08));
      display:flex; align-items:center; justify-content:center;
      font-size:1.2rem; color:#7c3aed; flex-shrink:0;
    }
    .sc-section h2 {
      font-family:'Poppins',sans-serif;
      font-size:1.7rem; font-weight:800; color:#0f172a; letter-spacing:-.03em; margin:0;
    }

    /* Pipeline */
    .pipeline-wrap {
      display:flex; align-items:stretch; gap:0;
      justify-content:center; flex-wrap:wrap; margin:0 0 8px;
    }
    .pipe-step {
      background:linear-gradient(180deg,#ffffff,#f7f5ff);
      border:1.5px solid #e9e5f7;
      border-radius:20px; padding:28px 22px;
      text-align:center; flex:1;
      min-width:140px; max-width:210px;
      position:relative; transition:all .3s cubic-bezier(.4,0,.2,1);
      box-shadow:0 4px 18px rgba(15,23,42,.05);
    }
    .pipe-step:hover {
      border-color:#a78bfa;
      box-shadow:0 16px 36px rgba(124,58,237,.16);
      transform:translateY(-6px);
    }
    .pipe-step-num {
      position:absolute; top:12px; right:14px;
      font-size:.68rem; font-weight:800; color:#c4b5fd; letter-spacing:.06em;
    }
    .pipe-logo {
      width:56px; height:56px; margin:0 auto 14px; display:block;
      filter:drop-shadow(0 9px 15px rgba(15,23,42,.16));
      transition:transform .45s cubic-bezier(0.34,1.56,0.64,1);
    }
    .pipe-step:hover .pipe-logo { transform:translateY(-3px) scale(1.1) rotate(-4deg); }
    .pipe-step h4 { font-size:1rem; font-weight:800; margin:0 0 6px; color:#0f172a; }
    .pipe-step p { font-size:.8rem; color:#64748b; margin:0; line-height:1.5; }
    .pipe-arrow {
      display:flex; align-items:center;
      font-size:1.3rem; color:#7c3aed; padding:0 6px;
      opacity:.5;
    }

    /* Models */
    .model-grid {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
      gap:22px;
    }
    .model-card-sc {
      background:linear-gradient(180deg,#ffffff,#f8fafe);
      border:1.5px solid #e8edf5;
      border-radius:20px; padding:28px;
      transition:all .3s cubic-bezier(.4,0,.2,1);
      box-shadow:0 4px 18px rgba(15,23,42,.05);
      position:relative; overflow:hidden;
    }
    .model-logo {
      width:54px; height:54px; margin-bottom:16px; display:block;
      filter:drop-shadow(0 9px 15px rgba(15,23,42,.15));
      transition:transform .45s cubic-bezier(0.34,1.56,0.64,1);
    }
    .model-card-sc:hover .model-logo { transform:translateY(-3px) scale(1.08) rotate(3deg); }
    .model-card-sc::before {
      content:''; position:absolute; top:0; left:0; right:0; height:3px;
      background:var(--model-color,linear-gradient(90deg,#38bdf8,#0ea5e9));
      transform:scaleX(0); transition:transform .35s;
    }
    .model-card-sc:hover { box-shadow:0 16px 40px rgba(0,0,0,.1); border-color:transparent; transform:translateY(-5px); }
    .model-card-sc:hover::before { transform:scaleX(1); }
    .model-type-badge {
      display:inline-block; padding:3px 12px;
      border-radius:999px; font-size:.7rem; font-weight:800;
      margin-bottom:12px; text-transform:uppercase; letter-spacing:.06em;
    }
    .type-class   { background:#dbeafe; color:#1d4ed8; }
    .type-reg     { background:#dcfce7; color:#15803d; }
    .type-cluster { background:#f3e8ff; color:#7c3aed; }
    .type-nlp     { background:#fef3c7; color:#d97706; }
    .type-rec     { background:#fce7f3; color:#be185d; }
    .model-card-sc h4 { font-size:1.1rem; font-weight:800; margin:0 0 10px; color:#0f172a; }
    .model-card-sc p  { font-size:.85rem; color:#64748b; margin:0 0 16px; line-height:1.6; }
    .model-metrics { display:flex; gap:8px; flex-wrap:wrap; }
    .model-metric {
      background:#f8fafc; padding:5px 12px; border-radius:8px;
      font-size:.76rem; font-weight:700; color:#334155;
      border:1px solid #e2e8f0; font-family:'JetBrains Mono',monospace;
    }

    /* Datasets */
    .dataset-grid {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
      gap:18px;
    }
    .ds-card {
      background:#fff; border:1.5px solid #e2e8f0;
      border-radius:18px; padding:24px;
      transition:all .3s; box-shadow:0 2px 10px rgba(0,0,0,.04);
    }
    .ds-card:hover { box-shadow:0 12px 28px rgba(0,0,0,.08); transform:translateY(-4px); border-color:rgba(124,58,237,.25); }
    .ds-count {
      font-family:'Poppins',sans-serif; font-size:1.7rem;
      font-weight:900; color:#7c3aed; margin-bottom:6px; display:block;
    }
    .ds-card h4 { font-size:.95rem; font-weight:800; color:#0f172a; margin:0 0 8px; }
    .ds-card p  { font-size:.82rem; color:#64748b; margin:0; line-height:1.55; }

    /* Architecture */
    .arch-box {
      background:
        radial-gradient(ellipse at 25% 0%, rgba(56,189,248,.12),transparent 55%),
        radial-gradient(ellipse at 80% 100%, rgba(168,85,247,.12),transparent 55%),
        linear-gradient(160deg,#0a0f1e,#0f172a);
      border:1px solid rgba(255,255,255,.08);
      border-radius:24px; padding:44px 36px;
      box-shadow:0 4px 32px rgba(0,0,0,.3);
    }
    .adg { display:flex; flex-direction:column; align-items:center; gap:0; }
    .adg-tier { display:flex; align-items:stretch; justify-content:center; gap:14px; flex-wrap:wrap; }
    .adg-node {
      background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.03));
      border:1px solid rgba(255,255,255,.12);
      border-radius:18px; padding:18px 20px; width:150px;
      text-align:center; backdrop-filter:blur(8px);
      transition:all .3s cubic-bezier(.4,0,.2,1); position:relative;
    }
    .adg-node:hover { transform:translateY(-5px); border-color:rgba(56,189,248,.45); box-shadow:0 16px 36px rgba(0,0,0,.4); }
    .adg-ic {
      width:48px; height:48px; border-radius:14px; margin:0 auto 12px;
      display:flex; align-items:center; justify-content:center;
      font-size:1.35rem; color:#fff;
      box-shadow:0 8px 18px rgba(0,0,0,.28);
    }
    .adg-node h5 { color:#fff; font-size:.92rem; font-weight:700; margin:0 0 3px; letter-spacing:-.01em; }
    .adg-node small { color:#94a3b8; font-size:.72rem; display:block; line-height:1.4; }
    .adg-port {
      display:inline-block; margin-top:10px;
      font-family:'JetBrains Mono',monospace; font-size:.68rem; font-weight:600;
      color:#7dd3fc; background:rgba(56,189,248,.12);
      padding:2px 9px; border-radius:6px; border:1px solid rgba(56,189,248,.18);
    }
    .adg-arrow { display:flex; align-items:center; color:#475569; font-size:1.1rem; }
    .adg-down {
      display:flex; align-items:center; justify-content:center;
      width:36px; height:48px; color:#475569; font-size:1.1rem;
    }
    .adg-divider {
      display:flex; align-items:center; gap:14px; width:100%; max-width:520px;
      margin:30px 0 24px; color:#64748b; font-size:.72rem; font-weight:700;
      text-transform:uppercase; letter-spacing:.12em;
    }
    .adg-divider::before, .adg-divider::after {
      content:''; flex:1; height:1px;
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent);
    }
    @media(max-width:680px) {
      .adg-tier { flex-direction:column; align-items:center; }
      .adg-arrow { transform:rotate(90deg); height:30px; }
    }

    /* Tech */
    .tech-cards {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
      gap:16px;
    }
    .tech-card-sc {
      background:#fff; border:1.5px solid #e2e8f0;
      border-radius:16px; padding:22px 20px;
      text-align:center; transition:all .3s;
      box-shadow:0 2px 8px rgba(0,0,0,.04);
    }
    .tech-card-sc:hover { box-shadow:0 10px 24px rgba(0,0,0,.08); transform:translateY(-4px); border-color:rgba(124,58,237,.2); }
    .tech-card-sc i { font-size:1.9rem; color:#7c3aed; margin-bottom:10px; display:block; }
    .tech-card-sc h4 { font-size:.92rem; font-weight:800; color:#0f172a; margin:4px 0 4px; }
    .tech-card-sc p  { font-size:.76rem; color:#64748b; margin:0; }

    /* CTA */
    .sc-cta { text-align:center; padding:48px 0 0; }

    @media(max-width:768px) {
      .pipeline-wrap { flex-direction:column; align-items:center; }
      .pipe-arrow { transform:rotate(90deg); }
      .sc-hero-stats { gap:32px; }
    }
  `],
  template: `
    <div class="showcase">

      <!-- ── Hero ───────────────────────────────── -->
      <div class="sc-hero">
        <div style="position:relative;z-index:2;">
          <div class="sc-hero-badge anim-hero">
            <i class="fas fa-microscope"></i> Machine Learning &amp; Data Science
          </div>
          <h1 class="anim-hero anim-delay-1">
            Notre Projet <span class="gradient-text">CVerify</span>
          </h1>
          <p class="anim-hero anim-delay-2">
            Plateforme intelligente d'analyse de CV, de recommandation d'emploi et de prédiction
            propulsée par des modèles de Machine Learning de pointe — conçue à ESPRIT.
          </p>
          <div class="sc-hero-stats anim-hero anim-delay-3">
            <div class="sc-stat">
              <span class="sc-stat-val">5</span>
              <span class="sc-stat-lbl">Modèles ML</span>
            </div>
            <div class="sc-stat">
              <span class="sc-stat-val">40k+</span>
              <span class="sc-stat-lbl">Offres indexées</span>
            </div>
            <div class="sc-stat">
              <span class="sc-stat-val">95%</span>
              <span class="sc-stat-lbl">Précision</span>
            </div>
            <div class="sc-stat">
              <span class="sc-stat-val">5</span>
              <span class="sc-stat-lbl">Développeurs</span>
            </div>
          </div>
        </div>
      </div>

      <div class="container">

        <!-- ── Pipeline ───────────────────────────── -->
        <div class="sc-section aos">
          <div class="sc-section-header">
            <div class="sc-section-icon"><i class="fas fa-project-diagram"></i></div>
            <h2>Pipeline ML</h2>
          </div>
          <div class="pipeline-wrap">
            <div class="pipe-step">
              <span class="pipe-step-num">01</span>
              <img class="pipe-logo" src="assets/icons/database.svg" alt="" width="56" height="56">
              <h4>Collecte</h4>
              <p>Upload PDF / formulaire + scraping d'offres en ligne</p>
            </div>
            <div class="pipe-arrow"><i class="fas fa-arrow-right"></i></div>
            <div class="pipe-step">
              <span class="pipe-step-num">02</span>
              <img class="pipe-logo" src="assets/icons/funnel.svg" alt="" width="56" height="56">
              <h4>Prétraitement</h4>
              <p>Extraction texte, nettoyage NLP, feature engineering</p>
            </div>
            <div class="pipe-arrow"><i class="fas fa-arrow-right"></i></div>
            <div class="pipe-step">
              <span class="pipe-step-num">03</span>
              <img class="pipe-logo" src="assets/icons/ml-brain.svg" alt="" width="56" height="56">
              <h4>Modèles ML</h4>
              <p>Classification, régression, clustering, NLP</p>
            </div>
            <div class="pipe-arrow"><i class="fas fa-arrow-right"></i></div>
            <div class="pipe-step">
              <span class="pipe-step-num">04</span>
              <img class="pipe-logo" src="assets/icons/predict.svg" alt="" width="56" height="56">
              <h4>Prédiction</h4>
              <p>Score, salaire, cluster, rôle, recommandations</p>
            </div>
            <div class="pipe-arrow"><i class="fas fa-arrow-right"></i></div>
            <div class="pipe-step">
              <span class="pipe-step-num">05</span>
              <img class="pipe-logo" src="assets/icons/chart.svg" alt="" width="56" height="56">
              <h4>Résultats</h4>
              <p>Dashboard interactif, recommandations d'offres</p>
            </div>
          </div>
        </div>

        <!-- ── Models ─────────────────────────────── -->
        <div class="sc-section aos">
          <div class="sc-section-header">
            <div class="sc-section-icon"><i class="fas fa-brain"></i></div>
            <h2>Modèles Entraînés</h2>
          </div>
          <div class="model-grid">
            <div class="model-card-sc" style="--model-color:linear-gradient(90deg,#60a5fa,#2563eb);">
              <img class="model-logo" src="assets/icons/category.svg" alt="" width="54" height="54">
              <span class="model-type-badge type-class">Classification</span>
              <h4>Classifieur d'embauche</h4>
              <p>Prédit la probabilité qu'un candidat soit retenu (hired/not hired) à partir de ses features CV.</p>
              <div class="model-metrics">
                <span class="model-metric">Random Forest</span>
                <span class="model-metric">Accuracy ~89%</span>
                <span class="model-metric">classifier_hire.pkl</span>
              </div>
            </div>
            <div class="model-card-sc" style="--model-color:linear-gradient(90deg,#38bdf8,#0284c7);">
              <img class="model-logo" src="assets/icons/predict.svg" alt="" width="54" height="54">
              <span class="model-type-badge type-reg">Régression</span>
              <h4>Prédicteur de Salaire</h4>
              <p>Estime le salaire attendu d'un candidat en fonction de l'expérience, éducation et compétences.</p>
              <div class="model-metrics">
                <span class="model-metric">Gradient Boosting</span>
                <span class="model-metric">R² ~0.82</span>
                <span class="model-metric">salary_predictor.pkl</span>
              </div>
            </div>
            <div class="model-card-sc" style="--model-color:linear-gradient(90deg,#f472b6,#db2777);">
              <img class="model-logo" src="assets/icons/cluster.svg" alt="" width="54" height="54">
              <span class="model-type-badge type-cluster">Clustering</span>
              <h4>Segmentation Candidats</h4>
              <p>Regroupe les candidats en clusters homogènes (Junior, Mid, Senior, Expert) via KMeans.</p>
              <div class="model-metrics">
                <span class="model-metric">KMeans (k=4)</span>
                <span class="model-metric">Silhouette ~0.45</span>
                <span class="model-metric">kmeans_clusters.pkl</span>
              </div>
            </div>
            <div class="model-card-sc" style="--model-color:linear-gradient(90deg,#fbbf24,#ea580c);">
              <img class="model-logo" src="assets/icons/text-nlp.svg" alt="" width="54" height="54">
              <span class="model-type-badge type-nlp">NLP</span>
              <h4>Classifieur de Rôle (CV)</h4>
              <p>Analyse le texte d'un CV (PDF) et prédit automatiquement le poste parmi 24 catégories.</p>
              <div class="model-metrics">
                <span class="model-metric">TF-IDF + SVM</span>
                <span class="model-metric">24 catégories</span>
                <span class="model-metric">job_role_classifier.pkl</span>
              </div>
            </div>
            <div class="model-card-sc" style="--model-color:linear-gradient(90deg,#f472b6,#ec4899);">
              <img class="model-logo" src="assets/icons/star.svg" alt="" width="54" height="54">
              <span class="model-type-badge type-rec">Recommandation</span>
              <h4>Recommandation d'offres</h4>
              <p>Match les CVs avec les offres d'emploi via similarité cosinus sur vecteurs TF-IDF.</p>
              <div class="model-metrics">
                <span class="model-metric">TF-IDF + Cosine</span>
                <span class="model-metric">Top-N matching</span>
                <span class="model-metric">job_recommender_v2.pkl</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Datasets ───────────────────────────── -->
        <div class="sc-section aos">
          <div class="sc-section-header">
            <div class="sc-section-icon"><i class="fas fa-database"></i></div>
            <h2>Données Utilisées</h2>
          </div>
          <div class="dataset-grid">
            <div class="ds-card">
              <span class="ds-count">962</span>
              <h4>Resume Dataset (Kaggle)</h4>
              <p>CVs catégorisés en 24 rôles professionnels pour l'entraînement du classifieur NLP.</p>
            </div>
            <div class="ds-card">
              <span class="ds-count">~1 500</span>
              <h4>AI Resume Screening</h4>
              <p>Dataset structuré avec features numériques pour la classification et la régression.</p>
            </div>
            <div class="ds-card">
              <span class="ds-count">20k+</span>
              <h4>Data Jobs (Kaggle)</h4>
              <p>Offres d'emploi data/tech avec localisation, salaire, compétences et entreprise.</p>
            </div>
            <div class="ds-card">
              <span class="ds-count">Live</span>
              <h4>Scraping en ligne</h4>
              <p>Scraping automatique de sites d'emploi pour enrichir la base d'offres en continu.</p>
            </div>
          </div>
        </div>

        <!-- ── Architecture ───────────────────────── -->
        <div class="sc-section aos">
          <div class="sc-section-header">
            <div class="sc-section-icon"><i class="fas fa-sitemap"></i></div>
            <h2>Architecture du Système</h2>
          </div>
          <div class="arch-box">
            <div class="adg">
              <!-- Request flow -->
              <div class="adg-tier">
                <div class="adg-node">
                  <div class="adg-ic" style="background:linear-gradient(135deg,#dd0031,#c3002f);"><i class="fab fa-angular"></i></div>
                  <h5>Angular 17</h5><small>Frontend SPA</small>
                  <span class="adg-port">:8080</span>
                </div>
                <div class="adg-arrow"><i class="fas fa-arrow-right"></i></div>
                <div class="adg-node">
                  <div class="adg-ic" style="background:linear-gradient(135deg,#16a34a,#0f9d58);"><i class="fas fa-server"></i></div>
                  <h5>Nginx</h5><small>Reverse Proxy</small>
                  <span class="adg-port">:80</span>
                </div>
                <div class="adg-arrow"><i class="fas fa-arrow-right"></i></div>
                <div class="adg-node">
                  <div class="adg-ic" style="background:linear-gradient(135deg,#14b8a6,#0d9488);"><i class="fas fa-bolt"></i></div>
                  <h5>FastAPI</h5><small>Backend REST</small>
                  <span class="adg-port">:8000</span>
                </div>
                <div class="adg-arrow"><i class="fas fa-arrow-right"></i></div>
                <div class="adg-node">
                  <div class="adg-ic" style="background:linear-gradient(135deg,#38bdf8,#2563eb);"><i class="fas fa-database"></i></div>
                  <h5>PostgreSQL 16</h5><small>Base de données</small>
                  <span class="adg-port">:5432</span>
                </div>
              </div>

              <!-- Branch from backend -->
              <div class="adg-down"><i class="fas fa-arrow-down"></i></div>
              <div class="adg-tier">
                <div class="adg-node">
                  <div class="adg-ic" style="background:linear-gradient(135deg,#f59e0b,#ea580c);"><i class="fas fa-brain"></i></div>
                  <h5>ML Models</h5><small>.pkl · scikit-learn</small>
                </div>
                <div class="adg-node">
                  <div class="adg-ic" style="background:linear-gradient(135deg,#ec4899,#db2777);"><i class="fas fa-robot"></i></div>
                  <h5>n8n</h5><small>Chatbot &amp; workflows</small>
                  <span class="adg-port">:5678</span>
                </div>
              </div>

              <!-- Data pipeline -->
              <div class="adg-divider">Pipeline de données</div>
              <div class="adg-tier">
                <div class="adg-node">
                  <div class="adg-ic" style="background:linear-gradient(135deg,#3b82f6,#facc15);"><i class="fab fa-python"></i></div>
                  <h5>Job Scraper</h5><small>Python · scraping</small>
                </div>
                <div class="adg-arrow"><i class="fas fa-arrow-right"></i></div>
                <div class="adg-node">
                  <div class="adg-ic" style="background:linear-gradient(135deg,#10b981,#059669);"><i class="fas fa-file-csv"></i></div>
                  <h5>CSV / DB</h5><small>Import &amp; indexation</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Tech Stack ─────────────────────────── -->
        <div class="sc-section aos">
          <div class="sc-section-header">
            <div class="sc-section-icon"><i class="fas fa-cogs"></i></div>
            <h2>Stack Technologique</h2>
          </div>
          <div class="tech-cards">
            <div class="tech-card-sc">
              <i class="fab fa-python"></i>
              <h4>Python 3.11</h4>
              <p>Backend, ML, scraping</p>
            </div>
            <div class="tech-card-sc">
              <i class="fas fa-bolt"></i>
              <h4>FastAPI</h4>
              <p>API REST haute performance</p>
            </div>
            <div class="tech-card-sc">
              <i class="fab fa-angular"></i>
              <h4>Angular 17</h4>
              <p>SPA avec Signals & lazy loading</p>
            </div>
            <div class="tech-card-sc">
              <i class="fas fa-database"></i>
              <h4>PostgreSQL 16</h4>
              <p>Base de données relationnelle</p>
            </div>
            <div class="tech-card-sc">
              <i class="fab fa-docker"></i>
              <h4>Docker Compose</h4>
              <p>Orchestration multi-conteneurs</p>
            </div>
            <div class="tech-card-sc">
              <i class="fas fa-brain"></i>
              <h4>Scikit-learn</h4>
              <p>RF, GB, KMeans, SVM</p>
            </div>
            <div class="tech-card-sc">
              <i class="fas fa-robot"></i>
              <h4>n8n</h4>
              <p>Chatbot & workflow automation</p>
            </div>
            <div class="tech-card-sc">
              <i class="fas fa-server"></i>
              <h4>Nginx</h4>
              <p>Reverse proxy & static files</p>
            </div>
          </div>
        </div>

        <!-- ── CTA ────────────────────────────────── -->
        <div class="sc-cta aos">
          <a routerLink="/analyse" class="btn btn-primary btn-lg" style="font-size:1.05rem;padding:16px 40px;">
            <i class="fas fa-rocket"></i> Essayer l'analyse CV maintenant
          </a>
        </div>

      </div>
    </div>
  `,
})
export class ShowcaseComponent implements AfterViewInit, OnDestroy {
  private observer!: IntersectionObserver;

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); this.observer.unobserve(e.target); }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.aos').forEach(el => this.observer.observe(el));
  }

  ngOnDestroy(): void { if (this.observer) this.observer.disconnect(); }
}
