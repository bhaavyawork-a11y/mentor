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
    const body = await req.json();

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      system: "You are a compensation expert for Indian tech startups and global tech companies. You have deep knowledge of salary benchmarks, equity packages, and benefits in the Indian startup ecosystem. Evaluate job offers against realistic market data.",
      messages: [
        {
          role: "user",
          content: `Evaluate this job offer against market benchmarks for India.

Offer details:
- Company: ${body.company}
- Role: ${body.role}
- Base salary: ₹${body.baseSalary}
- Total CTC: ₹${body.totalCTC}
- Variable %: ${body.variablePercent || 0}%
- Company stage: ${body.stage}
- Location: ${body.location}
- Candidate experience: ${body.experience} years

Return ONLY a JSON object:
{
  "verdict": "Fair" | "Below market" | "Above market" | "Strong offer",
  "explanation": "<one sentence verdict explanation>",
  "baseVsMarket": {
    "yourBase": ${body.baseSalary},
    "marketMedian": <realistic market median in rupees>,
    "percentageDiff": <% above or below, negative if below>
  },
  "percentile": <number 1-100, what percentile this CTC is>,
  "growthScore": <number 1-10, growth/career potential>,
  "benefitsAssessment": "<e.g. Missing ESOPs, Strong package, Equity-heavy>",
  "whatIsGood": ["<positive 1>", "<positive 2>", "<positive 3>"],
  "whatToNegotiate": ["<negotiation point 1>", "<negotiation point 2>", "<negotiation point 3>"],
  "negotiationScript": "<a 3-4 sentence professional email asking for more compensation, specific and respectful>"
}`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
    const data = extractJSON(text);
    return NextResponse.json(data);
  } catch (err) {
    console.error("offer-evaluate error:", err);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
