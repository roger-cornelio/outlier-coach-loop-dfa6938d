

## Plano: Retry automático offline-first para feedback e resultados

### Problema
Se a conexão falhar durante `saveFeedback` ou `saveBenchmarkResult`, os dados são perdidos silenciosamente. Para um piloto com atletas reais, isso é inaceitável.

### Solução
Criar uma fila persistente em localStorage que armazena operações falhadas e as reenvia automaticamente quando a conexão voltar.

### Arquitetura

```text
Atleta salva resultado/feedback
        │
        ▼
  Tenta enviar ao backend
        │
   ┌────┴────┐
   │ Sucesso │  → ✅ fim
   └─────────┘
   │ Falha   │  → Salva em localStorage (offline queue)
   └─────────┘
        │
        ▼
  Listener: navigator.onLine + visibilitychange
        │
        ▼
  Flush queue → tenta reenviar cada item
        │
   ┌────┴────┐
   │ Sucesso │  → Remove do queue
   │ Falha   │  → Mantém, tenta novamente depois
   └─────────┘
```

### Implementação

**1. Novo utilitário `src/lib/offlineQueue.ts`**
- Classe `OfflineQueue` com métodos `enqueue(operation)`, `flush()`, `getPendingCount()`
- Cada item: `{ id, table, payload, createdAt, retryCount }`
- Persiste em `localStorage` key `outlier_offline_queue`
- `flush()`: itera itens, tenta `supabase.from(table).insert(payload)`, remove se sucesso
- Auto-flush em `window.addEventListener('online')` e `document.visibilitychange`
- Limite de 3 retries por item, depois marca como `failed`

**2. Atualizar `src/hooks/useAthleteFeedbacks.ts`**
- No `catch` de `saveFeedback`, ao invés de só logar erro, chamar `offlineQueue.enqueue({ table: 'workout_session_feedback', payload })`
- Mostrar toast amarelo "Feedback salvo offline — será enviado quando a conexão voltar"

**3. Atualizar `src/hooks/useBenchmarkResults.ts`**
- Mesma lógica para resultados de benchmark que falhem ao salvar

**4. Componente `OfflineQueueIndicator`** (opcional, leve)
- Pequeno badge no canto mostrando "X pendentes" quando há itens na fila
- Renderizado no `Dashboard` ou `AppGate`

**5. Auto-flush no App.tsx**
- `useEffect` no nível do app que inicializa os listeners de `online`/`visibilitychange`

### Resultado
- Atleta nunca perde dados de treino, mesmo com conexão instável
- Toast informativo quando salva offline
- Reenvio automático transparente

