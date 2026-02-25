# Shape Spec

Gather context, research, and structure planning for significant work. **Run this command while in plan mode.**

## Important Guidelines

- **Always use AskUserQuestion tool** when asking the user anything
- **Offer suggestions** — Present options the user can confirm, adjust, or correct
- **Keep it lightweight** — This is shaping, not exhaustive documentation

## Prerequisites

This command **must be run in plan mode**.

**Before proceeding, check if you are currently in plan mode.**

If NOT in plan mode, **stop immediately** and tell the user:

```
Shape-spec must be run in plan mode. Please enter plan mode first, then run /shape-spec again.
```

Do not proceed with any steps below until confirmed to be in plan mode.

## Execution Constraints [HARD]

This command is **spec shaping and spec writing only**.

- Do NOT start implementation work under any circumstances
- Do NOT create or execute implementation tasks
- Do NOT transition into run or execution mode
- Do NOT modify production code as part of this command

If the user asks to start coding while running `/shape-spec`, stop and respond:

```
/shape-spec only shapes and writes spec documentation. Implementation must be started separately with an implementation command/workflow.
```

## Process

The workflow has 5 phases with 14 steps. Phases A-C gather context and draft the spec. Phase D runs a review-and-refine loop. Phase E finalizes and saves files.

---

### Phase A: Scope and Research

#### Step 1: Clarify What We're Building

Use AskUserQuestion to understand the scope:

```
What are we building? Please describe the feature or change.

(Be as specific as you like — I'll ask follow-up questions if needed)
```

Based on their response, ask 1-2 clarifying questions if the scope is unclear. Examples:

- "Is this a new feature or a change to existing functionality?"
- "What's the expected outcome when this is done?"
- "Are there any constraints or requirements I should know about?"

Capture the user's original description verbatim — it will be saved as `idea.md` in the spec folder.

#### Step 2: Gather Visuals

Use AskUserQuestion:

```
Do you have any visuals to reference?

- Mockups or wireframes
- Screenshots of similar features
- Examples from other apps

(Paste images, share file paths, or say "none")
```

If visuals are provided, note them for inclusion in the spec folder.

#### Step 3: Deep Research

Launch three parallel research tracks to gather external documentation, community knowledge, and repo-specific context. All three run simultaneously.

**Track 1: Implementation Researcher subagent**

Launch a Task subagent following the agent definition at `.claude/agents/implementation-researcher.md`. This agent uses:

- **Firecrawl CLI** (`firecrawl search`, `firecrawl scrape`, `firecrawl map`) for SDK docs, API specs, and deep content extraction
- **Context7 API** (two-step: search for library ID, then fetch documentation snippets) for up-to-date library documentation
- **GitHub CLI** (`gh`) for related PRs, issues, and reference repositories

Instruct it to research the feature described in Step 1 and return structured findings: executive summary, prerequisites, API/SDK specs, implementation patterns, edge cases, and sources.

**Track 2: Web Researcher subagent**

Launch a Task subagent following the agent definition at `.claude/agents/web-researcher.md`. This agent uses:

- **WebSearch** for broad discovery across blog posts, discussions, and documentation
- **WebFetch** for extracting content from specific URLs

Instruct it to research the same feature and return: discovery summary, community consensus, documentation extracts, alternative approaches, warnings, and sources.

**Track 3: Repo context search**

Run directly (no subagent needed) using Grep, Glob, SemanticSearch, and Read tools to find:

- Existing patterns and conventions relevant to the feature
- Related types, utilities, and shared code
- Similar features already implemented in the codebase
- Configuration and infrastructure that the feature will interact with

**Synthesize and confirm:**

After all three tracks complete, consolidate findings into a research summary and present it to the user via AskUserQuestion:

```
Research complete. Here's what I found:

**External documentation:**
- [Key findings from implementation researcher]

**Community and web sources:**
- [Key findings from web researcher]

**Existing repo patterns:**
- [Key findings from repo search]

Does this research look complete, or should I dig deeper into any area?

(confirm / dig deeper: [specific area])
```

If the user asks to dig deeper, run additional targeted research on the specified area before proceeding.

---

### Phase B: Interactive Shaping

#### Step 4: Identify Reference Implementations

