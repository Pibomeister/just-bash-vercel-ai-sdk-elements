# Claude in Chrome

Use Claude in Chrome when you need to **see and interact with a real browser** — visual verification, debugging with live state, or testing authenticated flows that share the user's login session.

## Prerequisites

- Google Chrome (desktop only)
- Claude Code Chrome extension v1.0.36+
- Claude Code CLI v2.0.73+
- Direct Anthropic plan (Max, Team, or Enterprise) — not available through API keys

## How to Enable

```bash
# Launch from CLI
claude --chrome

# Or from within a Claude Code session
/chrome
```

Chrome opens a visible window. Claude can navigate, click, type, and take screenshots — all through the real browser with your existing cookies, extensions, and login state.

## Capabilities

| Capability | Details |
|------------|---------|
| **Shared login state** | Uses your active Chrome profile — no re-authentication needed |
| **Visible browser window** | You watch Claude interact in real time |
| **GIF recording** | Can record interactions as animated GIFs for documentation |
| **Console access** | Reads browser console errors and warnings |
| **DOM inspection** | Examines rendered DOM, computed styles, layout |
| **Screenshot capture** | Takes screenshots at any point during interaction |

## Best For

- **Design verification** — Compare a page against a design mock, check spacing, colors, typography
- **Visual regression** — Verify that a code change didn't break the UI
- **Debugging console errors** — Load a page, check for errors, fix code, re-verify in a loop
- **Authenticated flows** — Test internal tools, admin panels, or dashboards behind login
- **UX walkthroughs** — Step through a user journey and report friction points
- **Responsive checks** — Resize the browser window and verify layout at different breakpoints

## Workflow Pattern

Claude in Chrome is **conversational**, not scripted. You describe what to check and Claude navigates and reports back:

```
You:    "Open localhost:3000 and check if the sidebar navigation matches the Figma mock"
Claude: [opens page, inspects layout, takes screenshot]
        "The sidebar is 240px wide as expected, but the 'Settings' icon is
         misaligned — it's 4px lower than the other icons..."

You:    "Check the browser console for any errors after navigating to /dashboard"
Claude: [navigates, reads console]
        "Found 2 warnings: a missing key prop in UserList and a
         deprecated API call in analytics.js:42..."
```

## Limitations

- **Desktop only** — Requires a visible Chrome window; not available in CI or headless environments
- **Not for automation** — Cannot be scripted or run in batch; use playwright-cli or agent-browser for that
- **Extension idle** — The Chrome extension service worker may idle after periods of inactivity; re-invoke `/chrome` if disconnected
- **Single session** — One Chrome window per Claude Code session

## When to Use Something Else

| Instead of Claude in Chrome... | Use... | When... |
|-------------------------------|--------|---------|
| playwright-cli | `.claude/skills/playwright-cli/` | You need automated, repeatable test scripts |
| agent-browser | `.claude/skills/agent-browser/` | You need headless automation or CI integration |
| Playwright Python | `examples/playwright-python/` | You need custom Python automation scripts |
