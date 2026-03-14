

## Minha Avaliação do Plano Proposto

### O que está excelente

**Frente 1 (Integridade de Dados)** é a mudança mais importante de todas. O `METRIC_INSIGHTS` hardcoded é um problema sério — o atleta vê "-1m45 vs Elite" que não tem relação nenhuma com os dados reais dele. Remover isso e substituir por gaps calculados dinamicamente é obrigatório. Concordo 100%.

**Frente 2 (Estrelas)** também faz sentido. O sistema multicolorido (verde/azul/amarelo/laranja/vermelho) compete visualmente com o resto do dashboard. Uma cor única premium para estrelas preenchidas cria uma hierarquia visual mais limpa e profissional.

### Onde eu faria diferente

**Frente 3 (Gráfico de Barras)** — concordo com data labels, mas com uma ressalva importante: as barras hoje mostram **percentis** (0-100%), não tempos absolutos. Mostrar "72%" ao lado da barra é útil, mas mostrar o tempo real (ex: "04:50") seria muito mais valioso para o atleta. O tipo `CalculatedScore` já tem `raw_time_sec`, então é viável. Minha sugestão: mostrar o **tempo real formatado** como label principal e o percentil como informação secundária.

**Frente 4 (Blocos Textuais)** — a proposta sugere trocar as cores semânticas atuais (vermelho para limitador, verde para ganho potencial) por um cinza neutro (`bg-[#1A1A1A]`). Eu **discordo** dessa mudança. As cores semânticas comunicam urgência e tipo de informação instantaneamente. Vermelho sutil no limitador diz "atenção aqui" sem o atleta precisar ler. Trocar por cinza neutro remove essa camada de comunicação. Minha sugestão: **manter as cores semânticas** e apenas melhorar tipografia (espaçamento, line-height, peso da fonte do título).

### Sugestões adicionais

1. **Anti-Metalinguagem**: O plano menciona "vs Elite" nos gaps formatados. Isso contradiz a regra de anti-metalinguagem que já existe nas Edge Functions — o atleta não deveria ver referências a níveis competitivos. O gap deveria aparecer apenas como "↓ 45s" sem mencionar contra quem.

2. **Ordem de prioridade na execução**: Eu faria Frente 1 primeiro (é um bug de dados, não estética), depois Frente 2+3 juntas (são visuais complementares), e Frente 4 por último (menor impacto).

3. **Empty state das barras**: Em vez de "Sem dados" em texto, uma barra fantasma com 5% de opacidade e um traço ("—") comunica a ausência sem parecer erro. Texto "Sem dados" pode assustar o atleta achando que algo deu errado.

### Resumo

O plano é sólido e bem direcionado. As 4 frentes atacam problemas reais. Minhas únicas divergências são: manter cores semânticas nos cards textuais (Frente 4) e mostrar tempos reais em vez de percentis nas barras (Frente 3). O resto está pronto para implementar.

