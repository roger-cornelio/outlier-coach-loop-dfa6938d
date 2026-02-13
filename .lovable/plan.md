

# Upgrade Visual da Jornada Outlier -- Rodada 2

## Resumo

Aplicar as 6 melhorias sugeridas pelo usuario no bloco "Jornada Outlier" em `src/components/DiagnosticRadarBlock.tsx`, elevando contexto, hierarquia visual e engajamento.

---

## 1. Score com contexto (linha ~374-407)

Atualmente mostra apenas "742 / 1000 - Elite". Adicionar:
- Linha de contexto: **"Top X% -- {athleteCategory}"** abaixo do score
- Linha descritiva: **"Baseado em provas + benchmarks + consistencia"**
- Calcular ranking aproximado: `rankPercent = 100 - outlierScore.score` (percentil invertido)
- Aplicar leve gradiente no fundo do bloco score (`bg-gradient-to-br from-background/80 to-muted/20`)
- Melhorar contraste: score em tamanho `text-4xl` (de `text-3xl`)

---

## 2. Barra de progresso com labels de nivel (linha ~418-466)

Transformar barra "morta" em "regua com checkpoints":
- Adicionar label do nivel atual a esquerda e nivel alvo a direita da barra
- Formato: `PRO ─────●──────── ELITE` com labels nas pontas
- Percentual em `text-3xl` (de `text-2xl`) para maior destaque
- Manter milestones icons existentes

---

## 3. Separar gargalos em categorias (linhas ~523-569)

Dividir a lista "Para chegar em X faltam" em dois grupos visuais:

**Grupo 1 -- Gargalos de Performance** (com estrelas, fundo vermelho sutil)
- worstMetrics com estrelas (ja existente, adicionar header e fundo)

**Grupo 2 -- Volume** (fundo amarelo sutil)
- Benchmarks restantes
- Sessoes de treino restantes
- Prova oficial (se necessaria)

Cada grupo com header proprio e icone diferenciado.

---

## 4. Ultimo Marco mais destacado (linhas ~508-521)

- Aumentar padding e tamanho do icone Trophy
- Adicionar glow sutil laranja via `shadow-amber-500/20`
- Texto "MARCO DESBLOQUEADO" em vez de "Ultimo Marco"
- Adicionar dados placeholder para dias e melhoria (mostrar "---" ate dados reais)
- Layout em 2 colunas para `87 dias | +12% performance`

---

## 5. Radar conversa com score (nao mudar calculo, apenas visual)

- Adicionar texto de conexao sob o radar: "Seus pontos fortes e fracos impactam diretamente seu Outlier Score"
- Nao alterar logica de calculo (item futuro)
- Apenas comunicar visualmente que o radar tem relacao com o score

---

## 6. Micro UI

- Espacamento vertical entre Score, Progresso e Gargalos: `mb-4` (de `mb-3`)
- Score block com gradiente leve no fundo
- Percentual do progresso em `text-3xl font-bold`
- Melhor hierarquia tipografica nos headers de secao

---

## Arquivo alterado

Apenas `src/components/DiagnosticRadarBlock.tsx`

## Detalhes tecnicos

### Dados usados
- `outlierScore.score` (ja existe) para ranking percent
- `athleteCategory` (ja existe) para contexto do score
- `worstMetrics` (ja existe) para gargalos de performance
- `missingBenchmarks`, `missingSessions` (ja existem) para volume

### Nenhum dado novo necessario
Todas as informacoes ja estao disponiveis no componente. As mudancas sao puramente visuais e de organizacao.

