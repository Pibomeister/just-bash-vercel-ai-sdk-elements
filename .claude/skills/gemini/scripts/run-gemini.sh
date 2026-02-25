#!/usr/bin/env bash
# run-gemini.sh — Middleware bridge for Gemini CLI headless execution
# Invoked exclusively by Claude Code's Gemini delegation skill.
# Routes all Gemini CLI invocations through a secure, deterministic wrapper
# that handles argument assembly, JSON telemetry parsing, and error management.

set -euo pipefail

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
readonly SCRIPT_NAME="$(basename "$0")"
readonly GEMINI_BIN="${GEMINI_BIN:-gemini}"

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
TASK=""
MODEL=""
APPROVAL_MODE="plan"
OUTPUT_FORMAT="stream-json"
INCLUDE_DIRS=""
RESUME=""
RAW_MODE=false

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
  cat <<EOF
Usage: $SCRIPT_NAME [OPTIONS]

Middleware bridge for headless Gemini CLI execution.

Required:
  --task <PROMPT>           The task prompt to send to Gemini

Options:
  --model <MODEL>           Model to use (e.g., gemini-2.5-pro, gemini-2.5-flash)
  --approval-mode <MODE>    Approval mode: plan (default), auto_edit, yolo
  --output-format <FMT>     Output format: text, json, stream-json (default)
  --include-dirs <DIR>      Additional workspace directories (comma-separated)
  --resume <SESSION>        Resume a previous session (e.g., "latest" or index)
  --raw                     Return raw unfiltered output (skip jq processing)
  -h, --help                Show this help message

Examples:
  $SCRIPT_NAME --task "Review the auth module" --model gemini-2.5-pro
  $SCRIPT_NAME --task "Refactor utils" --model gemini-2.5-pro --approval-mode auto_edit
  $SCRIPT_NAME --resume latest --task "Continue with the error handling"
EOF
  exit 0
}

# ---------------------------------------------------------------------------
# Argument Parsing
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --task)
      TASK="$2"
      shift 2
      ;;
    --model)
      MODEL="$2"
      shift 2
      ;;
    --approval-mode)
      APPROVAL_MODE="$2"
      shift 2
      ;;
    --output-format)
      OUTPUT_FORMAT="$2"
      shift 2
      ;;
    --include-dirs)
      INCLUDE_DIRS="$2"
      shift 2
      ;;
    --resume)
      RESUME="$2"
      shift 2
      ;;
    --raw)
      RAW_MODE=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Error: Unknown option '$1'" >&2
      usage
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
if [[ -z "$TASK" ]]; then
  echo "Error: --task is required" >&2
  exit 1
fi

if ! command -v "$GEMINI_BIN" &>/dev/null; then
  echo "Error: '$GEMINI_BIN' not found in PATH. Install Gemini CLI first." >&2
  echo "  npm install -g @anthropic-ai/gemini-cli  (or check your installation)" >&2
  exit 127
fi

# Validate approval mode
case "$APPROVAL_MODE" in
  plan|auto_edit|yolo|default) ;;
  *)
    echo "Error: Invalid --approval-mode '$APPROVAL_MODE'. Must be: plan, auto_edit, yolo, default" >&2
    exit 1
    ;;
esac

# Validate output format
case "$OUTPUT_FORMAT" in
  text|json|stream-json) ;;
  *)
    echo "Error: Invalid --output-format '$OUTPUT_FORMAT'. Must be: text, json, stream-json" >&2
    exit 1
    ;;
esac

# ---------------------------------------------------------------------------
# Command Assembly
# ---------------------------------------------------------------------------
build_command() {
  local cmd=()

  if [[ -n "$RESUME" ]]; then
    # Resume mode: flags go BEFORE --resume
    cmd+=("$GEMINI_BIN")
    [[ -n "$MODEL" ]] && cmd+=("-m" "$MODEL")
    cmd+=("--approval-mode" "$APPROVAL_MODE")
    cmd+=("-o" "$OUTPUT_FORMAT")
    [[ -n "$INCLUDE_DIRS" ]] && cmd+=("--include-directories" "$INCLUDE_DIRS")
    cmd+=("--resume" "$RESUME")
    cmd+=("-p" "-")
  else
    # Standard headless mode
    cmd+=("$GEMINI_BIN")
    [[ -n "$MODEL" ]] && cmd+=("-m" "$MODEL")
    cmd+=("--approval-mode" "$APPROVAL_MODE")
    cmd+=("-o" "$OUTPUT_FORMAT")
    [[ -n "$INCLUDE_DIRS" ]] && cmd+=("--include-directories" "$INCLUDE_DIRS")
    cmd+=("-p" "$TASK")
  fi

  printf '%s\0' "${cmd[@]}"
}

