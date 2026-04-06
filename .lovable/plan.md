

## Plano: Filtro de sessões simplificado com label do coach

### O que muda

O filtro de sessões (pills acima dos blocos de treino) será simplificado:

- **Default sempre Sessão 1** ao abrir qualquer dia
- **Só 2 pills**: sem botão "Todas"
- **Sem métricas nos pills**: sem tempo e calorias duplicados
- **Label inteligente**: mostra o nome que o coach definiu para a sessão (ex: "Manhã", "Tarde"). Se não definiu, mostra "Sessão 1" / "Sessão 2"
- **Posição**: filtro aparece abaixo do header de tempo total e calorias
- **Sem toggle**: sempre uma sessão ativa, clicar alterna entre elas

### Alterações técnicas

**Arquivo: `src/components/WeeklyTrainingView.tsx`**

1. Mudar estado inicial de `activeSession` de `null` para `1`
2. No `useEffect` de troca de dia, resetar para `1` em vez de `null`
3. Remover o pill "Todas" (linhas ~352-365)
4. Remover métricas (`⏱ / 🔥`) dos pills restantes — manter só o label
5. Mover o bloco de filtro para depois do header de stats (tempo + calorias)
6. Remover lógica de toggle para `null` — clicar seleciona aquela sessão diretamente

Label do pill usa: `sessionLabel || 'Sessão ${num}'` (já existe no código)