Based on research findings from Step 3, suggest references the user may not have been aware of. Use AskUserQuestion:

```
Is there similar code in this codebase I should reference?

Based on my research, I found these potentially relevant patterns:
- [patterns discovered in Step 3 repo search]

Additional examples:
- "The comments feature is similar to what we're building"
- "Look at how src/features/notifications/ handles real-time updates"
- "No existing references"

(Point me to files, folders, or features to study — or confirm the ones I found)
```

If references are provided or confirmed, read and analyze them to inform the spec.

#### Step 5: Check Product Context

Check if `agent-os/product/` exists and contains files.

If it exists, read key files (like `mission.md`, `roadmap.md`, `tech-stack.md`) and use AskUserQuestion:

```
I found product context in agent-os/product/. Should this feature align with any specific product goals or constraints?

Key points from your product docs:
- [summarize relevant points]

(Confirm alignment or note any adjustments)
```

If no product folder exists, skip this step.

#### Step 6: Surface Relevant Standards

Read `agent-os/standards/index.yml` to identify relevant standards based on the feature being built.

Use AskUserQuestion to confirm:

```
Based on what we're building, these standards may apply:

1. **api/response-format** — API response envelope structure
2. **api/error-handling** — Error codes and exception handling
3. **database/migrations** — Migration patterns

Should I include these in the spec? (yes / adjust: remove 3, add frontend/forms)
```

Read the confirmed standards files to include their content in the spec context.

---

### Phase C: Spec Drafting

#### Step 7: Generate Spec Folder Name

Create a folder name using this format:

```
YYYY-MM-DD-HHMM-{feature-slug}/
```

Where:

- Date/time is current timestamp
- Feature slug is derived from the feature description (lowercase, hyphens, max 40 chars)

Example: `2026-01-15-1430-user-comment-system/`

**Note:** If `agent-os/specs/` doesn't exist, create it when saving the spec folder.

#### Step 8: Structure the Spec

Present this structure to the user:

```
Here's the spec structure. This command shapes and writes documentation only.

---

## Spec Documentation to Save

Create `agent-os/specs/{folder-name}/` with:

- **idea.md** — Your original feature description captured verbatim
- **research.md** — Synthesized research findings from all sources
- **plan.md** — The full shaped plan and implementation considerations (non-executable)
- **shape.md** — Shaping notes (scope, decisions, context from our conversation)
- **standards.md** — Relevant standards that apply to this work
- **references.md** — Pointers to reference implementations studied (internal + external)
- **reviews.md** — Review feedback history and resolutions
- **visuals/** — Any mockups or screenshots provided

## Implementation Considerations (for later execution)

- [High-level work areas]
- [Risks or constraints]
- [Dependencies or sequencing notes]

---

Does this spec structure look right? (confirm / adjust)
```

#### Step 9: Draft Spec Content

After the structure is confirmed, draft all spec document content based on:

- The feature scope from Step 1
- Research findings from Step 3
- Patterns from reference implementations (Step 4)
- Product context from Step 5
- Constraints from standards (Step 6)

Document implementation considerations at a high level for future work, but do **not** create executable implementation task lists in this command.

Present a summary of the drafted content to the user before proceeding to review:

```
Draft spec content is ready. Here's a summary:

- **idea.md** — [brief description]
- **research.md** — [number] sources synthesized covering [topics]
- **plan.md** — [number] implementation considerations documented
- **shape.md** — Scope, decisions, and context captured
- **standards.md** — [number] standards included
- **references.md** — [number] references documented

Proceeding to review phase. The spec will be reviewed by three independent reviewers.
```

---

### Phase D: Review and Iterate

This phase runs a review loop. Maximum **3 review iterations** to prevent infinite loops. After 3 rounds, proceed to Phase E regardless with a note about remaining open items.

#### Step 10: Triple Parallel Review

Launch 3 review subagents simultaneously via the Task tool. Each reviewer receives the full draft spec content and evaluates: completeness, clarity, feasibility, missing edge cases, standards alignment, and risk.

**Reviewer 1: Claude**

Launch a Task subagent with the full draft spec. Instruct it to:

