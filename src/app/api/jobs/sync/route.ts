import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ─── Company maps ─────────────────────────────────────────────────────────────

const LEVER_COMPANIES: Record<string, { name: string; domain: string }> = {
  cred:         { name: "CRED",         domain: "cred.club"        },
  meesho:       { name: "Meesho",       domain: "meesho.com"       },
  zepto:        { name: "Zepto",        domain: "zepto.team"       },
  swiggy:       { name: "Swiggy",       domain: "swiggy.com"       },
  zomato:       { name: "Zomato",       domain: "zomato.com"       },
  dream11:      { name: "Dream11",      domain: "dream11.com"      },
  growwapp:     { name: "Groww",        domain: "groww.in"         },
  phonepe:      { name: "PhonePe",      domain: "phonepe.com"      },
  browserstack: { name: "BrowserStack", domain: "browserstack.com" },
  freshworks:   { name: "Freshworks",   domain: "freshworks.com"   },
  chargebee:    { name: "Chargebee",    domain: "chargebee.com"    },
  delhivery:    { name: "Delhivery",    domain: "delhivery.com"    },
  sharechat:    { name: "ShareChat",    domain: "sharechat.com"    },
  unacademy:    { name: "Unacademy",    domain: "unacademy.com"    },
  practo:       { name: "Practo",       domain: "practo.com"       },
  nykaa:        { name: "Nykaa",        domain: "nykaa.com"        },
  zerodha:      { name: "Zerodha",      domain: "zerodha.com"      },
  upstox:       { name: "Upstox",       domain: "upstox.com"       },
  bharatpe:     { name: "BharatPe",     domain: "bharatpe.com"     },
  jupitermoney: { name: "Jupiter",      domain: "jupiter.money"    },
  sliceit:      { name: "slice",        domain: "sliceit.com"      },
  ultrahuman:   { name: "Ultrahuman",   domain: "ultrahuman.com"   },
};

const GREENHOUSE_COMPANIES: Record<string, { name: string; domain: string }> = {
  razorpaysoftwareprivatelimited: { name: "Razorpay",   domain: "razorpay.com"   },
  google:     { name: "Google",     domain: "google.com"     },
  microsoft:  { name: "Microsoft",  domain: "microsoft.com"  },
  adobe:      { name: "Adobe",      domain: "adobe.com"      },
  salesforce: { name: "Salesforce", domain: "salesforce.com" },
  flipkart:   { name: "Flipkart",   domain: "flipkart.com"   },
  amazon:     { name: "Amazon",     domain: "amazon.in"      },
  canva:      { name: "Canva",      domain: "canva.com"      },
  nvidia:     { name: "NVIDIA",     domain: "nvidia.com"     },
};

// ─── API types ────────────────────────────────────────────────────────────────

interface LeverPosting {
  id: string;
  text: string;
  categories: { commitment?: string; department?: string; location?: string };
  hostedUrl: string;
  descriptionPlain?: string;
  createdAt: number;
}

interface GreenhouseJob {
  id: number;
  title: string;
  location: { name: string };
  departments: Array<{ id: number; name: string }>;
  absolute_url: string;
  updated_at: string;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchLever(slug: string): Promise<LeverPosting[]> {
  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    return (await res.json()) as LeverPosting[];
  } catch { return []; }
}

async function fetchGreenhouse(slug: string): Promise<GreenhouseJob[]> {
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { jobs: GreenhouseJob[] };
    return data.jobs ?? [];
  } catch { return []; }
}

// ─── Row builders ─────────────────────────────────────────────────────────────

