import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { respond } from "./chatbot.ts";
import type { Message } from "./types.ts";
import { backend, model } from "./backend.ts";

const history: Message[] = [];
const terminal = createInterface({ input: stdin, output: stdout });
console.log(`Practice chatbot (${backend}: ${backend === "offline" ? "simulator" : model}). Type /quit to exit or /reset to clear history.`);
try {
  while (true) {
    let question: string;
    try {
      question = (await terminal.question("You: ")).trim();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ERR_USE_AFTER_CLOSE") break;
      throw error;
    }
    if (question === "/quit") break;
    if (question === "/reset") {
      history.length = 0;
      continue;
    }
    if (!question) continue;
    let answer;
    try {
      answer = await respond(question, history);
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      continue;
    }
    console.log(`Bot: ${answer.text} [${answer.decision}]`);
    history.push(
      { role: "user", content: question },
      { role: "assistant", content: answer.text },
    );
  }
} finally {
  terminal.close();
}
