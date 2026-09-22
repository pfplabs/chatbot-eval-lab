import type { ConversationState, Decision } from "./types.ts";

export function createState(): ConversationState {
  return { pendingQuestion: null, daysSincePurchase: null, isPremiumMember: null, orderNumber: null };
}

// Return a copy: a failed API call must not commit half a conversation turn.
export function applyReply(previous: ConversationState, question: string): ConversationState {
  const state = { ...previous };
  const reply = question.trim();
  if (state.pendingQuestion === "order_number" && /^\d+$/.test(reply)) {
    state.orderNumber = reply;
    state.pendingQuestion = null;
    return state;
  }
  const days = [...reply.matchAll(/\b(\d+) days?\b/gi)].at(-1)?.[1];
  if (days !== undefined) state.daysSincePurchase = Number(days);
  else if (state.pendingQuestion === "purchase_age" && /^\d+$/.test(reply)) {
    state.daysSincePurchase = Number(reply);
  }
  const membership = [...reply.toLowerCase().matchAll(/\b(not a premium|a premium|standard) member\b/g)].at(-1)?.[1];
  if (membership !== undefined) state.isPremiumMember = membership === "a premium";
  else if (state.pendingQuestion === "membership") {
    if (/^yes[.!]?$/i.test(reply)) state.isPremiumMember = true;
    if (/^no[.!]?$/i.test(reply)) state.isPremiumMember = false;
  }
  return state;
}

export function recordNextQuestion(state: ConversationState, decision: Decision): ConversationState {
  return { ...state, pendingQuestion: decision === "ask_days" ? "purchase_age" : decision === "ask_membership" ? "membership" : null };
}
