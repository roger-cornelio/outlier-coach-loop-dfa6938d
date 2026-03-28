

## Plano: Unificar UI mobile e desktop do Dashboard

### Problema
O `DiagnosticRadarBlock.tsx` tem um `if (isMobile)` na linha 2320 que retorna um layout completamente diferente do desktop. O mobile usa componentes próprios (`MobilePathToEliteCard`, `MobileBottlenecksBlock`, `MobileNextStepBlock`, `MobilePhysiologicalModal`) enquanto o desktop renderiza inline com outro design (header centralizado, Jornada Outlier com shields, Projeção de Evolução com gráfico, Perfil Fisiológico com radar, Periodização).

### Diferenças principais

| Aspecto | Mobile | Desktop |
|---------|--------|---------|
| Header | `MobilePathToEliteCard` (card escuro com gradiente amber) | H1 centralizado + crown + categoria |
| Meta de Resultado | `ProjectedTimeBlock` dentro do card | Separado no "Visor de Ação" |
| Jornada Outlier | Inline dentro do `MobilePathToEliteCard` (shields + barra) | Bloco separado com card elevado |
| Nível Competitivo | Card separado com grid 2+4 cols | Dentro do header com grid 4 cols |
| Pontos Fracos | `MobileBottlenecksBlock` | Não existe (usa `TrainingPrioritiesBlock`) |
| Próximo Passo | `MobileNextStepBlock` | Não existe |
| Perfil Fisiológico | `MobilePhysiologicalModal` (modal) | Collapsible inline com radar |
| Projeção Evolução | Não existe no mobile | Card completo com gráfico 12 meses |
| Periodização | Não existe no mobile | Card com texto |

### Solução

**Remover a bifurcação `if (isMobile)`** (linha 2320) e usar **um único layout responsivo** para ambos. O layout desktop será a referência, ajustando apenas tamanhos de fonte e espaçamentos com classes Tailwind responsivas (`text-xl sm:text-4xl`, `grid-cols-2 sm:grid-cols-4`, etc.).

### Alterações no arquivo `src/components/DiagnosticRadarBlock.tsx`

1. **Eliminar o bloco `if (isMobile) { return ... }` inteiro** (linhas ~2320–2532)
2. **Tornar o layout desktop responsivo** com classes Tailwind:
   - Header: `text-2xl sm:text-4xl md:text-5xl` no nome
   - Grid de métricas (Nível Competitivo): `grid-cols-2 sm:grid-cols-4` 
   - Prova Alvo sub-grid: `grid-cols-2 sm:grid-cols-5` com stacking no mobile
   - Projeção de Evolução: manter, já funciona em telas menores
   - Perfil Fisiológico (radar): manter Collapsible, já responsivo
   - Jornada Outlier: shields menores no mobile (`w-12 sm:w-16`)
   - CTA "BORA TREINAR": manter tamanho grande em ambos
3. **Remover sub-componentes mobile-only** que ficam sem uso:
   - `MobilePathToEliteCard`
   - `MobileBottlenecksBlock`  
   - `MobileNextStepBlock`
   - `MobilePhysiologicalModal`
4. **Adicionar `TrainingPrioritiesBlock`** que existe no desktop mas faltava no mobile
5. **Manter o `useIsMobile`** apenas se necessário para popover vs tooltip behavior

### Resultado esperado
Ambas as versões (mobile e desktop) renderizam os mesmos blocos na mesma ordem, com o mesmo design visual — apenas ajustando proporções via breakpoints CSS responsivos.

### O que não muda
- Lógica de cálculos (régua, projeção, scores)
- Hooks, store, banco de dados
- Componentes reutilizados (`JourneyShieldsRow`, `RequirementsChecklist`, `TrainingPrioritiesBlock`, etc.)

