

## Plano: Mover badge de precisão para dentro de cada card de dia

### O que muda

O badge `⚡ 3/4 blocos calculados` sai do rodapé geral do preview e passa a aparecer **dentro de cada PreviewDayCard**, ao lado das calorias no cabeçalho do dia.

### Como

**Arquivo: `src/components/TextModelImporter.tsx`**

1. **PreviewDayCard recebe cobertura por dia** — Calcular `engineCoverage` dentro do próprio `PreviewDayCard` usando os dados de `blockMetrics.perBlock` que já existem no componente, junto com `dayWorkout.blocks`. Isso elimina a necessidade de passar dados de fora.

2. **Badge no header do dia** — Após o bloco de calorias (linha ~225), adicionar o badge inline:
   - `⚡ 4/4` em verde quando 100%
   - `⚡ 3/4` em laranja quando parcial
   - `⚡ 1/4` em vermelho quando baixo
   - Clicável → abre o modal de detalhes (por dia)

3. **Mover o modal para dentro do PreviewDayCard** — Cada card terá seu próprio modal de detalhes mostrando os blocos daquele dia específico.

4. **Remover badge e modal do rodapé geral** — Linhas ~2232-2320 (o badge centralizado e o Dialog global) são removidos.

5. **Remover o `engineCoverage` global** — O `useMemo` das linhas 438-491 no componente principal é removido, já que cada card calcula o seu.

### Resultado visual

No header de cada dia:
```text
[ SEG ]  4 bloco(s)  🕐 ~45min  🔥 ~320 kcal  ⚡ 3/4
```

O badge fica inline, visível e contextual — o coach sabe exatamente qual dia tem blocos não calculados.

