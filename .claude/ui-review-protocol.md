# UI/UX adversarial review

> For the primary agent. If you are running as `ui-ux-adversary`, ignore this section.

## When to run

Run the `ui-ux-adversary` subagent when a task:

| Trigger | Mode | When |
| --- | --- | --- |
| Plans a new or changed flow, form, table, modal, bulk action, state/lifecycle logic, permission behavior or interaction pattern | `plan` | Before writing code or editing Figma |
| Changes front-end UI code in a way a user would notice (behavior, layout, states, copy, focus) | `implementation` | Before reporting the task done |
| Creates or edits a design through the Figma MCP (`use_figma`) | `figma` | Before reporting the task done |

A task that is both non-trivial and plan-worthy gets two reviews: `plan` first, then `implementation` or `figma`.

Skip for: copy the user dictated verbatim, refactors with no rendered change, dependency bumps, test-only changes, and tasks where the user said to skip review. When you skip a borderline case, say so in one line.

## Before invoking

- `implementation`: make sure the dev server is running if the project has one. Pass the URL, the changed routes, a test login if needed, and whether the environment is disposable. Pass the git base ref (branch or the commit before your changes).
- `figma`: pass the Figma URLs or file key + node IDs of every frame you created or changed.

## Handoff brief

The subagent starts without this conversation. Send it this, filled in:

```
Mode: plan | implementation | figma
User goal: <what the end user is trying to accomplish, and who they are>
Request: <what the user asked for, in their words where possible>
Proposed solution:
  1. <step>
  2. <step>
Key decisions:
  - <decision> — <reason>
Where to look:
  - Base ref: <branch or sha>
  - Files: <paths>
  - Figma: <urls / node ids>
  - Dev URL + routes: <url> <routes>
  - Test login: <if needed>
  - Environment disposable: yes | no
States handled: <empty, loading, error, ...>
Constraints:
  - <constraint> — confirmed by user | assumed
Out of scope: <what the user explicitly excluded>
```

State decisions and reasons neutrally. Don't argue your case in the brief; the reviewer's job is to test it.

## Handling findings

Answer every finding ID in a table:

| ID | Severity | Decision | Reason / evidence |
| --- | --- | --- | --- |

- **Accept** → fix it.
- **Reject** → only with evidence: a requirement the user stated, a real constraint, or code/design proof. "Out of scope" or "preference" alone is not enough for BLOCKER or HIGH.
- **Defer** → record as a follow-up for the user. Not allowed for BLOCKER.

Re-review: if any BLOCKER or HIGH was accepted (to verify the fix) or rejected (to test the rebuttal), resume the same subagent with SendMessage in `re-review` mode, sending your table and what changed. Do not start a new instance; the resumed one keeps its earlier review. Max 2 re-review rounds. Unresolved disagreement goes to the user with both positions.

If the recommendation is **Reconsider the interaction model**, or a finding is flagged as a product-logic issue: stop, summarize the objection in a few lines, and ask the user before reworking.

## Reporting to the user

In the final reply include a short review summary:
- verdict (one line)
- table of BLOCKER / HIGH / MEDIUM findings with the decision taken
- deferred items and anything still disputed

Don't paste the full review.
