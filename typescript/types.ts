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

export type EvalCase = {
  id: string;
  category: string;
  question: string;
  history?: Message[];
  expected: Decision;
};
