export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: 'candidate' | 'recruiter' | 'admin';
  company: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TokenOut {
  access_token: string;
  user: User;
}

export interface CandidateCreate {
  full_name: string;
  email: string;
  phone: string;
  education: string;
  job_role: string;
  experience_years: number;
  projects_count: number;
  ai_score: number;
  skills: string[];
  certifications: string;
}

export interface CandidateOut {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  education: string;
  job_role: string;
  experience_years: number;
  projects_count: number;
  ai_score: number;
  skills: string[];
  certifications?: string;
  hire_probability?: number;
  predicted_salary?: number;
  candidate_cluster?: number;
  recommendation?: string;
  created_at: string;
}

export interface Job {
  id: number;
  title: string;
  title_short?: string;
  company_name?: string;
  location?: string;
  via?: string;
  schedule_type?: string;
  work_from_home: boolean;
  country?: string;
  no_degree_mention?: boolean;
  health_insurance?: boolean;
  salary_year_avg?: number;
  skills?: string;
  posted_date?: string;
  source: string;
  job_url?: string;
}

export interface RecruiterPostCreate {
  title: string;
  description?: string;
  category?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  required_skills?: string;
  company_name?: string;
}

export interface RecruiterPost {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  category?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  required_skills?: string;
  company_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  applications_count?: number;
}

export interface Application {
  id: number;
  user_id: number;
  job_post_id?: number;
  job_id?: number;
  cv_id?: number;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  cover_letter?: string;
  created_at: string;
  updated_at?: string;
  job_title?: string;
  company_name?: string;
  job_location?: string;
  // Meeting details (visible to candidate when accepted)
  meeting_type?: string;
  meeting_slots?: string[];
  meeting_link?: string;
  meeting_location?: string;
  recruiter_contact?: string;
  preparation_notes?: string;
  rejection_reason?: string;
}

export interface ApplicationFull {
  id: number;
  user_id: number;
  job_post_id?: number;
  job_id?: number;
  cv_id?: number;
  status: string;
  cover_letter?: string;
  created_at: string;
  updated_at: string;
  // Job info
  job_title?: string;
  company_name?: string;
  job_location?: string;
  required_skills?: string;
  // Candidate profile
  candidate_name?: string;
  candidate_email?: string;
  candidate_phone?: string;
  // CV / AI
  cv_skills?: string[];
  cv_education?: string;
  cv_experience_years?: number;
  cv_projects_count?: number;
  cv_certifications?: string;
  hire_probability?: number;
  predicted_salary?: number;
  candidate_cluster?: number;
  recommendation?: string;
  // AI analysis
  match_score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  experience_level?: string;
  strengths?: string[];
  red_flags?: string[];
  ai_recommendation?: string;
  // Meeting / rejection
  meeting_type?: string;
  meeting_slots?: string[];
  meeting_link?: string;
  meeting_location?: string;
  recruiter_contact?: string;
  preparation_notes?: string;
  rejection_reason?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface ApplicationStatusUpdate {
  status: string;
  meeting_type?: string;
  meeting_slots?: string[];
  meeting_link?: string;
  meeting_location?: string;
  recruiter_contact?: string;
  preparation_notes?: string;
  rejection_reason?: string;
}

export interface CVHistory {
  id: number;
  job_role?: string;
  experience_years: number;
  hire_probability?: number;
  predicted_salary?: number;
  candidate_cluster?: number;
  skills?: string;
  education?: string;
  created_at: string;
}

export interface JobRecommendation {
  rank: number;
  job_title: string;
  company: string;
  location: string;
  salary_avg?: number;
  skills: string;
  similarity_score: number;
  job_id?: number;
}

export interface AdminStats {
  total: number;
  hired_count: number;
  rejected_count: number;
  avg_hire_probability: number;
  avg_predicted_salary: number;
  roles_distribution: Record<string, number>;
  clusters_distribution: Record<string, number>;
}
