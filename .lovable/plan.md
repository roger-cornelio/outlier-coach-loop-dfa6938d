

## Plano: Reformular modal laranja para informar sobre estimativa por fallback

### Contexto

Antes, o modal laranja bloqueava o salvamento dizendo "O atleta NÃO verá estimativas". Agora, com o sistema de fallback (motor → IA), o bloco **sempre** terá estimativa. O modal deve continuar aparecendo, mas com tom informativo, não bloqueante.

### Mudanças

**Arquivo: `src/components/WorkoutParseValidationModal.tsx`**

- **Titulo**: De "Texto não reconhecido" para "Alguns blocos usarão estimativa"
- **Descrição**: Informar que o motor não reconheceu a estrutura em X blocos, mas o sistema fará uma **estimativa aproximada** de tempo e calorias baseada em IA. Sugerir que o coach detalhe melhor os exercícios para cálculos mais precisos.
- **Botão primario**: De "Corrigir texto" para **"Prosseguir com estimativa"** (executa `onForceBypass` — salva normalmente)
- **Botão secundario**: **"Voltar e corrigir"** (executa `onClose` — volta ao editor)
- **Tom visual**: Manter laranja, mas como aviso informativo, não como erro

**Arquivo: `src/hooks/useCoachWorkouts.ts`** (se necessario)

- Garantir que `onForceBypass` marca os blocos como `fallback` (não `bypass`) para que recebam estimativas da IA em vez de ficarem zerados.

### Resultado

O coach vê: "O motor não reconheceu 2 blocos. Eles receberão uma estimativa aproximada. Deseja prosseguir ou prefere corrigir o texto para maior precisão?"

- Botão principal: Prosseguir (salva com fallback)
- Botão secundario: Voltar e corrigir

