

## Plano: Redesign do Cabeçalho de Métricas

### Problema
As informações de performance (Última prova, Meta, Evolução) estão misturadas visualmente com o título do atleta (nome + nível), causando confusão. Tudo parece um bloco só de texto.

### Solução
Separar as métricas em uma **barra de estatísticas** visualmente distinta, logo abaixo do nome do atleta.

### O que muda

1. **Separação visual clara** — As 3 métricas (Última prova, Meta, Evolução) saem da linha de texto e vão para um container próprio com fundo sutil (`bg-muted/10`), borda fina e cantos arredondados.

2. **Layout em grid 3 colunas** — Cada métrica ocupa uma coluna com:
   - Ícone pequeno + label em cima (texto miúdo, cor neutra)
   - Valor em baixo (texto bold, maior)

3. **Ícones para cada métrica**:
   - ⏱ Timer → Última prova
   - 🎯 Target → Meta (próxima categoria)
   - 📈 TrendingUp → Evolução

4. **Espaçamento** — Margem de `mt-3` entre o bloco do nome/categoria e a barra de métricas.

5. **Consistência mobile/desktop** — A mesma estrutura se aplica nas duas versões (mobile e desktop) dentro do `DiagnosticRadarBlock.tsx`.

### Resultado visual esperado

```text
┌─────────────────────────────────────────────┐
│  👑 HYROX ELITE MEN                        │
│  Nome do Atleta                             │
└─────────────────────────────────────────────┘
                    ↕ espaço
┌─────────────────────────────────────────────┐
│  ⏱ Última prova  │  🎯 Meta ELITE │  📈 Evolução   │
│  1h14m32s        │  1h10m00s      │  ↓ 2m10s       │
└─────────────────────────────────────────────┘
```

### Arquivo editado
- `src/components/DiagnosticRadarBlock.tsx` — substituir as linhas inline de métricas (versão desktop ~linhas 1370-1440 e versão mobile ~linhas 1500-1560) pelo novo grid com container estilizado.

