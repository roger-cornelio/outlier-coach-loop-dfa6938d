

## Plano: Frase do "Fantasma" como botão clicável

### Contexto
A frase "👻 Se a prova fosse hoje, o 3º colocado..." foi proposta nos mockups anteriores mas nunca implementada. O usuário quer que essa informação apareça como um **botão clicável** (não texto estático) abaixo da régua do "Nível Competitivo".

### O que será feito

**Arquivo: `src/components/DiagnosticRadarBlock.tsx`**

1. **Criar a frase do fantasma** usando dados já disponíveis:
   - `topPercentData.topPercent` → posição relativa (ex: "Top 3%")
   - `performanceSnapshot.currentTime` → tempo atual do atleta
   - Frase: `"👻 Se a prova fosse hoje, você estaria no Top {X}% da sua categoria"`

2. **Renderizar como botão `variant="ghost"`** logo após a linha "Performance projetada na prova", tanto no mobile (~linha 2390) quanto no desktop (~linha 2512):
   - Estilo discreto, texto pequeno, clicável
   - Ao clicar, abre um **modal/tooltip** com detalhes:
     - Posição Top% atual
     - Tempo de referência do nível acima
     - Quanto precisa melhorar para subir de posição

3. **Sem fantasma se não houver dados** — botão só aparece se `topPercentData.topPercent` existir e `provaAlvo` estiver cadastrada

### Layout

```text
  🎯 Com evolução de 39s/mês, você atinge PRO em ~10 meses
  📊 Performance projetada na prova: 1h15m38s
  [👻 Se a prova fosse hoje, você estaria no Top 3%]  ← botão clicável
```

### O que não muda
- Lógica de cálculo (performanceSnapshot, topPercent)
- Grid de 4 colunas, barra de progresso
- Tabelas no banco

