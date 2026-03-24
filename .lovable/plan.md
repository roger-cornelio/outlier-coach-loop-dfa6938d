

## Plano: Corrigir FOCO % com dados reais da Meta OUTLIER + Top 5 estações + Gráfico de Fadiga

### O que está errado hoje

O "% de foco" mostrado na tela gratuita é **inventado** — usa uma fórmula genérica que não tem relação com os dados reais. O diagnóstico completo (pago) já calcula isso corretamente usando a **Meta OUTLIER** (tempo dos top 10% da categoria), mas a tela gratuita não tem acesso a esse dado.

### O que vamos fazer

**Passo 1 — Trazer a Meta OUTLIER para a tela gratuita**

A função que calcula os percentis da tela gratuita já busca os dados de referência (top 10%, top 25%, etc.), mas só devolve o percentil final. Vamos fazer ela devolver também o **tempo de referência dos top 10%** (a Meta OUTLIER). Isso não exige tabela nova nem dados novos — já está tudo lá, só não é retornado.

**Passo 2 — Calcular FOCO % com a fórmula real**

Com a Meta OUTLIER em mãos, o cálculo passa a ser:
- **Tempo que pode ganhar** = Seu tempo − Meta OUTLIER
- **FOCO %** = Tempo que pode ganhar nessa estação ÷ Soma de todas as estações × 100

Exatamente igual à tabela do diagnóstico completo.

**Passo 3 — Mostrar só as 5 estações mais impactantes**

Ordenar todas as estações pelo FOCO % e exibir apenas as 5 maiores. Cada uma mostra o tempo que o atleta fez + o badge de FOCO %.

**Passo 4 — Garantir que o gráfico de Resistência sob Fadiga aparece**

O gráfico já está no código mas pode não estar aparecendo corretamente. Vamos garantir que ele é renderizado logo após os destaques, mostrando a quebra de performance entre as corridas 2 a 7.

### Ordem final da tela de resultados

1. **Hero** — Tempo total + classificação + categoria
2. **Parecer OUTLIER** — Top 5 estações por FOCO % (com tempo real + badge)
3. **Seus Destaques** — Estações fortes (com tempo)
4. **Resistência sob Fadiga** — Gráfico de quebra nas corridas
5. **Como vamos te fazer evoluir** — 3 pontos estratégicos
6. **CTA** — Botão de conversão

### O que NÃO muda

- Nenhuma tabela nova no banco
- Nenhuma função nova no backend
- Os dados de scrape continuam os mesmos

