import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import {
  CandidateCreate, CandidateOut, Job, RecruiterPost, RecruiterPostCreate,
  Application, ApplicationFull, ApplicationStatusUpdate, CVHistory,
  AdminStats, JobRecommendation, Notification, User
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private authHeaders(): HttpHeaders {
    return new HttpHeaders(this.auth.authHeaders());
  }

  // ── CV / Prediction ────────────────────────────────────────
  createCv(payload: CandidateCreate): Observable<CandidateOut> {
    return this.http.post<CandidateOut>(`${this.base}/cvs`, payload,
      { headers: this.authHeaders() });
  }

  uploadCvPdf(file: File): Observable<CandidateOut> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<CandidateOut>(`${this.base}/cvs/upload-pdf`, fd,
      { headers: new HttpHeaders(this.auth.authHeaders()) });
  }

  uploadCvPdfFull(file: File): Observable<Record<string, unknown>> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<Record<string, unknown>>(`${this.base}/cvs/upload-pdf/full`, fd,
      { headers: new HttpHeaders(this.auth.authHeaders()) });
  }

  listCvs(search?: string, limit = 50, offset = 0): Observable<CandidateOut[]> {
    let params = new HttpParams().set('limit', limit).set('offset', offset);
    if (search) params = params.set('search', search);
    return this.http.get<CandidateOut[]>(`${this.base}/cvs`, { params });
  }

  getCvRecommendations(cvId: number, topN = 5): Observable<JobRecommendation[]> {
    return this.http.get<JobRecommendation[]>(
      `${this.base}/cvs/${cvId}/recommendations?top_n=${topN}`);
  }

  // ── Jobs ──────────────────────────────────────────────────
  listJobs(opts: {
    query?: string; location?: string; remote_only?: boolean;
    skills?: string; salary_min?: number; source?: string; page?: number; per_page?: number;
  } = {}): Observable<Job[]> {
    let params = new HttpParams();
    if (opts.query)       params = params.set('query', opts.query);
    if (opts.location)    params = params.set('location', opts.location);
    if (opts.remote_only) params = params.set('remote_only', 'true');
    if (opts.skills)      params = params.set('skills', opts.skills);
    if (opts.salary_min)  params = params.set('salary_min', opts.salary_min);
    if (opts.source)      params = params.set('source', opts.source);
    params = params.set('page', opts.page ?? 1).set('per_page', opts.per_page ?? 20);
    return this.http.get<Job[]>(`${this.base}/jobs`, { params });
  }

  jobsStats(): Observable<{ total_jobs: number; remote_jobs: number; jobs_with_salary: number }> {
    return this.http.get<{ total_jobs: number; remote_jobs: number; jobs_with_salary: number }>(
      `${this.base}/jobs/stats/summary`);
  }

  // ── Applications ──────────────────────────────────────────
  applyToJob(body: { job_post_id?: number; job_id?: number; cv_id?: number; cover_letter?: string }): Observable<Application> {
    return this.http.post<Application>(`${this.base}/applications`, body,
      { headers: this.authHeaders() });
  }

  candidateApplications(): Observable<Application[]> {
    return this.http.get<Application[]>(`${this.base}/candidate/applications`,
      { headers: this.authHeaders() });
  }

  candidateCvHistory(): Observable<CVHistory[]> {
    return this.http.get<CVHistory[]>(`${this.base}/candidate/cv-history`,
      { headers: this.authHeaders() });
  }

  // ── Recruiter ─────────────────────────────────────────────
  createPost(body: RecruiterPostCreate): Observable<RecruiterPost> {
    return this.http.post<RecruiterPost>(`${this.base}/recruiter/posts`, body,
      { headers: this.authHeaders() });
  }

  myPosts(): Observable<RecruiterPost[]> {
    return this.http.get<RecruiterPost[]>(`${this.base}/recruiter/my-posts`,
      { headers: this.authHeaders() });
  }

  deletePost(postId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/recruiter/posts/${postId}`,
      { headers: this.authHeaders() });
  }

  togglePost(postId: number): Observable<{ is_active: boolean }> {
    return this.http.patch<{ is_active: boolean }>(
      `${this.base}/recruiter/posts/${postId}/toggle`, {},
      { headers: this.authHeaders() });
  }

  postCandidates(postId: number): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.base}/recruiter/posts/${postId}/candidates`,
      { headers: this.authHeaders() });
  }

  hireApplicant(postId: number, appId: number): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `${this.base}/recruiter/posts/${postId}/hire/${appId}`, {},
      { headers: this.authHeaders() });
  }

  // ── Admin ─────────────────────────────────────────────────
  adminStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.base}/admin/stats`);
  }

  adminUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/admin/users`,
      { headers: this.authHeaders() });
  }

  adminCompanies(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.base}/admin/companies`,
      { headers: this.authHeaders() });
  }

  importJobsCsv(): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/admin/import-jobs-csv`, {},
      { headers: this.authHeaders() });
  }

  reseedAll(): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/admin/reseed-all`, {},
      { headers: this.authHeaders() });
  }

  deactivateUser(userId: number): Observable<Record<string, unknown>> {
    return this.http.delete<Record<string, unknown>>(`${this.base}/admin/users/${userId}`,
      { headers: this.authHeaders() });
  }

  updateUserRole(userId: number, role: string): Observable<Record<string, unknown>> {
    return this.http.patch<Record<string, unknown>>(
      `${this.base}/admin/users/${userId}/role?new_role=${role}`, {},
      { headers: this.authHeaders() });
  }

  scrapeLogs(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.base}/admin/scrape-logs`,
      { headers: this.authHeaders() });
  }

  triggerScrape(): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/admin/scrape`, {},
      { headers: this.authHeaders() });
  }

  importScraperOutput(): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/admin/import-scraper-output`, {},
      { headers: this.authHeaders() });
  }

  activateUser(userId: number): Observable<Record<string, unknown>> {
    return this.http.patch<Record<string, unknown>>(
      `${this.base}/admin/users/${userId}/activate`, {},
      { headers: this.authHeaders() });
  }

  // ── Notifications ─────────────────────────────────────────
  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.base}/notifications`,
      { headers: this.authHeaders() });
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/notifications/unread-count`,
      { headers: this.authHeaders() });
  }

  markNotificationRead(id: number): Observable<unknown> {
    return this.http.patch(`${this.base}/notifications/${id}/read`, {},
      { headers: this.authHeaders() });
  }

  markAllNotificationsRead(): Observable<unknown> {
    return this.http.post(`${this.base}/notifications/read-all`, {},
      { headers: this.authHeaders() });
  }

  // ── Application Status Update ──────────────────────────────
  updateApplicationStatus(appId: number, body: ApplicationStatusUpdate): Observable<unknown> {
    return this.http.patch(`${this.base}/applications/${appId}/status`, body,
      { headers: this.authHeaders() });
  }

  // ── Enriched Application Detail (recruiter) ────────────────
  getApplicationDetail(appId: number): Observable<ApplicationFull> {
    return this.http.get<ApplicationFull>(`${this.base}/recruiter/applications/${appId}/detail`,
      { headers: this.authHeaders() });
  }
}
