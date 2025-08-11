import OpenAI from "openai";

export type StyleGuide = {
  voice: { adjectives: string[]; cadence: string; formality: "casual"|"neutral"|"formal" };
  preferredPhrases: string[];
  avoid: string[];
  formatting: { greeting: string; closing: string; signaturePlaceholder: string };
  replyPatterns: { shortFollowUp: string; showingRequest: string; cmaOffer: string };
  meta?: { version?: number; generatedAt?: string };
};

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function buildStyleGuide(input:{
  fullName?:string;
  adjectives:string[];
  do:string[];
  dont:string[];
  sampleEmails:string[];
  signature?:string;
}): Promise<StyleGuide> {
  const sys = `You create concise JSON style guides for writing real-estate emails. Keep it practical and reusable. Return STRICT JSON only.`;
  const user = `
Agent: ${input.fullName || ""}
Tone adjectives: ${input.adjectives.join(", ")}
Do (examples of what to do): ${input.do.join(" | ")}
Don't: ${input.dont.join(" | ")}
Sample emails (agent wrote):\n${input.sampleEmails.map((s,i)=>`[${i+1}] ${s}`).join("\n")}
Signature: ${input.signature || "(none)"}
Return JSON with keys: voice, preferredPhrases, avoid, formatting, replyPatterns.
`;
  const r = await (client as any).responses.create({ model: "gpt-5.1", input:[{role:"system",content:sys},{role:"user",content:user}], temperature:0.2 });
  const text = (r.output_text || "{}").trim();
  const parsed = JSON.parse(text) as StyleGuide;
  return { ...parsed, meta: { ...(parsed.meta||{}), generatedAt: new Date().toISOString() } };
}


