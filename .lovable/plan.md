

## Correção: Nomes das Estações no Diagnóstico Gratuito

### O que será feito

Corrigir os nomes das estações que aparecem em branco/código técnico em 4 pontos da tela:

1. **Tabela "Onde Focar"** — mostrar "Ski Erg", "Sled Push" etc. em vez de chaves técnicas vazias
2. **Texto do gargalo** — "seu maior ponto fraco é no **Ski Erg**" em vez de texto vazio
3. **Seção "Seus Destaques"** — nomes legíveis nas cards de pontos fortes
4. **Plano de Ataque** — "Corrigir **Sled Push**" em vez de "Corrigir seu ponto fraco"

### Como

**1 arquivo: `src/pages/DiagnosticoGratuito.tsx`**

Em todos os pontos que usam `METRIC_LABELS[s.metric]`, trocar para priorizar `s.movement` (nome legível vindo do RoxCoach):

- Linha 686 (texto gargalo): `weakStations[0].movement || METRIC_LABELS[...] || ...`
- Linha 704 (tabela Onde Focar): `s.movement || METRIC_LABELS[s.metric] || s.metric`
- Linha 762 (Seus Destaques): cruzar com `roxCoachDiagnosticos` para pegar o `movement` correspondente
- Linha 790 (Plano de Ataque): `weakStations[0]?.movement || METRIC_LABELS[...] || 'seu ponto fraco'`

**Sem tabela de comparação adicional** — a tela continua com o formato atual de venda narrativa, apenas com os nomes corrigidos.

### O que NÃO muda
- Cálculo do "Top X%" (média dos percentis)
- Formato da tabela "Onde Focar" (tempo + % foco)
- Texto narrativo e tom de venda
- Nenhuma migration ou alteração de banco

