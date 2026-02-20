
## Add "Edit" Action to Saved Workouts (Programações Tab)

### What the user wants
When viewing the list of saved workouts in the **Programações** tab, add an edit button (pencil icon) that takes the coach back to the **Importar** tab with the workout's data pre-loaded into the editor — allowing them to change the week and modify exercises.

### How the system currently works

The flow has three distinct areas:

1. **`useCoachDraft`** — persists draft state in `localStorage` (rawText, parsedDays, editedDays, weekId, programName, mode)
2. **`TextModelImporter`** — reads entirely from `useCoachDraft`; when `mode='edit'` and `parsedDays` are present, it shows the edit screen
3. **`CoachProgramsTab`** — renders the list of saved workouts from the database, with action buttons per row
4. **`CoachDashboard`** — parent with tab state (`activeTab`); `CoachProgramsTab` and `CoachSpreadsheetTab` are separate tab contents

The `Pencil` icon already exists in `CoachProgramsTab`'s imports but is not yet wired up (the draft tab only shows for draft status, but doesn't load data back into the editor).

### The Edit Flow to Implement

```text
Programações tab → click ✏️ on a workout
      ↓
1. Load workout data into useCoachDraft (via patchDraft):
   - parsedDays = workout.workout_json
   - editedDays = null (fresh edit)
   - weekId = derived from workout.week_start
   - programName = workout.title
   - mode = 'edit'
   - rawText = '' (no raw text — editing parsed days directly)
   - parseResult = synthetic (success=true, days=parsedDays)
2. Switch parent tab to 'importar' (CoachDashboard.activeTab)
3. CoachSpreadsheetTab renders → TextModelImporter hydrates from draft → shows Edit screen
```

### Technical Challenge: Cross-Component Communication

`CoachProgramsTab` and `CoachDashboard` are separate components. `CoachDashboard` controls `activeTab`. We need to:
- Pass an `onEditWorkout` callback from `CoachDashboard` → `CoachProgramsTab`
- When called, this callback: (a) writes the workout data into `useCoachDraft`, then (b) sets `activeTab = 'importar'`

Since `useCoachDraft` uses `localStorage` directly, the simplest approach is to write to localStorage from `CoachDashboard`'s handler (using the same key format), then switch tabs. When `TextModelImporter` mounts, it will hydrate from localStorage and show the edit screen.

A cleaner alternative: export a `loadWorkoutForEdit` utility from `useCoachDraft` that can be called from outside — but hooks can't be shared across components without a shared instance.

**Best approach:** Write directly to localStorage from the `CoachDashboard` handler (same key: `outlier:coachDraft:{coachId}`), since `useCoachDraft` reads from it on hydration. After writing, switch tabs — React will remount/re-hydrate `TextModelImporter` and read the new state.

However, `TextModelImporter` is already mounted when the tab switches (it may be in the DOM). So we need `useCoachDraft`'s `patchDraft` to be callable externally, or we write to localStorage and trigger a re-read.

**Cleanest solution:** Add an `onEditWorkout` prop to `CoachProgramsTab` that calls a function in `CoachDashboard`. In `CoachDashboard`, use a custom hook or write directly to localStorage using the same key format, then switch to the 'importar' tab. Since `useCoachDraft` in `TextModelImporter` reads from `localStorage` on mount AND via the `patchDraft` mechanism, we need to trigger a re-read. The simplest way: write to localStorage, then switch tabs — if `TextModelImporter` is already mounted, it won't re-read. 

**Final approach:** The cleanest architectural solution is to lift the `useCoachDraft` call up to `CoachDashboard` (or a shared context) so the edit function can be called directly. However, that's a big refactor.

**Pragmatic approach (minimal change):** 
- Add an `editingWorkout` state to `CoachDashboard`
- Pass it down to `CoachSpreadsheetTab` as an `initialWorkout` prop
- `CoachSpreadsheetTab` passes it to `TextModelImporter`
- `TextModelImporter` uses a `useEffect` to load the workout when `initialWorkout` changes, calling `patchDraft` to set the draft state
- After loading, `CoachDashboard` clears `editingWorkout`

### Files to Change

#### 1. `src/pages/CoachDashboard.tsx`
- Add `editingWorkout` state: `useState<CoachWorkout | null>(null)`
- Add `handleEditWorkout(workout: CoachWorkout)` function:
  - Sets `editingWorkout = workout`
  - Sets `activeTab = 'importar'`
- Pass `editingWorkout` and `onClearEditing` to `CoachSpreadsheetTab` (via the tab render)
- Pass `onEditWorkout` to `CoachProgramsTab`
- Import `CoachWorkout` type from `useCoachWorkouts`

#### 2. `src/components/CoachProgramsTab.tsx`
- Add `onEditWorkout?: (workout: CoachWorkout) => void` to `CoachProgramsTabProps`
- Add an **edit button** (Pencil icon) to the action buttons row for **draft** workouts only (shown in image: pencil icon for drafts)
- Wire `onClick={() => onEditWorkout?.(workout)}`
- Tooltip: "Editar programação"

#### 3. `src/components/CoachSpreadsheetTab.tsx`
- Add `initialWorkout?: CoachWorkout | null` and `onClearInitialWorkout?: () => void` to `CoachSpreadsheetTabProps`
- Pass these as new props to `TextModelImporter`

#### 4. `src/components/TextModelImporter.tsx`
- Add `initialWorkout?: CoachWorkout | null` and `onClearInitialWorkout?: () => void` to `TextModelImporterProps`
- Add a `useEffect` that watches `initialWorkout`:
  - When it changes and is not null:
    - Calls `patchDraft` (already available from `useCoachDraft`) with:
      - `parsedDays`: `initialWorkout.workout_json`
      - `editedDays`: `null`
      - `weekId`: derived `WeekPeriod` from `initialWorkout.week_start`
      - `programName`: `initialWorkout.title`  
      - `mode`: `'edit'`
      - `parseResult`: synthetic result with `success: true`, `days` mapped from `workout_json`
      - `rawText`: `''`
    - Calls `onClearInitialWorkout?.()` to prevent re-triggering
  - Switch the inner sub-tab to `'import'` (the `TextModelImporter` tab, not the structured one)

### WeekPeriod Derivation from week_start

`WeekPeriod` requires `{ label: string; startDate: string; endDate: string }`. From `week_start` (a Monday ISO date):
```ts
function deriveWeekPeriod(weekStart: string): WeekPeriod {
  const monday = new Date(weekStart + 'T12:00:00');
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return {
    startDate: weekStart,
    endDate: sunday.toISOString().split('T')[0],
    label: `${fmt(monday)} → ${fmt(sunday)}`,
  };
}
```

### Synthetic ParseResult

`TextModelImporter` requires a valid `ParseResult` to enable the edit screen. We create one from `workout_json`:
```ts
const syntheticParseResult: ParseResult = {
  success: true,
  days: workout.workout_json.map(d => ({
    day: d.day,
    blocks: d.blocks.map(b => ({ ...b })),
  })),
  structureIssues: [],
  rawText: '',
};
```

### Edit Scope

- Edit button appears for **draft** workouts only (consistent with the image shown — only drafts have the edit/pencil icon; published workouts have "copy/republish" instead)
- After loading into the editor, the coach edits and saves via the normal flow (saves as new draft or overwrites)
- The original workout in the database is NOT automatically deleted — the coach must manually delete it or it remains as the original

### Guardrails
- No changes to business logic, validation rules, or publication flow
- No changes to `useCoachDraft`'s internal persistence mechanism
- No new libraries
- Mobile-first: the edit button is a small ghost icon button (consistent with other action buttons in the row)
