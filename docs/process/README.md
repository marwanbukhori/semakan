# Review logs

These logs are the controller's ledger from subagent-driven development: one entry per task
dispatched, per task reviewed, per fix round, and per ruling made when a subagent's output
conflicted with the plan, the spec or itself. They are published from a local, git-ignored
working file that is not committed, with agent IDs and local paths removed by
`scripts/publish-review-logs.mjs`.

A ruling records a decision and its cost if wrong: what was decided, why, and what happens if the
decision turns out to be mistaken — an extra fix round, a broken-looking link, a slightly higher
token cost. Reading a ruling means reading past the decision to that last clause: it is the honest
account of what was risked, not just what was chosen.
