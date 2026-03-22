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
    const { role, company, industry, description } = await req.json();

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Generate 5 strong resume bullet points for the following position:
Role: ${role}
Company: ${company || "a company"}
Industry: ${industry || "technology"}
${description ? `Context: ${description}` : ""}

Each bullet should:
- Start with a strong action verb
- Include quantifiable metrics where possible (%, $, numbers)
- Be concise (under 20 words)
- Be ATS-friendly

Return ONLY a JSON object: { "bullets": ["bullet 1", "bullet 2", "bullet 3", "bullet 4", "bullet 5"] }`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
    const data = extractJSON(text);
    return NextResponse.json(data);
  } catch (err) {
    console.error("resume-bullets error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
