import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { respond } from "./chatbot.ts";
import { backend, model } from "./backend.ts";
import type { EvalCase } from "./types.ts";

function colorStatus(status: "PASS" | "FAIL" | "ERROR"): string {
  const colors = { PASS: 32, FAIL: 31, ERROR: 33 };
  const useColor = process.stdout.isTTY && process.env.NO_COLOR === undefined && process.env.TERM !== "dumb";
  return useColor ? `\x1b[${colors[status]}m${status}\x1b[0m` : status;
}

const allCases: EvalCase[] = JSON.parse(readFileSync(new URL("../cases.json", import.meta.url), "utf8"));
const caseId = process.argv.find((arg) => arg.startsWith("--case="))?.slice(7);
const cases = caseId ? allCases.filter((testCase) => testCase.id === caseId) : allCases;
if (!cases.length) throw new Error(`Unknown case: ${caseId}`);
const counts = new Map<string, { passed: number; total: number; errors: number }>();
const results = [];
console.log(`Backend: ${backend}; model: ${backend === "offline" ? "simulator" : model}`);
for (const testCase of cases) {
  const started = performance.now();
  let actual: Awaited<ReturnType<typeof respond>> | null = null;
  let error: string | null = null;
  try {
    actual = await respond(testCase.question, testCase.history ?? []);
  } catch (failure) {
    error = (failure as Error).message;
  }
  const latency_ms = Math.round(performance.now() - started);
  const passed = actual?.decision === testCase.expected;
  const count = counts.get(testCase.category) ?? { passed: 0, total: 0, errors: 0 };
  count.passed += Number(passed);
  count.total += 1;
  count.errors += Number(error !== null);
  counts.set(testCase.category, count);
  results.push({ ...testCase, actual, error, latency_ms, passed });
  const status = colorStatus(error ? "ERROR" : passed ? "PASS" : "FAIL");
  console.log(`${status} ${testCase.id}: expected=${testCase.expected} actual=${actual?.decision ?? "none"} (${latency_ms}ms)`);
  console.log(`  ${error ?? actual?.text}`);
  // A configuration/network error should not spend the rest of the run retrying.
  if (error) { console.log("Stopping on API/runtime error; remaining cases are unrun."); break; }
}
for (const [category, count] of counts) {
  console.log(`${category}: ${count.passed}/${count.total}; errors=${count.errors}`);
}
const report = {
  backend, model: backend === "offline" ? "simulator" : model, created_at: new Date().toISOString(),
  selected: cases.length, executed: results.length, unrun: cases.length - results.length,
  passed: results.filter((result) => result.passed).length,
  errors: results.filter((result) => result.error).length, results,
};
const output = new URL(`../results.typescript.${backend}.json`, import.meta.url);
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(`Total: ${report.passed}/${report.executed}; unrun=${report.unrun}. Report: ${fileURLToPath(output)}`);
if (report.errors || report.passed !== report.selected) process.exitCode = 1;
