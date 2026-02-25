# agent-browser

A Rust-based browser automation CLI designed for AI agents. Use it for quick headless browser interactions, CI pipelines, and tasks where fast startup and simple ref-based selectors (`@e1`, `@e2`) are preferred.

> **Full documentation lives in the sibling skill:** `.agents/skills/agent-browser/` (if available)
> This reference is a quick-start summary. For complete command reference, session management, authentication patterns, and templates, see the skill directly.

## Installation

```bash
npm install -g agent-browser && agent-browser install
```

## Core Workflow

Every interaction follows: **open** -> **snapshot** -> **interact** -> **re-snapshot**

```bash
agent-browser open http://localhost:3000
agent-browser snapshot -i                    # Get interactive element refs (@e1, @e2...)
agent-browser click @e3                      # Interact using refs
agent-browser snapshot -i                    # Re-snapshot after DOM changes
agent-browser screenshot /tmp/result.png
agent-browser close
```

## When to Use agent-browser

- **Quick page checks** -- Open a page, snapshot, verify elements exist, screenshot, close
- **Headless CI** -- Runs headless by default, no display server needed
- **Form filling and data extraction** -- Simple `fill @ref "value"` syntax
- **Session persistence** -- Auto-saves/restores cookies and localStorage with `--session-name`
- **Parallel sessions** -- Run multiple browser sessions with `--session`

## When to Use Something Else

| Instead of agent-browser... | Use...                               | When...                                                                  |
| --------------------------- | ------------------------------------ | ------------------------------------------------------------------------ |
| playwright-cli              | `.agents/skills/playwright-cli/`     | You need test generation, tracing, video recording, or request mocking   |
| Claude in Chrome            | Claude Code only (`claude --chrome`) | You need visual verification, styling checks, or to leverage login state |

## Using with Local Servers

Combine with `scripts/with_server.py` to auto-start your dev server:

```bash
python scripts/with_server.py --server "pnpm dev" --port 3000 -- bash -c '
  agent-browser open http://localhost:3000
  agent-browser snapshot -i
  agent-browser screenshot /tmp/homepage.png
  agent-browser close
'
```

## Key Differences from playwright-cli

| Feature             | agent-browser             | playwright-cli               |
| ------------------- | ------------------------- | ---------------------------- |
| Selector syntax     | `@e1` refs from snapshot  | `e1` refs from snapshot      |
| Session persistence | Built-in `--session-name` | `--persistent` / `--profile` |
| iOS simulator       | Supported (`-p ios`)      | Not available                |
| Test generation     | Not available             | Built-in (`codegen`)         |
| Request mocking     | Not available             | Built-in (`route`)           |
| Tracing/video       | Basic `record`            | Full tracing support         |
