

## Problema

Quando a prova é importada pelo CTA do dashboard (`DiagnosticRadarBlock`), o diagnóstico é salvo corretamente no banco (`diagnostico_resumo`, `diagnostico_melhoria`, `tempos_splits`). Porém, a aba Diagnóstico (`RoxCoachDashboard`) **não recarrega automaticamente** porque:

1. O CTA chama `triggerExternalResultsRefresh()` → incrementa `externalResultsRefreshKey` no Zustand store
2. A `BenchmarksScreen` tem um `refreshKey` **local** (`useState(0)`) que é passado como prop para `RoxCoachDashboard`
3. A `BenchmarksScreen` **não escuta** o `externalResultsRefreshKey` do store — só incrementa `refreshKey` quando o usuário adiciona resultado **dentro da própria aba**
4. Resultado: o `RoxCoachDashboard` nunca re-fetcha os dados após importação externa

## Solução

Fazer a `BenchmarksScreen` escutar o `externalResultsRefreshKey` do Zustand store e sincronizar com seu `refreshKey` local.

### Alteração única em `src/components/BenchmarksScreen.tsx`

1. Importar `externalResultsRefreshKey` do store
2. Adicionar um `useEffect` que incrementa `refreshKey` sempre que `externalResultsRefreshKey` muda
3. Isso faz o `RoxCoachDashboard` re-buscar os dados do banco automaticamente

```text
BenchmarksScreen
  ├─ subscribes to store.externalResultsRefreshKey
  ├─ useEffect → setRefreshKey(prev => prev + 1)
  └─ <RoxCoachDashboard refreshKey={refreshKey} />
       └─ useEffect re-fetches diagnostico_resumo ✅
```

Essa é uma mudança de ~5 linhas, sem risco de side-effects.

