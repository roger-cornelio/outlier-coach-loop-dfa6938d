

## Mapeamento Completo: Status dos Slugs de Conquistas

### Já implementado (OK)

**`src/components/ui/ShieldCrest.tsx`** — O componente já está 100% correto com todas as 6 URLs mapeadas:

| Chave | URL | Status |
|-------|-----|--------|
| OPEN-active | `.../open_outlier_destravado.png` | ✓ OK |
| OPEN-locked | `.../open_outlier_travado.png` | ✓ OK |
| PRO-active | `.../pro_outlier_destravado.png` | ✓ OK |
| PRO-locked | `.../pro_outlier_travado.png` | ✓ OK |
| ELITE-active | `.../elite_outlier_destravado.png` | ✓ OK |
| ELITE-locked | `.../elite_outlier_travado.png` | ✓ OK |

### Consumidores do componente (2 telas)

1. **`LevelProgress.tsx`** — Tela de Evolução (grid 3 colunas, 90px mobile / 145px desktop) — usa `ShieldCrest` com `active` baseado no nível do atleta
2. **`DiagnosticRadarBlock.tsx`** — Bloco de diagnóstico radar — usa `ShieldCrest` em miniatura junto ao radar

### Componentes que NÃO usam ShieldCrest (usam StatusCrown/coroa separada)

- **`AthleteStatusAvatar.tsx`** — Avatar principal com coroa (ícone SVG inline via `StatusCrownPreset`), não escudo
- **`AthleteHeroIdentity.tsx`** — Nome + badge de status com coroa, não escudo

### Conclusão

A implementação dos novos slugs de conquistas (PNG externos) já está **completa**. O `ShieldCrest.tsx` foi refatorado na mensagem anterior e já contém todas as URLs fornecidas. Os dois componentes que consomem escudos (`LevelProgress` e `DiagnosticRadarBlock`) já apontam para o componente atualizado.

Não há alteração de código pendente. O próximo passo é **testar visualmente** fazendo login com as credenciais fornecidas para confirmar que as imagens carregam corretamente na tela de evolução.

