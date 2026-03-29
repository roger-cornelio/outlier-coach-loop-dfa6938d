

## Plano: Aumentar tamanho e melhorar contraste dos badges de estrutura

### Problema
Os badges de estrutura (ex: "7·5·3", "3 ROUNDS", "EMOM 12'") estão com `text-[10px]` e cores escuras (`text-slate-600`, `text-primary`) que não contrastam bem com fundo preto/escuro.

### Alterações em `src/components/DSLBlockRenderer.tsx`

**1. Tamanho** — De `text-[10px]` para `text-xs` (12px) em todos os `StructureBadge` (linhas 85, 99)

**2. Cores — trocar para tons claros (light mode compat mantida via dark: prefix ou cores neutras claras)**
- Rep scheme (`slate-500/600`): trocar para `bg-slate-700/30 text-slate-200 border-slate-500/40`
- Rounds (`primary`): `bg-primary/25 text-primary border-primary/40` (primary já é laranja claro, OK)
- EMOM (`amber-500/600`): `bg-amber-500/25 text-amber-300 border-amber-500/40`
- AMRAP (`green-500/600`): `bg-green-500/25 text-green-300 border-green-500/40`
- FOR TIME (`blue-500/600`): `bg-blue-500/25 text-blue-300 border-blue-500/40`
- Séries (`purple-500/600`): `bg-purple-500/25 text-purple-300 border-purple-500/40`
- Default: `bg-primary/25 text-primary border-primary/40`

**3. Ícones** — De `w-3 h-3` para `w-3.5 h-3.5` para acompanhar o aumento de texto

**4. Padding** — De `px-2.5 py-1` para `px-3 py-1.5` para dar mais respiro

### Resultado
Badges ~20% maiores, com texto claro sobre fundo escuro translúcido — contraste adequado para dark mode.

