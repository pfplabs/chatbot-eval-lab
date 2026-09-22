import { existsSync, readFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { generate } from "./model.ts";
import type { Answer, Message } from "./types.ts";

const envPath = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envPath)) loadEnvFile(envPath);

export const backend = process.argv.includes("--offline") ? "offline" : "openai";
export const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const schema = JSON.parse(readFileSync(new URL("../answer.schema.json", import.meta.url), "utf8"));

export async function generateAnswer(messages: Message[]) {
  const started = performance.now();
  if (backend === "offline") {
    return { ...generate(messages), metadata: { backend, model: "simulator", latency_ms: Math.round(performance.now() - started) } };
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY. Set it in .env or use --offline.");

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model, input: messages, store: false, max_output_tokens: 512,
        text: { format: { type: "json_schema", name: "support_answer", strict: true, schema } },
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    // Never include request headers or the key in errors or traces.
    throw new Error("OpenAI network request failed or timed out. Check connectivity.");
  }
  if (!response.ok) {
    throw new Error(`OpenAI HTTP ${response.status}. Check API key, billing, rate limits, and model access.`);
  }
  const payload = await response.json();
  if (payload.status !== "completed") throw new Error(`OpenAI response did not complete (${payload.status}).`);
  const content = payload.output.flatMap((item: { content?: { type: string; text?: string }[] }) => item.content ?? []);
  if (content.some((part: { type: string }) => part.type === "refusal")) throw new Error("Model refused the request.");
  const text = content.filter((part: { type: string }) => part.type === "output_text")
    .map((part: { text?: string }) => part.text ?? "").join("");
  let answer: Answer;
  try {
    answer = JSON.parse(text);
    if (!answer || !schema.properties.decision.enum.includes(answer.decision) || typeof answer.text !== "string") {
      throw new Error();
    }
  } catch {
    throw new Error("Model returned an invalid answer object.");
  }
  return {
    ...answer,
    metadata: { backend, model: payload.model, latency_ms: Math.round(performance.now() - started), usage: payload.usage, response_id: payload.id },
  };
}
