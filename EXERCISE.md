# From failing evals to explicit state

## 1. Establish a baseline

Switch to `codex/01-start`, create your own branch, and run both offline evals. Expect 5/8, with an intentional nonzero exit code. Read `chatbot.ts`, `backend.ts`, and the trace for one failure. Where is history accepted, and where is it used?

Write down a hypothesis before editing. Keep expected answers unchanged unless you can explain why the grader is wrong.

## 2. Fix the application wiring

Ask which missing fact changes eligibility at 45 days. Make one prompt change and rerun the case. Then follow a multi-turn request through retrieval and message construction. What happens when the customer replies with a bare number?

Compare your change with `git diff codex/01-start..codex/02-history -- typescript/chatbot.ts cases.json`. The second branch adds follow-up cases and passes 16/16 offline.

## 3. Replace confidence in the simulator with live evidence

Use your own ignored `.env` key and run a small live case, then a full baseline. Inspect the actual messages, decision, and text. Do not assume a historical score will reproduce. Refusals and API errors are distinct from wrong policy decisions.

Focus on `number-without-days-question`: the assistant asks for an order number, but the customer replies `29`. If the model says the purchase is 29 days old, locate the unsupported inference. Confirm the relevant history was sent.

## 4. Decide what belongs in code

Empty policy context is directly observable; an application guard can return `no_context` without a model call. This does not fix an order-number interpretation problem when policy is available.

Introduce state for the pending question and known customer facts. Keep identifiers as strings. Interpret a bare number according to the pending question. Commit state only after the turn succeeds. Clear both state and history on reset.

Compare with `git diff codex/02-history..codex/03-state -- typescript/chatbot.ts typescript/state.ts typescript/chat.ts cases.json`.

The order-number fixture seeds its pending state. Do not claim this proves a complete order-lookup workflow: this chatbot does not ask for an order number itself.

## 5. Verify behavior, not just a score

Run `npm test` and `python3 -m unittest discover -s tests -p 'test_*.py'` on `main`. Run offline evals in both languages. Then run live evals if desired.

Inspect `modelCalled: false` for the deterministic guard cases. Check that an order number like `007123` preserves its zeros and that a subsequent age reply updates a different field.

Now add unseen cases: "four weeks ago", a corrected purchase age, two products, a changed topic, and a response whose decision contradicts its text. Which failures belong to extraction, retrieval, prompting, or the grader?

## What a passing run means

The recorded solution run passed 16/16 using 14 model calls and two application-generated answers. This is a project observation, not a benchmark or guarantee. The grader checks labels only; state parsing and retrieval remain intentionally narrow. Do not deploy the lab to make real refund decisions.
