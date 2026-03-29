

## Plano: Expandir reconhecimento de aspas para minutos e segundos

### Problema

Quando o coach escreve `30" Bike` ou `2' Air Bike`, o sistema deveria reconhecer `30"` como 30 segundos e `2'` como 2 minutos. Mas dependendo do teclado (especialmente mobile), as aspas podem ser "inteligentes" (curvas) em vez de retas, e o regex atual não cobre todas as variantes.

### Variantes de aspas que precisam ser reconhecidas

**Segundos** (aspas duplas): `"` (reta), `"` `"` (curvas), `″` (prime duplo), `''` (duas retas simples)

**Minutos** (aspas simples): `'` (reta), `'` `'` (curvas), `′` (prime)

### O que vai mudar

**1. Extrator semântico (`lineSemanticExtractor.ts`)**
- Expandir as 3 regras de duração com aspas para cobrir todas as variantes Unicode acima
- Garantir que estas regras continuam antes dos patterns de reps (que são os últimos), evitando que `30"` seja tratado como repetição

**2. Detector de unidades (`unitDetection.ts`)**
- Expandir os patterns de TIME (segundos e minutos) com as mesmas variantes Unicode
- Isso faz com que o parser principal reconheça essas linhas como exercícios válidos com unidade de tempo

### Resultado esperado

- `30" Bike` → duração: **30"** (azul) + exercício: **Bike** (branco)
- `2' Air Bike` → duração: **2'** (azul) + exercício: **Air Bike** (branco)
- `60" bike` → duração: **60"** (azul) + exercício: **bike** (branco)
- Funciona independentemente do tipo de aspas que o teclado do coach inserir

### Arquivos
- `src/utils/lineSemanticExtractor.ts` (3 regexes de duração)
- `src/utils/unitDetection.ts` (2 regexes de tempo)

