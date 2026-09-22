from chatbot import respond
from backend import BACKEND, MODEL
from state import create_state


def main():
    history = []
    state = create_state()
    print(f"Practice chatbot ({BACKEND}: {'simulator' if BACKEND == 'offline' else MODEL}). Type /quit to exit or /reset to clear history.")
    while True:
        try:
            question = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if question == "/quit":
            break
        if question == "/reset":
            history.clear()
            state = create_state()
            continue
        if not question:
            continue
        try:
            answer = respond(question, history, state)
        except RuntimeError as error:
            print(f"Error: {error}")
            continue
        print(f"Bot: {answer['text']} [{answer['decision']}]")
        state = answer["state"]
        history.extend([
            {"role": "user", "content": question},
            {"role": "assistant", "content": answer["text"]},
        ])


if __name__ == "__main__":
    main()
