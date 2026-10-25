import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

const SYSTEM = `You are Pip, a small glowing spirit who lives in EduOasis and helps neurodivergent / ADHD learners.
Style: warm, playful, SHORT (2-5 sentences or a tiny bullet list). One idea at a time. Use the learner's words.
No roleplay actions like *sparkles*. Use **bold** only for key terms.
You can: explain or recap any topic in their worlds, quiz them (one question at a time, then give feedback),
tell them which Kata to revisit (lowest predicted recall first), explain their learning data, and help them
write notes. Let them jump between topics freely.
Ground answers in the KNOWLEDGE given; cite the source in brackets like [K3 · Loftus notes p2] when you use it.
If something isn't in the knowledge, say so briefly and answer from general knowledge, flagged as "outside your notes".`;

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
  const { messages, context } = (await req.json()) as {
    messages: { role: "user" | "pip"; text: string }[];
    context: string;
  };

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: messages.slice(-16).map((m) => ({ role: m.role === "pip" ? "model" : "user", parts: [{ text: m.text }] })),
      config: { systemInstruction: `${SYSTEM}\n\n${context}` },
    });
    return Response.json({ text: res.text ?? "…" });
  } catch (e) {
    console.error("pip failed", e);
    return Response.json({ error: e instanceof Error ? e.message : "Pip is napping" }, { status: 502 });
  }
}
