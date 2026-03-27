

## Plano: Renomear labels no painel Nível Competitivo

### Alterações

**Arquivo: `src/components/DiagnosticRadarBlock.tsx`**

1. **"Seu Tempo" → "Última Prova"** — nas 4 ocorrências (mobile ~2355, ~2489, desktop ~2565, ~2706)

2. **Categoria com formatação legível** — onde exibe `provaAlvo.categoria`, aplicar `provaAlvo.categoria.replace(/_/g, ' ')` para que "HYROX_PRO" apareça como "HYROX PRO" (mobile ~2448, desktop ~2665)

### O que não muda
- Cálculos, lógica, banco de dados
- Demais labels (Meta, Faltam, Previsão, etc.)