- Review the spec for completeness, clarity, and feasibility
- Identify missing edge cases, ambiguities, and risks
- Check alignment with the included standards
- Return structured feedback with severity levels: P0 (critical/blocking), P1 (important), P2 (moderate), P3 (minor/suggestion)

**Reviewer 2: Codex (via Codex CLI)**

Launch a Task subagent that runs the Codex CLI to review the spec:

1. Pipe the full spec content as a review prompt to Codex:

   ```bash
   echo "Review this feature spec for completeness, feasibility, missing edge cases, and risk. For each issue found, classify as P0 (critical/blocking), P1 (important/should fix), P2 (moderate/nice to fix), or P3 (minor/suggestion). Include issue description and suggested improvement.

   <full spec content>" | codex exec --sandbox read-only --skip-git-repo-check --full-auto 2>/dev/null
   ```

2. Returns the P0-P3 structured feedback

If Codex fails to respond or errors, note it and continue with available reviews. Maximum 3 retries before marking as unavailable.

**Reviewer 3: Gemini (via Gemini CLI)**

Launch a Task subagent that runs the Gemini CLI to review the spec:

1. Run Gemini in read-only plan mode with the spec content:

   ```bash
   gemini --approval-mode plan -p "Review this feature spec for completeness, feasibility, missing edge cases, and risk. For each issue found, classify as P0 (critical/blocking), P1 (important/should fix), P2 (moderate/nice to fix), or P3 (minor/suggestion). Include issue description and suggested improvement.

   <full spec content>"
   ```

2. Returns the P0-P3 structured feedback

If Gemini fails to respond or errors, note it and continue with available reviews. Maximum 3 retries before marking as unavailable.

#### Step 11: Synthesize Feedback

Consolidate all three reviews into a single deduplicated, prioritized list organized by severity (P0 first, then P1, P2, P3). For each item note which reviewer(s) flagged it.

Present the consolidated feedback to the user via AskUserQuestion:

```
Review round [N] complete. Here's the consolidated feedback:

**P0 — Critical (must address):**
- [issue] (flagged by: Claude, Gemini)

**P1 — Important (should address):**
- [issue] (flagged by: Codex)

**P2 — Moderate (nice to address):**
- [issue] (flagged by: Claude)

**P3 — Minor (suggestions):**
- [issue] (flagged by: Gemini)

Which items should I incorporate into the spec?

(all / P0-P1 only / specific items: 1,3,5 / none — proceed as-is)
```

#### Step 12: Refine and Loop Check

If the user accepted feedback that requires spec changes:

1. Apply the accepted changes to the draft spec content
2. Log the changes and their resolutions for `reviews.md`
3. Loop back to **Step 10** for re-review of the updated spec

If no meaningful changes remain (all reviewers satisfied, user chose "none", or user overrides):

- Log the final review state for `reviews.md`
- Proceed to **Phase E**

If this is review iteration 3:

- Note any remaining open items in `reviews.md`
- Proceed to **Phase E** regardless

---

### Phase E: Finalize

#### Step 13: User Approval Gate

When the spec has passed review (or reached max iterations), use AskUserQuestion:

```
Spec shaping and review complete. Documentation is ready.

1. Save the spec documentation
2. Adjust the spec before saving (returns to drafting)
3. Cancel

Important: This command stops after saving spec documentation. It does not start implementation.
Implementation must be initiated separately with another command/workflow.

What would you like to do? (save / adjust / cancel)
```

If user chooses:

- **save**: Proceed to Step 14.
- **adjust**: Collect feedback, revise spec docs, and return to Step 9 (Draft Spec Content).
- **cancel**: Exit without saving or starting implementation.

#### Step 14: Write Spec Files

Write the full spec folder to `agent-os/specs/{folder-name}/`:

1. Create the directory `agent-os/specs/{folder-name}/`
2. Write all spec files: `idea.md`, `research.md`, `plan.md`, `shape.md`, `standards.md`, `references.md`, `reviews.md`
3. Copy any visuals to `visuals/` subfolder
4. Confirm completion to the user:

```
Spec documentation saved to agent-os/specs/{folder-name}/:

  idea.md
  research.md
  plan.md
  shape.md
  standards.md
  references.md
  reviews.md
  visuals/

This command is complete. Implementation must be started separately.
```

