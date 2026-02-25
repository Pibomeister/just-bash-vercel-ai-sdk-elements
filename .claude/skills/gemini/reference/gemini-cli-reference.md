# Gemini CLI Exhaustive Reference

This document provides the complete flag reference, approval mode details, output format specifications, session management patterns, and error handling guidelines for the Gemini CLI. It is loaded on-demand by Claude when encountering edge cases or unfamiliar configurations.

## CLI Flag Reference

| Flag | Type | Description |
|---|---|---|
| `-p, --prompt <PROMPT>` | string | **Required for headless mode.** Run in non-interactive mode with the given prompt. Appended to input on stdin (if any). |
| `-m, --model <MODEL>` | string | Model to use (e.g., `gemini-2.5-pro`, `gemini-2.5-flash`). |
| `--approval-mode <MODE>` | enum | Set approval mode: `default`, `auto_edit`, `yolo`, `plan`. See Approval Modes below. |
| `-o, --output-format <FMT>` | enum | Output format: `text` (default), `json`, `stream-json`. See Output Formats below. |
| `-r, --resume <SESSION>` | string | Resume a previous session. Use `latest` for most recent or an index number. |
| `--include-directories <DIR>` | array | Additional directories to include in the workspace (comma-separated or repeated). |
| `-y, --yolo` | boolean | Shortcut for `--approval-mode yolo`. Auto-approve all actions. |
| `-s, --sandbox` | boolean | Run in sandbox mode. |
| `-i, --prompt-interactive <PROMPT>` | string | Execute the provided prompt and continue in interactive mode. |
| `-d, --debug` | boolean | Run in debug mode (open debug console with F12). |
| `--allowed-tools <TOOLS>` | array | Tools allowed to run without confirmation within the Gemini session. |
| `--allowed-mcp-server-names <NAMES>` | array | Restrict which MCP servers Gemini can access. |
| `-e, --extensions <EXTS>` | array | Specific extensions to use. If omitted, all extensions load. |
| `-l, --list-extensions` | boolean | List all available extensions and exit. |
| `--list-sessions` | boolean | List available sessions for the current project and exit. |
| `--delete-session <INDEX>` | string | Delete a session by index number. |
| `--screen-reader` | boolean | Enable screen reader mode for accessibility. |
| `--raw-output` | boolean | Disable sanitization of model output. **Security risk with untrusted output.** |
| `--accept-raw-output-risk` | boolean | Suppress the security warning when using `--raw-output`. |
| `-v, --version` | boolean | Show version number. |
| `-h, --help` | boolean | Show help. |

## Approval Modes

| Mode | Behavior | Risk Level | Use Case |
|---|---|---|---|
| `plan` | **Read-only.** Gemini can analyze but cannot modify files. | Lowest | Code review, analysis, research, web search |
| `default` | Prompts for approval on each action. | Low | Not useful in headless mode (blocks on stdin). Avoid. |
| `auto_edit` | Auto-approves file edit tools only. Other actions still require approval. | Medium | Applying targeted code changes, refactoring |
| `yolo` | Auto-approves **all** tools including shell commands, file writes, and network access. | **Highest** | Full automation in trusted/ephemeral environments only |

### Security Guidelines for Approval Modes

- **Always default to `plan`** unless the task explicitly requires file mutations.
- **Use `auto_edit`** for targeted refactoring where Gemini needs to write files but should not run arbitrary commands.
- **Use `yolo` only when:**
  - The user has explicitly authorized it
  - The environment is disposable (CI container, temp branch)
  - The scope of changes is well-understood
- **Never use `default`** in headless mode — it will hang waiting for stdin approval.

## Output Formats

### `text` (default)
Plain text output. Human-readable but not machine-parseable. May contain ANSI escape codes if the terminal supports them.

### `json`
Single JSON object returned after execution completes. Contains the full conversation history and result.

### `stream-json`
**Recommended for bridge script.** Emits newline-delimited JSON objects (NDJSON) in real-time as execution progresses. Event types include:

- **Progress events** — Intermediate status updates, thinking tokens
- **Tool call events** — Details of tool invocations within the Gemini session
- **Result events** — The final assistant message with the completion payload
- **Error events** — Execution failures with diagnostic details
- **Session metadata** — Session ID for deterministic resumption

