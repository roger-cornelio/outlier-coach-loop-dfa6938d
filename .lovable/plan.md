

## Plano: Polish Final — De 92% para 99%

### O que falta (3 ajustes identificados na auditoria)

**1. EvolutionTab — padding inconsistente**
- Atual: `px-4` fixo (linha 18)
- Corrigir para: `px-3 sm:px-4` — alinha com o padrão do resto do app

**2. PerformanceFeedback — colunas apertadas no resumo de sessão**
- As colunas "Feito/Esper./Diff" usam `gap-4` e larguras fixas `w-14`/`w-16` que ficam apertadas em 430px
- Reduzir `gap-4` → `gap-2 sm:gap-4` no header e nos BlockRows
- Reduzir larguras: `w-12 sm:w-14` e `w-14 sm:w-16`

**3. PerformanceFeedback — skeleton loading no carregamento da IA**
- Atualmente usa `Loader2` spinner genérico (linha 251-258)
- Substituir por skeleton que imita o layout real: card de tempo total + card de resumo + card de feedback

### Arquivos alterados

1. `src/components/evolution/EvolutionTab.tsx` — padding responsivo
2. `src/components/PerformanceFeedback.tsx` — colunas responsivas + skeleton loading

### Sem alteração no banco
100% CSS/Tailwind + componente Skeleton existente.

