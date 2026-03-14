

# Adicionar Botao "Como calculamos?" abaixo dos cards VO2/Limiar

## Mudanca

No `DiagnosticRadarBlock.tsx`, logo apos a `div.grid.grid-cols-2` dos cards VO2max e Limiar (linha ~2328), adicionar:

1. **Botao discreto** com icone `BookOpen` (lucide) + texto "Como calculamos?" — estilo `text-[10px] text-muted-foreground` centralizado, fora do Collapsible
2. **State** `showMethodology` (useState bool)
3. **Dialog** acionado pelo botao contendo:
   - Titulo: "Como o Outlier calcula o seu Perfil Fisiologico?"
   - Dois blocos numerados com o texto fornecido
   - Links clicaveis para os papers (Frontiers in Physiology 2024, Dexheimer et al. 2020) abrindo em nova aba (`target="_blank"`)
   - Estilo escuro consistente com o tema do app

### Posicionamento exato

```text
┌─────────────────────────────┐
│ PERFIL FISIOLOGICO          │
│ ┌──────────┐ ┌────────────┐ │
│ │ VO2 max  │ │ Limiar LT2 │ │
│ └──────────┘ └────────────┘ │
│   📖 Como calculamos?       │  ← NOVO (fora do collapsible)
│ ┌ Collapsible ─────────────┐│
│ │ Radar + estacoes         ││
│ └──────────────────────────┘│
└─────────────────────────────┘
```

### Arquivo alterado
- `src/components/DiagnosticRadarBlock.tsx`: adicionar state, botao e Dialog com conteudo cientifico

