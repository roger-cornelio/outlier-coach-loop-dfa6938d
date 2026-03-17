

## Plano: Badge de cobertura mais explicativo + modal de detalhes

### O que existe hoje

O badge mostra `⚠️ 17/19 (89%)` com um tooltip pequeno listando até 10 linhas sem métricas. Problemas:
- O coach não entende o que significa "17/19"
- O tooltip é pequeno e trunca as linhas
- Não diz em qual bloco/dia está o problema
- Não tem ação — o coach não consegue ir direto na linha para corrigir

### O que vai mudar

**1. Badge mais explicativo**
- Texto do badge: em vez de só `17/19 (89%)`, mostrar algo como:
  - ✅ `🎯 100% interpretado` (quando perfeito)
  - ⚠️ `2 linhas não interpretadas` (quando há falhas)
- Cor verde quando 100%, amarelo/laranja quando < 100%
- Badge clicável (cursor pointer) — abre modal de detalhes

**2. Modal de detalhes ao clicar**
- Título: "Detalhes da interpretação"
- Resumo no topo: "O sistema interpretou 17 de 19 exercícios (89%)"
- Explicação simples: "As linhas abaixo não possuem métricas mensuráveis (tempo, distância, repetições). O atleta verá o texto, mas sem estimativas automáticas de tempo/calorias."
- Lista das linhas não interpretadas, **agrupadas por bloco**:
  - Nome do bloco + dia
  - Cada linha com texto completo (sem truncar)
  - Highlight visual (fundo amarelo suave)
- Botão "Entendi" para fechar
- Quando 100%: mensagem positiva "Todos os exercícios foram interpretados com sucesso!"

**3. Enriquecer o CoverageReport**
- Adicionar informação de qual bloco/dia cada linha não interpretada pertence
- Novo tipo: `UnmatchedLine { text: string; blockTitle: string; dayIndex: number }`

### Arquivos a alterar

- `src/utils/parsingCoverage.ts` — enriquecer `unmatchedLines` com contexto (bloco/dia)
- `src/components/TextModelImporter.tsx` — substituir tooltip por badge clicável + modal de detalhes

### O que NÃO muda
- O cálculo de cobertura continua igual
- O parser não é alterado
- O salvamento não é alterado

