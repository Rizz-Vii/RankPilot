#!/usr/bin/env bash
# Unified Two-Agent Remediation Suite Launcher
# Starts: delegation loop, triggered runner, aider concurrent loop, codex concurrent loop (selective),
# then runs the two-agent planner loop. Designed for sustained ESLint + TypeScript remediation.
# Safe defaults can be overridden via environment variables prior to invocation.
set -euo pipefail

# Timestamped log directory (one run = one folder) for easier monitoring
RUN_STAMP="${TWO_AGENT_SUITE_STAMP:-$(date +%Y%m%d-%H%M%S)}"
LOG_DIR=".codex/logs/unified-${RUN_STAMP}"
mkdir -p "$LOG_DIR" .codex/tmp || true

# Warn early if AI keys missing (aider / codex will otherwise mark tasks failed)
if [ -z "${OPENAI_API_KEY:-}" ] && [ -z "${OPENAI_GPT5_KEY:-}" ]; then
  echo "[two-agent:unified-suite] WARNING: No OPENAI_API_KEY or OPENAI_GPT5_KEY set. Aider/Codex task execution will be skipped or fail." >&2
fi

# ---- Configurable Environment Defaults ----
export TWO_AGENT_CODEX_TS=${TWO_AGENT_CODEX_TS:-1}
export TWO_AGENT_CODEX_MAX_PER_BATCH=${TWO_AGENT_CODEX_MAX_PER_BATCH:-2}
export TWO_AGENT_TSC_BATCH=${TWO_AGENT_TSC_BATCH:-1}
export TWO_AGENT_TSC_BATCH_MIN=${TWO_AGENT_TSC_BATCH_MIN:-4}
export TWO_AGENT_TSC_BATCH_MAX_FILES=${TWO_AGENT_TSC_BATCH_MAX_FILES:-3}
export TWO_AGENT_FILE_CHURN_MINUTES=${TWO_AGENT_FILE_CHURN_MINUTES:-10}
export TWO_AGENT_DRIFT_THRESHOLD=${TWO_AGENT_DRIFT_THRESHOLD:-1.5}
export TWO_AGENT_AUTOSCALE_CAP=${TWO_AGENT_AUTOSCALE_CAP:-10}
export AIDER_MAX_PARALLEL=${AIDER_MAX_PARALLEL:-4}
export AIDER_LOOP_INTERVAL=${AIDER_LOOP_INTERVAL:-10000}
export CODEX_MAX_PARALLEL=${CODEX_MAX_PARALLEL:-2}
export CODEX_LOOP_INTERVAL=${CODEX_LOOP_INTERVAL:-12000}
export CODEX_SELECTIVE=${CODEX_SELECTIVE:-1}
# Provide OPENAI_API_KEY externally if planner or AI fixes are required.

# ---- Prep Artifacts ----
rm -f .eslintcache .codex/tmp/two-agent-last-hash.txt || true
npm run lint:report:json --silent || true
npm run diagnostics:tsc:json --silent || true

# ---- Start Background Loops (each with its own log) ----
echo "[two-agent:unified-suite] logs ⇒ $LOG_DIR" >&2
(
  npm run aider:concurrent-loop > "$LOG_DIR/aider-concurrent-loop.log" 2>&1 &
  echo $! > .codex/tmp/pid-aider-concurrent-loop
)
(
  CODEX_SELECTIVE=$CODEX_SELECTIVE npm run codex:loop > "$LOG_DIR/codex-concurrent-loop.log" 2>&1 &
  echo $! > .codex/tmp/pid-codex-concurrent-loop
)
(
  npm run delegate:loop > "$LOG_DIR/delegation-loop.log" 2>&1 &
  echo $! > .codex/tmp/pid-delegation-loop
)
(
  npm run delegate:triggered-runner > "$LOG_DIR/triggered-runner.log" 2>&1 &
  echo $! > .codex/tmp/pid-triggered-runner
)

if [ "${TWO_AGENT_SUITE_VERBOSE:-1}" = "1" ]; then
  cat <<EOF >&2
[two-agent:unified-suite] Monitoring tips:
  tail -f $LOG_DIR/aider-concurrent-loop.log
  tail -f $LOG_DIR/codex-concurrent-loop.log
  tail -f $LOG_DIR/delegation-loop.log
  tail -f $LOG_DIR/triggered-runner.log
  tail -f $LOG_DIR/plan-loop.log
EOF
fi

# ---- Planner Loop (Foreground) ----
echo "[two-agent:unified-suite] launching planner loop" >&2
(
  npm run brain:two-agent:plan-loop > "$LOG_DIR/plan-loop.log" 2>&1
)

# ---- Teardown (on exit) ----
echo "[two-agent:unified-suite] planner exited - stopping loops" >&2
for f in aider-concurrent-loop codex-concurrent-loop delegation-loop triggered-runner; do
  pidFile=".codex/tmp/pid-$f"; if [ -f "$pidFile" ]; then
    pid=$(cat "$pidFile" 2>/dev/null || true)
    if [ -n "${pid:-}" ]; then kill "$pid" 2>/dev/null || true; fi
  fi
done
wait || true

echo "[two-agent:unified-suite] all loops stopped" >&2
echo "[two-agent:unified-suite] final logs located in $LOG_DIR" >&2
