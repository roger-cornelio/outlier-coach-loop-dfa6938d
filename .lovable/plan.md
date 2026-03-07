

# Plan: Fix proxy-roxcoach deployment

## Root Cause
The code in `supabase/functions/proxy-roxcoach/index.ts` is already a correct pure passthrough proxy. However, the **deployed** version is an old scraping-based function. The logs confirm this: "Fetching detail page...", "Got HTML, length: 148877", "Extracted 17 splits".

The function is also **missing from `supabase/config.toml`**, which likely prevents proper redeployment.

## Changes

### 1. Add config.toml entry
Add `proxy-roxcoach` to `supabase/config.toml` with `verify_jwt = false` (auth is validated in code):

```toml
[functions.proxy-roxcoach]
verify_jwt = false
```

### 2. Redeploy the edge function
Use the deploy tool to push the current (correct) passthrough code that's already in the repo. No code changes needed to `index.ts` — it already:
- Authenticates the user via `getUser()`
- Calls `https://api-outlier.onrender.com/diagnostico?url=...`
- Returns the full JSON response (all 4 keys: `resumo_performance`, `texto_ia`, `tempos_splits`, `diagnostico_melhoria`)

### 3. Test end-to-end
After deployment, test with the user's URL (`https://www.rox-coach.com/seasons/8/races/2025-rio-de-janeiro/results/roger-cornelio`) to confirm:
- `nome_atleta`, `finish_time`, `evento`, `divisao`, `temporada` populate in `diagnostico_resumo`
- `texto_ia` is saved and rendered in the AI Analysis card
- All 4 sections render correctly with real data

