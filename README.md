# Chatbot Eval Lab

A small OpenAI chatbot and eval harness in TypeScript and Python. This is an educational application with deliberately narrow retrieval and parsing, not a production support service.

## Run locally

Requires Node.js 22.18+ for native TypeScript execution or Python 3.11+. No package installation is needed. Native TypeScript execution does not type-check the project.

```sh
node typescript/evaluate.ts --offline
python3 evaluate.py --offline
```

To use a real model, copy `.env.example` to `.env` and enter your own API key locally:

```sh
cp .env.example .env
node typescript/chat.ts
node typescript/evaluate.ts
# Python alternatives:
python3 chat.py
python3 evaluate.py
```

Live mode uses the OpenAI Responses API and defaults to `gpt-4.1-mini`; set `OPENAI_MODEL` to change it. It uses your API account and sends conversation content and the retrieved policy to OpenAI. Never put a real key in source, issues, screenshots, or traces. No hosted service is included.

For one case: `node typescript/evaluate.ts --case=policy-unknown-45`. Append `--offline` for the simulator. `npm run chat`, `npm run eval`, and `npm run eval -- --offline` are equivalent TypeScript commands. Offline scores are deterministic simulator behavior, not a claim about a language model.

## Read results

`results.typescript.openai.json` is the latest TypeScript live report; Python and offline reports have their own filenames. Each run overwrites the same report, including single-case runs. Check `created_at`, `selected`, and `executed`. Reports are ignored by Git because they contain conversation data. PASS/FAIL/ERROR labels use green/red/yellow in a terminal. API errors stop the run and mark remaining cases unrun. An eval mismatch exits nonzero intentionally.

## Learn through the branches

| Branch | Checkpoint | Expected offline score |
| --- | --- | --- |
| `codex/01-start` | Missing clarification and unused history | 5/8 |
| `codex/02-history` | Clarification, conversation retrieval, and history | 16/16 |
| `codex/03-state` | Explicit state and deterministic guard branches | 16/16 |
| `main` | Completed solution, tests, and exercise guide | 16/16 |

These are reconstructed teaching snapshots, not the original development chronology. The second checkpoint passes the visible offline cases, but real-model interpretation remains a separate problem. No live score is guaranteed.

Before switching branches, commit your work or save it on a personal branch. For example:

```sh
git switch codex/01-start
git switch -c my-experiment
node typescript/evaluate.ts --offline
```

The starting checkpoint contains eight cases; later checkpoints expand to sixteen. Keep `.env` local across branch changes. The full exercise guide lives on `main`.

## Source map

| TypeScript | Python | Purpose |
| --- | --- | --- |
| `typescript/chatbot.ts` | `chatbot.py` | Retrieval, prompt construction, orchestration |
| `typescript/backend.ts` | `backend.py` | API call, schema validation, offline selection |
| `typescript/model.ts` | `model.py` | Deterministic simulator |
| `typescript/chat.ts` | `chat.py` | Interactive loop |
| `typescript/evaluate.ts` | `evaluate.py` | Eval runner and local traces |

`cases.json` and `answer.schema.json` are shared. Later checkpoints add `state.ts` / `state.py`. The API gets the input messages and output schema, never the expected answer from the eval fixture.

## Boundaries

The return policy is hardcoded. Retrieval matches the word `return`. There is no database, authentication, order lookup, real customer data, or production deployment. The grader checks decision labels, not explanation correctness. The model may ignore prompts, misinterpret history, or produce different answers on repeated calls. A passing score is not a security guarantee.

See [SECURITY.md](SECURITY.md) before adapting this to real data.

## Current checkpoint: start

Begin by explaining the failing cases. Locate the request construction and identify one change to test. Leave the simulator and expected answers alone while you investigate the application.
