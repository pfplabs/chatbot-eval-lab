/**
 * Deterministic model simulator, matching model.py.
 * The 'ask', 'missing', 'member' keyword convention below is a local simulation
 * mechanism, not evidence of real LLM behavior.
 */
import type { Answer, Decision, Message } from "./types.ts";

const QUESTION_SEPARATOR = "\n\nQuestion:\n";

type CustomerFacts = {
  daysSincePurchase: number | null;
  isPremiumMember: boolean | null;
};

export function generate(messages: Message[]): Answer {
  const userMessages = getMessageContents(messages, "user");
  const policy = extractPolicy(userMessages);
  const facts = extractCustomerFacts(messages);
  const systemInstructions = getMessageContents(messages, "system").join(" ");
  const shouldClarify = allowsMembershipClarification(systemInstructions);

  return decideReturnEligibility(policy, facts, shouldClarify);
}

function getMessageContents(messages: Message[], role: Message["role"]): string[] {
  return messages
    .filter((message) => message.role === role)
    .map((message) => message.content);
}

function extractPolicy(userMessages: string[]): string {
  const latest = userMessages.at(-1);
  if (latest === undefined) throw new Error("Expected a user message");

  const boundary = latest.indexOf(QUESTION_SEPARATOR);
  if (boundary === -1) throw new Error("Expected Policy/Question request format");

  return latest.slice(0, boundary).replace(/^Policy:\n/, "");
}

function extractCustomerFacts(messages: Message[]): CustomerFacts {
  // Only user statements supply customer facts, never policy text.
  const statements = messages.flatMap((message, index) => {
    if (message.role !== "user") return [];
    const statement = message.content.split(QUESTION_SEPARATOR).at(-1)!.trim();
    const previous = messages[index - 1];
    // Interpret short answers only after the corresponding simulator question.
    if (previous?.role === "assistant") {
      if (previous.content === "How many days ago did you buy it?" && /^\d+$/.test(statement)) {
        return [`${statement} days`];
      }
      if (previous.content === "Are you a premium member?") {
        if (/^yes[.!]?$/i.test(statement)) return ["a premium member"];
        if (/^no[.!]?$/i.test(statement)) return ["not a premium member"];
      }
    }
    return [statement];
  });
  const customerText = statements.join(" ").toLowerCase();
  const dayMatches = [...customerText.matchAll(/\b(\d+) days?\b/g)];
  const membershipMatches = [
    ...customerText.matchAll(/\b(not a premium|a premium|standard) member\b/g),
  ];

  // The last matching statement wins; null means the customer hasn't told us.
  const lastDays = dayMatches.at(-1)?.[1];
  const lastMembership = membershipMatches.at(-1)?.[1];
  return {
    daysSincePurchase: lastDays === undefined ? null : Number(lastDays),
    isPremiumMember: lastMembership === undefined ? null : lastMembership === "a premium",
  };
}

function allowsMembershipClarification(systemInstructions: string): boolean {
  // Simulator convention only: this is not how an actual LLM interprets prompts.
  const instructions = systemInstructions.toLowerCase();
  return ["ask", "missing", "member"].every((word) => instructions.includes(word));
}

function decideReturnEligibility(
  policy: string,
  facts: CustomerFacts,
  shouldClarify: boolean,
): Answer {
  const { daysSincePurchase, isPremiumMember } = facts;

  if (!policy) return result("no_context", "I couldn't find a relevant policy.");
  if (daysSincePurchase === null) {
    return result("ask_days", "How many days ago did you buy it?");
  }
  if (daysSincePurchase <= 30) {
    return result("eligible", "Yes, you're within the 30-day return window.");
  }
  if (daysSincePurchase > 60) {
    return result("ineligible", "This is outside both return windows.");
  }
  if (isPremiumMember === true) {
    return result("eligible", "Yes, premium members have a 60-day return window.");
  }
  if (isPremiumMember === null && shouldClarify) {
    return result("ask_membership", "Are you a premium member?");
  }
  return result("ineligible", "No. Returns are only accepted within 30 days.");
}

function result(decision: Decision, text: string): Answer {
  return { decision, text };
}
