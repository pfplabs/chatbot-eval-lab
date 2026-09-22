from chatbot import respond
from backend import BACKEND, MODEL


def main():
    history = []
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
            continue
        if not question:
            continue
        try:
            answer = respond(question, history)
        except RuntimeError as error:
            print(f"Error: {error}")
            continue
        print(f"Bot: {answer['text']} [{answer['decision']}]")
        history.extend([
            {"role": "user", "content": question},
            {"role": "assistant", "content": answer["text"]},
        ])


if __name__ == "__main__":
    main()
