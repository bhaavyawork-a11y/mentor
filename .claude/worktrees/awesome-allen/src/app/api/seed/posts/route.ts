import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: communities } = await supabase
    .from("communities")
    .select("id, slug")
    .in("slug", ["founders-office", "product", "growth"]);

  if (!communities || communities.length === 0) {
    return NextResponse.json({ error: "No communities found. Run migrations first." }, { status: 400 });
  }

  const commMap: Record<string, string> = {};
  for (const c of communities) commMap[c.slug] = c.id;

  const fo = commMap["founders-office"];
  const pm = commMap["product"];
  const gr = commMap["growth"];

  const posts = [
    // 3 Notes
    {
      author_id: user.id, community_id: fo, type: "note",
      content: "One year as Chief of Staff at a Series B startup and the biggest lesson: your job is to multiply the CEO's time, not manage their calendar. The real work is pattern recognition — connecting dots across teams before the CEO even knows there's a pattern to find.",
      tags: ["chiefofstaff", "startups", "career"],
    },
    {
      author_id: user.id, community_id: pm, type: "note",
      content: "Hot take: most PMs spend too much time on roadmaps and not enough time talking to users. I've done 3 customer calls this week and learned more than 3 months of analyzing dashboards. Dashboards tell you *what* happened. Users tell you *why*.",
      tags: ["productmanagement", "userresearch"],
    },
    {
      author_id: user.id, community_id: gr, type: "note",
      content: "Growth hack that actually works in 2025: fix your onboarding. I increased activation rate by 34% just by removing 2 steps from our signup flow. No ads. No new features. Just fewer friction points. Conversion is a product problem, not a marketing problem.",
      tags: ["growth", "onboarding", "conversion"],
    },
    // 3 Questions
    {
      author_id: user.id, community_id: fo, type: "question",
      content: "For those who've moved from EA/CoS to a full operating role (VP, Director, GM) — how did you make that transition? Did you get promoted internally or did you have to go external? My current CEO is great but the company is small and I'm not sure there's a path up.",
      tags: ["career", "transition", "chiefofstaff"],
    },
    {
      author_id: user.id, community_id: pm, type: "question",
      content: "What's your go-to framework for prioritizing between: (a) features that reduce churn, (b) features that improve NPS, (c) features that increase expansion revenue? They're all important but I'm struggling to make the call. How do you weigh retention vs growth?",
      tags: ["prioritization", "productstrategy"],
    },
    {
      author_id: user.id, community_id: gr, type: "question",
      content: "Anyone running performance marketing for a consumer fintech in India? CPAs have gone completely sideways since the Meta algorithm update in March. Would love to understand if it's sector-wide or if there's something we can optimize in our creative/landing page strategy.",
      tags: ["performance", "fintech", "meta"],
    },
    // 2 Wins
    {
      author_id: user.id, community_id: pm, type: "win",
      content: "🎉 Got the offer from Razorpay! Senior PM, Platform team. It took 6 rounds over 3 weeks, including a full product spec exercise, but it was worth it. Huge thanks to everyone in this community who reviewed my mock interviews — this place actually works.",
      tags: ["offer", "razorpay", "win"],
    },
    {
      author_id: user.id, community_id: fo, type: "win",
      content: "Passed the final round at a YC-backed startup for a CoS role. The CEO said I was the clearest communicator they'd interviewed. Mock interviews and prep here made the difference. If you're preparing — don't skip the \"what would you do in your first 90 days\" question, they will ask it.",
      tags: ["interview", "win", "chiefofstaff"],
    },
    // 2 Referral offers
    {
      author_id: user.id, community_id: pm, type: "referral_offer",
      content: "I'm a PM at Swiggy Instamart and we're hiring aggressively right now — Product Managers, Data Analysts, and Growth leads. Happy to refer strong candidates. Drop me a message with your CV and which role you're targeting. I'll pass it directly to the hiring manager.",
      tags: ["referral", "swiggy", "hiring"],
    },
    {
      author_id: user.id, community_id: gr, type: "referral_offer",
      content: "At CRED and we're looking for a Growth Marketing Lead. Great comp, fully in-office Bangalore. I can refer directly — bypasses the recruiter completely. Looking for someone with 3-5 years of performance marketing or CRM experience at a consumer startup. DM me.",
      tags: ["referral", "cred", "growth", "hiring"],
    },
  ];

  const { data, error } = await supabase.from("posts").insert(posts).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inserted: data?.length ?? 0, posts: data });
}
