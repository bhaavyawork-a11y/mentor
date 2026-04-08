import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

interface ScreeningQuestion {
  id: string;
  question: string;
  placeholder?: string;
}

interface Community {
  id: string;
  name: string;
  role_type: string;
  screening_questions: ScreeningQuestion[];
  requires_verification: boolean;
}

// ─── Build the Groq evaluation prompt ────────────────────────────────────────
function buildEvalPrompt(community: Community, answers: Record<string, string>): string {
  const qaText = community.screening_questions
    .map((q: ScreeningQuestion) => {
      const answer = answers[q.id] ?? "(no answer provided)";
      return `Q: ${q.question}\nA: ${answer}`;
    })
    .join("\n\n");

  return `You are evaluating a membership application for "${community.name}", an exclusive professional community for ${community.role_type || community.name} professionals.

Your job is to assess whether this applicant is genuinely working in this field and would add value to the community. Be strict but fair — this is a gated community that maintains high quality.

SCREENING ANSWERS:
${qaText}

EVALUATION CRITERIA:
1. Relevance — Are their answers clearly from someone working in ${community.role_type || community.name}? (0-30 points)
2. Specificity — Do they give real numbers, company names, concrete examples? Vague answers score low. (0-30 points)
3. Quality of thinking — Does the applicant demonstrate strong professional reasoning? (0-25 points)
4. Completeness — Did they answer all questions meaningfully, not just "N/A" or one-liners? (0-15 points)

APPROVAL THRESHOLD: Score ≥ 70 = approved. Score < 70 = rejected.

Respond with ONLY valid JSON (no markdown, no explanation outside the JSON):
{
  "score": <number 0-100>,
  "decision": "approved" | "rejected",
  "feedback": "<2-3 sentence personalised feedback explaining the decision. If approved: welcome them and highlight what impressed you. If rejected: be honest, specific about why, and encourage them to apply again once they have more relevant experience to share>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "areas_to_improve": ["<area 1>"]
}`;
}

export async function POST(req: NextRequest) {
  try {
    // ─── Auth check ──────────────────────────────────────────────────────────
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options ?? {})
              );
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ─── Parse request ────────────────────────────────────────────────────────
    const { community_id, answers } = await req.json() as {
      community_id: string;
      answers: Record<string, string>;
    };

    if (!community_id || !answers) {
      return NextResponse.json({ error: "community_id and answers are required" }, { status: 400 });
    }

    // ─── Fetch community ──────────────────────────────────────────────────────
    const { data: community, error: communityErr } = await supabase
      .from("communities")
      .select("id, name, role_type, screening_questions, requires_verification")
      .eq("id", community_id)
      .single();

    if (communityErr || !community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // ─── Check for existing application / membership ──────────────────────────
    const { data: existingMember } = await supabase
      .from("community_members")
      .select("status")
      .eq("community_id", community_id)
      .eq("user_id", user.id)
      .single();

    if (existingMember?.status === "approved") {
      return NextResponse.json({ error: "Already a member of this community" }, { status: 409 });
    }

    const { data: existingApp } = await supabase
      .from("community_applications")
      .select("id, status, ai_score, ai_feedback")
      .eq("community_id", community_id)
      .eq("user_id", user.id)
      .single();

    // If already pending, return existing status
    if (existingApp?.status === "pending") {
      return NextResponse.json({
        status: "pending",
        message: "Your application is already being reviewed.",
      });
    }

    // ─── Skip verification for communities that don't require it ─────────────
    if (!community.requires_verification) {
      // Direct approval
      const { error: memberErr } = await supabase
        .from("community_members")
        .upsert({ community_id, user_id: user.id, status: "approved" });

      if (memberErr) {
        return NextResponse.json({ error: "Failed to join community" }, { status: 500 });
      }

      return NextResponse.json({ status: "approved", score: 100, feedback: `Welcome to ${community.name}!` });
    }

    // ─── AI Evaluation via Groq ───────────────────────────────────────────────
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI evaluation unavailable" }, { status: 500 });
    }

    const prompt = buildEvalPrompt(community as Community, answers);

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 512,
        temperature: 0.3, // Low temp for consistent evaluation
        stream: false,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq evaluation error:", groqRes.status, errText);
      return NextResponse.json({ error: "AI evaluation failed" }, { status: 502 });
    }

    const groqData = await groqRes.json();
    let evaluation: {
      score: number;
      decision: "approved" | "rejected";
      feedback: string;
      strengths?: string[];
      areas_to_improve?: string[];
    };

    try {
      const content = groqData.choices?.[0]?.message?.content ?? "{}";
      evaluation = JSON.parse(content);
    } catch {
      console.error("Failed to parse Groq JSON:", groqData.choices?.[0]?.message?.content);
      return NextResponse.json({ error: "AI evaluation parse error" }, { status: 500 });
    }

    const { score, decision, feedback } = evaluation;
    const isApproved = decision === "approved" && score >= 70;

    // ─── Save application record ──────────────────────────────────────────────
    const appData = {
      user_id: user.id,
      community_id,
      answers,
      status: isApproved ? "approved" : "rejected",
      ai_score: score,
      ai_feedback: feedback,
    };

    if (existingApp) {
      // Update the rejected application (re-application)
      await supabase
        .from("community_applications")
        .update(appData)
        .eq("id", existingApp.id);
    } else {
      await supabase
        .from("community_applications")
        .insert(appData);
    }

    // ─── If approved, create community_members record ─────────────────────────
    if (isApproved) {
      await supabase
        .from("community_members")
        .upsert({ community_id, user_id: user.id, status: "approved" });

      // Bump member_count (best-effort, no crash if RPC missing)
      try {
        await supabase.rpc("increment_member_count", { community_id_arg: community_id });
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      status: isApproved ? "approved" : "rejected",
      score,
      feedback,
      strengths: evaluation.strengths ?? [],
      areas_to_improve: evaluation.areas_to_improve ?? [],
    });

  } catch (error) {
    console.error("Apply API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
