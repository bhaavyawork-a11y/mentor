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
    const { question, answer, role } = await req.json();

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      system: "You are an expert interviewer for Indian tech startups and global tech companies. Evaluate interview answers honestly and constructively.",
      messages: [
        {
          role: "user",
          content: `Evaluate this interview answer for a ${role || "general"} role.

Question: ${question}

Candidate's Answer: ${answer}

Return ONLY a JSON object:
{
  "score": <number 1-10>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "modelAnswer": "<a concise model answer in 3-5 sentences>",
  "keyPoints": ["<key point 1>", "<key point 2>", "<key point 3>", "<key point 4>"]
}`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
    const data = extractJSON(text);
    return NextResponse.json(data);
  } catch (err) {
    console.error("question-feedback error:", err);
    return NextResponse.json({ error: "Feedback generation failed" }, { status: 500 });
  }
}
