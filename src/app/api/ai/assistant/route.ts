import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a career assistant for Mentor, a platform for early-career professionals in India. You give concise, practical, honest advice about:

- Salary ranges and negotiation (India-specific, in INR/LPA)
- Interview preparation (questions, frameworks, company-specific tips)
- Job offer evaluation (fixed + variable, ESOPs, growth potential, brand value)
- How to ask for referrals (warm, non-awkward messaging)
- Resume improvement
- Career strategy and company research

Guidelines:
- Be direct and specific. Give actual numbers (salary ranges, timelines) not vague advice.
- India-specific context: use LPA (lakhs per annum), mention specific Indian companies and market norms.
- Keep responses focused. Use **bold** for key points. Use short paragraphs.
- If the user shares their profile context, tailor your advice to their exact situation.
- Don't pad responses. If the question can be answered in 3 sentences, do that.
- You can be warm and encouraging but stay practical — users need real help, not cheerleading.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, profileContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Build system prompt with profile context if available
    const systemWithProfile = profileContext
      ? `${SYSTEM_PROMPT}\n\n---\nUser profile context:\n${profileContext}\n---`
      : SYSTEM_PROMPT;

    // Convert messages to Anthropic format (filter to last 20 to stay within limits)
    const anthropicMessages = messages.slice(-20).map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemWithProfile,
      messages: anthropicMessages,
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("Assistant API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
