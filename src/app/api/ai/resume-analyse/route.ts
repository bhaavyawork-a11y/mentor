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
    const { fileBase64, mimeType, resumeText, targetRole } = await req.json();

    const userContent: Anthropic.MessageParam["content"] = [];

    if (fileBase64 && mimeType) {
      userContent.push({
        type: "document",
        source: { type: "base64", media_type: mimeType, data: fileBase64 },
      } as Anthropic.DocumentBlockParam);
    } else if (resumeText) {
      userContent.push({ type: "text", text: `Resume content:\n${resumeText}` });
    }

    userContent.push({
      type: "text",
      text: `Analyse this resume for the target role: "${targetRole || "general"}".

Return ONLY a JSON object with this exact structure:
{
  "atsScore": <number 0-100>,
  "impactScore": <number 0-100>,
  "gapScore": <number 0-100>,
  "atsReason": "<one sentence explaining the ATS score>",
  "impactReason": "<one sentence explaining the impact score>",
  "gapReason": "<one sentence explaining the gap score>",
  "criticalIssues": ["<issue 1>", "<issue 2>", "<issue 3>"],
  "quickWins": ["<win 1>", "<win 2>", "<win 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>", "<improvement 4>", "<improvement 5>"],
  "lineSuggestions": [
    { "original": "<original text>", "improved": "<improved text>", "reason": "<why>" },
    { "original": "<original text>", "improved": "<improved text>", "reason": "<why>" },
    { "original": "<original text>", "improved": "<improved text>", "reason": "<why>" }
  ]
}`,
    });

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: userContent }],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
    const data = extractJSON(text);

    return NextResponse.json(data);
  } catch (err) {
    console.error("resume-analyse error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
