# Implementation Loop

## -1. Sync GitHub Issues

### -1a. List open issues and compare with known-issues/

```bash
# List issue numbers from GitHub
gh issue list --state open --json number --jq '.[].number'

# List existing known-issues files
ls known-issues/
```

### -1b. For any issues on GitHub not in known-issues/, fetch and save

```bash
# Fetch issue #N and save as markdown
gh issue view N --json number,title,url,author,createdAt,state,body \
  --jq '"# \(.title)\n\n**Issue:** [#\(.number)](\(.url))\n**Author:** \(.author.login)\n**Created:** \(.createdAt[:10])\n**State:** \(.state)\n\n\(.body)"' \
  > known-issues/issue-N-slug.md
```

### -1c. Incorporate new issues

Read any new issues in `known-issues/` and incorporate them into the active plan (see "Active Plan" header above).

Review open_questions to see if human has answered. If so, update the active plan.

## 1. Implement

Read the active plan file (specified in "Active Plan" header above) and implement the **single highest priority feature** using up to 5 subagents.

**Note:** Anything listed as "out of scope" or "future work" is now **in scope**.

## 2. Validate

Ensure all tests and linting passes:

```bash
pnpm typecheck && pnpm build && pnpm test
```

## 3. Update Plan

Update the active plan file with your progress:
- Mark completed items
- Add any new discoveries or blockers
- Update priorities if needed
- When ALL items are completed, spawn 5 subagents to review all changes and ensure they followed the standards, update the plan with any necessary changes needed. If no changes needed mark the status as complete and change the status header to: `> **STATUS: ✅ COMPLETE**`

## 4. Commit

```bash
git add -A
git commit -m "descriptive commit message"
```

**Do not include any Claude attribution in commits.**
