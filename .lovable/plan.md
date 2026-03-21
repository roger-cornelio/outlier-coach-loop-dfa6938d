

## Plano: Adicionar useEffect para Recalcular Cobertura ao Atualizar Biblioteca

### O que será feito

Adicionar um `useEffect` em `TextModelImporter.tsx` que recalcula o `coverageReport` automaticamente sempre que a `exerciseLibrary` mudar (ex: após o admin aprovar um exercício novo e o cache do React Query refrescar).

O cache de 30 minutos será mantido como está — impacto zero em performance.

### Mudança técnica

**Arquivo: `src/components/TextModelImporter.tsx`**

Após a linha ~166 (onde `coverageReport` é declarado), adicionar:

```ts
// Recalcula cobertura quando a biblioteca de exercícios atualiza
useEffect(() => {
  if (!parseResult || !exerciseLibrary.length || !coverageReport) return;
  const updated = calculateParsingCoverage(parseResult, exerciseLibrary.map(e => e.name));
  // Só atualiza se houve mudança real
  if (updated.successRate !== coverageReport.successRate || 
      updated.unmatchedLines.length !== coverageReport.unmatchedLines.length) {
    setCoverageReport(updated);
  }
}, [exerciseLibrary]);
```

### Resultado
Quando o admin aprova um exercício e o cache eventualmente revalida (ou o coach recarrega a página), a cobertura é recalculada automaticamente — exercícios aprovados saem da lista de "não interpretados".

### Arquivo modificado
- `src/components/TextModelImporter.tsx` — 1 useEffect adicionado (~8 linhas)

