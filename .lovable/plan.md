

## Plano: Corrigir Splits (Leitura Individual) e Trocar Base de Comparação para Diagnóstico

Dois problemas identificados, 3 arquivos principais a editar.

---

### Problema 1: SplitsTable mostra run_avg repetido 8x

A tabela `benchmark_results` armazena apenas `run_avg_sec` (= run_total / 8). Mas os tempos reais individuais (Run 1 = 3:34, Run 2 = 4:47, Run 3 = 5:02...) existem na tabela `tempos_splits` vinculada via `resumo_id`.

**Solução:** Alterar `HyroxAnalysisCard` para buscar os splits individuais de `tempos_splits` (mesma fonte do diagnóstico) e passar ao `SplitsTable`. Refatorar `SplitsTable` para aceitar splits individuais quando disponíveis, caindo em fallback para `run_avg_sec` × 8 se não houver dados granulares.

**Arquivo: `src/components/HyroxAnalysisCard.tsx`**
- Buscar `tempos_splits` vinculado ao mesmo `resumo_id` do resultado
- Mapear split_name ("Running 1" → Run 1, "1000m SkiErg" → Ski Erg, etc.) para preencher splits individuais
- Passar ao `SplitsTable` um novo prop `individualRunSplits?: Record<string, number>` com os tempos reais de cada run

**Arquivo: `src/components/SplitsTable.tsx`**
- Adicionar prop opcional `individualRunSplits`
- Quando disponível, usar tempos individuais (Run 1, Run 2...) em vez de repetir `run_avg_sec`
- `totalRun` = soma dos 8 runs individuais (não mais avg × 8)

---

### Problema 2: Comparação usa benchmark_master/admin, deve usar referência do diagnóstico

O `LevelBenchmarkComparison` busca referências via RPC `get_benchmark_reference` (benchmark_master + outlier_factors). Mas a fonte correta agora é a coluna `top_1` da tabela `diagnostico_melhoria` — o mesmo "Meta OUTLIER" que aparece na ImprovementTable.

**Solução:** Trocar a fonte de dados do `LevelBenchmarkComparison` para ler de `diagnostico_melhoria` em vez do RPC.

**Arquivo: `src/components/LevelBenchmarkComparison.tsx`**
- Remover chamada ao RPC `get_benchmark_reference`
- Buscar `diagnostico_melhoria` do atleta (filtrado pelo `resumo_id` mais recente)
- Mapear `metric` → `top_1` como o tempo de referência para cada estação
- Manter a mesma UI de comparação (Acima/Dentro/Abaixo) usando `top_1` como benchmark
- Renomear label de coluna: "Ref. {tier}" → "Meta OUTLIER" para consistência com a ImprovementTable
- Remover coluna "Fonte" (override/derived) pois a fonte agora é única (diagnóstico)

---

### Resumo de edições

| Arquivo | Mudança |
|---|---|
| `src/components/HyroxAnalysisCard.tsx` | Buscar `tempos_splits` para splits individuais de corrida |
| `src/components/SplitsTable.tsx` | Aceitar runs individuais, fallback para avg×8 |
| `src/components/LevelBenchmarkComparison.tsx` | Trocar fonte de `get_benchmark_reference` para `diagnostico_melhoria.top_1` |

