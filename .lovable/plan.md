
## Plano: Corrigir tempo/kcal dos blocos e travar a soma do header na mesma fonte de verdade

### Diagnóstico
Revendo ponta a ponta, encontrei 2 causas principais:

1. **AMRAP/EMOM com apóstrofo curvo não são reconhecidos**
   - Os treinos salvos estão vindo como **`15’ AMRAP`** / **`10’ EMOM`**.
   - O motor hoje aceita `'` e `′`, mas **não aceita `’`**.
   - Resultado: o bloco perde o “tempo fixo” e cai no cálculo de **1 round apenas**, por isso aparece algo como **2 min / 26 kcal**.

2. **Header e cards ainda podem divergir por cálculo duplicado**
   - O `WeeklyTrainingView` recalcula métricas no header e nos cards em pontos diferentes.
   - Mesmo usando a mesma função, há caminhos de fallback separados.
   - Isso deixa a soma visual mais frágil do que deveria.

### O que vou ajustar

#### 1) Corrigir o reconhecimento de tempo fixo no motor
**Arquivo:** `src/utils/computeBlockKcalFromParsed.ts`

- Expandir os regex de `detectFixedTimeMinutes` para aceitar também o caractere **`’`**.
- Cobrir os dois formatos:
  - `AMRAP 15’` / `EMOM 10’`
  - `15’ AMRAP` / `10’ EMOM`

**Impacto esperado**
- Todo bloco com título como **`15’ AMRAP`** ou **`10’ EMOM`** passa a usar **15 min / 10 min reais** como autoridade.
- As calorias deixam de refletir “um round” e passam a escalar para o bloco inteiro.

#### 2) Harmonizar o parser estrutural para o mesmo padrão
**Arquivo:** `src/utils/workoutStructures.ts`

- Atualizar os padrões de `parseStructureLine` para também aceitar **`’`**.
- Isso evita inconsistência entre:
  - leitura estrutural,
  - badges/estrutura,
  - e motor de cálculo.

**Impacto esperado**
- O sistema inteiro passa a entender a mesma notação de minutos, sem depender do tipo de aspas usado no treino importado.

#### 3) Fazer o header somar exatamente o que os cards exibem
**Arquivo:** `src/components/WeeklyTrainingView.tsx`

- Criar uma única estrutura memoizada com as métricas de cada bloco.
- Os cards passam a exibir esses valores prontos.
- O header passa a somar **essa mesma lista**, e não recalcular em paralelo.

**Impacto esperado**
- O topo sempre será:
  - **Tempo total do treino = soma dos tempos exibidos nos blocos**
  - **Calorias totais do treino = soma das calorias exibidas nos blocos**
- Mantendo o label **“estimado”**.

#### 4) Adicionar regressão automatizada
**Arquivo:** `src/utils/__tests__/cardioCalculation.test.ts` (ou teste dedicado do motor)

Vou adicionar testes para garantir:
- `15’ AMRAP` → retorna **15 min**
- `10’ EMOM` → retorna **10 min**
- formato invertido e formato tradicional continuam funcionando
- kcal do bloco cresce proporcionalmente ao tempo fixo

### Resultado esperado na sua tela
Depois da correção:
- os dois blocos `15’ AMRAP` deixam de mostrar **1–2 min** e passam a mostrar algo próximo de **15 min**
- as kcal desses blocos sobem para valores coerentes com 15 minutos de trabalho
- o header passa a bater exatamente com a soma dos cards

### Arquivos previstos
- `src/utils/computeBlockKcalFromParsed.ts`
- `src/utils/workoutStructures.ts`
- `src/components/WeeklyTrainingView.tsx`
- `src/utils/__tests__/cardioCalculation.test.ts`
