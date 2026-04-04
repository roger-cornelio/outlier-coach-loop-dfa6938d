

## Plano: Remover diferenciação de cores entre temas de coach

### Problema
Os temas IRON e SPARK sobrescrevem as cores primárias do app (laranja OUTLIER vira azul no IRON, amarelo no SPARK), quebrando a identidade visual da marca.

### Solução
1. **Manter paleta OUTLIER fixa** para todos os estilos — remover todas as sobrescritas de cores (`--primary`, `--accent`, `--ring`, `--background`, `--card`, `--border`, `--gradient-fire`, `--shadow-glow`, `--status-*`, `--sidebar-*`) dos blocos `.theme-iron` e `.theme-spark`

2. **Diferenciação apenas por tipografia e bordas** — cada tema mantém apenas:
   - `--font-display` e `--font-body` (fontes diferentes)
   - `--radius` (SPARK mais arredondado)

3. **Personalização futura** pode ser feita com:
   - Mensagens e tom de voz do coach (já existe via `coachCopy`)
   - Ícone/avatar do estilo (já existe no `CoachStyleChanger`)
   - Layout ou densidade de informação por estilo

### Arquivo alterado
- `src/index.css` — simplificar `.theme-iron` (manter só fontes) e `.theme-spark` (manter só fontes + radius)

### Resultado
- Todos os atletas veem a marca OUTLIER consistente (laranja/amber)
- Cada estilo de coach tem personalidade sutil via tipografia
- Zero risco de confusão visual com outras marcas

