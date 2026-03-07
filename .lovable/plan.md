
Objetivo: explicar por que “Métrica” e “Diferença” estão erradas/incompletas e como corrigir sem alterar o contrato da API.

Diagnóstico (causa raiz confirmada)
1) Conversão errada de tempo no parse do diagnóstico
- Em `src/components/RoxCoachDashboard.tsx` (bloco `handleHack`, parse de `diagnostico_melhoria`), os campos `your_score`, `top_1` e `improvement_value` vindos como texto `"MM:SS"` estão passando por `toNum(...)`.
- `toNum("41:55")` vira `4155` (remove `:`), quando o correto seria `2515` segundos.
- Isso distorce os números da tabela (ex.: `41:55` aparece como `69:15`).

2) “Diferença” não aparece em todas as linhas por regra de UI
- Em `src/components/diagnostico/ImprovementTable.tsx`, a coluna Diferença faz:
  - `d.improvement_value > 0 ? formatTime(...) : '-'`
- Quando a diferença é `00:00`, a tela mostra `-` (por isso parece “faltando”).

3) “Métrica não vem”
- A resposta atual da API em `diagnostico_melhoria` não inclui `metric` por item.
- O front está preenchendo fallback com `'time'` (exibido como “Tempo”).
- Então não é perda no front; é ausência desse campo no payload (ou escolha de fallback).

Plano de correção
1) Corrigir parse de tempos no `RoxCoachDashboard`
- Criar/usar helper único: “se valor contém `:`, converter com `timeToSec`; senão usar `toNum`”.
- Aplicar em:
  - `your_score`
  - `top_1`
  - `improvement_value`
- Manter `percentage` com `toNum`.

2) Ajustar exibição da coluna Diferença
- Em `ImprovementTable`, remover condição que troca zero por `-`.
- Sempre renderizar `formatTime(d.improvement_value)` para exibir `00:00` quando for zero.

3) Tratar coluna Métrica com comportamento explícito
- Se API enviar `metric`, usar diretamente.
- Se não enviar, manter fallback “time”/“Tempo” (com comentário claro no código para evitar ambiguidade futura).

4) Validar fluxo ponta a ponta
- Reimportar a URL oficial.
- Confirmar no banco:
  - `Run Total`: `your_score=2515`, `top_1=2187`, `improvement_value=328`.
  - Itens sem ganho: `improvement_value=0`.
- Confirmar na UI:
  - “Você/Top 1%” corretos (41:55, 36:27 etc.).
  - Diferença mostra `00:00` nas linhas zeradas (não `-`).
  - Métrica segue “Tempo” até API fornecer `metric` detalhada.

Detalhes técnicos (resumo)
- Arquivos-alvo:
  - `src/components/RoxCoachDashboard.tsx` (normalização de entrada)
  - `src/components/diagnostico/ImprovementTable.tsx` (render da diferença)
- Não exige migração de banco.
- Não exige mudança na função de backend para este bug específico.
- O padrão de paginação/resumable sync não é necessário para este incidente; o problema atual é mapeamento/formatação no front.

Critérios de aceite
- Nenhum tempo convertido com concatenação de dígitos (ex.: 41:55 jamais virar 4155).
- Coluna Diferença sempre preenchida (inclusive `00:00`).
- Dados importados e renderizados batem com JSON da API.
