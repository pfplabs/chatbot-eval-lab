# Security and data handling

This project is a local learning exercise. Do not expose it as a production service without a separate security review.

- Keep API keys in local `.env` or the process environment. `.env` variants, private-key files, generated reports, and caches are ignored. `.env.example` contains no key.
- Live calls go to the fixed HTTPS endpoint `https://api.openai.com/v1/responses`. Request bodies contain conversation text, policy, and output schema. Keys are used in the authorization header and are not intentionally logged.
- Reports can contain full conversations, state, usage, and response IDs. Keep them local unless independently sanitized.
- `store: false` is set on requests. This is not a promise of zero retention across every provider system; review the provider's current data policies for your use case.
- Each request has a 60-second timeout and a 512-output-token cap. There are no automatic retries. Live evals incur usage charges and make at most one model call per selected case; some final-state branches skip calls.
- Prompts and structured output are not authorization or prompt-injection defenses. The app has no external-action tools. Do not connect destructive actions without separate authorization checks.
- State parsing and retrieval are intentionally incomplete. Membership is self-reported and is not authenticated. Do not use the result to authorize a real refund.
- Conversation state is kept only in process memory. Reports persist locally until removed. `/reset` clears interactive history and state, not existing report files.
- No dependency installation, CI secrets, uploaded environment file, or hosted endpoint is required.

If you find a security issue, do not include keys or private conversations in a public issue. Use a private reporting channel if the repository has one configured. If a credential is ever published, revoke it; removing the visible file alone is insufficient.
