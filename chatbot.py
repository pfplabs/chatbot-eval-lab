import json

from backend import generate_answer
from state import apply_reply, create_state, record_next_question

POLICY = (
    "Returns are accepted within 30 days. "
    "Premium members may return items within 60 days."
)


def retrieve(question):
    # A tiny stand-in for document retrieval.
    return POLICY if "return" in question.lower() else ""


def respond(question, history=None, previous_state=None):
    previous_state = previous_state if previous_state is not None else create_state()
    state = apply_reply(previous_state, question)
    conversation = [message for message in (history or []) if message["role"] in ("user", "assistant")]
    retrieval_query = "\n".join(
        [message["content"] for message in conversation if message["role"] == "user"]
        + [question]
    )
    context = retrieve(retrieval_query)
    messages = [
        {
            "role": "system",
            "content": "Answer customer questions using the provided policy. Be concise and give a direct answer. Only ask about missing membership when the purchase was more than 30 but no more than 60 days ago. Purchases older than 60 days are ineligible. If purchase age is missing, ask how many days ago the item was purchased. If the purchase was at most 30 days ago, it is eligible regardless of membership. Interpret short replies using the immediately preceding assistant question. Do not treat order numbers or other identifiers as purchase ages. Use facts already provided in the conversation instead of asking for them again. When you ask for an order number and the user replies '12345', that supplies an order number, not a purchase age. Ask for purchase age if unknown. ",
        },
        {"role": "developer", "content": f"Reference policy:\n{context or 'No relevant policy found.'}"},
        {"role": "developer", "content": "Application-tracked facts (null means not captured; do not infer purchase age from orderNumber): " + json.dumps(state, separators=(",", ":"))},
        *conversation,
        {
            "role": "user",
            "content": f"Policy:\n{context}\n\nQuestion:\n{question}",
        },
    ]
    def finish(answer, model_called):
        return {**answer, "state": record_next_question(state, answer["decision"]), "trace": {
            "context": context, "messages": messages, "modelCalled": model_called,
            "stateBefore": previous_state, "stateAfterReply": state,
        }}

    if not context:
        return finish({"decision": "no_context", "text": "I couldn't find a relevant policy. Could you describe what you need help with?"}, False)
    if previous_state["pendingQuestion"] == "order_number" and question.strip().isascii() and question.strip().isdigit() and state["daysSincePurchase"] is None:
        return finish({"decision": "ask_days", "text": "How many days ago did you buy it?"}, False)
    answer = generate_answer(messages)
    return finish(answer, True)
