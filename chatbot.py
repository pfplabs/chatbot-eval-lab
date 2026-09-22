from backend import generate_answer

POLICY = "Returns are accepted within 30 days. Premium members may return items within 60 days."


def retrieve(question):
    return POLICY if "return" in question.lower() else ""


def respond(question, history=None):
    conversation = [message for message in (history or []) if message["role"] in ("user", "assistant")]
    query = "\n".join([message["content"] for message in conversation if message["role"] == "user"] + [question])
    context = retrieve(query)
    messages = [
        {"role": "system", "content": "Answer customer questions using the provided policy. Be concise and give a direct answer. If member status is missing and changes eligibility, ask a clarifying question."},
        *conversation,
        {"role": "user", "content": f"Policy:\n{context}\n\nQuestion:\n{question}"},
    ]
    answer = generate_answer(messages)
    return {**answer, "trace": {"context": context, "messages": messages}}
