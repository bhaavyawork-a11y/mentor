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
    const { type, role, company, difficulty, count } = await req.json();

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Generate ${count} ${difficulty}-difficulty ${type} interview questions for a ${role || "general"} role${company ? ` at ${company}` : ""}.

${company ? `Tailor the questions to the style and culture of ${company} — be specific about their product, business model, or known interview style.` : ""}

Return ONLY a JSON object:
{
  "questions": [
    {
      "id": "q1",
      "text": "<the full interview question>",
      "type": "${type}",
      "tips": "<one short tip on what a great answer covers (max 20 words)>"
    }
  ]
}

Make questions specific, realistic, and progressively challenging.`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
    const data = extractJSON(text);
    return NextResponse.json(data);
  } catch (err) {
    console.error("mock-interview-questions error:", err);
    return NextResponse.json({ error: "Question generation failed" }, { status: 500 });
  }
}
