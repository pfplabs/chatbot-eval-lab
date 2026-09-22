"""Deterministic model simulator. Read its limitations before interpreting evals.

Contract: returns a decision and user-facing text. It recognizes a clarification
instruction when the system message contains 'ask', 'missing', and 'member'.
That keyword convention is only a local simulation mechanism, not LLM behavior.
"""

import re


def generate(messages):
    system = " ".join(m["content"] for m in messages if m["role"] == "system").lower()
    user_messages = [m["content"] for m in messages if m["role"] == "user"]
    latest = user_messages[-1]
    policy, question = latest.split("\n\nQuestion:\n", 1)
    policy = policy.removeprefix("Policy:\n")
    # Only user statements supply customer facts, never policy text.
    statements = extract_customer_statements(messages)
    customer_text = " ".join(statements).lower()
    days = re.findall(r"\b(\d+) days?\b", customer_text)
    membership = re.findall(r"\b(not a premium|a premium|standard) member\b", customer_text)
    premium = None if not membership else membership[-1] == "a premium"

    def result(decision, text):
        return {"decision": decision, "text": text}

    if not policy:
        return result("no_context", "I couldn't find a relevant policy.")
    if not days:
        return result("ask_days", "How many days ago did you buy it?")
    age = int(days[-1])
    if age <= 30:
        return result("eligible", "Yes, you're within the 30-day return window.")
    if age > 60:
        return result("ineligible", "This is outside both return windows.")
    if premium is True:
        return result("eligible", "Yes, premium members have a 60-day return window.")
    clarify = all(word in system for word in ("ask", "missing", "member"))
    if premium is None and clarify:
        return result("ask_membership", "Are you a premium member?")
    return result("ineligible", "No. Returns are only accepted within 30 days.")


def extract_customer_statements(messages):
    statements = []
    for index, message in enumerate(messages):
        if message["role"] != "user":
            continue
        statement = message["content"].split("\n\nQuestion:\n")[-1].strip()
        previous = messages[index - 1] if index else None
        # Interpret short answers only after the corresponding simulator question.
        if previous and previous["role"] == "assistant":
            if previous["content"] == "How many days ago did you buy it?" and re.fullmatch(r"[0-9]+", statement):
                statement = f"{statement} days"
            elif previous["content"] == "Are you a premium member?":
                if re.fullmatch(r"yes[.!]?", statement, re.IGNORECASE):
                    statement = "a premium member"
                elif re.fullmatch(r"no[.!]?", statement, re.IGNORECASE):
                    statement = "not a premium member"
        statements.append(statement)
    return statements
