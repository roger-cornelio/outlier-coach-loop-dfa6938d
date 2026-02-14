

# Limpar Checklist de Requisitos e Remover "Missão"

## Problema

1. O checklist "REQUISITOS PARA ELITE" mostra "Sled Pull nota A" e "Sandbag Lunges nota A" -- mas essas metricas de performance NAO fazem parte da formula de status do atleta. A regra de progressao usa apenas volume (benchmarks, sessoes, prova oficial), nao nota individual de estacoes.

2. O header "MISSAO" nao faz sentido no contexto do quadro de Jornada Outlier.

## Mudancas

### Arquivo: `src/components/DiagnosticRadarBlock.tsx`

**1. Remover header "MISSAO" (linhas 874-878)**

Deletar o bloco com icone Target + texto "Missão" que aparece acima da regua PRO->ELITE no desktop.

**2. Remover itens de performance do checklist desktop (linhas 919-938)**

Remover o loop `worstMetrics.map(...)` que gera os itens "Sled Pull nota A", "Sandbag Lunges nota A" com estrelas. Manter apenas:
- Benchmarks faltando (laranja)
- Sessoes restantes (laranja)
- Prova oficial HYROX (vermelho/verde)

O checklist fica assim:

```
REQUISITOS PARA HYROX ELITE

X  12 benchmarks faltando
X  250 sessoes restantes
v  Prova oficial HYROX
```

Sem metricas de performance individuais.

## O que NAO muda

- Regua PRO->ELITE (unica barra, mantida)
- Outlier Score compacto (Top X%)
- Mobile (Bloco 1 MobilePathToEliteCard, Bloco 3 MobileBottlenecksBlock -- esses mostram gargalos em contexto separado, nao como "requisitos de nivel")
- Backend, logica de score, admin