function leverRow(slug: string, p: LeverPosting) {
  const co = LEVER_COMPANIES[slug];
  return {
    external_id:         `lever-${p.id}`,
    source:              "lever" as const,
    title:               p.text,
    company_name:        co?.name ?? slug,
    company_slug:        slug,
    company_domain:      co?.domain ?? null,
    location:            p.categories?.location ?? null,
    department:          p.categories?.department ?? null,
    job_type:            p.categories?.commitment ?? null,
    apply_url:           p.hostedUrl,          // direct job page URL
    description_snippet: p.descriptionPlain?.slice(0, 200) ?? null,
    posted_at:           p.createdAt ? new Date(p.createdAt).toISOString() : null,
    is_active:           true,
  };
}

function greenhouseRow(slug: string, j: GreenhouseJob) {
  const co = GREENHOUSE_COMPANIES[slug];
  return {
    external_id:         `greenhouse-${j.id}`,
    source:              "greenhouse" as const,
    title:               j.title,
    company_name:        co?.name ?? slug,
    company_slug:        slug,
    company_domain:      co?.domain ?? null,
    location:            j.location?.name ?? null,
    department:          j.departments?.[0]?.name ?? null,
    job_type:            null,
    apply_url:           j.absolute_url,       // direct job page URL
    description_snippet: null,
    posted_at:           j.updated_at ?? null,
    is_active:           true,
  };
}

// ─── Safe per-company deactivation ───────────────────────────────────────────
// Only marks a company's OLD jobs inactive after we've confirmed the fetch
// succeeded. Uses .in() on a list of IDs to avoid NOT IN string bugs.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deactivateStale(
  supabase: SupabaseClient<any>,
  source: "lever" | "greenhouse",
  slug: string,
  activeExternalIds: string[],
) {
  // Fetch all current IDs for this company
  const { data } = await supabase
    .from("job_listings")
    .select("external_id")
    .eq("source", source)
    .eq("company_slug", slug)
    .eq("is_active", true);

  if (!data || data.length === 0) return;

  const activeSet = new Set(activeExternalIds);
  const toDeactivate = data
    .map((r: { external_id: string }) => r.external_id)
    .filter((id: string) => !activeSet.has(id));

  if (toDeactivate.length > 0) {
    await supabase
      .from("job_listings")
      .update({ is_active: false })
      .in("external_id", toDeactivate);
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret");
  if (!secret || secret !== process.env.JOBS_SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const errors: string[] = [];
  const companySummary: Record<string, number> = {};
  let total = 0;

  // ── Lever ────────────────────────────────────────────────
  for (const slug of Object.keys(LEVER_COMPANIES)) {
    const postings = await fetchLever(slug);
    if (postings.length === 0) {
      errors.push(`lever:${slug} — 0 jobs`);
      continue; // don't touch this company's existing rows
    }

    const rows = postings.map((p) => leverRow(slug, p));
    const { error } = await supabase
      .from("job_listings")
      .upsert(rows, { onConflict: "external_id" });

    if (error) {
      errors.push(`lever:${slug} upsert failed: ${error.message}`);
      continue;
    }

    // Only deactivate stale rows AFTER successful upsert
    await deactivateStale(supabase, "lever", slug, rows.map((r) => r.external_id));
    companySummary[`lever:${slug}`] = postings.length;
    total += postings.length;
  }

  // ── Greenhouse ───────────────────────────────────────────
  for (const slug of Object.keys(GREENHOUSE_COMPANIES)) {
    const jobs = await fetchGreenhouse(slug);
    if (jobs.length === 0) {
      errors.push(`greenhouse:${slug} — 0 jobs`);
      continue;
    }

    const rows = jobs.map((j) => greenhouseRow(slug, j));
    const { error } = await supabase
      .from("job_listings")
      .upsert(rows, { onConflict: "external_id" });

    if (error) {
      errors.push(`greenhouse:${slug} upsert failed: ${error.message}`);
      continue;
    }

    await deactivateStale(supabase, "greenhouse", slug, rows.map((r) => r.external_id));
    companySummary[`greenhouse:${slug}`] = jobs.length;
    total += jobs.length;
  }

  return NextResponse.json({ success: true, summary: { total, companies: companySummary, errors } });
}
