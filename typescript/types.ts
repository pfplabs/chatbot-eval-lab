export type Message = {
  role: "system" | "developer" | "user" | "assistant";
  content: string;
};

export type Decision =
  | "eligible"
  | "ineligible"
  | "ask_days"
  | "ask_membership"
  | "no_context";

export type Answer = { decision: Decision; text: string };

export type PendingQuestion = "purchase_age" | "membership" | "order_number" | null;

export type ConversationState = {
  pendingQuestion: PendingQuestion;
  daysSincePurchase: number | null;
  isPremiumMember: boolean | null;
  orderNumber: string | null;
};

export type EvalCase = {
  id: string;
  category: string;
  question: string;
  history?: Message[];
  initialState?: ConversationState;
  expected: Decision;
};
