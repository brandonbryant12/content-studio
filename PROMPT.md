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

Read any new issues in `known-issues/` and incorporate them into @IMPLEMENTATION_PLAN.md

## 1. Implement

Read @IMPLEMENTATION_PLAN.md and implement the **single highest priority feature** using up to 5 subagents.

**Note:** Anything listed as "out of scope" or "future work" is now **in scope**.

## 2. Validate

Ensure all tests and linting passes:

```bash
pnpm typecheck && pnpm test && pnpm build
```

## 3. Update Plan

Update IMPLEMENTATION_PLAN.md with your progress:
- Mark completed items
- Add any new discoveries or blockers
- Update priorities if needed

## 4. Commit

```bash
git add -A
git commit -m "descriptive commit message"
```

**Do not include any Claude attribution in commits.**
