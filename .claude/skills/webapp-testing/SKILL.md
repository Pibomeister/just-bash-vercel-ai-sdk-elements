---
name: webapp-testing
description: Testing decision framework for web applications. Routes to three approaches — Playwright CLI for automated test scripts, Claude in Chrome for manual UI/UX verification, agent-browser for quick headless interactions. Use when testing, debugging, or verifying web apps.
license: Complete terms in LICENSE.txt
---

# Web Application Testing

Three approaches for testing web apps. Choose based on what you need:

## Decision Tree

```
What do you need?
│
├─ Automated test scripts, test generation, tracing, or video recording?
│  → Playwright CLI (sibling skill)
│
├─ Visual verification, styling checks, or debugging with live browser state?
│  → Claude in Chrome
│
└─ Quick headless checks, CI automation, or simple page interactions?
   → agent-browser (sibling skill)
```

---

## Approach 1: Playwright CLI

**Full-featured browser automation** with test generation, request mocking, tracing, and video recording. Best when you need repeatable test scripts or advanced debugging tools.

```bash
playwright-cli open http://localhost:3000
playwright-cli snapshot
playwright-cli click e3
playwright-cli screenshot
playwright-cli close
```

> **Full documentation:** `.claude/skills/playwright-cli/`
> Covers all commands, session management, storage state, test generation, tracing, video recording, and request mocking.

**Best for:** Automated test suites, test generation (`codegen`), request mocking, tracing, video recording.

---

## Approach 2: Claude in Chrome

**Manual, conversational testing** using a real Chrome browser with your active login session. You describe what to check — Claude navigates, inspects, and reports back.

```bash
# Enable from CLI
claude --chrome

# Or from within a Claude Code session
/chrome
```

**Prerequisites:** Chrome desktop, Claude Code Chrome extension v1.0.36+, Claude Code CLI v2.0.73+, direct Anthropic plan.

**Best for:** Design verification, visual regression, debugging console errors, authenticated flows, UX walkthroughs, responsive layout checks.

**Limitations:** Desktop only. Not scriptable — cannot run in CI. One session at a time.

> **Reference:** [references/claude-in-chrome.md](references/claude-in-chrome.md)
> **Playbooks:** [examples/claude-in-chrome/testing-workflows.md](examples/claude-in-chrome/testing-workflows.md)

---

## Approach 3: agent-browser

**Fast headless browser CLI** with ref-based selectors (`@e1`, `@e2`). Simpler syntax than Playwright CLI, built-in session persistence, and iOS simulator support.

```bash
agent-browser open http://localhost:3000
agent-browser snapshot -i
agent-browser click @e3
agent-browser screenshot /tmp/page.png
agent-browser close
```

> **Full documentation:** `.claude/skills/agent-browser/`
> Covers all commands, session management, authentication, templates, and more.

**Best for:** Quick page checks, headless CI, form filling, data extraction, parallel sessions.

> **Reference:** [references/agent-browser.md](references/agent-browser.md)
> **Example:** [examples/agent-browser/quick-checks.sh](examples/agent-browser/quick-checks.sh)

---

## Shared: Local Server Management

All three approaches can use `scripts/with_server.py` to auto-start and stop dev servers.

**Run `--help` first** to see usage. Do not read the source — use it as a black-box script.

**Single server:**
```bash
python scripts/with_server.py --server "pnpm dev" --port 3000 -- <your_command>
```

**Multiple servers (e.g., backend + frontend):**
```bash
python scripts/with_server.py \
  --server "cd backend && python server.py" --port 3000 \
  --server "cd frontend && pnpm dev" --port 5173 \
  -- <your_command>
```

The `--` separator is required before the command to run once servers are ready.

---

## Legacy: Playwright Python Scripts

The original approach — write Python scripts using `playwright.sync_api`. Still works but the CLI-based approaches above are preferred for most tasks.

**Examples:** [examples/playwright-python/](examples/playwright-python/)
- `console_logging.py` — Capturing console logs during automation
- `element_discovery.py` — Discovering buttons, links, and inputs on a page
- `static_html_automation.py` — Using `file://` URLs for local HTML

---

## Reference Files

| Path | Description |
|------|-------------|
| `references/claude-in-chrome.md` | Claude in Chrome prerequisites, capabilities, and workflow patterns |
| `references/agent-browser.md` | agent-browser quick-start and comparison with playwright-cli |
| `examples/playwright-python/` | Legacy Python Playwright example scripts |
| `examples/claude-in-chrome/testing-workflows.md` | Conversational testing playbooks |
| `examples/agent-browser/quick-checks.sh` | Bash example with server auto-management |
| `scripts/with_server.py` | Server lifecycle management (shared across all approaches) |
