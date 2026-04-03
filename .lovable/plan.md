

## Plano: Atualizar Métricas de Impacto na Landing

**Arquivo:** `src/pages/Landing.tsx` — array de métricas (~linhas 214-227)

### Mudanças

1. Adicionar campo `prefix` opcional ao array de métricas
2. Substituir os 3 cards:

| Prefix | Valor | Sufixo | Label |
|--------|-------|--------|-------|
| − | 14 | min | No resultado dos atletas |
| | 92 | % | Subiram de categoria nos primeiros 6 meses |
| | 98 | % | Precisão do diagnóstico e ajuste de treinos |

3. No render, exibir `item.prefix` (quando existir) antes do `AnimatedCounter`

### Arquivo alterado

1. **`src/pages/Landing.tsx`** — Métricas de impacto

