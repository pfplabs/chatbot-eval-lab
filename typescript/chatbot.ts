import { generateAnswer } from "./backend.ts";
import type { Answer, ConversationState, Message } from "./types.ts";
import { applyReply, createState, recordNextQuestion } from "./state.ts";

const POLICY =
  "Returns are accepted within 30 days. " +
  "Premium members may return items within 60 days.";

export function retrieve(question: string): string {
  // A tiny stand-in for document retrieval.
  return question.toLowerCase().includes("return") ? POLICY : "";
}

export async function respond(question: string, history: Message[] = [], previousState: ConversationState = createState()) {
  const state = applyReply(previousState, question);
  const conversation = history.filter((message) => message.role === "user" || message.role === "assistant");
  const retrievalQuery = [...conversation.filter((message) => message.role === "user")
    .map((message) => message.content), question].join("\n");
  const context = retrieve(retrievalQuery);
  const messages: Message[] = [
    {
      role: "system",
      content:
        "Answer customer questions using the provided policy. " +
        "Be concise and give a direct answer. " +
        "Only ask about missing membership when the purchase was more than 30 " +
        "but no more than 60 days ago. Purchases older than 60 days are ineligible. " +
        "If purchase age is missing, ask how many days ago the item was purchased. " +
        "If the purchase was at most 30 days ago, it is eligible regardless of membership. " +
        "Interpret short replies using the immediately preceding assistant question. " +
        "Do not treat order numbers or other identifiers as purchase ages. " +
        "Use facts already provided in the conversation instead of asking for them again. " +
        "When you ask for an order number and the user replies '12345', " +
        "that supplies an order number, not a purchase age. Ask for purchase age if unknown. "
    },
    {
      role: "developer",
      content: `Reference policy:\n${context || "No relevant policy found."}`,
    },
    {
      role: "developer",
      content: `Application-tracked facts (null means not captured; do not infer purchase age from orderNumber): ${JSON.stringify(state)}`,
    },
    ...conversation,
    {
      role: "user",
      content: `Policy:\n${context}\n\nQuestion:\n${question}`,
    },
  ];
  function finish(answer: Answer, modelCalled: boolean) {
    return {
      ...answer,
      state: recordNextQuestion(state, answer.decision),
      trace: { context, messages, modelCalled, stateBefore: previousState, stateAfterReply: state },
    };
  }
  if (!context) {
    return finish({
      decision: "no_context" as const,
      text: "I couldn't find a relevant policy. Could you describe what you need help with?",
    }, false);
  }
  // A bare identifier answers the order-number question, never the age question.
  if (previousState.pendingQuestion === "order_number" && /^\d+$/.test(question.trim()) && state.daysSincePurchase === null) {
    return finish({ decision: "ask_days", text: "How many days ago did you buy it?" }, false);
  }
  const answer = await generateAnswer(messages);
  return { ...finish(answer, true), metadata: answer.metadata };
}
