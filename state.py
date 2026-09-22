"""Explicit conversational facts. Copy on update so failed calls don't commit state."""
import re


def create_state():
    return {"pendingQuestion": None, "daysSincePurchase": None, "isPremiumMember": None, "orderNumber": None}


def apply_reply(previous, question):
    state = dict(previous)
    reply = question.strip()
    if state["pendingQuestion"] == "order_number" and re.fullmatch(r"[0-9]+", reply):
        state["orderNumber"] = reply
        state["pendingQuestion"] = None
        return state
    days = re.findall(r"\b([0-9]+) days?\b", reply, re.IGNORECASE)
    if days:
        state["daysSincePurchase"] = int(days[-1])
    elif state["pendingQuestion"] == "purchase_age" and re.fullmatch(r"[0-9]+", reply):
        state["daysSincePurchase"] = int(reply)
    membership = re.findall(r"\b(not a premium|a premium|standard) member\b", reply.lower())
    if membership:
        state["isPremiumMember"] = membership[-1] == "a premium"
    elif state["pendingQuestion"] == "membership":
        if re.fullmatch(r"yes[.!]?", reply, re.IGNORECASE):
            state["isPremiumMember"] = True
        if re.fullmatch(r"no[.!]?", reply, re.IGNORECASE):
            state["isPremiumMember"] = False
    return state


def record_next_question(state, decision):
    return {**state, "pendingQuestion": {"ask_days": "purchase_age", "ask_membership": "membership"}.get(decision)}
