

# Consolidar Barras em Checklist Acionavel

## Problema

O desktop tem 4 barras visuais:
1. Regua PRO->ELITE (linha 881)
2. Mini-bar Benchmarks (linhas 907-915)
3. Mini-bar Treinos (linhas 917-926)
4. Outlier Score (ja foi simplificado para "Top X%")

As mini-bars de Benchmarks e Treinos competem visualmente com a regua principal.

## Mudancas

### Arquivo: `src/components/DiagnosticRadarBlock.tsx`

**1. Remover mini-bars de Benchmarks e Treinos no desktop (linhas 905-927)**

Deletar todo o bloco `space-y-2 mb-4` que contem as duas mini-bars com `AnimatedCounter`.

**2. Criar card "REQUISITOS PARA {targetLevel}" unificado (substituir linhas 932-987)**

Unificar os blocos "Gargalos de Performance" e "Volume" num unico card com checklist visual:

```text
REQUISITOS PARA ELITE

[check verde] Sled Push nota A
[x vermelho] Sled Pull nota A
[x vermelho] Lunges -18s
[x laranja]  3 benchmarks faltando
[x laranja]  250 sessoes restantes
[x vermelho] Prova oficial HYROX
```

Regras:
- Items de performance (gargalos): icone X vermelho, estrelas ao lado
- Items de volume (benchmarks/treinos): icone X laranja
- Items concluidos: icone check verde
- Prova oficial: icone X vermelho se ausente
- Ordenados: performance primeiro, volume depois, concluidos por ultimo

**3. Transformar volume em "Ciclo semanal" no card Proximo Passo (mobile bloco 4, linhas 339-381)**

Adicionar ao `MobileNextStepBlock`:
- "Ciclo atual: Semana X / Y" (placeholder, dado nao disponivel — usar "---")
- "Sessoes da semana: X / 6" (placeholder)

Remover "250 sessoes restantes" de qualquer lugar visivel no scroll principal.

**4. Remover mini-bars do MobileAdvancedDataSection (linhas 492-518)**

Substituir as mini-bars de Benchmarks e Treinos por itens de checklist simples (mesmo formato do desktop), mantendo dentro do modo avancado.

**5. Manter a regua PRO->ELITE como unica barra**

A barra principal (linhas 875-903) permanece inalterada. Essa e a unica regua visual na tela.

---

## Componente novo inline: `RequirementsChecklist`

Props:
- `scores`: para gargalos de performance
- `targetLevel`: para benchmarks/treinos/prova
- `targetLevelLabel`: para titulo "REQUISITOS PARA {label}"

Renderiza lista unica com icones de status (check/x) e estrelas para metricas.

---

## Desktop: sem mudanca estrutural

O layout do card "Jornada Outlier" (linhas 826-993) mantem a mesma estrutura, apenas:
- Remove mini-bars
- Substitui blocos separados de Gargalos + Volume por checklist unico

## Mobile: sem mudanca no Bloco 1

O `MobilePathToEliteCard` (linhas 128-246) nao muda. Apenas o `MobileNextStepBlock` ganha info de ciclo semanal e o `MobileAdvancedDataSection` perde as mini-bars.

