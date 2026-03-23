

## Plano: Corrigir bypass para salvar e navegar para Programações

### Problema

Quando o coach clica "Prosseguir com estimativa" no modal laranja, o treino é salvo no banco, mas:
1. O `clearDraft()` não é chamado → TextModelImporter continua mostrando o preview
2. A aba não muda para "Programações" → coach fica preso na mesma tela
3. Toast mostra "sem estimativas" (texto desatualizado)

### Correção

**Arquivo: `src/components/CoachSpreadsheetTab.tsx`**

- Adicionar prop `onSavedGoToPrograms?: () => void` para permitir navegação à aba Programações
- No `onForceBypass` (linhas 834-855), após `forceSaveWorkout` retornar sucesso:
  - Chamar `clearDraft()` para limpar o rascunho
  - Chamar `onSavedGoToPrograms()` para mudar para a aba Programações
  - Atualizar toast: "Treino salvo com estimativas! Veja na aba Programações."

**Arquivo: `src/pages/CoachDashboard.tsx`**

- Passar callback `onSavedGoToPrograms={() => setActiveTab('programacoes')}` para o `CoachSpreadsheetTab`

### Resultado

Após clicar "Prosseguir com estimativa":
1. Treino salva no banco com dados de fallback
2. Draft é limpo
3. Coach é levado automaticamente para a aba Programações

