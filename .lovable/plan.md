

## Plano: Renomear níveis da jornada para "OUTLIER"

### Problema
Os níveis da jornada aparecem como "HYROX OPEN / HYROX PRO / HYROX ELITE" na tela de admin e em outros locais. A jornada é do produto OUTLIER, não do HYROX. Deve ser "OPEN OUTLIER", "PRO OUTLIER", "ELITE OUTLIER".

### Mudanças

1. **`src/types/outlier.ts`** — Atualizar `LEVEL_NAMES` para:
   - open → "OPEN OUTLIER"
   - pro → "PRO OUTLIER"  
   - elite → "ELITE OUTLIER"

2. **`src/components/admin/AthleteStatusAdmin.tsx`** — Atualizar `DEFAULT_LEVEL_RULES` labels para "OPEN OUTLIER", "PRO OUTLIER", "ELITE OUTLIER"

3. **Database** — Atualizar registros existentes na tabela `level_rules` (se houver) para os novos labels via migration

### Impacto
Todos os componentes que usam `LEVEL_NAMES` (header do atleta, status display, benchmarks, coach dashboard) passam automaticamente a mostrar os novos nomes.