# ---------------------------------------------------------------------------
# Execution
# ---------------------------------------------------------------------------
execute_gemini() {
  local exit_code=0
  local tmpout
  local tmperr
  tmpout="$(mktemp)"
  tmperr="$(mktemp)"
  trap 'rm -f "$tmpout" "$tmperr"' EXIT

  # Build command as array
  local -a cmd=()
  while IFS= read -r -d '' arg; do
    cmd+=("$arg")
  done < <(build_command)

  echo "--- Gemini Bridge: Executing ---" >&2
  echo "  Mode: ${RESUME:+resume ($RESUME)}${RESUME:-headless}" >&2
  echo "  Model: ${MODEL:-default}" >&2
  echo "  Approval: $APPROVAL_MODE" >&2
  echo "  Output: $OUTPUT_FORMAT" >&2
  echo "--------------------------------" >&2

  if [[ -n "$RESUME" ]]; then
    # Resume: pipe task via stdin
    echo "$TASK" | "${cmd[@]}" >"$tmpout" 2>"$tmperr" || exit_code=$?
  else
    # Standard: prompt is already in the command
    "${cmd[@]}" >"$tmpout" 2>"$tmperr" || exit_code=$?
  fi

  # ---------------------------------------------------------------------------
  # Output Processing
  # ---------------------------------------------------------------------------
  if [[ $exit_code -ne 0 ]]; then
    echo "--- Gemini Bridge: ERROR (exit code $exit_code) ---" >&2
    # Surface stderr for diagnostics
    if [[ -s "$tmperr" ]]; then
      echo "--- stderr ---" >&2
      cat "$tmperr" >&2
    fi
    # Still output whatever was produced
    if [[ -s "$tmpout" ]]; then
      echo "--- partial output ---" >&2
      cat "$tmpout"
    fi
    return $exit_code
  fi

  # Success path
  if [[ "$RAW_MODE" == true ]] || [[ "$OUTPUT_FORMAT" == "text" ]]; then
    # Raw or text mode: pass through directly
    cat "$tmpout"
  elif [[ "$OUTPUT_FORMAT" == "stream-json" ]] || [[ "$OUTPUT_FORMAT" == "json" ]]; then
    # JSON mode: filter telemetry, extract final assistant content
    if command -v jq &>/dev/null; then
      filter_json_output "$tmpout"
    else
      echo "Warning: jq not found, returning raw JSON output" >&2
      cat "$tmpout"
    fi
  fi

  # Log stderr telemetry summary if present
  if [[ -s "$tmperr" ]]; then
    local line_count
    line_count="$(wc -l < "$tmperr" | tr -d ' ')"
    echo "--- Gemini Bridge: Complete ($line_count telemetry lines suppressed) ---" >&2
  else
    echo "--- Gemini Bridge: Complete ---" >&2
  fi

  return 0
}

# ---------------------------------------------------------------------------
# JSON Telemetry Filtering
# ---------------------------------------------------------------------------
filter_json_output() {
  local output_file="$1"

  # For stream-json, Gemini emits newline-delimited JSON objects.
  # We extract:
  #   1. The final assistant message content (highest priority)
  #   2. Any error events
  #   3. Session metadata for resumption tracking
  #
  # We suppress: progress indicators, tool call details, thinking tokens

  # Try to extract the final result — look for the last complete message
  # with role "model" or type "result"
  local result
  result="$(jq -r '
    # Handle different possible event shapes from Gemini stream-json
    if .type == "result" then
      .content // .text // .message // tojson
    elif .role == "model" then
      if .parts then
        [.parts[] | .text // empty] | join("\n")
      else
        .content // .text // tojson
      end
    else
      empty
    end
  ' "$output_file" 2>/dev/null | tail -1)"

  if [[ -n "$result" && "$result" != "null" ]]; then
    echo "$result"
  else
    # Fallback: couldn't parse structured result, return all non-empty lines
    # filtering out obvious telemetry noise
    jq -r '
      select(.type != "progress" and .type != "thinking" and .type != "tool_call")
      | .content // .text // .message // tojson
    ' "$output_file" 2>/dev/null || cat "$output_file"
  fi

  # Extract and report session ID if available
  local session_id
  session_id="$(jq -r 'select(.sessionId != null) | .sessionId' "$output_file" 2>/dev/null | head -1)"
  if [[ -n "$session_id" && "$session_id" != "null" ]]; then
    echo "--- Gemini Session ID: $session_id ---" >&2
  fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
execute_gemini
