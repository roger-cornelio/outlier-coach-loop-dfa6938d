

## Plano: Suportar múltiplos ROUNDS no mesmo bloco

### Por que não funciona hoje

Você tem razão — "2 ROUNDS" é só um multiplicador ("repita os exercícios abaixo 2 vezes"). Não deveria haver limite de quantos grupos de ROUNDS existem num bloco.

O problema é que o campo `structureDescription` no código é **uma string única**. Quando o sistema encontra o primeiro "2 ROUNDS", guarda. Quando encontra o segundo e o terceiro, **sobrescreve ou ignora**. O resultado: só um badge aparece e os outros "2 ROUNDS" caem como exercícios ou somem.

### A solução

Transformar as linhas estruturais (como "2 ROUNDS") em **separadores inline** dentro da lista de exercícios, em vez de tentar extrair um único badge global.

**Modelo mental:**
```text
FORÇA
├── [badge] 2 ROUNDS
│   ├── 12 Back Squat
│   ├── 20m Double DB Lunges
│   └── 10m Broad Jump
├── [badge] 2 ROUNDS
│   ├── 8 Back Squat
│   ├── 20m Double DB Lunges
│   └── 10m Broad Jump
└── [badge] 2 ROUNDS
    ├── 4 Back Squat
    ├── 20m Double DB Lunges
    └── 10m Broad Jump
```

### Alterações técnicas

| Arquivo | O que muda |
|---|---|
| `src/utils/blockDisplayUtils.ts` | Em vez de guardar `structureDescription` como string única, as linhas estruturais são inseridas na lista `exerciseLines` com um prefixo especial (ex: `__STRUCT:2 ROUNDS`) para serem reconhecidas na renderização |
| `src/components/DSLBlockRenderer.tsx` | O componente que renderiza `exerciseLines` detecta o prefixo `__STRUCT:` e renderiza como `StructureBadge` inline (sub-header) em vez de texto de exercício |
| `src/utils/blockDisplayUtils.ts` | O campo `structureDescription` continua existindo para blocos com **uma única** estrutura (compatibilidade), mas quando há múltiplas, elas vão inline |

### O que muda para o coach/atleta

- O treino com 3 seções de "2 ROUNDS" aparece corretamente com 3 badges separando os grupos de exercícios
- Blocos com um único ROUNDS/EMOM/AMRAP continuam funcionando igual (badge no topo)
- Nenhuma mudança no banco de dados ou no parser de IA

### Motor de tempo

O cálculo de tempo já multiplica exercícios × rounds. Com múltiplos grupos, cada grupo terá seu multiplicador aplicado individualmente aos exercícios abaixo dele, resultando numa estimativa mais precisa.

