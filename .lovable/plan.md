
# Refatoração Visual: Perfil de Performance do Atleta (OUTLIER)

## Resumo

Reorganizar o layout da tela de diagnóstico para criar uma hierarquia visual clara onde o atleta entende em 3 segundos: (1) se está bem ou mal, (2) qual é o principal problema, (3) onde isso impacta na prova.

---

## Análise Atual

A tela atual (`Dashboard.tsx`) possui a seguinte estrutura:

1. **AthleteHeroIdentity** — Nome + badge de status
2. **DiagnosticRadarBlock** — Radar de 6 valências + VO₂/Lactato + texto interpretativo
3. **EvolutionChartBlock** — Gráfico de evolução semanal
4. **EvolutionFocusBlock** — Focos de melhoria
5. **CTA "BORA TREINAR"** — Botão principal

### Problemas Identificados

- O "veredito" (status competitivo atual) não tem destaque visual adequado
- O radar domina visualmente antes do diagnóstico textual
- A "leitura rápida" está enterrada dentro do bloco do radar
- Os indicadores fisiológicos (VO₂, Lactato) competem com o limitador principal
- Não há separação clara entre "problema" e "evidência"

---

## Nova Estrutura Proposta

```
┌────────────────────────────────────────────────────────────┐
│ 1️⃣ HEADER (existente)                                      │
│    Nome do atleta + Badge de status                        │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ 2️⃣ VEREDITO DE PERFORMANCE (NOVO - alto contraste)         │
│    Título: "Status competitivo atual"                      │
│    Valor: {LEVEL_NAMES[status]} (badge grande)             │
│    Subtexto: {config.sublabel} (texto dinâmico)            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ 3️⃣ LEITURA RÁPIDA — PRINCIPAL LIMITADOR                   │
│    (VISUAL DOMINANTE - maior destaque da tela)             │
│                                                            │
│    Título: "Principal limitador atual"                     │
│    Nome: {weakestPhysio.name}                              │
│    Percentil: {weakestPhysio.value}                        │
│    Explicação: {interpretation.insight}                    │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ 4️⃣ IMPACTO DIRETO NA PROVA (NOVO BLOCO)                   │
│                                                            │
│    Título: "Impacto direto na prova"                       │
│    Lista: {weakestPhysio.stationImpact[]}                  │
│    Explicação: texto sobre fadiga sob carga                │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ 5️⃣ PERFIL FISIOLÓGICO (Radar - menor destaque)            │
│                                                            │
│    Título: "Perfil fisiológico competitivo"                │
│    Subtítulo: "Baseado na sua última prova registrada"     │
│    Radar: 6 valências (tamanho reduzido)                   │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ 6️⃣ INDICADORES DE SUPORTE (visualmente secundário)         │
│                                                            │
│    VO₂ Max + Limiar de Lactato                             │
│    Nota: "Indicadores de suporte para análise técnica"     │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ 7️⃣ CTA "BORA TREINAR" (existente)                         │
└────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

### 1. `src/components/DiagnosticRadarBlock.tsx`
Refatorar completamente o layout interno para nova hierarquia:

- Extrair "Leitura Rápida" para posição de destaque máximo (antes do radar)
- Criar novo bloco "Impacto na Prova" com lista de estações afetadas
- Mover VO₂/Lactato para seção secundária com label explicativo
- Reduzir altura visual do radar (de `h-80` para `h-56`)
- Adicionar novo bloco "Veredito" no topo

### 2. `src/components/Dashboard.tsx`
Pequenas alterações de ordem/espaçamento:

- Remover margem excessiva entre blocos
- Garantir que DiagnosticRadarBlock apareça logo após o Hero

---

## Detalhes Técnicos

### A. Novo Bloco: Veredito de Performance

```tsx
{/* Bloco de alto contraste - define o tom da tela */}
<div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent 
                border-l-4 border-l-primary rounded-lg p-6 mb-6">
  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
    Status competitivo atual
  </p>
  <h2 className="font-display text-3xl font-bold text-primary">
    {/* Valor dinâmico de LEVEL_NAMES[status] */}
  </h2>
  <p className="text-sm text-muted-foreground mt-1">
    {/* Texto dinâmico do config.sublabel */}
  </p>
