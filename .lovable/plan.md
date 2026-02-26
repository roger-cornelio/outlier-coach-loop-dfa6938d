

## Plan: Hardening "Validar texto" Against Crashes

### Problem
The "Validar texto" button in the coach panel causes a gray screen (React crash). The existing `try/catch` in `handleParse` only protects the parsing phase, but crashes can also occur:
1. **During rendering** after `patchDraft` sets state (e.g., accessing `.blocks` on malformed data)
2. **Inside `parseStructuredText`** (3500+ line parser) throwing unhandled exceptions
3. **Excessive `console.log` in render loops** (`[RENDER_CHECK]` runs on every block every render)
4. **No timeout protection** for slow/hanging regex in the parser

### Changes

#### 1. Add React Error Boundary around TextModelImporter
- Create a lightweight `ErrorBoundary` component that catches render-phase crashes
- Wrap `TextModelImporter` in this boundary inside `CoachSpreadsheetTab.tsx`
- On crash: show a recovery UI with "Limpar rascunho" and "Recarregar" buttons instead of gray screen
- This is the **root fix** -- even if parsing succeeds but rendering crashes, the user sees a friendly fallback

#### 2. Line-by-line crash isolation in handleParse
- Wrap `parseStructuredText` call inside a secondary try/catch that catches parser-internal errors
- Add line-number detection: if the parser throws, scan the error stack/message for line info and surface it
- Add the structured logging requested: `VALIDATE_START`, `VALIDATE_SUCCESS`, `VALIDATE_CRASH`

#### 3. Parser timeout protection
- Wrap the `parseStructuredText` call in a `Promise.race` with a 3-second timeout
- Make `handleParse` async
- On timeout: show "Parser demorou demais. Tente reduzir o texto." as a UI error

#### 4. Remove excessive render-phase console.logs
- Remove or gate `[RENDER_CHECK]` and `[RENDER_BLOCK]` logs behind a debug flag (they fire on every render for every block, potentially hundreds of times)
- Keep only error-level logs in render

#### 5. Defensive rendering guards
- In the edit-mode render (line 992), add null checks: `parseResult.days?.map(...)` and guard each `day.blocks?.map(...)` 
- In `previewValidation` IIFE, add try/catch to prevent render crash from validation logic

#### 6. Show error in UI
- When `parseResult` has errors or `structureIssues` with severity ERROR, display a red banner at the top of the import screen with the error message
- The banner already exists for preview validation errors; extend it to also show parse-phase errors

### Technical Details

**Files to modify:**
- `src/components/TextModelImporter.tsx` -- async handleParse, timeout, defensive rendering, reduce logs
- `src/components/CoachSpreadsheetTab.tsx` -- wrap TextModelImporter in ErrorBoundary
- **New file:** `src/components/ui/ErrorBoundary.tsx` -- React class component error boundary

**Files NOT modified:**
- `src/utils/structuredTextParser.ts` -- no changes to the parser itself (too risky, 3500 lines)
- `src/utils/dslParser.ts` -- no changes needed

