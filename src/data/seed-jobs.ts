export interface SeedJob {
  external_id: string;
  source: "seed";
  title: string;
  company_name: string;
  company_slug: string;
  company_domain: string;
  location: string | null;
  department: string | null;
  job_type: string | null;
  apply_url: string;
  description_snippet: string | null;
  posted_at: string;
  is_active: true;
}

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

export const SEED_JOBS: SeedJob[] = [
  // ── Snitch ──
  { external_id: "seed-snitch-001", source: "seed", title: "Growth Associate", company_name: "Snitch", company_slug: "snitch", company_domain: "snitch.co.in", location: "Bangalore", department: "Growth", job_type: "Full-time", apply_url: "https://snitch.co.in/pages/careers", description_snippet: "Drive user acquisition and retention for India's fastest-growing D2C menswear brand. Manage paid media, influencer campaigns, and performance analytics.", posted_at: daysAgo(3), is_active: true },
  { external_id: "seed-snitch-002", source: "seed", title: "Brand Manager", company_name: "Snitch", company_slug: "snitch", company_domain: "snitch.co.in", location: "Bangalore", department: "Marketing", job_type: "Full-time", apply_url: "https://snitch.co.in/pages/careers", description_snippet: "Own the Snitch brand voice across digital and offline channels. Work with creative and product teams to launch new collections and campaigns.", posted_at: daysAgo(5), is_active: true },

  // ── The Souled Store ──
  { external_id: "seed-souledstore-001", source: "seed", title: "Product Manager", company_name: "The Souled Store", company_slug: "souledstore", company_domain: "thesouledstore.com", location: "Mumbai", department: "Product", job_type: "Full-time", apply_url: "https://www.thesouledstore.com/careers", description_snippet: "Lead the product roadmap for our e-commerce platform serving 5M+ pop-culture fans. Define features, run A/B tests, and ship delightful experiences.", posted_at: daysAgo(2), is_active: true },
  { external_id: "seed-souledstore-002", source: "seed", title: "Data Analyst", company_name: "The Souled Store", company_slug: "souledstore", company_domain: "thesouledstore.com", location: "Mumbai", department: "Data", job_type: "Full-time", apply_url: "https://www.thesouledstore.com/careers", description_snippet: "Analyse sales, inventory, and customer behaviour to surface actionable insights. Build dashboards in Looker/Metabase and present weekly business reviews.", posted_at: daysAgo(7), is_active: true },

  // ── Rare Rabbit ──
  { external_id: "seed-raretabbit-001", source: "seed", title: "Operations Manager", company_name: "Rare Rabbit", company_slug: "raretabbit", company_domain: "rarerabbit.in", location: "Bangalore", department: "Operations", job_type: "Full-time", apply_url: "https://rarerabbit.in/pages/careers", description_snippet: "Oversee supply chain, vendor management, and fulfilment for India's premium menswear label. Optimise processes to achieve 99% on-time delivery.", posted_at: daysAgo(4), is_active: true },

  // ── Minimalist ──
  { external_id: "seed-minimalist-001", source: "seed", title: "Growth Associate – D2C", company_name: "Minimalist", company_slug: "minimalist", company_domain: "beminimalist.co", location: "Jaipur", department: "Growth", job_type: "Full-time", apply_url: "https://beminimalist.co/pages/careers", description_snippet: "Scale Minimalist's digital channels including Meta, Google, and influencer marketing. ₹6-10 LPA based on experience.", posted_at: daysAgo(1), is_active: true },
  { external_id: "seed-minimalist-002", source: "seed", title: "Software Engineer – Backend", company_name: "Minimalist", company_slug: "minimalist", company_domain: "beminimalist.co", location: "Remote", department: "Engineering", job_type: "Full-time", apply_url: "https://beminimalist.co/pages/careers", description_snippet: "Build APIs and microservices powering India's fastest-growing skincare brand. Stack: Node.js, PostgreSQL, Redis. ₹12-20 LPA.", posted_at: daysAgo(6), is_active: true },

  // ── boAt ──
  { external_id: "seed-boat-001", source: "seed", title: "Brand Manager", company_name: "boAt", company_slug: "boat", company_domain: "boat-lifestyle.com", location: "Delhi", department: "Marketing", job_type: "Full-time", apply_url: "https://www.boat-lifestyle.com/pages/careers", description_snippet: "Drive boAt's brand strategy across youth segments. Manage 360° campaigns for product launches, IPL sponsorships, and digital collaborations.", posted_at: daysAgo(8), is_active: true },
  { external_id: "seed-boat-002", source: "seed", title: "Product Manager – Consumer Electronics", company_name: "boAt", company_slug: "boat", company_domain: "boat-lifestyle.com", location: "Delhi", department: "Product", job_type: "Full-time", apply_url: "https://www.boat-lifestyle.com/pages/careers", description_snippet: "Define the roadmap for boAt's next-gen audio and wearables lineup. Work cross-functionally with R&D, manufacturing, and marketing.", posted_at: daysAgo(10), is_active: true },

  // ── Wakefit ──
  { external_id: "seed-wakefit-001", source: "seed", title: "Chief of Staff", company_name: "Wakefit", company_slug: "wakefit", company_domain: "wakefit.co", location: "Bangalore", department: "Strategy", job_type: "Full-time", apply_url: "https://www.wakefit.co/careers", description_snippet: "Work directly with Wakefit's CEO to drive cross-functional initiatives, track OKRs, and prepare board materials. Ideal for ex-consultants or MBAs.", posted_at: daysAgo(3), is_active: true },
  { external_id: "seed-wakefit-002", source: "seed", title: "Software Engineer – Full Stack", company_name: "Wakefit", company_slug: "wakefit", company_domain: "wakefit.co", location: "Bangalore", department: "Engineering", job_type: "Full-time", apply_url: "https://www.wakefit.co/careers", description_snippet: "Build Wakefit's D2C e-commerce platform and internal tools. Stack: React, Node.js, AWS. ₹14-22 LPA.", posted_at: daysAgo(5), is_active: true },

  // ── Licious ──
  { external_id: "seed-licious-001", source: "seed", title: "Operations Manager – Supply Chain", company_name: "Licious", company_slug: "licious", company_domain: "licious.in", location: "Bangalore", department: "Operations", job_type: "Full-time", apply_url: "https://www.licious.in/blog/careers", description_snippet: "Own cold-chain logistics for Licious's meat and seafood delivery network across 20+ cities. Manage vendor SLAs, quality audits, and last-mile partners.", posted_at: daysAgo(2), is_active: true },
  { external_id: "seed-licious-002", source: "seed", title: "Data Analyst – Supply Chain", company_name: "Licious", company_slug: "licious", company_domain: "licious.in", location: "Bangalore", department: "Data", job_type: "Full-time", apply_url: "https://www.licious.in/blog/careers", description_snippet: "Build demand-forecasting models to reduce waste and improve freshness for India's premium fresh-meat brand. ₹8-14 LPA.", posted_at: daysAgo(9), is_active: true },

  // ── Epigamia ──
  { external_id: "seed-epigamia-001", source: "seed", title: "Growth Associate – Retail", company_name: "Epigamia", company_slug: "epigamia", company_domain: "epigamia.com", location: "Mumbai", department: "Growth", job_type: "Full-time", apply_url: "https://www.epigamia.com/pages/careers", description_snippet: "Drive Epigamia's modern-trade and quick-commerce expansion. Manage relationships with Blinkit, Swiggy Instamart, and Zepto. ₹5-8 LPA.", posted_at: daysAgo(4), is_active: true },

  // ── Vahdam ──
  { external_id: "seed-vahdam-001", source: "seed", title: "Brand Manager – International", company_name: "Vahdam", company_slug: "vahdam", company_domain: "vahdam.com", location: "Delhi", department: "Marketing", job_type: "Full-time", apply_url: "https://www.vahdam.com/pages/careers", description_snippet: "Drive Vahdam's brand strategy across the US, UK, and European markets. Manage global campaigns for India's fastest-growing premium tea brand.", posted_at: daysAgo(6), is_active: true },

  // ── Bombay Shaving Company ──
  { external_id: "seed-bsc-001", source: "seed", title: "Product Manager – Grooming", company_name: "Bombay Shaving Company", company_slug: "bombayshavingcompany", company_domain: "bombayshavingcompany.com", location: "Delhi", department: "Product", job_type: "Full-time", apply_url: "https://www.bombayshavingcompany.com/careers", description_snippet: "Define the product roadmap for BSC's core grooming portfolio. Run consumer research, competitive analysis, and work with R&D to launch new SKUs.", posted_at: daysAgo(3), is_active: true },

  // ── PhysicsWallah ──
  { external_id: "seed-pw-001", source: "seed", title: "Software Engineer – Backend", company_name: "PhysicsWallah", company_slug: "physicswallah", company_domain: "pw.live", location: "Noida", department: "Engineering", job_type: "Full-time", apply_url: "https://careers.pw.live", description_snippet: "Scale PhysicsWallah's learning platform serving 20M+ students. Stack: Go/Node.js, Kafka, PostgreSQL, Redis. ₹15-25 LPA.", posted_at: daysAgo(1), is_active: true },
  { external_id: "seed-pw-002", source: "seed", title: "Growth Associate – EdTech", company_name: "PhysicsWallah", company_slug: "physicswallah", company_domain: "pw.live", location: "Noida", department: "Growth", job_type: "Full-time", apply_url: "https://careers.pw.live", description_snippet: "Drive acquisition for PW's JEE and NEET courses. Manage performance marketing budgets and analyse funnel metrics. ₹6-10 LPA.", posted_at: daysAgo(7), is_active: true },

  // ── Rapido ──
  { external_id: "seed-rapido-001", source: "seed", title: "Operations Manager – City", company_name: "Rapido", company_slug: "rapido", company_domain: "rapido.bike", location: "Bangalore", department: "Operations", job_type: "Full-time", apply_url: "https://rapido.bike/careers", description_snippet: "Own Rapido's city-level P&L, driver supply, and demand-side operations. Drive market share in Bangalore and adjacent cities. ₹10-16 LPA.", posted_at: daysAgo(2), is_active: true },
  { external_id: "seed-rapido-002", source: "seed", title: "Data Analyst – Rider Insights", company_name: "Rapido", company_slug: "rapido", company_domain: "rapido.bike", location: "Bangalore", department: "Data", job_type: "Full-time", apply_url: "https://rapido.bike/careers", description_snippet: "Analyse rider behaviour, trip patterns, and churn to inform product decisions. Build SQL/Python pipelines and Tableau dashboards.", posted_at: daysAgo(5), is_active: true },

  // ── Zoho ──
  { external_id: "seed-zoho-001", source: "seed", title: "Software Engineer", company_name: "Zoho", company_slug: "zoho", company_domain: "zoho.com", location: "Chennai", department: "Engineering", job_type: "Full-time", apply_url: "https://careers.zohocorp.com", description_snippet: "Work on Zoho's suite of 55+ SaaS products used by 80M+ users worldwide. Strong Java/Python skills required. Freshers welcome. ₹6-18 LPA.", posted_at: daysAgo(10), is_active: true },
  { external_id: "seed-zoho-002", source: "seed", title: "Product Manager", company_name: "Zoho", company_slug: "zoho", company_domain: "zoho.com", location: "Chennai", department: "Product", job_type: "Full-time", apply_url: "https://careers.zohocorp.com", description_snippet: "Define and execute product strategy for one of Zoho's flagship products. Work directly with engineering and customer success. ₹18-30 LPA.", posted_at: daysAgo(12), is_active: true },

  // ── Navi ──
  { external_id: "seed-navi-001", source: "seed", title: "Software Engineer – Fintech", company_name: "Navi", company_slug: "navi", company_domain: "navi.com", location: "Bangalore", department: "Engineering", job_type: "Full-time", apply_url: "https://navi.com/careers", description_snippet: "Build Navi's lending, insurance, and UPI infrastructure serving millions of customers. Stack: Go, Kotlin, PostgreSQL, Kafka. ₹15-28 LPA.", posted_at: daysAgo(4), is_active: true },
  { external_id: "seed-navi-002", source: "seed", title: "Chief of Staff – Fintech", company_name: "Navi", company_slug: "navi", company_domain: "navi.com", location: "Bangalore", department: "Strategy", job_type: "Full-time", apply_url: "https://navi.com/careers", description_snippet: "Support Navi's leadership team on strategic initiatives, investor relations, and cross-functional execution. MBA from tier-1 institute preferred.", posted_at: daysAgo(8), is_active: true },

  // ── INDmoney ──
  { external_id: "seed-indmoney-001", source: "seed", title: "Product Manager – Investments", company_name: "INDmoney", company_slug: "indmoney", company_domain: "indmoney.com", location: "Gurugram", department: "Product", job_type: "Full-time", apply_url: "https://www.indmoney.com/careers", description_snippet: "Own the product roadmap for INDmoney's equity, MF, and US stocks features. Obsess over user activation and retention in India's fastest-growing wealth app. ₹20-35 LPA.", posted_at: daysAgo(3), is_active: true },

  // ── Jar ──
  { external_id: "seed-jar-001", source: "seed", title: "Growth Associate – Fintech", company_name: "Jar", company_slug: "jar", company_domain: "myjar.app", location: "Bangalore", department: "Growth", job_type: "Full-time", apply_url: "https://myjar.app/careers", description_snippet: "Drive user acquisition for Jar's digital-gold saving app targeting first-time investors in Tier 2/3 India. Manage referral programmes and performance campaigns. ₹6-10 LPA.", posted_at: daysAgo(2), is_active: true },
  { external_id: "seed-jar-002", source: "seed", title: "Software Engineer – Android", company_name: "Jar", company_slug: "jar", company_domain: "myjar.app", location: "Bangalore", department: "Engineering", job_type: "Full-time", apply_url: "https://myjar.app/careers", description_snippet: "Build and scale Jar's Android app used by 12M+ users. Kotlin, Jetpack Compose, MVVM. ₹12-22 LPA.", posted_at: daysAgo(6), is_active: true },

  // ── Ola ──
  { external_id: "seed-ola-001", source: "seed", title: "Software Engineer – Platform", company_name: "Ola", company_slug: "ola", company_domain: "olacabs.com", location: "Bangalore", department: "Engineering", job_type: "Full-time", apply_url: "https://ola.careers", description_snippet: "Work on Ola's core platform infrastructure — ride matching, pricing engine, and driver-app services. 3-6 years exp. ₹18-35 LPA.", posted_at: daysAgo(5), is_active: true },
  { external_id: "seed-ola-002", source: "seed", title: "Operations Manager – Ola Electric", company_name: "Ola", company_slug: "ola", company_domain: "olacabs.com", location: "Chennai", department: "Operations", job_type: "Full-time", apply_url: "https://ola.careers", description_snippet: "Own manufacturing operations and supply chain for Ola's EV scooter line. Drive quality, cost, and delivery targets at Ola's FutureFactory.", posted_at: daysAgo(9), is_active: true },
];
