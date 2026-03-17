

## Plano: Fila de Sugestão de Exercícios (Coach → Admin)

### Problema
Quando o coach cola um treino com exercícios que o sistema não reconhece (ex: "Turkish Get-Up"), essas linhas aparecem como "não interpretadas" no badge de cobertura. Hoje o coach não tem como resolver isso — ele só vê o aviso.

### Solução
Criar um fluxo onde o coach pode **sugerir exercícios novos** direto do modal de interpretação. A sugestão vai para uma **fila de aprovação no painel admin**, onde o administrador define o padrão de movimento (que determina a fórmula de cálculo de calorias).

### Como vai funcionar

**Para o Coach:**
1. Cola o treino → badge mostra "⚠️ 2 linhas não interpretadas (89%)"
2. Clica no badge → abre o modal de detalhes (que já existe)
3. Ao lado de cada linha não reconhecida, aparece um botão **"Sugerir ao sistema"**
4. Coach clica → confirma o nome do exercício → sugestão é salva
5. O botão muda para **"Sugestão enviada ✓"** (não pode enviar duas vezes)

**Para o Admin:**
1. Abre o Portal Admin → nova aba **"Sugestões de Exercícios"**
2. Vê a lista de sugestões pendentes (nome do exercício + quem sugeriu)
3. Seleciona o **padrão de movimento** no dropdown (ex: "Vertical Work", "Total Body Plyometric" — são os 17 padrões que já existem e definem as fórmulas de calorias)
4. Clica **"Aprovar"** → exercício é automaticamente adicionado à tabela `global_exercises`
5. Ou clica **"Rejeitar"** com motivo opcional
6. Na próxima vez que qualquer coach usar esse exercício, o sistema já reconhece

### O que será criado

| Componente | Descrição |
|---|---|
| **Tabela `exercise_suggestions`** | Armazena as sugestões com status (pending/approved/rejected), nome do exercício, coach que sugeriu, e padrão de movimento definido pelo admin |
| **Políticas de segurança (RLS)** | Coach só vê/insere as próprias sugestões; admin lê e atualiza todas |
| **Botão no modal de interpretação** | Cada linha não reconhecida ganha "Sugerir ao sistema" |
| **Hook `useExerciseSuggestions`** | Lógica de inserção (coach) e gestão (admin) |
| **Tela admin `ExerciseSuggestionsAdmin`** | Lista pendentes, dropdown de padrão de movimento, botões aprovar/rejeitar |
| **Nova aba no AdminPortal** | "Sugestões" adicionada à navegação |

### O que NÃO muda
- O parser continua funcionando igual
- Exercícios existentes não são afetados
- O salvamento de treinos não é bloqueado por sugestões
- O badge e modal de cobertura continuam iguais, só ganham o botão extra

