

## Diagnóstico Gratuito — Redesign focado em conversão e impacto emocional

### Problema atual
A tela de resultados é técnica demais: radar + barrinhas de percentil + CTA genérico. Falta impacto emocional, storytelling e gatilhos psicológicos (Aversão à Perda, Novidade, Autoridade).

### Visão
Transformar os resultados em uma experiência narrativa de alto impacto, com dados reais do atleta apresentados de forma aspiracional. O diagnóstico deve fazer o atleta sentir: "Eu PRECISO disso."

### Estrutura dos resultados (nova ordem)

**1. Hero do Resultado — "Seu Raio X HYROX"**
- Tempo total grande e destacado com animação de contagem
- Badge de classificação automática (Novato / Intermediário / Avançado / Elite) com cor
- Nome do evento + divisão como subtítulo
- Frase de autoridade: "Análise baseada em 50.000+ resultados HYROX globais"

**2. Radar Chart (existente, mantido)**
- Mesmo OutlierRadarChart, mas com subtítulo de marketing: "Comparado com todos os atletas da sua divisão"

**3. Resistência sob Fadiga (FatigueIndexCard adaptado)**
- Reutilizar a lógica do gauge + gráfico de linha das 8 runs
- Dados virão dos splits do scrape (run_1_sec...run_8_sec) convertidos para o formato Split[]
- Copy de aversão à perda: "Você está perdendo X minutos por fadiga. Atletas que corrigem isso melhoram em média Y minutos."

**4. Pontos Fracos com gatilho de perda**
- Manter as 3 piores estações mas com copy emocional
- Adicionar frase: "Cada segundo perdido aqui te afasta do pódio na sua categoria"
- Highlight visual mais agressivo (borda vermelha pulsante)

**5. Pontos Fortes (mantido, mais compacto)**
- Seção menor, celebração rápida

**6. Projeção de Evolução (EvolutionProjectionCard adaptado — PARCIALMENTE BLOQUEADO)**
- Mostrar o gráfico de 12 meses com a curva descendente (tempo melhorando)
- Mostrar as 3 métricas (resultado esperado, ganho/mês, ganho em 12m)
- SEM o texto AI (não autenticado)
- Copy: "Com treino direcionado, seu tempo pode cair para X:XX:XX em 12 meses"
- Usar dados reais: calcular com `calculateEvolutionTimeframe` e gap dos scores

**7. CTA Final — Gate Premium (redesenhado)**
- Contagem do que o atleta está "deixando na mesa": tempo total que poderia ganhar
- Animação mais agressiva, glow pulsante
- Copy: "Você tem X:XX de potencial escondido. Um coach dedicado vai desbloquear cada segundo."
- Botão: "COMEÇAR MEUS 30 DIAS GRÁTIS"
- Sub-CTA: "Sem cartão de crédito · Cancele quando quiser"

### Mudanças técnicas

**Arquivo**: `src/pages/DiagnosticoGratuito.tsx`

1. **Mapear splits do scrape para formato Split[]** — converter `splits.run_1_sec`, `splits.ski_sec` etc. para array de `{ id, split_name, time }` compatível com FatigueIndexCard
2. **Importar e usar FatigueIndexCard** com os splits mapeados
3. **Calcular projeção** usando `calculateEvolutionTimeframe` com o finish_time e gap total dos scores
4. **Construir gráfico de projeção inline** (sem chamar edge function de AI, pois não há auth)
5. **Redesenhar seção de resultados** com nova hierarquia visual e copy de marketing
6. **Adicionar animações** de contagem (tempo total) e entrada escalonada nos cards

Nenhuma tabela ou edge function nova necessária — tudo usa dados já disponíveis do scrape + cálculos client-side.