</div>
```

### B. Leitura Rápida (Destaque Principal)

Será o bloco mais visualmente forte da tela:

```tsx
<div className="card-elevated p-6 border-l-4 border-l-destructive 
                bg-destructive/5">
  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
    Principal limitador atual
  </p>
  <div className="flex items-baseline gap-3 mb-3">
    <h3 className="font-display text-2xl font-bold text-foreground">
      {weakestPhysio.name}
    </h3>
    <span className="text-lg font-semibold text-destructive">
      Percentil {weakestPhysio.value}
    </span>
  </div>
  <p className="text-sm text-foreground/90 leading-relaxed">
    {interpretation.insight}
  </p>
</div>
```

### C. Impacto na Prova

Lista clara de estações afetadas:

```tsx
<div className="card-elevated p-5 border-l-4 border-l-amber-500">
  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
    Impacto direto na prova
  </p>
  <div className="flex flex-wrap gap-2 mb-3">
    {/* Lista de estações como chips */}
    {stationImpact.map(station => (
      <span className="px-3 py-1 rounded-full bg-amber-500/15 
                       text-amber-500 text-sm font-medium">
        {station}
      </span>
    ))}
  </div>
  <p className="text-sm text-muted-foreground">
    {impactExplanation}
  </p>
</div>
```

### D. Radar Reduzido

```tsx
{/* Radar com altura reduzida, papel secundário */}
<div className="h-56 sm:h-64 relative">
  {/* ... RadarChart existente ... */}
</div>
```

### E. Indicadores de Suporte

```tsx
<div className="bg-muted/10 border border-border/30 rounded-lg p-4 mt-4">
  <p className="text-xs text-muted-foreground mb-3">
    Indicadores de suporte — referência técnica
  </p>
  <div className="grid grid-cols-2 gap-3">
    {/* VO₂ e Lactato existentes, sem alteração de cálculo */}
  </div>
</div>
```

---

## Fontes de Dados (Todas Existentes)

| Dado | Origem | Variável |
|------|--------|----------|
| Status do atleta | `useAthleteStatus()` | `status`, `rulerScore` |
| Nome do limitador | `generateInterpretation()` | `weakestPhysio.name` |
| Percentil do limitador | `aggregateToPhysiologicalDimensions()` | `weakestPhysio.value` |
| Estações impactadas | `PHYSIOLOGICAL_DIMENSIONS` | `stationImpact[]` |
| Texto interpretativo | `generateInterpretation()` | `interpretation.insight` |
| VO₂ Max | `estimateVO2Max()` | `vo2Max.value` |
| Limiar de Lactato | `estimateLactateThreshold()` | `lactateThreshold.pace` |
| Radar data | `aggregateToPhysiologicalDimensions()` | `radarData[]` |

---

## Guardrails Respeitados

- ✅ Nenhum texto fixo criado — todos vêm das funções existentes
- ✅ Nenhuma lógica de cálculo alterada
- ✅ Nenhuma nova métrica adicionada
- ✅ Nenhuma API ou dado externo integrado
- ✅ Trabalho apenas em hierarquia, espaçamento, tipografia e ordem

---

## Resultado Esperado

A tela será lida na seguinte ordem de prioridade visual:

1. **3 segundos**: Veredito (status atual) + Principal limitador
2. **10 segundos**: Impacto na prova (quais estações sofrem)
3. **30 segundos**: Radar + Indicadores de suporte (evidência técnica)

O atleta entenderá imediatamente:
- "Estou no nível X"
- "Meu problema principal é Y"
- "Isso afeta as estações A, B, C"
