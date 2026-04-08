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
    const { job, profile } = await req.json();

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Evaluate how well this candidate matches the job opening.

Job: ${JSON.stringify(job)}
Candidate profile: ${JSON.stringify(profile)}

Return ONLY a JSON object:
{
  "matchScore": <number 0-100>,
  "reasons": ["<reason this is a great match 1>", "<reason 2>", "<reason 3>"],
  "skillGaps": ["<gap 1>", "<gap 2>"]
}`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
    const data = extractJSON(text);
    return NextResponse.json(data);
  } catch (err) {
    console.error("job-match error:", err);
    return NextResponse.json({ error: "Match analysis failed" }, { status: 500 });
  }
}
