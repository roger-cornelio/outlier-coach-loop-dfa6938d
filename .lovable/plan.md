

## Plano: Substituir escudos SVG inline por imagens externas

### O que muda

O componente `ShieldCrest.tsx` será simplificado — todo o SVG inline (paths, gradients, filtros, ícones, cadeado) será removido e substituído por um simples `<img>` apontando para as URLs fornecidas.

### Mapeamento de URLs

| Level | Estado | URL |
|-------|--------|-----|
| OPEN | blocked | `https://snvsmdwapplhmzvqcyun.supabase.co/storage/v1/object/public/slug_avancos_conquistas/open_outlier_travado.png` |
| OPEN | active | `https://snvsmdwapplhmzvqcyun.supabase.co/storage/v1/object/public/slug_avancos_conquistas/open_outlier_destravado.png` |
| PRO | blocked | `https://snvsmdwapplhmzvqcyun.supabase.co/storage/v1/object/public/slug_avancos_conquistas/pro_outlier_travado.png` |
| PRO | active | `https://snvsmdwapplhmzvqcyun.supabase.co/storage/v1/object/public/slug_avancos_conquistas/pro_outlier_destravado.png` |
| ELITE | blocked | `https://snvsmdwapplhmzvqcyun.supabase.co/storage/v1/object/public/slug_avancos_conquistas/elite_outlier_travado.png` |
| ELITE | active | `https://snvsmdwapplhmzvqcyun.supabase.co/storage/v1/object/public/slug_avancos_conquistas/elite_outlier_destravado.png` |

### Alteração em `src/components/ui/ShieldCrest.tsx`

1. Criar um mapa `SHIELD_URLS` com chave `{level}-{active|locked}` → URL
2. Remover todo o conteúdo SVG inline (defs, paths, gradients, filtros, ícones, cadeado)
3. Substituir por `<img src={url} alt={level} className={className} />` 
4. Manter a mesma interface (`level`, `active`, `className`) — as props `fillPercent` e `isCurrent` deixam de ter efeito visual (as imagens já representam o estado completo)

### Resultado

O componente fica com ~20 linhas. Todos os locais que usam `<ShieldCrest>` continuam funcionando sem alteração.

