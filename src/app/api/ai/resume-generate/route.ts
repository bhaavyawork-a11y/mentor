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
    const { personalInfo, experience, education, skills, targetRole } = await req.json();

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Create a polished, ATS-optimised resume for:

Personal Info: ${JSON.stringify(personalInfo)}
Target Role: ${targetRole || "the next step in their career"}
Experience: ${JSON.stringify(experience)}
Education: ${JSON.stringify(education)}
Skills: ${JSON.stringify(skills)}

Return ONLY a JSON object with this structure:
{
  "summary": "<2-3 sentence professional summary tailored to the target role>",
  "experience": [
    {
      "title": "<job title>",
      "company": "<company>",
      "duration": "<duration>",
      "bullets": ["<bullet 1>", "<bullet 2>", "<bullet 3>"]
    }
  ],
  "education": [
    {
      "degree": "<degree>",
      "school": "<school>",
      "year": "<year>",
      "highlights": "<any honours or relevant details>"
    }
  ],
  "skills": {
    "technical": ["<skill>"],
    "soft": ["<skill>"]
  }
}`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
    const data = extractJSON(text);
    return NextResponse.json({ resume: data });
  } catch (err) {
    console.error("resume-generate error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
