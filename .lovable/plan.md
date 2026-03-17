

## Plano: Tabata com Defaults Inteligentes

### O que é Tabata?

Tabata é um método de treino intervalado: **20 segundos de exercício, 10 segundos de descanso, repetido 8 vezes = 4 minutos no total**.

### O problema hoje

Quando o coach escreve um bloco "Tabata" com exercícios mas sem definir tempos, o sistema não sabe quanto tempo dura. Ele não aplica nenhum default.

### O que vai mudar

**Regra simples:**
- Se o coach escreve "Tabata" e **não define tempos** → o sistema assume o formato clássico: 8 rounds de 20s/10s = **4 minutos por exercício**
- Se o coach **define tempos** (ex: "Tabata 30/15 por 6 rounds") → os tempos do coach prevalecem, o sistema não sobrescreve nada

**Onde isso aparece:**

1. **No interpretador de texto** — quando o coach cola o treino, blocos marcados como Tabata sem tempos recebem automaticamente a duração de 4 minutos
2. **Na inteligência artificial** — o modelo que analisa os blocos de treino ganha uma regra explícita sobre Tabata, com exemplos, para interpretar corretamente
3. **Na estimativa de tempo** — o cálculo de duração do treino reconhece "Tabata" e usa 4 minutos como base quando não há tempos explícitos

### O que NÃO muda

- O coach não precisa fazer nada diferente — basta escrever "Tabata" como já faz
- Se já definir tempos, nada muda
- Nenhuma alteração no banco de dados
- O salvamento de treinos continua igual

### Arquivos alterados

Três arquivos existentes recebem ajustes: o parser de texto estruturado, a função de IA que interpreta blocos, e o estimador de tempo de treino.

