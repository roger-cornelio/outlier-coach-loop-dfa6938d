

# Plan: Fix formatting in ImprovementTable

## Current State
The database has **correct data** — all values properly stored in seconds. The table renders but has two formatting issues:

1. **"Diferença" shows `0` instead of `00:00`** for rows with zero improvement — caused by `formatTime` returning `'0'` when `seconds <= 0`
2. **"Métrica" always shows "Tempo"** — this is correct behavior since the API doesn't send a `metric` field per item; the fallback `'time'` is translated to "Tempo"

## Changes

### 1. Fix `formatTime` in `ImprovementTable.tsx` (line 31-34)
Change the function to always return `MM:SS` format, including for zero:

```typescript
function formatTime(seconds: number): string {
  if (seconds == null || isNaN(seconds) || seconds < 0) return '00:00';
  return secondsToTime(Math.max(0, seconds));
}
```

### 2. Fix `secondsToTime` in `types.ts` (line 52)
The root helper also returns `'0:00'` for zero — it should return `'00:00'`:

```typescript
export function secondsToTime(sec: number): string {
  if (sec == null || isNaN(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
```

This will make all zero-improvement rows show `00:00` instead of `0`, matching the API's `"00:00"` format shown in the JSON screenshot.

No database changes needed. Two files affected: `ImprovementTable.tsx` and `types.ts`.

