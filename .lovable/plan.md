

## Plano: Adicionar ícone ⚡ nos pills do filtro e remover header redundante

### Alterações em `src/components/WeeklyTrainingView.tsx`

1. **Nos pills do filtro de sessão**: adicionar o ícone `⚡` (Zap) antes do label, ficando ex: "⚡ Sessão 1" / "⚡ MANHÃ"
2. **Remover o header decorativo** (linhas ~440-449) que aparece abaixo dos pills com o mesmo texto — fica redundante

### Resultado
- Pills com visual "⚡ SESSÃO 2" igual ao header atual
- Sem duplicação de informação

