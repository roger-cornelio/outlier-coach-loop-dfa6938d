

## Plano: Botões de teste na Debug Bar — Simular Tempo + Simular Sessão

### O que será adicionado

Dois novos botões na `GlobalDebugBar` (visíveis apenas para owner/QA):

**1. 🧪 Simular Tempo** — testa a régua de Nível Competitivo
- Abre um prompt pedindo tempo em segundos (ex: `5400` = 1h30min)
- Salva no localStorage como `DEBUG_SIMULATION_TIME`
- Dispara evento para o `DiagnosticRadarBlock` recalcular a régua instantaneamente
- A régua, "Últ. Simulado" e "Result. Esperado" atualizam sem precisar rodar simulado real

**2. 🏋️ Simular Sessão** — testa a Jornada Outlier (barra de treinos)
- Abre um prompt pedindo quantas sessões adicionar (ex: `5`)
- Para cada sessão, cria um registro fictício no localStorage (`outlier-benchmark-history`) com datas únicas retroativas (ontem, anteontem, etc.)
- Dispara `triggerExternalResultsRefresh()` para atualizar a barra de jornada e contagem de sessões

### Como funciona por trás

**Simular Tempo**: No `useEffect` do `DiagnosticRadarBlock` que busca `lastSimulationTime`, adiciona checagem de `DEBUG_SIMULATION_TIME` no localStorage antes de consultar o banco. Se existir e o modo debug estiver ativo, usa esse valor direto.

**Simular Sessão**: Insere registros com `{ workout_id: 'debug-N', completed: true, created_at: 'data-retroativa' }` no mesmo formato que treinos reais. A `countUniqueTrainingDays` já lê do localStorage, então a contagem atualiza automaticamente.

### Limpeza

O botão "🗑 Zerar Sessões" já existente também limpa os dois overrides (`DEBUG_SIMULATION_TIME` e sessões fictícias).

### Arquivos alterados

1. **`src/components/GlobalDebugBar.tsx`** — dois novos botões + limpeza no reset
2. **`src/components/DiagnosticRadarBlock.tsx`** — checar override de tempo no useEffect do simulado

### O que não muda
- Lógica real de cálculos
- Banco de dados (nada fictício é persistido no banco)
- Comportamento para usuários normais

