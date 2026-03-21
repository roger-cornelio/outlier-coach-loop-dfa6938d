
## Plano: fazer o total do topo ser a soma exata do que aparece nos blocos

### Diagnóstico
O erro está na lógica do `WeeklyTrainingView`, não no motor dos blocos.

Hoje o topo não soma “o que o usuário vê”. Ele soma uma mistura de valores internos:

1. **Soma blocos que nem sempre aparecem na tela**
   - O header percorre `currentWorkout.blocks`
   - Mas os cards pulam blocos sem `displayData.hasContent`
   - Resultado: o topo pode incluir bloco invisível

2. **Soma blocos com parse falho, mas o card mostra `--`**
   - Para `bypassed/failed`, o card esconde tempo/kcal
   - Porém o header ainda usa fallback e adiciona esses valores
   - Resultado: o topo conta valores que não existem visualmente

3. **Tempo do topo arredonda diferente dos cards**
   - Card: arredonda cada bloco para minutos
   - Header: soma segundos crus e arredonda só no final
   - Resultado: mesmo com motor certo, a soma visual pode divergir

4. **Caloria do topo pode seguir regra visual diferente do card**
   - O card só exibe kcal em certas condições
   - O topo precisa obedecer à mesma regra para bater 100%

### O que vou ajustar

**Arquivo:** `src/components/WeeklyTrainingView.tsx`

#### 1) Criar uma lista única de métricas “exibíveis”
Para cada bloco, calcular:
- se ele será renderizado ou não
- se tempo/kcal serão exibidos ou `--`
- quantos minutos aparecem no card
- quantas kcal aparecem no card

Essa estrutura vira a única fonte de verdade da tela.

#### 2) Fazer o topo somar apenas o que está visível
O header vai somar:
- **tempo total = soma dos minutos exibidos em cada card**
- **kcal total = soma das kcal exibidas em cada card**

Sem fallback escondido, sem incluir bloco invisível.

#### 3) Alinhar regras visuais
O topo vai seguir exatamente as mesmas regras dos cards:
- bloco sem conteúdo: não entra
- bloco `bypassed/failed`: não entra na soma
- bloco sem kcal visível: não entra na soma de kcal

#### 4) Manter o label “estimado”
O texto do topo continua como:
- `~Xmin (estimado)`
- `~Y kcal (estimado)`

Mas agora com soma simples e consistente.

### Resultado esperado
Depois da correção:

- **Topo = soma exata dos blocos visíveis**
- Se os cards mostrarem `8 min + 12 min + 15 min`, o topo mostra `~35min`
- Se os cards mostrarem `50 + 110 + 90 kcal`, o topo mostra `~250 kcal`
- Nenhum bloco oculto ou com `--` vai contaminar a soma

### Arquivo a alterar
- `src/components/WeeklyTrainingView.tsx`

### Observação técnica
O motor de cálculo dos blocos pode continuar como está. O problema principal agora é de **agregação da UI**: o topo precisa somar os valores já preparados para exibição, e não recalcular por outro caminho.
