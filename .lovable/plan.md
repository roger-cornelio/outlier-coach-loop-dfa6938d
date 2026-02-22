

## Renomear Planos: OPEN/PRO para ESSENCIAL/PERFORMANCE

### O que muda

A nomenclatura dos planos contratados será atualizada apenas na **camada visual** (UI):

| Antes | Depois |
|-------|--------|
| OPEN | ESSENCIAL |
| PRO | PERFORMANCE |

Os valores no banco de dados (`open` / `pro`) permanecem inalterados.

### Layout novo (baseado na imagem de referência)

Dois botoes do mesmo tamanho, lado a lado:
- O plano **atual** aparece com borda laranja e fundo `primary/10` (destaque)
- O **outro** plano aparece com borda normal e o texto "Fazer upgrade" ou "Fazer downgrade"
- Texto auxiliar abaixo dos botoes removido (reduz ruido visual)

### Arquivo a alterar

**`src/components/AthleteConfig.tsx`**

1. Atualizar o objeto `PLAN_DISPLAY` (linhas 21-32):

```ts
const PLAN_DISPLAY: Record<PlanTier, { label: string; icon: typeof TrendingUp; description: string }> = {
  open: {
    label: 'ESSENCIAL',
    icon: TrendingUp,
    description: 'Plano de evolucao continua'
  },
  pro: {
    label: 'PERFORMANCE',
    icon: Trophy,
    description: 'Plano para alta performance'
  }
};
```

2. Substituir o bloco de UI do "SEU PLANO" (linhas 458-500) por dois botoes de tamanho igual em grid:

- `grid grid-cols-2 gap-3` para garantir tamanho igual
- Botao do plano atual: borda laranja, icone + nome do plano + descricao
- Botao do outro plano: borda neutra, icone + "Fazer upgrade" (ou "Fazer downgrade")
- Ao clicar no botao do outro plano, exibe toast orientando falar com o coach
- Remover o texto auxiliar de baixo ("Upgrade para plano Pro com seu coach")

3. Atualizar as mensagens de toast (linhas 477, 485):
- "Entre em contato com seu coach para fazer upgrade para o plano **Performance**."
- "Entre em contato com seu coach para solicitar downgrade para o plano **Essencial**."

### Escopo

- Apenas renomeacao visual e layout do componente `AthleteConfig`
- Nenhuma mudanca no banco de dados, tipos TypeScript (`PlanTier` continua `'open' | 'pro'`), ou logica de negocio
- Nenhuma biblioteca nova
