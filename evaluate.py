import json
import os
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
import sys
import time

from chatbot import respond
from backend import BACKEND, MODEL

ROOT = Path(__file__).parent


def color_status(status):
    colors = {"PASS": 32, "FAIL": 31, "ERROR": 33}
    use_color = sys.stdout.isatty() and "NO_COLOR" not in os.environ and os.environ.get("TERM") != "dumb"
    return f"\033[{colors[status]}m{status}\033[0m" if use_color else status


def main():
    cases = json.loads((ROOT / "cases.json").read_text())
    case_id = next((arg[7:] for arg in sys.argv if arg.startswith("--case=")), None)
    if case_id:
        cases = [case for case in cases if case["id"] == case_id]
    if not cases:
        raise SystemExit(f"Unknown case: {case_id}")
    results = []
    counts = defaultdict(lambda: {"passed": 0, "total": 0, "errors": 0})
    print(f"Backend: {BACKEND}; model: {'simulator' if BACKEND == 'offline' else MODEL}")
    for case in cases:
        started = time.perf_counter()
        actual, error = None, None
        try:
            actual = respond(case["question"], case.get("history", []))
        except RuntimeError as failure:
            error = str(failure)
        latency_ms = round((time.perf_counter() - started) * 1000)
        passed = actual is not None and actual["decision"] == case["expected"]
        count = counts[case["category"]]
        count["passed"] += int(passed)
        count["total"] += 1
        count["errors"] += int(error is not None)
        results.append({**case, "actual": actual, "error": error, "latency_ms": latency_ms, "passed": passed})
        status = "ERROR" if error else "PASS" if passed else "FAIL"
        print(f"{color_status(status)} {case['id']}: expected={case['expected']} actual={actual['decision'] if actual else 'none'} ({latency_ms}ms)")
        print(f"  {error or actual['text']}")
        if error:
            print("Stopping on API/runtime error; remaining cases are unrun.")
            break
    for category, count in counts.items():
        print(f"{category}: {count['passed']}/{count['total']}; errors={count['errors']}")
    report = {
        "backend": BACKEND, "model": "simulator" if BACKEND == "offline" else MODEL,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "selected": len(cases), "executed": len(results), "unrun": len(cases) - len(results),
        "passed": sum(result["passed"] for result in results),
        "errors": sum(result["error"] is not None for result in results), "results": results,
    }
    output = ROOT / f"results.python.{BACKEND}.json"
    output.write_text(json.dumps(report, indent=2) + "\n")
    print(f"Total: {report['passed']}/{report['executed']}; unrun={report['unrun']}. Report: {output}")
    return int(bool(report["errors"]) or report["passed"] != report["selected"])


if __name__ == "__main__":
    sys.exit(main())
