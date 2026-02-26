

## Plan: Wire ErrorBoundary to clearDraft() via useCoachDraft

### What's Wrong
The `ErrorBoundary` in `CoachSpreadsheetTab` currently does a **manual** `localStorage.removeItem(...)` instead of using `clearDraft()` from `useCoachDraft`. This means:
- The React state inside `useCoachDraft` is NOT reset
- If the ErrorBoundary recovers (re-renders without reload), the stale draft data persists in memory

### Fix (2 files, minimal changes)

#### 1. `src/components/CoachSpreadsheetTab.tsx`
- Import `useCoachDraft` from `@/hooks/useCoachDraft`
- Call `const { clearDraft } = useCoachDraft();` inside the component
- Replace the inline `onClearDraft` lambda (lines 401-405) with `onClearDraft={clearDraft}`
- This ensures the same `coachId`-scoped cleanup runs (both localStorage removal AND state reset), since both `CoachSpreadsheetTab` and `TextModelImporter` get `coachId` from the same `useAuth()` hook

#### 2. `src/components/ui/ErrorBoundary.tsx`
- No changes needed -- the existing `onClearDraft` prop name works fine, since the important thing is what function is passed, not the prop name
- `handleClearAndReload` already calls `this.props.onClearDraft?.()` and then resets `hasError` state, which is correct behavior

### Why This Works
- `useCoachDraft` internally uses `useAuth().profile.id` as `coachId`
- `TextModelImporter` also calls `useCoachDraft()` which reads the same `coachId`
- So `clearDraft()` from either location targets the same localStorage key: `outlier:coachDraft:{coachId}`
- After `clearDraft()`: localStorage key is removed AND React state is set to `getEmptyDraft()`
- When ErrorBoundary resets `hasError`, TextModelImporter re-mounts and `useCoachDraft` hydrates from localStorage (now empty) -- clean slate

