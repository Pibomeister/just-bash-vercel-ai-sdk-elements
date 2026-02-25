---
name: gemini
description: "Delegates complex multi-file analysis, code review, web research, and automated editing to Google Gemini CLI in headless mode. Do NOT use for simple questions answerable without external CLI invocation."
disable-model-invocation: true
user-invocable: true
allowed-tools:
  - "Bash($CLAUDE_PROJECT_DIR/.claude/skills/gemini/scripts/run-gemini.sh:*)"
  - "Read"
  - "Grep"
  - "Glob"
---

# Gemini Delegation Skill

You are delegating execution to the **Google Gemini CLI** via a secure middleware bridge script. You MUST NOT run `gemini` commands directly. All invocations go through the bridge script.

## Delegation Protocol

1. **Gather parameters** — Ask the user (via `AskUserQuestion`) which model to run (e.g., `gemini-2.5-pro`, `gemini-2.5-flash`) AND which approval mode (`plan`, `auto_edit`, or `yolo`) in a **single prompt with two questions**.
2. **Invoke the bridge** — Execute the middleware script with the required flags:
   ```bash
   "$CLAUDE_PROJECT_DIR/.claude/skills/gemini/scripts/run-gemini.sh" \
     --task "your prompt here" \
     --model gemini-2.5-pro \
     --approval-mode plan
   ```
3. **Resume a session** — To continue a previous Gemini session:
   ```bash
   "$CLAUDE_PROJECT_DIR/.claude/skills/gemini/scripts/run-gemini.sh" \
     --resume latest \
     --task "follow-up prompt here"
   ```
4. **Review the output** — The bridge returns clean, filtered output. Summarize the outcome for the user.

### Additional Bridge Flags

- `--output-format <text|json|stream-json>` — Override output format (default: `stream-json` for telemetry parsing)
- `--include-dirs <DIR>` — Additional workspace directories for Gemini to access
- `--raw` — Return raw unfiltered output (for debugging)

## Post-Execution Verification Loop (Mandatory)

After the bridge script completes, you MUST:

1. **Review mutations** — Run `git diff` to verify file changes match the user's original intent. If no changes were expected, confirm the working tree is clean.
2. **Run quality checks** — If edits were made, execute `pnpm lint` and `pnpm typecheck` (or the project's equivalent) to confirm nothing is broken.
3. **Summarize and confirm** — Present a concise summary of what Gemini did and ask the user for confirmation before marking the task complete.
4. **Offer resumption** — Inform the user: "You can resume this Gemini session at any time by saying 'gemini resume'."

## Security Constraints

- **Default to read-only** — Use `--approval-mode plan` unless the user explicitly requests edits.
- **yolo requires permission** — Before passing `--approval-mode yolo`, confirm with the user via `AskUserQuestion` unless already authorized.
- **Never expose secrets** — The bridge reads `GEMINI_API_KEY` from the environment. Never hardcode or log API keys.

## Critical Evaluation of Gemini Output

Treat Gemini as a **colleague, not an authority**. If you disagree with its output, state your reasoning, provide evidence, and optionally resume the session to discuss:
```bash
"$CLAUDE_PROJECT_DIR/.claude/skills/gemini/scripts/run-gemini.sh" \
  --resume latest \
  --task "This is Claude following up. I disagree with [X] because [evidence]."
```

## Reference

For exhaustive CLI flag documentation, approval mode details, output format specs, session management, and error handling patterns, read:
`$CLAUDE_PROJECT_DIR/.claude/skills/gemini/reference/gemini-cli-reference.md`
