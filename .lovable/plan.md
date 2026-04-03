

## Pull-to-Refresh — Explicação Simples

### O que é

Quando o atleta estiver no celular e quiser atualizar os dados do Dashboard ou do Treino Semanal, basta **arrastar a tela para baixo** (como no Instagram ou WhatsApp). Um ícone de atualização aparece no topo, gira enquanto carrega, e os dados são atualizados.

### Como funciona

- O atleta arrasta para baixo a partir do topo da tela
- Ao arrastar mais de 60 pixels, aparece um ícone girando
- O celular vibra levemente para confirmar que o gesto foi reconhecido
- Os dados do plano de treino e diagnóstico são recarregados
- O ícone desaparece quando a atualização termina

### Onde funciona

1. **Dashboard principal** — atualiza o resumo semanal, radar de diagnóstico e streak
2. **Treino Semanal** — atualiza os treinos publicados pelo coach

### O que NÃO muda

- No computador (desktop), nada muda — o gesto só funciona com toque no celular
- Scroll normal da página continua funcionando igual
- Nenhuma alteração no banco de dados

### Arquivos envolvidos

- 2 arquivos novos (o mecanismo de toque e o indicador visual)
- 2 arquivos existentes recebem o recurso (Dashboard e Treino Semanal)

