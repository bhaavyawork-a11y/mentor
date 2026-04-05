export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  current_job_role: string | null;
  target_role: string | null;
  current_salary: number | null;
  target_salary: number | null;
  years_experience: number;
  industry: string | null;
  location: string | null;
  bio: string | null;
  skills: string[];
  last_interview_score: number | null;
  last_interview_at: string | null;
  interview_xp: number;
  followers_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: "role" | "skill" | "salary" | "network" | "education" | "other";
  status: "active" | "completed" | "paused" | "cancelled";
  priority: "high" | "medium" | "low";
  target_date: string | null;
  completed_at: string | null;
  milestones: Milestone[];
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  due_date?: string;
}

export interface Expert {
  id: string;
  user_id: string | null;
  full_name: string;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  linkedin_url: string | null;
  expertise_areas: string[];
  industries: string[];
  years_experience: number;
  rating: number;
  review_count: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  services?: Service[];
}

export interface Service {
  id: string;
  expert_id: string;
  title: string;
  description: string | null;
  type: "session" | "review" | "course" | "package";
  duration_mins: number;
  price_cents: number;
  currency: string;
  stripe_price_id: string | null;
  max_bookings: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  company: string;
  role: string;
  url: string | null;
  status: "Applied" | "Interviewing" | "Offer" | "Rejected";
  applied_date: string;
  notes: string | null;
  updated_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  expert_id: string;
  service_id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "refunded";
  scheduled_at: string | null;
  duration_mins: number | null;
  notes: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  amount_cents: number | null;
  currency: string;
  paid_at: string | null;
  meeting_url: string | null;
  created_at: string;
  updated_at: string;
  expert?: Expert;
  service?: Service;
}
