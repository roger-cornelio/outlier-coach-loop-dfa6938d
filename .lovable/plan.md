

## Plano: Separar repetições do nome do exercício

### O que acontece hoje

Quando o coach escreve algo como **"8/8 Kb Step Box"**, o sistema não entende que o "8/8" são repetições (8 de cada lado). Ele junta tudo como se fosse o nome de um exercício novo e desconhecido.

Pior ainda: o motor de cálculo interpreta "8/8" como se fosse uma carga de 8kg, mesmo sem ter "kg" escrito. Isso gera erro no cálculo de calorias e tempo.

### O que vai mudar

**1. O extrator semântico vai reconhecer números no início como repetições**

Hoje ele já separa duração (30"), carga (80kg), intensidade (PSE 7). Mas não separa repetições soltas no começo da linha. Vamos adicionar isso:

- `8/8 Kb Step Box` → repetições: **8/8** (laranja) + exercício: **Kb Step Box** (branco)
- `10 Burpees` → repetições: **10** (laranja) + exercício: **Burpees** (branco)

**2. O motor vai parar de inventar carga onde não existe**

Hoje o detector de peso aceita o padrão "número/número" mesmo sem "kg" ou "lb" depois. Então `8/8 Kb` vira `8/8kg`. Vamos exigir que a unidade de peso esteja escrita explicitamente. Assim:

- `8/8 Kb Step Box` → **não é carga** (é repetição unilateral)
- `32/24kg` → **continua sendo carga** (tem "kg" escrito)

**3. A lista de "Sugerir exercício" melhora**

Porque agora o sistema compara apenas "Kb Step Box" contra o dicionário, em vez de "8/8 Kb Step Box" inteiro. Menos falsos positivos.

### Resultado

- Badges coloridos corretos no editor do coach
- Motor calcula sem inventar carga fantasma
- Lista de sugestão mais limpa

### Arquivos envolvidos
- Extrator semântico de linha (2 ajustes pequenos)
- Parser principal de treino (1 ajuste no detector de peso)

