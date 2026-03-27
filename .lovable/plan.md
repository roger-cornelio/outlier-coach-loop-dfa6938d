

## Plano: Atualizar "Últ. Simulado" e régua ao registrar novo simulado

### Problema
O `useEffect` que busca `lastSimulationTime` na tabela `simulations` (linha ~1804 do `DiagnosticRadarBlock.tsx`) só executa quando `profile?.user_id` muda — ou seja, apenas no mount. Quando o atleta registra um novo simulado, o componente não re-busca o dado, e a régua + coluna "Últ. Simulado" ficam desatualizados.

### Solução
Adicionar `externalResultsRefreshKey` do store como dependência do `useEffect` que busca o último simulado (linha ~1817). Assim, quando o simulado é registrado e o store dispara `triggerExternalResultsRefresh()`, o componente re-executa a query e atualiza:

1. O valor exibido em "Últ. Simulado"
2. O progresso da régua (que depende de `lastSimulationTime`)
3. O "Resultado Esperado" (que prioriza simulado como base)

### Alteração

**Arquivo: `src/components/DiagnosticRadarBlock.tsx`**

- Importar `externalResultsRefreshKey` do `useOutlierStore` (provavelmente já importado)
- Linha ~1817: adicionar `externalResultsRefreshKey` ao array de dependências do `useEffect`

```typescript
// De:
}, [profile?.user_id]);

// Para:
}, [profile?.user_id, externalResultsRefreshKey]);
```

### O que não muda
- Lógica de cálculo da régua, projeção, prova alvo
- Nenhuma tabela no banco

