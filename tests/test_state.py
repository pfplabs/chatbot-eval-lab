import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.argv.append("--offline")
from chatbot import respond
from state import apply_reply, create_state
sys.argv.remove("--offline")

HISTORY = [
    {"role": "user", "content": "I want to return a product"},
    {"role": "assistant", "content": "What is your order number?"},
]


class ConversationStateTests(unittest.TestCase):
    def test_identifiers_do_not_become_ages(self):
        for order in ["29", "007123", "60"]:
            with self.subTest(order=order):
                previous = {**create_state(), "pendingQuestion": "order_number"}
                answer = respond(order, HISTORY, previous)
                self.assertEqual(answer["decision"], "ask_days")
                self.assertEqual(answer["state"]["orderNumber"], order)
                self.assertIsNone(answer["state"]["daysSincePurchase"])
                self.assertEqual(answer["state"]["pendingQuestion"], "purchase_age")
                self.assertFalse(answer["trace"]["modelCalled"])
                self.assertIsNone(previous["orderNumber"])
                self.assertEqual(previous["pendingQuestion"], "order_number")

    def test_sequential_age_and_membership(self):
        first = respond("007123", HISTORY, {**create_state(), "pendingQuestion": "order_number"})
        history = HISTORY + [{"role": "user", "content": "007123"}, {"role": "assistant", "content": first["text"]}]
        next_answer = respond("45", history, first["state"])
        state = next_answer["state"]
        self.assertEqual(state["orderNumber"], "007123")
        self.assertEqual(state["daysSincePurchase"], 45)
        self.assertEqual(state["pendingQuestion"], "membership")
        self.assertTrue(apply_reply(state, "yes")["isPremiumMember"])
        self.assertFalse(apply_reply(state, "no")["isPremiumMember"])

    def test_fresh_number(self):
        self.assertIsNone(apply_reply(create_state(), "29")["daysSincePurchase"])
        answer = respond("29")
        self.assertEqual(answer["decision"], "no_context")
        self.assertFalse(answer["trace"]["modelCalled"])

    def test_state_isolation_and_reset(self):
        previous = create_state()
        changed = apply_reply(previous, "I'm a premium member. I bought it 45 days ago.")
        self.assertEqual(changed["daysSincePurchase"], 45)
        self.assertTrue(changed["isPremiumMember"])
        self.assertIsNone(previous["daysSincePurchase"])
        self.assertEqual(create_state(), previous)


if __name__ == "__main__":
    unittest.main()
