# Grading harness executed inside Pyodide. Kept as a real .py file so it is
# syntax-checked by tooling and readable, rather than a JS string literal.
import copy
import io
import json
import sys
import time
import traceback


def _fresh_namespace(base):
    # Shallow copy: each test sees the learner's definitions but cannot leak its
    # own helpers into sibling tests. v1 merged tests into module globals, so a
    # later test could pass because an earlier one had defined a helper.
    ns = dict(base)
    ns["__name__"] = "__grader__"
    return ns


def _format_exc(exc, source_lines):
    tb = traceback.format_exception(type(exc), exc, exc.__traceback__)
    line = None
    for frame in traceback.extract_tb(exc.__traceback__):
        # Only frames from the learner's own module carry a meaningful line.
        if frame.filename == "<learner>":
            line = frame.lineno
    return {
        "type": type(exc).__name__,
        "message": str(exc),
        "line": line,
        "traceback": "".join(tb),
    }


def run(payload_json):
    payload = json.loads(payload_json)
    code = payload["code"]
    tests = payload["tests"]
    deterministic = payload.get("deterministic", True)
    budget = payload.get("complexityBudget")

    if deterministic:
        import random

        random.seed(0)

    stdout, stderr = io.StringIO(), io.StringIO()
    real_out, real_err = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = stdout, stderr

    result = {"tests": [], "stdout": "", "stderr": "", "status": "ok", "error": None}
    learner_ns = {"__name__": "__learner__"}

    try:
        compiled = compile(code, "<learner>", "exec")
        exec(compiled, learner_ns)
    except BaseException as exc:  # noqa: BLE001 - report anything the learner raises
        sys.stdout, sys.stderr = real_out, real_err
        result["status"] = "exception"
        result["error"] = _format_exc(exc, code.splitlines())
        result["stdout"] = stdout.getvalue()
        result["stderr"] = stderr.getvalue()
        return json.dumps(result)

    for test in tests:
        started = time.perf_counter()
        entry = {
            "id": test["id"],
            "label": test["label"],
            "hidden": test.get("hidden", False),
            "status": "passed",
            "message": None,
        }
        try:
            exec(compile(test["code"], "<test:%s>" % test["id"], "exec"),
                 _fresh_namespace(learner_ns))
        except AssertionError as exc:
            entry["status"] = "failed"
            entry["message"] = str(exc) or "Assertion failed"
        except BaseException as exc:  # noqa: BLE001
            entry["status"] = "errored"
            entry["message"] = "%s: %s" % (type(exc).__name__, exc)
        entry["durationMs"] = (time.perf_counter() - started) * 1000.0
        result["tests"].append(entry)

    # Complexity budget: run the solution against a large input under an
    # operation ceiling so a stated "O(n log n) required" is actually enforced
    # rather than decorative.
    if budget and all(t["status"] == "passed" for t in result["tests"]):
        entry = {
            "id": "complexity-budget",
            "label": "Meets the stated complexity budget",
            "hidden": False,
            "status": "passed",
            "message": None,
        }
        started = time.perf_counter()
        try:
            ns = _fresh_namespace(learner_ns)
            exec(compile(budget["setup"], "<budget-setup>", "exec"), ns)
            counter = {"ops": 0}

            def _trace(frame, event, arg):
                if event == "line":
                    counter["ops"] += 1
                    if budget.get("maxOps") and counter["ops"] > budget["maxOps"]:
                        raise RuntimeError("operation budget exceeded")
                return _trace

            max_ops = budget.get("maxOps")
            if max_ops:
                sys.settrace(_trace)
            try:
                exec(compile(budget["call"], "<budget-call>", "exec"), ns)
            finally:
                if max_ops:
                    sys.settrace(None)

            elapsed = (time.perf_counter() - started) * 1000.0
            if budget.get("maxMs") and elapsed > budget["maxMs"]:
                entry["status"] = "failed"
                entry["message"] = budget["message"]
        except BaseException as exc:  # noqa: BLE001
            entry["status"] = "failed"
            entry["message"] = budget["message"]
        entry["durationMs"] = (time.perf_counter() - started) * 1000.0
        result["tests"].append(entry)

    sys.stdout, sys.stderr = real_out, real_err
    result["stdout"] = stdout.getvalue()
    result["stderr"] = stderr.getvalue()
    return json.dumps(result)
