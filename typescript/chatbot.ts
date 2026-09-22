import { generateAnswer } from "./backend.ts";
import type { Message } from "./types.ts";

const POLICY = "Returns are accepted within 30 days. Premium members may return items within 60 days.";

export function retrieve(question: string): string {
  return question.toLowerCase().includes("return") ? POLICY : "";
}

export async function respond(question: string, history: Message[] = []) {
  const conversation = history.filter((message) => message.role === "user" || message.role === "assistant");
  const query = [...conversation.filter((message) => message.role === "user").map((message) => message.content), question].join("\n");
  const context = retrieve(query);
  const messages: Message[] = [
    { role: "system", content: "Answer customer questions using the provided policy. Be concise and give a direct answer. If member status is missing and changes eligibility, ask a clarifying question." },
    ...conversation,
    { role: "user", content: `Policy:\n${context}\n\nQuestion:\n${question}` },
  ];
  const answer = await generateAnswer(messages);
  return { ...answer, trace: { context, messages } };
}
