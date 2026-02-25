

# Mostrar Dashboard Completo Sem Prova Oficial

## Problema
Quando o atleta nao tem prova oficial registrada (`hasData = false`), o dashboard mostra apenas um card vazio "PERFIL DE PERFORMANCE" com a mensagem "Lance seu primeiro simulado..." e o botao "BORA TREINAR". Todos os blocos de jornada, regua, checklist de requisitos e prioridades ficam ocultos.

## Solucao
Remover o early return do estado vazio no `DiagnosticRadarBlock` e, em vez disso, renderizar o dashboard completo com:
- Regua de jornada zerada (0%)
- Checklist de requisitos (treinos, benchmarks, prova)
- Mensagem contextual: "Registre uma prova oficial para medirmos seu resultado"
- CTA "BORA TREINAR" sempre visivel
- Blocos que dependem de dados de performance (radar, gargalos, prioridades) mostram estado vazio compacto ou sao omitidos

## Mudancas Tecnicas

### Arquivo: `src/components/DiagnosticRadarBlock.tsx`

**1. Substituir o early return `!hasData` (linhas 1011-1039)**

Em vez de retornar apenas o card vazio + CTA, renderizar o layout mobile/desktop completo. Os sub-blocos que dependem de `scores` (radar, gargalos, prioridades) ja tratam arrays vazios internamente.

Para o **mobile** (`isMobile && !advancedMode`):
- Manter `MobilePathToEliteCard` (ja funciona com dados zerados -- mostra regua 0%, checklist de requisitos)
- Substituir a area de "Ultima prova / Meta" por um card informativo: "Registre uma prova oficial para medirmos seu resultado"
- Omitir `TrainingPrioritiesBlock` e `MobileBottlenecksBlock` (precisam de scores)
- Omitir `MobileNextStepBlock` (precisa de scores)
- Manter `MobilePhysiologicalModal` omitido (sem dados)
- Manter CTA "BORA TREINAR"

Para o **desktop/advanced**:
- Renderizar o header com nome + categoria OPEN
- Mostrar a regua de jornada zerada
- Mostrar checklist de requisitos
- Onde seria o radar/analise, mostrar card compacto com mensagem de registrar prova
- Manter CTA

**2. Remover o bloco `if (!hasData) { return ... }` por completo**

Mover a logica de `hasData` para dentro dos sub-componentes. Os que dependem de scores ja checam `scores.length === 0` e retornam null. O layout principal sempre renderiza.

**3. Adicionar card informativo para estado sem prova**

Criar um pequeno componente inline `NoRaceInfoCard` que exibe:
```
Registre uma prova oficial para medirmos seu resultado
```
Com icone de Trophy e link/botao para a pagina /prova-alvo.

### Comportamento resultante

| Cenario | Regua | Checklist | Radar/Gargalos | CTA |
|---------|-------|-----------|----------------|-----|
| Sem prova, sem treinos | 0% OPEN->PRO | 0/120, 0/3, X prova | Card "Registre prova" | BORA TREINAR |
| Com treinos, sem prova | X% OPEN->PRO | N/120, M/3, X prova | Card "Registre prova" | BORA TREINAR |
| Com prova | Calculado | Calculado | Radar completo | BORA TREINAR |

