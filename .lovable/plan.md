

## Plano: Corrigir rolagem do modal de detalhes do treino

### Problema
O modal do olhinho (WorkoutDetailModal) tem `max-h-[85vh] overflow-hidden flex flex-col` no container e um `ScrollArea` com `flex-1`, mas a rolagem não funciona. O `ScrollArea` do Radix precisa de uma altura explícita para ativar o scroll — `flex-1` sozinho não basta dentro do layout do Dialog.

### Correção

**Arquivo:** `src/components/CoachProgramsTab.tsx` (linha 200-214)

Trocar o `ScrollArea` por um `div` com `overflow-y-auto` e altura calculada, que é mais confiável dentro de um flex container:

```tsx
<DialogContent className="max-w-2xl lg:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
  <DialogHeader className="flex-shrink-0">
    ...
  </DialogHeader>
  
  <div className="flex-1 overflow-y-auto pr-2 min-h-0">
    <div className="space-y-3">
      ...
    </div>
  </div>
</DialogContent>
```

Mudancas:
- `max-h-[85vh]` → `max-h-[90vh]` para mais espaço vertical
- `ScrollArea` → `div` com `overflow-y-auto` e `min-h-0` (necessário para flex children scrollable)
- Adicionar `min-h-0` no container flex child para que o overflow funcione

### Não alterar
- Nenhuma lógica, cálculo ou fluxo
- Layout mobile inalterado

