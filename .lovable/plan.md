

## Plano: Refinar UI dos blocos de treino — mais compacta e estética

### Problemas atuais

1. **Rep scheme badge** (7·5·3) — muito grande: `text-xl font-black`, `px-4 py-2.5`, `border-2`, `rounded-xl`. Ocupa espaço desproporcional
2. **Block header** — `text-2xl font-bold` para título é excessivo, especialmente com vários blocos por dia
3. **Structure badges** normais — OK no tamanho, mas inconsistentes com o rep scheme que é gigante
4. **FullBlockRenderer** — `p-4 border-2 rounded-xl` com `ring-1` no main WOD cria bordas pesadas
5. **Comment sub-block** — `mt-6` cria gap excessivo

### Alterações no `src/components/DSLBlockRenderer.tsx`

**1. Rep scheme badge — compactar para tamanho inline**
- Reduzir de `text-xl font-black px-4 py-2.5 border-2 rounded-xl` para `text-sm font-bold px-2.5 py-1 border rounded-md`
- Ícone de `w-4 h-4` para `w-3 h-3`
- Manter o dot separator mas menor
- Resultado: badge inline consistente com os outros structure badges

**2. Block header — reduzir hierarquia visual**
- Título de `text-2xl` para `text-base` (ou `text-lg` no máximo)
- CategoryChip + badges na mesma linha do título (flex row) em vez de stack vertical

**3. FullBlockRenderer — cards mais leves**
- `border-2` → `border`, `p-4` → `p-3`
- Main WOD: remover `ring-1`, usar apenas `border-primary/40`

**4. Comment sub-block — mais compacto**
- `mt-6` → `mt-3`

**5. Inline structure badges** — reduzir padding vertical
- `pt-3 pb-1` → `pt-2 pb-0.5`

### Resultado visual esperado

Badges de estrutura (rounds, EMOM, rep schemes) todos no mesmo tamanho inline. Blocos mais compactos e limpos. Hierarquia visual mantida mas sem elementos oversized.

