

## Plano: Prioridade Automática com Corrida no Topo

### Mudança vs plano anterior

A única diferença é a **tabela de prioridade**. Corrida passa a ter a prioridade mais alta (peso 110), e tem uma regra especial: **nunca é removida**, apenas tem a duração reduzida.

### Tabela de prioridade (atualizada)

| Prioridade | Categoria | Peso | Regra de corte |
|-----------|-----------|------|----------------|
| 1 (mais alta) | **Corrida** | **110** | **Nunca remove, só reduz duração** |
| 2 | Metcon | 100 | Remove por último |
| 3 | Específico (HYROX) | 90 | Remove por último |
| 4 | Força | 80 | Remove se necessário |
| 5 | Aquecimento | 30 | Remove cedo |
| 6 | Acessório | 20 | Remove cedo |
| 7 | Técnica | 15 | Remove cedo |
| 8 | Mobilidade | 10 | Remove cedo |
| 9 (mais baixa) | Notas | 0 | Remove primeiro |

### Lógica de corte por tempo

Quando o treino excede o tempo disponível do atleta:

1. Remove blocos de baixa prioridade (Notas → Mobilidade → Técnica → Acessório → Aquecimento)
2. Se ainda não cabe, remove Força
3. Se ainda não cabe, reduz duração de Metcon/Específico
4. **Corrida nunca é removida** — apenas tem a duração diminuída (ex: 5km vira 3km, 30min vira 20min)

### Arquivos alterados

Todos os mesmos do plano anterior, com a tabela de pesos ajustada e uma flag `neverRemove: true` para Corrida no `mainBlockIdentifier.ts`. A função `getRemovableBlocks` vai excluir blocos de Corrida da lista de removíveis. A função `sortBlocksForTimeAdaptation` vai colocar Corrida como último bloco a ser tocado, e quando tocado, apenas reduz volume (distância/tempo) em vez de remover.

