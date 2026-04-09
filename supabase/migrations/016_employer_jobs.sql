-- Company profiles (employers)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  size TEXT CHECK (size IN ('1-10', '11-50', '51-200', '201-500', '500+')),
  logo_url TEXT,
  posted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job postings (employer posts to a specific group)
CREATE TABLE IF NOT EXISTS job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  posted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  role_type TEXT NOT NULL,           -- e.g. "Product", "Marketing", etc.
  experience_min INTEGER,            -- years
  experience_max INTEGER,
  location TEXT,
  remote_ok BOOLEAN DEFAULT false,
  compensation_min INTEGER,          -- INR lakhs per year
  compensation_max INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
  application_email TEXT,            -- where applications are sent
  application_url TEXT,              -- external link to apply
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

-- Track applications from Mentor members
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cover_note TEXT,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'viewed', 'shortlisted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, applicant_id)
);

CREATE INDEX idx_job_postings_community ON job_postings(community_id, status);
CREATE INDEX idx_job_postings_company ON job_postings(company_id);
CREATE INDEX idx_job_applications_job ON job_applications(job_id);
CREATE INDEX idx_job_applications_applicant ON job_applications(applicant_id);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Policies for companies
CREATE POLICY "Companies are viewable by all" ON companies FOR SELECT USING (true);
CREATE POLICY "Users can create companies" ON companies FOR INSERT WITH CHECK (auth.uid() = posted_by);
CREATE POLICY "Users can update own company" ON companies FOR UPDATE USING (auth.uid() = posted_by);

-- Policies for job_postings
CREATE POLICY "Job postings are viewable by all" ON job_postings FOR SELECT USING (true);
CREATE POLICY "Users can post jobs" ON job_postings FOR INSERT WITH CHECK (auth.uid() = posted_by);
CREATE POLICY "Users can update own job postings" ON job_postings FOR UPDATE USING (auth.uid() = posted_by);
CREATE POLICY "Users can delete own job postings" ON job_postings FOR DELETE USING (auth.uid() = posted_by);

-- Policies for job_applications
CREATE POLICY "Users see own applications" ON job_applications FOR SELECT USING (auth.uid() = applicant_id OR auth.uid() IN (SELECT posted_by FROM job_postings WHERE id = job_id));
CREATE POLICY "Users can apply to jobs" ON job_applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "Users can withdraw applications" ON job_applications FOR DELETE USING (auth.uid() = applicant_id);
