import Anthropic from "@anthropic-ai/sdk";
import type { SleepReport } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";

const SYSTEM_PROMPT = `You are a sleep coach analyzing one night of contactless monitor data.

Output ONLY a single JSON object with this exact shape:

{
  "headline": "one short sentence summarizing the night",
  "sleep_score": <0-100 integer>,
  "stage_pct": { "awake": <%>, "light": <%>, "deep": <%> },
  "vitals": { "avg_breathing": <bpm>, "avg_heart_rate": <bpm> },
  "wake_events": [{ "ts": "HH:MM", "likely_cause": "noise spike at 58 dB" }],
  "recommendations": ["one specific suggestion for tonight"]
}

Tone: calm, friendly, concise. No emoji. No prose outside the JSON.`;

export async function generateSleepReport(csvData: string): Promise<SleepReport> {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: `Here is one night of telemetry, one row per minute:\n\n${csvData}\n\nGenerate the JSON report.`,
      },
    ],
  });
  const text = resp.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in Claude response");
  return JSON.parse(match[0]) as SleepReport;
}
