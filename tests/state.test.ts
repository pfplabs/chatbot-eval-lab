import assert from "node:assert/strict";
import test from "node:test";
import { applyReply, createState } from "../typescript/state.ts";
import type { ConversationState, Message } from "../typescript/types.ts";

// Import the backend only after selecting offline: tests must never spend API credits.
process.argv.push("--offline");
const { respond } = await import("../typescript/chatbot.ts");

const history: Message[] = [
  { role: "user", content: "I want to return a product" },
  { role: "assistant", content: "What is your order number?" },
];

test("an identifier remains a string, does not set age, and bypasses the model", async () => {
  for (const order of ["29", "007123", "60"]) {
    const previous: ConversationState = { ...createState(), pendingQuestion: "order_number" };
    const answer = await respond(order, history, previous);
    assert.equal(answer.decision, "ask_days");
    assert.equal(answer.state.orderNumber, order);
    assert.equal(answer.state.daysSincePurchase, null);
    assert.equal(answer.state.pendingQuestion, "purchase_age");
    assert.equal(answer.trace.modelCalled, false);
    assert.equal(previous.orderNumber, null);
    assert.equal(previous.pendingQuestion, "order_number");
  }
});

test("a subsequent age reply and membership answer update different fields", async () => {
  const previous: ConversationState = { ...createState(), pendingQuestion: "order_number" };
  const first = await respond("007123", history, previous);
  const followupHistory: Message[] = [...history,
    { role: "user", content: "007123" }, { role: "assistant", content: first.text },
  ];
  const next = await respond("45", followupHistory, first.state);
  assert.equal(next.state.orderNumber, "007123");
  assert.equal(next.state.daysSincePurchase, 45);
  assert.equal(next.state.pendingQuestion, "membership");
  assert.equal(applyReply(next.state, "yes").isPremiumMember, true);
  assert.equal(applyReply(next.state, "no").isPremiumMember, false);
});

test("a fresh number does not become purchase age or call the model", async () => {
  assert.equal(applyReply(createState(), "29").daysSincePurchase, null);
  const answer = await respond("29");
  assert.equal(answer.decision, "no_context");
  assert.equal(answer.trace.modelCalled, false);
});

test("states are independent and reset creates empty facts", () => {
  const first = createState();
  const changed = applyReply(first, "I'm a premium member. I bought it 45 days ago.");
  assert.equal(changed.daysSincePurchase, 45);
  assert.equal(changed.isPremiumMember, true);
  assert.equal(first.daysSincePurchase, null);
  assert.deepEqual(createState(), first);
});
