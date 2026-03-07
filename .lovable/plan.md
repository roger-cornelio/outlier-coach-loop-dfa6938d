

## Plano: Usar posição na lista do HYROX como critério de ordenação cronológica

### Problema atual
O sistema usa apenas `season_id` para ordenar provas (mais recente primeiro). Dentro da mesma temporada, não há critério de desempate — provas de eventos diferentes ficam em ordem aleatória.

### Solução
A lista de eventos (`event_main_group`) no site do HYROX já vem ordenada da prova mais recente para a mais antiga. Vamos capturar o **índice** de cada evento nessa lista e incluí-lo no resultado da busca como campo `event_index`. Quanto menor o índice, mais recente a prova.

### Alterações

**1. Edge Function `supabase/functions/search-hyrox-athlete/index.ts`**

- `fetchEventList()`: Retornar array de objetos `{ name, index }` em vez de `string[]`, preservando a posição original na lista do HYROX.
- `searchSeasonAllEvents()`: Propagar o `event_index` para cada resultado encontrado naquele evento.
- `searchEventForAthlete()`: Receber e repassar o `event_index` para `extractResultEntries()`.
- `extractResultEntries()`: Incluir `event_index` no objeto de resultado retornado.
- O resultado final de cada prova terá o novo campo: `event_index: number` (0 = mais recente naquela temporada).

**2. Frontend: `src/components/RoxCoachExtractor.tsx`**

- Atualizar interface `SearchResult` para incluir `event_index?: number`.
- Trocar ordenação de `b.season_id - a.season_id` para: primeiro por `season_id` desc, depois por `event_index` asc (menor índice = mais recente).

**3. Frontend: `src/components/ProvasTab.tsx`**

- Mesma atualização de interface e ordenação.

### Lógica de ordenação final
```text
sorted = results.sort((a, b) => {
  if (b.season_id !== a.season_id) return b.season_id - a.season_id;
  return (a.event_index ?? 999) - (b.event_index ?? 999);
});
```

Sem migração de banco necessária — o `event_index` é usado apenas em memória para ordenação.

