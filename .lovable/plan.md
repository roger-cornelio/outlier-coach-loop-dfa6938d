

## Plano: Mover Legenda para junto do badge "100% interpretado" + enriquecer conteúdo

### O que muda

**1. Mover o botão Legenda** do toolbar inferior para ao lado do badge "🎯 100% interpretado" no header do editor (linha ~1663 do TextModelImporter).

**2. Enriquecer o conteúdo da Legenda** com mais informações explicativas:
- Adicionar seção introdutória explicando como funciona a interpretação automática
- Para cada métrica, incluir mais exemplos de formatos válidos
- Adicionar dicas de como escrever para o parser interpretar melhor (ex: "sempre use unidade após número: 60kg, não apenas 60")
- Incluir seção "Como funciona" explicando que o sistema lê o texto e identifica automaticamente cada tipo de métrica pela cor

### Arquivos
- **`src/components/TextModelImporter.tsx`**: mover `<MetricsLegend />` do toolbar inferior para ao lado do badge de cobertura (linha ~1663), remover do toolbar inferior
- **`src/components/MetricsLegend.tsx`**: expandir conteúdo com mais exemplos, dicas de escrita e seção explicativa

### UI resultado

```text
┌─────────────────────────────────────────────────────────┐
│ ← Edição do Treino    [🎯 100% interpretado] [🎨 Legenda]│
└─────────────────────────────────────────────────────────┘
```

O coach clica em "Legenda" e vê:
- Como o sistema interpreta (explicação curta)
- Tabela de cores com exemplos expandidos e dicas de formato
- Nota sobre como melhorar a precisão da interpretação

