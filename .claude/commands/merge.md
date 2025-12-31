---
description: Verify PR checks pass, fix issues if needed, merge, and send Slack summary
allowed-tools: Bash, Read, Glob, Grep, Edit, Write
---

# Merge PR

Run local checks (format, lint, test), fix any issues, merge the PR, and send a business-friendly summary to Slack.

## Instructions

1. First, check if we're on a feature branch with an open PR using `gh pr view`

2. Run local checks in a loop until clean:
   ```bash
   pnpm format:fix
   pnpm lint:fix
   pnpm test
   ```

3. After running fixes, check for uncommitted changes:
   ```bash
   git status --porcelain
   ```

4. If there are changes:
   - Commit with message "fix: auto-fix linting/formatting issues"
   - Push the changes
   - Go back to step 2 and run checks again

5. If no changes and all checks pass:
   - Merge the PR using `gh pr merge --squash --delete-branch`

6. After successful merge, send a Slack summary as described below

## Slack Summary

After the PR is merged, send a summary using the slack-notify script:

```bash
npx tsx ~/.claude/scripts/slack-notify.ts C09PCQZTAP9 "<message>"
```

The summary should be written for **non-technical users**:
- Use plain English, no technical jargon
- Focus on WHAT changed from a user perspective
- Keep it very simple and high level (1-3 bullet points)
- Do NOT mention PRs, code, technical implementation details

Format the message like this:
```
*App Update: [Brief Title]*
- [Simple user-facing change 1]
- [Simple user-facing change 2]
```

Example command:
```bash
npx tsx ~/.claude/scripts/slack-notify.ts C09PCQZTAP9 $'*App Update: Better Search*\n- You can now filter results by date\n- Search is faster'
```

Example bad summary (too technical):
```
PR #117 Merged - Added elasticsearch indexing with pagination support, refactored the SearchService class, fixed N+1 query issue
```
