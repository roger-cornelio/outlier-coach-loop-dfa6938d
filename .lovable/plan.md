

## Plano: Corrigir detecção de duração com aspas (ex: 30" Bike)

### O que está acontecendo hoje

Quando o coach escreve algo como `30" Bike (60-70 rpm)`, o sistema não reconhece o `30"` como "30 segundos". Por causa disso, a linha inteira é tratada como um exercício desconhecido e aparece na lista de "sugerir exercício" — quando na verdade deveria ser reconhecida normalmente.

### Por que acontece

O detector de unidades usa uma regra de "limite de palavra" após os símbolos de segundo (`"`, `''`). Essa regra funciona bem para texto como `30seg`, mas falha para `30"` porque as aspas e o espaço seguinte não formam esse limite — então o sistema simplesmente ignora o match.

### O que vai mudar

Vamos separar a regra de detecção de segundos em duas:

1. **Uma regra para símbolos** (`"` e `''`) — que não precisa do limite de palavra, porque aspas já são naturalmente um delimitador.
2. **Uma regra para texto** (`seg`, `sec`, `s`) — que mantém o limite de palavra para evitar falsos positivos.

### Resultado esperado

- Linhas como `30" Bike (60-70 rpm)`, `60" bike`, `45" Prancha` passam a ser reconhecidas corretamente como exercícios com duração em segundos.
- Não aparecem mais como exercício desconhecido na lista de sugestões.
- Nenhuma outra parte do sistema é afetada (calorias, adaptação, parser).

### Arquivo alterado

- `src/utils/unitDetection.ts` — apenas a linha do regex de segundos é dividida em duas.

