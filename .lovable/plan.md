

## Análise: Cálculos entre Preview e Programações

### Resultado da Investigação

Comparei linha por linha o código de cálculo em **3 componentes**:

| Componente | Arquivo | Biometria | Motor |
|---|---|---|---|
| Preview (importador) | `TextModelImporter.tsx` | 75kg, masculino | `computeBlockMetrics` |
| Modal olhinho (Programações) | `CoachProgramsTab.tsx` | 75kg, masculino | `computeBlockMetrics` |
| Tela do atleta | `WeeklyTrainingView.tsx` | dados reais do atleta | `computeBlockMetrics` |

**O código é 100% idêntico** entre Preview e Programações — mesma função, mesmos parâmetros, mesma lógica de fallback. Não há diferença algorítmica.

### Possíveis causas da discrepância

Se os números realmente diferem entre as duas telas, a causa está nos **dados** (não no código):

1. **Re-parsing entre preview e save**: Se o coach editou blocos entre ver o preview e salvar, os `parsedExercises` no DB podem diferir do que o preview mostrava
2. **Serialização JSON**: O `JSON.parse(JSON.stringify(...))` no save pode perder tipos numéricos em edge cases (ex: `loadKg` vira string)
3. **Versão antiga do treino**: O treino no DB pode ter sido salvo antes das correções recentes no motor (carry, mobility, etc.), enquanto o preview usou o motor atualizado

### Proposta de verificação

Para confirmar, posso adicionar um **log de auditoria** temporário no modal do olhinho que mostre o `parsedExercises` do primeiro bloco, para compararmos com o que a preview tinha. Alternativamente, se você conseguir me mostrar screenshots lado a lado (preview vs modal) do **mesmo treino**, posso identificar exatamente qual bloco diverge.

### Ação recomendada

Se a suspeita for "dados antigos com motor novo":
- **Re-importar o treino** (apagar o draft e importar novamente) deve alinhar os cálculos, pois os `parsedExercises` serão gerados com o motor atualizado
- Para correção permanente, podemos adicionar uma **migração de dados** que re-processe os `parsedExercises` dos treinos existentes

Preciso que você confirme: **é o mesmo treino** em ambas as telas, ou são versões diferentes?

