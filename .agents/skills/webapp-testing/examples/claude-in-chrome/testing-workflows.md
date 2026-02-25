# Claude in Chrome — Testing Workflows

These are **conversational playbooks**, not executable scripts. Claude in Chrome operates through natural language — you describe what to check and Claude navigates, inspects, and reports back.

## Playbook 1: Design Verification

Compare a running page against a design specification or mockup.

```
You:    Open http://localhost:3000 and take a screenshot of the homepage.

Claude: [navigates, screenshots]
        Here's the current homepage. What should I compare against?

You:    Check if the hero section has:
        - A heading with text "Welcome to Alia"
        - A CTA button with rounded corners and blue background
        - At least 24px padding on mobile

Claude: [inspects DOM, measures computed styles]
        The heading reads "Welcome to Alia" ✓
        The CTA button has border-radius: 8px and bg-blue-600 ✓
        Mobile padding is 16px — that's 8px less than the spec ✗
        The padding is set by class `px-4` in the hero component.
        Changing to `px-6` would give you 24px.
```

## Playbook 2: Authenticated Flow Testing

Test pages that require login using your existing browser session.

```
You:    I'm logged into the admin dashboard. Open /admin/users and verify
        the user table loads correctly.

Claude: [opens page using your active session cookies]
        The user table loaded with 47 rows. Columns are:
        Name, Email, Role, Last Active, Actions.
        All rows rendered. No empty state showing.

You:    Click the "Edit" button on the first user and check if the
        edit modal opens.

Claude: [clicks, inspects]
        The edit modal opened with pre-filled fields:
        - Name: "Jane Smith"
        - Email: "jane@example.com"
        - Role dropdown set to "Admin"
        The modal has Save and Cancel buttons. No console errors.
```

## Playbook 3: Live Debugging

Debug a page issue by checking console output and iterating on fixes.

```
You:    Open http://localhost:3000/dashboard. I'm seeing a blank page.
        Check the console for errors.

Claude: [navigates, reads console]
        Found 1 error:
        TypeError: Cannot read properties of undefined (reading 'map')
          at DashboardCards (dashboard-cards.tsx:23)
        The `data` prop is undefined on first render before the API
        responds.

You:    I just added a loading guard. Refresh and check again.

Claude: [reloads page]
        Page now renders correctly. Dashboard shows 4 cards.
        Console is clean — no errors or warnings.
        Screenshot attached.
```

## Playbook 4: Responsive Layout Check

Verify that a page works across different viewport sizes.

```
You:    Open localhost:3000 and check the navigation at mobile,
        tablet, and desktop widths.

Claude: [resizes to 375px]
        Mobile: Hamburger menu visible, nav items hidden. Tapping
        the hamburger reveals a slide-out menu with all 5 links.

        [resizes to 768px]
        Tablet: Navigation shows as a horizontal bar with 3 visible
        items and a "More" dropdown for the remaining 2.

        [resizes to 1280px]
        Desktop: All 5 navigation items visible in the top bar.
        No hamburger menu. Layout looks correct at all three sizes.
```

## Tips

- **Be specific** about what to check — "verify the button looks right" is vague; "check if the button has rounded corners and uses the primary color" is actionable
- **Iterate** — Claude in Chrome is best for back-and-forth debugging, not one-shot checks
- **Leverage login state** — This is the only testing approach that can access pages behind your authentication without scripting a login flow
- **Combine with code edits** — Fix code in your editor, then ask Claude to refresh and re-verify in the same session
