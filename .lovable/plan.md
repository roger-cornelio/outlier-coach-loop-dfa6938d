

## Resumo da Mudança

**Arquivo:** `src/components/LevelUpModal.tsx`

**Duas telas distintas no mesmo modal:**

1. **Importou prova → Tela de Categoria**
   - Título grande: **OPEN**, **PRO** ou **ELITE** (texto puro, sem brasão)
   - Botão: "Avançar para OPEN OUTLIER →" (ou PRO/ELITE)
   - Copy: "Continue treinando para conquistar o título OUTLIER"

2. **Atingiu sessões + benchmarks → Tela de Conquista OUTLIER**
   - Brasão grande pulsante com glow (ShieldCrest)
   - Título: **OPEN OUTLIER**, **PRO OUTLIER** ou **ELITE OUTLIER**
   - Copy: "Você está fora da curva"
   - Botão: próximo nível ou confirmação se for ELITE

**Nenhuma mudança em hooks ou lógica** — a prop `isOutlier` que já existe controla qual tela aparece.

