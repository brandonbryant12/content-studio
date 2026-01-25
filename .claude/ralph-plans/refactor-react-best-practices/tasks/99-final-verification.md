# Task 99: Final Verification

## Standards Checklist

Review ALL standards referenced across all prior tasks:
- [ ] `.claude/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md`
- [ ] `.claude/skills/vercel-react-best-practices/rules/bundle-dynamic-imports.md`
- [ ] `.claude/skills/vercel-react-best-practices/rules/bundle-defer-third-party.md`
- [ ] `.claude/skills/vercel-react-best-practices/rules/rerender-memo.md`
- [ ] `.claude/skills/vercel-react-best-practices/rules/rerender-memo-with-default-value.md`
- [ ] `.claude/skills/vercel-react-best-practices/rules/rerender-dependencies.md`
- [ ] `.claude/skills/vercel-react-best-practices/rules/rerender-functional-setstate.md`
- [ ] `.claude/skills/vercel-react-best-practices/rules/rendering-hoist-jsx.md`
- [ ] `.claude/skills/vercel-react-best-practices/rules/js-cache-function-results.md`
- [ ] `.claude/skills/vercel-react-best-practices/rules/client-event-listeners.md`

## Verification Scope

Launch up to 5 subagents to verify:

### 1. Barrel Import Verification
- Grep for `export *` in feature index files
- Grep for imports from `@/features/[feature]` (should be direct paths)
- Verify no transitive barrel imports

### 2. React.memo Verification
- All list item components use React.memo
- CollaboratorRow (podcasts and voiceovers) memoized
- VoiceSelector memoized
- CharacterCountRing memoized

### 3. useCallback/useMemo Verification
- No inline arrow functions in list map callbacks
- All event handlers use useCallback
- All filter operations use useMemo
- Settings return objects memoized

### 4. Dynamic Import Verification
- SetupWizardContainer dynamically imported
- AddCollaboratorDialog (both features) dynamically imported
- DocumentUploader dynamically imported
- Verify chunks in build output

### 5. Hook Optimization Verification
- use-sse.ts uses refs for stable callbacks
- use-keyboard-shortcut.ts has correct dependencies
- List hooks use string comparison for date sorting
- No new Date() in select functions

## Subagent Results

<!-- Agent writes results from each subagent -->

### Subagent 1: Barrel Imports
- [ ] Results logged

### Subagent 2: React.memo
- [ ] Results logged

### Subagent 3: useCallback/useMemo
- [ ] Results logged

### Subagent 4: Dynamic Imports
- [ ] Results logged

### Subagent 5: Hook Optimizations
- [ ] Results logged

## Bundle Size Comparison

Before/after comparison:

```bash
# Run before starting tasks
pnpm --filter web build
ls -la apps/web/dist/assets/*.js | head -20 > /tmp/bundle-before.txt

# Run after all tasks complete
pnpm --filter web build
ls -la apps/web/dist/assets/*.js | head -20 > /tmp/bundle-after.txt

# Compare
diff /tmp/bundle-before.txt /tmp/bundle-after.txt
```

## Final Validation

```bash
pnpm typecheck && pnpm build && pnpm test
```

## Final Status

- [ ] All subagents passed
- [ ] No tasks reopened
- [ ] Validation commands pass
- [ ] Bundle size improved (or documented why not)
- [ ] All acceptance criteria from tasks 01-17 verified