---

## Output Structure

The spec folder will contain:

```
agent-os/specs/{YYYY-MM-DD-HHMM-feature-slug}/
├── idea.md           # Original user description
├── research.md       # Synthesized research findings
├── plan.md           # Full shaped plan with implementation considerations
├── shape.md          # Shaping decisions and context
├── standards.md      # Which standards apply and key points
├── references.md     # Pointers to similar code (internal + external)
├── reviews.md        # Review feedback history and resolutions
└── visuals/          # Mockups, screenshots (if any)
```

---

## Content Templates

### idea.md Content

```markdown
# {Feature Name} — Original Idea

## Description

[User's original feature description, captured verbatim from Step 1]

## Clarifications

- [Answers to clarifying questions from Step 1]
- [Additional context provided by the user]
```

### research.md Content

```markdown
# {Feature Name} — Research Findings

## Executive Summary

[High-level summary of what was discovered across all research tracks]

## External Documentation (Implementation Researcher)

### APIs and SDKs

- [API/SDK specs discovered]
- [Version requirements and compatibility notes]

### Implementation Patterns

- [Patterns and approaches found in external sources]

### Edge Cases and Gotchas

- [Known issues, limitations, or pitfalls]

## Community and Web Sources (Web Researcher)

### Community Consensus

- [What the community recommends]

### Alternative Approaches

- [Other ways to solve this problem]

### Warnings and Known Issues

- [Common mistakes or issues reported]

## Repo Context

### Existing Patterns

- [Relevant patterns found in the codebase]

### Related Code

- [Files and modules that interact with this feature area]

## Sources

- [List of all URLs, docs, and files consulted]
```

### shape.md Content

The shape.md file should capture:

```markdown
# {Feature Name} — Shaping Notes

## Scope

[What we're building, from Step 1]

## Decisions

- [Key decisions made during shaping]
- [Constraints or requirements noted]

## Context

- **Visuals:** [List of visuals provided, or "None"]
- **References:** [Code references studied]
- **Product alignment:** [Notes from product context, or "N/A"]

## Standards Applied

- api/response-format — [why it applies]
- api/error-handling — [why it applies]
```

### standards.md Content

Include the full content of each relevant standard:

```markdown
# Standards for {Feature Name}

The following standards apply to this work.

---

## api/response-format

[Full content of the standard file]

---

## api/error-handling

[Full content of the standard file]
```

### references.md Content

```markdown
# References for {Feature Name}

## Internal Implementations

### {Reference 1 name}

- **Location:** `src/features/comments/`
- **Relevance:** [Why this is relevant]
- **Key patterns:** [What to borrow from this]

## External References

### {External reference name}

- **Source:** [URL or documentation link]
- **Relevance:** [Why this is relevant]
- **Key takeaways:** [What to apply from this]
```

### reviews.md Content

```markdown
# {Feature Name} — Review History

## Review Round 1

### Reviewer: Claude

- [P0/P1/P2/P3 items raised]

### Reviewer: Codex

- [P0/P1/P2/P3 items raised]

### Reviewer: Gemini

- [P0/P1/P2/P3 items raised]

### Resolution

- [Which items were accepted and how they were addressed]
- [Which items were deferred or rejected, with rationale]

## Review Round 2

[If applicable — same structure]

## Final Status

- **Total review rounds:** [N]
- **Open items:** [Any remaining items noted but not addressed]
- **Reviewers satisfied:** [yes/no per reviewer, or "max iterations reached"]
```

---

## Tips

- **Keep shaping fast** — Don't over-document. Capture enough for clear implementation handoff.
- **Visuals are optional** — Not every feature needs mockups.
- **Standards guide, not dictate** — They inform the plan but aren't always mandatory.
- **Specs are discoverable** — Months later, someone can find this spec and understand what was built and why.
- **Research is parallel** — All three research tracks run simultaneously to save time.
- **Reviews catch blind spots** — Three independent reviewers (Claude, Codex, Gemini) surface issues you might miss.
- **Iterate, but converge** — The review loop caps at 3 iterations to keep progress moving.
- **Implementation is separate** — `/shape-spec` never kicks off coding or task execution.
