import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJSON(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return JSON.parse(fenced[1].trim());
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) return JSON.parse(text.slice(start, end + 1));
  return JSON.parse(text);
}

export async function POST(req: NextRequest) {
  try {
    const { questions, role, company, type, difficulty } = await req.json();

    const XP_MAP: Record<string, number> = { Easy: 50, Medium: 100, Hard: 150 };
    const baseXP = XP_MAP[difficulty as string] ?? 100;

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: "You are an expert interviewer at top Indian tech companies including Razorpay, CRED, Zepto, PhonePe, and Swiggy. Evaluate interview answers holistically and give constructive, specific feedback.",
      messages: [
        {
          role: "user",
          content: `Evaluate these ${type} interview answers for a ${role || "general"} role${company ? ` at ${company}` : ""}.

Questions and answers:
${(questions as { question: string; answer: string }[]).map((qa, i) => `Q${i + 1}: ${qa.question}\nAnswer: ${qa.answer || "(No answer given)"}`).join("\n\n")}

Return ONLY a JSON object:
{
  "overallScore": <number 1-10, one decimal>,
  "level": "Strong candidate" | "Good candidate" | "Needs preparation" | "Not ready yet",
  "xpEarned": <number — scale ${baseXP} by score quality, max ${baseXP * 2}>,
  "questionScores": [
    {
      "score": <number 1-10>,
      "strengths": ["<specific strength 1>", "<specific strength 2>"],
      "improvements": ["<specific improvement 1>", "<specific improvement 2>"],
      "modelAnswer": "<what a strong answer looks like in 3-4 sentences>"
    }
  ],
  "topStrengths": ["<overall strength 1>", "<overall strength 2>", "<overall strength 3>"],
  "topImprovements": ["<key improvement 1>", "<key improvement 2>", "<key improvement 3>"],
  "nextStep": "<one actionable recommendation for what to do next>"
}`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
    const data = extractJSON(text) as Record<string, unknown>;
    return NextResponse.json(data);
  } catch (err) {
    console.error("mock-interview-evaluate error:", err);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
