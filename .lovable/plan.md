
## Fix: Journey Ruler Showing False Progress

### Problem
The `useJourneyProgress` hook fetches all 6 level rules from the database (BEGINNER, INTERMEDIATE, ADVANCED, OPEN, PRO, ELITE), but the UI only uses 3 levels (OPEN, PRO, ELITE). An OPEN athlete gets `level_order=4`, which translates to `currentLevelIndex=3`, making `continuousPosition = 3/6 = 50%` -- showing the ruler half-filled with zero benchmarks or sessions.

### Solution
Filter the database level rules to only include the 3 active levels (OPEN, PRO, ELITE) and recalculate indices based on the filtered set.

### Technical Changes

**File: `src/hooks/useJourneyProgress.ts`**

1. After fetching `status_level_rules`, filter to only keep levels matching the 3-tier system:
   ```typescript
   const activeLevelKeys = ['OPEN', 'PRO', 'ELITE'];
   const activeLevels = levelsRes.data.filter(l => activeLevelKeys.includes(l.level_key));
   ```

2. Use `activeLevels` instead of all `levelRules` throughout the hook. This way:
   - OPEN gets `level_order` remapped to index 0
   - PRO to index 1  
   - ELITE to index 2
   - `continuousPosition = (0 + 0) / 3 = 0` for an OPEN athlete with no progress

3. Recalculate `currentLevelIndex` using the position within the filtered array rather than raw `level_order - 1`:
   ```typescript
   const currentLevelIndex = activeLevels.findIndex(l => l.level_key === currentLevelKey);
   ```

4. Fix `totalLevels` to use `activeLevels.length` (3) instead of `levelRules.length` (6).

This single change corrects the `continuousPosition`, `currentLevelIndex`, `targetLevelIndex`, and all derived progress values, ensuring the ruler starts at 0% for a fresh OPEN athlete.
