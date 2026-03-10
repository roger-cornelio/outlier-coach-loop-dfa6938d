

# Melhorar ícones das estações do simulador HYROX

## Problema atual
Os ícones atuais são genéricos do Lucide e não representam bem cada estação:
- **SkiErg** → `Waves` (ondas genéricas)
- **Sled Push** → `ArrowRight` (seta)
- **Sled Pull** → `ArrowLeft` (seta)
- **Burpee Broad Jump** → `Dumbbell` (halter)
- **Rowing** → `Rows3` (linhas de tabela)
- **Farmers Carry** → `Weight` (peso genérico)
- **Sandbag Lunges** → `Footprints` (pegadas)
- **Wall Balls** → `Circle` (círculo)

## Ícones propostos (Lucide)

| Estação | Ícone Lucide | Razão |
|---------|-------------|-------|
| Run | `Running` (ou `PersonStanding`) | Pessoa correndo |
| SkiErg | `CableCar` | Movimento vertical puxando para baixo |
| Sled Push | `MoveRight` + cor laranja | Empurrar para frente |
| Sled Pull | `MoveLeft` + cor laranja | Puxar para trás |
| Burpee Broad Jump | `TrendingUp` | Salto explosivo para frente |
| Rowing | `Ship` | Remo/embarcação |
| Farmers Carry | `Luggage` | Carregar peso nas mãos |
| Sandbag Lunges | `PackageOpen` | Saco de areia |
| Wall Balls | `Target` | Alvo na parede |

## Arquivos alterados

1. **`src/components/simulator/ActiveSimulator.tsx`** — Atualizar imports e o `switch` do `getPhaseIcon`
2. **`src/components/simulator/SimulationDetailModal.tsx`** — Adicionar a mesma função `getPhaseIcon` para exibir ícones nos splits da tabela de detalhes (atualmente não tem ícones por split)