The bridge script (`run-gemini.sh`) uses `jq` to filter this stream, suppressing progress noise and extracting only the final result.

## Session Management

### Starting a New Session
```bash
gemini -m gemini-2.5-pro --approval-mode plan -o stream-json -p "your prompt"
```

### Listing Sessions
```bash
gemini --list-sessions
```

### Resuming a Session
Resume the most recent session:
```bash
echo "follow-up prompt" | gemini --resume latest -p -
```

Resume a specific session by index:
```bash
echo "follow-up prompt" | gemini --resume 3 -p -
```

**Important resume rules:**
- All configuration flags (model, approval-mode, etc.) go **before** `--resume`
- When resuming, don't pass configuration flags unless explicitly overriding — the resumed session inherits the original settings
- The `-p -` flag tells Gemini to read the prompt from stdin (piped via `echo`)

### Deleting a Session
```bash
gemini --delete-session 3
```

## Quick Reference Table

| Use Case | Approval Mode | Bridge Command |
|---|---|---|
| Read-only review or analysis | `plan` | `run-gemini.sh --task "review X" --model gemini-2.5-pro` |
| Apply local edits | `auto_edit` | `run-gemini.sh --task "refactor X" --model gemini-2.5-pro --approval-mode auto_edit` |
| Full automation | `yolo` | `run-gemini.sh --task "rewrite X" --model gemini-2.5-pro --approval-mode yolo` |
| Web search / research | `plan` | `run-gemini.sh --task "search for X" --model gemini-2.5-pro` |
| Resume recent session | Inherited | `run-gemini.sh --resume latest --task "continue with X"` |
| Include extra directories | Any | `run-gemini.sh --task "analyze" --include-dirs /path/to/other` |

## Critical Evaluation of Gemini Output

Gemini is powered by Google models with their own knowledge cutoffs and limitations. Treat Gemini as a **colleague, not an authority**.

### Guidelines

- **Trust your own knowledge** when confident. If Gemini claims something you know is incorrect, push back directly.
- **Research disagreements** using WebSearch or documentation before accepting Gemini's claims. Share findings with Gemini via resume if needed.
- **Remember knowledge cutoffs** — Gemini may not know about recent releases, APIs, or changes that occurred after its training data.
- **Don't defer blindly** — Gemini can be wrong. Evaluate its suggestions critically, especially regarding:
  - Model names and capabilities
  - Recent library versions or API changes
  - Best practices that may have evolved

### When Gemini is Wrong

1. State your disagreement clearly to the user
2. Provide evidence (your own knowledge, web search, docs)
3. Optionally resume the Gemini session to discuss the disagreement. **Identify yourself as Claude** so Gemini knows it's a peer AI discussion:
   ```bash
   run-gemini.sh --resume latest \
     --task "This is Claude (<your current model name>) following up. I disagree with [X] because [evidence]. What's your take on this?"
   ```
4. Frame disagreements as discussions, not corrections — either AI could be wrong
5. Let the user decide how to proceed if there's genuine ambiguity

## Error Handling

### Exit Codes

| Exit Code | Meaning | Action |
|---|---|---|
| 0 | Success | Process output normally |
| 1 | General error | Report stderr to user, request direction |
| 127 | Gemini CLI not found | Prompt user to install Gemini CLI |
| 130 | Interrupted (SIGINT) | Session may be resumable |

### Error Handling Protocol

1. **Non-zero exit** — Stop and report the failure. Include any stderr output. Request direction before retrying.
2. **Partial results** — If the bridge returns partial output with an error, summarize what was completed and what failed.
3. **Rate limits** — If Gemini hits rate limits, wait and suggest the user retry after a cooldown period.
4. **Timeout** — Long-running tasks may time out. Check if the session can be resumed.
5. **Permission denied** — If Gemini lacks permission for an action, suggest upgrading the approval mode (with user consent).

### Pre-Execution Checks

Before running high-impact operations:
- Verify `gemini --version` succeeds (CLI is installed and authenticated)
- Confirm approval mode with the user if `auto_edit` or `yolo` is needed
- Ensure the working directory is correct (use `--include-directories` if needed)
