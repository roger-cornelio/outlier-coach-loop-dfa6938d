

# Corrigir VO2max e Limiar no Dashboard — Usar Dados Determinísticos

## Problema

O bloco "PERFIL FISIOLÓGICO" no `DiagnosticRadarBlock.tsx` usa fórmulas heurísticas inventadas no frontend (base 45 + delta linear) em vez dos valores científicos calculados pela Edge Function (Dexheimer 2020). Resultado: Roger aparece com VO2max 40 quando o valor correto é ~43.

## Solução

Substituir as fórmulas heurísticas no `DiagnosticRadarBlock.tsx` para ler os dados do `perfil_fisiologico` cacheado no banco (tabela `diagnostico_resumo`), que é preenchido pela Edge Function `generate-deep-analysis`.

## Mudanças

### 1. `DiagnosticRadarBlock.tsx`

**Receber `perfil_fisiologico` como prop** (vindo do `diagnostico_resumo` já carregado pelo parent).

**Substituir os `useMemo` antigos** (linhas 1885-1901):
- `vo2maxEstimate`: ler de `perfilFisio?.vo2_max` — fallback para a fórmula heurística antiga se ainda não existir cache.
- `lactateThresholdEstimate`: ler de `perfilFisio?.limiar_lactato` — mesmo fallback.

### 2. Componente pai que renderiza `DiagnosticRadarBlock`

Passar o campo `perfil_fisiologico` do `diagnostico_resumo` como prop. Verificar qual componente monta o `DiagnosticRadarBlock` para garantir que o dado já está disponível no fluxo de dados existente.

### 3. Sem migração SQL necessária

A coluna `perfil_fisiologico` já foi criada na migração anterior. O dado será preenchido quando o atleta gerar o "Raio X Outlier" pela primeira vez.

## Comportamento

- **Com cache**: Exibe VO2max e Limiar científicos (Dexheimer).
- **Sem cache** (atleta nunca gerou Raio X): Mantém fallback heurístico para não quebrar a UX.

