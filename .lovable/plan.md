

## Problem

The `source_index` formula is inverted. Within a HYROX season, events are listed chronologically -- **higher `event_index` = more recent event**. The current formula `(season_id * 1000) + (999 - event_index)` incorrectly treats lower `event_index` as more recent, causing Mexico City (index 39) to rank above Sao Paulo (index 54).

**Data proof:**
- Mexico City: `source_index = 8960` (season 8, event_index ~39)
- Sao Paulo: `source_index = 8945` (season 8, event_index ~54)

Sao Paulo happened after Mexico City in season 8, so it should appear first.

## Fix

### 1. Fix the formula in `ProvasTab.tsx`

Change from:
```
(season_id * 1000) + (999 - event_index)
```
To:
```
(season_id * 1000) + event_index
```

Higher `event_index` within the same season = higher `source_index` = more recent. The sort in `BenchmarkHistory.tsx` already sorts by `source_index DESC`, so this will correctly put Sao Paulo above Mexico City.

### 2. Existing data needs re-import

The 4 existing records with `source_index` values are wrong. The user will need to delete and re-import these provas for the correct ordering. Alternatively, a migration could recalculate: `UPDATE benchmark_results SET source_index = (source_index / 1000) * 1000 + (999 - (source_index % 1000)) WHERE source_index IS NOT NULL`, but re-import is cleaner.

