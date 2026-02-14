
# Simplificar "Analise ultima prova" em 3 Cards Curtos

## Problema atual

O bloco "Analise ultima prova" (linhas 1002-1132) e um Collapsible que ao abrir mostra 3 sub-collapsibles aninhados (Limitador, Projecao, Impacto), cada um com paragrafos longos e tecnicos. O atleta precisa clicar multiplas vezes e ler texto academico para entender o diagnostico.

## Nova estrutura: 3 cards visiveis ao abrir

Ao abrir "Analise ultima prova", em vez de collapsibles aninhados, mostrar 3 cards curtos e diretos, sempre visiveis (sem collapsible interno):

### CARD 1 -- LIMITADOR (vermelho escuro)
- Fundo: `bg-red-950/80 border-red-800/30`
- Header: "LIMITADOR" em caps
- Linha 1: nome da estacao (ex: "Sled Pull")
- Linha 2: "Abaixo de {relativePerformance}% da categoria"
- Sem paragrafos tecnicos, sem disclaimers

### CARD 2 -- GANHO POTENCIAL (verde)
- Fundo: `bg-emerald-950/80 border-emerald-800/30`
- Header: "GANHO POTENCIAL" em caps
- Linha 1: "Corrigindo {station_name} ->"
- Linha 2: "Zona competitiva superior da categoria"
- Se nao houver dados: "Ganhos estimados disponiveis apos 2 provas."

### CARD 3 -- PROXIMO PASSO (amarelo/laranja)
- Fundo: `bg-amber-950/80 border-amber-800/30`
- Header: "PROXIMO PASSO"
- Lista curta: top 2-3 estacoes afetadas como foco de treino
- Botao "BORA TREINAR" 100% largura no final

### BOTAO "Ver analise detalhada"
- Apos os 3 cards, um botao ghost/link
- Ao clicar, expande os textos completos originais (paragrafos tecnicos, disclaimers)
- Usa um state `showDetailedAnalysis` para toggle

## Mudancas tecnicas

### Arquivo: `src/components/DiagnosticRadarBlock.tsx`

**1. Remover collapsibles internos (linhas 1016-1129)**

Substituir os 3 `Collapsible` aninhados (Limitador, Projecao, Impacto) por 3 cards simples sem collapsible.

Remover states nao mais usados:
- `isLimiterExpanded` (linha 625)
- `isProjectionExpanded` (linha 627)
- `isImpactExpanded` (linha 626)

Substituir por um unico state: `const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false)`

**2. Card 1 -- LIMITADOR**
```
<div className="rounded-lg bg-red-950/80 border border-red-800/30 p-4">
  <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-2">Limitador</p>
  <p className="text-base font-bold text-foreground">{mainLimiter?.name}</p>
  <p className="text-xs text-foreground/70">Abaixo de {mainLimiter?.relativePerformance}% da categoria</p>
</div>
```

**3. Card 2 -- GANHO POTENCIAL**
```
<div className="rounded-lg bg-emerald-950/80 border border-emerald-800/30 p-4">
  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2">Ganho Potencial</p>
  {mainLimiter ? (
    <>
      <p className="text-sm text-foreground">Corrigindo {mainLimiter.name} →</p>
      <p className="text-xs text-foreground/70">Zona competitiva superior da categoria</p>
    </>
  ) : (
    <p className="text-xs text-foreground/70">Ganhos estimados disponíveis após 2 provas.</p>
  )}
</div>
```

**4. Card 3 -- PROXIMO PASSO + CTA**
```
<div className="rounded-lg bg-amber-950/80 border border-amber-800/30 p-4">
  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2">Próximo Passo</p>
  <ul className="space-y-1 mb-4">
    {topStations.map(...) => <li>• {station.name}</li>}
  </ul>
  <Button onClick={onStartWorkout} disabled={!hasTodayWorkout} className="w-full ...">
    BORA TREINAR
  </Button>
</div>
```

**5. Botao "Ver analise detalhada" + conteudo expandido**

Apos os 3 cards, dentro do mesmo `CollapsibleContent`:
```
<button onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}>
  {showDetailedAnalysis ? 'Ocultar detalhes' : 'Ver análise detalhada ▸'}
</button>

{showDetailedAnalysis && (
  // Texto completo original: paragrafos do limitador, projecao, impacto
)}
```

**6. Manter o Collapsible externo**

O `Collapsible` principal "Analise ultima prova" (linhas 1003-1131) continua existindo -- ao clicar mostra os 3 cards. Apenas os collapsibles internos sao removidos.

## O que NAO muda

- Backend, tabelas, scores
- Mobile Blocos 1-5 (MobilePathToEliteCard, etc.)
- Regua PRO->ELITE
- Radar e indicadores fisiologicos
- Logica de mainLimiter, affectedStations
