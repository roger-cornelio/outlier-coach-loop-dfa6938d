

## Plano: Melhorar estética do badge de rep scheme (40 · 30 · 20 · 10)

### O que muda

O badge de rep scheme atualmente usa estilo `slate` (cinza apagado), ícone pequeno e fonte minúscula (`text-[10px]`). Para o atleta, esse é um dado importante — precisa ter mais destaque visual.

### Alterações

| Arquivo | O que muda |
|---|---|
| `src/components/DSLBlockRenderer.tsx` | Criar renderização especial para rep schemes: números grandes e coloridos separados por pontos estilizados, fundo mais vivo (primary/orange), ícone maior |

### Detalhes visuais

- Detectar rep scheme no `StructureBadge` (regex `^\d+\s*·`)
- Em vez de renderizar como texto plano num badge pequeno, renderizar cada número individual com `text-lg font-black text-primary` separado por um dot `·` estilizado
- Fundo `bg-primary/15` com borda `border-primary/40`
- Ícone `ListOrdered` maior (`w-4 h-4`)
- Padding mais generoso (`px-4 py-2`)

Resultado: "40 · 30 · 20 · 10" passa de um chip cinza discreto para um elemento visual impactante com números grandes e cor laranja/primary vibrante.

