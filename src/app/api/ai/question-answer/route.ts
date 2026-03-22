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
    const { question, role, company } = await req.json();

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      system: "You are an expert career coach and interview strategist specialising in Indian tech startups and global tech companies. Provide expert-level model answers.",
      messages: [
        {
          role: "user",
          content: `Provide an expert model answer for this interview question.

Question: ${question}
Role: ${role || "general"}
Company: ${company || "a tech company"}

Return ONLY a JSON object:
{
  "answer": "<detailed model answer in 4-6 sentences using STAR or structured frameworks where relevant>",
  "keyPoints": ["<key point 1>", "<key point 2>", "<key point 3>", "<key point 4>", "<key point 5>"],
  "commonMistakes": ["<mistake to avoid 1>", "<mistake to avoid 2>", "<mistake to avoid 3>"]
}`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
    const data = extractJSON(text);
    return NextResponse.json(data);
  } catch (err) {
    console.error("question-answer error:", err);
    return NextResponse.json({ error: "Answer generation failed" }, { status: 500 });
  }
}
